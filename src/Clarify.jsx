// A question or two before writing, when what someone typed could mean several
// things. "Biology" could be one lesson or forty, at any of four levels, and
// guessing wastes a generation on the wrong one. Anything clear, which is
// nearly everything, never reaches this.

import { useEffect, useRef, useState } from "react";
import { DuckParts } from "./Duck.jsx";
import { Portal } from "./ui.jsx";

const ALL = "All of the above";

function DuckWondering({ size = 120 }) {
  return (
    <svg width={size} height={size * (140 / 130)} viewBox="0 0 130 140" fill="none" aria-hidden="true">
      <g className="cl-bob"><DuckParts /></g>
      <g className="cl-mark">
        <circle cx="112" cy="26" r="15" fill="#FFFFFF" stroke="#E6E6EC" strokeWidth="1.5" />
        <path d="M107 21.5a5 5 0 1 1 7 4.6c-1.4.7-2 1.6-2 3v1" stroke="#3B5BFD" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="112" cy="35" r="1.9" fill="#3B5BFD" />
      </g>
    </svg>
  );
}

export function Clarify({ asked, questions, onDone, onSkip }) {
  const [picked, setPicked] = useState({}); // id -> [options]
  const [other, setOther] = useState({});   // id -> typed text
  const first = useRef(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onSkip(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onSkip]);

  function toggle(q, option) {
    setPicked((p) => {
      const now = p[q.id] || [];
      if (!q.multi) return { ...p, [q.id]: now[0] === option ? [] : [option] };
      if (option === ALL) return { ...p, [q.id]: now.includes(ALL) ? [] : [ALL] };
      const without = now.filter((o) => o !== ALL);
      return { ...p, [q.id]: without.includes(option) ? without.filter((o) => o !== option) : [...without, option] };
    });
  }

  const answers = questions.map((q) => {
    const chosen = (picked[q.id] || []).flatMap((o) => (o === ALL ? q.options : [o]));
    const typed = (other[q.id] || "").trim();
    return { q: q.q, chosen: typed ? [...chosen, typed] : chosen };
  });
  const answeredAll = answers.every((a) => a.chosen.length > 0);

  return (
    <Portal>
      <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onSkip(); }}>
        <div className="gate cl" role="dialog" aria-modal="true" aria-labelledby="cl-title">
          <button className="gate-close" onClick={onSkip} aria-label="Close">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>

          <div className="gate-art cl-art"><DuckWondering size={112} /></div>
          <h2 id="cl-title">Quick question first</h2>
          <p className="gate-sub">So the notes on <b>{asked}</b> are the ones you need.</p>

          <div className="cl-qs">
            {questions.map((q, n) => {
              const options = q.multi ? [...q.options, ALL] : q.options;
              const now = picked[q.id] || [];
              return (
                <fieldset key={q.id} className="cl-q">
                  <legend>{q.q}{q.multi && <span> Pick any</span>}</legend>
                  <div className="cl-opts">
                    {options.map((o, i) => (
                      <button key={o} type="button" ref={n === 0 && i === 0 ? first : undefined}
                        className={"cl-opt" + (now.includes(o) ? " on" : "") + (o === ALL ? " all" : "")}
                        aria-pressed={now.includes(o)} onClick={() => toggle(q, o)}>
                        {o}
                      </button>
                    ))}
                  </div>
                  <input className="cl-other" type="text" placeholder="Or type your own"
                    value={other[q.id] || ""} onChange={(e) => setOther((x) => ({ ...x, [q.id]: e.target.value }))} />
                </fieldset>
              );
            })}
          </div>

          <div className="gate-actions">
            <button className="btn cta gate-go" disabled={!answeredAll} onClick={() => onDone(answers)}>
              Write my notes
            </button>
            <button className="btn ghost" onClick={() => onDone([])}>Just go with your best guess</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
