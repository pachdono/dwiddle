import { useEffect, useState } from "react";
import { browse } from "./ai.js";
import { needsVisual, visualPrompt } from "./mathText.js";

// The picture a question needs, made once and kept for the session. If no
// picture can be made the question still shows, with a line saying so.
const made = new Map();

export function QuestionPicture({ text }) {
  const [src, setSrc] = useState(made.get(text));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (made.has(text)) { setSrc(made.get(text)); setFailed(false); return; }
    let live = true;
    setSrc(undefined); setFailed(false);
    browse("paint", { q: text }).then((r) => { if (r?.data) made.set(text, r.data); if (live) { setSrc(r?.data); setFailed(!r?.data); } }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [text]);
  if (failed) return <p className="small muted">The picture for this question could not be made just now.</p>;
  if (!src) return <p className="small muted">Drawing the picture for this question...</p>;
  return <figure className="nt-pic"><img src={src} alt="" /><figcaption>AI picture. Labels may not be perfect.</figcaption></figure>;
}

// Shows the question's own picture, or makes one when the wording points at a
// diagram that was never given.
export function PictureFor({ q }) {
  if (!q) return null;
  if (q.picture) return <QuestionPicture text={q.picture} />;
  if (needsVisual(q)) return <QuestionPicture text={visualPrompt(q)} />;
  return null;
}
