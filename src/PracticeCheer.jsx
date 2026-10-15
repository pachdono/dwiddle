// The company in full screen practice: a panel either side of the question
// and a cheer now and then for a right answer.
//
// On the left, how this sitting is going: the streak of right answers in a
// row, what has been answered, how many were right, the XP earned. On the
// right, Dwiddle, who reacts to every answer, and the next streak to aim for.
// Now and then a right answer gets a proper cheer, the way Duolingo does it:
// Dwiddle pops up from the bottom with a banner and a burst of confetti. Always
// at a streak of 3, 5, 10 and every 5 after, and otherwise about one right
// answer in four, so it stays a treat rather than noise. It never blocks the
// page: it cannot be clicked and it clears itself.

import { useEffect, useRef, useState } from "react";
import { DuckTalk } from "./Chat.jsx";
import { XP } from "./xp.js";
import { playCue } from "./voice.js";

const rnd = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const pick = (list, seed) => list[Math.floor(rnd(seed) * list.length) % list.length];

const RIGHT = ["Nice one!", "Spot on!", "Brilliant!", "Nailed it!", "Exactly right!", "Look at you go!", "Sharp!"];
const WRONG = ["Nearly! Read the why.", "That's how it sticks.", "Shake it off, next one.", "Close. You'll get it next time.", "Good try. Check the explanation."];
const IDLE = ["Take your time.", "You've got this.", "Read it twice, answer once."];
const MILESTONE = { 3: "Three in a row!", 5: "Five in a row!", 10: "Ten in a row!", 15: "Fifteen! Unstoppable", 20: "Twenty in a row!" };
const milestone = (n) => MILESTONE[n] || (n > 20 && n % 5 === 0 ? `${n} in a row!` : null);
const nextGoal = (n) => [3, 5, 10, 15, 20].find((g) => g > n) || (Math.floor(n / 5) + 1) * 5;

export function usePracticeSession() {
  const [s, setS] = useState({ answered: 0, right: 0, streak: 0, best: 0, xp: 0, last: null, seq: 0, cheer: null });
  function record(ok, { quiet = false } = {}) {
    setS((p) => {
      const streak = ok ? p.streak + 1 : 0;
      const seq = p.seq + 1;
      const big = milestone(streak);
      const cheer = !quiet && ok && (big || rnd(seq * 7 + p.answered) < 0.25)
        ? { text: big || pick(RIGHT, seq * 3), big: !!big, id: seq }
        : null;
      return {
        answered: p.answered + 1, right: p.right + (ok ? 1 : 0), streak, best: Math.max(p.best, streak),
        xp: p.xp + (ok ? XP.right : XP.tried), last: ok, seq, cheer: cheer || p.cheer,
      };
    });
  }
  return [s, record];
}

// Sounds follow the answers: a ding for a right one, a run for a streak.
export function useCheerSounds(s) {
  const seen = useRef(0);
  useEffect(() => {
    if (s.seq === seen.current) return;
    seen.current = s.seq;
    if (s.last) playCue(milestone(s.streak) ? "streak" : "right");
  }, [s.seq, s.last, s.streak]);
}

function Ring({ value }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg className="pc-ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={r} className="pc-ring-bg" />
      <circle cx="32" cy="32" r={r} className="pc-ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - value)} />
    </svg>
  );
}

export function PracticeSides({ s }) {
  const acc = s.answered ? s.right / s.answered : 0;
  const goal = nextGoal(s.streak);
  const mood = s.last === true ? "happy" : s.last === false ? "oops" : "idle";
  const say = s.last === true ? pick(RIGHT, s.seq * 5) : s.last === false ? pick(WRONG, s.seq * 5) : pick(IDLE, new Date().getDate());
  return (
    <>
      <aside className="pc-side left" aria-label="This session">
        <div className="pc-panel">
          <span className="pc-label">This session</span>
          <div className={"pc-streak" + (s.streak >= 3 ? " hot" : "")} key={"st" + s.seq}>
            <svg viewBox="0 0 24 24" className="pc-flame" aria-hidden="true">
              <path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z" />
            </svg>
            <b>{s.streak}</b>
            <span>in a row</span>
          </div>
          <div className="pc-acc">
            <div className="pc-ring-wrap"><Ring value={acc} /><b>{s.answered ? Math.round(acc * 100) + "%" : "–"}</b></div>
            <div className="pc-nums">
              <div><b>{s.right}</b><span>right</span></div>
              <div><b>{s.answered}</b><span>answered</span></div>
              <div><b>{s.best}</b><span>best streak</span></div>
            </div>
          </div>
          <div className="pc-xp" key={"xp" + s.seq}>
            <span className="pc-xp-gem">XP</span><b>+{s.xp}</b><span>earned</span>
            {s.last !== null && <i className="pc-xp-float">+{s.last ? XP.right : XP.tried}</i>}
          </div>
        </div>
      </aside>
      <aside className="pc-side right" aria-label="Dwiddle">
        <div className="pc-panel pc-duck">
          <div className="pc-bubble" key={"b" + s.seq}>{say}</div>
          <div key={"d" + s.seq}><DuckTalk mood={mood} size={110} /></div>
        </div>
        <div className="pc-panel">
          <span className="pc-label">Next goal</span>
          <b className="pc-goal">{goal} in a row</b>
          <div className="pc-goal-bar"><i style={{ width: `${(s.streak / goal) * 100}%` }} /></div>
          <span className="pc-goal-sub">{goal - s.streak} more to go</span>
        </div>
      </aside>
    </>
  );
}

const CONFETTI = ["#F6C443", "#FF7B7B", "#5ED7BE", "#7DA8FF", "#C78BFF", "#FF9F5A"];

export function Cheer({ cheer }) {
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (!cheer) return;
    setShown(cheer);
    const t = setTimeout(() => setShown(null), cheer.big ? 2300 : 1700);
    return () => clearTimeout(t);
  }, [cheer]);
  if (!shown) return null;
  return (
    <div className={"pc-cheer" + (shown.big ? " big" : "")} key={shown.id} aria-live="polite">
      <div className="pc-confetti" aria-hidden="true">
        {Array.from({ length: shown.big ? 46 : 26 }, (_, i) => {
          const a = -Math.PI / 2 + (rnd(shown.id * 50 + i) - 0.5) * 2.2;
          const d = 180 + rnd(shown.id * 50 + i * 3) * 260;
          return <i key={i} style={{ background: CONFETTI[i % CONFETTI.length], "--x": `${Math.cos(a) * d}px`, "--y": `${Math.sin(a) * d}px`,
            "--r": `${Math.round(rnd(i + shown.id) * 720 - 360)}deg`, animationDelay: `${rnd(i * 7) * 0.12}s`, borderRadius: i % 3 ? 2 : "50%" }} />;
        })}
      </div>
      <div className="pc-pop">
        <div className="pc-banner">{shown.text}</div>
        <DuckTalk mood="happy" size={shown.big ? 130 : 100} />
      </div>
    </div>
  );
}

// A flash on every answer, so a quick right or wrong cannot be missed: a wash
// of green with a tick drawing itself, or of red with a cross. It is over in
// well under a second, never takes a click, and is said aloud to screen readers.
export function AnswerFlash({ ok, seq }) {
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (ok === null || ok === undefined || !seq) return;
    setShown({ ok, seq });
    const t = setTimeout(() => setShown(null), 750);
    return () => clearTimeout(t);
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!shown) return null;
  return (
    <div className={"af " + (shown.ok ? "right" : "wrong")} key={shown.seq}>
      <i className="af-wash" aria-hidden="true" />
      <svg className="af-badge" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="34" className="af-disc" />
        {shown.ok
          ? <path d="M24 41 L35 52 L57 28" className="af-mark" />
          : <path d="M27 27 L53 53 M53 27 L27 53" className="af-mark" />}
      </svg>
      <span className="af-say" role="status">{shown.ok ? "Correct" : "Not quite"}</span>
    </div>
  );
}
