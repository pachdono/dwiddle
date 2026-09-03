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

const ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";

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
        model: MODEL,
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
    throw Object.assign(
      new Error(reply.status === 401 ? "The NVIDIA key was rejected" : `The model returned ${reply.status}`),
      { status: reply.status === 401 ? 500 : 502, detail: body.slice(0, 300) },
    );
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
