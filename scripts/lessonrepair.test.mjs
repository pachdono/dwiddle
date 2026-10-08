import test, { mock } from "node:test";
import assert from "node:assert/strict";

let reply;
mock.module("../api/_llm.js", {
  namedExports: {
    ask: async () => JSON.stringify(reply), safeParse: (t) => JSON.parse(t),
    guard: () => true, fail: (res, e) => res.status(500).json({ error: e.message }),
    userError: (res, s, m) => res.status(s).json({ error: m }), MAX_INPUT: 24000,
  },
});
const { default: handler } = await import("../api/lesson.js");
const run = (body) => { const out = { status: 0, body: null }; const res = { setHeader() {}, status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  return handler({ method: "POST", headers: {}, socket: {}, body }, res).then(() => out); };
const base = { mode: "repair", topic: "Distance from a velocity-time graph", cards: [{ heading: "Areas", body: "A sledge speeds up from 0 to 4 m/s in 2 s, then 4 m/s for 6.5 s, then stops in 2 s.", points: [], example: "" }],
  checks: [{ n: 3, type: "blank", q: "The total distance travelled by the sledge is ___ m.", answer: "36.6", why: "Adding the three areas gives 36.6 m." }] };

test("a broken check is repaired with a graph whose area matches the answer", async () => {
  reply = { figures: [{ id: "x", title: "Sledge", xLabel: "Time (s)", yLabel: "Velocity (m/s)", points: [[0, 0], [2, 4], [8.5, 4], [10.5, 0]], shade: true, marks: [] }], fixes: [{ n: 3, q: "Using the graph, the total distance travelled by the sledge is ___ m.", figure: "x" }] };
  // area = 4 + 26 + 4 = 34, answer is 36.6: more than 6% apart, so it must be refused
  let r = await run(base);
  assert.equal(r.body.fixes.length, 0);
  reply.figures[0].points = [[0, 0], [2.05, 4], [8.55, 4], [10.6, 0]]; // 4.1 + 26 + 4.1 = 34.2 still off
  r = await run(base);
  assert.equal(r.body.fixes.length, 0);
  reply.figures[0].points = [[0, 0], [2.05, 4], [8.55, 4], [10.6, 0.4], [11.7, 0]];
  const area = (p) => p.slice(1).reduce((a, q, i) => a + ((q[0] - p[i][0]) * (q[1] + p[i][1])) / 2, 0);
  const scale = 36.6 / area(reply.figures[0].points);
  reply.figures[0].points = reply.figures[0].points.map(([x, y]) => [x, +(y * scale).toFixed(3)]);
  r = await run(base);
  assert.equal(r.body.fixes.length, 1);
  assert.equal(r.body.fixes[0].figure, "g1");
  assert.equal(r.body.figures.length, 1);
  assert.equal(r.body.figures[0].id, "g1");
});

test("without a graph the numbers must now be in the sentence", async () => {
  reply = { figures: [], fixes: [{ n: 3, q: "The total distance travelled by the sledge is ___ m.", figure: null }] };
  let r = await run(base);
  assert.equal(r.body.fixes.length, 0, "still no numbers: not a fix");
  reply = { figures: [], fixes: [{ n: 3, q: "A sledge goes at 4 m/s for 9 s, so it travels ___ m.", figure: null }] };
  r = await run(base);
  assert.equal(r.body.fixes.length, 1);
  assert.match(r.body.fixes[0].q, /4 m\/s/);
});
