import test from "node:test";
import assert from "node:assert/strict";
import { merge } from "../src/supabase.js";

test("a made object without lists no longer throws", () => {
  const good = { questions: [{ id: 1, topic: "A" }], topics: [{ name: "A" }] };
  for (const bad of [{}, { savedAt: 1 }]) {
    assert.doesNotThrow(() => merge({ "dwiddle-made": good }, { "dwiddle-made": bad }));
    assert.doesNotThrow(() => merge({ "dwiddle-made": bad }, { "dwiddle-made": good }));
  }
});
