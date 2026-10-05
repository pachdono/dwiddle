// A short first look round the app that you do yourself: each step lights up
// one place, with an arrow and a numbered note, and you tap it to go there.
// The tour follows you to the next place. Skippable at any point, shown once,
// and again from Settings.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { load, save } from "./store.js";

const DONE = "dwiddle-tour-done";
export const tourDone = () => !!load(DONE, false);
export const resetTour = () => save(DONE, false);

// where: the place to tap, then where it may be hidden on a phone (behind
// More, which opens the drawer it is in). tap: what the note asks for.
const STEPS = [
  { where: ["new"], title: "Add your material", text: "Drop in notes, a PDF, slides or a photo, or just type a topic. Dwiddle turns it into notes, lessons and questions.", tap: "Tap New material" },
  { where: ["study"], title: "Study it", text: "Notes, Learn, Practice, Topics and Videos for what you added. With a few things added, you pick which one.", tap: "Tap Study" },
  { where: ["library", "more"], title: "Your library", text: "Everything you have added is kept here. Press Learn on one to study just that.", tap: "Tap Library" },
  { where: ["chat"], title: "Chat with Dwiddle", text: "Ask anything, or send a question you are stuck on, even a photo of it. Dwiddle can quiz you or make a video too.", tap: "Tap Chat" },
  { where: ["settings", "more"], title: "Make it yours", text: "Themes, your level, reminders and more live in Settings.", tap: "Tap Settings" },
  { where: ["themes"], title: "Pick a theme", text: "Tap any of these to try it. Change it whenever you like.", last: true },
];

// The same tour for the folder layout testers have: Library holds folders, and
// a folder has far more than notes in it, which people were missing.
export const FOLDER_STEPS = [
  STEPS[0],
  { where: ["folders", "more"], title: "Your folders", text: "Everything you add becomes a folder. Open one and use the tabs along the top: Notes, Learn, Practice, Topics and Videos are all in there, not just notes.", tap: "Tap Library" },
  { where: ["chat"], title: "Chat with Dwiddle", text: "Ask anything, or send a question you are stuck on, even a photo of it. Dwiddle can quiz you or make a video too.", tap: "Tap Chat" },
  { where: ["social"], title: "Friends", text: "Add friends by username, message them and see who is ahead. Inside a folder it opens over the page, so you can chat and study together.", tap: "Tap Friends" },
  { where: ["duel"], title: "Duel and Leaderboard", text: "Race a friend on the same questions, and see the top 10 and your own rank, up here.", tap: "Tap Duel" },
  STEPS[4],
  STEPS[5],
];

function findTarget(where) {
  for (const w of where) {
    for (const el of document.querySelectorAll(`[data-tour="${w}"]`)) {
      const r = el.getBoundingClientRect();
      // On screen (a big area may run off it), not in a closed drawer.
      const seen = r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= innerWidth && r.top < innerHeight && r.bottom > 0;
      if (seen && getComputedStyle(el).visibility !== "hidden") {
        const top = Math.max(r.top, 8), bottom = Math.min(r.bottom, innerHeight - 8);
        return { left: r.left, right: r.right, width: r.width, top, bottom, height: bottom - top, via: w };
      }
    }
  }
  return null;
}
const same = (a, b) => a === b || (a && b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height);

export function Tour({ onClose, steps = STEPS }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [h, setH] = useState(200); // the note's own height, to keep it clear of what it points at
  const card = useRef(null);
  const step = steps[i];
  useLayoutEffect(() => { if (card.current) setH(card.current.offsetHeight); });

  // The page changes under the tour as you tap through, so where the place
  // is gets checked a few times a second.
  useLayoutEffect(() => {
    // A place further down the page (the themes in Settings) is scrolled to.
    let scrolled = false;
    const reach = () => {
      if (scrolled) return;
      const el = document.querySelector(`[data-tour="${step.where[0]}"]`);
      const r = el?.getBoundingClientRect();
      if (r && r.width && r.left >= 0 && r.right <= innerWidth && (r.top > innerHeight - 80 || r.bottom < 0)) {
        scrolled = true;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    const place = () => reach() || setRect((old) => { const r = findTarget(step.where); return same(old, r) ? old : r; });
    place();
    const t = setInterval(place, 250);
    return () => clearInterval(t);
  }, [step]);

  const finish = () => { save(DONE, true); onClose(); };
  const next = () => (i + 1 < steps.length ? setI(i + 1) : finish());
  const back = () => setI(Math.max(0, i - 1));

  // Tapping the lit up place moves the tour on, once the page has changed.
  useEffect(() => {
    if (step.last) return;
    const tapped = (e) => {
      const el = e.target.closest?.("[data-tour]");
      if (el?.dataset.tour === step.where[0]) setTimeout(() => setI((n) => (n === i ? n + 1 : n)), 350);
    };
    document.addEventListener("click", tapped, true);
    return () => document.removeEventListener("click", tapped, true);
  }, [i, step]);

  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") finish(); };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });

  // The note goes beside the place: to its right for the sidebar, above or
  // below it otherwise, and in a corner when the place fills the screen.
  const W = Math.min(320, innerWidth - 32);
  const pad = 8;
  let box, arrow;
  if (!rect) {
    box = { left: (innerWidth - W) / 2, top: innerHeight / 2 - 120 };
  } else if (rect.height > innerHeight * 0.45 && rect.width > innerWidth * 0.4) {
    box = { left: innerWidth - W - 24, top: innerHeight - h - 24 };
  } else if (rect.right + W + 90 < innerWidth) {
    const top = Math.max(16, Math.min(innerHeight - h - 16, rect.top + rect.height / 2 - 70));
    box = { left: rect.right + 80, top };
    arrow = { x1: box.left - 6, y1: top + 40, x2: rect.right + pad + 6, y2: rect.top + rect.height / 2, side: true };
  } else {
    const left = Math.max(16, Math.min(innerWidth - W - 16, rect.left + rect.width / 2 - W / 2));
    const above = rect.top > innerHeight / 2;
    const top = above ? Math.max(16, rect.top - h - 64) : rect.bottom + 70;
    box = { left, top };
    const ax = Math.max(left + 30, Math.min(left + W - 30, rect.left + rect.width / 2));
    arrow = above
      ? { x1: ax - 30, y1: top + h + 4, x2: rect.left + rect.width / 2, y2: rect.top - pad - 6 }
      : { x1: ax - 30, y1: top - 4, x2: rect.left + rect.width / 2, y2: rect.bottom + pad + 6 };
  }
  const curve = arrow && `M${arrow.x1} ${arrow.y1} Q${(arrow.x1 + arrow.x2) / 2 + (arrow.side ? 0 : 40)} ${arrow.side ? arrow.y1 : (arrow.y1 + arrow.y2) / 2} ${arrow.x2} ${arrow.y2}`;

  // Everywhere but the lit up place is covered, so the only thing to tap is
  // the thing the tour is about.
  const hole = rect && { l: rect.left - pad, t: rect.top - pad, r: rect.right + pad, b: rect.bottom + pad };
  const tap = rect?.via === "more" && step.where[0] !== "more" ? "Tap More" : step.tap;

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="A quick tour of Dwiddle">
      {hole ? (
        <>
          <div className="tour-hole" style={{ left: hole.l, top: hole.t, width: hole.r - hole.l, height: hole.b - hole.t }} />
          <div className="tour-block" style={{ left: 0, top: 0, right: 0, height: Math.max(0, hole.t) }} />
          <div className="tour-block" style={{ left: 0, top: hole.b, right: 0, bottom: 0 }} />
          <div className="tour-block" style={{ left: 0, top: hole.t, width: Math.max(0, hole.l), height: hole.b - hole.t }} />
          <div className="tour-block" style={{ left: hole.r, top: hole.t, right: 0, height: hole.b - hole.t }} />
        </>
      ) : <div className="tour-dim" />}
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
          <span className="tour-of">{i + 1} of {steps.length}</span>
        </div>
        <p>{step.text}</p>
        <div className="tour-actions">
          <button className="linkish" onClick={finish}>Skip tour</button>
          <span style={{ flex: 1 }} />
          {i > 0 && <button className="btn small ghost" onClick={back}>Back</button>}
          {step.last || !rect
            ? <button className="btn small cta" onClick={next}>{step.last ? "Done" : "Next"}</button>
            : <span className="tour-tap"><i aria-hidden="true" />{tap}</span>}
        </div>
      </div>
    </div>
  );
}
