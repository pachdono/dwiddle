// What comes up before a YouTube link is read on the website.
//
// The desktop app reads captions itself, from the user's own connection. The
// website has to ask our server to, and YouTube often turns server requests
// away even for a video that plays fine. So the web import is offered as an
// experiment, with the app as the thing that reliably works.

import { useEffect, useRef } from "react";
import { Duck } from "./Duck.jsx";
import { Portal } from "./ui.jsx";

export function WebVideoNotice({ onTry, onApp, onClose }) {
  const first = useRef(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Portal>
      <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="gate wv" role="dialog" aria-modal="true" aria-labelledby="wv-title" aria-describedby="wv-sub">
          <button className="gate-close" onClick={onClose} aria-label="Close">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"
              strokeWidth="1.9" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>

          <div className="gate-art wv-art" aria-hidden="true">
            <Duck size={96} shadow={false} />
            <svg className="wv-screen" width="112" height="96" viewBox="0 0 112 96" fill="none">
              <rect x="2" y="2" width="108" height="72" rx="12" className="wv-frame" />
              <circle cx="14" cy="13" r="2.4" className="wv-dot" />
              <circle cx="22" cy="13" r="2.4" className="wv-dot" />
              <rect x="38" y="24" width="36" height="24" rx="7" className="wv-play" />
              <path d="M52 30.5v11l9-5.5z" className="wv-tri" />
              <rect x="28" y="56" width="56" height="3" rx="1.5" className="wv-line" />
              <path d="M56 74v12M40 88h32" className="wv-stand" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>

          <h2 id="wv-title">YouTube on the web is experimental</h2>
          <p className="gate-sub" id="wv-sub">
            YouTube often blocks the website, even for videos that play fine. It only works with public
            videos that have captions. The app is more reliable.
          </p>

          <div className="gate-actions">
            <button className="btn cta gate-go" ref={first} onClick={onTry}>Try web import</button>
            <button className="btn ghost" onClick={onApp}>Get the app</button>
          </div>
          <button className="wv-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Portal>
  );
}
