// Falling back between AI providers when daily allowances run out, with the
// network stubbed. Each test loads a fresh copy of the module, since it keeps
// what it has learned (used up models, the last good one) between calls.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.OPENROUTER_API_KEY = "or";
process.env.GROQ_API_KEY = "gq";
delete process.env.NVIDIA_API_KEY;
delete process.env.OPENROUTER_MODEL;
delete process.env.GROQ_MODEL;
// The fallback tests below are about the order providers are tried in when
// they fail, so the order is fixed and nothing is asked twice at once.
process.env.LLM_ORDER = "openrouter,groq";
process.env.LLM_HEDGE_MS = "0";

const MODELS = {
  "openrouter.ai": ["google/gemma-4-27b-it:free"],
  "api.groq.com": ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"],
};
const DAILY_OR = JSON.stringify({ error: { message: "Rate limit exceeded: free-models-per-day" } });
const TPD = (m) => JSON.stringify({ error: { message: `Rate limit reached for model \`${m}\` on tokens per day (TPD): Limit 100000, Used 99990` } });

let n = 0;
async function load(answer) {
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    const host = new URL(url).host;
    if (url.endsWith("/models")) return new Response(JSON.stringify({ data: MODELS[host].map((id) => ({ id })) }), { status: 200 });
    const model = JSON.parse(opts.body).model;
    calls.push(`${host.split(".")[1] === "groq" ? "groq" : host.split(".")[0]}/${model}`);
    const got = answer(host, model);
    const [status, body, wait] = got;
    // A slow provider: answers after a while, unless the request is called off.
    if (wait) {
      await new Promise((res, rej) => {
        const t = setTimeout(res, wait);
        opts.signal?.addEventListener("abort", () => { clearTimeout(t); rej(Object.assign(new Error("aborted"), { name: "AbortError" })); });
      });
    }
    return new Response(body, { status });
  };
  const mod = await import(`../api/_llm.js?copy=${n++}`);
  return { ask: () => mod.ask({ system: "s", user: "u" }), calls };
}
const ok = (text) => [200, JSON.stringify({ choices: [{ message: { content: text } }] })];

test("when OpenRouter and one Groq model are used up, the next Groq model answers", async () => {
  const { ask, calls } = await load((host, m) =>
    host === "openrouter.ai" ? [429, DAILY_OR] : m === "llama-3.3-70b-versatile" ? [429, TPD(m)] : ok("hello"));
  assert.equal(await ask(), "hello");
  assert.deepEqual(calls, ["openrouter/google/gemma-4-27b-it:free", "groq/llama-3.3-70b-versatile", "groq/openai/gpt-oss-120b"]);
  // Next time, neither used up one is asked again.
  calls.length = 0;
  assert.equal(await ask(), "hello");
  assert.deepEqual(calls, ["groq/openai/gpt-oss-120b"]);
});

test("the allowance message only when every provider is used up", async () => {
  const { ask } = await load((host, m) => (host === "openrouter.ai" ? [429, DAILY_OR] : [429, TPD(m)]));
  await assert.rejects(ask(), /today's AI allowance/);
});

test("OpenRouter used up and Groq busy says busy, not used up", async () => {
  const { ask } = await load((host) => (host === "openrouter.ai" ? [429, DAILY_OR] : [503, "overloaded"]));
  await assert.rejects(ask(), /busy/);
});

test("a request too large for one model is tried on the next", async () => {
  const { ask } = await load((host, m) =>
    host === "openrouter.ai" ? [429, DAILY_OR] : m === "llama-3.3-70b-versatile" ? [413, "Request too large"] : ok("fits"));
  assert.equal(await ask(), "fits");
});

test("the fastest provider is asked first when no order is fixed", async () => {
  const keep = process.env.LLM_ORDER;
  delete process.env.LLM_ORDER;
  const { ask, calls } = await load(() => ok("quick"));
  assert.equal(await ask(), "quick");
  assert.equal(calls[0].split("/")[0], "groq");
  process.env.LLM_ORDER = keep;
});

test("a slow first provider gets a second opinion, and the first answer wins", async () => {
  process.env.LLM_HEDGE_MS = "50";
  const { ask, calls } = await load((host) => (host === "openrouter.ai" ? [...ok("slow"), 2000] : ok("fast")));
  const t = Date.now();
  assert.equal(await ask(), "fast");
  assert.ok(Date.now() - t < 1500, "did not wait for the slow one");
  assert.deepEqual(calls, ["openrouter/google/gemma-4-27b-it:free", "groq/llama-3.3-70b-versatile"]);
  process.env.LLM_HEDGE_MS = "0";
});

test("a quick answer never asks a second provider", async () => {
  process.env.LLM_HEDGE_MS = "200";
  const { ask, calls } = await load(() => ok("first"));
  assert.equal(await ask(), "first");
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(calls.length, 1);
  process.env.LLM_HEDGE_MS = "0";
});

test("a picture only goes to a model that can see, and a text model is not written off for it", async () => {
  process.env.LLM_HEDGE_MS = "0";
  const keep = process.env.LLM_ORDER;
  process.env.LLM_ORDER = "groq,openrouter";
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    const host = new URL(url).host;
    if (url.endsWith("/models")) {
      const data = host === "openrouter.ai"
        ? [{ id: "google/gemma-4-27b-it:free", architecture: { input_modalities: ["text", "image"] } }]
        : [{ id: "llama-3.3-70b-versatile" }];
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
    const body = JSON.parse(opts.body);
    calls.push(body.model);
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
  };
  const mod = await import(`../api/_llm.js?copy=vision${Date.now()}`);
  assert.equal(await mod.ask({ system: "s", user: [{ type: "text", text: "read" }], vision: true }), "ok");
  assert.deepEqual(calls, ["google/gemma-4-27b-it:free"], "the text-only Groq model is not sent the picture");
  calls.length = 0;
  assert.equal(await mod.ask({ system: "s", user: "u" }), "ok");
  assert.deepEqual(calls, ["llama-3.3-70b-versatile"], "and it still answers text afterwards");
  process.env.LLM_ORDER = keep;
});
