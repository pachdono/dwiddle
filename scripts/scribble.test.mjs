// Only a hard scribble rubs writing out; light wiggles and handwriting are just ink.
import test from "node:test";
import assert from "node:assert/strict";
import { isScribble } from "../src/scribble.js";

const pts = (n, f) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));
// a zigzag of `sweeps` passes across `w` wide, `h` tall, drifting along by `drift`
const zigzag = (sweeps, w = 120, h = 24, drift = 0) => pts(sweeps * 12 + 1, (t) => {
  const phase = t * sweeps; const k = phase % 2;
  const x = (k <= 1 ? k : 2 - k) * w;
  return [x + t * drift, h * (0.5 + 0.5 * Math.sin(t * sweeps * Math.PI * 2.7))];
});

test("a hard scribble of several passes counts", () => {
  assert.equal(isScribble(zigzag(9)), true);
  assert.equal(isScribble(zigzag(12, 90, 30)), true);
});
test("a light wiggle of two or three passes does not", () => {
  assert.equal(isScribble(zigzag(2)), false);
  assert.equal(isScribble(zigzag(3)), false);
  assert.equal(isScribble(zigzag(4)), false);
  assert.equal(isScribble(zigzag(6)), false);
  assert.equal(isScribble(zigzag(7)), false);
});
test("cursive writing and wavy lines are ink, not a scribble", () => {
  // "mmmmmm": lots of turns, but small next to the word, always moving right
  const cursive = pts(240, (t) => [t * 220, 12 + Math.abs(Math.sin(t * Math.PI * 14)) * -14]);
  assert.equal(isScribble(cursive), false);
  // a long wave
  assert.equal(isScribble(pts(200, (t) => [t * 300, Math.sin(t * Math.PI * 10) * 10])), false);
});
test("a circle, a line and a tiny squiggle do not", () => {
  assert.equal(isScribble(pts(60, (t) => [Math.cos(t * 12.5) * 40, Math.sin(t * 12.5) * 40])), false);
  assert.equal(isScribble(pts(40, (t) => [t * 100, t * 20])), false);
  assert.equal(isScribble(zigzag(8, 6, 3)), false);
});
test("a stroke that drifts along while scribbling is still not mistaken for writing when it sweeps hard", () => {
  assert.equal(isScribble(zigzag(12, 80, 20, 20)), true);
});
