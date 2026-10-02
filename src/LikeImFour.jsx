// "Explain like I'm 4": the one idea that matters here, as three or four
// tiny picture cards to flick through, like a children's book, ending with
// the proper word for it so the student can still use it in an exam. It used
// to be a paragraph that retold everything on screen, which was neither short
// nor simple.

import { useState } from "react";
import { explainLikeFour } from "./ai.js";
import { DuckTalk } from "./Chat.jsx";
import { Icon } from "./ui.jsx";

export function LikeImFour({ context, className = "" }) {
  const [state, setState] = useState("idle"); // idle | busy | done | failed
  const [data, setData] = useState(null); // { cards, word, means }
  const [error, setError] = useState("");
  const [open, setOpen] = useState(true);
  const [at, setAt] = useState(0);

  async function ask() {
    if (state === "done") { setOpen((v) => !v); return; }
    setState("busy");
    try {
      setData(await explainLikeFour(String(context || "").slice(0, 8000)));
      setAt(0);
      setState("done");
      setOpen(true);
    } catch (err) {
      setError(err.message || "Dwiddle could not explain that just now.");
      setState("failed");
    }
  }

  const cards = data?.cards || [];
  const last = cards.length; // after the pictures, one card with the grown-up word
  const card = cards[at];
  const step = (d) => setAt((i) => Math.max(0, Math.min(last, i + d)));

  return (
    <div className={"l4 " + className}>
      <button className={"l4-btn" + (state === "busy" ? " l4-busy" : "")} onClick={ask} disabled={state === "busy"}>
        <span className="l4-blocks" aria-hidden="true"><i>A</i><i>B</i><i>C</i></span>
        {state === "busy" ? "Making it simple…" : state === "done" && open ? "Hide" : "Explain like I'm 4"}
      </button>
      {state === "failed" && <p className="small l4-err">{error} <button className="linkish" onClick={() => { setState("idle"); setTimeout(ask); }}>Try again</button></p>}
      {state === "done" && open && (
        <div className="l4-deck" tabIndex={0}
          onKeyDown={(e) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }}>
          <button className="l4-x" onClick={() => setOpen(false)} aria-label="Hide"><Icon name="close" size={13} /></button>
          {card ? (
            <div className="l4-slide" key={at} onClick={() => step(1)}>
              <span className="l4-pic" aria-hidden="true">{card.pic}</span>
              <p>{card.text}</p>
            </div>
          ) : (
            <div className="l4-slide l4-word" key="word">
              <DuckTalk mood="talking" size={44} />
              <span className="small muted">The grown-up word</span>
              <b>{data.word}</b>
              {data.means && <p>{data.means}</p>}
            </div>
          )}
          <div className="l4-nav">
            <button className="icon-btn" onClick={() => step(-1)} disabled={at === 0} aria-label="Back">‹</button>
            <span className="l4-dots">
              {Array.from({ length: last + 1 }, (_, i) => (
                <button key={i} className={i === at ? "on" : ""} onClick={() => setAt(i)} aria-label={`Card ${i + 1}`} />
              ))}
            </span>
            <button className="icon-btn" onClick={() => step(1)} disabled={at === last} aria-label="Next">›</button>
          </div>
        </div>
      )}
    </div>
  );
}
