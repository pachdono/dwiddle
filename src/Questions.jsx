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

import { useMemo, useState } from "react";
import { Icon } from "./ui.jsx";

export const KINDS = ["blank", "word", "finish", "match", "order", "tf", "written"];
export const isDrill = (q) => q && KINDS.includes(q.type);

export const KIND_LABEL = {
  blank: "Fill in the blank",
  word: "Complete the word",
  finish: "Finish the sentence",
  match: "Match them up",
  order: "Put them in order",
  tf: "True or false",
  written: "In your own words",
};

/* ---------- marking ---------- */

const norm = (s) => String(s || "")
  .toLowerCase()
  .normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9%.+\-² ]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .replace(/^(the|a|an) /, "");

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
}

// A slip of one letter in a long word is a typo, not a wrong answer.
export function sameAnswer(given, answers) {
  const g = norm(given);
  if (!g) return false;
  return answers.map(norm).filter(Boolean).some((a) =>
    a === g || (a.length >= 6 && distance(a, g) <= 1) || (a.length >= 11 && distance(a, g) <= 2));
}

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
  const settle = (ok) => {
    if (result !== null) return;
    setResult(ok);
    onDone?.(ok);
  };
  const props = { q, result, settle, big };
  return (
    <div className={"qv" + (big ? " big" : "")}>
      <span className="qv-kind">{KIND_LABEL[q.type]}</span>
      {q.type === "blank" && <Blank {...props} />}
      {q.type === "word" && <Word {...props} />}
      {(q.type === "finish" || q.type === "written") && <Open {...props} />}
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
  const [before, after] = String(q.q).split(/_{3,}/);
  const answers = [q.answer, ...(q.accept || [])];
  const check = () => value.trim() && settle(sameAnswer(value, answers));
  return (
    <>
      <p className="qv-sentence">
        {before}
        <input className={"qv-gap" + (result === null ? "" : result ? " right" : " wrong")}
          value={value} onChange={(e) => setValue(e.target.value)} disabled={result !== null}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); check(); } }}
          style={{ width: `${Math.max(6, String(q.answer).length + 2)}ch` }} autoFocus aria-label="The missing word" />
        {after}
      </p>
      {result === null
        ? <button className="btn cta qv-check" onClick={check} disabled={!value.trim()}>Check</button>
        : <Verdict ok={result}>{result ? q.why : <>It is <b>{q.answer}</b>. {q.why}</>}</Verdict>}
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
      <h3 className="qv-q">{q.q}</h3>
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
        : <Verdict ok={result}>{result ? q.why : <>It is <b>{word}</b>. {q.why}</>}</Verdict>}
    </>
  );
}

function Open({ q, result, settle }) {
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  return (
    <>
      <h3 className="qv-q">{q.q}</h3>
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
          <p>{q.answer}</p>
          {q.points?.length > 0 && (
            <>
              <span className="qv-label">What the examiner looks for</span>
              <ul>{q.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
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

function Match({ q, result, settle }) {
  const pairs = q.pairs || [];
  const right = useMemo(() => shuffled(pairs.map((p, i) => ({ i, b: p.b })), q.id || q.q), [q]);
  const [held, setHeld] = useState(null); // index of the term picked
  const [done, setDone] = useState([]);   // matched term indexes
  const [miss, setMiss] = useState(0);
  const [flash, setFlash] = useState(null);

  function pickRight(i) {
    if (held === null || result !== null || done.includes(i)) return;
    if (i === held) {
      const next = [...done, i];
      setDone(next);
      setHeld(null);
      if (next.length === pairs.length) settle(miss === 0);
    } else {
      setMiss((m) => m + 1);
      setFlash(i);
      setTimeout(() => setFlash(null), 450);
    }
  }

  return (
    <>
      <h3 className="qv-q">{q.q || "Match each one to its meaning"}</h3>
      <div className="qv-match">
        <div>
          {pairs.map((p, i) => (
            <button key={i} className={"qv-tile" + (done.includes(i) ? " done" : held === i ? " held" : "")}
              onClick={() => !done.includes(i) && setHeld(i)} disabled={result !== null}>{p.a}</button>
          ))}
        </div>
        <div>
          {right.map(({ i, b }) => (
            <button key={i} className={"qv-tile def" + (done.includes(i) ? " done" : flash === i ? " miss" : "")}
              onClick={() => pickRight(i)} disabled={result !== null || held === null && !done.includes(i)}>{b}</button>
          ))}
        </div>
      </div>
      {result === null
        ? <p className="qv-hint">{held === null ? "Tap a term, then its meaning." : "Now tap its meaning."}</p>
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
            <button key={x.i} className="qv-tile" onClick={() => setSeq([...seq, x.i])}>{x.t}</button>
          ))}
        </div>
      )}
      {result === null
        ? <button className="btn cta qv-check" disabled={!full} onClick={() => settle(seq.every((i, k) => i === k))}>Check the order</button>
        : <Verdict ok={result}>{result ? (q.why || "That is the order.") : <>The order is: {items.join(", then ")}. {q.why}</>}</Verdict>}
    </>
  );
}

function TrueFalse({ q, result, settle }) {
  const [chose, setChose] = useState(null);
  const pick = (v) => { if (result !== null) return; setChose(v); settle(v === !!q.answer); };
  return (
    <>
      <h3 className="qv-q">{q.q}</h3>
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
          {!q.answer && q.correction ? <>It is false: {q.correction} </> : null}{q.why}
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
