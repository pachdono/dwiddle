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
