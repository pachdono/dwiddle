import { useEffect, useMemo, useRef, useState } from "react";
import { PageHead } from "./ui.jsx";
import { load, save } from "./store.js";
import { readLog } from "./studylog.js";
import { summarise, advice, planWeek, defaultPrefs, DAY_NAMES, googleLink, makeIcs, parseIcsBusy } from "./insights.js";
import { levelOf } from "./xp.js";

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
function Bar({ label, value, total, sub }) {
  return (
    <div className="rp-row">
      <span className="rp-label">{label}</span>
      <span className="rp-track"><i className={tone(value)} style={{ width: `${value ?? 0}%` }} /></span>
      <b className="rp-val">{value == null ? "-" : value + "%"}</b>
      <span className="small muted rp-n">{sub || `${total} answered`}</span>
    </div>
  );
}

function Report({ stats, go, setTopic, log, summary }) {
  const lv = levelOf(stats?.xp || 0);
  // material answered before the log existed still has its topic totals
  const topics = summary.topics.length ? summary.topics : Object.entries(stats?.byTopic || {}).map(([name, v]) => ({ name, total: v.total, accuracy: v.total ? Math.round((v.right / v.total) * 100) : null })).sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));
  const days = summary.days.slice(-14);
  const maxDay = Math.max(1, ...days.map((d) => d.answered));
  const hours = summary.byHour;
  const tips = advice(summary);
  return (
    <div className="rp stack">
      <div className="rp-tiles">
        <div><b>{stats?.answered ?? 0}</b><span>questions answered</span></div>
        <div><b>{stats?.answered ? Math.round((stats.correct / stats.answered) * 100) + "%" : "-"}</b><span>right overall</span></div>
        <div><b>{summary.daysThisWeek}<small>/7</small></b><span>days studied this week</span></div>
        <div><b>{summary.minutesThisWeek}<small> min</small></b><span>studied this week</span></div>
        <div><b>Level {lv.level}</b><span>{stats?.xp || 0} XP</span></div>
      </div>

      <div className="card card-pad">
        <h3>What to do next</h3>
        {tips.map((t) => <div key={t.id} className={"rp-tip " + t.tone}><b>{t.title}</b><span>{t.text}</span></div>)}
        {summary.weak.length > 0 && (
          <div className="dl-row" style={{ justifyContent: "flex-start", marginTop: 10 }}>
            {summary.weak.slice(0, 3).map((t) => <button key={t.name} className="btn" onClick={() => { setTopic?.(t.name); go("quiz"); }}>Practise {t.name}</button>)}
          </div>
        )}
      </div>

      <div className="card card-pad">
        <h3>How you do on each topic</h3>
        {topics.length === 0 ? <p className="small muted">Answer some questions and your topics appear here.</p> : topics.map((t) => <Bar key={t.name} label={t.name} value={t.accuracy} total={t.total} sub={`${t.total} answered${t.recent != null ? `, lately ${t.recent}%` : ""}`} />)}
      </div>

      {summary.kinds.length > 0 && (
        <div className="card card-pad">
          <h3>By kind of question</h3>
          <p className="small muted">Picking an answer is easier than recalling it. The gap between the two shows how well you really know it.</p>
          {summary.kinds.map((k) => <Bar key={k.kind} label={KIND_NAME[k.kind] || k.kind} value={k.accuracy} total={k.total} />)}
        </div>
      )}

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
        </div>
      )}

      {summary.total >= 20 && (
        <div className="card card-pad">
          <h3>When you do best</h3>
          <div className="rp-hours" role="img" aria-label="Accuracy by hour of the day">
            {hours.map((h, i) => (
              <span key={i} className="rp-hour" title={`${String(i).padStart(2, "0")}:00, ${h.n} answered${h.n ? `, ${Math.round((h.r / h.n) * 100)}% right` : ""}`}>
                <i className={h.n >= 3 ? tone(Math.round((h.r / h.n) * 100)) : "none"} style={{ height: h.n >= 3 ? `${Math.max(8, (h.r / h.n) * 100)}%` : "6%" }} />
                <small>{i % 3 === 0 ? i : ""}</small>
              </span>
            ))}
          </div>
          <p className="small muted">Hour of the day, from your answers. Bars are shorter where you get less right; grey ones have too few answers to say.</p>
        </div>
      )}

      <div className="dl-row" style={{ justifyContent: "flex-start" }}>
        <button className="btn ghost" onClick={() => window.print()}>Print or save as PDF</button>
      </div>
    </div>
  );
}

const hm = (t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const dayLabel = (t) => new Date(t).toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });

function Planner({ summary, go, setTopic }) {
  const [prefs, setPrefsRaw] = useState(() => ({ ...defaultPrefs(), ...load(PREFS_KEY, {}) }));
  const [busy, setBusyRaw] = useState(() => load(BUSY_KEY, []));
  const [note, setNote] = useState("");
  const file = useRef(null);
  const setPrefs = (p) => { setPrefsRaw(p); save(PREFS_KEY, p); };
  const setDay = (d, patch) => setPrefs({ ...prefs, days: { ...prefs.days, [d]: { ...prefs.days[d], ...patch } } });
  const now = Date.now();
  const plan = useMemo(() => planWeek({ prefs, summary, busy: busy.filter(([, e]) => e > now), now }), [prefs, summary, busy]); // eslint-disable-line react-hooks/exhaustive-deps
  const tips = advice(summary).filter((t) => ["best", "burnout", "late", "days"].includes(t.id));
  const daysToExam = prefs.exam ? Math.ceil((new Date(prefs.exam).getTime() - now) / 864e5) : null;

  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const found = parseIcsBusy(text).filter(([, end]) => end > now && end < now + 40 * 864e5).slice(0, 600);
    setBusyRaw(found); save(BUSY_KEY, found);
    setNote(found.length ? `Read ${found.length} upcoming event${found.length === 1 ? "" : "s"}. The plan keeps clear of them.` : "No upcoming events were found in that file.");
    e.target.value = "";
  }

  function download() {
    const blob = new Blob([makeIcs(plan)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "dwiddle-study-plan.ics"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  return (
    <div className="rp stack">
      {tips.length > 0 && (
        <div className="card card-pad">
          <h3>What your results say about when to study</h3>
          {tips.map((t) => <div key={t.id} className={"rp-tip " + t.tone}><b>{t.title}</b><span>{t.text}</span></div>)}
        </div>
      )}

      <div className="card card-pad stack">
        <h3>How you like to study</h3>
        <div className="rp-form">
          <label>Time of day<select value={prefs.prefer} onChange={(e) => setPrefs({ ...prefs, prefer: e.target.value })}>
            <option value="auto">Choose from my results</option>
            {["07:00", "09:00", "12:00", "15:00", "17:00", "19:00", "20:30"].map((t) => <option key={t} value={t}>Around {t}</option>)}
          </select></label>
          <label>A session lasts<select value={prefs.sessionMin} onChange={(e) => setPrefs({ ...prefs, sessionMin: Number(e.target.value) })}>
            {[20, 25, 40, 50, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select></label>
          <label>Sessions a week<select value={prefs.perWeek} onChange={(e) => setPrefs({ ...prefs, perWeek: Number(e.target.value) })}>
            {[2, 3, 4, 5, 6, 7, 10].map((m) => <option key={m} value={m}>{m}</option>)}
          </select></label>
          <label>Exam or test date (optional)<input type="date" value={prefs.exam} onChange={(e) => setPrefs({ ...prefs, exam: e.target.value })} /></label>
        </div>
        {prefs.sessionMin > 50 && <p className="small muted">Long sessions wear you out. Forty minutes with a break after is better for most people.</p>}
        {daysToExam != null && daysToExam >= 0 && <p className="small">{daysToExam === 0 ? "Your exam is today." : `${daysToExam} day${daysToExam === 1 ? "" : "s"} to your exam.`} {daysToExam <= 14 && prefs.perWeek < 6 ? "That is close, so think about 6 or more sessions a week." : ""}</p>}
      </div>

      <div className="card card-pad stack">
        <h3>When you are free</h3>
        <p className="small muted">Switch off the days you cannot study and set the hours you can. Sessions are only placed inside these.</p>
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <div key={d} className="rp-free">
            <label className="sc-check"><input type="checkbox" checked={!!prefs.days[d]?.on} onChange={(e) => setDay(d, { on: e.target.checked })} /> {DAY_NAMES[d]}</label>
            <span className={prefs.days[d]?.on ? "" : "off"}>
              <input type="time" value={prefs.days[d]?.from || "16:00"} onChange={(e) => setDay(d, { from: e.target.value })} aria-label={`${DAY_NAMES[d]} from`} />
              <span className="muted"> to </span>
              <input type="time" value={prefs.days[d]?.to || "20:00"} onChange={(e) => setDay(d, { to: e.target.value })} aria-label={`${DAY_NAMES[d]} until`} />
            </span>
          </div>
        ))}
        <div className="rp-cal">
          <b>Keep clear of my calendar</b>
          <p className="small muted">In Google Calendar open Settings, then Import and export, then Export. Unzip it and choose the file here. It is read on this device and never uploaded. Apple and Outlook calendars export the same kind of file.</p>
          <div className="dl-row" style={{ justifyContent: "flex-start" }}>
            <button className="btn ghost" onClick={() => file.current?.click()}>Choose a calendar file</button>
            {busy.length > 0 && <button className="btn quiet" onClick={() => { setBusyRaw([]); save(BUSY_KEY, []); setNote("Calendar cleared."); }}>Forget it ({busy.length} events)</button>}
            <input ref={file} type="file" accept=".ics,text/calendar" hidden onChange={onFile} />
          </div>
          {note && <p className="small">{note}</p>}
        </div>
      </div>

      <div className="card card-pad stack">
        <div className="spread"><h3 style={{ margin: 0 }}>Your week</h3>
          {plan.length > 0 && <button className="btn" onClick={download}>Add all to my calendar (.ics)</button>}
        </div>
        {plan.length === 0 && <p className="small muted">Nothing fits yet. Turn on some days above, or give each a longer window than one session.</p>}
        {plan.map((s) => (
          <div key={s.start} className="rp-session">
            <div><b>{dayLabel(s.start)}</b><span className="muted"> {hm(s.start)} to {hm(s.end)}</span></div>
            <div>{s.topic ? <>Study <b>{s.topic}</b></> : "A mixed review"}<span className="small muted"> · {s.reason}</span></div>
            <div className="dl-row" style={{ justifyContent: "flex-start" }}>
              <a className="btn small ghost" href={googleLink(s)} target="_blank" rel="noreferrer">Add to Google Calendar</a>
              {s.topic && <button className="btn small quiet" onClick={() => { setTopic?.(s.topic); go("quiz"); }}>Start it now</button>}
            </div>
          </div>
        ))}
        <p className="small muted">The .ics file opens in Google Calendar, Apple Calendar and Outlook. A direct two way link to Google Calendar needs a Google sign-in set up for Dwiddle, which is not switched on yet.</p>
      </div>
    </div>
  );
}

export default function Progress({ stats, go, setTopic, page }) {
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
      {tab === "planner" ? <Planner summary={summary} go={go} setTopic={setTopic} /> : <Report stats={stats} go={go} setTopic={setTopic} log={log} summary={summary} />}
    </div>
  );
}
