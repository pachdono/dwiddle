// Run with: node --test --experimental-test-module-mocks scripts/video.test.mjs
// The video endpoint with the model stubbed: figures are calculated, checked,
// repaired once, and left out when they still fail.
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const replies = [];
mock.module("../api/_llm.js", {
  namedExports: {
    ask: async () => replies.shift(),
    safeParse: (text) => { try { return JSON.parse(text); } catch { return null; } },
    fail: (res, err) => res.status(500).json({ error: String(err) }),
    userError: (res, status, error) => res.status(status).json({ error }),
    MAX_INPUT: 24000,
  },
});
mock.module("../api/_guard.js", { namedExports: { allow: () => true } });
const { default: handler } = await import("../api/video.js");

function call(body) {
  return new Promise((resolve) => {
    const res = { code: 200, status(c) { this.code = c; return this; }, json(d) { resolve({ code: this.code, data: d }); } };
    handler({ method: "POST", body, headers: {} }, res);
  });
}

const semicircle = (r) => ({
  id: "semi", axes: true, grid: true, values: { r }, points: { O: ["0", "0"], S: ["-1", "0"], C: ["3*r - 2", "r"] },
  shapes: [
    { id: "big", type: "circle", center: "O", r: "2", half: "upper", color: "blue" },
    { id: "small", type: "circle", center: "S", r: "1", half: "upper", color: "green" },
    { id: "c", type: "circle", center: "C", r: "r", color: "purple" },
  ],
  checks: [{ type: "tangent", a: "big", b: "c" }, { type: "tangent", a: "small", b: "c" }],
});
const cell = (rx) => ({
  id: "cell", points: { K: ["1", "0.5"] },
  shapes: [{ id: "wall", type: "rect", from: ["-4", "-2.5"], to: ["4", "2.5"] }, { id: "chl", type: "ellipse", center: "K", rx, ry: "0.4" }],
  checks: [{ type: "inside", inner: "chl", outer: "wall" }],
});
const scenes = [
  { heading: "Set up", lines: ["One.", "Two."], board: [{ kind: "math", text: "x = 1", at: 0 }], figure: "semi", show: [{ id: "big", at: 0 }, { id: "c", at: 1 }] },
  { heading: "Cell", lines: ["Three."], board: [], figure: "cell", show: ["wall", "chl"] },
  { heading: "Picture", lines: ["Four."], board: [], figure: "pic" },
];

test("wrong figures are repaired, and ones still wrong are left out", async () => {
  replies.push(
    JSON.stringify({ title: "T", scenes, figures: [semicircle("0.85"), cell("6"), { id: "pic", picture: "Plant cell" }] }),
    JSON.stringify({ figures: [semicircle("8/9"), cell("5")] }),
  );
  const { code, data } = await call({ topic: "Circles", notes: "n".repeat(100) });
  assert.equal(code, 200);
  const [s1, s2, s3] = data.scenes;
  assert.ok(s1.diagram, "the repaired semicircle figure is shown");
  assert.deepEqual(s1.diagram.shapes.map((s) => [s.type, s.at]), [["circle", 0], ["circle", 1]]);
  const c = s1.diagram.shapes[1];
  assert.ok(Math.abs(c.r - 8 / 9) < 1e-9 && Math.abs(c.c[0] - 2 / 3) < 1e-9);
  assert.equal(s2.diagram, null, "the cell with a chloroplast bigger than the cell is left out");
  assert.deepEqual(s3.diagram, { picture: "Plant cell" });
});

test("a correct figure needs no repair", async () => {
  replies.push(JSON.stringify({ title: "T", scenes: scenes.slice(0, 2), figures: [semicircle("8/9"), cell("0.8")] }));
  const { data } = await call({ topic: "Circles", notes: "n".repeat(100) });
  assert.equal(replies.length, 0);
  assert.ok(data.scenes[0].diagram && data.scenes[1].diagram);
});
