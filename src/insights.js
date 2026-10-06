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

export function planWeek({ prefs = defaultPrefs(), summary, busy = [], now = Date.now() }) {
  const len = Math.max(15, Math.min(90, prefs.sessionMin || 40)) * MIN;
  const win = summary ? bestWindow(summary) : null;
  const wanted = prefs.prefer === "auto" ? (win ? win.hour * 60 : null) : prefs.prefer ? Number(prefs.prefer.split(":")[0]) * 60 + Number(prefs.prefer.split(":")[1] || 0) : null;
  const slotsByDay = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(now); day.setDate(day.getDate() + i);
    const cfg = prefs.days?.[day.getDay()];
    if (!cfg?.on) continue;
    const ws = Math.max(atTime(day, cfg.from), now + 10 * MIN), we = atTime(day, cfg.to);
    const fits = freeSlots(ws, we, busy).filter(([s, e]) => e - s >= len);
    if (fits.length) slotsByDay.push({ day, fits });
  }
  const sessions = [];
  const topicQueue = [...(summary?.weak || []).map((t) => ({ name: t.name, why: `${t.accuracy}% right so far` })), ...(summary?.topics || []).filter((t) => !(summary.weak || []).includes(t) && t.accuracy != null && t.accuracy < 85).map((t) => ({ name: t.name, why: `${t.accuracy}% right, room to grow` }))];
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
  for (let pass = 0; pass < 2 && sessions.length < (prefs.perWeek || 5); pass++) {
    for (const entry of slotsByDay) {
      if (sessions.length >= (prefs.perWeek || 5)) break;
      if (pass === 0 && sessions.some((s) => new Date(s.start).toDateString() === entry.day.toDateString())) continue;
      const taken = sessions.filter((s) => new Date(s.start).toDateString() === entry.day.toDateString());
      const fits = entry.fits.flatMap(([s, e]) => freeSlots(s, e, taken.map((x) => [x.start - 10 * MIN, x.end + 10 * MIN]))).filter(([s, e]) => e - s >= len);
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
const title = (s) => (s.topic ? `Study: ${s.topic}` : "Study session");

// one link that opens the event ready to save in Google Calendar
export function googleLink(s) {
  const q = new URLSearchParams({ action: "TEMPLATE", text: title(s), dates: `${stamp(s.start)}/${stamp(s.end)}`, details: `${s.reason}. Planned in Dwiddle.` });
  return `https://calendar.google.com/calendar/render?${q}`;
}

// a file any calendar app can import (Google, Apple, Outlook)
export function makeIcs(sessions, now = Date.now()) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dwiddle//Study plan//EN", "CALSCALE:GREGORIAN"];
  sessions.forEach((s, i) => {
    lines.push("BEGIN:VEVENT", `UID:dwiddle-${s.start}-${i}@dwiddle`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(s.start)}`, `DTEND:${stamp(s.end)}`,
      `SUMMARY:${esc(title(s))}`, `DESCRIPTION:${esc(s.reason + ". Planned in Dwiddle.")}`, "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:Study time", "END:VALARM", "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// the busy times in a calendar file someone exported, so the plan keeps clear of them
export function parseIcsBusy(text) {
  const unfolded = String(text || "").replace(/\r?\n[ \t]/g, "");
  const out = [];
  const when = (v) => {
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v.trim());
    if (!m) return null;
    const [, y, mo, d, h = "0", mi = "0", , z] = m;
    return z ? Date.UTC(+y, +mo - 1, +d, +h, +mi) : new Date(+y, +mo - 1, +d, +h, +mi).getTime();
  };
  unfolded.split("BEGIN:VEVENT").slice(1).forEach((block) => {
    const body = block.split("END:VEVENT")[0];
    const get = (k) => { const m = new RegExp(`^${k}[^:\\n]*:(.*)$`, "m").exec(body); return m ? m[1].trim() : ""; };
    if (/^TRANSP:TRANSPARENT/m.test(body)) return; // marked as free
    const s = when(get("DTSTART")), e = when(get("DTEND")) ?? (s != null ? s + HOUR : null);
    if (s != null && e != null && e > s) out.push([s, e]);
  });
  return out;
}
