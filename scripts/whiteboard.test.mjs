import test from "node:test";
import assert from "node:assert/strict";
import { apply, cleanStroke, thin, hits, touching, personColour, MAX_STROKES, W, H } from "../src/whiteboard.js";

const s = (id, pts, extra = {}) => ({ id, by: "a", c: "#d93a3a", w: 10, pts, ...extra });

test("a first segment starts a stroke and later ones extend it", () => {
  let list = apply([], "seg", s("x", [10, 10, 20, 20]));
  list = apply(list, "seg", s("x", [30, 30]));
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].pts, [10, 10, 20, 20, 30, 30]);
});

test("applying a message never changes the list it was given", () => {
  const before = [s("x", [1, 1, 2, 2])];
  const frozen = JSON.stringify(before);
  apply(before, "seg", s("x", [3, 3]));
  apply(before, "del", { ids: ["x"] });
  apply(before, "clear");
  assert.equal(JSON.stringify(before), frozen);
});

test("two screens that hear the same messages end up the same", () => {
  const msgs = [["seg", s("a", [1, 1, 5, 5])], ["seg", s("b", [9, 9, 12, 12])], ["seg", s("a", [8, 8])], ["del", { ids: ["b"] }]];
  const run = () => msgs.reduce((l, [k, p]) => apply(l, k, p), []);
  assert.deepEqual(run(), run());
  assert.equal(run().length, 1);
});

test("rubbing out and clearing", () => {
  const l = [s("a", [1, 1, 2, 2]), s("b", [3, 3, 4, 4])];
  assert.deepEqual(apply(l, "del", { ids: ["a"] }).map((x) => x.id), ["b"]);
  assert.equal(apply(l, "del", { ids: ["nope"] }), l);
  assert.deepEqual(apply(l, "clear"), []);
  const empty = [];
  assert.equal(apply(empty, "clear"), empty);
});

test("a late joiner keeps what they drew and gains what they missed", () => {
  const mine = [s("m", [1, 1, 2, 2])];
  const theirs = [s("t", [5, 5, 6, 6]), s("m", [1, 1, 2, 2])];
  const got = apply(mine, "sync", { strokes: theirs });
  assert.deepEqual(got.map((x) => x.id).sort(), ["m", "t"]);
  assert.equal(apply(got, "sync", { strokes: theirs }), got);
});

test("junk from the wire is dropped or bounded", () => {
  assert.equal(cleanStroke(null), null);
  assert.equal(cleanStroke({ id: 5, pts: [1, 2] }), null);
  assert.equal(cleanStroke({ id: "a", pts: [1] }), null);
  const c = cleanStroke({ id: "a", c: "javascript:alert(1)", w: 9999, pts: [-50, 99999, 3, 4, 5] });
  assert.equal(c.c, "#16161a");
  assert.equal(c.w, 60);
  assert.deepEqual(c.pts, [0, H, 3, 4]);
  assert.ok(cleanStroke({ id: "a", pts: [W + 500, 0] }).pts[0] === W);
  assert.deepEqual(apply([], "seg", { id: 3 }), []);
  assert.deepEqual(apply([], "wat", {}), []);
});

test("the oldest strokes go when the board is full", () => {
  let l = [];
  for (let i = 0; i < MAX_STROKES + 5; i++) l = apply(l, "seg", s("s" + i, [1, 1, 2, 2]));
  assert.equal(l.length, MAX_STROKES);
  assert.equal(l[0].id, "s5");
});

test("thinning keeps both ends and drops the tiny moves", () => {
  const pts = [0, 0, 1, 0, 2, 0, 3, 0, 4, 0, 50, 0, 51, 0];
  const t = thin(pts);
  assert.deepEqual(t.slice(0, 2), [0, 0]);
  assert.deepEqual(t.slice(-2), [51, 0]);
  assert.ok(t.length < pts.length);
  assert.deepEqual(thin([5, 5, 6, 6]), [5, 5, 6, 6]);
});

test("the eraser reaches a stroke along its length, not just its points", () => {
  const line = s("l", [0, 100, 400, 100], { w: 4 });
  assert.ok(hits(line, 200, 105, 10));
  assert.ok(!hits(line, 200, 160, 10));
  assert.ok(!hits(line, 500, 100, 10));
  const dot = s("d", [300, 300]);
  assert.ok(hits(dot, 305, 300, 10));
  assert.deepEqual(touching([line, dot], 200, 100, 10), ["l"]);
});

test("a person keeps the same colour on every screen", () => {
  assert.equal(personColour("abc"), personColour("abc"));
});
