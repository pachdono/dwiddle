// A short first look round the app: a numbered note beside each important
// place with an arrow pointing at it, the rest of the screen dimmed. Five
// steps, skippable at any point, shown once, and again from Settings.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { THEMES } from "./themes.js";
import { load, save } from "./store.js";

const DONE = "dwiddle-tour-done";
export const tourDone = () => !!load(DONE, false);
export const resetTour = () => save(DONE, false);

// where: the places to point at, first one on screen wins (the phone layout
// keeps some of them behind More).
const STEPS = [
  { where: ["new"], title: "Add your material", text: "Drop in notes, a PDF, slides or a photo, or just type a topic. Dwiddle turns it into notes, lessons and questions." },
  { where: ["study"], title: "Study it", text: "Notes, Learn, Practice, Topics and Videos for what you added. With a few things added, you pick which one." },
  { where: ["library", "more"], title: "Your library", text: "Everything you have added is kept here. Press Learn on one to study just that." },
  { where: ["chat"], title: "Chat with Dwiddle", text: "Ask anything, or send a question you are stuck on, even a photo of it. Dwiddle can quiz you or make a video too.", action: "Try chatting" },
  { where: ["settings", "more"], title: "Pick a theme", text: "Tap one to try it now. You can change it any time in Settings.", themes: true },
];

function findTarget(where) {
  for (const w of where) {
    for (const el of document.querySelectorAll(`[data-tour="${w}"]`)) {
      const r = el.getBoundingClientRect();
      // On screen, not tucked away in a closed drawer.
      const seen = r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
      if (seen && getComputedStyle(el).visibility !== "hidden") return r;
    }
  }
  return null;
}

export function Tour({ onClose, go, look, setLook }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [h, setH] = useState(220); // the note's own height, to keep it clear of what it points at
  const card = useRef(null);
  const step = STEPS[i];
  useLayoutEffect(() => { if (card.current) setH(card.current.offsetHeight); });

  useLayoutEffect(() => {
    const place = () => setRect(findTarget(step.where));
    place();
    addEventListener("resize", place);
    return () => removeEventListener("resize", place);
  }, [i, step]);

  const finish = () => { save(DONE, true); onClose(); };
  const next = () => (i + 1 < STEPS.length ? setI(i + 1) : finish());
  const back = () => setI(Math.max(0, i - 1));

  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") finish();
      else if (e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") back();
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });

  // The note goes beside the target: to its right for the sidebar, above it
  // for the tab bar along the bottom of a phone.
  const W = Math.min(320, innerWidth - 32);
  const pad = 8;
  let box, arrow;
  if (!rect) {
    box = { left: (innerWidth - W) / 2, top: innerHeight / 2 - 120 };
  } else if (rect.right + W + 90 < innerWidth) {
    const top = Math.max(16, Math.min(innerHeight - 300, rect.top + rect.height / 2 - 70));
    box = { left: rect.right + 80, top };
    arrow = { x1: box.left - 6, y1: top + 40, x2: rect.right + pad + 6, y2: rect.top + rect.height / 2, side: "right" };
  } else {
    const left = Math.max(16, Math.min(innerWidth - W - 16, rect.left + rect.width / 2 - W / 2));
    const above = rect.top > innerHeight / 2;
    const top = above ? Math.max(16, rect.top - h - 64) : rect.bottom + 70;
    box = { left, top, above };
    const ax = Math.max(left + 30, Math.min(left + W - 30, rect.left + rect.width / 2));
    arrow = above
      ? { x1: ax - 30, y1: top + h + 4, x2: rect.left + rect.width / 2, y2: rect.top - pad - 6 }
      : { x1: ax - 30, y1: rect.bottom + 64, x2: rect.left + rect.width / 2, y2: rect.bottom + pad + 6 };
  }
  const curve = arrow && `M${arrow.x1} ${arrow.y1} Q${(arrow.x1 + arrow.x2) / 2 + (arrow.side ? 0 : 40)} ${arrow.side ? arrow.y1 : (arrow.y1 + arrow.y2) / 2} ${arrow.x2} ${arrow.y2}`;

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="A quick tour of Dwiddle">
      {rect
        ? <div className="tour-hole" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
        : <div className="tour-dim" />}
      {curve && (
        <svg className="tour-arrow" width="100%" height="100%">
          <defs><marker id="tour-head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#FFD84D" /></marker></defs>
          <path d={curve} markerEnd="url(#tour-head)" />
        </svg>
      )}
      <div className="tour-card" key={i} ref={card} style={{ left: box.left, top: box.top, width: W }}>
        <div className="tour-head">
          <span className="tour-num">{i + 1}</span>
          <b>{step.title}</b>
          <span className="tour-of">{i + 1} of {STEPS.length}</span>
        </div>
        <p>{step.text}</p>
        {step.themes && (
          <div className="tour-themes">
            {THEMES.slice(0, 10).map((t) => {
              const [a, b] = t.light?.grad || t.preview.light;
              return (
                <button key={t.id} className={look === t.id ? "on" : ""} onClick={() => setLook(t.id)} title={t.name}>
                  <i style={{ background: `linear-gradient(135deg, ${a}, ${b})`, borderColor: t.light?.accent || t.preview.light[2] }} />
                  <span>{t.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="tour-actions">
          <button className="linkish" onClick={finish}>Skip tour</button>
          <span style={{ flex: 1 }} />
          {i > 0 && <button className="btn small ghost" onClick={back}>Back</button>}
          {step.action && <button className="btn small ghost" onClick={() => { finish(); go("chat"); }}>{step.action}</button>}
          <button className="btn small cta" onClick={next}>{i + 1 < STEPS.length ? "Next" : "Done"}</button>
        </div>
      </div>
    </div>
  );
}
