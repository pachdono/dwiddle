import test from "node:test";
import assert from "node:assert/strict";
import { allow } from "../api/_guard.js";

const res = () => { const r = { code: 200, headers: {}, setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return r; }, json() { return r; } }; return r; };
const req = (url, ip = "1.2.3.4") => ({ method: "POST", url, headers: { "x-forwarded-for": ip }, body: {} });

test("each endpoint counts separately for the same address", () => {
  for (let i = 0; i < 5; i++) assert.ok(allow(req("/api/generate"), res(), { limit: 5 }));
  assert.ok(!allow(req("/api/generate"), res(), { limit: 5 }), "the sixth generation is refused");
  assert.ok(allow(req("/api/youtube"), res(), { limit: 3 }), "the first video request is not");
});

test("different addresses have their own allowance", () => {
  for (let i = 0; i < 3; i++) allow(req("/api/read", "9.9.9.9"), res(), { limit: 3 });
  assert.ok(!allow(req("/api/read", "9.9.9.9"), res(), { limit: 3 }));
  assert.ok(allow(req("/api/read", "8.8.4.4"), res(), { limit: 3 }));
});
