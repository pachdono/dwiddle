// One question you are stuck on, worked through.
//
// The rest of the app turns material into practice. This does the opposite: it
// takes a single question, from a photo, a file or pasted text, and shows the
// method. The answer is deliberately not the centrepiece. It sits at the top
// because that is what is looked for first, and then every step is laid out
// underneath with the reason it was the right move, because that is the part
// worth having the next time a question like it turns up.

import { useState } from "react";
import { solveProblem } from "./ai.js";
import { readFile, MAX_FILE } from "./readfile.js";
import { Icon, PageHead, Loading } from "./ui.jsx";
import { generationsLeft, countGeneration } from "./limits.js";
import { FreeGate } from "./FreeGate.jsx";

export function Solve({ go, auth }) {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [over, setOver] = useState(false);
  const [state, setState] = useState("idle"); // idle | reading | working | done | locked | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [shown, setShown] = useState(false); // the answer to the similar question

  const ready = !!file || text.trim().length > 0;

  function accept(f) {
    if (!f) return;
    if (f.size > MAX_FILE) {
      setError(`That file is ${(f.size / 1024 / 1024).toFixed(1)} MB, over the 20 MB limit.`);
      setState("error");
      return;
    }
    setError("");
    setState("idle");
    setFile(f);
  }

  async function run() {
    if (generationsLeft(auth?.user) <= 0) { setState("locked"); return; }
    setError("");
    setShown(false);
    let problem = text;

    if (file) {
      setState("reading");
      try {
        problem = await readFile(file);
      } catch (err) {
        setState("error");
        setError(err.message);
        return;
      }
    }

    setState("working");
    try {
      const data = await solveProblem(problem);
      countGeneration(auth?.user);
      setResult(data);
      setState("done");
    } catch (err) {
      setState("error");
      setError(err.message);
    }
  }

  function again() {
    setFile(null);
    setText("");
    setResult(null);
    setShown(false);
    setState("idle");
    setError("");
  }

  return (
    <div className="page fade">
      <PageHead
        title="Solve"
        sub="A question you are stuck on, worked through step by step, with the reason behind every move."
      />

      <div className="stack">
        {state !== "done" && (
          <>
            <label
              className={"drop" + (over ? " over" : "") + (file ? " has" : "")}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files?.[0]); }}
            >
              <input type="file" accept=".pdf,.docx,.pptx,.txt,.md,image/*" hidden
                onChange={(e) => accept(e.target.files?.[0])} />
              <span className="drop-icon"><Icon name={file ? "file" : "upload"} size={20} /></span>
              {file ? (
                <>
                  <b>{file.name}</b>
                  <span className="small muted">{(file.size / 1024).toFixed(0)} KB, ready to work through</span>
                </>
              ) : (
                <>
                  <b>Photograph the question, or drop the file here</b>
                  <span className="small muted">A photo, PDF, Word, PowerPoint or plain text</span>
                </>
              )}
            </label>

            <div className="or"><span>or</span></div>

            <div className="notes">
              <div className="notes-head">
                <div className="row">
                  <span className="notes-icon"><Icon name="text" size={14} /></span>
                  <b className="small">Type the question</b>
                </div>
              </div>

              <textarea
                className="notes-area sv-area"
                placeholder="Paste or type the question. Include any numbers, diagrams described in words, and what the question actually asks for."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <div className="notes-foot">
                <span className="small muted">
                  {state === "reading" ? "Reading the file" : "One question at a time works best"}
                </span>
                <button className="btn cta" disabled={!ready || state === "reading" || state === "working"}
                  onClick={run}>
                  {state === "reading" ? <Loading label="Reading file" />
                    : state === "working" ? <Loading label="Working it through" />
                    : "Work it through"}
                </button>
              </div>
            </div>
          </>
        )}

        {state === "working" && (
          <div className="card card-pad note-card fade">
            <b className="small">This takes up to a minute</b>
            <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-2)" }}>
              It is reading the question, working it through, and writing the reason behind each
              step rather than just the answer.
            </p>
          </div>
        )}

        {state === "locked" && (
          <FreeGate onClose={() => setState("idle")} onSignIn={() => go("settings")} />
        )}

        {state === "error" && (
          <div className="card card-pad fade" style={{ borderColor: "var(--warn-line)" }}>
            <div className="spread">
              <span className="pill warn">Could not work it through</span>
              <button className="btn ghost" onClick={run}>Try again</button>
            </div>
            <p className="small" style={{ margin: "10px 0 0", color: "var(--ink-2)" }}>{error}</p>
          </div>
        )}

        {state === "done" && result && (
          <div className="sv fade">
            <div className="sv-head">
              <div>
                {result.subject && <span className="pill">{result.subject}</span>}
                <h2>{result.title}</h2>
                {result.asked && <p className="sv-asked">{result.asked}</p>}
              </div>
              <button className="btn ghost" onClick={again}>Another question</button>
            </div>

            {result.answer && (
              <div className="sv-answer">
                <span className="sv-label">Answer</span>
                <b>{result.answer}</b>
              </div>
            )}

            <ol className="sv-steps">
              {result.steps.map((s, i) => (
                <li key={i}>
                  <span className="sv-n">{i + 1}</span>
                  <div className="sv-body">
                    <b>{s.do}</b>
                    {s.work && <div className="sv-work">{s.work}</div>}
                    {s.why && <p className="sv-why">{s.why}</p>}
                  </div>
                </li>
              ))}
            </ol>

            {result.idea && (
              <div className="card card-pad sv-idea">
                <span className="sv-label">What it is really testing</span>
                <p>{result.idea}</p>
              </div>
            )}

            <div className="sv-grid">
              {result.check && (
                <div className="card card-pad">
                  <span className="sv-label">Checking it</span>
                  <p className="small">{result.check}</p>
                </div>
              )}
              {result.watch.length > 0 && (
                <div className="card card-pad">
                  <span className="sv-label">Where marks go</span>
                  <ul className="sv-watch">
                    {result.watch.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {result.similar && (
              <div className="card card-pad sv-similar">
                <span className="sv-label">Now try this one</span>
                <p>{result.similar.q}</p>
                {shown ? (
                  <div className="sv-reveal"><b>{result.similar.answer}</b></div>
                ) : (
                  <button className="btn ghost small" onClick={() => setShown(true)}>
                    Show the answer
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
