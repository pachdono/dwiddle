import { useEffect, useMemo, useRef, useState } from "react";
import { PageHead } from "./ui.jsx";
import { load, save } from "./store.js";
import { readLog } from "./studylog.js";
import { summarise, advice, bestWindow, planWeek, defaultPrefs, DAY_NAMES, googleLink, makeIcs, parseIcsBusy } from "./insights.js";
import { levelOf } from "./xp.js";
import { gcalAvailable, connected, connect, disconnect, busyTimes, syncPlan } from "./gcal.js";
import { isDesktop } from "./desktop.js";
import { getFeed, pushSessions, replaceFeed, feedLinks } from "./calfeed.js";

// The report and the planner, one page with two tabs. Everything here is worked
// out on this device from the answers already given; nothing is sent anywhere.

const KIND_NAME = { mc: "Multiple choice", blank: "Fill in the blank", word: "Complete the word", finish: "In your own words", written: "In your own words", tf: "True or false", match: "Matching", order: "Putting in order" };
const PREFS_KEY = "dwiddle-plan-prefs";
const BUSY_KEY = "dwiddle-busy";

function useLog() {
  const [log, setLog] = useState(readLog);
  useEffect(() => { const f = () => setLog(readLog()); addEventListener("dwiddle:log", f); return () => removeEventListener("dwiddle:log", f); }, []);
  return log;
}

const tone = (a) => (a == null ? "" : a >= 80 ? "good" : a >= 60 ? "mid" : "low");
const grade = (a) => (a == null ? "" : a >= 80 ? "Strong" : a >= 60 ? "Getting there" : "Needs work");

// a ring for one percentage
function Ring({ value, size = 96, label }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  return (
    <svg className="rg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value ?? 0}% ${label || ""}`}>
      <circle cx={size / 2} cy={size / 2} r={r} className="rg-bg" />
      <circle cx={size / 2} cy={size / 2} r={r} className={"rg-fg " + tone(value)} strokeDasharray={`${((value ?? 0) / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="rg-t">{value == null ? "-" : value + "%"}</text>
    </svg>
  );
}

function Bar({ label, value, total, sub, action }) {
  return (
    <div className="rp-row">
      <span className="rp-label">{label}</span>
      <span className="rp-track"><i className={tone(value)} style={{ width: `${value ?? 0}%` }} /></span>
      <b className="rp-val">{value == null ? "-" : value + "%"}</b>
      <span className="small muted rp-n">{sub || `${total} answered`}</span>
      {action}
    </div>
  );
}

// the last twelve weeks, one square a day, darker for more answers
function Heatmap({ days }) {
  const by = Object.fromEntries(days.map((d) => [d.date, d]));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - (12 * 7 - 1) - start.getDay());
  const max = Math.max(5, ...days.map((d) => d.answered));
  const cols = [];
  for (let w = 0; w < 13; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start); day.setDate(start.getDate() + w * 7 + d);
      const key = day.toISOString().slice(0, 10);
      const v = by[key]?.answered || 0;
      col.push({ key, v, future: day > today, lvl: v === 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)), month: day.getDate() <= 7 && d === 0 ? day.toLocaleDateString([], { month: "short" }) : "" });
    }
    cols.push(col);
  }
  return (
    <div className="hm" role="img" aria-label="Questions answered each day over twelve weeks">
      <div className="hm-days"><span>Mon</span><span>Wed</span><span>Fri</span></div>
      <div className="hm-grid">
        {cols.map((col, i) => (
          <div key={i} className="hm-col">
            <small>{col[0].month}</small>
            {col.map((c) => <i key={c.key} className={"hm-c hm-l" + c.lvl + (c.future ? " hm-future" : "")} title={`${c.key}: ${c.v} answered`} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Report({ stats, go, setTopic, log, summary }) {
  const lv = levelOf(stats?.xp || 0);
  const topics = summary.topics.length ? summary.topics : Object.entries(stats?.byTopic || {}).map(([name, v]) => ({ name, total: v.total, accuracy: v.total ? Math.round((v.right / v.total) * 100) : null })).sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));
  const days = summary.days.slice(-14);
  const maxDay = Math.max(1, ...days.map((d) => d.answered));
  const tips = advice(summary);
  const acc = stats?.answered ? Math.round((stats.correct / stats.answered) * 100) : summary.accuracy;
  const practise = (t) => <button className="btn small ghost rp-go" onClick={() => { setTopic?.(t); go("quiz"); }}>Practise</button>;
  const win = bestWindow(summary);
  return (
    <div className="rp stack">
      <div className="rp-hero">
        <div className="rp-hero-ring"><Ring value={acc} size={118} label="right overall" /><span>right overall</span></div>
        <div className="rp-hero-stats">
          <div><b>{stats?.answered ?? 0}</b><span>questions answered</span></div>
          <div><b>{summary.daysThisWeek}<small>/7</small></b><span>days studied this week</span></div>
          <div><b>{summary.minutesThisWeek}<small> min</small></b><span>studied this week</span></div>
          <div><b>Lv {lv.level}</b><span>{stats?.xp || 0} XP</span></div>
        </div>
      </div>

      <div className="rp-two">
        <div className="card card-pad">
          <h3>Topics</h3>
          {topics.length === 0 ? <p className="small muted">Answer some questions and your topics appear here.</p> : topics.map((t) => (
            <div key={t.name} className="rp-topic">
              <div className="rp-topic-top"><b>{t.name}</b><span className={"rp-badge " + tone(t.accuracy)}>{grade(t.accuracy)}</span></div>
              <Bar label="" value={t.accuracy} total={t.total} sub={`${t.total} answered${t.recent != null ? `, lately ${t.recent}%` : ""}`} action={t.accuracy != null && t.accuracy < 80 ? practise(t.name) : null} />
            </div>
          ))}
        </div>
        <div className="card card-pad">
          <h3>What to do next</h3>
          {tips.map((t) => <div key={t.id} className={"rp-tip " + t.tone}><b>{t.title}</b><span>{t.text}</span></div>)}
        </div>
      </div>

      <div className="card card-pad">
        <div className="spread"><h3 style={{ margin: 0 }}>Your last twelve weeks</h3><span className="small muted">{summary.days.length} days studied</span></div>
        <Heatmap days={summary.days} />
      </div>

      <div className="rp-two">
        {days.length > 0 && (
          <div className="card card-pad">
            <h3>The last two weeks</h3>
            <div className="rp-days" role="img" aria-label="Questions answered each day">
              {days.map((d) => (
                <span key={d.date} className="rp-day" title={`${d.date}: ${d.answered} answered, ${d.accuracy}% right`}>
                  <i className={tone(d.accuracy)} style={{ height: `${Math.max(6, (d.answered / maxDay) * 100)}%` }} />
                  <small>{new Date(d.date).getDate()}</small>
                </span>
              ))}
            </div>
            <p className="small muted">Height is how many you answered. Colour is how many you got right.</p>
          </div>
        )}
        {summary.total >= 20 && (
          <div className="card card-pad">
            <h3>When you do best</h3>
            <div className="rp-hours" role="img" aria-label="Accuracy by hour of the day">
              {summary.byHour.map((h, i) => (
                <span key={i} className={"rp-hour" + (win && (i === win.hour || i === (win.hour + 1) % 24) ? " best" : "")} title={`${String(i).padStart(2, "0")}:00, ${h.n} answered${h.n ? `, ${Math.round((h.r / h.n) * 100)}% right` : ""}`}>
                  <i className={h.n >= 3 ? tone(Math.round((h.r / h.n) * 100)) : "none"} style={{ height: h.n >= 3 ? `${Math.max(8, (h.r / h.n) * 100)}%` : "6%" }} />
                  <small>{i % 3 === 0 ? i : ""}</small>
                </span>
              ))}
            </div>
            <p className="small muted">{win ? `Best around ${String(win.hour).padStart(2, "0")}:00, with ${win.accuracy}% right.` : "Hour of the day. Grey bars have too few answers to say."}</p>
          </div>
        )}
      </div>

      {summary.kinds.length > 0 && (
        <div className="card card-pad">
          <h3>By kind of question</h3>
          <p className="small muted">Picking an answer is easier than recalling it. The gap between the two shows how well you really know it.</p>
          {summary.kinds.map((k) => <Bar key={k.kind} label={KIND_NAME[k.kind] || k.kind} value={k.accuracy} total={k.total} />)}
        </div>
      )}

      <div className="dl-row" style={{ justifyContent: "flex-start" }}>
        <button className="btn ghost" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
    </div>
  );
}

const hm = (t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PRESETS = [
  { id: "school", label: "After school", set: (d) => (d >= 1 && d <= 5 ? { on: true, from: "16:30", to: "20:30" } : { on: false }) },
  { id: "evenings", label: "Evenings", set: () => ({ on: true, from: "18:00", to: "21:30" }) },
  { id: "weekends", label: "Weekends only", set: (d) => (d === 0 || d === 6 ? { on: true, from: "10:00", to: "17:00" } : { on: false }) },
  { id: "all", label: "Every day", set: () => ({ on: true, from: "09:00", to: "20:00" }) },
];

// Google Calendar: connect once, and the plan is written into the calendar and
// the busy times are read back. Without a Google client set up for the app it
// says so, and the links and the calendar file below still work.
function GoogleCard({ plan, busy, setBusy, now }) {
  const [on, setOn] = useState(connected());
  const [msg, setMsg] = useState("");
  const [working, setWorking] = useState(false);
  const [auto, setAutoRaw] = useState(() => load("dwiddle-gcal-auto", true));
  const setAuto = (v) => { setAutoRaw(v); save("dwiddle-gcal-auto", v); };
  const last = useRef("");

  const readBusy = async () => {
    try { setBusy(await busyTimes(now, now + 8 * 864e5)); setOn(true); }
    catch (e) { if (e.expired) setOn(false); setMsg(e.message); }
  };
  useEffect(() => { if (connected()) readBusy(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function link() {
    setWorking(true); setMsg("");
    try { await connect(); setOn(true); await readBusy(); setMsg("Connected. Your busy times are being kept clear."); }
    catch (e) { setMsg(e.message); }
    setWorking(false);
  }
  async function push(quiet) {
    if (!connected()) { setOn(false); if (!quiet) setMsg("Connect Google Calendar first."); return; }
    setWorking(true);
    try {
      const r = await syncPlan(plan);
      last.current = JSON.stringify(plan.map((x) => [x.start, x.topic]));
      setMsg(`Calendar updated: ${r.added} session${r.added === 1 ? "" : "s"} added${r.removed ? `, ${r.removed} old one${r.removed === 1 ? "" : "s"} replaced` : ""}.`);
    } catch (e) { if (e.expired) setOn(false); setMsg(e.message); }
    setWorking(false);
  }
  // keeps the calendar in step with the plan, a moment after it stops changing
  useEffect(() => {
    if (!on || !auto || !plan.length) return;
    const sig = JSON.stringify(plan.map((x) => [x.start, x.topic]));
    if (sig === last.current) return;
    const t = setTimeout(() => push(true), 2500);
    return () => clearTimeout(t);
  }, [plan, on, auto]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!gcalAvailable()) {
    return (
      <div className="pl-google off">
        <div><b>Google Calendar</b><p className="small muted">{isDesktop ? "Connecting to Google Calendar works in the web version of Dwiddle." : "Not switched on for this copy of Dwiddle yet. The add to Google Calendar links and the calendar file below still work."}</p></div>
      </div>
    );
  }
  return (
    <div className={"pl-google" + (on ? " on" : "")}>
      <div>
        <b>{on ? "Google Calendar is connected" : "Connect Google Calendar"}</b>
        <p className="small muted">{on ? "Dwiddle reads when you are busy, plans around it, and keeps your study sessions in your calendar up to date." : "Sign in with Google once. Dwiddle plans around what is already in your calendar and adds your study sessions to it. Nothing else is touched, and you can disconnect any time."}</p>
        {!on && <p className="small muted">By connecting you let Dwiddle read the times of your events and add study sessions. It does not read or keep their titles or details. <a href="/privacy" target="_blank" rel="noreferrer">Privacy policy</a></p>}
        {on && <label className="sc-check"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Update my calendar automatically when the plan changes</label>}
        {msg && <p className="small pl-msg">{msg}</p>}
      </div>
      <div className="pl-google-act">
        {on ? (<>
          <button className="btn cta" disabled={working || !plan.length} onClick={() => push(false)}>{working ? "Working..." : "Update my calendar"}</button>
          <button className="btn quiet small" onClick={() => { disconnect(); setOn(false); setBusy([]); setMsg("Disconnected."); }}>Disconnect</button>
        </>) : <button className="btn cta" disabled={working} onClick={link}>{working ? "Opening Google..." : "Connect Google Calendar"}</button>}
      </div>
    </div>
  );
}

// The week as a calendar: free windows shaded, what is already booked greyed,
// and the planned sessions as blocks, so the plan can be read at a glance.
function WeekView({ plan, busy, prefs, now }) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  const mins = (t, d) => (t - d.getTime()) / 6e4;
  const wins = days.map((d) => { const c = prefs.days?.[d.getDay()]; if (!c?.on) return null; const f = (hm) => { const [h, m] = String(hm).split(":").map(Number); return h * 60 + (m || 0); }; return [f(c.from), f(c.to)]; });
  const lo = Math.max(0, Math.floor(Math.min(8 * 60, ...wins.filter(Boolean).map((w) => w[0]), ...plan.map((s) => mins(s.start, days[0]) % 1440)) / 60) - 1);
  const hi = Math.min(24, Math.ceil(Math.max(21 * 60, ...wins.filter(Boolean).map((w) => w[1])) / 60) + 1);
  const H = 26, top = (m) => ((m / 60) - lo) * H, hours = Array.from({ length: hi - lo }, (_, i) => lo + i);
  return (
    <div className="wk">
      <div className="wk-axis" style={{ height: (hi - lo) * H + 30 }}>{hours.map((h) => <span key={h} style={{ top: 30 + (h - lo) * H }}>{String(h).padStart(2, "0")}:00</span>)}</div>
      {days.map((d, i) => {
        const dayBusy = busy.filter(([s, e]) => e > d.getTime() && s < d.getTime() + 864e5);
        const sess = plan.filter((s) => new Date(s.start).toDateString() === d.toDateString());
        return (
          <div key={i} className={"wk-col" + (i === 0 ? " today" : "")}>
            <div className="wk-head"><b>{SHORT[d.getDay()]}</b><span>{d.getDate()}</span></div>
            <div className="wk-body" style={{ height: (hi - lo) * H }}>
              {hours.map((h) => <i key={h} className="wk-line" style={{ top: (h - lo) * H }} />)}
              {wins[i] && <i className="wk-free" style={{ top: top(wins[i][0]), height: top(wins[i][1]) - top(wins[i][0]) }} />}
              {dayBusy.map(([s, e], k) => { const a = Math.max(0, mins(s, d)), z = Math.min(1440, mins(e, d)); return <i key={k} className="wk-busy" title="Already booked" style={{ top: top(a), height: Math.max(4, top(z) - top(a)) }} />; })}
              {sess.map((s) => { const a = mins(s.start, d), z = mins(s.end, d); return <div key={s.start} className="wk-sess" title={`${s.topic || "Mixed review"}: ${s.reason}`} style={{ top: top(a), height: top(z) - top(a) }}><b>{hm(s.start)}</b><span>{s.topic || "Review"}</span></div>; })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// The live calendar link: one secret address that Google Calendar, Apple
// Calendar and Outlook subscribe to, and keep the study sessions up to date by
// themselves. No Google sign in is involved, so there is no warning screen.
function FeedCard({ user, plan }) {
  const [feed, setFeed] = useState(null); // { token } | { error }
  const [copied, setCopied] = useState(false);
  useEffect(() => { let live = true; if (user) getFeed(user.id).then((f) => live && setFeed(f)); return () => { live = false; }; }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const sig = JSON.stringify(plan.map((x) => [x.start, x.topic]));
  useEffect(() => {
    if (!feed?.token || !user) return;
    const t = setTimeout(() => pushSessions(user.id, plan), 1500);
    return () => clearTimeout(t);
  }, [sig, feed?.token]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!user) return <div className="pl-google off"><div><b>Live calendar link</b><p className="small muted">Sign in to get a link that keeps your calendar up to date by itself. The links on each session below work without signing in.</p></div></div>;
  if (!feed) return <div className="pl-google off"><div><b>Live calendar link</b><p className="small muted">Getting your link...</p></div></div>;
  if (feed.error) return <div className="pl-google off"><div><b>Live calendar link</b><p className="small muted">{feed.error === "setup" ? "Not switched on yet. The links on each session below still work." : feed.error}</p></div></div>;
  const l = feedLinks(feed.token);
  return (
    <div className="pl-google on">
      <div>
        <b>Keep my calendar up to date</b>
        <p className="small muted">Add your Dwiddle calendar once and your study sessions appear in it and change as your plan changes. No sign in with Google, no warnings. Calendars refresh on their own every few hours.</p>
        <div className="dl-row" style={{ justifyContent: "flex-start", marginTop: 10 }}>
          <a className="btn cta" href={l.google} target="_blank" rel="noreferrer">Add to Google Calendar</a>
          <a className="btn ghost" href={l.webcal}>Apple Calendar or Outlook</a>
          <button className="btn quiet" onClick={() => { navigator.clipboard?.writeText(l.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? "Copied" : "Copy link"}</button>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>The link is private to you. Anyone who has it can see your study times, so do not share it. <button className="linkish" onClick={async () => setFeed(await replaceFeed(user.id))}>Make a new link</button> if it gets out.</p>
      </div>
    </div>
  );
}

function Planner({ summary, go, setTopic, user }) {
  const [prefs, setPrefsRaw] = useState(() => ({ ...defaultPrefs(), ...load(PREFS_KEY, {}) }));
  const [fileBusy, setFileBusyRaw] = useState(() => load(BUSY_KEY, []));
  const [gBusy, setGBusy] = useState([]);
  const [note, setNote] = useState("");
  const file = useRef(null);
  const setPrefs = (p) => { setPrefsRaw(p); save(PREFS_KEY, p); };
  const setDay = (d, patch) => setPrefs({ ...prefs, days: { ...prefs.days, [d]: { ...prefs.days[d], ...patch } } });
  const applyPreset = (pr) => setPrefs({ ...prefs, days: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, { ...prefs.days[d], ...pr.set(d) }])) });
  const now = useMemo(() => Date.now(), []);
  const busy = useMemo(() => [...fileBusy, ...gBusy].filter(([, e]) => e > now), [fileBusy, gBusy, now]);
  const plan = useMemo(() => planWeek({ prefs, summary, busy, now }), [prefs, summary, busy, now]);
  const tips = advice(summary).filter((t) => ["best", "burnout", "late", "days"].includes(t.id));
  const daysToExam = prefs.exam ? Math.ceil((new Date(prefs.exam).getTime() - now) / 864e5) : null;

  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const found = parseIcsBusy(await f.text()).filter(([, end]) => end > now && end < now + 40 * 864e5).slice(0, 600);
    setFileBusyRaw(found); save(BUSY_KEY, found);
    setNote(found.length ? `Read ${found.length} upcoming event${found.length === 1 ? "" : "s"}. The plan keeps clear of them.` : "No upcoming events were found in that file.");
    e.target.value = "";
  }
  function download() {
    const blob = new Blob([makeIcs(plan)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "dwiddle-study-plan.ics"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const Seg = ({ value, options, onChange, label }) => (
    <div className="seg tight" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => <button key={v} role="radio" aria-checked={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );

  return (
    <div className="rp stack pl">
      <FeedCard user={user} plan={plan} />
      {gcalAvailable() && (
        <details className="pl-adv">
          <summary>Advanced: connect with Google sign in</summary>
          <p className="small muted">This also lets Dwiddle see when you are busy so it plans around it. Google shows a warning screen because the app is not verified by Google yet. Most people should use the link above.</p>
          <GoogleCard plan={plan} busy={busy} setBusy={setGBusy} now={now} />
        </details>
      )}

      {tips.length > 0 && (
        <div className="card card-pad">
          <h3>What your results say about when to study</h3>
          {tips.map((t) => <div key={t.id} className={"rp-tip " + t.tone}><b>{t.title}</b><span>{t.text}</span></div>)}
        </div>
      )}

      <div className="card card-pad stack">
        <h3>How you like to study</h3>
        <div className="pl-prefs">
          <div><span className="pl-k">Best time of day</span>
            <select value={prefs.prefer} onChange={(e) => setPrefs({ ...prefs, prefer: e.target.value })}>
              <option value="auto">Pick from my results</option>
              {["07:00", "09:00", "12:00", "15:00", "17:00", "19:00", "20:30"].map((t) => <option key={t} value={t}>Around {t}</option>)}
            </select></div>
          <div><span className="pl-k">Session length</span><Seg label="Session length" value={prefs.sessionMin} onChange={(v) => setPrefs({ ...prefs, sessionMin: v })} options={[[25, "25 min"], [40, "40 min"], [60, "60 min"]]} /></div>
          <div><span className="pl-k">Sessions a week</span><Seg label="Sessions a week" value={prefs.perWeek} onChange={(v) => setPrefs({ ...prefs, perWeek: v })} options={[[3, "3"], [4, "4"], [5, "5"], [7, "7"]]} /></div>
          <div><span className="pl-k">Exam or test date</span><input type="date" value={prefs.exam} onChange={(e) => setPrefs({ ...prefs, exam: e.target.value })} /></div>
        </div>
        {daysToExam != null && daysToExam >= 0 && <p className="small">{daysToExam === 0 ? "Your exam is today." : `${daysToExam} day${daysToExam === 1 ? "" : "s"} to your exam.`}{daysToExam <= 14 && prefs.perWeek < 6 ? " That is close, so think about 6 or more sessions a week." : ""}</p>}
      </div>

      <div className="card card-pad stack">
        <div className="spread"><h3 style={{ margin: 0 }}>When you are free</h3>
          <div className="pl-presets">{PRESETS.map((pr) => <button key={pr.id} className="pl-chip" onClick={() => applyPreset(pr)}>{pr.label}</button>)}</div>
        </div>
        <div className="pl-week">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const c = prefs.days[d] || {};
            return (
              <div key={d} className={"pl-day" + (c.on ? " on" : "")}>
                <button className="pl-day-head" aria-pressed={!!c.on} onClick={() => setDay(d, { on: !c.on })}>{SHORT[d]}</button>
                {c.on ? (<>
                  <input type="time" value={c.from || "16:00"} onChange={(e) => setDay(d, { from: e.target.value })} aria-label={`${DAY_NAMES[d]} from`} />
                  <input type="time" value={c.to || "20:00"} onChange={(e) => setDay(d, { to: e.target.value })} aria-label={`${DAY_NAMES[d]} until`} />
                </>) : <span className="small muted pl-off">Not free</span>}
              </div>
            );
          })}
        </div>
        <div className="pl-file">
          <span className="small muted">No Google? Choose a calendar file (.ics) exported from Apple, Outlook or Google, and the plan keeps clear of what is in it. It is read on this device and not uploaded.</span>
          <div className="dl-row" style={{ justifyContent: "flex-start" }}>
            <button className="btn ghost small" onClick={() => file.current?.click()}>Choose a calendar file</button>
            {fileBusy.length > 0 && <button className="btn quiet small" onClick={() => { setFileBusyRaw([]); save(BUSY_KEY, []); setNote("Calendar file forgotten."); }}>Forget it ({fileBusy.length} events)</button>}
            <input ref={file} type="file" accept=".ics,text/calendar" hidden onChange={onFile} />
          </div>
          {note && <span className="small">{note}</span>}
        </div>
      </div>

      <div className="card card-pad stack">
        <div className="spread"><h3 style={{ margin: 0 }}>Your week</h3>
          {plan.length > 0 && <button className="btn ghost small" onClick={download}>Download .ics</button>}
        </div>
        {plan.length === 0 && <p className="small muted">Nothing fits yet. Turn on some days above, or give them a window longer than one session.</p>}
        <WeekView plan={plan} busy={busy} prefs={prefs} now={now} />
        <div className="wk-key"><span><i className="k-free" /> Free</span><span><i className="k-busy" /> Already booked</span><span><i className="k-sess" /> Study session</span></div>
        <div className="pl-plan">
          {plan.map((s) => {
            const d = new Date(s.start);
            return (
              <div key={s.start} className="pl-session">
                <div className="pl-date"><b>{d.getDate()}</b><span>{d.toLocaleDateString([], { month: "short" })}</span></div>
                <div className="pl-info">
                  <b>{s.topic ? s.topic : "Mixed review"}</b>
                  <span className="muted">{d.toLocaleDateString([], { weekday: "long" })}, {hm(s.start)} to {hm(s.end)}</span>
                  <span className="small muted">{s.reason}</span>
                </div>
                <div className="pl-act">
                  {s.topic && <button className="btn small quiet" onClick={() => { setTopic?.(s.topic); go("quiz"); }}>Start now</button>}
                  <a className="btn small ghost" href={googleLink(s)} target="_blank" rel="noreferrer">Add to Google</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Progress({ stats, go, setTopic, page, auth }) {
  const log = useLog();
  const summary = useMemo(() => summarise(log), [log]);
  const tab = page === "planner" ? "planner" : "report";
  return (
    <div className="page fade rp-page">
      <PageHead title={tab === "planner" ? "Study planner" : "Your report"} sub={tab === "planner" ? "A week of study sessions, placed in the time you are free, with the weak topics first." : "What you have been doing, where you are strong and where to spend your time."} />
      <div className="hf-switch" role="tablist">
        <button role="tab" className={tab === "report" ? "on" : ""} onClick={() => go("report")}>Report</button>
        <button role="tab" className={tab === "planner" ? "on" : ""} onClick={() => go("planner")}>Planner</button>
      </div>
      {tab === "planner" ? <Planner summary={summary} go={go} setTopic={setTopic} user={auth?.user} /> : <Report stats={stats} go={go} setTopic={setTopic} log={log} summary={summary} />}
    </div>
  );
}
