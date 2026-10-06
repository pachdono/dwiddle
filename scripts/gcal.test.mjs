import test from "node:test";
import assert from "node:assert/strict";

// the module reads import.meta.env, which only Vite provides
globalThis.window = { };
globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const src = (await import("node:fs")).readFileSync(new URL("../src/gcal.js", import.meta.url), "utf8")
  .replace(/import \{ isDesktop \}.*\n/, "const isDesktop = false;\n")
  .replace("import.meta.env.VITE_GOOGLE_CLIENT_ID", "'test-client'");
const mod = await import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));

test("the plan replaces earlier Dwiddle sessions and adds the new ones", async () => {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push([init.method || "GET", String(url).replace("https://www.googleapis.com/calendar/v3", "")]);
    if (String(url).includes("/events?")) return new Response(JSON.stringify({ items: [{ id: "old1" }, { id: "old2" }] }), { status: 200 });
    if (init.method === "DELETE") return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ id: "new" }), { status: 200 });
  };
  mod.setToken({ value: "t", expires: Date.now() + 3600e3 });
  const r = await mod.syncPlan([{ start: 1e12, end: 1e12 + 36e5, topic: "Cells", reason: "x" }], 1e12);
  assert.deepEqual(r, { added: 1, removed: 2 });
  assert.deepEqual(calls.map((c) => c[0]), ["GET", "DELETE", "DELETE", "POST"]);
  assert.match(calls[0][1], /privateExtendedProperty=dwiddle%3Dplan/);
});

test("busy times leave out Dwiddle's own sessions, free time and all day events", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ items: [
    { start: { dateTime: "2026-10-06T15:00:00Z" }, end: { dateTime: "2026-10-06T16:30:00Z" } },
    { start: { dateTime: "2026-10-06T18:00:00Z" }, end: { dateTime: "2026-10-06T19:00:00Z" }, extendedProperties: { private: { dwiddle: "plan" } } },
    { start: { dateTime: "2026-10-06T20:00:00Z" }, end: { dateTime: "2026-10-06T21:00:00Z" }, transparency: "transparent" },
    { start: { date: "2026-10-07" }, end: { date: "2026-10-08" } },
  ] }), { status: 200 });
  mod.setToken({ value: "t", expires: Date.now() + 3600e3 });
  const b = await mod.busyTimes(0, 1e13);
  assert.equal(b.length, 1);
  assert.equal(b[0][1] - b[0][0], 90 * 60e3);
  mod.setToken(null);
  await assert.rejects(() => mod.busyTimes(0, 1), (e) => e.expired === true);
});
