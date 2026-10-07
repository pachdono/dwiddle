import { useEffect, useMemo, useRef, useState } from "react";
import { PageHead } from "./ui.jsx";
import { load, save } from "./store.js";
import { readLog } from "./studylog.js";
import { summarise, advice, bestWindow, topicMastery, predictGrade, STATUS_LABEL, planWeek, suggestPrefs, GOALS, defaultPrefs, DAY_NAMES, googleLink, makeIcs, parseIcsBusy } from "./insights.js";
import { levelOf } from "./xp.js";
import { gcalAvailable, connected, connect, disconnect, busyTimes, syncPlan } from "./gcal.js";
import { isDesktop } from "./desktop.js";
import { getFeed, pushSessions, replaceFeed, feedLinks } from "./calfeed.js";

// The report and the planner, one page with two tabs. Everything here is worked
// out on this device from the answers already given; nothing is sent anywhere.

const KIND_NAME = { mc: "Multiple choice", blank: "Fill in the blank", word: "Complete the word", finish: "In your own words", long: "Long answer", written: "In your own words", tf: "True or false", match: "Matching", order: "Putting in order" };
const PREFS_KEY = "dwiddle-plan-prefs";
const BUSY_KEY = "dwiddle-busy";

function useLog() {
  const [log, setLog] = useState(readLog);
  useEffect(() => { const f = () => setLog(readLog()); addEventListener("dwiddle:log", f); return () => removeEventListener("dwiddle:log", f); }, []);
  return log;
}

const tone = (a) => (a == null ? "" : a >= 80 ? "good" : a >= 60 ? "mid" : "low");

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

const ago = (d) => (d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`);

function Meter({ value, label }) {
  return (
    <div className="rt-meter" aria-label={`${label} ${value}%`}>
      <span className="rp-track"><i className={tone(value)} style={{ width: `${value}%` }} /></span>
      <b>{value}%</b>
    </div>
  );
}

// Every topic with how well it is known (skill) and how much of it is likely
// still remembered today (memory), weakest first, with a way to practise it.
function TopicTable({ rows, go, setTopic }) {
  if (!rows.length) return <p className="small muted">Answer some questions and each topic shows up here with a skill and a memory score.</p>;
  return (
    <div className="rt" role="table" aria-label="Skill and memory for each topic">
      <div className="rt-head" role="row"><span>Topic</span><span>Skill</span><span>Memory</span><span className="rt-when">Last practised</span><span /></div>
      {rows.map((t) => (
        <div key={t.name} className="rt-row" role="row">
          <div className="rt-name"><b>{t.name}</b><span className={"rp-badge " + (t.status === "strong" ? "good" : t.status === "solid" ? "mid" : t.status === "early" ? "" : "low")}>{STATUS_LABEL[t.status]}</span></div>
          <Meter value={t.skill} label="Skill" />
          <Meter value={t.memory} label="Memory" />
          <span className="rt-when small muted">{t.last ? ago(t.days) : ""}{t.trend != null && t.trend !== 0 ? <i className={"rt-trend " + (t.trend > 0 ? "up" : "down")}>{t.trend > 0 ? "up" : "down"} {Math.abs(t.trend)}</i> : null}</span>
          <button className="btn small ghost" onClick={() => { setTopic?.(t.name); go("quiz"); }}>{t.status === "strong" ? "Keep fresh" : "Practise"}</button>
        </div>
      ))}
    </div>
  );
}

function Report({ stats, go, setTopic, log, summary }) {
  const lv = levelOf(stats?.xp || 0);
  const rows = useMemo(() => topicMastery(log), [log]);
  const fallback = !rows.length && stats?.byTopic ? Object.entries(stats.byTopic).filter(([, v]) => v.total).map(([name, v]) => { const a = Math.round((v.right / v.total) * 100); return { name, total: v.total, skill: a, memory: a, days: 0, last: 0, trend: null, status: v.total < 4 ? "early" : a >= 80 ? "strong" : a >= 60 ? "solid" : "weak" }; }).sort((a, b) => a.memory - b.memory) : [];
  const table = rows.length ? rows : fallback;
  const predicted = predictGrade(table);
  const days = summary.days.slice(-14);
  const maxDay = Math.max(1, ...days.map((d) => d.answered));
  const tips = advice(summary);
  const acc = stats?.answered ? Math.round((stats.correct / stats.answered) * 100) : summary.accuracy;
  const skillAll = table.length ? Math.round(table.reduce((s, t) => s + t.skill * Math.min(t.total, 10), 0) / table.reduce((s, t) => s + Math.min(t.total, 10), 0)) : null;
  const win = bestWindow(summary);
  const due = table.filter((t) => t.status === "fading" || t.status === "weak").slice(0, 3);
  return (
    <div className="rp stack">
      <div className="rp-hero rp-grade">
        <div className="rg-grade">
          <span className="rg-label">Predicted grade</span>
          {predicted ? (<>
            <b className="rg-big">{predicted.grade}</b>
            <span className="rg-range">{predicted.gradeLo === predicted.gradeHi ? `${predicted.gradeLo}` : `${predicted.gradeLo} to ${predicted.gradeHi}`} possible, {predicted.sure}</span>
          </>) : (<><b className="rg-big dim">-</b><span className="rg-range">Answer about 10 questions to get one</span></>)}
        </div>
        <div className="rp-hero-ring"><Ring value={predicted ? predicted.score : null} size={104} label="memory" /><span>Memory</span><small>what you would remember today</small></div>
        <div className="rp-hero-ring"><Ring value={skillAll} size={104} label="skill" /><span>Skill</span><small>how well you know it</small></div>
        <div className="rp-hero-stats">
          <div><b>{Math.max(stats?.answered || 0, summary.total)}</b><span>questions answered</span></div>
          <div><b>{acc == null ? "-" : acc}<small>%</small></b><span>right overall</span></div>
          <div><b>{summary.daysThisWeek}<small>/7</small></b><span>days studied this week</span></div>
          <div><b>{summary.minutesThisWeek}<small> min</small></b><span>studied this week</span></div>
        </div>
      </div>
      {predicted && <p className="small muted rp-foot" style={{ margin: "-6px 4px 0" }}>The grade is a rough guide worked out from your practice answers, weighted towards recent ones, and it drops for topics you have not practised in a while. Real papers differ, so treat it as a direction, not a promise.</p>}

      <div className="card card-pad">
        <div className="spread"><h3 style={{ margin: 0 }}>Skill and memory by topic</h3><span className="small muted">Weakest first</span></div>
        <TopicTable rows={table} go={go} setTopic={setTopic} />
      </div>

      <div className="card card-pad">
        <h3>What to do next</h3>
        {due.length > 0 && <p className="rn-lead">Start with <b>{due.map((t) => t.name).join(", ")}</b>. {due.some((t) => t.status === "fading") ? "Some of it is fading from memory, and a short review brings it back fast." : "These are the topics holding your grade down."}</p>}
        <ul className="rn">
          {tips.map((t) => <li key={t.id} className={t.tone}><b>{t.title}</b><span>{t.text}</span></li>)}
        </ul>
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
  { id: "evenings", label: "Evenings", set: () => ({ on: true, from: "18:00", to: "22:00" }) },
  { id: "nights", label: "Night owl", set: () => ({ on: true, from: "20:00", to: "23:59" }) },
  { id: "weekends", label: "Weekends only", set: (d) => (d === 0 || d === 6 ? { on: true, from: "10:00", to: "17:00" } : { on: false }) },
  { id: "all", label: "Every day", set: () => ({ on: true, from: "09:00", to: "20:00" }) },
  { id: "allday", label: "All day, every day", set: () => ({ on: true, from: "08:00", to: "23:00" }) },
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
        <p className="small muted">Add your Dwiddle calendar once and your study sessions appear in it and change as your plan changes. No sign in with Google, no warnings. Calendars refresh on their own every few hours. A subscribed calendar is read only, so to move a session change your free hours here, press Skip on it, or use <b>Add to Google</b> on a session for a copy you can edit.</p>
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

function FreeWeek({ prefs, setDay }) {
  return (
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
  );
}

// The first thing the planner asks: a short form about the goal, what to focus
// on, when to study and when you are free. With answers to learn from it uses
// them; without, it makes a careful estimate that will not wear anyone out.
function PlanWizard({ prefs, setPrefs, setDay, applyPreset, summary, topicNames, now, onDone, onCancel, calendar }) {
  const win = bestWindow(summary);
  const [step, setStep] = useState(0);
  const [d, setD] = useState(() => ({
    goal: prefs.goal || "school", exam: prefs.exam || "", focus: prefs.focus || [],
    prefer: prefs.setup ? prefs.prefer : (win ? "auto" : "16:30"), sessionMin: prefs.sessionMin || 40, perWeek: prefs.perWeek || 4,
  }));
  const [touched, setTouched] = useState(false);
  const [extra, setExtra] = useState("");
  const est = useMemo(() => suggestPrefs({ goal: d.goal, exam: d.exam, summary, now, subjects: d.focus.length }), [d.goal, d.exam, summary, now, d.focus.length]);
  const crash = est.crash;
  // the estimate follows the goal until the person sets the numbers themselves
  useEffect(() => { if (!touched) setD((x) => ({ ...x, perWeek: est.perWeek, sessionMin: est.sessionMin })); }, [est.perWeek, est.sessionMin, touched]);
  const draft = { ...prefs, ...d, setup: true };
  const preview = useMemo(() => planWeek({ prefs: draft, summary, busy: [], now, topicNames }), [d, prefs.days, summary, now, topicNames.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const steps = ["Goal", "Focus", "Your time", "When you are free", "Your plan"];
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const toggleFocus = (n) => set({ focus: d.focus.includes(n) ? d.focus.filter((x) => x !== n) : [...d.focus, n].slice(0, 12) });
  const addExtra = () => { const n = extra.trim().slice(0, 60); if (n && !d.focus.includes(n)) set({ focus: [...d.focus, n].slice(0, 12) }); setExtra(""); };
  const TIMES = [["07:30", "Morning", "before school or work"], ["16:30", "After school", "just after the day ends"], ["18:30", "Evening", "after dinner"], ["20:30", "Late evening", "once everything else is done"], ["22:00", "Night", "I study late"]];
  const LENGTHS = crash ? [45, 60, 90, 120] : [25, 35, 45, 60];
  const COUNTS = crash ? [3, 4, 6, 9] : [2, 3, 4, 5, 6, 8];
  const next = () => (step < steps.length - 1 ? setStep(step + 1) : onDone({ ...d, setup: true }));
  return (
    <div className="card card-pad stack pw">
      <div className="pw-steps" aria-label="Steps">{steps.map((l, i) => <button key={l} className={i === step ? "on" : i < step ? "past" : ""} onClick={() => i <= step && setStep(i)} disabled={i > step}><i>{i + 1}</i><span>{l}</span></button>)}</div>

      {step === 0 && (<>
        <h3>What are you aiming for?</h3>
        <div className="pw-cards">{GOALS.map((g) => <button key={g.id} className={"pw-card" + (d.goal === g.id ? " on" : "")} onClick={() => set({ goal: g.id })}><b>{g.label}</b><span className="small muted">{g.hint}</span></button>)}</div>
        {d.goal === "exam" && <label className="pw-field">When is it? <input type="date" value={d.exam} onChange={(e) => set({ exam: e.target.value })} /><span className="small muted">If you are not sure, leave it empty.</span></label>}
      </>)}

      {step === 1 && (<>
        <h3>What do you need to cover?</h3>
        <p className="small muted">Pick every topic or subject you need, as many as you like, and add any that are not listed (another subject, a paper, a chapter). They come first and take turns. Leave it empty to cover everything evenly, with the weak ones first once you have answered some questions.</p>
        <div className="pw-chips">{[...topicNames, ...d.focus.filter((n) => !topicNames.includes(n))].map((n) => <button key={n} className={"pl-chip" + (d.focus.includes(n) ? " on" : "")} onClick={() => toggleFocus(n)}>{n}</button>)}</div>
        <form className="pw-add" onSubmit={(e) => { e.preventDefault(); addExtra(); }}>
          <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Add a subject or topic, e.g. French, Maths paper 2" maxLength={60} aria-label="Add a subject or topic" />
          <button className="btn ghost" type="submit" disabled={!extra.trim()}>Add</button>
        </form>
        <p className="small muted">{summary.total >= 10 ? `Your ${summary.total} answers so far will be used to find your weak spots.` : "You have not answered many questions yet, so the plan starts from an estimate and adjusts as you practise."}</p>
      </>)}

      {step === 2 && (<>
        <h3>When do you like to study?</h3>
        <div className="pw-cards small">{win && <button className={"pw-card" + (d.prefer === "auto" ? " on" : "")} onClick={() => set({ prefer: "auto" })}><b>When I do best</b><span className="small muted">Around {String(win.hour).padStart(2, "0")}:00, from my answers</span></button>}
          {TIMES.map(([t, l, h]) => <button key={t} className={"pw-card" + (d.prefer === t ? " on" : "")} onClick={() => set({ prefer: t })}><b>{l}</b><span className="small muted">{h}</span></button>)}</div>
        <div className="pw-two">
          <div><span className="pl-k">How long can you focus?</span>
            <div className="seg tight">{LENGTHS.map((m) => <button key={m} className={d.sessionMin === m ? "on" : ""} onClick={() => { setTouched(true); set({ sessionMin: m }); }}>{m} min</button>)}</div>
            <span className="small muted">{crash ? "Your exam is close, so long sessions are fine. Take a short break between them." : d.sessionMin >= 60 ? "An hour is plenty in one go. Take a break after." : "Short sessions you finish beat long ones you do not."}</span></div>
          <div><span className="pl-k">{crash ? "Sessions before the exam" : "Sessions a week"}</span>
            <div className="seg tight">{COUNTS.map((m) => <button key={m} className={d.perWeek === m ? "on" : ""} onClick={() => { setTouched(true); set({ perWeek: m }); }}>{m}</button>)}</div>
            <span className="small muted">Suggested: {est.perWeek}.{crash ? "" : " A rest day is kept free."}</span></div>
        </div>
      </>)}

      {step === 3 && (<>
        <h3>When are you free?</h3>
        <p className="small muted">{crash ? "Your exam is close, so give it as many hours as you can, nights included. Sessions are only placed inside these." : "Switch off the days you cannot study and set the hours you can, late nights included if that is when you work. Sessions are only placed inside these."}</p>
        <div className="pw-chips">{PRESETS.map((pr) => <button key={pr.id} className="pl-chip" onClick={() => applyPreset(pr)}>{pr.label}</button>)}</div>
        <FreeWeek prefs={prefs} setDay={setDay} />
        {calendar}
      </>)}

      {step === 4 && (<>
        <h3>Your plan</h3>
        <div className="pw-why">{est.why.map((w, i) => <p key={i} className="small">{w}</p>)}</div>
        {preview.length === 0
          ? <p className="small warn-text">Nothing fits yet. Go back and give the days you are free a longer window.</p>
          : <div className="pw-list">{preview.map((x) => <div key={x.start}><b>{new Date(x.start).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}</b> <span className="muted">{hm(x.start)} to {hm(x.end)}</span> <span>{x.topic || "Mixed review"}</span></div>)}</div>}
      </>)}

      <div className="dl-row pw-act">
        {onCancel && step === 0 && <button className="btn quiet" onClick={onCancel}>Cancel</button>}
        {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button>}
        <button className="btn cta" onClick={next} disabled={step === 4 && preview.length === 0}>{step === steps.length - 1 ? "Make my plan" : "Next"}</button>
      </div>
    </div>
  );
}

function Planner({ summary, go, setTopic, user, topicNames = [] }) {
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
  const [skipped, setSkipped] = useState(() => load("dwiddle-skipped", []));
  const skip = (t) => { const n = [...skipped, t].slice(-60); setSkipped(n); save("dwiddle-skipped", n); };
  const plan = useMemo(() => planWeek({ prefs, summary, busy, now, topicNames }).filter((x) => !skipped.includes(x.start)), [prefs, summary, busy, now, skipped, topicNames.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const tips = advice(summary).filter((t) => ["best", "burnout", "late", "days"].includes(t.id));
  const daysToExam = prefs.exam ? Math.ceil((new Date(prefs.exam).getTime() - now) / 864e5) : null;

  const [addr, setAddr] = useState(() => load("dwiddle-ical-url", ""));
  async function useAddress(url = addr, quiet = false) {
    if (!url.trim()) return;
    try {
      const r = await fetch("/api/models?ics=1", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "The calendar could not be read.");
      const found = parseIcsBusy(d.ics, Date.now(), Date.now() + 9 * 864e5).slice(0, 600);
      setFileBusyRaw(found); save(BUSY_KEY, found); save("dwiddle-ical-url", url.trim());
      if (!quiet) setNote(`Read your calendar: ${found.length} booked time${found.length === 1 ? "" : "s"} this week. The plan keeps clear of them.`);
    } catch (e) { if (!quiet) setNote(e.message); }
  }
  // the saved address is read again each visit, so the plan follows the calendar
  useEffect(() => { if (addr) useAddress(addr, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const found = parseIcsBusy(await f.text(), Date.now(), Date.now() + 9 * 864e5).slice(0, 600);
    setFileBusyRaw(found); save(BUSY_KEY, found);
    setNote(found.length ? `Read ${found.length} booked time${found.length === 1 ? "" : "s"}. The plan keeps clear of them.` : "No upcoming events were found in that file.");
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

  const [editing, setEditing] = useState(false);
  const calBlock = (
    <div className="pl-file">
          <b className="small">Keep clear of what is already in my calendar</b>
          <span className="small muted">Paste your calendar's secret address and the plan avoids your lessons and other events, including ones that repeat. In Google Calendar: Settings, then your calendar, then Integrate calendar, then <i>Secret address in iCal format</i>. Keep it private. It is only used to read when you are busy and is saved on this device.</span>
          <div className="dl-row" style={{ justifyContent: "flex-start", flexWrap: "nowrap" }}>
            <input className="pl-addr" type="url" placeholder="https://calendar.google.com/calendar/ical/..." value={addr} onChange={(e) => setAddr(e.target.value)} aria-label="Secret calendar address" />
            <button className="btn small" onClick={() => useAddress()} disabled={!addr.trim()}>Use it</button>
            {addr && <button className="btn quiet small" onClick={() => { setAddr(""); save("dwiddle-ical-url", ""); setFileBusyRaw([]); save(BUSY_KEY, []); setNote("Calendar forgotten."); }}>Forget</button>}
          </div>
          <span className="small muted">Or choose a calendar file (.ics) instead, which is read on this device and not uploaded.</span>
          <div className="dl-row" style={{ justifyContent: "flex-start" }}>
            <button className="btn ghost small" onClick={() => file.current?.click()}>Choose a calendar file</button>
            {fileBusy.length > 0 && <button className="btn quiet small" onClick={() => { setFileBusyRaw([]); save(BUSY_KEY, []); setNote("Calendar file forgotten."); }}>Forget it ({fileBusy.length} events)</button>}
            <input ref={file} type="file" accept=".ics,text/calendar" hidden onChange={onFile} />
          </div>
          {note && <span className="small">{note}</span>}
        </div>
  );

  if (!prefs.setup || editing) {
    return (
      <div className="rp stack pl">
        <PlanWizard prefs={prefs} setPrefs={setPrefs} setDay={setDay} applyPreset={applyPreset} summary={summary} topicNames={topicNames} now={now}
          onDone={(d) => { setPrefs({ ...prefs, ...d }); setEditing(false); }} onCancel={prefs.setup ? () => setEditing(false) : null} calendar={calBlock} />
      </div>
    );
  }

  return (
    <div className="rp stack pl">
      <div className="card card-pad spread"><div><b>Your plan is set up</b><p className="small muted" style={{ margin: "2px 0 0" }}>{(GOALS.find((g) => g.id === prefs.goal) || GOALS[1]).label}, {prefs.perWeek} sessions of {prefs.sessionMin} minutes{daysToExam != null && daysToExam <= 3 ? " before your exam" : " a week"}.</p></div><button className="btn ghost" onClick={() => setEditing(true)}>Change my answers</button></div>
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
          <ul className="rn">{tips.map((t) => <li key={t.id} className={t.tone}><b>{t.title}</b><span>{t.text}</span></li>)}</ul>
        </div>
      )}

      <div className="card card-pad stack">
        <h3>How you like to study</h3>
        <div className="pl-prefs">
          <div><span className="pl-k">Best time of day</span>
            <select value={prefs.prefer} onChange={(e) => setPrefs({ ...prefs, prefer: e.target.value })}>
              <option value="auto">Pick from my results</option>
              {["07:00", "09:00", "12:00", "15:00", "17:00", "19:00", "20:30", "22:00"].map((t) => <option key={t} value={t}>Around {t}</option>)}
            </select></div>
          <div><span className="pl-k">Session length</span><Seg label="Session length" value={prefs.sessionMin} onChange={(v) => setPrefs({ ...prefs, sessionMin: v })} options={[[25, "25 min"], [40, "40 min"], [60, "60 min"], [90, "90 min"], [120, "2 hours"]]} /></div>
          <div><span className="pl-k">Sessions a week</span><Seg label="Sessions a week" value={prefs.perWeek} onChange={(v) => setPrefs({ ...prefs, perWeek: v })} options={[[3, "3"], [4, "4"], [5, "5"], [7, "7"], [10, "10"]]} /></div>
          <div><span className="pl-k">Exam or test date</span><input type="date" value={prefs.exam} onChange={(e) => setPrefs({ ...prefs, exam: e.target.value })} /></div>
        </div>
        {daysToExam != null && daysToExam >= 0 && <p className="small">{daysToExam === 0 ? "Your exam is today." : `${daysToExam} day${daysToExam === 1 ? "" : "s"} to your exam.`}{daysToExam <= 14 && prefs.perWeek < 6 ? " That is close, so think about 6 or more sessions a week." : ""}</p>}
      </div>

      <div className="card card-pad stack">
        <div className="spread"><h3 style={{ margin: 0 }}>When you are free</h3>
          <div className="pl-presets">{PRESETS.map((pr) => <button key={pr.id} className="pl-chip" onClick={() => applyPreset(pr)}>{pr.label}</button>)}</div>
        </div>
        <FreeWeek prefs={prefs} setDay={setDay} />
        {calBlock}
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
                  <button className="btn small quiet" onClick={() => skip(s.start)}>Skip</button>
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

export default function Progress({ stats, go, setTopic, page, auth, topics = [] }) {
  const topicNames = useMemo(() => [...new Set(topics.map((t) => t.name))], [topics]);
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
      {tab === "planner" ? <Planner summary={summary} go={go} setTopic={setTopic} user={auth?.user} topicNames={topicNames} /> : <Report stats={stats} go={go} setTopic={setTopic} log={log} summary={summary} />}
    </div>
  );
}
