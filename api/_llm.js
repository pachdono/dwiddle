// Talking to a language model, whichever provider is configured.
//
// The key lives only here, in a serverless environment variable. Anything
// shipped to the browser can be read by anyone who opens the developer tools,
// so the browser talks to this function and this function talks to the model.
//
//   Browser --POST /api/*--> this function --with key--> provider --> JSON back
//
// Two providers are supported and both speak the OpenAI chat format, so the
// only differences are the host, the auth header and which models exist.
// OpenRouter is preferred when its key is present, because the NVIDIA free
// tier limits an account to a couple of models and is frequently saturated.
//
// Files in /api beginning with an underscore are not routed, so this is a
// module rather than an endpoint.

const PROVIDERS = [
  {
    id: "openrouter",
    env: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    base: "https://openrouter.ai/api/v1",
    // OpenRouter asks for these so usage is attributed to your app.
    extraHeaders: {
      "HTTP-Referer": process.env.PUBLIC_SITE_URL || "https://dwiddle.vercel.app",
      "X-Title": "Dwiddle",
    },
    // Free first. Someone running on a free key is the common case, and a
    // paid model that returns 402 costs a round trip to discover.
    preferences: [
      /^z-ai\/glm.*:free/i,
      /^minimax\/minimax-m[0-9.]+:free/i,
      /^google\/gemma-4-\d+b-it:free/i,
      /^nvidia\/nemotron-3-super.*:free/i,
      /^nvidia\/nemotron-3-ultra.*:free/i,
      /^inclusionai\/ling.*:free/i,
      /:free$/i,
      /^google\/gemini-[0-9.]+-flash-lite$/i,
      /^google\/gemini-[0-9.]+-flash$/i,
      /^openai\/gpt-4o-mini$/i,
      /^anthropic\/claude-[0-9.]+-haiku$/i,
      /^meta-llama\/llama-3\.3-70b-instruct$/i,
      /^deepseek\/deepseek-chat/i,
      /flash/i,
      /instruct/i,
    ],
  },
  {
    id: "nvidia",
    env: "NVIDIA_API_KEY",
    modelEnv: "NVIDIA_MODEL",
    base: "https://integrate.api.nvidia.com/v1",
    extraHeaders: {},
    preferences: [
      /deepseek-v[0-9]+.*flash/i,
      /deepseek-v[0-9]/i,
      /flash/i,
      /mistral-nemo-12b-instruct/i,
      /phi-3\.5-moe-instruct/i,
      /granite-3\.0-8b-instruct/i,
      /mistral-7b-instruct/i,
      /nemotron-51b-instruct/i,
      /llama-3\.3-70b-instruct/i,
      /instruct/i,
    ],
  },
];

export function provider() {
  const found = PROVIDERS.find((p) => process.env[p.env]);
  if (!found) {
    throw Object.assign(
      new Error("No model provider is configured. Set OPENROUTER_API_KEY or NVIDIA_API_KEY."),
      { status: 500 },
    );
  }
  return found;
}

function authHeaders(p) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env[p.env]}`,
    ...p.extraHeaders,
  };
}

// Models that exist but are wrong for this job.
const UNSUITABLE =
  /vision|translate|embed|rerank|guard|reward|coder|-code-|-code:|ocr|speech|riva|image|tts|whisper|content-safety|:batch|:online|:extended|:thinking|moderation/i;

let cachedModel = null;
let paidBlocked = false;
const rejected = new Set();

export async function listModels() {
  const p = provider();
  const reply = await fetch(`${p.base}/models`, { headers: authHeaders(p) });
  if (!reply.ok) {
    throw Object.assign(
      new Error(reply.status === 401 ? "The API key was rejected" : `Listing models returned ${reply.status}`),
      { status: reply.status === 401 ? 500 : 502 },
    );
  }
  const data = await reply.json();
  return (data?.data || []).map((m) => m.id).filter(Boolean);
}

// Ordered best first, with anything already known to fail removed.
// includeRejected is for the probe endpoint, which wants the full picture.
export async function candidates({ includeRejected = false } = {}) {
  const p = provider();
  const pinned = process.env[p.modelEnv];
  if (pinned && !includeRejected) return [pinned];

  const all = (await listModels()).filter(
    (id) =>
      !UNSUITABLE.test(id) &&
      (includeRejected || !rejected.has(id)) &&
      // Once a paid model has refused for want of credit, the rest will too.
      (includeRejected || !paidBlocked || id.endsWith(":free")),
  );
  const ordered = [];

  for (const pattern of p.preferences) {
    for (const id of all) {
      if (pattern.test(id) && !ordered.includes(id)) ordered.push(id);
    }
  }
  for (const id of all) if (!ordered.includes(id)) ordered.push(id);

  return ordered;
}

export async function resolveModel() {
  const p = provider();
  if (process.env[p.modelEnv]) return process.env[p.modelEnv];
  if (cachedModel) return cachedModel;
  const list = await candidates();
  if (list.length === 0) {
    throw Object.assign(new Error("No usable models for this key"), { status: 502 });
  }
  return list[0];
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
  const p = provider();

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

    // Not a fixed share per attempt. Models the account cannot use refuse in
    // milliseconds, so the budget is simply whatever is left, and the first
    // model that actually starts working gets nearly the whole window.
    const budget = Math.min(40000, remaining - 3000);
    attempt += 1;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), budget);

    let reply;
    try {
      reply = await fetch(`${p.base}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: authHeaders(p),
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
          new Error("The free model service is busy at the moment. Wait a minute and try again."),
          { status: 503 },
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
      throw Object.assign(new Error("The API key was rejected"), { status: 500, detail: body.slice(0, 300) });
    }

    // Listed but not callable with this key. Remember it and move on.
    if (reply.status === 400 || reply.status === 403 || reply.status === 404) {
      console.warn(`[api] ${model} is not usable (${reply.status}), trying the next one`);
      rejected.add(model);
      if (cachedModel === model) cachedModel = null;
      lastError = Object.assign(new Error(`No model your key can use accepted the request`), { status: 502 });
      continue;
    }

    // Out of credit. Every paid model will say the same, so switch to free
    // only and carry on rather than working through the whole paid catalogue.
    if (reply.status === 402) {
      console.warn(`[api] ${model} needs credit, falling back to free models`);
      paidBlocked = true;
      rejected.add(model);
      lastError = Object.assign(
        new Error("No credit on this key for paid models, and no free model answered. Try again shortly."),
        { status: 503 },
      );
      continue;
    }

    // 429 and 529 are capacity, not configuration. The free tier for these
    // models is frequently saturated, so try the next candidate rather than
    // giving up, and say what is actually happening if none of them are free.
    if (reply.status === 429 || reply.status === 529 || reply.status === 503) {
      console.warn(`[api] ${model} is busy (${reply.status}), trying the next one`);
      lastError = Object.assign(
        new Error("The free model service is busy at the moment. Wait a minute and try again."),
        { status: 503 },
      );
      continue;
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
