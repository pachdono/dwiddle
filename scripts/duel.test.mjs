import test from "node:test";
import assert from "node:assert/strict";
import { points, rank, tally, newCode, cleanCode, duelQuestions } from "../src/duel.js";

test("a right answer beats a wrong one, and quicker beats slower", () => {
  assert.equal(points(false, 100), 0);
  assert.equal(points(true, 0), 150);
  assert.equal(points(true, 6000), 125);
  assert.equal(points(true, 60000), 100);
  assert.ok(points(true, 2000) > points(true, 5000));
});
test("a slow right answer still beats a fast wrong one", () => {
  assert.ok(points(true, 99999) > points(false, 1));
});
test("ranking is score, then time, then name", () => {
  const r = rank([{ name: "b", score: 200, ms: 5 }, { name: "a", score: 200, ms: 9 }, { name: "c", score: 300, ms: 99 }, { name: "d", score: 200, ms: 5 }]);
  assert.deepEqual(r.map((p) => p.name), ["c", "b", "d", "a"]);
});
test("tally adds up", () => {
  let p = { score: 0, right: 0, answered: 0, ms: 0 };
  p = tally(p, true, 3000); p = tally(p, false, 2000);
  assert.deepEqual([p.right, p.answered, p.ms], [1, 2, 5000]);
});
test("codes are five easy characters", () => {
  assert.match(newCode(), /^[A-HJ-NP-Z2-9]{5}$/);
  assert.equal(cleanCode(" ab-c1 2x "), "ABC12");
});
test("only markable questions are sent", () => {
  const out = duelQuestions([{ q: "x", choices: ["a", "b"], answer: 1 }, { q: "y", type: "blank" }, { q: "z", choices: ["a"], answer: 3 }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].answer, 1);
});
