import test from "node:test";
import assert from "node:assert/strict";
import { apply, cleanStroke, thin, hits, touching, personColour, cutOut, baseId, W, H, cleanChat, applyChat, chatBatches, CHAT_DATA, linkify } from "../src/whiteboard.js";

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

test("a board can hold as many strokes as people draw", () => {
  let l = [];
  for (let i = 0; i < 3000; i++) l = apply(l, "seg", s("s" + i, [1, 1, 2, 2]));
  assert.equal(l.length, 3000);
  assert.equal(l[0].id, "s0");
});

test("the eraser only takes the part it touches", () => {
  const line = s("l", [0, 100, 400, 100], { w: 4 });
  const pieces = cutOut(line, 200, 100, 10);
  assert.equal(pieces.length, 2);
  assert.ok(pieces[0][pieces[0].length - 2] < 200 && pieces[0][pieces[0].length - 2] > 150);
  assert.ok(pieces[1][0] > 200 && pieces[1][0] < 250);
  assert.equal(cutOut(line, 200, 300, 10), null);
  // rubbing the end leaves one piece, rubbing all of a dot leaves none
  assert.equal(cutOut(line, 0, 100, 10).length, 1);
  assert.deepEqual(cutOut(s("d", [50, 50]), 50, 50, 10), []);
});

test("a cut replaces only that stroke, with the pieces that are left", () => {
  const l = [s("a", [0, 0, 100, 0]), s("b", [0, 50, 100, 50])];
  const next = apply(l, "cut", { cuts: [{ id: "a", pieces: [[0, 0, 30, 0], [70, 0, 100, 0]] }] });
  assert.deepEqual(next.map((x) => x.id), ["a~0", "a~1", "b"]);
  assert.equal(next[0].c, "#d93a3a");
  assert.equal(apply(next, "cut", { cuts: [{ id: "a", pieces: [] }] }), next); // already gone
  assert.deepEqual(apply(l, "cut", { cuts: [{ id: "a", pieces: [] }] }).map((x) => x.id), ["b"]);
});

test("two cuts in one message, the second on a piece of the first, both land", () => {
  const l = [s("a", [0, 0, 100, 0])];
  const next = apply(l, "cut", { cuts: [{ id: "a", pieces: [[0, 0, 30, 0], [70, 0, 100, 0]] }, { id: "a~1", pieces: [[90, 0, 100, 0]] }] });
  assert.deepEqual(next.map((x) => x.id), ["a~0", "a~1~0"]);
});

test("undo can name the whole drawing after it has been cut up", () => {
  assert.equal(baseId("k3-abc"), "k3-abc");
  assert.equal(baseId("k3-abc~1~0"), "k3-abc");
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

const say = (id, extra = {}) => ({ id, by: "u1", name: "Sam", at: 1, kind: "text", body: "hi", ...extra });

test("chat: messages are added once, in order, and only the author can delete", () => {
  let l = applyChat([], "msg", say("a"));
  l = applyChat(l, "msg", say("a"));
  l = applyChat(l, "msg", say("b", { body: "yo", reply: { from: "Sam", text: "hi" } }));
  assert.equal(l.length, 2);
  assert.deepEqual(l[1].reply, { from: "Sam", text: "hi" });
  assert.equal(applyChat(l, "del", { id: "a", by: "someone-else" }), l);
  assert.deepEqual(applyChat(l, "del", { id: "a", by: "u1" }).map((m) => m.id), ["b"]);
});

test("chat: junk is refused", () => {
  assert.equal(cleanChat(null), null);
  assert.equal(cleanChat(say("a", { body: "   " })), null);
  assert.equal(cleanChat(say("a", { kind: "image", data: "javascript:alert(1)" })), null);
  assert.equal(cleanChat(say("a", { kind: "image", data: "data:text/html;base64,AAAA" })), null);
  assert.equal(cleanChat(say("a", { kind: "file", data: "data:text/html;base64,AAAA" })).kind, "file");
  assert.equal(cleanChat(say("a", { kind: "image", data: "data:image/jpeg;base64," + "A".repeat(CHAT_DATA) })), null);
  assert.equal(cleanChat(say("a", { body: "x".repeat(5000) })).body.length, 1000);
  assert.equal(cleanChat(say("a", { kind: "image", data: "data:image/jpeg;base64,AAAA", attach: { name: "p.jpg" } })).attach.name, "p.jpg");
});

test("chat: a late joiner gets the history merged in time order, without doubles", () => {
  const mine = [say("c", { at: 3 })];
  const got = applyChat(mine, "sync", { msgs: [say("a", { at: 1 }), say("b", { at: 2 }), say("c", { at: 3 })] });
  assert.deepEqual(got.map((m) => m.id), ["a", "b", "c"]);
});

test("chat: history is split so no piece is too big to send", () => {
  const msgs = Array.from({ length: 10 }, (_, i) => say("m" + i, { body: "x".repeat(900) }));
  const parts = chatBatches(msgs, 3000);
  assert.ok(parts.length > 1);
  assert.equal(parts.flat().length, 10);
});

test("chat: a shared notebook or folder is only a safe id and a title", () => {
  const ok = cleanChat(say("s", { kind: "share", body: "Shared a notebook: Maths", attach: { id: "ab12-CD", kind: "notebook", title: "Maths" } }));
  assert.deepEqual(ok.attach, { id: "ab12-CD", kind: "notebook", title: "Maths" });
  assert.equal(cleanChat(say("s", { kind: "share", attach: { id: "x/../y", title: "t" } })), null);
  assert.equal(cleanChat(say("s", { kind: "share", attach: { id: "javascript:1" } })), null);
  assert.equal(cleanChat(say("s", { kind: "share" })), null);
  assert.equal(cleanChat(say("s", { kind: "share", attach: { id: "ok", kind: "weird", title: "t" } })).attach.kind, "material");
});

test("chat: links are clickable, punctuation is not part of them, nothing else is", () => {
  assert.deepEqual(linkify("join https://dwiddle.app/notebook?live=AB12C, now"), [{ text: "join " }, { text: "https://dwiddle.app/notebook?live=AB12C", href: "https://dwiddle.app/notebook?live=AB12C" }, { text: ", now" }]);
  assert.deepEqual(linkify("no links <b>here</b>"), [{ text: "no links <b>here</b>" }]);
  assert.deepEqual(linkify("javascript:alert(1) and ftp://x.y"), [{ text: "javascript:alert(1) and ftp://x.y" }]);
  assert.equal(linkify("(see https://a.co/x).").find((p) => p.href).href, "https://a.co/x");
  assert.deepEqual(linkify(""), []);
});
