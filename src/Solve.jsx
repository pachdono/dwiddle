// One question you are stuck on, worked through.
//
// The rest of the app turns material into practice. This does the opposite: it
// takes a single question, from a photo, a file or pasted text, and shows the
// method. The answer is deliberately not the centrepiece. It sits at the top
// because that is what is looked for first, and then every step is laid out
// underneath with the reason it was the right move, because that is the part
// worth having the next time a question like it turns up.
//
// A question often does not fit in one photo: the text on one page, the
// diagram on the next, part (c) over the page. So several files can go in at
// once, in order, and are read as one question.

import { useEffect, useState } from "react";
import { solveProblem, writeVideo } from "./ai.js";
import { readFile, MAX_FILE, IMAGE } from "./readfile.js";
import { Icon, PageHead, Loading, BusyScreen, Boundary } from "./ui.jsx";
import { VideoPlayer } from "./Video.jsx";
import { prepareNarration } from "./narration.js";
import { generationsLeft, countGeneration } from "./limits.js";
import { FreeGate } from "./FreeGate.jsx";
import { AskDwiddleButton, usePageContext } from "./Chat.jsx";

// What Dwiddle is told about a worked solution, so a follow up is about it.
function solutionContext(r) {
  if (!r) return "The student is on the Solve page and has not sent a question yet.";
  return [
    `A worked solution on the Solve page. Subject: ${r.subject || "unknown"}.`,
    `The question: ${r.asked}`,
    `The answer given: ${r.answer}`,
    ...r.steps.map((st, i) => `Step ${i + 1}: ${st.do}. ${st.work} (${st.why})`),
    r.idea ? `What it tests: ${r.idea}` : "",
    r.check ? `Checking it: ${r.check}` : "",
  ].filter(Boolean).join("\n");
}

const MAX_FILES = 6;

export function Solve({ go, auth, early }) {
  const [files, setFiles] = useState([]); // [{ file, url }] in the order they were added
  const [text, setText] = useState("");
  const [over, setOver] = useState(false);
  const [state, setState] = useState("idle"); // idle | reading | working | done | locked | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [shown, setShown] = useState(false); // the answer to the similar question
  const [reading, setReading] = useState(0); // which file is being read, from 1
  const [problem, setProblem] = useState(""); // the question as read, for the video
  const [video, setVideo] = useState(null);
  const [watching, setWatching] = useState(false);
  const [filming, setFilming] = useState(false);
  const [videoError, setVideoError] = useState("");

  async function explain() {
    if (video) { setWatching(true); return; }
    setFilming(true);
    setVideoError("");
    try {
      const made = await writeVideo({ solution: result, problem });
      setVideo(made);
      // The narration starts making straight away; the player waits for it.
      prepareNarration(made);
      setWatching(true);
    } catch (err) {
      setVideoError(err.message || "The video could not be made.");
    } finally {
      setFilming(false);
    }
  }

  const ready = files.length > 0 || text.trim().length > 0;
  usePageContext(solutionContext(state === "done" ? result : null));
  const busy = state === "reading" || state === "working";

  function accept(list) {
    const incoming = [...(list || [])];
    if (!incoming.length) return;
    const big = incoming.find((f) => f.size > MAX_FILE);
    if (big) {
      setError(`${big.name} is ${(big.size / 1024 / 1024).toFixed(1)} MB, over the 20 MB limit.`);
      setState("error");
      return;
    }
    setFiles((prev) => {
      const room = MAX_FILES - prev.length;
      if (incoming.length > room) {
        setError(`Up to ${MAX_FILES} files at a time.${room > 0 ? ` The first ${room} were added.` : ""}`);
        setState("error");
      } else {
        setError("");
        setState("idle");
      }
      const added = incoming.slice(0, Math.max(0, room)).map((file) => ({
        file,
        url: IMAGE.test(file.name) ? URL.createObjectURL(file) : "",
      }));
      return [...prev, ...added];
    });
  }

  function remove(i) {
    setFiles((prev) => {
      if (prev[i]?.url) URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, n) => n !== i);
    });
  }

  // A screenshot on the clipboard can go straight in, without saving it first.
  useEffect(() => {
    if (state === "done") return;
    const onPaste = (e) => {
      const pasted = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
      if (!pasted.length) return;
      e.preventDefault();
      accept(pasted.map((f, i) => new File([f], f.name && f.name !== "image.png"
        ? f.name : `Pasted ${Date.now()}${i ? `-${i}` : ""}.png`, { type: f.type })));
    };
    addEventListener("paste", onPaste);
    return () => removeEventListener("paste", onPaste);
  }, [state]);

  async function run() {
    if (generationsLeft(auth?.user) <= 0) { setState("locked"); return; }
    setError("");
    setShown(false);
    const parts = [];

    // One after another rather than all at once: each photo is a call to the
    // reading model, and six in the same second is how a rate limit is met.
    for (let i = 0; i < files.length; i++) {
      setState("reading");
      setReading(i + 1);
      try {
        const read = (await readFile(files[i].file)).trim();
        if (read) parts.push(files.length > 1 ? `[Page ${i + 1} of ${files.length}]\n${read}` : read);
      } catch (err) {
        setState("error");
        setError(files.length > 1 ? `${files[i].file.name}: ${err.message}` : err.message);
        return;
      }
    }
    if (text.trim()) parts.push(files.length ? `[Typed by the student]\n${text.trim()}` : text.trim());

    setState("working");
    try {
      const data = await solveProblem(parts.join("\n\n"));
      setProblem(parts.join("\n\n"));
      setVideo(null);
      setVideoError("");
      countGeneration(auth?.user);
      setResult(data);
      setState("done");
    } catch (err) {
      setState("error");
      setError(err.message);
    }
  }

  function again() {
    files.forEach((f) => f.url && URL.revokeObjectURL(f.url));
    setFiles([]);
    setText("");
    setResult(null);
    setShown(false);
    setVideo(null);
    setVideoError("");
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
              className={"drop" + (over ? " over" : "") + (files.length ? " compact" : "")}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files); }}
            >
              <input type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md,image/*" hidden
                onChange={(e) => { accept(e.target.files); e.target.value = ""; }} />
              <span className="drop-icon"><Icon name={files.length ? "plus" : "upload"} size={20} /></span>
              {files.length ? (
                <>
                  <b>{files.length === 1 ? "1 file added" : `${files.length} files added`}</b>
                  <span className="small muted">
                    {files.length < MAX_FILES
                      ? "Add more pages of the same question, or paste a screenshot"
                      : `That is the most at once (${MAX_FILES})`}
                  </span>
                </>
              ) : (
                <>
                  <b>Photograph the question, or drop the files here</b>
                  <span className="small muted">Photos, screenshots, PDF, Word or PowerPoint. Up to {MAX_FILES}, read in order.</span>
                </>
              )}
            </label>

            {files.length > 0 && (
              <ul className="sv-files" aria-label="Files to work through">
                {files.map((f, i) => (
                  <li key={f.url || f.file.name + i} className={state === "reading" && reading === i + 1 ? "on" : ""}>
                    <span className="sv-thumb">
                      {f.url ? <img src={f.url} alt="" /> : <Icon name="file" size={18} />}
                      <i>{i + 1}</i>
                    </span>
                    <span className="sv-fname">{f.file.name}</span>
                    <button className="sv-x" onClick={() => remove(i)} disabled={busy}
                      aria-label={`Remove ${f.file.name}`}>
                      <Icon name="close" size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="or"><span>or</span></div>

            <div className="glass-stage"><span className="blob b1" aria-hidden="true" /><span className="blob b2" aria-hidden="true" /><span className="blob b3" aria-hidden="true" />
            <div className="notes glass">
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
                  {state === "reading"
                    ? `Reading ${files.length > 1 ? `page ${reading} of ${files.length}` : "the file"}`
                    : files.length ? "Add anything the photos miss" : "One question at a time works best"}
                </span>
                <button className="btn cta" disabled={!ready || busy}
                  onClick={run}>
                  {state === "reading" ? <Loading label={files.length > 1 ? `Reading ${reading} of ${files.length}` : "Reading file"} />
                    : state === "working" ? <Loading label="Working it through" />
                    : "Work it through"}
                </button>
              </div>
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
              <div className="row">
                <AskDwiddleButton context={solutionContext(result)} />
                <button className="btn ghost" onClick={again}>Another question</button>
              </div>
            </div>

            {result.answer && (
              <div className="sv-answer">
                <span className="sv-label">Answer</span>
                <b>{result.answer}</b>
              </div>
            )}

            {early && <div className="card card-pad sv-video">
              <span className="sv-video-icon"><Icon name="video" size={20} /></span>
              <div>
                <b className="small">{video ? "Your video is ready" : "Watch it explained"}</b>
                <p className="small muted" style={{ margin: "2px 0 0" }}>
                  {videoError || "A narrated walk through at a whiteboard, one step at a time, with the transcript beside it."}
                </p>
              </div>
              <button className="btn cta" onClick={explain} disabled={filming}>
                {filming ? <Loading label="Making it" /> : video ? "Watch" : videoError ? "Try again" : "Make the video"}
              </button>
            </div>}
            {filming && <BusyScreen title="Making your video" detail="Planning the scenes, the diagram and what to say at each step. About half a minute." outfit="dj" />}
            {watching && video && (
              <Boundary fallback={({ error }) => {
                setTimeout(() => { setWatching(false); setVideo(null); setVideoError(`That video could not be played (${String(error?.message || error).slice(0, 120)}). Make it again.`); });
                return null;
              }}>
                <VideoPlayer video={video} onClose={() => setWatching(false)} />
              </Boundary>
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

            <div className="card card-pad sv-ask">
              <div>
                <b className="small">Lost on a step, or think something is off?</b>
                <p className="small muted" style={{ margin: "2px 0 0" }}>Dwiddle can see this whole solution. Ask about any part of it.</p>
              </div>
              <AskDwiddleButton context={solutionContext(result)} className="btn" />
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
