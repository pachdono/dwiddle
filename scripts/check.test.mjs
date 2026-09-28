// Run with: node --test --experimental-test-module-mocks scripts/check.test.mjs
// Checking a notebook page: mistakes come back tidied, boxes kept on the page.
import { test, mock } from "node:test";
import assert from "node:assert/strict";

let reply = "";
mock.module("../api/_llm.js", {
  namedExports: {
    ask: async () => reply,
    safeParse: (t) => { try { return JSON.parse(t); } catch { return null; } },
    fail: (res, err) => res.status(500).json({ error: String(err) }),
    userError: (res, status, error) => res.status(status).json({ error }),
  },
});
mock.module("../api/_guard.js", { namedExports: { allow: () => true } });
const { default: handler } = await import("../api/read.js");
const call = (body) => new Promise((resolve) => {
  const res = { code: 200, status(c) { this.code = c; return this; }, json(d) { resolve({ code: this.code, data: d }); } };
  handler({ method: "POST", body, headers: {} }, res);
});
const image = "data:image/jpeg;base64,AAAA";

test("mistakes come back with their boxes kept inside the page", async () => {
  reply = JSON.stringify({ summary: "One slip.", errors: [
    { wrong: "x = 3", fix: "x = 4", why: "12 ÷ 3 is 4.", kind: "maths", box: [0.5, 0.3, 0.1, 1.4] },
    { wrong: "no box", fix: "", why: "Somewhere.", kind: "weird" },
    { wrong: "", why: "dropped: nothing wrong named" },
  ] });
  const { code, data } = await call({ image, mode: "check" });
  assert.equal(code, 200);
  assert.equal(data.errors.length, 2);
  assert.deepEqual(data.errors[0].box, [0.1, 0.3, 0.5, 1]);
  assert.equal(data.errors[1].box, null);
  assert.equal(data.errors[1].kind, "other");
});

test("a clean page says so", async () => {
  reply = JSON.stringify({ errors: [], summary: "All correct." });
  const { data } = await call({ image, mode: "check" });
  assert.deepEqual(data.errors, []);
  assert.equal(data.summary, "All correct.");
});
