import test from "node:test";
import assert from "node:assert/strict";
import { uniqueQuestions } from "../src/mathText.js";

globalThis.localStorage = globalThis.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
const { freshFirst } = await import("../src/studylog.js");

test("questions never asked come first, then the ones asked longest ago", () => {
  const pool = ["a", "b", "c", "d", "e"].map((id) => ({ id, q: id }));
  const now = Date.now();
  const log = [{ id: "c", t: now - 1000 }, { id: "a", t: now - 9 * 864e5 }, { id: "d", t: now - 3 * 864e5 }];
  for (let n = 0; n < 20; n++) {
    const r = freshFirst(pool, log);
    assert.deepEqual(new Set(r.ordered.slice(0, 2).map((q) => q.id)), new Set(["b", "e"]));
    assert.deepEqual(r.ordered.slice(2).map((q) => q.id), ["a", "d", "c"]);
    assert.equal(r.unseen, 2);
  }
});

test("a question reworded a little is a repeat, a different one is not", () => {
  const list = [
    { topic: "Cells", q: "What is the function of the mitochondria in a cell?" },
    { topic: "Cells", q: "What is the main function of mitochondria in cells?" },
    { topic: "Cells", q: "Which structure controls what enters and leaves a cell?" },
    { topic: "Plants", q: "What is the main function of mitochondria in cells?" },
  ];
  const out = uniqueQuestions(list);
  assert.equal(out.length, 3);
  assert.ok(out.some((x) => /controls what enters/.test(x.q)));
  assert.ok(out.some((x) => x.topic === "Plants"), "the same words in another topic stay");
});
