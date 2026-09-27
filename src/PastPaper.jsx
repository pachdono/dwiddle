// Past paper practice: a new paper written in the style of a board's real past
// papers (command words, mark allocations, structure), sat against the clock
// like the real thing, then marked against its own mark scheme with feedback
// on every answer and a full marks answer to compare with.

import { useEffect, useState } from "react";
import { Icon, Portal, BusyScreen } from "./ui.jsx";
import { writePastPaper, markPastPaper } from "./ai.js";

const KEY = "dwiddle-pastpaper";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const keep = (v) => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* private mode */ } };
const LENGTHS = [["Short", 6], ["Standard", 10], ["Long", 14]];

// The card on a subject's page: choose topics and a length, then write it.
export function PastPaperCard({ course, subject, canGenerate, onGenerated, onLocked }) {
  const [picked, setPicked] = useState(() => new Set(subject.topics));
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paper, setPaper] = useState(() => { const p = load(); return p?.subject === subject.id ? p : null; });

  const toggle = (t) => setPicked((s) => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });

  async function write() {
    if (!canGenerate()) { onLocked(); return; }
    setBusy(true); setError("");
    try {
      const topics = subject.topics.filter((t) => picked.has(t));
      const p = await writePastPaper({ course: course.name, subject: subject.name, code: subject.code || "", level: course.ages || "" }, topics, count);
      onGenerated();
      const fresh = { ...p, subject: subject.id, course: course.name, subjectName: subject.name, code: subject.code, started: Date.now(), answers: {}, marked: null };
      keep(fresh); setPaper({ ...fresh, open: true });
    } catch (e) {
      setError(e.message || "The paper could not be written.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-pad pp-card">
      {busy && <BusyScreen title="Writing your practice paper" detail={`In the style of ${course.name} ${subject.name}${subject.code ? ` (${subject.code})` : ""} past papers, with a mark scheme`} outfit="graduate" />}
      <div className="spread">
        <div>
          <b>Past paper practice</b>
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            A new paper written in the style of real {course.name} past papers: the same command words, marks and structure.
            Sit it against the clock, then get it marked against its mark scheme.
          </p>
        </div>
        {paper && !paper.marked && <button className="btn" onClick={() => setPaper({ ...paper, open: true })}>Carry on with your paper</button>}
      </div>
      <div className="pp-topics">
        <button className="pp-chip all" onClick={() => setPicked(picked.size === subject.topics.length ? new Set() : new Set(subject.topics))}>
          {picked.size === subject.topics.length ? "Clear all" : "All topics"}
        </button>
        {subject.topics.map((t) => <button key={t} className={"pp-chip" + (picked.has(t) ? " on" : "")} onClick={() => toggle(t)}>{t}</button>)}
      </div>
      <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="seg tight">
          {LENGTHS.map(([n, c]) => <button key={c} className={count === c ? "on" : ""} onClick={() => setCount(c)}>{n} ({c} questions)</button>)}
        </div>
        <button className="btn cta" disabled={!picked.size || busy} onClick={write}><Icon name="exam" size={15} /> Write my paper</button>
      </div>
      {error && <p className="small" style={{ color: "var(--warn)", margin: 0 }}>{error}</p>}
      {paper?.open && <Portal><PaperView paper={paper} onChange={(p) => { keep(p); setPaper(p); }} onClose={() => setPaper({ ...paper, open: false })} onNew={() => { keep(null); setPaper(null); }} /></Portal>}
    </div>
  );
}

function PaperView({ paper, onChange, onClose, onNew }) {
  const total = paper.questions.reduce((n, q) => n + q.marks, 0);
  const [left, setLeft] = useState(() => Math.max(0, paper.minutes * 60 - Math.floor((Date.now() - paper.started) / 1000)));
  const [marking, setMarking] = useState(false);
  const [err, setErr] = useState("");
  const answer = (id, v) => onChange({ ...paper, answers: { ...paper.answers, [id]: v } });

  useEffect(() => {
    if (paper.marked) return;
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [paper.marked]);

  async function submit() {
    const blank = paper.questions.filter((q) => paper.answers[q.id] === undefined || paper.answers[q.id] === "").length;
    if (blank && !confirm(`${blank} question${blank === 1 ? " is" : "s are"} unanswered. Hand the paper in anyway?`)) return;
    setMarking(true); setErr("");
    try {
      const written = paper.questions.filter((q) => q.type !== "mcq");
      const results = written.length ? await markPastPaper(written.map((q) => ({ stem: q.stem, marks: q.marks, scheme: q.scheme, answer: paper.answers[q.id] || "" }))) : [];
      const marked = {};
      paper.questions.forEach((q) => {
        if (q.type === "mcq") marked[q.id] = { awarded: paper.answers[q.id] === q.answer ? q.marks : 0, feedback: paper.answers[q.id] === q.answer ? "Correct." : `The answer is ${String.fromCharCode(65 + q.answer)}.` };
      });
      written.forEach((q, i) => { marked[q.id] = results[i] || { awarded: 0, feedback: "" }; });
      onChange({ ...paper, marked, finished: Date.now() });
      setTimeout(() => document.querySelector(".pp-body")?.scrollTo({ top: 0, behavior: "smooth" }), 50);
    } catch (e) {
      setErr(e.message || "The paper could not be marked. Try again.");
    } finally {
      setMarking(false);
    }
  }

  const scored = paper.marked ? paper.questions.reduce((n, q) => n + (paper.marked[q.id]?.awarded || 0), 0) : 0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");

  return (
    <div className="pp">
      {marking && <BusyScreen title="Marking your paper" detail="Every written answer is checked against the mark scheme." outfit="detective" />}
      <div className="pp-top">
        <button className="icon-btn" onClick={onClose} aria-label="Close the paper"><Icon name="close" size={18} /></button>
        <div className="pp-title">
          <b>{paper.title}</b>
          <span className="small muted">{paper.course} {paper.subjectName}{paper.code ? ` (${paper.code})` : ""} · {total} marks · {paper.minutes} minutes</span>
        </div>
        {!paper.marked
          ? <span className={"pp-clock" + (left < 300 ? " low" : "")}>{left ? `${mm}:${ss}` : "Time is up"}</span>
          : <span className="pp-score">{scored} / {total} <small>{Math.round((scored / total) * 100)}%</small></span>}
      </div>

      <div className="pp-body">
        {paper.marked && (
          <div className="card card-pad pp-result">
            <b>{scored} out of {total} marks, {Math.round((scored / total) * 100)}%</b>
            <p className="small muted" style={{ margin: 0 }}>Go through each question below: what you earned, what the mark scheme wanted, and a full marks answer.</p>
          </div>
        )}
        {paper.questions.map((q, i) => {
          const m = paper.marked?.[q.id];
          const a = paper.answers[q.id];
          return (
            <section key={q.id} className="pp-q">
              <div className="pp-qhead">
                <span className="pp-n">{i + 1}</span>
                <span className="small muted">{q.topic}</span>
                <span className="pp-marks">{m ? `${m.awarded} / ${q.marks}` : `[${q.marks}]`}</span>
              </div>
              <p className="pp-stem">{q.stem}</p>
              {q.type === "mcq" ? (
                <div className="pp-opts">
                  {q.options.map((o, k) => (
                    <button key={k} disabled={!!paper.marked}
                      className={"pp-opt" + (a === k ? " on" : "") + (m && k === q.answer ? " right" : "") + (m && a === k && k !== q.answer ? " wrong" : "")}
                      onClick={() => answer(q.id, k)}>
                      <span>{String.fromCharCode(65 + k)}</span>{o}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea className="pp-answer" rows={Math.min(14, 2 + q.marks * 2)} value={a || ""} disabled={!!paper.marked}
                  placeholder={`Your answer (${q.marks} mark${q.marks === 1 ? "" : "s"})`} onChange={(e) => answer(q.id, e.target.value)} />
              )}
              {m && (
                <div className={"pp-mark" + (m.awarded === q.marks ? " full" : m.awarded ? " part" : " none")}>
                  {m.feedback && <p>{m.feedback}</p>}
                  {q.type !== "mcq" && (
                    <details>
                      <summary>Mark scheme and a full marks answer</summary>
                      <ul>{q.scheme.map((s, k) => <li key={k}>{s}</li>)}</ul>
                      {q.model && <p className="pp-model"><b>Full marks answer: </b>{q.model}</p>}
                    </details>
                  )}
                </div>
              )}
            </section>
          );
        })}
        {err && <p className="small" style={{ color: "var(--warn)" }}>{err}</p>}
        <div className="pp-foot">
          {!paper.marked
            ? <button className="btn cta" onClick={submit}>Hand in and mark</button>
            : <><button className="btn ghost" onClick={onClose}>Close</button><button className="btn cta" onClick={() => { onNew(); }}>Try a new paper</button></>}
        </div>
        <p className="small muted pp-note">Practice papers are written new in the style of the board&apos;s papers. They are not real past papers.</p>
      </div>
    </div>
  );
}
