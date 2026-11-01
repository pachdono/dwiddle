// Study time: a timer started from Home that keeps going anywhere in the app.
//
// While it runs, a banner across the top of the screen shows the time left,
// with pause and stop. The × tucks it away into a small chip, and the timer
// carries on. When the time is up a pop-up says so, adds the minutes to
// today's total, and offers a short break or another round, the way a
// Pomodoro timer works. It is kept on the device, so it survives a reload.

import { useEffect, useState } from "react";
import { Icon, Portal } from "./ui.jsx";
import { Duck, DuckMark } from "./Duck.jsx";
import { playCue } from "./voice.js";
import { save } from "./store.js";

const KEY = "dwiddle-study-timer";
const LOG = "dwiddle-study-log";
const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

// { kind: "study" | "break", start, seconds, paused (time it was paused), away (ms spent paused), hidden, done }
// (Timers from before seconds were stored in minutes.)
let timer = read(KEY, null);
const listeners = new Set();
function set(next) { timer = next; write(KEY, next); listeners.forEach((f) => f(next)); }

const today = () => new Date().toISOString().slice(0, 10);
const minutesToday = () => read(LOG, {})[today()] || 0;
function logMinutes(m) { const log = read(LOG, {}); log[today()] = (log[today()] || 0) + m; save(LOG, log); }

const spent = (t, now = Date.now()) => (t.paused || now) - t.start - (t.away || 0);
const total = (t) => (t.seconds ?? t.minutes * 60) * 1000;
const leftOf = (t, now) => Math.max(0, total(t) - spent(t, now));
const clock = (ms) => {
  const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`;
};
// "1 hour 20 minutes", "25 minutes", "45 seconds"
const say = (sec) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const part = (n, w) => (n ? `${n} ${w}${n === 1 ? "" : "s"}` : "");
  return [part(h, "hour"), part(m, "minute"), h ? "" : part(s, "second")].filter(Boolean).join(" ") || "0 seconds";
};

function startTimer(seconds, kind = "study") { if (seconds > 0) set({ kind, start: Date.now(), seconds, paused: 0, away: 0, hidden: false, done: false }); }
function pauseTimer() { if (timer && !timer.paused) set({ ...timer, paused: Date.now() }); }
function resumeTimer() { if (timer?.paused) set({ ...timer, away: (timer.away || 0) + Date.now() - timer.paused, paused: 0 }); }
function stopTimer() {
  // Stopping early still counts what was studied.
  if (timer?.kind === "study" && !timer.done) { const m = Math.floor(spent(timer) / 60000); if (m > 0) logMinutes(m); }
  set(null);
}
const hideTimer = (hidden) => timer && set({ ...timer, hidden });

function useStudyTimer() {
  const [t, setT] = useState(timer);
  const [, tick] = useState(0);
  useEffect(() => { listeners.add(setT); return () => { listeners.delete(setT); }; }, []);
  useEffect(() => {
    if (!t || t.paused || t.done) return;
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [t]);
  return t;
}

// The length, as hours : minutes : seconds, each typed or nudged with the
// arrows. Kept for next time.
function TimePicker({ value, onChange }) {
  const h = Math.floor(value / 3600), m = Math.floor((value % 3600) / 60), sec = value % 60;
  // The arrows move an hour, five minutes or fifteen seconds at a time.
  const nudge = (which, d) => put(h + (which === 0 ? d : 0), m + (which === 1 ? 5 * d : 0), sec + (which === 2 ? 15 * d : 0));
  const put = (nh, nm, ns) => onChange(Math.max(0, Math.min(23, nh)) * 3600 + Math.max(0, Math.min(59, nm)) * 60 + Math.max(0, Math.min(59, ns)));
  const field = (v, which, label) => (
    <div className="st-seg">
      <button type="button" className="st-nudge" aria-label={`More ${label}`} onClick={() => nudge(which, 1)}>▲</button>
      <input inputMode="numeric" aria-label={label} value={String(v).padStart(2, "0")}
        onFocus={(e) => e.target.select()}
        onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "").slice(-2)) || 0; put(which === 0 ? n : h, which === 1 ? n : m, which === 2 ? n : sec); }}
        onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); const d = e.key === "ArrowUp" ? 1 : -1; put(h + (which === 0) * d, m + (which === 1) * d, sec + (which === 2) * d); } }} />
      <button type="button" className="st-nudge" aria-label={`Fewer ${label}`} onClick={() => nudge(which, -1)}>▼</button>
      <small aria-hidden="true">{label}</small>
    </div>
  );
  return (
    <div className="st-picker">
      {field(h, 0, "hours")}<span className="st-colon">:</span>{field(m, 1, "minutes")}<span className="st-colon">:</span>{field(sec, 2, "seconds")}
    </div>
  );
}

// The card on Home: set a length and start, or see the one running.
export function StudyTimerCard() {
  const t = useStudyTimer();
  const [secs, setSecsRaw] = useState(() => { const v = read("dwiddle-study-length", 25); return v > 300 ? v : v * 60; }); // older: minutes
  const setSecs = (v) => { setSecsRaw(v); write("dwiddle-study-length", v); };
  if (t && !t.done) {
    const left = leftOf(t), frac = 1 - left / total(t);
    return (
      <div className="card card-pad st-card on">
        <Ring frac={frac} kind={t.kind}><b className={left >= 3600000 ? "long" : ""}>{clock(left)}</b><span>{t.kind === "break" ? "break" : "left"}</span></Ring>
        <div className="st-card-main">
          <b>{t.kind === "break" ? "On a break" : t.paused ? "Paused" : "Studying"}</b>
          <div className="row" style={{ marginTop: 10 }}>
            {t.paused ? <button className="btn small" onClick={resumeTimer}>Resume</button> : <button className="btn ghost small" onClick={pauseTimer}>Pause</button>}
            <button className="btn ghost small" onClick={stopTimer}>Stop</button>
            {t.hidden && <button className="btn ghost small" onClick={() => hideTimer(false)}>Show the banner</button>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="card card-pad st-card">
      <div className="st-card-icon" aria-hidden="true"><DuckMark size={46} /></div>
      <b className="st-card-title">Study time</b>
      <TimePicker value={secs} onChange={setSecs} />
      <button className="btn cta st-start" disabled={!secs} onClick={() => startTimer(secs)}>Start</button>
    </div>
  );
}

function Ring({ frac, kind, children }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div className={"st-ring " + kind}>
      <svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r={r} className="bg" /><circle cx="36" cy="36" r={r} className="fg" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} /></svg>
      <div>{children}</div>
    </div>
  );
}

// The banner across the top while the timer runs, the chip when tucked
// away, and the pop-up when the time is up. Mounted once, in the app shell.
export function StudyBanner() {
  const t = useStudyTimer();
  const left = t ? leftOf(t) : 0;
  useEffect(() => {
    if (t && !t.done && !t.paused && left <= 0) {
      if (t.kind === "study") logMinutes(Math.round(total(t) / 60000));
      playCue("done-great");
      set({ ...t, done: true, hidden: false });
    }
  }, [t, left]);
  if (!t) return null;

  if (t.done) {
    const study = t.kind === "study";
    return (
      <Portal>
        <div className="st-done-scrim" role="dialog" aria-modal="true" aria-label={study ? "Study time is up" : "Break is over"}>
          <div className="st-done">
            <Duck size={96} outfit={study ? "party" : "graduate"} />
            <h2>{study ? "Time's up. Nice work!" : "Break's over"}</h2>
            <p className="muted">{study ? `You studied for ${say(total(t) / 1000)}. That's ${say(minutesToday() * 60)} today.` : "Ready for another round?"}</p>
            <div className="st-done-actions">
              {study
                ? <><button className="btn cta" onClick={() => startTimer(300, "break")}>5 minute break</button><button className="btn ghost" onClick={() => startTimer(total(t) / 1000)}>Go again</button></>
                : <button className="btn cta" onClick={() => { const v = read("dwiddle-study-length", 1500); startTimer(v > 300 ? v : v * 60); }}>Start studying</button>}
              <button className="btn ghost" onClick={() => set(null)}>Done</button>
            </div>
          </div>
        </div>
      </Portal>
    );
  }

  const frac = 1 - left / total(t);
  if (t.hidden) {
    return (
      <button className={"st-chip " + t.kind} onClick={() => hideTimer(false)} title="Show the study timer">
        <i style={{ "--f": frac }} />{clock(left)}{t.paused ? " · paused" : ""}
      </button>
    );
  }
  return (
    <div className={"st-banner " + t.kind + (t.paused ? " paused" : "")} role="timer" aria-live="off">
      <span className="st-banner-icon" aria-hidden="true">{t.kind === "break" ? "☕" : <DuckMark size={24} />}</span>
      <span className="st-banner-label">{t.kind === "break" ? "Break" : "Study time"}</span>
      <b className="st-banner-clock">{clock(left)}</b>
      <span className="st-banner-sub">{t.paused ? "paused" : "left"}</span>
      <span className="st-banner-grow" />
      {t.paused
        ? <button className="st-btn" onClick={resumeTimer} aria-label="Resume">▶</button>
        : <button className="st-btn" onClick={pauseTimer} aria-label="Pause">❚❚</button>}
      <button className="st-btn" onClick={stopTimer} aria-label="Stop the timer">■</button>
      <button className="st-btn" onClick={() => hideTimer(true)} aria-label="Hide the banner" title="Hide. The timer keeps going."><Icon name="close" size={14} /></button>
      <i className="st-banner-bar" style={{ width: `${frac * 100}%` }} />
    </div>
  );
}
