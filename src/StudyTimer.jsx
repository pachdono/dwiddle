// Study time: a timer started from Home that keeps going anywhere in the app.
//
// While it runs, a banner across the top of the screen shows the time left,
// with pause and stop. The × tucks it away into a small chip, and the timer
// carries on. When the time is up a pop-up says so, adds the minutes to
// today's total, and offers a short break or another round, the way a
// Pomodoro timer works. It is kept on the device, so it survives a reload.

import { useEffect, useState } from "react";
import { Icon, Portal } from "./ui.jsx";
import { Duck } from "./Duck.jsx";
import { playCue } from "./voice.js";

const KEY = "dwiddle-study-timer";
const LOG = "dwiddle-study-log";
const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } };
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

// { kind: "study" | "break", start, minutes, paused (time it was paused), away (ms spent paused), hidden, done }
let timer = read(KEY, null);
const listeners = new Set();
function set(next) { timer = next; write(KEY, next); listeners.forEach((f) => f(next)); }

const today = () => new Date().toISOString().slice(0, 10);
export const minutesToday = () => read(LOG, {})[today()] || 0;
function logMinutes(m) { const log = read(LOG, {}); log[today()] = (log[today()] || 0) + m; write(LOG, log); }

const spent = (t, now = Date.now()) => (t.paused || now) - t.start - (t.away || 0);
const leftOf = (t, now) => Math.max(0, t.minutes * 60000 - spent(t, now));
const clock = (ms) => { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; };

export function startTimer(minutes, kind = "study") { set({ kind, start: Date.now(), minutes, paused: 0, away: 0, hidden: false, done: false }); }
export function pauseTimer() { if (timer && !timer.paused) set({ ...timer, paused: Date.now() }); }
export function resumeTimer() { if (timer?.paused) set({ ...timer, away: (timer.away || 0) + Date.now() - timer.paused, paused: 0 }); }
export function stopTimer() {
  // Stopping early still counts what was studied.
  if (timer?.kind === "study") { const m = Math.floor(spent(timer) / 60000); if (m > 0) logMinutes(m); }
  set(null);
}
const hideTimer = (hidden) => timer && set({ ...timer, hidden });

export function useStudyTimer() {
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

const LENGTHS = [15, 25, 45, 60];

// The card on Home: pick a length and start, or see the one running.
export function StudyTimerCard() {
  const t = useStudyTimer();
  const [mins, setMins] = useState(() => read("dwiddle-study-length", 25));
  const done = minutesToday();
  if (t && !t.done) {
    const left = leftOf(t), frac = 1 - left / (t.minutes * 60000);
    return (
      <div className="card card-pad st-card on">
        <Ring frac={frac} kind={t.kind}><b>{clock(left)}</b><span>{t.kind === "break" ? "break" : "left"}</span></Ring>
        <div className="st-card-main">
          <b>{t.kind === "break" ? "On a break" : t.paused ? "Paused" : "Studying"}</b>
          <p className="small muted">{t.kind === "break" ? "Stretch, get some water. The next round is one tap away." : `${t.minutes} minute session. The timer keeps going on every page.`}</p>
          <div className="row">
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
      <div className="st-card-icon" aria-hidden="true">⏱️</div>
      <div className="st-card-main">
        <b>Study time</b>
        <p className="small muted">Set a timer and focus. It shows at the top of the screen while you work{done ? `, and you have done ${done} minute${done === 1 ? "" : "s"} today` : ""}.</p>
        <div className="row st-lengths">
          {LENGTHS.map((m) => <button key={m} className={"st-len" + (mins === m ? " on" : "")} onClick={() => { setMins(m); write("dwiddle-study-length", m); }}>{m} min</button>)}
          <button className="btn cta small" onClick={() => startTimer(mins)}>Start</button>
        </div>
      </div>
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
      if (t.kind === "study") logMinutes(t.minutes);
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
            <p className="muted">{study ? `You studied for ${t.minutes} minutes. That's ${minutesToday()} minutes today.` : "Ready for another round?"}</p>
            <div className="st-done-actions">
              {study
                ? <><button className="btn cta" onClick={() => startTimer(5, "break")}>5 minute break</button><button className="btn ghost" onClick={() => startTimer(t.minutes)}>Another {t.minutes} minutes</button></>
                : <button className="btn cta" onClick={() => startTimer(read("dwiddle-study-length", 25))}>Start studying</button>}
              <button className="btn ghost" onClick={() => set(null)}>Done</button>
            </div>
          </div>
        </div>
      </Portal>
    );
  }

  const frac = 1 - left / (t.minutes * 60000);
  if (t.hidden) {
    return (
      <button className={"st-chip " + t.kind} onClick={() => hideTimer(false)} title="Show the study timer">
        <i style={{ "--f": frac }} />{clock(left)}{t.paused ? " · paused" : ""}
      </button>
    );
  }
  return (
    <div className={"st-banner " + t.kind + (t.paused ? " paused" : "")} role="timer" aria-live="off">
      <span className="st-banner-icon" aria-hidden="true">{t.kind === "break" ? "☕" : "📚"}</span>
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
