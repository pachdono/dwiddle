// What the answer log says about how someone studies, and a plan built from it.
// Pure functions, so they are tested without a screen.

const HOUR = 3600e3, MIN = 60e3;
const pct = (r, n) => (n ? Math.round((r / n) * 100) : null);

// A sitting is a run of answers with no gap longer than 20 minutes.
export function sittings(log, gap = 20 * MIN) {
  const out = [];
  let cur = null;
  [...log].sort((a, b) => a.t - b.t).forEach((e) => {
    if (cur && e.t - cur.end <= gap) { cur.end = e.t; cur.items.push(e); }
    else { cur = { start: e.t, end: e.t, items: [e] }; out.push(cur); }
  });
  // a sitting lasted at least as long as it took to read and answer what is in it
  return out.map((s) => ({ ...s, minutes: Math.max(1, Math.round((s.end - s.start) / MIN) + Math.min(2, s.items.length)) }));
}

export function summarise(log, now = Date.now()) {
  const total = log.length;
  const right = log.filter((e) => e.ok).length;
  const byTopic = {}, byKind = {}, byHour = Array.from({ length: 24 }, () => ({ r: 0, n: 0 }));
  const byDay = {};
  log.forEach((e) => {
    const t = (byTopic[e.topic || "General"] ||= { r: 0, n: 0, recent: [] });
    t.n++; if (e.ok) t.r++; t.recent.push(e.ok);
    const k = (byKind[e.kind || "mc"] ||= { r: 0, n: 0 });
    k.n++; if (e.ok) k.r++;
    const h = new Date(e.t).getHours();
    byHour[h].n++; if (e.ok) byHour[h].r++;
    const d = new Date(e.t).toISOString().slice(0, 10);
    const day = (byDay[d] ||= { r: 0, n: 0 });
    day.n++; if (e.ok) day.r++;
  });
  const topics = Object.entries(byTopic).map(([name, v]) => ({
    name, right: v.r, total: v.n, accuracy: pct(v.r, v.n),
    recent: pct(v.recent.slice(-6).filter(Boolean).length, Math.min(6, v.recent.length)),
  })).sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));
  const weak = topics.filter((t) => t.total >= 4 && t.accuracy < 65);
  const strong = topics.filter((t) => t.total >= 4 && t.accuracy >= 85).reverse();
  const kinds = Object.entries(byKind).map(([kind, v]) => ({ kind, total: v.n, accuracy: pct(v.r, v.n) })).sort((a, b) => b.total - a.total);
  const sits = sittings(log);
  const week = now - 7 * 24 * HOUR;
  const minutesThisWeek = sits.filter((s) => s.start >= week).reduce((n, s) => n + s.minutes, 0);
  const since = new Date(now - 6 * 24 * HOUR).toISOString().slice(0, 10);
  const daysThisWeek = new Set(log.map((e) => new Date(e.t).toISOString().slice(0, 10)).filter((d) => d >= since)).size;
  // accuracy now against before, over the last and the previous 25 answers
  const last = log.slice(-25), before = log.slice(-50, -25);
  const trend = last.length >= 15 && before.length >= 15
    ? pct(last.filter((e) => e.ok).length, last.length) - pct(before.filter((e) => e.ok).length, before.length) : null;
  const days = Object.entries(byDay).sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, v]) => ({ date, answered: v.n, accuracy: pct(v.r, v.n) }));
  return { total, right, accuracy: pct(right, total), topics, weak, strong, kinds, byHour, sits, minutesThisWeek, daysThisWeek, trend, days };
}

// The best two hour window, when there is enough to say so.
export function bestWindow(summary, min = 6) {
  const { byHour, accuracy } = summary;
  let best = null;
  for (let h = 0; h < 24; h++) {
    const a = byHour[h], b = byHour[(h + 1) % 24];
    const n = a.n + b.n;
    if (n >= min * 2) {
      const acc = pct(a.r + b.r, n);
      if (!best || acc > best.accuracy) best = { hour: h, accuracy: acc, answers: n };
    }
  }
  return best && accuracy != null && best.accuracy - accuracy >= 4 ? best : null;
}

const hh = (h) => `${String(h).padStart(2, "0")}:00`;

// Plain advice, each with the number it rests on.
export function advice(summary, now = Date.now()) {
  const out = [];
  if (summary.total < 10) return [{ id: "start", tone: "info", title: "Not enough yet", text: "Answer a few more questions and this page will start telling you when you study best and where you are weak." }];
  const win = bestWindow(summary);
  if (win) out.push({ id: "best", tone: "good", title: "Your best time", text: `You get ${win.accuracy}% right between ${hh(win.hour)} and ${hh((win.hour + 2) % 24)}, against ${summary.accuracy}% overall. Put your hardest topic there.` });
  const longSits = summary.sits.filter((s) => s.minutes >= 50 && s.items.length >= 20);
  if (longSits.length) {
    const drops = longSits.map((s) => {
      const third = Math.floor(s.items.length / 3);
      const a = s.items.slice(0, third), c = s.items.slice(-third);
      return pct(a.filter((e) => e.ok).length, a.length) - pct(c.filter((e) => e.ok).length, c.length);
    });
    const avg = Math.round(drops.reduce((n, d) => n + d, 0) / drops.length);
    if (avg >= 12) out.push({ id: "burnout", tone: "warn", title: "You may be wearing out", text: `In your long sittings, accuracy falls about ${avg} points between the start and the end. Try 40 minutes, then a 10 minute break away from the screen.` });
  }
  const late = summary.byHour.reduce((n, v, h) => n + (h >= 23 || h < 5 ? v.n : 0), 0);
  if (late / summary.total >= 0.2) out.push({ id: "late", tone: "warn", title: "A lot of late night study", text: `${Math.round((late / summary.total) * 100)}% of your answers are after 11pm. Sleep is when memory settles, so an earlier session is worth more than a later one.` });
  if (summary.daysThisWeek <= 2) out.push({ id: "days", tone: "info", title: "Little and often", text: `You studied on ${summary.daysThisWeek} of the last 7 days. Four short sessions beat one long one for remembering.` });
  else if (summary.daysThisWeek >= 5) out.push({ id: "days", tone: "good", title: "Steady week", text: `You studied on ${summary.daysThisWeek} of the last 7 days. That habit is what keeps things in your head.` });
  if (summary.weak.length) out.push({ id: "weak", tone: "warn", title: "Where to spend your time", text: `${summary.weak.slice(0, 3).map((t) => `${t.name} (${t.accuracy}%)`).join(", ")} ${summary.weak.length > 1 ? "are" : "is"} below 65%. Those come first in your plan.` });
  if (summary.trend != null) out.push({ id: "trend", tone: summary.trend >= 0 ? "good" : "info", title: summary.trend >= 0 ? "Getting better" : "A dip lately", text: `Your last 25 answers are ${Math.abs(summary.trend)} points ${summary.trend >= 0 ? "better" : "lower"} than the 25 before.` });
  const mc = summary.kinds.find((k) => k.kind === "mc"), typed = summary.kinds.find((k) => k.kind === "blank" || k.kind === "word");
  if (mc && typed && mc.total >= 10 && typed.total >= 6 && mc.accuracy - typed.accuracy >= 15) out.push({ id: "recall", tone: "info", title: "Picking is easier than recalling", text: `You get ${mc.accuracy}% when choosing and ${typed.accuracy}% when you have to type it. The typed ones are the better test, so do more of them.` });
  return out;
}

/* ---------- the plan ---------- */

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const defaultPrefs = () => ({
  sessionMin: 40, perWeek: 5, prefer: "auto", exam: "",
  days: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, { on: d >= 1 && d <= 5 || d === 0, from: d === 0 || d === 6 ? "10:00" : "16:30", to: d === 0 || d === 6 ? "18:00" : "20:30" }])),
});

const atTime = (date, hm) => { const [h, m] = String(hm).split(":").map(Number); const d = new Date(date); d.setHours(h || 0, m || 0, 0, 0); return d.getTime(); };

// the free stretches of one day: the window the person gave, less anything busy
function freeSlots(winStart, winEnd, busy) {
  let slots = [[winStart, winEnd]];
  busy.forEach(([bs, be]) => {
    slots = slots.flatMap(([s, e]) => (be <= s || bs >= e ? [[s, e]] : [[s, Math.max(s, bs)], [Math.min(e, be), e]])).filter(([s, e]) => e - s > 0);
  });
  return slots;
}

// Whole days until the exam, counting from the start of today. Null when there
// is no date or it has passed.
export function daysToExam(exam, now = Date.now()) {
  if (!exam) return null;
  const t = new Date(exam + "T00:00:00"), n = new Date(now); n.setHours(0, 0, 0, 0);
  if (Number.isNaN(t.getTime())) return null;
  const d = Math.round((t.getTime() - n.getTime()) / 864e5);
  return d < 0 ? null : d;
}

export function planWeek({ prefs = defaultPrefs(), summary, busy = [], now = Date.now(), topicNames = [] }) {
  // Normally a week has a rest day in it and sessions stay a sensible length.
  // With an exam in three days or fewer there is no time for that: sessions can
  // run long, two or three can share a day, and the evening and night are fair.
  const left = daysToExam(prefs.exam, now);
  const crunch = left != null && left <= 3;
  const guard = prefs.guard !== false && !crunch;
  const len = Math.max(15, Math.min(guard ? 60 : 120, prefs.sessionMin || 40)) * MIN;
  const gap = (crunch ? 15 : 10) * MIN;
  const perDay = crunch ? 3 : 2;
  const win = summary ? bestWindow(summary) : null;
  const wanted = prefs.prefer === "auto" ? (win ? win.hour * 60 : null) : prefs.prefer ? Number(prefs.prefer.split(":")[0]) * 60 + Number(prefs.prefer.split(":")[1] || 0) : null;
  const slotsByDay = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(now); day.setDate(day.getDate() + i);
    const cfg = prefs.days?.[day.getDay()];
    if (!cfg?.on) continue;
    // nothing is planned on or after the day of the exam
    if (left != null && i >= left) break;
    const ws = Math.max(atTime(day, cfg.from), now + 10 * MIN);
    // a window that runs past midnight (22:00 to 01:00) ends the next morning
    let we = atTime(day, cfg.to);
    if (we <= atTime(day, cfg.from)) we += 864e5;
    const fits = freeSlots(ws, we, busy).filter(([s, e]) => e - s >= len);
    if (fits.length) slotsByDay.push({ day, fits });
  }
  const sessions = [];
  const focus = prefs.focus || [];
  const known = new Set((summary?.topics || []).map((t) => t.name));
  const topicQueue = [
    ...focus.map((n) => { const t = (summary?.topics || []).find((x) => x.name === n); return { name: n, why: t ? `Your main focus, ${t.accuracy}% right so far` : "Your main focus" }; }),
    ...(summary?.weak || []).filter((t) => !focus.includes(t.name)).map((t) => ({ name: t.name, why: `${t.accuracy}% right so far` })),
    ...(summary?.topics || []).filter((t) => !focus.includes(t.name) && !(summary.weak || []).includes(t) && t.accuracy != null && t.accuracy < 85).map((t) => ({ name: t.name, why: `${t.accuracy}% right, room to grow` })),
    // topics not practised yet come in too, so a new plan covers everything
    ...topicNames.filter((n) => !known.has(n) && !focus.includes(n)).map((n) => ({ name: n, why: "Not practised yet" })),
  ];
  let ti = 0;
  const place = (entry) => {
    // the start nearest the preferred time, inside the longest free stretch it fits
    let best = null;
    entry.fits.forEach(([s, e]) => {
      const dayStart = new Date(entry.day); dayStart.setHours(0, 0, 0, 0);
      let start = s;
      if (wanted != null) start = Math.min(Math.max(s, dayStart.getTime() + wanted * MIN), e - len);
      const gap = wanted == null ? 0 : Math.abs((start - dayStart.getTime()) / MIN - wanted);
      if (!best || gap < best.gap) best = { start, gap };
    });
    return best?.start;
  };
  // one rest day: never more than six days in a seven day stretch, unless the
  // exam is too close for that
  const dayCap = guard ? 6 : 7;
  const target = Math.min(prefs.perWeek || 5, crunch ? 14 : 10);
  for (let pass = 0; pass < perDay && sessions.length < target; pass++) {
    for (const entry of slotsByDay) {
      if (sessions.length >= target) break;
      const usedDays = new Set(sessions.map((x) => new Date(x.start).toDateString()));
      if (usedDays.size >= dayCap && !usedDays.has(entry.day.toDateString())) continue;
      const taken = sessions.filter((s) => new Date(s.start).toDateString() === entry.day.toDateString());
      if (taken.length > pass || taken.length >= perDay) continue;
      const fits = entry.fits.flatMap(([s, e]) => freeSlots(s, e, taken.map((x) => [x.start - gap, x.end + gap]))).filter(([s, e]) => e - s >= len);
      if (!fits.length) continue;
      const start = place({ day: entry.day, fits });
      if (start == null) continue;
      const topic = topicQueue.length ? topicQueue[ti++ % topicQueue.length] : null;
      sessions.push({ start, end: start + len, topic: topic?.name || "", reason: topic ? topic.why : "A mixed review of everything" });
    }
  }
  return sessions.sort((a, b) => a.start - b.start);
}

/* ---------- calendars ---------- */

const pad = (n) => String(n).padStart(2, "0");
const stamp = (t) => { const d = new Date(t); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
const esc = (s) => String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
// short enough to read on a calendar bar; the whole topic is in the description
const clip = (t, n = 24) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
const title = (s) => (s.topic ? `Study: ${clip(s.topic)}` : "Study session");

// one link that opens the event ready to save in Google Calendar
export function googleLink(s) {
  const q = new URLSearchParams({ action: "TEMPLATE", text: title(s), dates: `${stamp(s.start)}/${stamp(s.end)}`, details: `${s.topic ? s.topic + ". " : ""}${s.reason}. Planned in Dwiddle.` });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// a file any calendar app can import (Google, Apple, Outlook)
export function makeIcs(sessions, now = Date.now(), name = "") {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dwiddle//Study plan//EN", "CALSCALE:GREGORIAN",
    // a calendar someone subscribes to is named, and asked to refresh hourly
    ...(name ? [`X-WR-CALNAME:${esc(name)}`, "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"] : [])];
  sessions.forEach((s, i) => {
    lines.push("BEGIN:VEVENT", `UID:dwiddle-${s.start}-${i}@dwiddle`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(s.start)}`, `DTEND:${stamp(s.end)}`,
      `SUMMARY:${esc(title(s))}`, `DESCRIPTION:${esc((s.topic ? s.topic + ". " : "") + s.reason + ". Planned in Dwiddle.")}`, "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:Study time", "END:VALARM", "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// the busy times in a calendar file (or a calendar's secret address), so the
// plan keeps clear of them. Repeating events, such as a weekly lesson, are
// expanded across the window, with their time zone, their skipped dates and any
// single changed occurrence.
const ICS_DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function zoned(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  if (!tz) return new Date(y, mo - 1, d, h, mi).getTime();
  try {
    const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    let t = guess;
    for (let k = 0; k < 2; k++) {
      const p = Object.fromEntries(f.formatToParts(t).map((x) => [x.type, x.value]));
      t = guess - (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - t);
    }
    return t;
  } catch { return new Date(y, mo - 1, d, h, mi).getTime(); }
}

// "DTSTART;TZID=Asia/Bangkok:20261006T150000" into its parts
function icsTime(line) {
  if (!line) return null;
  const i = line.indexOf(":");
  const head = line.slice(0, i), val = line.slice(i + 1).trim();
  const tz = (/TZID=([^;:]+)/.exec(head) || [])[1];
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(val);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", , z] = m;
  const allDay = /VALUE=DATE(?!-)/.test(head) || (val.length === 8);
  return { y: +y, mo: +mo, d: +d, h: +h, mi: +mi, utc: !!z, tz: z ? null : tz, allDay,
    at: (yy = +y, mm = +mo, dd = +d) => (z ? Date.UTC(yy, mm - 1, dd, +h, +mi) : zoned(yy, mm, dd, +h, +mi, tz)) };
}

export function parseIcsBusy(text, from = Date.now(), to = from + 21 * 864e5) {
  const unfolded = String(text || "").replace(/\r?\n[ \t]/g, "").replace(/\r/g, "");
  const out = [];
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1).map((b) => b.split("END:VEVENT")[0]);
  const lineOf = (body, k) => (new RegExp(`^${k}[^\\n]*`, "m").exec(body) || [""])[0];
  const moved = new Set(); // the original start times of occurrences that were changed individually
  blocks.forEach((body) => {
    const rid = icsTime(lineOf(body, "RECURRENCE-ID"));
    if (rid) moved.add(rid.at());
  });
  blocks.forEach((body) => {
    if (/^TRANSP:TRANSPARENT/m.test(body) || /^STATUS:CANCELLED/m.test(body)) return; // marked as free, or called off
    const st = icsTime(lineOf(body, "DTSTART"));
    if (!st || st.allDay) return; // a birthday or a holiday is not busy time
    const en = icsTime(lineOf(body, "DTEND"));
    const dur = en && !en.allDay ? en.at() - st.at() : 36e5;
    if (!(dur > 0)) return;
    const rule = (/^RRULE:(.*)$/m.exec(body) || [])[1];
    if (!rule) { const s0 = st.at(); if (s0 + dur > from && s0 < to) out.push([s0, s0 + dur]); return; }
    const r = Object.fromEntries(rule.split(";").map((kv) => kv.split("=")));
    const step = Math.max(1, Number(r.INTERVAL) || 1);
    const until = r.UNTIL ? icsTime("X:" + r.UNTIL)?.at() : Infinity;
    const max = r.COUNT ? Number(r.COUNT) : Infinity;
    const skip = new Set([...body.matchAll(/^EXDATE[^\n]*/gm)].flatMap((m) => {
      const i = m[0].indexOf(":");
      return m[0].slice(i + 1).split(",").map((v) => icsTime(m[0].slice(0, i) + ":" + v.trim())?.at()).filter((x) => x != null);
    }));
    let n = 0;
    const emit = (yy, mm, dd) => {
      const s0 = st.at(yy, mm, dd);
      if (s0 > until) return false;
      n++;
      if (n > max) return false;
      if (!skip.has(s0) && !moved.has(s0) && s0 + dur > from && s0 < to) out.push([s0, s0 + dur]);
      return s0 < to;
    };
    const start = new Date(Date.UTC(st.y, st.mo - 1, st.d));
    if (r.FREQ === "DAILY") {
      for (let k = 0; k < 800; k++) { const d = new Date(start.getTime() + k * step * 864e5); if (!emit(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())) break; }
    } else if (r.FREQ === "WEEKLY") {
      const days = (r.BYDAY ? r.BYDAY.split(",").map((x) => ICS_DAYS[x.slice(-2)]) : [start.getUTCDay()]).sort((a, b) => a - b);
      const weekStart = start.getTime() - start.getUTCDay() * 864e5;
      outer: for (let w = 0; w < 300; w++) {
        for (const wd of days) {
          const d = new Date(weekStart + (w * step * 7 + wd) * 864e5);
          if (d < start) continue;
          if (!emit(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())) break outer;
        }
      }
    } else { const s0 = st.at(); if (s0 + dur > from && s0 < to) out.push([s0, s0 + dur]); }
  });
  return out.filter(([s, e]) => e > s);
}

// How well the topics are known, from the last few answers on them.
export function masteryOf(log, topics) {
  const set = new Set(topics);
  const recent = log.filter((e) => set.has(e.topic)).slice(-8);
  if (recent.length < 6) return "unknown";
  const acc = recent.filter((e) => e.ok).length / recent.length;
  return acc >= 0.8 ? "high" : acc < 0.5 ? "low" : "mid";
}

/* ---------- the setup form's estimate ---------- */

export const GOALS = [
  { id: "exam", label: "An exam or test is coming up", hint: "More sessions as it gets closer, with rest days kept." },
  { id: "school", label: "Keep up with school", hint: "A steady few sessions every week." },
  { id: "catchup", label: "Catch up on what I find hard", hint: "Weak topics first, a bit more often." },
  { id: "interest", label: "Learn for interest", hint: "Light and regular." },
];

// A plan worked out from what someone says they want, kept from wearing them
// out: never seven days, sessions that fit in one sitting, and a cap on late
// nights. When there are answers to look at, they decide the rest.
export function suggestPrefs({ goal = "school", exam = "", summary = null, now = Date.now(), subjects = 1 }) {
  const days = daysToExam(exam, now);
  const why = [];
  let perWeek = { exam: 5, school: 4, catchup: 5, interest: 3 }[goal] ?? 4;
  let sessionMin = goal === "interest" ? 30 : 40;
  const hard = goal === "exam" && days != null && days <= 3;
  if (goal === "exam" && days != null) {
    if (days === 0) { perWeek = 0; why.push("Your exam is today, so there is nothing to plan. Good luck."); }
    else if (hard) {
      // too close for a normal week: more and longer sessions, every day
      perWeek = Math.min(9, days * 3); sessionMin = 60;
      why.push(`${days} day${days === 1 ? "" : "s"} to go, so this is a crash plan: up to three sessions a day, an hour each, with 15 minute breaks between them. Evenings and nights are fine.`);
      why.push("Put your hardest topics first, do questions rather than rereading, and still get seven or eight hours of sleep the night before. Sleep is when it sticks.");
    }
    else if (days <= 7) { perWeek = 6; sessionMin = 50; why.push(`${days} days to go, so six sessions this week with one day to rest.`); }
    else if (days <= 21) { perWeek = 6; why.push(`${days} days to go: six sessions a week, the weak topics first.`); }
    else if (days <= 60) { perWeek = 5; why.push(`${days} days is plenty of time. Five sessions a week is enough, and it builds up gradually.`); }
    else { perWeek = 4; why.push(`${days} days away: four sessions a week now, more as it gets closer.`); }
  }
  // every subject needs its turn, so a longer list means more sessions
  if (!hard && subjects > perWeek) { perWeek = Math.min(10, subjects); why.push(`${subjects} subjects to cover, so ${perWeek} sessions so each one gets a turn.`); }
  const burn = !hard && summary && advice(summary).some((a) => a.id === "burnout");
  if (burn) { sessionMin = 35; why.push("Your long sittings tail off, so sessions are kept to 35 minutes."); }
  if (!summary || summary.total < 10) why.push("You have not answered many questions yet, so this is an estimate. It will adjust as you practise.");
  else why.push(`Worked out partly from your ${summary.total} answers.`);
  if (!hard && days !== 0) why.push("Sessions stay under an hour and one day a week is left free, so you do not burn out. You can raise either one yourself.");
  return { perWeek: Math.min(perWeek, hard ? 9 : 10), sessionMin, why, crash: hard };
}
