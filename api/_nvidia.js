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

// NVIDIA's catalogue changes, and being listed is not the same as being
// callable: the models endpoint happily returns models that answer a chat
// request with 400. So we build an ordered list of candidates and work down it
// until one actually replies, remembering both the winner and the failures.

// Models that exist but are wrong for this job.
const UNSUITABLE = /vision|translate|embed|rerank|guard|reward|coder|-code-|ocr|speech|riva/i;

const PREFERENCES = [
  /mistral-nemo-12b-instruct/i,
  /phi-3\.5-moe-instruct/i,
  /granite-3\.0-8b-instruct/i,
  /mistral-7b-instruct/i,
  /nemotron-51b-instruct/i,
  /llama-3\.3-70b-instruct/i,
  /llama-3\.1-nemotron-70b-instruct/i,
  /mistral-large-2-instruct/i,
  /jamba-1\.5-large-instruct/i,
  /dbrx-instruct/i,
  /instruct/i,
];

let cachedModel = null;
const rejected = new Set();

// Ordered best first, with anything already known to fail removed.
// includeRejected is for the probe endpoint, which wants the full picture.
export async function candidates({ includeRejected = false } = {}) {
  if (process.env.NVIDIA_MODEL && !includeRejected) return [process.env.NVIDIA_MODEL];

  const all = (await listModels()).filter(
    (id) => !UNSUITABLE.test(id) && (includeRejected || !rejected.has(id)),
  );
  const ordered = [];

  for (const pattern of PREFERENCES) {
    for (const id of all) {
      if (pattern.test(id) && !ordered.includes(id)) ordered.push(id);
    }
  }
  for (const id of all) if (!ordered.includes(id)) ordered.push(id);

  return ordered;
}

export async function resolveModel() {
  if (process.env.NVIDIA_MODEL) return process.env.NVIDIA_MODEL;
  if (cachedModel) return cachedModel;
  const list = await candidates();
  if (list.length === 0) {
    throw Object.assign(new Error("Your NVIDIA key has no usable models"), { status: 502 });
  }
  return list[0];
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

  // Try the cached winner first, then the rest in preference order.
  const list = cachedModel ? [cachedModel, ...(await candidates()).filter((m) => m !== cachedModel)] : await candidates();
  let lastError = null;

  // Each attempt gets its own budget, and we stop before the platform would cut
  // the function off. A model that will not answer in 20 seconds is not going
  // to be a good experience anyway, so we move on rather than waiting it out.
  const deadline = Date.now() + 52000;
  let attempt = 0;

  for (const model of list) {
    const remaining = deadline - Date.now();
    if (remaining < 6000) break;

    // The first candidate gets the lion's share: a refusal comes back in
    // milliseconds, so a long budget only ever costs time on a model that is
    // genuinely working but slow.
    const budget = attempt === 0 ? Math.min(38000, remaining) : Math.min(14000, remaining);
    attempt += 1;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), budget);

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

      // A model that times out is treated the same as one that refuses: note it
      // and try the next. Previously one slow model blocked every request.
      if (err.name === "AbortError") {
        // Do not blacklist on a timeout. Slowness is often transient load, and
        // permanently excluding the one model that actually works leaves the
        // request with nothing to fall back to.
        console.warn(`[api] ${model} did not answer in time, trying the next one`);
        if (cachedModel === model) cachedModel = null;
        lastError = Object.assign(
          new Error("The models were too slow to answer. Try again, or send shorter notes."),
          { status: 504 },
        );
        continue;
      }

      throw Object.assign(new Error("Could not reach the model"), { status: 504 });
    }
    clearTimeout(timeout);

    if (reply.ok) {
      const data = await reply.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) {
        if (cachedModel !== model) console.log("[api] using model", model);
        cachedModel = model;
        return text;
      }
      lastError = Object.assign(new Error("The model returned an empty answer"), { status: 502 });
      continue;
    }

    const body = await reply.text().catch(() => "");

    if (reply.status === 401) {
      throw Object.assign(new Error("The NVIDIA key was rejected"), { status: 500, detail: body.slice(0, 300) });
    }

    // Listed but not callable with this key. Remember it and move on.
    if (reply.status === 400 || reply.status === 403 || reply.status === 404) {
      console.warn(`[api] ${model} is not usable (${reply.status}), trying the next one`);
      rejected.add(model);
      if (cachedModel === model) cachedModel = null;
      lastError = Object.assign(new Error(`No model your key can use accepted the request`), { status: 502 });
      continue;
    }

    if (reply.status === 429) {
      throw Object.assign(new Error("Rate limited by NVIDIA. Wait a moment and try again."), { status: 502 });
    }

    lastError = Object.assign(new Error(`The model returned ${reply.status}`), { status: 502, detail: body.slice(0, 300) });
  }

  throw lastError || Object.assign(new Error("No usable model found for your key"), { status: 502 });
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
