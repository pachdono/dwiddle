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

import { ready as notifyReady, askOnce as askNotify } from "./notify.js";
import { DwiddleHero } from "./ChatRoom.jsx";
import { Reply } from "./Chat.jsx";
import { useEffect, useState } from "react";
import { solveProblem, writeVideo, drawQuestion, chatWithDwiddle } from "./ai.js";
import { readFile, MAX_FILE, IMAGE } from "./readfile.js";
import { Icon, PageHead, Loading, Boundary } from "./ui.jsx";
import { VideoPlayer, Diagram, voice, NarrationToggle } from "./Video.jsx";
import { LikeImFour } from "./LikeImFour.jsx";
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

// A line of working set like a printed page: fractions stacked, the equals
// signs given room. "3/4", "(x + 1)/2" and "8/9" stand as fractions; units
// like km/h stay as they are.
const FRAC = /(\([^()]+\)|[0-9][0-9.]*[a-zA-Zπ√²³]*|[a-zA-Zπ]|√\d+)\s*\/\s*(\([^()]+\)|[0-9][0-9.]*[a-zA-Zπ√²³]*|[a-zA-Zπ]|√\d+)/g;
function MathLine({ text, inline = false }) {
  const parts = [];
  let last = 0;
  const t = String(text || "");
  for (const m of t.matchAll(FRAC)) {
    const [whole, a, b] = m;
    if (/^[a-zA-Z]{2,}$/.test(a) || /^[a-zA-Z]{2,}$/.test(b)) continue;
    parts.push(t.slice(last, m.index));
    const bare = (x) => (x.startsWith("(") && x.endsWith(")") ? x.slice(1, -1) : x);
    parts.push(<span key={m.index} className="sv-frac"><span>{bare(a)}</span><span>{bare(b)}</span></span>);
    last = m.index + whole.length;
  }
  parts.push(t.slice(last));
  const out = parts.map((p, i) => (typeof p === "string" ? p.split(/(=)/).map((q, k) => (q === "=" ? <span key={i + "e" + k} className="sv-eq">=</span> : q)) : p));
  return inline ? <>{out}</> : <div className="sv-mline">{out}</div>;
}

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
  const [voicing, setVoicing] = useState(null); // { done, total } while the narration is recorded
  const [videoError, setVideoError] = useState("");
  // The question's own diagram, drawn after it is solved (testers): shown
  // under the question, and used unchanged in its video.
  const [drawn, setDrawn] = useState(null); // null | "drawing" | { figure, diagram } | "none"

  async function explain() {
    if (video) { setWatching(true); return; }
    setFilming(true);
    setVideoError("");
    try {
      const made = await writeVideo({ solution: result, problem, ...(drawn?.figure ? { figure: drawn.figure } : {}) });
      // The narration is recorded before Watch appears, so the video plays
      // with its voice from the first second.
      setVoicing({ done: 0, total: 0 });
      await voice(made, (done, total) => setVoicing({ done, total }));
      setVideo(made);
      notifyReady("Your video is ready", made?.title || "Tap to watch it.", "/solve");
    } catch (err) {
      setVideoError(err.message || "The video could not be made.");
    } finally {
      setVoicing(null);
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
    askNotify();
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
      notifyReady("Solved!", "Dwiddle has worked your question through, step by step.", "/solve");
      if (early) {
        setDrawn("drawing");
        drawQuestion({ problem: parts.join("\n\n"), solution: { asked: data.asked, answer: data.answer } })
          .then((d) => setDrawn(d?.figure && d.diagram ? d : "none"));
      }
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
    setDrawn(null);
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

            {early ? (
              <div className="sv-chat">
                <DwiddleHero size={96}
                  mood={busy ? "thinking" : state === "error" ? "oops" : "idle"}
                  say={state === "reading" ? "Reading your question..." : state === "working" ? "Working it through, step by step..."
                    : files.length ? "Got it! Add anything the photo misses, then send." : text.trim() ? "Ooh, let me see..." : "What are you stuck on? Ask me like you'd ask a friend."} />
                <form className="cr-input sv-composer" onSubmit={(e) => { e.preventDefault(); if (ready && !busy) run(); }}>
                  <textarea rows={1} value={text} disabled={busy}
                    placeholder="Type or paste the question, with any numbers and what it asks for"
                    onChange={(e) => {
                      setText(e.target.value);
                      e.target.style.height = "";
                      e.target.style.height = Math.min(220, e.target.scrollHeight) + "px";
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (ready && !busy) run(); } }} />
                  <button type="submit" className="cr-send" disabled={!ready || busy} aria-label="Work it through"><Icon name="arrow" size={18} /></button>
                </form>
                <span className="small muted sv-chat-foot">Enter to send, Shift and Enter for a new line. One question at a time works best.</span>
              </div>
            ) : (
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
            )}
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

        {state === "done" && result && early && text.trim() && (
          <div className="sv-asked-chat"><div className="cr-msg me"><p>{text.trim()}</p></div></div>
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
                  {videoError || (filming
                    ? voicing ? `Recording the narration${voicing.total ? `, ${voicing.done} of ${voicing.total} lines` : ""}. The button turns to Watch when it is ready.`
                      : "Being made in the background, about half a minute. Keep reading; the button turns to Watch when it is ready."
                    : video ? "Tap Watch whenever you are ready." : "A narrated walk through at a whiteboard, one step at a time, with the transcript beside it.")}
                </p>
              </div>
              {!video && !filming && <NarrationToggle />}
              <button className={"btn cta" + (video && !watching ? " sv-ready" : "")} onClick={explain} disabled={filming}>
                {filming ? <Loading label="Making it" /> : video ? "Watch" : videoError ? "Try again" : "Make the video"}
              </button>
            </div>}
            {watching && video && (
              <Boundary fallback={({ error }) => {
                setTimeout(() => { setWatching(false); setVideo(null); setVideoError(`That video could not be played (${String(error?.message || error).slice(0, 120)}). Make it again.`); });
                return null;
              }}>
                <VideoPlayer video={video} onClose={() => setWatching(false)} />
              </Boundary>
            )}

            {early && <LikeImFour context={`A question the student asked to have solved: ${problem}\nThe worked solution:\n${result.steps.map((s, i) => `${i + 1}. ${s.do}${s.work ? ` (${s.work})` : ""}${s.why ? `: ${s.why}` : ""}`).join("\n")}\nAnswer: ${result.answer || ""}${result.idea ? `\nWhat it is really testing: ${result.idea}` : ""}`} />}

            {early ? (
              <>
                {drawn && drawn !== "none" && (
                  <div className="card sv-drawn">
                    <span className="sv-label">Your question, drawn</span>
                    {drawn === "drawing"
                      ? <div className="sv-drawn-wait"><Loading label="Drawing the diagram" /></div>
                      : <Diagram d={drawn.diagram} line={99} />}
                  </div>
                )}
                <ol className="sv2-steps">
                  {result.steps.map((s, i) => (
                    <li key={i} className="sv2-step" style={{ animationDelay: `${i * 70}ms` }}>
                      <div className="sv2-head">
                        <span className="sv2-n">{i + 1}</span>
                        <div>
                          <b>{s.do}</b>
                          {s.say && <p className="sv2-say">{s.say}</p>}
                        </div>
                      </div>
                      {s.rule && <div className="sv2-rule"><span>Uses</span>{s.rule}</div>}
                      {(s.lines?.length ? s.lines : s.work ? s.work.split(/\n+/) : []).length > 0 && (
                        <div className="sv2-math">
                          {(s.lines?.length ? s.lines : s.work.split(/\n+/)).map((l, k) => <MathLine key={k} text={l} />)}
                        </div>
                      )}
                      {s.why && <p className="sv2-why"><span aria-hidden="true">💡</span><span><b>Why this works: </b>{s.why}</span></p>}
                    </li>
                  ))}
                </ol>
                {result.answer && (
                  <div className="sv2-final">
                    <span>So the answer is</span>
                    <b><MathLine text={result.answer} inline /></b>
                  </div>
                )}
              </>
            ) : (
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
            )}

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

            {early ? <FollowUp context={solutionContext(result)} onVideo={explain} hasVideo={!!video} filming={filming} /> : (
            <div className="card card-pad sv-ask">
              <div>
                <b className="small">Lost on a step, or think something is off?</b>
                <p className="small muted" style={{ margin: "2px 0 0" }}>Dwiddle can see this whole solution. Ask about any part of it.</p>
              </div>
              <AskDwiddleButton context={solutionContext(result)} className="btn" />
            </div>
            )}

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

// Questions about the solution, answered right under it like a chat, with
// the whole solution as what Dwiddle is looking at.
function FollowUp({ context, onVideo, hasVideo, filming }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState("idle");
  async function send(raw) {
    const q = String(raw ?? text).trim();
    if (!q || busy) return;
    setText("");
    const history = [...msgs, { role: "user", content: q }];
    setMsgs(history);
    setBusy(true);
    setMood("thinking");
    try {
      const reply = await chatWithDwiddle(context, history);
      setMsgs([...history, { role: "assistant", content: reply }]);
      setMood("jump");
      setTimeout(() => setMood("idle"), 1200);
    } catch (err) {
      setMsgs([...history, { role: "assistant", content: err.message || "I couldn't answer just now. Try again?", note: true }]);
      setMood("oops");
      setTimeout(() => setMood("idle"), 1500);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="card card-pad sv-follow">
      <div className="sv-follow-head">
        <DwiddleHero size={64} mood={mood} say={busy ? "Thinking..." : msgs.length ? "" : "Lost on a step? Ask me anything about it."} />
      </div>
      {msgs.map((m, i) => (
        <div key={i} className={"cr-msg " + (m.role === "user" ? "me" : "bot") + (m.note ? " note" : "")}>
          {m.role === "assistant" ? <Reply text={m.content} /> : <p>{m.content}</p>}
        </div>
      ))}
      {busy && <div className="cr-msg bot typing"><i /><i /><i /></div>}
      <div className="cr-acts">
        {["Why that first step?", "Explain it more simply", "Give me a similar question"].map((c) => <button key={c} onClick={() => send(c)} disabled={busy}>{c}</button>)}
        <button onClick={onVideo} disabled={filming}><Icon name="video" size={14} /> {hasVideo ? "Watch the video" : filming ? "Making the video..." : "Make a video"}</button>
      </div>
      <form className="cr-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea rows={1} value={text} placeholder="Ask about any step..." onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button type="submit" className="cr-send" disabled={!text.trim() || busy} aria-label="Send"><Icon name="arrow" size={18} /></button>
      </form>
    </div>
  );
}
