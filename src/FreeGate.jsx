// What comes up when the free generation has been used and there is no
// account yet.
//
// It is a popup rather than a panel further down the page, because the panel
// was the bug: it sat below the button, off the bottom of the window, and the
// button looked broken. This cannot be missed and cannot be mistaken for
// nothing happening.
//
// The tone matters as much as the placement. It states the limit plainly and
// then what an account gives, rather than announcing that something has run
// out. Closing it is always available, and the notes they typed are still
// there afterwards.

import { useEffect, useRef } from "react";
import { DuckSign } from "./Duck.jsx";

export function FreeGate({ onClose, onSignIn }) {
  const first = useRef(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="gate-scrim"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <button className="gate-close" onClick={onClose} aria-label="Close">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"
            strokeWidth="1.9" strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>

        <div className="gate-art" aria-hidden="true">
          <DuckSign size={200} />
        </div>

        <h2 id="gate-title">Create an account for unlimited access</h2>
        <p className="gate-sub">
          Without an account, Dwiddle is limited to one generation. Create one to generate
          without limits, and everything you make follows you to any device you sign in on.
        </p>

        <div className="gate-actions">
          <button className="btn cta gate-go" ref={first} onClick={onSignIn}>
            Create an account
          </button>
          <button className="btn ghost" onClick={onClose}>Not now</button>
        </div>

        <p className="gate-foot">Free, and it takes one email. No card and no password.</p>
      </div>
    </div>
  );
}
