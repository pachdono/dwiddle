import test from "node:test";
import assert from "node:assert/strict";
import { sittings, summarise, bestWindow, advice, planWeek, defaultPrefs, googleLink, makeIcs, parseIcsBusy } from "../src/insights.js";

const MIN = 60e3;
const at = (d, h, m = 0) => new Date(2026, 9, d, h, m).getTime();
function logOf(entries) { return entries.map(([t, ok, topic = "Osmosis", kind = "mc"], i) => ({ t, id: "q" + i, topic, ok, kind })); }

test("answers close together are one sitting", () => {
  const log = logOf([[at(5, 17), true], [at(5, 17, 5), true], [at(5, 19), true]]);
  const s = sittings(log);
  assert.equal(s.length, 2);
  assert.equal(s[0].items.length, 2);
});

test("the report finds weak topics and the best hours", () => {
  const log = [];
  for (let i = 0; i < 20; i++) log.push({ t: at(1 + (i % 5), 17, i), id: "a" + i, topic: "Cells", ok: i % 10 !== 0, kind: "mc" });
  for (let i = 0; i < 20; i++) log.push({ t: at(1 + (i % 5), 9, i), id: "b" + i, topic: "Osmosis", ok: i % 2 === 0, kind: "blank" });
  const s = summarise(log, at(8, 12));
  assert.equal(s.total, 40);
  assert.deepEqual(s.weak.map((t) => t.name), ["Osmosis"]);
  assert.equal(bestWindow(s).hour === 16 || bestWindow(s).hour === 17, true);
  const ids = advice(s, at(8, 12)).map((a) => a.id);
  assert.ok(ids.includes("best") && ids.includes("weak"));
});

test("a plan keeps to the free times and clear of busy ones", () => {
  const now = at(5, 8);
  const prefs = defaultPrefs();
  prefs.perWeek = 4; prefs.prefer = "17:00";
  const busy = [[at(5, 16), at(5, 19)]];
  const plan = planWeek({ prefs, summary: summarise([]), busy, now });
  assert.equal(plan.length, 4);
  plan.forEach((s) => assert.ok(!busy.some(([a, b]) => s.start < b && s.end > a)));
  plan.forEach((s) => assert.equal(s.end - s.start, 40 * MIN));
  assert.equal(new Set(plan.map((s) => new Date(s.start).toDateString())).size, 4);
});

test("calendar output", () => {
  const s = { start: at(6, 17), end: at(6, 17, 40), topic: "Cells", reason: "55% right so far" };
  assert.match(googleLink(s), /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
  const ics = makeIcs([s]);
  assert.match(ics, /BEGIN:VEVENT/); assert.match(ics, /SUMMARY:Study: Cells/);
  const busy = parseIcsBusy("BEGIN:VEVENT\nDTSTART:20261006T150000Z\nDTEND:20261006T163000Z\nEND:VEVENT\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261007\nDTEND;VALUE=DATE:20261008\nEND:VEVENT");
  assert.equal(busy.length, 2);
  assert.equal(busy[0][1] - busy[0][0], 90 * MIN);
});
