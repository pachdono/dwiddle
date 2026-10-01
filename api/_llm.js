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

import { asked } from "./_guard.js";

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
    supportsReasoningFlag: true,
    // Reading a page is a different job from writing JSON, so it gets its own
    // order. Instruction tuned families that are known to be steady at
    // transcription come first; reasoning and omni variants last, because they
    // narrate what they see instead of just writing it out.
    visionPreferences: [
      /^google\/gemma-4-\d+b(-a\d+b)?-it:free/i,
      /^google\/gemma-3-\d+b-it/i,
      /^inclusionai\/ling.*-vl:free/i,
      /^qwen\/qwen[\d.]*-vl/i,
      /^google\/gemini-[\d.]+-flash/i,
      /^mistralai\/pixtral/i,
    ],
    // Free first. Someone running on a free key is the common case, and a
    // paid model that returns 402 costs a round trip to discover.
    preferences: [
      // Instruction tuned first. Reasoning models answer quickly on a short
      // probe but spend a whole generation budget thinking out loud, which is
      // exactly the wrong shape for "return one JSON object".
      /^google\/gemma-4-\d+b-it:free/i,
      /^inclusionai\/ling.*flash.*:free/i,
      /^z-ai\/glm.*:free/i,
      /^nvidia\/nemotron-3-super.*:free/i,
      /^minimax\/minimax-m2[0-9.]*:free/i,
      /^minimax\/minimax-m[0-9.]+:free/i,
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
    id: "groq",
    env: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    base: "https://api.groq.com/openai/v1",
    extraHeaders: {},
    // Groq's daily limits are per model: when one runs out, the others still
    // have theirs. OpenRouter's are for the whole key.
    dailyPerModel: true,
    // Groq rejects unknown fields, so it gets none of the OpenRouter extras.
    supportsReasoningFlag: false,
    preferences: [
      /^llama-3\.3-70b-versatile$/i,
      /^moonshotai\/kimi-k2-instruct/i,
      /^openai\/gpt-oss-120b$/i,
      /^qwen\/qwen3-32b$/i,
      /^openai\/gpt-oss-20b$/i,
      /^llama-3\.1-8b-instant$/i,
      /^gemma2-9b-it$/i,
      /versatile|instant|instruct/i,
    ],
  },
  {
    id: "nvidia",
    env: "NVIDIA_API_KEY",
    modelEnv: "NVIDIA_MODEL",
    base: "https://integrate.api.nvidia.com/v1",
    extraHeaders: {},
    supportsReasoningFlag: false,
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

// Every provider that has a key, in order. The first is used; the rest are
// fallbacks, tried only when everything the one above offers has failed.
export function providers() {
  const found = PROVIDERS.filter((p) => process.env[p.env]);
  if (found.length === 0) {
    throw Object.assign(
      new Error("No model provider is configured. Set OPENROUTER_API_KEY, GROQ_API_KEY or NVIDIA_API_KEY."),
      { status: 500 },
    );
  }
  return found;
}

export function provider() {
  return providers()[0];
}

function authHeaders(p) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env[p.env]}`,
    ...p.extraHeaders,
  };
}

// Models that exist but are wrong for writing questions. Note that this rules
// out vision, image and ocr on purpose: they are poor at long structured JSON.
const UNSUITABLE =
  /vision|translate|embed|rerank|guard|reward|coder|-code-|-code:|ocr|speech|riva|image|tts|whisper|content-safety|:batch|:online|:extended|:thinking|moderation/i;

// The same list minus the terms that describe exactly what a transcription job
// needs, since asking for a vision model and then excluding every model with
// "vision" in its name would leave nothing at all.
const UNSUITABLE_FOR_READING =
  /translate|embed|rerank|guard|reward|coder|-code-|-code:|speech|riva|tts|whisper|content-safety|:batch|:online|moderation/i;

let cachedModel = null; // { provider, model }

// What has used up its daily allowance, until the next midnight UTC, so a
// warm server does not spend a request on each of them every time.
const spent = new Map(); // "provider" or "provider/model" -> time it resets
const nextMidnightUTC = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1); };
const isSpent = (key) => { const until = spent.get(key); if (until && Date.now() < until) return true; spent.delete(key); return false; };
let paidBlocked = false;
const rejected = new Set();

const modelCache = new Map(); // provider id -> { at, info: [{ id, vision }] }
const MODEL_TTL = 10 * 60 * 1000;

export async function listModels(p = provider()) {
  const hit = modelCache.get(p.id);
  if (hit && Date.now() - hit.at < MODEL_TTL) return hit.info.map((m) => m.id);

  const reply = await fetch(`${p.base}/models`, { headers: authHeaders(p) });
  if (!reply.ok) {
    throw Object.assign(
      new Error(reply.status === 401 ? "The API key was rejected" : `Listing models returned ${reply.status}`),
      { status: reply.status === 401 ? 500 : 502 },
    );
  }
  const data = await reply.json();
  // Whether a model can read an image is metadata the provider already gives
  // us, so it is kept rather than guessed at from the name. OpenRouter reports
  // it two different ways depending on how old the entry is; anything else
  // falls back to the naming conventions the vision families all follow.
  const info = (data?.data || [])
    .filter((m) => m?.id)
    .map((m) => ({
      id: m.id,
      vision:
        (m.architecture?.input_modalities || []).includes("image") ||
        /image/.test(m.architecture?.modality || "") ||
        VISION_NAME.test(m.id),
    }));
  modelCache.set(p.id, { at: Date.now(), info });
  return info.map((m) => m.id);
}

// For providers that report no modality metadata at all.
const VISION_NAME = /vision|vl[-:]|[-/]vl|llava|pixtral|gemini|gemma-3|internvl|qwen2?\.?5?-vl|llama-4-(scout|maverick)/i;

export async function listVisionModels(p = provider()) {
  await listModels(p);
  return (modelCache.get(p.id)?.info || []).filter((m) => m.vision).map((m) => m.id);
}

// Ordered best first, with anything already known to fail removed.
// includeRejected is for the probe endpoint, which wants the full picture.
export async function candidates({ includeRejected = false, vision = false, p = provider() } = {}) {
  const pinned = process.env[p.modelEnv];
  if (pinned && !includeRejected && !vision) return [pinned];

  const seeing = vision ? new Set(await listVisionModels(p)) : null;
  const all = (await listModels(p)).filter(
    (id) =>
      !(vision ? UNSUITABLE_FOR_READING : UNSUITABLE).test(id) &&
      (!seeing || seeing.has(id)) &&
      (includeRejected || !rejected.has(id)) &&
      // Once a paid model has refused for want of credit, the rest will too.
      (includeRejected || !paidBlocked || id.endsWith(":free")),
  );
  const ordered = [];

  const order = vision ? (p.visionPreferences || p.preferences) : p.preferences;
  for (const pattern of order) {
    for (const id of all) {
      if (pattern.test(id) && !ordered.includes(id)) ordered.push(id);
    }
  }
  for (const id of all) if (!ordered.includes(id)) ordered.push(id);

  return ordered;
}

export async function resolveModel(p = provider()) {
  if (process.env[p.modelEnv]) return process.env[p.modelEnv];
  if (cachedModel) return cachedModel;
  const list = await candidates({ p });
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
// Close an answer that stopped mid sentence. Walks back to each point where a
// complete element ended, shuts the brackets that are still open, and returns
// the first prefix that parses. A truncated set of questions is worth far more
// than nothing at all.
function repair(t, requiredKey) {
  const start = t.search(/[[{]/);
  if (start === -1) return null;

  const stack = [];
  const closable = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") {
      stack.pop();
      // A complete element just ended here, so this is a place we could stop.
      closable.push({ index: i, open: [...stack] });
    }
  }

  for (let n = closable.length - 1; n >= 0; n--) {
    const { index, open } = closable[n];
    let candidate = t.slice(start, index + 1).replace(/,\s*$/, "");
    candidate += open.reverse().join("");
    try {
      const parsed = JSON.parse(candidate);
      if (!requiredKey || parsed?.[requiredKey] !== undefined) return parsed;
    } catch {
      // keep walking back
    }
  }
  return null;
}

export function safeParse(text, requiredKey) {
  if (!text) return null;

  let t = String(text).trim();
  // Some models emit their working in tags before the answer.
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  t = t.replace(/```(?:json)?/gi, "").trim();

  const found = [];

  // Every balanced object or array in the text, not just the first one. A model
  // that reasons in prose will produce braces long before the real answer.
  for (let start = 0; start < t.length; start++) {
    const open = t[start];
    if (open !== "{" && open !== "[") continue;

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
            const parsed = JSON.parse(t.slice(start, i + 1));
            if (parsed && typeof parsed === "object") found.push({ parsed, length: i + 1 - start });
          } catch {
            // not valid, keep looking
          }
          start = i; // do not rescan the inside of what we just consumed
          break;
        }
      }
    }
  }

  if (requiredKey) {
    const match = found.filter((f) => f.parsed?.[requiredKey] !== undefined);
    if (match.length) return match.sort((a, b) => b.length - a.length)[0].parsed;

    // Complete objects exist but none is the answer, which is what a reply cut
    // off mid array looks like: the inner entries closed, the outer one never
    // did. Try to close it before giving up.
    const salvaged = repair(t, requiredKey);
    if (salvaged) return salvaged;
  }

  if (found.length === 0) return repair(t) ?? null;

  // Otherwise the largest object is the likeliest to be the answer.
  return found.sort((a, b) => b.length - a.length)[0].parsed;
}

/* ---------- the fastest provider first, and a second opinion when slow ---------- */

// How long each provider has been taking, in milliseconds per thousand
// characters of answer, averaged over recent answers on this server. Until
// there is any, a prior: Groq runs on its own chips and is usually several
// times faster than the free OpenRouter models, which queue.
const PRIOR = { groq: 900, nvidia: 3000, openrouter: 4500 };
const pace = new Map();
function notePace(id, ms, chars) {
  const v = ms / Math.max(0.3, chars / 1000);
  const old = pace.get(id);
  pace.set(id, old == null ? v : old * 0.7 + v * 0.3);
}
const paceOf = (p) => pace.get(p.id) ?? PRIOR[p.id] ?? 4000;

// Every provider with a key, fastest first. LLM_ORDER (ids, comma separated)
// fixes the order instead, for anyone who wants a particular one first.
export function byPace(list) {
  const fixed = String(process.env.LLM_ORDER || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (fixed.length) return [...list].sort((a, b) => (fixed.indexOf(a.id) + 1 || 99) - (fixed.indexOf(b.id) + 1 || 99));
  return [...list].sort((a, b) => paceOf(a) - paceOf(b));
}

// When the first provider has not answered in this long, the same request
// also goes to the next one, and whichever answers first is used. Most
// requests finish well inside it, so the second is rarely asked.
const HEDGE_MS = Number(process.env.LLM_HEDGE_MS || 12000);

// The student's level, when the app knows it, so nothing comes back pitched
// above them or wandering beyond what they asked for.
function pitched(opts) {
  const level = asked.getStore()?.level;
  if (!level) return opts;
  const note = `\n\nThe student studies at this level: ${level}. Pitch the wording, explanations and examples at that level. Wherever you choose what to cover, keep to what students at that level are taught and to what was asked, and never add more advanced material, extra topics or tangents nobody asked for. When the student's own notes are given, everything you write comes from those notes alone: the level only changes how it is worded, never what is covered.`;
  if (opts.system) return { ...opts, system: opts.system + note };
  if (Array.isArray(opts.messages) && opts.messages[0]?.role === "system" && typeof opts.messages[0].content === "string") {
    return { ...opts, messages: [{ ...opts.messages[0], content: opts.messages[0].content + note }, ...opts.messages.slice(1)] };
  }
  return opts;
}

export async function ask(opts) {
  opts = pitched(opts);
  const all = byPace(providers());
  const deadline = Date.now() + 44000;
  const usable = all.filter((p) => !isSpent(p.id));
  if (usable.length < 2 || !(HEDGE_MS > 0)) return askVia(all, opts, deadline);
  const a = new AbortController(), b = new AbortController();
  return new Promise((resolve, reject) => {
    let done = false, hedged = false, firstErr = null, pending = 1;
    const win = (text) => { if (done) return; done = true; clearTimeout(timer); a.abort(); b.abort(); resolve(text); };
    const lose = (err, first) => {
      if (done) return;
      if (first) firstErr = err;
      pending -= 1;
      if (first && !hedged) { clearTimeout(timer); done = true; return reject(err); }
      if (pending === 0) { done = true; reject(firstErr || err); }
    };
    askVia(all, opts, deadline, a.signal).then(win, (e) => lose(e, true));
    const timer = setTimeout(() => {
      if (done || deadline - Date.now() < 8000) return;
      hedged = true; pending += 1;
      const rest = usable.slice(1);
      askVia([...rest, ...all.filter((p) => !rest.includes(p))], opts, deadline, b.signal).then(win, (e) => lose(e, false));
    }, HEDGE_MS);
  });
}

async function askVia(all, { system, user, messages, maxTokens = 4000, temperature = 0.4, json = false, vision = false }, deadline, outer) {
  let lastError = null;
  // Set when the provider says the allowance for the whole day is spent, which
  // no amount of waiting a minute will fix.
  let spentProviders = 0;

  for (const p of all) {
    if (isSpent(p.id)) { spentProviders++; continue; }
    let spentHere = false;
    // Try the cached winner for this provider first, then the rest in order.
    // A picture only goes to models that can see; the last text model that
    // worked is no guide to which of those will.
    const cached = !vision && cachedModel?.provider === p.id ? cachedModel.model : null;
    let list, full;
    try {
      const found = await candidates({ p, vision });
      if (!found.length) { lastError = Object.assign(new Error(`No ${p.id} model can read pictures`), { status: 502 }); continue; }
      full = cached ? [cached, ...found.filter((m) => m !== cached)] : found;
      list = full.filter((m) => !isSpent(`${p.id}/${m}`));
    } catch (err) {
      lastError = err;
      continue; // this provider cannot even list models, try the next
    }

    for (const model of list) {
      const remaining = deadline - Date.now();
      if (remaining < 6000) break;

      if (outer?.aborted) throw Object.assign(new Error("Answered elsewhere"), { status: 499 });
      const controller = new AbortController();
      // A model that has said nothing for 20 seconds is usually stuck, not
      // thinking; the next one is tried rather than waiting it out.
      const timeout = setTimeout(() => controller.abort(), Math.min(json ? 20000 : 30000, remaining - 2000));
      const stop = () => controller.abort();
      outer?.addEventListener("abort", stop, { once: true });
      const began = Date.now();

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
            // Reasoning models otherwise spend the whole budget thinking out
            // loud and never reach the answer. Both fields are ignored by
            // providers and models that do not support them.
            ...(json ? { response_format: { type: "json_object" } } : {}),
            ...(p.supportsReasoningFlag ? { reasoning: { enabled: false, exclude: true } } : {}),
            // A conversation passes its turns; everything else is one question.
            messages: [
              { role: "system", content: system },
              ...(messages || [{ role: "user", content: user }]),
            ],
          }),
        });
      } catch (err) {
        clearTimeout(timeout);
        outer?.removeEventListener("abort", stop);
        if (outer?.aborted) throw Object.assign(new Error("Answered elsewhere"), { status: 499 });

        if (err.name === "AbortError") {
          // Slowness is usually transient load, so this does not blacklist,
          // but it does count against the provider's pace.
          notePace(p.id, Date.now() - began, 300);
          console.warn(`[api] ${p.id}/${model} did not answer in time`);
          if (cachedModel?.model === model) cachedModel = null;
          lastError = Object.assign(
            new Error("The model service is busy at the moment. Wait a minute and try again."),
            { status: 503 },
          );
          continue;
        }

        lastError = Object.assign(new Error(`Could not reach ${p.id}`), { status: 504 });
        break; // network trouble with this provider, move to the next one
      }
      clearTimeout(timeout);
      outer?.removeEventListener("abort", stop);

      if (reply.ok) {
        const data = await reply.json().catch(() => null);
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          if (!vision) notePace(p.id, Date.now() - began, text.length);
          if (cachedModel?.model !== model) console.log(`[api] using ${p.id}/${model}`);
          if (!vision) cachedModel = { provider: p.id, model };
          return text;
        }
        lastError = Object.assign(new Error("The model returned an empty answer"), { status: 502 });
        continue;
      }

      const body = await reply.text().catch(() => "");

      if (reply.status === 401) {
        lastError = Object.assign(new Error(`The ${p.id} key was rejected`), { status: 500, detail: body.slice(0, 200) });
        break; // a bad key will not improve with another model
      }

      if (reply.status === 402) {
        console.warn(`[api] ${p.id}/${model} needs credit, falling back to free models`);
        paidBlocked = true;
        rejected.add(model);
        lastError = Object.assign(new Error("No credit for paid models on this key."), { status: 503 });
        continue;
      }

      if (reply.status === 429 && /per.?day|daily|\(TPD\)|\(RPD\)/i.test(body)) {
        console.warn(`[api] ${p.id}/${model} daily allowance spent: ${body.slice(0, 160)}`);
        if (cachedModel?.model === model) cachedModel = null;
        if (p.dailyPerModel) {
          // Only this model is used up: the next one has its own allowance.
          spent.set(`${p.id}/${model}`, nextMidnightUTC());
          lastError = Object.assign(new Error("The AI service is busy at the moment. Wait a minute and try again."), { status: 503 });
          continue;
        }
        // Every free model on the key draws on the same daily allowance, so
        // trying the rest only spends more requests on the same refusal.
        spent.set(p.id, nextMidnightUTC());
        spentHere = true;
        break;
      }

      if (reply.status === 413) {
        // Too long for this model's limits: a larger one may take it.
        console.warn(`[api] ${p.id}/${model} request too large`);
        lastError = Object.assign(new Error("That was too long for the AI service. Try a shorter piece."), { status: 413 });
        continue;
      }

      if (reply.status === 429 || reply.status === 529 || reply.status === 503) {
        console.warn(`[api] ${p.id}/${model} is busy (${reply.status})`);
        lastError = Object.assign(
          new Error("The model service is busy at the moment. Wait a minute and try again."),
          { status: 503 },
        );
        continue;
      }

      if (reply.status === 400 || reply.status === 403 || reply.status === 404) {
        console.warn(`[api] ${p.id}/${model} unusable (${reply.status})`);
        // Refusing a picture says nothing about text, so only text refusals stick.
        if (!vision) rejected.add(model);
        if (cachedModel?.model === model) cachedModel = null;
        lastError = Object.assign(new Error("No model this key can use accepted the request"), { status: 502 });
        continue;
      }

      lastError = Object.assign(new Error(`${p.id} returned ${reply.status}`), { status: 502, detail: body.slice(0, 200) });
    }
    // Used up: the whole key, or, where limits are per model, every model.
    if (spentHere || (p.dailyPerModel && full?.length && full.every((m) => isSpent(`${p.id}/${m}`)))) spentProviders++;
  }

  // The allowance message only when every provider is used up for the day;
  // otherwise whatever actually went wrong with the last one tried.
  if (spentProviders === all.length) {
    throw Object.assign(
      new Error("Dwiddle has used today's AI allowance. It resets at midnight UTC, so try again then."),
      { status: 503, limit: true },
    );
  }
  // A paid model asking for credit is how the fallback path ends when the free
  // ones are busy. To the student that means busy, and the wording about keys
  // and credit is the operator's business, not theirs.
  if (lastError && /credit/i.test(lastError.message)) {
    throw Object.assign(new Error("The AI service is busy at the moment. Wait a minute and try again."), { status: 503 });
  }
  throw lastError || Object.assign(new Error("No usable model found"), { status: 502 });
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
  res.status(status).json({ error: err.message, ...(err.limit ? { limit: true } : {}) });
}
