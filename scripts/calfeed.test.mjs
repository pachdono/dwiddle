import test, { mock } from "node:test";
import assert from "node:assert/strict";

process.env.VITE_SUPABASE_URL = "https://x.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY = "anon";
let rows = [{ start: 1e12, end: 1e12 + 36e5, topic: "Cells", reason: "55% right" }, { start: "bad", end: 1 }];
mock.module("@supabase/supabase-js", { namedExports: { createClient: () => ({ rpc: async (name, args) => (args.tok === "a".repeat(36) ? { data: rows } : { data: null }) }) } });
const { calfeed } = await import("../api/_calfeed.js");

function run(cal) {
  const out = { headers: {}, status: 0, body: "" };
  const res = { setHeader: (k, v) => { out.headers[k] = v; }, status(c) { out.status = c; return this; }, send(b) { out.body = b; return this; } };
  return calfeed({ query: { cal } }, res).then(() => out);
}

test("a good link gives a named calendar of the planned sessions", async () => {
  const r = await run("a".repeat(36));
  assert.equal(r.status, 200);
  assert.match(r.headers["Content-Type"], /text\/calendar/);
  assert.match(r.body, /X-WR-CALNAME:Dwiddle study plan/);
  assert.match(r.body, /SUMMARY:Study: Cells/);
  assert.equal((r.body.match(/BEGIN:VEVENT/g) || []).length, 1); // the broken row is dropped
});

test("an unknown or malformed link gives nothing", async () => {
  assert.equal((await run("b".repeat(36))).status, 404);
  assert.equal((await run("../etc")).status, 404);
});

test("only calendar providers can be fetched", async () => {
  const { fetchIcs } = await import("../api/_calfeed.js");
  const run = (url) => { const out = { status: 0, body: null }; const res = { setHeader() {}, status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
    return fetchIcs({ method: "POST", body: { url }, headers: {}, socket: {} }, res).then(() => out); };
  assert.equal((await run("https://evil.example.com/x.ics")).status, 400);
  assert.equal((await run("http://calendar.google.com/x")).status, 400);
  assert.equal((await run("not a url")).status, 400);
});
