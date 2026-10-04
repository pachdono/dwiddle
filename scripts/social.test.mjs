import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
mock.module("../src/supabase.js", { namedExports: { supabase: null } });
const { packMaterial, unpackMaterial } = await import("../src/social.js");

test("a folder round trips and carries no progress", () => {
  const view = { title: "Osmosis", topics: [{ id: "t0", name: "Osmosis", reason: "r", questions: 1 }], questions: [{ id: "q1", topic: "Osmosis", q: "What?", choices: ["a", "b"], answer: 0 }], lessons: { Osmosis: { done: true } }, notes: { Osmosis: [{ t: "p", text: "x" }] } };
  const got = unpackMaterial(JSON.parse(JSON.stringify(packMaterial(view))));
  assert.equal(got.topics.length, 1);
  assert.equal(got.questions.length, 1);
  assert.deepEqual(got.lessons, {});
});
test("junk from outside is dropped", () => {
  assert.equal(unpackMaterial(null), null);
  assert.equal(unpackMaterial({ topics: "x", questions: [] }), null);
  const got = unpackMaterial({ topics: [{ name: "A" }, { nope: 1 }], questions: [{ topic: "A", q: "ok" }, { topic: "B", q: "orphan" }, { topic: "A" }], notes: { B: [1], A: "bad" } });
  assert.equal(got.topics.length, 1);
  assert.equal(got.questions.length, 1);
  assert.deepEqual(got.notes, {});
});
