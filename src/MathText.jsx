// Maths drawn the way it is printed, for anything the plain text tidying in
// mathText.js could not turn into a symbol of its own: a power or subscript
// with letters that have no small version (e^{-kt}, V_{cell}, x^{2y}) is
// set small and raised or lowered, as on an exam paper.

import { tidyMath } from "./mathText.js";

// No lookbehind: older iPhones cannot read it, and the whole app would fail.
const PART = /([_^]\{[^{}]{1,30}\}|\^\([^()]{1,20}\)|\^-?[0-9a-zA-Z.]{1,6}|_[0-9a-zA-Z]{1,6})/g;

const FRAC = /\u2045([^\u2045\u2046\u2223]*)\u2223([^\u2045\u2046\u2223]*)\u2046/;

export function mathParts(text) {
  return withFractions(tidyMath(String(text ?? ""), { stack: true }));
}

// A fraction is set stacked, numerator over denominator, as in a textbook.
function withFractions(s) {
  if (!s.includes("\u2045")) return scripts(s);
  const out = [];
  let rest = s, k = 0, m;
  while ((m = FRAC.exec(rest))) {
    if (m.index) out.push(<span key={k++}>{scripts(rest.slice(0, m.index))}</span>);
    out.push(<span key={k++} className="mt-frac"><span className="mt-num">{scripts(m[1])}</span><span className="mt-den">{scripts(m[2])}</span></span>);
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest) out.push(<span key={k++}>{scripts(rest)}</span>);
  return out;
}

function scripts(s) {
  if (!/[_^]/.test(s)) return [s];
  return s.split(PART).map((p, i) => {
    if (!p) return null;
    const up = p[0] === "^", low = p[0] === "_";
    if (!up && !low) return p;
    const inner = p.slice(1).replace(/^\{|\}$/g, "").replace(/^\(|\)$/g, "");
    return up ? <sup key={i} className="mt-sup">{inner}</sup> : <sub key={i} className="mt-sub">{inner}</sub>;
  });
}

// <M t="..."/>: a string of text, with its maths set properly, and the few bits
// of markup a model puts in plain text: **bold**, *italic* and `code`. Without
// this a question showed its asterisks as they were typed.
const MARK = /\*\*([^*]+?)\*\*|`([^`]+)`|\*([^*\s][^*]*?)\*/g;

export function M({ t }) {
  if (t == null || t === "") return null;
  const s = String(t);
  if (!/[*`]/.test(s)) return <>{mathParts(s)}</>;
  const out = [];
  let last = 0, k = 0, m;
  MARK.lastIndex = 0;
  while ((m = MARK.exec(s))) {
    // a lone star between two words or numbers is multiplication, not italics
    if (m[3] !== undefined && (/\w$/.test(s.slice(0, m.index)) || /^\w/.test(s.slice(m.index + m[0].length)))) continue;
    if (m.index > last) out.push(<span key={k++}>{mathParts(s.slice(last, m.index))}</span>);
    if (m[1] !== undefined) out.push(<strong key={k++}>{mathParts(m[1])}</strong>);
    else if (m[2] !== undefined) out.push(<code key={k++} className="mt-code">{m[2]}</code>);
    else out.push(<em key={k++}>{mathParts(m[3])}</em>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(<span key={k++}>{mathParts(s.slice(last).replace(/\*\*/g, ""))}</span>);
  return <>{out}</>;
}
