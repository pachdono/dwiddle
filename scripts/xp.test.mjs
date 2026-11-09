import test from "node:test";
import assert from "node:assert/strict";
import { levelOf } from "../src/xp.js";

test("levels step up as XP grows", () => {
  assert.deepEqual(levelOf(0), { level: 1, into: 0, need: 100 });
  assert.equal(levelOf(100).level, 2);
  assert.equal(levelOf(250).level, 3);
});
test("a corrupt XP value cannot freeze the page", () => {
  for (const bad of [Infinity, -Infinity, NaN, 1e999, "1e999", undefined, null, {}]) {
    const t = Date.now(); const r = levelOf(bad);
    assert.ok(Number.isFinite(r.level) && Date.now() - t < 500, String(bad));
  }
  assert.equal(levelOf(Infinity).level, 1);
  assert.equal(levelOf(1e15).level, levelOf(2e9).level, "a huge value is capped");
});
