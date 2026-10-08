import { useEffect, useState } from "react";
import { Boundary } from "./ui.jsx";
import { browse } from "./ai.js";
import { drawQuestion } from "./ai.js";
import { needsVisual, visualPrompt, unseenVisual, missingData } from "./mathText.js";

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

// A graph or diagram a check leans on, drawn properly (to scale, from the
// numbers) by the same drawing step that draws a solved question. What the
// lesson says goes along with it, since that is where the values are.
const drawnFor = new Map();
export function QuestionDiagram({ q, context = "" }) {
  const options = Array.isArray(q.choices) ? `\nOptions: ${q.choices.join(" | ")}` : Array.isArray(q.pairs) ? `\nParts: ${q.pairs.map((p) => `${p.a} = ${p.b}`).join("; ")}` : "";
  const text = `${context ? `What the lesson says, which gives the values to draw:\n${context}\n\n` : ""}The question:\n${q.q}${options}`.slice(0, 5500);
  const [d, setD] = useState(drawnFor.get(text));
  const [Diagram, setDiagram] = useState(null);
  useEffect(() => {
    let live = true;
    import("./Video.jsx").then((m) => live && setDiagram(() => m.Diagram));
    if (drawnFor.has(text)) { setD(drawnFor.get(text)); return () => { live = false; }; }
    setD(undefined);
    drawQuestion({ problem: text }).then((r) => { const v = r?.figure && r.diagram ? r.diagram : null; drawnFor.set(text, v); if (live) setD(v); }).catch(() => { if (live) setD(null); });
    return () => { live = false; };
  }, [text]);
  if (d === null) return <p className="small muted">The diagram for this question could not be drawn just now. The lesson cards above have the values.</p>;
  if (!d || !Diagram) return <p className="small muted">Drawing the diagram for this question...</p>;
  return <figure className="nt-pic qd"><Diagram d={d} line={99} /><figcaption>Drawn from the lesson. Labels are what the lesson gives.</figcaption></figure>;
}

// The picture or graph a check needs: its own picture, a drawn diagram when it
// leans on a graph, diagram or table, or numbers it never states.
export function VisualFor({ q, context = "" }) {
  if (!q) return null;
  if (q.picture) return <QuestionPicture text={q.picture} />;
  // a diagram that cannot be drawn must never take the lesson down with it
  if (unseenVisual(q) || missingData(q)) return <Boundary fallback={() => null}><QuestionDiagram q={q} context={context} /></Boundary>;
  if (needsVisual(q)) return <QuestionPicture text={visualPrompt(q)} />;
  return null;
}
