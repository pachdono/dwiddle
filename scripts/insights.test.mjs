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
  const busy = parseIcsBusy("BEGIN:VEVENT\nDTSTART:20261006T150000Z\nDTEND:20261006T163000Z\nEND:VEVENT\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20261007\nDTEND;VALUE=DATE:20261008\nEND:VEVENT", Date.UTC(2026, 9, 6), Date.UTC(2026, 9, 20));
  assert.equal(busy.length, 1); // an all day event is not busy time
  assert.equal(busy[0][1] - busy[0][0], 90 * MIN);
});

import { masteryOf } from "../src/insights.js";
test("mastery comes from the last few answers on the topics", () => {
  const mk = (oks) => oks.map((ok, i) => ({ t: i, id: "q" + i, topic: "Cells", ok }));
  assert.equal(masteryOf(mk([true, true, true, true, true, false, true]), ["Cells"]), "high");
  assert.equal(masteryOf(mk([false, false, true, false, false, true]), ["Cells"]), "low");
  assert.equal(masteryOf(mk([true, true]), ["Cells"]), "unknown");
});

test("repeating lessons are expanded, in their own time zone, minus skipped and changed ones", () => {
  const ics = [
    "BEGIN:VEVENT", "DTSTART;TZID=Asia/Bangkok:20260601T170000", "DTEND;TZID=Asia/Bangkok:20260601T180000", "RRULE:FREQ=WEEKLY;BYDAY=MO,WE", "EXDATE;TZID=Asia/Bangkok:20260610T170000", "SUMMARY:Guitar", "END:VEVENT",
    "BEGIN:VEVENT", "DTSTART;TZID=Asia/Bangkok:20260612T090000", "DTEND;TZID=Asia/Bangkok:20260612T100000", "SUMMARY:One off", "END:VEVENT",
  ].join("\n");
  const from = Date.UTC(2026, 5, 7), to = Date.UTC(2026, 5, 15);
  const busy = parseIcsBusy(ics, from, to);
  // Mon 8, (Wed 10 skipped), Mon 15 is outside the window; the one off on Fri 12
  const hoursUtc = busy.map(([s]) => new Date(s).toISOString().slice(0, 16));
  assert.deepEqual(hoursUtc, ["2026-06-08T10:00", "2026-06-12T02:00"]); // 17:00 in Bangkok is 10:00 UTC
  assert.equal(busy[0][1] - busy[0][0], 3600e3);
});

test("calendar titles are kept short", () => {
  const s = { start: Date.UTC(2026, 5, 7, 10), end: Date.UTC(2026, 5, 7, 11), topic: "Effect of very high temperature on molecule shape", reason: "x" };
  const ics = makeIcs([s]);
  assert.match(ics, /SUMMARY:Study: Effect of very high tem…/);
  assert.match(ics, /DESCRIPTION:Effect of very high temperature on molecule shape/);
});

import { suggestPrefs } from "../src/insights.js";
test("the estimate keeps rest days and shorter sessions, and says why", () => {
  const now = Date.UTC(2026, 9, 6);
  const near = suggestPrefs({ goal: "exam", exam: "2026-10-12", now });
  assert.ok(near.perWeek <= 6 && near.perWeek >= 5);
  const far = suggestPrefs({ goal: "exam", exam: "2027-03-01", now });
  assert.equal(far.perWeek, 4);
  assert.ok(near.why.some((w) => /estimate/.test(w)));
  assert.ok(near.why.some((w) => /do not burn out/.test(w)));
});

test("a plan leaves a rest day, keeps sessions under two hours and covers topics not yet practised", () => {
  const prefs = defaultPrefs(); prefs.perWeek = 9; prefs.sessionMin = 90; prefs.prefer = "20:00";
  Object.values(prefs.days).forEach((d) => { d.on = true; d.from = "08:00"; d.to = "23:30"; });
  const plan = planWeek({ prefs, summary: summarise([]), now: new Date(2026, 9, 5, 7).getTime(), topicNames: ["Cells", "Osmosis"] });
  assert.ok(new Set(plan.map((s) => new Date(s.start).toDateString())).size <= 6);
  plan.forEach((s) => { assert.ok(s.end - s.start <= 60 * 60e3); });
  assert.ok(plan.some((s) => s.topic === "Cells") && plan.some((s) => s.topic === "Osmosis"));
});

test("an exam in two days gives a crash plan: long sessions, several a day, nights allowed, nothing after the exam", () => {
  const now = new Date(2026, 9, 6, 9).getTime();
  const est = suggestPrefs({ goal: "exam", exam: "2026-10-08", now });
  assert.ok(est.crash && est.perWeek >= 6 && est.sessionMin === 60);
  const prefs = { ...defaultPrefs(), exam: "2026-10-08", perWeek: 6, sessionMin: 90, prefer: "22:00" };
  Object.values(prefs.days).forEach((d) => { d.on = true; d.from = "09:00"; d.to = "23:30"; });
  const plan = planWeek({ prefs, summary: summarise([]), now, topicNames: ["Maths", "French", "Physics"] });
  const days = new Set(plan.map((s) => new Date(s.start).toDateString()));
  assert.ok(plan.length >= 5);
  assert.ok(days.size <= 2 && plan.every((s) => new Date(s.start) < new Date(2026, 9, 8)));
  assert.ok(plan.some((s) => s.end - s.start === 90 * 60e3));
  assert.ok(plan.some((s) => new Date(s.end).getHours() >= 21));
  assert.deepEqual([...new Set(plan.map((s) => s.topic))].sort(), ["French", "Maths", "Physics"]);
});

test("many subjects raise the number of sessions", () => {
  const est = suggestPrefs({ goal: "school", subjects: 7, now: Date.UTC(2026, 9, 6) });
  assert.equal(est.perWeek, 7);
});
