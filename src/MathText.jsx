// Maths drawn the way it is printed, for anything the plain text tidying in
// mathText.js could not turn into a symbol of its own: a power or subscript
// with letters that have no small version (e^{-kt}, V_{cell}, x^{2y}) is
// set small and raised or lowered, as on an exam paper.

import { tidyMath } from "./mathText.js";

// No lookbehind: older iPhones cannot read it, and the whole app would fail.
const PART = /([_^]\{[^{}]{1,30}\}|\^\([^()]{1,20}\)|\^-?[0-9a-zA-Z.]{1,6}|_[0-9a-zA-Z]{1,6})/g;

export function mathParts(text) {
  const s = tidyMath(String(text ?? ""));
  if (!/[_^]/.test(s)) return [s];
  return s.split(PART).map((p, i) => {
    if (!p) return null;
    const up = p[0] === "^", low = p[0] === "_";
    if (!up && !low) return p;
    const inner = p.slice(1).replace(/^\{|\}$/g, "").replace(/^\(|\)$/g, "");
    return up ? <sup key={i} className="mt-sup">{inner}</sup> : <sub key={i} className="mt-sub">{inner}</sub>;
  });
}

// <M t="..."/>: a string of text, with its maths set properly.
export function M({ t }) {
  if (t == null || t === "") return null;
  return <>{mathParts(t)}</>;
}
