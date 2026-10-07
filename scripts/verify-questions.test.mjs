import test, { mock } from "node:test";
import assert from "node:assert/strict";

// The model is stubbed: the first call writes questions, the second checks them.
let calls = [];
const q = (text, choices, answer, extra = {}) => ({ topic: "Chromatography", kind: "concept", q: text, choices, answer, why: "x", ...extra });
const written = [
  q("What is the purpose of paper chromatography?", ["to separate mixtures based on their melting points", "to separate mixtures based on viscosity", "to separate mixtures based on density", "to separate mixtures based on boiling points"], 0),
  q("Which solvent carries the sample up the paper?", ["the mobile phase", "the stationary phase", "the baseline", "the filtrate"], 1),
  q("What do we call the paper itself?", ["the stationary phase", "the mobile phase", "the solvent front", "the baseline"], 0),
  q("A question with no answer index", ["a", "b", "c", "d"], undefined),
  q("Twin options", ["same", "Same", "other", "another"], 0),
];
mock.module("../api/_llm.js", {
  namedExports: {
    ask: async (o) => { calls.push(o.system.slice(0, 20)); return o.system.startsWith("You are a strict") ? JSON.stringify({ checks: [{ n: 1, verdict: "drop" }, { n: 2, verdict: "fix", answer: 0 }, { n: 3, verdict: "ok" }] }) : JSON.stringify({ questions: written }); },
    safeParse: (t) => JSON.parse(t),
    guard: () => true, fail: (res, e) => res.status(500).json({ error: e.message }),
    userError: (res, s, m) => res.status(s).json({ error: m }), MAX_INPUT: 24000,
  },
});
const { default: handler } = await import("../api/generate.js");

test("wrong answers are dropped or corrected before students see them, and a missing answer never becomes A", async () => {
  const out = { status: 0, body: null };
  const res = { setHeader() {}, status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  const notes = "Paper chromatography separates a mixture by how far each part travels with the solvent. ".repeat(6);
  await handler({ method: "POST", headers: {}, socket: {}, body: { mode: "questions", notes, topics: [{ name: "Chromatography" }] } }, res);
  assert.equal(out.status, 200, JSON.stringify(out.body));
  const texts = out.body.questions.map((x) => x.q);
  assert.ok(!texts.some((t) => /purpose of paper chromatography/.test(t)), "the wrong one is dropped");
  assert.ok(!texts.some((t) => /no answer index|Twin options/.test(t)), "unusable ones never get through");
  const fixed = out.body.questions.find((x) => /Which solvent/.test(x.q));
  assert.equal(fixed.answer, 0, "corrected to the mobile phase");
  assert.ok(texts.some((t) => /paper itself/.test(t)));
  assert.equal(calls.length, 2);
});
