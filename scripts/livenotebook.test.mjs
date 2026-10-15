import test from "node:test";
import assert from "node:assert/strict";
import { diffBooks, applyOps, fullOps, mergeOps, invertDiff, cleanItem, split, Joiner, MAX_PIECE } from "../src/liveNotebook.js";

const st = (id, extra = {}) => ({ id, type: "stroke", tool: "pen", color: "#000", size: 3, points: [[1, 1], [2, 2]], ...extra });
const book = (pages, extra = {}) => ({ id: "b", title: "Maths", cover: "#3B5BFD", template: "lined", paper: "white", created: 1, pages, ...extra });
const page = (id, items = [], extra = {}) => ({ id, template: "lined", paper: "white", w: 794, h: 1123, items, ...extra });

test("nothing changed means nothing to send", () => {
  const b = book([page("p1", [st("a")])]);
  assert.deepEqual(diffBooks(b, b), []);
  assert.deepEqual(diffBooks(b, { ...b, pages: b.pages.map((p) => ({ ...p, items: p.items.map((i) => ({ ...i })) })) }), []); // same content, new objects
});

test("an added, changed and removed item are each one small op", () => {
  const a = book([page("p1", [st("a"), st("b")])]);
  const b = book([page("p1", [st("a"), st("b", { color: "#f00" }), st("c")])]);
  const ops = diffBooks(a, b);
  assert.deepEqual(ops.map((o) => [o.t, o.item?.id]), [["item", "b"], ["item", "c"]]);
  const c = book([page("p1", [st("a")])]);
  assert.deepEqual(diffBooks(b, c).map((o) => o.t), ["rm"]);
});

test("replaying the ops on another copy makes it the same", () => {
  const a = book([page("p1", [st("a"), st("b")]), page("p2", [])]);
  const b = book([page("p2", [st("z")]), page("p1", [st("b"), st("a"), st("n")]), page("p3", [])], { title: "Maths 2" });
  const got = applyOps(a, diffBooks(a, b));
  assert.deepEqual(got.pages.map((p) => p.id), ["p2", "p1", "p3"]);
  assert.deepEqual(got.pages[1].items.map((i) => i.id), ["b", "a", "n"]);
  assert.deepEqual(got.pages[0].items.map((i) => i.id), ["z"]);
  assert.equal(got.title, "Maths 2");
});

test("someone arriving builds the whole notebook from nothing", () => {
  const b = book([page("p1", [st("a"), st("b")]), page("p2", [st("c")])]);
  const got = applyOps({ ...b, pages: [] }, fullOps(b));
  assert.deepEqual(got.pages.map((p) => [p.id, p.items.map((i) => i.id)]), [["p1", ["a", "b"]], ["p2", ["c"]]]);
});

test("two people changing different things both keep their work", () => {
  const base = book([page("p1", [st("a")])]);
  const mine = book([page("p1", [st("a"), st("m")])]);
  const theirs = book([page("p1", [st("a"), st("t")])]);
  // I hear their ops while my own are still waiting to go
  const merged = applyOps(mine, diffBooks(base, theirs));
  assert.deepEqual(merged.pages[0].items.map((i) => i.id).sort(), ["a", "m", "t"]);
  // and what I still have to send is only mine, because the base took theirs too
  const newBase = applyOps(base, diffBooks(base, theirs));
  assert.deepEqual(diffBooks(newBase, merged).filter((o) => o.t === "item").map((o) => o.item.id), ["m"]);
});

test("applying never changes what it is given and keeps untouched items", () => {
  const a = book([page("p1", [st("a"), st("b")])]);
  const frozen = JSON.stringify(a);
  const got = applyOps(a, [{ t: "item", p: "p1", item: st("b", { color: "#f00" }) }]);
  assert.equal(JSON.stringify(a), frozen);
  assert.equal(got.pages[0].items[0], a.pages[0].items[0]);
});

test("ops for a page that is gone, and junk, change nothing", () => {
  const a = book([page("p1", [st("a")])]);
  assert.equal(applyOps(a, [{ t: "item", p: "nope", item: st("x") }]).pages[0].items.length, 1);
  assert.equal(applyOps(a, [null, 5, { t: "wat" }, { t: "rm", p: "p1", ids: "a" }]).pages[0].items.length, 1);
  assert.equal(applyOps(a, [{ t: "rm", p: "p1", ids: ["zzz"] }]).pages[0], a.pages[0]);
});

test("only things the notebook can draw are let in", () => {
  assert.equal(cleanItem(null), null);
  assert.equal(cleanItem({ id: "a", type: "script" }), null);
  assert.equal(cleanItem({ id: 5, type: "stroke" }), null);
  assert.equal(cleanItem({ id: "a", type: "image", src: "javascript:alert(1)" }), null);
  assert.equal(cleanItem({ id: "a", type: "image", src: "data:image/svg+xml;base64,AAAA" }), null);
  assert.ok(cleanItem({ id: "a", type: "image", src: "data:image/png;base64,AAAA", x: 1, y: 1, w: 5, h: 5 }));
  assert.ok(cleanItem(st("a")));
  const bad = applyOps(book([page("p1")]), [{ t: "page", page: { id: "p9", bg: "javascript:1" } }]);
  assert.equal(bad.pages[1].bg, undefined);
});

test("waiting changes to the same thing are merged into the last one", () => {
  const ops = mergeOps([{ t: "item", p: "p1", item: st("a", { x: 1 }) }, { t: "item", p: "p1", item: st("b") }, { t: "item", p: "p1", item: st("a", { x: 9 }) }, { t: "meta", meta: { title: "a" } }, { t: "meta", meta: { cover: "#fff" } }]);
  assert.equal(ops.length, 3);
  assert.equal(ops[0].item.x, 9);
  assert.deepEqual(ops[2].meta, { title: "a", cover: "#fff" });
});

test("a big message goes in pieces and comes out whole, in any order", () => {
  const text = "x".repeat(MAX_PIECE * 2 + 500);
  const parts = split(text, "m1");
  assert.equal(parts.length, 3);
  const j = new Joiner();
  assert.equal(j.add(parts[2]), null);
  assert.equal(j.add(parts[0]), null);
  assert.equal(j.add(parts[0]), null); // a repeat changes nothing
  assert.equal(j.add(parts[1]), text);
  assert.deepEqual(split("small", "m2"), [{ whole: "small" }]);
  assert.equal(new Joiner().add({ whole: "ok" }), "ok");
});

test("bad pieces are ignored", () => {
  const j = new Joiner(100);
  assert.equal(j.add(null), null);
  assert.equal(j.add({ mid: "a", i: 5, n: 2, s: "x" }), null);
  assert.equal(j.add({ mid: "a", i: 0, n: 9999, s: "x" }), null);
  assert.equal(j.add({ mid: "a", i: 0, n: 2, s: "x".repeat(500) }), null); // over the limit
});

test("a photo much bigger than one message still arrives intact", () => {
  const src = "data:image/png;base64," + "QUJD".repeat(250000); // about 1 MB
  const a = book([page("p1", [])]);
  const b = book([page("p1", [{ id: "img", type: "image", src, x: 10, y: 10, w: 200, h: 100 }])]);
  const text = JSON.stringify(diffBooks(a, b));
  const parts = split(text, "m1");
  assert.ok(parts.length > 5);
  const j = new Joiner();
  let whole = null;
  for (const p of parts.reverse()) whole = j.add(p) ?? whole;
  const got = applyOps(a, JSON.parse(whole));
  assert.equal(got.pages[0].items[0].src, src);
});

const ids = (b, n = 0) => b.pages[n].items.map((i) => i.id);

test("undo takes back my stroke and leaves a friend's alone", () => {
  const s0 = book([page("p1", [st("a")])]);
  const mine = book([page("p1", [st("a"), st("m")])]); // I drew m
  const inv = invertDiff(s0, mine);
  // meanwhile they drew t
  const now = applyOps(mine, [{ t: "item", p: "p1", item: st("t") }]);
  assert.deepEqual(ids(applyOps(now, inv)).sort(), ["a", "t"]);
});

test("undo puts back what I deleted, and what I changed, but not what they changed elsewhere", () => {
  const s0 = book([page("p1", [st("a"), st("b", { color: "#111" }), st("c")])]);
  const mine = book([page("p1", [st("a"), st("b", { color: "#f00" })])]); // I changed b, deleted c
  const inv = invertDiff(s0, mine);
  const now = applyOps(mine, [{ t: "item", p: "p1", item: st("a", { color: "#0f0" }) }]); // they recoloured a
  const back = applyOps(now, inv);
  assert.equal(back.pages[0].items.find((i) => i.id === "b").color, "#111");
  assert.ok(back.pages[0].items.some((i) => i.id === "c"));
  assert.equal(back.pages[0].items.find((i) => i.id === "a").color, "#0f0");
});

test("undo of adding a page drops it, undo of deleting a page brings it back where it was", () => {
  const s0 = book([page("p1", [st("a")]), page("p2", [st("b")])]);
  const added = book([page("p1", [st("a")]), page("p2", [st("b")]), page("p3")]);
  assert.deepEqual(applyOps(added, invertDiff(s0, added)).pages.map((p) => p.id), ["p1", "p2"]);
  const removed = book([page("p2", [st("b")])]);
  const back = applyOps(removed, invertDiff(s0, removed));
  assert.deepEqual(back.pages.map((p) => p.id), ["p1", "p2"]);
  assert.deepEqual(ids(back, 0), ["a"]);
});

test("undo of a rename, and the last page cannot be dropped", () => {
  const s0 = book([page("p1")]);
  const renamed = { ...s0, title: "New" };
  assert.equal(applyOps(renamed, invertDiff(s0, renamed)).title, "Maths");
  assert.equal(applyOps(s0, [{ t: "dropPage", id: "p1" }]).pages.length, 1);
});

test("undoing then redoing round trips", () => {
  const s0 = book([page("p1", [st("a")])]);
  const s1 = book([page("p1", [st("a"), st("m")])]);
  const undone = applyOps(s1, invertDiff(s0, s1));
  assert.deepEqual(ids(undone), ["a"]);
  const redone = applyOps(undone, invertDiff(s1, undone));
  assert.deepEqual(ids(redone), ["a", "m"]);
});
