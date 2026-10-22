// Maths written the way it is printed.
//
// Questions arrive with maths in three shapes: caret notation from the model
// (x^2), words from the authored templates (x squared), and ASCII operators
// everywhere (<=, *, ->). All three read as workings rather than as an exam
// paper, and "2^2" is simply wrong on a page that is meant to look like the
// real thing.
//
// This rewrites the string rather than the rendering, which means the result
// is also right when the sheet is printed, exported to PDF, or copied out.

const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
  n: "ⁿ", i: "ⁱ", x: "ˣ", a: "ᵃ", b: "ᵇ", c: "ᶜ",
  d: "ᵈ", k: "ᵏ", m: "ᵐ", p: "ᵖ", t: "ᵗ", e: "ᵉ", f: "ᶠ", g: "ᵍ", h: "ʰ", j: "ʲ",
  l: "ˡ", o: "ᵒ", r: "ʳ", s: "ˢ", u: "ᵘ", v: "ᵛ", w: "ʷ", y: "ʸ", z: "ᶻ" };

const SUB = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "(": "₍", ")": "₎",
  n: "ₙ", a: "ₐ", e: "ₑ", i: "ᵢ", o: "ₒ", x: "ₓ", h: "ₕ", j: "ⱼ", k: "ₖ", l: "ₗ",
  m: "ₘ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ" };

// Only convert when every character has a real glyph. A half converted
// exponent is worse than none at all.
function lift(run, table) {
  let out = "";
  for (const ch of run) {
    if (!(ch in table)) return null;
    out += table[ch];
  }
  return out;
}

const WORDS = [
  // The article goes with it, or the sentence reads "the √144".
  [/\b(?:the )?square roots? of ([a-z0-9.]+)/gi, "√$1"],
  // Parentheses round a single value add nothing: √49, not √(49).
  [/\bsqrt\(\s*([a-z0-9.]{1,8})\s*\)/gi, "√$1"],
  [/\bsqrt\(([^()]{1,20})\)/gi, "√($1)"],
  [/\bsqrt ?([a-z0-9.]+)/gi, "√$1"],
  [/\bpi\b/g, "π"],
  [/\btheta\b/gi, "θ"],
  [/\bplus or minus\b/gi, "±"],
  [/\bis less than or equal to\b/gi, "≤"],
  [/\bis greater than or equal to\b/gi, "≥"],
  [/\bis not equal to\b/gi, "≠"],
];

const OPS = [
  [/<=>/g, "⇔"],
  [/<->/g, "↔"],
  [/->/g, "→"],
  [/<=/g, "≤"],
  [/>=/g, "≥"],
  [/!=/g, "≠"],
  [/\+\/-|\+-/g, "±"],
  [/\.\.\./g, "…"],
  // A multiplication star between two operands, not a stray asterisk.
  [/([0-9a-zA-Z)\]])\s*\*\s*([0-9a-zA-Z(\[])/g, "$1 × $2"],
  // Division slash only between bare numbers, so dates and units survive.
  [/(\d)\s*\/\s*(\d)(?![\d/])/g, "$1/$2"],
  // A true minus sign between numbers reads level with the digits, where a
  // hyphen sits low and short.
  [/(\d)\s-\s(\d)/g, "$1 − $2"],
  // Not when a scale follows: "30 degrees Celsius" is written out, not "30° Celsius".
  [/(\d) ?degrees?\b(?! ?(?:c\b|f\b|celsius|fahrenheit|centigrade))/gi, "$1°"],
];

// LaTeX a model slipped in, as it would be printed.
const TEX = { times: "×", cdot: "·", div: "÷", approx: "≈", pm: "±", leq: "≤", le: "≤", geq: "≥", ge: "≥", neq: "≠", ne: "≠",
  infty: "∞", pi: "π", mu: "µ", alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", theta: "θ", lambda: "λ", sigma: "σ",
  omega: "ω", Omega: "Ω", rho: "ρ", degree: "°", circ: "°", rightarrow: "→", to: "→", leftarrow: "←", propto: "∝", sum: "Σ",
  varepsilon: "ε", epsilon: "ε", forall: "∀", exists: "∃", iff: "⇔", implies: "⇒", Rightarrow: "⇒", Longrightarrow: "⇒", Leftrightarrow: "⇔", Longleftrightarrow: "⇔",
  in: "∈", notin: "∉", subset: "⊂", subseteq: "⊆", cup: "∪", cap: "∩", int: "∫", partial: "∂", nabla: "∇", ldots: "…", cdots: "…", dots: "…", mid: "|", lvert: "|", rvert: "|",
  lim: "lim", sin: "sin", cos: "cos", tan: "tan", log: "log", ln: "ln", max: "max", min: "min", prod: "∏", angle: "∠", perp: "⊥", parallel: "∥", therefore: "∴", ne: "≠",
  land: "∧", wedge: "∧", lor: "∨", vee: "∨", lnot: "¬", neg: "¬", oplus: "⊕", otimes: "⊗", equiv: "≡", sim: "∼", cong: "≅",
  quad: " ", qquad: "  ", ast: "*", star: "*", prime: "′", hbar: "ħ", nu: "ν", tau: "τ", phi: "φ", psi: "ψ", eta: "η", kappa: "κ", xi: "ξ", zeta: "ζ", chi: "χ",
  Sigma: "Σ", Pi: "Π", Phi: "Φ", Lambda: "Λ", Gamma: "Γ", Theta: "Θ", geqslant: "≥", leqslant: "≤", ll: "≪", gg: "≫", emptyset: "∅", varnothing: "∅",
  uparrow: "↑", downarrow: "↓", leftrightarrow: "↔", mapsto: "↦" };

// \frac{a}{b} with the braces matched properly, so a numerator like S_{n-1}
// or a nested fraction is not skipped. In the app a fraction is drawn stacked
// (see MathText.jsx); as plain text (print, copy) it is "a/b" for simple
// numbers and "(a) ÷ (b)" for anything longer, never a bare slash.
let STACK = false;
const FRA = "\u2045", FRB = "\u2223", FRC = "\u2046";
function group(s, i) {
  while (s[i] === " ") i++;
  if (s[i] !== "{") return null;
  let d = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") d++;
    else if (s[j] === "}" && --d === 0) return { text: s.slice(i + 1, j), end: j + 1 };
  }
  return null;
}
function fracs(s) {
  for (let guard = 0; guard < 40; guard++) {
    const m = /\\[dt]?frac(?![A-Za-z])/.exec(s);
    if (!m) break;
    const a = group(s, m.index + m[0].length);
    const b = a && group(s, a.end);
    if (!b) { s = s.slice(0, m.index) + s.slice(m.index + m[0].length); continue; }
    const top = fracs(untexInner(a.text)).trim(), bot = fracs(untexInner(b.text)).trim();
    const nested = top.includes(FRA) || bot.includes(FRA);
    const out = STACK && !nested ? `${FRA}${top}${FRB}${bot}${FRC}`
      : /^[\d.]+$/.test(top) && /^[\d.]+$/.test(bot) ? `${top}/${bot}`
      : `${/^[\w.]+$/.test(top) ? top : `(${top})`} ÷ ${/^[\w.]+$/.test(bot) ? bot : `(${bot})`}`;
    s = s.slice(0, m.index) + out + s.slice(b.end);
  }
  return s;
}
// A line drawn over each character, for \overline{A} (NOT A) and \bar{x}.
const over = (t) => [...t].map((c) => (c === " " ? c : c + "\u0305")).join("");
function untex(s) {
  // Cases, written as a sentence: "1 if A = 1 and B = 1; 0 otherwise".
  s = s.replace(/\s*\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (m, body) =>
    " " + body.split(/\\\\(?:\[[^\]]*\])?/).map((row) => untexInner(row.replace(/\s*&\s*/g, " ")).replace(/\s+/g, " ").trim()).filter(Boolean).join("; "));
  // Other layouts (aligned, array, matrix): one row a line, no column marks.
  s = s.replace(/\\begin\{[a-z*]+\}(?:\{[^{}]*\})?([\s\S]*?)\\end\{[a-z*]+\}/g, (m, body) =>
    body.replace(/\s*&(=)?\s*/g, (a, eq) => (eq ? " = " : " ")))
    .replace(/\\\\(?:\[[^\]]*\])?/g, "\n");
  // A boxed answer keeps its words, and an overlined letter keeps its bar.
  for (let k = 0; k < 2; k++) s = s.replace(/\\boxed\{((?:[^{}]|\{[^{}]*\})*)\}/g, "$1");
  s = s.replace(/\\(?:overline|bar)\{([^{}]{1,24})\}/g, (m, t) => over(untexInner(t).replace(/\s+/g, ""))).replace(/\\bar ([A-Za-z])/g, (m, t) => over(t));
  // The brackets a model wraps maths in, on a line of their own or not, are not part of it.
  s = s.replace(/\s*\\[()[\]]\s*/g, (m) => (/\n/.test(m) ? "\n" : " ")).replace(/\\[;,:! ]/g, " ");
  s = s.replace(/\\lim_\{([^{}]*)\}/g, (m, a) => `lim(${untexInner(a)})`);
  s = fracs(s);
  return untexInner(s).replace(/([^\s]) {2,}(?=[^\s])/g, "$1 ");
}
function untexInner(s) {
  return s
    .replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, "$1")
    .replace(/\\sqrt\{([^{}]*)\}/g, "√($1)")
    .replace(/\\(?:[Bb]ig{1,2}[lrm]?|left|right)\s*(?=[()[\]|.]|\\[{}|])/g, "")
    .replace(/\\([{}])/g, "$1")
    .replace(/\\(?:left|right)\./g, "")
    .replace(/\\([A-Za-z]+)/g, (m, w) => TEX[w] ?? m)
    .replace(/\$([^$]{1,80})\$/g, "$1")
    .replace(/µ (?=[mgsLlM]\b|m[³²]?)/g, "µ")
    .replace(/(\S)([⇒⇔])/g, "$1 $2");
}

export function tidyMath(input, { stack = false } = {}) {
  if (typeof input !== "string" || !input) return input;
  STACK = stack;
  let s;
  try { s = untex(input); } finally { STACK = false; }
  // a letter then a space then its subscript or power is one thing: "S _{n-1}"
  s = s.replace(/([A-Za-z0-9)\]]) +(?=[_^]\{)/g, "$1");
  // a slash between two bracketed groups is a division, so it says so
  s = s.replace(/\)\s*\/\s*\(/g, ") ÷ (");

  // x^2, x^{n+1}, x^(2) and 10^-4
  s = s.replace(/\^\{([^{}]{1,12})\}|\^\(([^()]{1,12})\)|\^(-?[0-9a-zA-Z]{1,4})/g,
    (whole, braced, parens, bare) => {
      const run = braced ?? parens ?? bare;
      return lift(run, SUP) ?? whole;
    });

  // H_2O, a_1, x_{n}
  s = s.replace(/_\{([^{}]{1,8})\}|_(\d{1,3}|[a-zA-Z])/g, (whole, braced, bare) => {
    const run = braced ?? bare;
    return lift(run, SUB) ?? whole;
  });

  // "x squared", "the 3rd power of x", "x to the 4"
  // Only a real algebraic term takes the exponent: a single variable, a
  // number, or a closing bracket. Matching any word turned the prose "the
  // radius squared" into "the radius²".
  s = s.replace(/(\b[a-zA-Z]\b|\b\d+\b|\)) squared\b/g, (whole, base) => base + "²");
  s = s.replace(/(\b[a-zA-Z]\b|\b\d+\b|\)) cubed\b/g, (whole, base) => base + "³");
  s = s.replace(/\b([a-zA-Z]) to the (?:power )?(\d{1,2})\b/g, (whole, base, n) => {
    const up = lift(n, SUP);
    return up ? base + up : whole;
  });

  for (const [re, to] of WORDS) s = s.replace(re, to);
  for (const [re, to] of OPS) s = s.replace(re, to);

  // Common units are written the way students write them: m/s², not m s⁻²
  s = s.replace(/\b((?:[kcmµμn]?m)|km|cm|mm)\s?s⁻²/g, "$1/s²")
    .replace(/\b((?:[kcmµμn]?m)|km|cm|mm)\s?s⁻¹/g, "$1/s")
    .replace(/\b(kg|g)\s?((?:[kcmµμn]?m))⁻³/g, "$1/$2³");

  return s;
}

// Applied to a whole question, including its options and its explanation.
// A question that is only a term is not a question.
//
// Vocabulary items used to be stored as the bare term, "Demand curve", on the
// assumption that every screen would add "Define" in front. Only the
// flashcards did, so the quiz showed a word with four definitions under it and
// no actual question. Anything short that neither ends in a question mark nor
// opens with a word that asks something is turned into the question it stood
// for, and the original is kept as the term.
const ASKS = /^(what|which|why|how|when|where|who|whose|whom|define|explain|describe|state|give|name|identify|outline|calculate|work|find|compare|contrast|suggest|evaluate|discuss|assess|analyse|analyze|justify|predict|complete|choose|select|is|are|was|were|does|do|did|can|could|should|would|will|has|have)\b/i;

// Models put the right option first far too often. The order is mixed with a
// seed from the question itself, so it is random across questions but the same
// every time one question is shown. "All of the above" and its kind stay last.
const LAST = /\b(all|none|both|neither)\b.*\b(above|these|them)\b|\bboth\b.*\band\b/i;
export function spreadAnswers(q) {
  if (!q || !Array.isArray(q.choices) || q.choices.length < 3 || !Number.isInteger(q.answer) || q.choices[q.answer] == null) return q;
  if (q.choices.some((c) => LAST.test(String(c)))) return q;
  let s = [...String(q.id ?? q.q)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 17) || 1;
  const order = q.choices.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const j = ((t ^ (t >>> 14)) >>> 0) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
}

export function phraseQuestion(q) {
  return spreadAnswers(phrase(q));
}
function phrase(q) {
  if (!q || typeof q !== "object" || typeof q.q !== "string") return q;
  const raw = q.q.trim().replace(/[.:\s]+$/, "");
  if (!raw || raw.endsWith("?") || ASKS.test(raw)) return q;
  if (q.kind !== "vocab" && raw.split(/\s+/).length > 6) return q;
  if (raw.split(/\s+/).length > 10) return q;
  // "Demand curve" reads as "demand curve" mid sentence; "GDP" stays "GDP".
  const term = /^[A-Z][a-z]/.test(raw) ? raw[0].toLowerCase() + raw.slice(1) : raw;
  return { ...q, term: q.term || raw, q: `What is meant by the term ${term}?` };
}

export function tidyQuestion(q) {
  if (!q || typeof q !== "object") return q;
  q = phraseQuestion(q);
  return {
    ...q,
    q: tidyMath(q.q),
    why: tidyMath(q.why),
    passage: tidyMath(q.passage),
    choices: Array.isArray(q.choices) ? q.choices.map(tidyMath) : q.choices,
  };
}

// A question that leans on something the student cannot see ("in the notes",
// "the diagram above") cannot be answered, so it is left out. Questions that
// carry their own passage or figure are fine.
const UNSEEN = /\b(in|from|by|on) (the|these|your|this) (notes|text|passage|material|lesson|sheet|page)\b|according to the (notes|text|passage)|as (listed|stated|mentioned|described) (in|above|below)|listed (as|in) .{0,30}\bnotes\b/i;
// A question that points at a picture. It cannot be answered without one, so
// one is made when it is shown, rather than the question being dropped.
const VISUAL = /\b(the|this|these|following|given) (image|diagram|figure|picture|graph|table|chart|photo|photograph|drawing|illustration)s?\b|\b(shown|pictured|illustrated|drawn|labelled) (above|below|in the|here)|\bin (the )?(image|diagram|figure|picture|graph)\b/i;
export const needsVisual = (q) => !!q && typeof q.q === "string" && !q.picture && !q.passage && !q.figure && !q.image && !q.diagram && VISUAL.test(q.q);
// What to ask the picture maker for, without giving the answer away.
export function visualPrompt(q) {
  if (q?.picture) return q.picture;
  const opts = Array.isArray(q?.choices) ? ` The question's options are ${q.choices.join(", ")}: do not mark or label which one is right.` : "";
  return `A clear, simple, labelled educational diagram for this exam question: "${q.q}" Topic: ${q.topic || "science"}.${opts} Keep labels few and correctly spelled.`;
}
const LABELLED = /\b(molecules?|substances?|compounds?|structures?|parts?|labels?|tubes?|samples?|objects?|points?|solutions?|liquids?|organs?|cells?|letters?) [A-Z]\b(?![a-z'])/;
const NUMBERED = /\b(figure|fig\.?|table|diagram|graph|chart) ?\d/i;
// A calculation whose options are all numbers but whose wording has none, like
// "What is the acceleration of the aeroplane?" with 4.2, 2.8, 1.5 and 0.4 under
// it: the data it depends on is missing, so it cannot be answered.
const NUMERIC_OPTION = /^[-−+]?\d[\d.,]*\s*[^\s\d]{0,3}\s*[A-Za-zµμ°%/ ]{0,12}[⁻⁰¹²³⁴⁵⁶⁷⁸⁹/ ]*[A-Za-z⁻⁰¹²³⁴⁵⁶⁷⁸⁹]*$/;
// A check that points at "the graph", "the diagram" or "the table" the student
// is never shown. Multiple choice ones get a picture made; the other kinds
// cannot, so they are left out.
export const unseenVisual = (q) => {
  const t = String(q?.q || "");
  const W = "(graph|diagram|figure|chart|table|image|picture|illustration|map)";
  return new RegExp(`\\b(according to|from|using|use|read|reading from|refer to|look at|based on|shown in|given in|in|on) the ${W}\\b|\\bthe ${W} (shows?|above|below|here|given|represents?)\\b|\\b(this|these|following|given) ${W}\\b|\\bparts? of the ${W}\\b|\\b(shown|illustrated|pictured|plotted) (above|below|here)\\b|\\b(above|below) ${W}\\b`, "i").test(t);
};
export const missingData = (q) => {
  const stem = String(q?.q || "");
  // options that are all numbers, wording with none
  if (Array.isArray(q?.choices) && q.choices.length >= 3 && !/\d/.test(stem) && q.choices.every((c) => NUMERIC_OPTION.test(String(c).trim()))) return true;
  // a typed number as the answer, and no number anywhere in the sentence
  if ((q?.type === "blank" || q?.type === "word") && /^[-−+]?\d[\d.,]*$/.test(String(q.answer || "").trim()) && !/\d/.test(stem.replace(/_{3,}/g, ""))) return true;
  // "calculate ..." with nothing to calculate from
  if ((q?.type === "written" || q?.type === "finish") && /\b(calculate|work out|determine)\b/i.test(stem) && !/\d/.test(stem)) return true;
  return false;
};
export function answerable(q) {
  if (!q || typeof q.q !== "string") return false;
  if (q.passage || q.figure || q.image || q.diagram || q.picture) return true;
  if (missingData(q)) return false;
  if (needsVisual(q)) return !UNSEEN.test(q.q);
  return !UNSEEN.test(q.q) && !LABELLED.test(q.q) && !NUMBERED.test(q.q);
}

// One of each question. The same one turning up five times in a run happened
// when the bank held several copies of it, or of a rewording that differs only
// in case or punctuation.
const key = (q) => String(q?.q || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set("the a an of in on to is are was were be by for and or with what which who how why does do did that this it its as at from into than then not no".split(" "));
const words = (q) => ({
  w: new Set(key(q).split(" ").filter((t) => t.length > 2 && !/^\d+$/.test(t) && !STOP.has(t)).map((t) => (t.length > 3 ? t.replace(/s$/, "") : t))),
  nums: (String(q?.q || "").match(/\d+(\.\d+)?/g) || []).sort().join(","),
});
// the same question reworded: nearly all the same words and the same numbers
// (a maths question with other numbers is a different question)
const alike = (a, b) => {
  if (a.nums !== b.nums || a.w.size < 3 || b.w.size < 3) return false;
  let hit = 0;
  a.w.forEach((t) => { if (b.w.has(t)) hit++; });
  return hit / (a.w.size + b.w.size - hit) >= 0.72;
};
export function uniqueQuestions(list) {
  const seen = new Set();
  const kept = [];
  return (list || []).filter((q) => {
    const k = key(q);
    if (!k || seen.has(k)) return false;
    const w = words(q);
    // the same question again with a few words changed, in the same topic, is a repeat too
    if (kept.some((o) => (o.topic || "") === (q.topic || "") && alike(o.x, w))) return false;
    seen.add(k);
    kept.push({ topic: q.topic, x: w });
    return true;
  });
}

// The questions to practise from: duplicates out, and questions that lean on
// something unseen out too, but never so many that a topic is left empty. A
// topic made from a past paper can be full of "shown below", and those are
// better than no questions at all, so if fewer than three would be left the
// topic keeps all of its own.
export function practiceBank(list) {
  const unique = uniqueQuestions(list);
  const byTopic = new Map();
  unique.forEach((q) => { const k = q.topic || ""; (byTopic.get(k) || byTopic.set(k, []).get(k)).push(q); });
  const out = [];
  byTopic.forEach((qs) => { const ok = qs.filter(answerable); out.push(...(ok.length >= 3 ? ok : qs)); });
  return unique.filter((q) => out.includes(q));
}
