// Learning a topic, one idea at a time.
//
// Every other page tests what you already know. This one teaches it first.
// Each topic in the material becomes a short lesson: a run of cards, one idea
// each, with the key terms defined where they first appear, then two quick
// checks. It fills the screen while it runs, because a lesson read beside a
// sidebar and a list of other things to do is a lesson half read.

import { VisualFor } from "./QuestionPicture.jsx";
import { spreadAnswers } from "./mathText.js";
import { M } from "./MathText.jsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { sayAs, stopSpeaking } from "./tts.js";
import { Icon, PageHead, Portal } from "./ui.jsx";
import { Duck, DuckSitting } from "./Duck.jsx";
import { writeLesson } from "./lessons.js";
import { QuestionView, isDrill } from "./Questions.jsx";
import { AskDwiddleButton } from "./Chat.jsx";

// What Dwiddle is told about the lesson step on screen.
function stepContext(name, step, lesson) {
  const outline = (lesson?.cards || []).map((c) => c.heading).join("; ");
  const head = `A lesson on "${name}". Its cards: ${outline}.`;
  if (!step) return head;
  if (step.type === "card") {
    return `${head}\nThe card on screen: ${step.heading}. ${plain(step.body)} ${
      (step.points || []).map((p) => `${p.lead}: ${p.text}`).join(" ")} ${step.example ? "Example: " + step.example : ""}`;
  }
  if (step.type === "check") {
    return `${head}\nA quick check: ${step.q}\nOptions: ${step.choices.join(" | ")}\nCorrect: ${step.choices[step.answer]}\nWhy: ${step.why}`;
  }
  if (step.type === "drill") {
    const q = step.q;
    return `${head}\nA ${q.type} question: ${q.q}\nExpected answer: ${q.answer ?? (q.items || []).join(" > ")}${
      q.pairs ? q.pairs.map((p) => `${p.a} = ${p.b}`).join("; ") : ""}`;
  }
  return head;
}

export function Learn({ made, go, setTopic, saveLesson, finishLesson }) {
  const [open, setOpen] = useState(null); // topic name being taught

  const topics = made?.topics || [];
  const lessons = made?.lessons || {};

  if (!topics.length) {
    return (
      <div className="page fade">
        <PageHead title="Learn" sub="Every topic in your material as a short lesson, one idea at a time." />
        <div className="card card-pad" style={{ textAlign: "center", padding: 44 }}>
          <Duck size={84} outfit="graduate" />
          <b style={{ display: "block", marginTop: 10 }}>Nothing to learn yet</b>
          <p className="muted small" style={{ margin: "6px auto 18px", maxWidth: 400 }}>
            Add your notes, or pick a course topic, and every topic in it becomes a lesson here.
          </p>
          <button className="btn" onClick={() => go("upload")}>
            <Icon name="upload" size={14} /> Add material
          </button>
        </div>
      </div>
    );
  }

  const done = topics.filter((t) => lessons[t.name]?.done).length;
  const index = topics.findIndex((t) => t.name === open);

  return (
    <div className="page fade">
      <PageHead
        title="Learn"
        sub={`${topics.length} lesson${topics.length === 1 ? "" : "s"} from ${made?.title || "your material"}. ${
          done ? `${done} finished.` : "Start anywhere."}`}
      />

      <div className="ln-list">
        {topics.map((t, i) => {
          const l = lessons[t.name];
          const status = l?.done ? "done" : l ? "ready" : "new";
          return (
            <button key={t.name} className={"ln-item " + status} onClick={() => setOpen(t.name)}
              style={{ "--i": i }}>
              <span className="ln-num">{l?.done ? <Icon name="check" size={15} /> : i + 1}</span>
              <span className="ln-text">
                <b>{t.name}</b>
                <span>{t.reason}</span>
              </span>
              <span className="ln-go">
                {status === "done" ? "Review" : status === "ready" ? "Continue" : "Start"}
                <Icon name="arrow" size={14} />
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <Player
          key={open}
          made={made}
          name={open}
          saved={lessons[open]}
          next={topics[index + 1]?.name || null}
          onClose={() => setOpen(null)}
          onNext={(n) => setOpen(n)}
          onPractice={() => { setTopic(open); setOpen(null); go("quiz"); }}
          saveLesson={saveLesson}
          finishLesson={finishLesson}
        />
      )}
    </div>
  );
}

// "**term** (what it means)" becomes the term in bold. Nothing else in the
// text is treated as markup.
function Rich({ text }) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => p.startsWith("**") && p.endsWith("**")
    ? <b key={i}><M t={p.slice(2, -2)} /></b>
    : <span key={i}><M t={p} /></span>);
}

const plain = (s) => String(s || "").replace(/\*\*/g, "");

// Read aloud with the voice already on the device. It costs nothing, needs no
// connection once the page is open, and English voices are on every system
// that ships this app.
function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = useCallback(() => {
    if (!supported) return;
    stopSpeaking();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback((text) => {
    if (!supported) return;
    setSpeaking(true);
    sayAs("dwiddle", text, { onEnd: () => setSpeaking(false) });
  }, [supported]);

  useEffect(() => stop, [stop]);
  return { supported, speaking, speak, stop };
}

function Player({ made, name, saved, next, onClose, onNext, onPractice, saveLesson, finishLesson }) {
  const [lesson, setLesson] = useState(saved?.cards ? saved : null);
  const [error, setError] = useState("");
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState({}); // step index -> chosen option
  const voice = useSpeech();
  const started = useRef(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const l = await writeLesson(made, name);
      setLesson(l);
      saveLesson(name, l);
    } catch (err) {
      setError(err.message || "The lesson could not be written.");
    }
  }, [made, name, saveLesson]);

  useEffect(() => {
    if (lesson || started.current) return;
    started.current = true;
    load();
  }, [lesson, load]);

  // The page underneath stops scrolling while the lesson is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // what the cards say, for drawing the graph or diagram a check refers to
  const lessonText = lesson ? lesson.cards.map((c) => `${c.heading}. ${c.body || ""} ${(c.points || []).map((p) => `${p.lead} ${p.text}`).join(" ")} ${c.example || ""}`).join("\n").slice(0, 3500) : "";
  const steps = lesson ? [
    ...lesson.cards.map((c) => ({ type: "card", ...c })),
    ...(lesson.checks || []).map((q) => (isDrill(q) ? { type: "drill", q } : { ...spreadAnswers(q), type: "check" })),
    { type: "end" },
  ] : [];
  const step = steps[at];
  const total = steps.length - 1; // the finish screen is not a step
  const answered = (step?.type !== "check" && step?.type !== "drill") || picked[at] !== undefined;
  // The other kinds report right or wrong themselves; the open ones by the
  // student's own honest call against a full marks answer.
  const right = steps.filter((s, i) =>
    (s.type === "check" && picked[i] === s.answer) || (s.type === "drill" && picked[i] === true)).length;
  const checks = steps.filter((s) => s.type === "check" || s.type === "drill").length;

  const forward = useCallback(() => {
    if (!step || !answered || at >= steps.length - 1) return;
    voice.stop();
    const to = at + 1;
    setAt(to);
    if (steps[to]?.type === "end") finishLesson(name);
  }, [step, answered, at, steps, voice, finishLesson, name]);

  const back = useCallback(() => {
    if (at === 0) return;
    voice.stop();
    setAt(at - 1);
  }, [at, voice]);

  const choose = useCallback((i) => {
    if (step?.type !== "check" || picked[at] !== undefined) return;
    setPicked((p) => ({ ...p, [at]: i }));
  }, [step, picked, at]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (e.key === "Escape") { voice.stop(); onClose(); }
      else if (e.key === "Enter") { e.preventDefault(); forward(); }
      else if (e.key === "ArrowRight") forward();
      else if (e.key === "ArrowLeft") back();
      else if (step?.type === "check" && /^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [forward, back, choose, onClose, step, voice]);

  function listen() {
    if (voice.speaking) { voice.stop(); return; }
    if (!step) return;
    if (step.type === "card") {
      voice.speak([
        step.heading,
        plain(step.body),
        ...(step.points || []).map((p) => `${p.lead}. ${p.text}`),
        step.example,
      ].filter(Boolean).join(". "));
    } else if (step.type === "check") {
      voice.speak([step.q, ...step.choices.map((c, i) => `${"ABCD"[i]}. ${c}`)].join(". "));
    } else if (step.type === "drill") {
      voice.speak(String(step.q.q).replace(/_{3,}/g, "blank"));
    }
  }

  return (
    <Portal>
    <div className={"lp" + (document.querySelector(".is-mac") ? " on-mac" : "")}
      role="dialog" aria-modal="true" aria-label={`Lesson: ${name}`}>
      <div className="lp-top">
        <div className="lp-bar">
          <button className="lp-x" onClick={() => { voice.stop(); onClose(); }} aria-label="Close the lesson">
            <Icon name="close" size={18} />
          </button>
          <span className="lp-where">
            {name}{lesson && step?.type !== "end" ? <> · {Math.min(at + 1, total)} of {total}</> : null}
          </span>
        </div>
        <div className="lp-progress" aria-hidden="true">
          <span style={{ width: `${lesson ? (Math.min(at + 1, total) / Math.max(1, total)) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="lp-stage">
        {!lesson && !error && (
          <div className="lp-wait fade">
            <DuckSitting size={150} />
            <h2>Writing your lesson</h2>
            <p>On <b>{name}</b>, one idea at a time. This takes up to half a minute, and only happens the first time.</p>
            <div className="lp-dots" aria-hidden="true"><i /><i /><i /></div>
          </div>
        )}

        {error && (
          <div className="lp-wait fade">
            <Duck size={96} outfit="pirate" />
            <h2>That lesson did not come through</h2>
            <p>{error}</p>
            <button className="btn cta" onClick={load}>Try again</button>
          </div>
        )}

        {step?.type === "card" && (
          <article className="lp-card" key={at}>
            <h2>{step.heading}</h2>
            <p className="lp-body"><Rich text={step.body} /></p>
            {step.points?.length > 0 && (
              <ul className="lp-points">
                {step.points.map((p, i) => (
                  <li key={i} style={{ "--i": i }}>
                    {p.lead && <b>{p.lead}: </b>}<Rich text={p.text} />
                  </li>
                ))}
              </ul>
            )}
            {step.example && (
              <div className="lp-example"><span className="lp-example-label">For example</span><p><Rich text={step.example} /></p></div>
            )}
          </article>
        )}

        {step?.type === "check" && (
          <article className="lp-card" key={at}>
            <span className="lp-kicker">Quick check</span>
            <h2><M t={step.q} /></h2>
            <VisualFor q={step} context={lessonText} />
            <div className="lp-options">
              {step.choices.map((c, i) => {
                const chosen = picked[at];
                const state = chosen === undefined ? ""
                  : i === step.answer ? " right"
                  : i === chosen ? " wrong" : " dim";
                return (
                  <button key={i} className={"lp-opt" + state} onClick={() => choose(i)}
                    disabled={chosen !== undefined}>
                    <i>{"ABCD"[i]}</i><span><M t={c} /></span>
                  </button>
                );
              })}
            </div>
            {picked[at] !== undefined && (
              <div className={"lp-why " + (picked[at] === step.answer ? "right" : "wrong")}>
                <b>{picked[at] === step.answer ? "Correct." : "Not quite."}</b> {step.why}
              </div>
            )}
          </article>
        )}

        {step?.type === "drill" && (
          <article className="lp-card" key={at}>
            <VisualFor q={step.q} context={lessonText} />
            <QuestionView big q={step.q} onDone={(ok) => setPicked((p) => ({ ...p, [at]: ok }))} />
          </article>
        )}

        {step?.type === "end" && (
          <div className="lp-wait lp-end fade">
            <DuckSitting size={150} />
            <h2>Lesson finished</h2>
            <p>
              {checks === 1
                ? `You got ${right ? "the check" : "the check wrong, which is what it is for"}${right ? " right" : ""}. It is in your practice questions now, with the rest of this topic.`
                : checks
                  ? `You got ${right} of ${checks} questions right. They are in your practice now, with the rest of this topic.`
                  : "Practise it now while it is fresh."}
            </p>
            <div className="lp-end-actions">
              <button className="btn cta" onClick={onPractice}>Practise this topic</button>
              {next && <button className="btn ghost" onClick={() => onNext(next)}>Next lesson: {next}</button>}
              <button className="btn ghost" onClick={onClose}>Back to Learn</button>
            </div>
          </div>
        )}
      </div>

      {lesson && step?.type !== "end" && (
        <div className="lp-foot">
          <div className="lp-foot-in">
            <div className="lp-left">
              {voice.supported && (
                <button className={"lp-listen" + (voice.speaking ? " on" : "")} onClick={listen}>
                  <span className="lp-wave" aria-hidden="true"><i /><i /><i /><i /></span>
                  {voice.speaking ? "Stop" : "Listen"}
                </button>
              )}
              {at > 0 && <button className="lp-back" onClick={back}>Back</button>}
              <AskDwiddleButton context={stepContext(name, step, lesson)} className="lp-back lp-ask" label="Ask" />
            </div>
            <button className="lp-continue" onClick={forward} disabled={!answered}>
              Continue <kbd aria-hidden="true">↵</kbd>
            </button>
          </div>
        </div>
      )}
    </div>
    </Portal>
  );
}
