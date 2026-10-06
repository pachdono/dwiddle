import { useState } from "react";

// Says once, plainly, what Dwiddle keeps in the browser. It sets no cookies for
// advertising or tracking and needs nothing that requires a choice, so this is
// a notice with a way to read more, not a consent form.
const KEY = "dwiddle-notice";
const seen = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return true; } };
const PRIVACY = typeof location !== "undefined" && location.protocol.startsWith("http") ? "/privacy" : "https://dwiddle.vercel.app/privacy";

export default function StorageNotice() {
  const [gone, setGone] = useState(seen);
  if (gone) return null;
  return (
    <div className="sn" role="region" aria-label="Storage notice">
      <p>Dwiddle keeps your progress and settings in your browser's storage so it works and keeps you signed in. It uses no advertising or tracking cookies. <a href={PRIVACY} target="_blank" rel="noreferrer">Privacy policy</a></p>
      <button className="btn small" onClick={() => { try { localStorage.setItem(KEY, "1"); } catch { /* fine */ } setGone(true); }}>Got it</button>
    </div>
  );
}
