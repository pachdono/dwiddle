import test from "node:test";
import assert from "node:assert/strict";
import { spreadAnswers } from "../src/mathText.js";

test("the right answer is no longer always first, and still right", () => {
  const spots = [0, 0, 0, 0];
  for (let n = 0; n < 200; n++) {
    const q = { id: "q" + n, q: "Q?", choices: ["right", "a", "b", "c"], answer: 0 };
    const r = spreadAnswers(q);
    assert.equal(r.choices[r.answer], "right");
    assert.deepEqual([...r.choices].sort(), ["a", "b", "c", "right"]);
    spots[r.answer]++;
  }
  assert.ok(spots.every((c) => c > 20), String(spots));
  const q = { id: "x", q: "Q?", choices: ["a", "b", "c", "d"], answer: 2 };
  assert.deepEqual(spreadAnswers(q), spreadAnswers(q));
});

test("all of the above stays put", () => {
  const q = { id: "y", q: "Q?", choices: ["a", "b", "All of the above"], answer: 2 };
  assert.equal(spreadAnswers(q), q);
});
