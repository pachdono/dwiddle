import test from "node:test";
import assert from "node:assert/strict";
import { condenseSource } from "../src/ai.js";

test("a huge source is summarised chunk by chunk, in parallel, until it fits one build", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    assert.equal(body.mode, "condense");
    return { ok: true, status: 200, json: async () => ({ digest: "## Topic\n" + "fact ".repeat(200).slice(0, Math.floor(body.notes.length / 5)) }) };
  };
  const big = Array.from({ length: 400 }, (_, i) => `Page ${i} ` + "The mitochondria is the site of respiration. ".repeat(60)).join("\n");
  const seen = [];
  const out = await condenseSource(big, { onProgress: (d, of) => seen.push([d, of]) });
  assert.ok(out.length <= 24000, "fits one build, got " + out.length);
  assert.ok(calls.length > 5);
  assert.ok(seen.length === calls.length);
});

test("a chunk that cannot be summarised keeps its opening instead of vanishing", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({ error: "boom" }) });
  const big = "Alpha beta gamma. ".repeat(3000);
  const out = await condenseSource(big);
  assert.ok(out.includes("Alpha beta gamma"));
});
