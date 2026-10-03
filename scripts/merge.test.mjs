// Run with: node --test --experimental-test-module-mocks scripts/merge.test.mjs
// Syncing must not undo an edit made on this device.
import { test, mock } from "node:test";
import assert from "node:assert/strict";

mock.module("@supabase/supabase-js", { namedExports: { createClient: () => ({}) } });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.window = globalThis;
const { merge } = await import("../src/supabase.js");

const base = (notes, savedAt) => ({ title: "Eco", topics: [{ name: "T" }], questions: [], notes, savedAt, materials: [{ id: "m1", title: "Eco", topics: ["T"], at: 1 }] });

test("notes edited here win over the older cloud copy of the same topic", () => {
  const local = { "dwiddle-made": base({ T: [{ p: "old" }, { sketch: { title: "PPC" } }] }, 2000), _times: { "dwiddle-made": 2000 } };
  const remote = { "dwiddle-made": base({ T: [{ p: "old" }] }, 1000), _times: { "dwiddle-made": 1000 } };
  assert.equal(merge(local, remote)["dwiddle-made"].notes.T.length, 2);
});

test("notes edited on another device win when they are newer", () => {
  const local = { "dwiddle-made": base({ T: [{ p: "old" }] }, 1000), _times: { "dwiddle-made": 1000 } };
  const remote = { "dwiddle-made": base({ T: [{ p: "old" }, { p: "new" }] }, 2000), _times: { "dwiddle-made": 2000 } };
  assert.equal(merge(local, remote)["dwiddle-made"].notes.T.length, 2);
});

const withItems = (extra = {}) => ({
  title: "Mixed", savedAt: 1000, questions: [{ id: "q1", topic: "A" }, { id: "q2", topic: "B" }], topics: [{ name: "A" }, { name: "B" }],
  notes: { A: [{ p: "a" }], B: [{ p: "b" }] }, lessons: {}, drills: [],
  materials: [{ id: "m1", title: "One", topics: ["A"], at: 1 }, { id: "m2", title: "Two", topics: ["B"], at: 2 }], ...extra,
});

test("an item deleted here does not come back from the cloud copy", async () => {
  const { withoutMaterial } = await import("../src/materials.js");
  const before = withItems();
  const after = { ...withoutMaterial(before, "m1"), savedAt: 2000 };
  const out = merge({ "dwiddle-made": after, _times: { "dwiddle-made": 2000 } }, { "dwiddle-made": before, _times: { "dwiddle-made": 1000 } })["dwiddle-made"];
  assert.deepEqual(out.materials.map((m) => m.id), ["m2"]);
  assert.deepEqual(out.topics.map((t) => t.name), ["B"]);
  assert.deepEqual(out.questions.map((q) => q.id), ["q2"]);
  assert.deepEqual(Object.keys(out.notes), ["B"]);
});

test("the deletion also reaches another device that still has the item", async () => {
  const { withoutMaterial } = await import("../src/materials.js");
  const before = withItems();
  const after = { ...withoutMaterial(before, "m2"), savedAt: 2000 };
  // this device is the stale one: the cloud copy has the deletion
  const out = merge({ "dwiddle-made": before, _times: { "dwiddle-made": 1000 } }, { "dwiddle-made": after, _times: { "dwiddle-made": 2000 } })["dwiddle-made"];
  assert.deepEqual(out.materials.map((m) => m.id), ["m1"]);
});

test("deleting the last item leaves nothing behind", async () => {
  const { withoutMaterial } = await import("../src/materials.js");
  const one = withItems({ topics: [{ name: "A" }], questions: [{ id: "q1", topic: "A" }], notes: { A: [{ p: "a" }] }, materials: [{ id: "m1", title: "One", topics: ["A"], at: 1 }] });
  const out = merge({ "dwiddle-made": { ...withoutMaterial(one, "m1"), savedAt: 2000 } }, { "dwiddle-made": one })["dwiddle-made"];
  assert.deepEqual(out.materials, []);
  assert.deepEqual(out.topics, []);
});
