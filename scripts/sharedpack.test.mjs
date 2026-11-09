import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
mock.module("../src/supabase.js", { namedExports: { supabase: null } });
const { unpackMaterial } = await import("../src/social.js");

const pack = (questions, topics = [{ name: "Osmosis" }], extra = {}) => ({ title: "t", topics, questions, ...extra });
const good = { id: "q1", topic: "Osmosis", q: "What moves?", choices: ["water", "salt"], answer: 0, why: "Water." };

test("a well formed question passes through", () => {
  const got = unpackMaterial(pack([good]));
  assert.equal(got.questions.length, 1);
  assert.deepEqual(got.questions[0].choices, ["water", "salt"]);
});

test("questions that would crash the quiz screens are dropped", () => {
  const bad = [
    { topic: "Osmosis", type: "mc", q: "no choices" },
    { topic: "Osmosis", q: "answer out of range", choices: ["a", "b"], answer: 5 },
    { topic: "Osmosis", q: "answer not a number", choices: ["a", "b"], answer: "0" },
    { topic: "Osmosis", q: "one choice", choices: ["a"], answer: 0 },
    { topic: "Osmosis", q: "odd type", type: "script", choices: ["a", "b"], answer: 0 },
    { topic: "Elsewhere", q: "unknown topic", choices: ["a", "b"], answer: 0 },
    null, 7, "text",
  ];
  const got = unpackMaterial(pack([...bad, good]));
  assert.equal(got.questions.length, 1);
});

test("non string fields are made safe", () => {
  const got = unpackMaterial(pack([{ ...good, choices: [{ x: 1 }, "b"], why: { a: 1 } }]));
  assert.deepEqual(got.questions[0].choices, ["", "b"]);
  assert.equal(got.questions[0].why, "");
});

test("topic names that poison plain objects are refused", () => {
  const topics = [{ name: "__proto__" }, { name: "constructor" }, { name: "prototype" }, { name: "Osmosis" }];
  const got = unpackMaterial(pack([{ ...good, topic: "__proto__" }, good], topics, { notes: { __proto__: [1], constructor: [2], Osmosis: [3] } }));
  assert.deepEqual(got.topics.map((t) => t.name), ["Osmosis"]);
  assert.equal(got.questions.length, 1);
  assert.deepEqual(Object.keys(got.notes), ["Osmosis"]);
  assert.equal({}.n, undefined);
});
