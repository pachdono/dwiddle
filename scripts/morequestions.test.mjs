// A longer quiz asks for more questions in small batches and retries a batch
// that fails, so asking for ten does not quietly end at three.
import test from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.window = globalThis;
const seen = [];
let failFirstTry = false;
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  seen.push(body);
  // the last digit of the batch tag is the attempt number
  if (failFirstTry && body.batch.endsWith("0")) return { ok: false, status: 504, json: async () => ({ error: "slow" }) };
  return { ok: true, status: 200, json: async () => ({ questions: Array.from({ length: body.count }, (_, i) => ({ id: `n${body.batch}${i}`, topic: body.topics[0].name, q: "Q " + i + "?", choices: ["a", "b", "c", "d"], answer: 0, why: "w" })) }) };
};
const { moreQuestions } = await import("../src/ai.js");
const made = { topics: [{ name: "A" }], notes: { A: [] }, questions: Array.from({ length: 3 }, (_, i) => ({ id: "q" + i, topic: "A", q: "Q" + i, choices: ["a", "b"], answer: 0 })) };

test("seven more questions come as batches of four and three", async () => {
  seen.length = 0;
  const qs = await moreQuestions(made, ["A"], 7);
  assert.equal(qs.length, 7);
  assert.deepEqual(seen.map((b) => b.count).sort(), [3, 4]);
});
test("a batch that fails is tried again", async () => {
  seen.length = 0;
  failFirstTry = true;
  const qs = await moreQuestions(made, ["A"], 7);
  failFirstTry = false;
  assert.equal(qs.length, 7, "both batches should recover on the second try");
  assert.ok(seen.length >= 4, "each batch was asked again after failing");
});
test("nothing to write from, nothing asked", async () => {
  seen.length = 0;
  assert.deepEqual(await moreQuestions({ questions: [] }, ["A"], 5), []);
  assert.equal(seen.length, 0);
});
