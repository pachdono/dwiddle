// The kinds of question beyond plain multiple choice.
//
// Each one practises recall a different way, because a student who can pick a
// definition out of four has not necessarily learnt it. Filling in a blank
// asks for the word itself; completing a word from its first letters is a
// gentler version of the same; matching tests that the terms are not muddled
// with each other; ordering tests a process; true or false with a correction
// catches the confident misconception; finishing a sentence and writing an
// answer ask for the idea in the student's own words.
//
// Everything that has a single right answer is marked here. The two open ones,
// finish and written, show a full marks answer and the student marks
// themselves against it, because a program deciding whether a paragraph is
// right would be wrong often enough to teach the wrong thing.
//
// One component renders them all so Learn and Practice behave the same.

import { M } from "./MathText.jsx";
import { useMemo, useState } from "react";
import { Icon } from "./ui.jsx";
import { markLong, judgeAnswer } from "./ai.js";
import { sameAnswer } from "./answers.js";

export const KINDS = ["blank", "word", "finish", "match", "order", "tf", "written", "long"];
export const isDrill = (q) => q && KINDS.includes(q.type);

export const KIND_LABEL = {
  blank: "Fill in the blank",
  word: "Complete the word",
  finish: "Finish the sentence",
  match: "Match them up",
  order: "Put them in order",
  tf: "True or false",
  written: "In your own words",
  long: "Long answer",
};

/* ---------- marking ---------- */

export { sameAnswer };

// Stable shuffle, so re-rendering does not reorder what is on screen.
function shuffled(list, seed) {
  let s = [...String(seed)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) || 1;
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ---------- the view ---------- */

// onDone(correct) is called once, when the question is settled.
export function QuestionView({ q, onDone, big = false }) {
  const [result, setResult] = useState(null); // null | true | false
  const settle = (ok, extra) => {
    if (result !== null) return;
    setResult(ok);
    onDone?.(ok, extra);
  };
  const props = { q, result, settle, big };
  return (
    <div className={"qv" + (big ? " big" : "")}>
      <span className="qv-kind">{KIND_LABEL[q.type]}</span>
      {q.type === "blank" && <Blank {...props} />}
      {q.type === "word" && <Word {...props} />}
      {(q.type === "finish" || q.type === "written") && <Open {...props} />}
      {q.type === "long" && <Long {...props} />}
      {q.type === "match" && <Match {...props} />}
      {q.type === "order" && <Order {...props} />}
      {q.type === "tf" && <TrueFalse {...props} />}
    </div>
  );
}

function Verdict({ ok, children }) {
  return (
    <div className={"qv-why " + (ok ? "right" : "wrong")}>
      <b>{ok ? "Correct." : "Not quite."}</b> {children}
    </div>
  );
}

function Blank({ q, result, settle }) {
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [same, setSame] = useState(false); // counted because it means the same
  const [before, after] = String(q.q).split(/_{3,}/);
  const answers = [q.answer, ...(q.accept || [])];
  // Quick matching first (spelling, order, "2nd" for "second"); if that says no,
  // a short check asks whether it means the same thing before it is marked wrong.
  const check = async () => {
    const g = value.trim();
    if (!g || checking || result !== null) return;
    if (sameAnswer(g, answers)) return settle(true);
    setChecking(true);
    const ok = await judgeAnswer({ q: String(q.q).replace(/_{3,}/, "___"), answer: q.answer, accept: q.accept || [], given: g }).catch(() => false);
    setChecking(false);
    if (ok) setSame(true);
    settle(!!ok);
  };
  return (
    <>
      <p className="qv-sentence">
        <M t={before} />
        <input className={"qv-gap" + (result === null ? "" : result ? " right" : " wrong")}
          value={value} onChange={(e) => setValue(e.target.value)} disabled={result !== null || checking}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); check(); } }}
          style={{ width: `${Math.max(6, String(q.answer).length + 2)}ch` }} autoFocus aria-label="The missing word" />
        <M t={after} />
      </p>
      {result === null
        ? <button className="btn cta qv-check" onClick={check} disabled={!value.trim() || checking}>{checking ? "Checking your answer..." : "Check"}</button>
        : <Verdict ok={result}>{result ? <>{same && <>Worded differently from <b>{q.answer}</b>, but it means the same, so it counts. </>}{q.why}</> : <>It is <b>{q.answer}</b>. <M t={q.why} /></>}</Verdict>}
    </>
  );
}

function Word({ q, result, settle }) {
  const word = String(q.answer);
  const shown = Math.min(word.length - 1, Math.max(1, q.shown ?? Math.ceil(word.length / 3)));
  const given = word.slice(0, shown);
  const [rest, setRest] = useState("");
  const check = () => rest.trim() && settle(sameAnswer(given + rest.trim(), [word]));
  return (
    <>
      <h3 className="qv-q"><M t={q.q} /></h3>
      <div className="qv-word">
        <b>{given}</b>
        <input value={rest} onChange={(e) => setRest(e.target.value.replace(/\s/g, ""))}
          disabled={result !== null} maxLength={word.length - shown + 3} autoFocus
          className={result === null ? "" : result ? "right" : "wrong"}
          placeholder={"_".repeat(word.length - shown)} aria-label={`The rest of the word after ${given}`}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); check(); } }} />
        <span className="qv-count">{word.length} letters</span>
      </div>
      {result === null
        ? <button className="btn cta qv-check" onClick={check} disabled={!rest.trim()}>Check</button>
        : <Verdict ok={result}>{result ? q.why : <>It is <b>{word}</b>. <M t={q.why} /></>}</Verdict>}
    </>
  );
}

function Open({ q, result, settle }) {
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  return (
    <>
      <h3 className="qv-q"><M t={q.q} /></h3>
      <textarea className="qv-write" value={text} readOnly={shown} onChange={(e) => setText(e.target.value)}
        placeholder={q.type === "finish" ? "Finish it in your own words." : "Write your answer. A few sentences is plenty."}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setShown(true); } }} />
      {!shown ? (
        <div className="qv-row">
          <button className="btn cta" onClick={() => setShown(true)} disabled={!text.trim()}>Check my answer</button>
          <button className="btn ghost" onClick={() => setShown(true)}>Show the answer</button>
        </div>
      ) : (
        <div className="qv-model fade">
          <span className="qv-label">A full marks answer</span>
          <p><M t={q.answer} /></p>
          {q.points?.length > 0 && (
            <>
              <span className="qv-label">What the examiner looks for</span>
              <ul>{q.points.map((p, i) => <li key={i}><M t={p} /></li>)}</ul>
            </>
          )}
          <div className="qv-self">
            <span>Did yours have all of that?</span>
            <button className={"qv-pill" + (result === true ? " on right" : "")} onClick={() => settle(true)}
              disabled={result !== null}><Icon name="check" size={14} /> Yes</button>
            <button className={"qv-pill" + (result === false ? " on wrong" : "")} onClick={() => settle(false)}
              disabled={result !== null}>Not quite</button>
          </div>
        </div>
      )}
    </>
  );
}

// A few marks' worth of writing. The answer is marked against the mark scheme
// by the examiner prompt on the server; if that cannot be reached, the student
// compares with the scheme and marks themselves instead. Two thirds of the
// marks counts as right for the streak and the report.
function Long({ q, result, settle }) {
  const [text, setText] = useState("");
  const [state, setState] = useState("write"); // write | marking | marked | self
  const [got, setGot] = useState(null);
  const [model, setModel] = useState(false);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  async function mark() {
    setState("marking");
    try {
      const r = await markLong(q, text);
      if (!r) throw new Error("no mark");
      setGot(r);
      setState("marked");
      settle(r.awarded / q.marks >= 2 / 3, { awarded: r.awarded, marks: q.marks });
    } catch { setState("self"); }
  }
  return (
    <>
      <h3 className="qv-q"><M t={q.q} /></h3>
      <span className="qv-marks">{q.marks} marks</span>
      <textarea className="qv-write long" value={text} readOnly={state !== "write"} onChange={(e) => setText(e.target.value)}
        placeholder="Write your answer. Aim for a point for each mark, with the reason behind it." />
      {state === "write" && (
        <div className="qv-row">
          <button className="btn cta" onClick={mark} disabled={words < 3}>Mark my answer</button>
          <button className="btn ghost" onClick={() => setState("self")}>Show the mark scheme</button>
          <span className="small muted">{words} word{words === 1 ? "" : "s"}</span>
        </div>
      )}
      {state === "marking" && <p className="small muted">Marking against the scheme...</p>}
      {(state === "marked" || state === "self") && (
        <div className="qv-model fade">
          {state === "marked" && got && (
            <div className={"qv-score " + (got.awarded / q.marks >= 2 / 3 ? "right" : "wrong")}>
              <b>{got.awarded} / {q.marks}</b> <span>{got.feedback}</span>
            </div>
          )}
          <span className="qv-label">Likely mark scheme, one mark each</span>
          <ul>{q.scheme.map((p, i) => <li key={i}><M t={p} /></li>)}</ul>
          {model
            ? <><span className="qv-label">A full marks answer</span><p><M t={q.answer} /></p></>
            : <button className="btn ghost" onClick={() => setModel(true)}>Show the model answer</button>}
          {state === "self" && (
            <div className="qv-self">
              <span>Did yours earn at least {Math.ceil(q.marks * 2 / 3)} of the {q.marks} marks?</span>
              <button className={"qv-pill" + (result === true ? " on right" : "")} onClick={() => settle(true)} disabled={result !== null}><Icon name="check" size={14} /> Yes</button>
              <button className={"qv-pill" + (result === false ? " on wrong" : "")} onClick={() => settle(false)} disabled={result !== null}>Not quite</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// Matching as a set of cards. Pick a card on either side, then its partner on
// the other side, in either order. A right pair lights up and settles; a wrong
// one shakes and lets go, and the slip is counted. Both sides are shuffled, so
// the cards are never lined up with their partners.
function Match({ q, result, settle }) {
  const pairs = q.pairs || [];
  const left = useMemo(() => shuffled(pairs.map((p, i) => ({ i, t: p.a })), (q.id || q.q) + ":a"), [q]);
  const right = useMemo(() => {
    let r = shuffled(pairs.map((p, i) => ({ i, t: p.b })), (q.id || q.q) + ":b");
    // never the same order as the left, where that can be avoided
    if (r.length > 1 && r.every((x, k) => x.i === left[k].i)) r = [...r.slice(1), r[0]];
    return r;
  }, [q, left]);
  const [pick, setPick] = useState(null);   // { side: "a" | "b", i }
  const [done, setDone] = useState([]);     // pair numbers matched
  const [hit, setHit] = useState(null);     // pair number mid celebration
  const [shake, setShake] = useState(null); // { a, b } mid wrong
  const [miss, setMiss] = useState(0);
  const busy = hit !== null || shake !== null;

  function choose(side, i) {
    if (result !== null || busy || done.includes(i)) return;
    if (!pick || pick.side === side) { setPick(pick && pick.side === side && pick.i === i ? null : { side, i }); return; }
    const a = side === "a" ? i : pick.i, b = side === "b" ? i : pick.i;
    if (a === b) {
      setHit(a); setPick(null);
      setTimeout(() => {
        const next = [...done, a];
        setDone(next); setHit(null);
        if (next.length === pairs.length) settle(miss === 0);
      }, 650);
    } else {
      setMiss((m) => m + 1);
      setShake({ a, b }); setPick(null);
      setTimeout(() => setShake(null), 520);
    }
  }
  const state = (side, i) => (done.includes(i) ? " done" : hit === i ? " hit" : shake && (side === "a" ? shake.a === i : shake.b === i) ? " shake" : pick && pick.side === side && pick.i === i ? " held" : pick && pick.side !== side ? " ready" : "");

  return (
    <>
      <h3 className="qv-q">{q.q || "Match each one to its meaning"}</h3>
      <div className="mt-meter" aria-hidden="true"><i style={{ width: `${(done.length / Math.max(1, pairs.length)) * 100}%` }} /></div>
      <div className="mt" role="group" aria-label="Matching cards">
        {[["a", left], ["b", right]].map(([side, list]) => (
          <div key={side} className={"mt-col " + side}>
            {list.map(({ i, t }, k) => (
              <button key={i} type="button" style={{ "--k": k }} className={"mt-card " + side + state(side, i)}
                onClick={() => choose(side, i)} disabled={result !== null || done.includes(i)}>
                <span className="mt-t"><M t={t} /></span>
                {done.includes(i) && <span className="mt-tick" aria-hidden="true"><Icon name="check" size={16} /></span>}
              </button>
            ))}
          </div>
        ))}
      </div>
      {result === null
        ? <p className="qv-hint">{done.length ? `${done.length} of ${pairs.length} matched. ` : ""}{!pick ? "Tap a card on either side, then its partner." : "Now tap its partner on the other side."}</p>
        : <Verdict ok={result}>{result ? (q.why || "All matched first time.") : `All matched, with ${miss} slip${miss === 1 ? "" : "s"} on the way. ${q.why || ""}`}</Verdict>}
    </>
  );
}

function Order({ q, result, settle }) {
  const items = q.items || [];
  const mixed = useMemo(() => {
    let m = shuffled(items.map((t, i) => ({ t, i })), q.id || q.q);
    if (m.every((x, k) => x.i === k)) m = [...m.slice(1), m[0]];
    return m;
  }, [q]);
  const [seq, setSeq] = useState([]);
  const placed = new Set(seq);
  const full = seq.length === items.length;
  return (
    <>
      <h3 className="qv-q">{q.q || "Put these in the right order"}</h3>
      <ol className="qv-order">
        {seq.map((i, k) => (
          <li key={i} className={result === null ? "" : i === k ? "right" : "wrong"}>
            <i>{k + 1}</i><span>{items[i]}</span>
            {result === null && <button className="qv-undo" onClick={() => setSeq(seq.filter((x) => x !== i))} aria-label="Take it back">×</button>}
          </li>
        ))}
      </ol>
      {result === null && (
        <div className="qv-pool">
          {mixed.filter((x) => !placed.has(x.i)).map((x) => (
            <button key={x.i} className="qv-tile" onClick={() => setSeq([...seq, x.i])}><M t={x.t} /></button>
          ))}
        </div>
      )}
      {result === null
        ? <button className="btn cta qv-check" disabled={!full} onClick={() => settle(seq.every((i, k) => i === k))}>Check the order</button>
        : <Verdict ok={result}>{result ? (q.why || "That is the order.") : <>The order is: {items.join(", then ")}. <M t={q.why} /></>}</Verdict>}
    </>
  );
}

function TrueFalse({ q, result, settle }) {
  const [chose, setChose] = useState(null);
  const pick = (v) => { if (result !== null) return; setChose(v); settle(v === !!q.answer); };
  return (
    <>
      <h3 className="qv-q"><M t={q.q} /></h3>
      <div className="qv-tf">
        {[true, false].map((v) => (
          <button key={String(v)} onClick={() => pick(v)} disabled={result !== null}
            className={"qv-tfbtn" + (result === null ? "" : v === !!q.answer ? " right" : chose === v ? " wrong" : " dim")}>
            {v ? "True" : "False"}
          </button>
        ))}
      </div>
      {result !== null && (
        <Verdict ok={result}>
          {!q.answer && q.correction ? <>It is false: {q.correction} </> : null}<M t={q.why} />
        </Verdict>
      )}
    </>
  );
}

/* ---------- drills made from what already exists ---------- */

// Material made before these kinds existed still gets some of them. A vocab
// question already holds a term and its definition, which is exactly what
// completing a word and matching need, so nothing has to be written by a
// model, and nothing can be wrong that was not wrong already.
export function derivedDrills(questions) {
  const vocab = questions.filter((q) => q.kind === "vocab" && q.term && Array.isArray(q.choices));
  const out = [];
  vocab.forEach((q) => {
    const term = String(q.term).trim();
    if (term.split(/\s+/).length === 1 && term.length >= 4) {
      out.push({ id: `dw-${q.id}`, topic: q.topic, type: "word", q: `The word for: ${q.choices[q.answer]}`, answer: term, why: q.why || "" });
    }
  });
  const byTopic = {};
  vocab.forEach((q) => { (byTopic[q.topic] ||= []).push(q); });
  Object.entries(byTopic).forEach(([topic, list]) => {
    if (list.length < 3) return;
    const pick = list.slice(0, 4);
    out.push({
      id: `dm-${pick.map((q) => q.id).join("-")}`, topic, type: "match",
      q: "Match each term to its meaning",
      pairs: pick.map((q) => ({ a: q.term, b: q.choices[q.answer] })), why: "",
    });
  });
  return out;
}

// A multiple choice question asked again with no options to pick from, so the
// answer has to be recalled and typed. Only where that is fair: a short answer,
// and a stem that does not lean on the options being on screen.
const NAMED = /\b(called|name of|term for|word for|known as|stands for|symbol (for|of)|is the (process|organ|structure|name|term|word|unit|gas|enzyme|test)|what (is|are) the (process|organ|structure|name|term|word|unit|gas|enzyme))\b/i;
export function typedFrom(q) {
  if (!q || isDrill(q) || !Array.isArray(q.choices) || typeof q.answer !== "number") return null;
  const a = String(q.choices[q.answer] ?? "").trim();
  const stem = String(q.q || "").trim();
  if (!a || a.length > 28 || a.split(/\s+/).length > 3) return null;
  if (/all of the above|none of the above|both |which of the (following|these)|the options|above|below|\bnot\b|\bexcept\b/i.test(stem + " " + a)) return null;
  if (/[=<>]|\\\(|\$/.test(a)) return null;
  // only where the answer is one fixed term: a name, a word, a symbol. "What
  // are the factors..." or "the effect of..." has several right answers.
  if (!NAMED.test(stem) || /meant by|define|describe|explain/i.test(stem)) return null;
  if (/\b(factors|effects?|reasons?|examples?|ways|types|advantages|disadvantages|differences?|features|causes)\b/i.test(stem)) return null;
  return { id: q.id, topic: q.topic, type: "blank", q: /_{3,}/.test(stem) ? stem : stem + " ______", answer: a, why: q.why || "" };
}

// A multiple choice question turned into "is this answer right?", with the
// right answer half the time and a wrong option the other half, chosen by the
// question so it is the same each time it is shown.
export function trueFalseFrom(q) {
  if (!q || isDrill(q) || !Array.isArray(q.choices) || q.choices.length < 2 || typeof q.answer !== "number") return null;
  const stem = String(q.q || "").trim();
  if (stem.length > 220 || /which of the (following|these)|all of the above|none of the above/i.test(stem + " " + q.choices.join(" "))) return null;
  const h = [...String(q.id ?? stem)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 11);
  const truth = h % 2 === 0;
  const right = String(q.choices[q.answer]);
  const wrong = q.choices.filter((_, i) => i !== q.answer);
  const given = truth ? right : String(wrong[h % wrong.length]);
  return { id: q.id, topic: q.topic, type: "tf", q: `Is this answer correct?  ${stem}  Answer: ${given}`, answer: truth, correction: truth ? "" : `The answer is ${right}.`, why: q.why || "" };
}

// Four short question and answer pairs from one topic, to match up.
export function matchFrom(questions, used = new Set()) {
  const byTopic = {};
  questions.forEach((q) => {
    if (isDrill(q) || !Array.isArray(q.choices) || typeof q.answer !== "number" || used.has(q.id)) return;
    const a = String(q.choices[q.answer] ?? "");
    const stem = String(q.q || "");
    if (!a || a.split(/\s+/).length > 6 || stem.length > 110 || /which of the (following|these)|all of the above|none of the above/i.test(stem + a)) return;
    (byTopic[q.topic] ||= []).push({ id: q.id, a: stem, b: a });
  });
  for (const list of Object.values(byTopic)) {
    const pick = [];
    for (const p of list) if (!pick.some((x) => x.b.toLowerCase() === p.b.toLowerCase()) && pick.length < 4) pick.push(p);
    if (pick.length >= 3) return { id: `mq-${pick.map((p) => p.id).join("-")}`, topic: list[0] && questions.find((q) => q.id === pick[0].id)?.topic, type: "match", q: "Match each question to its answer", pairs: pick.map((p) => ({ a: p.a, b: p.b })), why: "", from: pick.map((p) => p.id) };
  }
  return null;
}
