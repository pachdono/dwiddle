// Shared helper for the NVIDIA NIM API.
//
// The key lives only here, in a Vercel environment variable. Anything shipped
// to the browser can be read by anyone who opens the developer tools, so the
// browser talks to this function and this function talks to NVIDIA.
//
//   Browser --POST /api/*--> this function --with key--> NVIDIA --> JSON back
//
// Files in /api beginning with an underscore are not routed, so this is a
// module rather than an endpoint.

const BASE = "https://integrate.api.nvidia.com/v1";
const ENDPOINT = `${BASE}/chat/completions`;
const MODELS = `${BASE}/models`;

// NVIDIA's catalogue changes, so hard coding a model id means the app breaks
// the day that one is retired. If NVIDIA_MODEL is not set we ask the key which
// models it can actually use and pick the best available instruct model.
// The answer is cached for the life of the warm function instance.
const PREFERENCES = [
  /llama-3\.3-70b-instruct/i,
  /llama-3\.1-70b-instruct/i,
  /nemotron.*70b.*instruct/i,
  /llama-3\.1-8b-instruct/i,
  /qwen.*instruct/i,
  /mixtral.*instruct/i,
  /mistral.*instruct/i,
  /instruct/i,
];

let cachedModel = null;

export async function resolveModel() {
  if (process.env.NVIDIA_MODEL) return process.env.NVIDIA_MODEL;
  if (cachedModel) return cachedModel;

  const ids = await listModels();
  if (ids.length === 0) {
    throw Object.assign(new Error("Your NVIDIA key returned no available models"), { status: 502 });
  }

  for (const pattern of PREFERENCES) {
    const hit = ids.find((id) => pattern.test(id));
    if (hit) {
      cachedModel = hit;
      console.log("[api] using model", hit);
      return hit;
    }
  }

  cachedModel = ids[0];
  return cachedModel;
}

export async function listModels() {
  if (!process.env.NVIDIA_API_KEY) {
    throw Object.assign(new Error("NVIDIA_API_KEY is not set on the server"), { status: 500 });
  }
  const reply = await fetch(MODELS, {
    headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
  });
  if (!reply.ok) {
    throw Object.assign(
      new Error(reply.status === 401 ? "The NVIDIA key was rejected" : `Listing models returned ${reply.status}`),
      { status: reply.status === 401 ? 500 : 502 },
    );
  }
  const data = await reply.json();
  return (data?.data || []).map((m) => m.id).filter(Boolean).sort();
}

export const MAX_INPUT = 24000; // characters of user text we will accept

export function userError(res, status, message) {
  res.status(status).json({ error: message });
  return null;
}

// Models wrap JSON in prose or code fences often enough that parsing has to be
// defensive. Pull out the first balanced object or array and parse that.
export function safeParse(text) {
  if (!text) return null;
  let t = String(text).trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  const start = t.search(/[[{]/);
  if (start === -1) return null;
  const open = t[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(t.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export async function ask({ system, user, maxTokens = 4000, temperature = 0.4 }) {
  if (!process.env.NVIDIA_API_KEY) {
    throw Object.assign(new Error("NVIDIA_API_KEY is not set on the server"), { status: 500 });
  }

  const model = await resolveModel();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  let reply;
  try {
    reply = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (err) {
    clearTimeout(timeout);
    throw Object.assign(new Error(err.name === "AbortError" ? "The model took too long to answer" : "Could not reach the model"), { status: 504 });
  }
  clearTimeout(timeout);

  if (!reply.ok) {
    const body = await reply.text().catch(() => "");
    cachedModel = null; // so the next call re-resolves rather than repeating a bad id

    let message;
    if (reply.status === 401) message = "The NVIDIA key was rejected";
    else if (reply.status === 404 || reply.status === 400) {
      message = `The model "${model}" is not available to your key. Clear NVIDIA_MODEL to let the server pick one, or open /api/models to see the list.`;
    } else if (reply.status === 429) message = "Rate limited by NVIDIA. Wait a moment and try again.";
    else message = `The model returned ${reply.status}`;

    throw Object.assign(new Error(message), {
      status: reply.status === 401 ? 500 : 502,
      detail: body.slice(0, 300),
    });
  }

  const data = await reply.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw Object.assign(new Error("The model returned an empty answer"), { status: 502 });
  return text;
}

// Every endpoint shares the same shape: check the method, read and cap the
// input, ask the model, parse, respond.
export function guard(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    userError(res, 405, "Use POST");
    return false;
  }
  return true;
}

export function fail(res, err) {
  const status = err.status || 500;
  if (status >= 500) console.error("[api]", err.message, err.detail || "");
  res.status(status).json({ error: err.message });
}
