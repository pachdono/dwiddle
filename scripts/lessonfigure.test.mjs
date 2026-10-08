import test, { mock } from "node:test";
import assert from "node:assert/strict";

const reply = {
  cards: [
    { heading: "Reading a velocity-time graph", body: "The car speeds up, then holds steady.", points: [], example: "", figure: "g1" },
    { heading: "Area is distance", body: "Area under the line is the distance travelled.", points: [], example: "", figure: "g9" },
  ],
  figures: [
    { id: "g1", title: "Car", xLabel: "Time (s)", yLabel: "Velocity (m/s)", points: [[0, 0], [4, 22], [12, 22], [16, 0]], shade: true, marks: [{ x: 4, y: 22, label: "22 m/s" }] },
    { id: "bad", points: [[0, 0]] },
    { id: "g2", points: [["a", 1], [2, 3]] },
  ],
  checks: [
    { type: "choice", q: "What distance does the car travel in the first 4 s according to the graph?", choices: ["44 m", "22 m", "66 m", "88 m"], answer: 0, why: "Area of the triangle.", figure: "g1" },
    { type: "choice", q: "Not valid, no answer", choices: ["a", "b", "c", "d"], why: "x" },
    { type: "match", q: "Match each part of the graph", pairs: [{ a: "Speeding up", b: "Slope upwards" }, { a: "Steady", b: "Flat line" }, { a: "Slowing", b: "Slope downwards" }], figure: "g1" },
    { type: "tf", q: "The car stops after 16 s.", answer: true, figure: "nope" },
  ],
};
mock.module("../api/_llm.js", {
  namedExports: {
    ask: async () => JSON.stringify(reply), safeParse: (t) => JSON.parse(t),
    guard: () => true, fail: (res, e) => res.status(500).json({ error: e.message }),
    userError: (res, s, m) => res.status(s).json({ error: m }), MAX_INPUT: 24000,
  },
});
const { default: handler } = await import("../api/lesson.js");

test("a lesson carries its graphs, checked, and cards and checks point at them", async () => {
  const out = { status: 0, body: null };
  const res = { setHeader() {}, status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  await handler({ method: "POST", headers: {}, socket: {}, body: { topic: "Car velocity-time graph", notes: "The car speeds up to 22 m/s in 4 s, holds it for 8 s, then stops in 4 s. ".repeat(6) } }, res);
  assert.equal(out.status, 200, JSON.stringify(out.body));
  const { figures, cards, checks } = out.body;
  assert.equal(figures.length, 1, "only the real graph survives");
  assert.deepEqual(figures[0].points, [[0, 0], [4, 22], [12, 22], [16, 0]]);
  assert.equal(figures[0].shade, true);
  assert.equal(cards[0].figure, "g1");
  assert.equal(cards[1].figure, undefined, "a pointer to a graph that is not there is dropped");
  assert.equal(checks.find((c) => /first 4 s/.test(c.q)).figure, "g1");
  assert.equal(checks.find((c) => c.type === "match").figure, "g1");
  assert.ok(!checks.some((c) => /no answer/.test(c.q)), "no valid answer, no question");
  assert.equal(checks.find((c) => c.type === "tf").figure, undefined);
});
