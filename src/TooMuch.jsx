// What comes up when the material is longer than fits in one go.
//
// The limit is about ten pages a call. A longer PDF used to come back from the
// server as a small error, after the whole file had been read, and the advice
// to split it did not work: adding the second half replaced the first. So this
// offers the thing that does work, going through all of it in parts, one after
// another, into a single set of material. It is capped, because a two hundred
// page upload would run for half an hour on someone's quota.

import { useEffect, useRef } from "react";
import { DuckDoor } from "./Duck.jsx";
import { Portal } from "./ui.jsx";
import { splitSource, pagesOf, MAX_PARTS, PART } from "./ai.js";

export function TooMuch({ text, onAll, onFirst, onClose }) {
  const first = useRef(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  const parts = splitSource(text);
  const doable = Math.min(parts.length, MAX_PARTS);
  const pages = pagesOf(text.length);
  const capped = parts.length > MAX_PARTS;
  const coveredPages = pagesOf(parts.slice(0, MAX_PARTS).join("").length);
  const minutes = Math.max(1, Math.round((doable * 40) / 60));

  return (
    <Portal>
      <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="gate" role="dialog" aria-modal="true" aria-labelledby="tm-title">
          <button className="gate-close" onClick={onClose} aria-label="Close">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"
              strokeWidth="1.9" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>

          <div className="gate-art" aria-hidden="true">
            <DuckDoor size={230} />
          </div>

          <h2 id="tm-title">That is more than fits in one go</h2>
          <p className="gate-sub">
            Dwiddle reads about {pagesOf(PART)} pages at a time, and this is about {pages} pages.
            {capped
              ? ` It can work through the first ${coveredPages} pages in ${doable} parts, one after another, into one set of notes, lessons and questions.`
              : ` It can work through all of it in ${doable} parts, one after another, into one set of notes, lessons and questions, so nothing is left out.`}
          </p>

          <div className="gate-actions">
            <button className="btn cta gate-go" ref={first} onClick={onAll}>
              {capped ? `Do the first ${coveredPages} pages in ${doable} parts` : `Do all of it in ${doable} parts`}
            </button>
            <button className="btn ghost" onClick={onFirst}>Just the first {pagesOf(parts[0].length)} pages</button>
          </div>

          <p className="gate-foot">
            {`Takes about ${minutes} minute${minutes === 1 ? "" : "s"}.`}
            {capped ? " For the rest, split the document by chapter." : " A PDF split by chapter gives the clearest topics."}
          </p>
        </div>
      </div>
    </Portal>
  );
}
