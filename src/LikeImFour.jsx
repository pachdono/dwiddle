// "Explain like I'm 4": whatever is on screen, said again in the smallest
// words there are, with a comparison from a small child's world, then the
// proper word for it so the student can still use it in an exam.

import { useState } from "react";
import { chatWithDwiddle } from "./ai.js";
import { DuckTalk } from "./Chat.jsx";
import { Icon } from "./ui.jsx";

const ASK = `Explain this like I'm four years old. Use tiny everyday words and very short sentences. Compare it to something a small child knows well: toys, food, bath time, the playground, animals, bedtime. No jargon at all. Four to six sentences. Then end with one sentence that starts "The grown-up word for this is" and names the key term, so I can still use it in an exam.`;

export function LikeImFour({ context, className = "" }) {
  const [state, setState] = useState("idle"); // idle | busy | done | failed
  const [text, setText] = useState("");
  const [open, setOpen] = useState(true);

  async function ask() {
    if (state === "done") { setOpen((v) => !v); return; }
    setState("busy");
    try {
      setText(await chatWithDwiddle(String(context || "").slice(0, 8000), [{ role: "user", content: ASK }]));
      setState("done");
      setOpen(true);
    } catch (err) {
      setText(err.message || "Dwiddle could not explain that just now. Try again.");
      setState("failed");
    }
  }

  return (
    <div className={"l4 " + className}>
      <button className={"l4-btn" + (state === "busy" ? " busy" : "")} onClick={ask} disabled={state === "busy"}>
        <span className="l4-blocks" aria-hidden="true"><i>A</i><i>B</i><i>C</i></span>
        {state === "busy" ? "Making it simple…" : state === "done" ? (open ? "Hide the simple version" : "Explain like I'm 4") : "Explain like I'm 4"}
      </button>
      {state === "failed" && <p className="small l4-err">{text} <button className="linkish" onClick={ask}>Try again</button></p>}
      {state === "done" && open && (
        <div className="l4-card">
          <div className="l4-duck"><DuckTalk mood="talking" size={54} /></div>
          <div className="l4-text">
            {text.split(/\n+/).filter(Boolean).map((p, i) => <p key={i}>{p.replace(/\*\*(.+?)\*\*/g, "$1")}</p>)}
          </div>
          <button className="l4-x" onClick={() => setOpen(false)} aria-label="Hide"><Icon name="close" size={13} /></button>
        </div>
      )}
    </div>
  );
}
