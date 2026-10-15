import test, { mock } from "node:test";
import assert from "node:assert/strict";

// the model is replaced: first call writes the skill check, the second is the
// accuracy pass that looks over the answers
let replies = [];
mock.module("../api/_llm.js", {
  namedExports: {
    ask: async () => JSON.stringify(replies.shift()), safeParse: (t) => JSON.parse(t),
    guard: () => true, fail: (res, e) => res.status(500).json({ error: e.message }),
    userError: (res, s, m) => res.status(s).json({ error: m }), MAX_INPUT: 24000,
  },
});
const { default: handler } = await import("../api/generate.js");
const run = (body) => { const out = { status: 0, body: null }; const res = { setHeader() {}, status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  return handler({ method: "POST", headers: {}, socket: {}, body }, res).then(() => out); };

const NOTES = "Osmosis is the net movement of water molecules from a dilute solution to a concentrated solution through a partially permeable membrane. Diffusion is the net movement of particles from a region of higher concentration to a region of lower concentration. Active transport moves substances against a concentration gradient and needs energy from respiration. A plant cell placed in pure water becomes turgid because water enters by osmosis. ".repeat(2);
const q = (skill, text, answer, choices) => ({ skill, q: text, choices, answer, why: "Because." });
const good = {
  skills: ["Define osmosis", "Compare diffusion and active transport"],
  questions: [
    q("Define osmosis", "What is osmosis?", 1, ["Movement of solute", "Net movement of water through a partially permeable membrane", "Movement using energy", "Movement of gas"]),
    q("Define osmosis", "A plant cell in pure water becomes turgid. What moves into it by osmosis?", 2, ["Salt", "Glucose", "Water", "Oxygen"]),
    q("Compare diffusion and active transport", "Which process moves substances against a concentration gradient using energy from respiration?", 0, ["Active transport", "Diffusion", "Osmosis", "Evaporation"]),
    q("Compare diffusion and active transport", "Diffusion is the net movement of particles from where to where?", 3, ["Low to high concentration", "Inside to outside", "Cold to hot", "High to low concentration"]),
  ],
};

test("a skill check comes back with the skills it covers and a question for each", async () => {
  replies = [good, { checks: good.questions.map((_, i) => ({ n: i + 1, verdict: "ok" })) }];
  const r = await run({ mode: "skillcheck", notes: NOTES, topics: [{ name: "Transport" }], batch: 7 });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.skills, good.skills);
  assert.equal(r.body.questions.length, 4);
  assert.ok(r.body.questions.every((x) => good.skills.includes(x.skill) && x.id.startsWith("sk7q")));
  assert.equal(r.body.topic, "Transport");
});

test("a question for a skill that was never listed is dropped, and a skill with no question is left out", async () => {
  const bad = { skills: ["Define osmosis", "Ghost skill", "Compare diffusion and active transport"], questions: [...good.questions, q("Not listed", "What is osmosis?", 1, ["a", "b", "c", "d"])] };
  replies = [bad, { checks: good.questions.map((_, i) => ({ n: i + 1, verdict: "ok" })) }];
  const r = await run({ mode: "skillcheck", notes: NOTES, topics: [{ name: "Transport" }] });
  assert.equal(r.status, 200);
  assert.equal(r.body.skills.includes("Ghost skill"), false);
  assert.equal(r.body.questions.length, 4);
});

test("a wrong marked answer is fixed by the checking pass", async () => {
  replies = [good, { checks: [{ n: 1, verdict: "fix", answer: 1 }, { n: 2, verdict: "ok" }, { n: 3, verdict: "drop" }, { n: 4, verdict: "ok" }] }];
  const r = await run({ mode: "skillcheck", notes: NOTES, topics: [{ name: "Transport" }] });
  assert.equal(r.body.questions.length, 3);
});

test("too little back is an error to show, not an empty quiz", async () => {
  replies = [{ skills: ["Only one"], questions: [q("Only one", "What is osmosis?", 1, ["a", "b", "c", "d"])] }, { checks: [{ n: 1, verdict: "ok" }] }];
  const r = await run({ mode: "skillcheck", notes: NOTES, topics: [{ name: "Transport" }] });
  assert.equal(r.status, 502);
  replies = [];
  const none = await run({ mode: "skillcheck", notes: NOTES, topics: [] });
  assert.equal(none.status, 400);
});

test("vocabulary batches keep only single words in the asked for half of the alphabet", async () => {
  replies = [{ words: [{ word: "Ardent", meaning: "(adj) passionate" }, { word: "zealous", meaning: "(adj) eager" }, { word: "two words", meaning: "(n) no" }, { word: "benign", meaning: "(adj) harmless; gentle" },
    ...Array.from({ length: 12 }, (_, i) => ({ word: "c" + "o".repeat(i + 2), meaning: "(n) a thing" }))] }];
  const r = await run({ mode: "vocab", tier: 2, half: 1, count: 20, exam: "SSAT" });
  assert.equal(r.status, 200);
  assert.ok(r.body.words.every((w) => /^[a-l]/.test(w.word)));
  assert.equal(r.body.words.some((w) => w.word === "zealous"), false);
  assert.equal(r.body.words.find((w) => w.word === "benign").meaning, "(adj) harmless, gentle");
  replies = [{ words: [{ word: "ardent", meaning: "(adj) keen" }] }];
  assert.equal((await run({ mode: "vocab", tier: 1, half: 1 })).status, 502);
});
