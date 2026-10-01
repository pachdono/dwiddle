// Reading a formula a student types, like "x^2 - 3", "2x + 1", "sin(x)" or
// "y = 1/x", into a function that can be plotted. It never runs code: the
// text is split into numbers, x, operators and a few named functions, and
// anything else is refused.

const FN = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
};
const CONST = { pi: Math.PI, e: Math.E };

function tokens(src) {
  const s = String(src).toLowerCase()
    .replace(/^\s*(y|f\(x\))\s*=\s*/, "")
    .replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-").replace(/π/g, "pi").replace(/√/g, "sqrt")
    .replace(/²/g, "^2").replace(/³/g, "^3");
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = s.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
    if (num) { out.push({ t: "num", v: parseFloat(num[1]) }); i += num[1].length; continue; }
    const word = s.slice(i).match(/^[a-z]+/);
    if (word) {
      let w = word[0];
      // "sinx", "2xsin(x)": peel known names off the front of a run of letters.
      while (w) {
        const name = Object.keys(FN).concat(Object.keys(CONST)).sort((a, b) => b.length - a.length).find((n) => w.startsWith(n));
        if (name) { out.push(FN[name] ? { t: "fn", v: name } : { t: "num", v: CONST[name] }); w = w.slice(name.length); i += name.length; continue; }
        if (w[0] === "x") { out.push({ t: "x" }); w = w.slice(1); i += 1; continue; }
        throw new Error(`"${w}" is not something a graph can use. Write it with x, like 2x + 1.`);
      }
      continue;
    }
    if ("+-*/^()".includes(c)) { out.push({ t: c }); i++; continue; }
    throw new Error(`"${c}" cannot be used in a graph.`);
  }
  // Implicit multiplication: 2x, 3(x+1), x(x-1), 2sin(x), (x+1)(x-1).
  const full = [];
  out.forEach((tk, k) => {
    const prev = full[full.length - 1];
    const ends = prev && (prev.t === "num" || prev.t === "x" || prev.t === ")");
    const starts = tk.t === "num" || tk.t === "x" || tk.t === "(" || tk.t === "fn";
    if (ends && starts && k > 0) full.push({ t: "*" });
    full.push(tk);
  });
  return full;
}

// Precedence climbing: + -, then * /, then unary minus, then ^ (right to left).
function parse(list) {
  let i = 0;
  const peek = () => list[i];
  const take = (t) => { if (peek()?.t !== t) throw new Error("The brackets in that formula do not match."); i++; };
  function expr() {
    let left = term();
    while (peek() && (peek().t === "+" || peek().t === "-")) {
      const op = list[i++].t, right = term(), l = left;
      left = op === "+" ? (x) => l(x) + right(x) : (x) => l(x) - right(x);
    }
    return left;
  }
  function term() {
    let left = unary();
    while (peek() && (peek().t === "*" || peek().t === "/")) {
      const op = list[i++].t, right = unary(), l = left;
      left = op === "*" ? (x) => l(x) * right(x) : (x) => l(x) / right(x);
    }
    return left;
  }
  function unary() {
    if (peek()?.t === "-") { i++; const v = unary(); return (x) => -v(x); }
    if (peek()?.t === "+") { i++; return unary(); }
    return power();
  }
  function power() {
    const base = atom();
    if (peek()?.t === "^") { i++; const ex = unary(); return (x) => Math.pow(base(x), ex(x)); }
    return base;
  }
  function atom() {
    const tk = list[i++];
    if (!tk) throw new Error("That formula stops part way.");
    if (tk.t === "num") return () => tk.v;
    if (tk.t === "x") return (x) => x;
    if (tk.t === "(") { const v = expr(); take(")"); return v; }
    if (tk.t === "fn") {
      const f = FN[tk.v];
      if (peek()?.t === "(") { i++; const v = expr(); take(")"); return (x) => f(v(x)); }
      const v = power();
      return (x) => f(v(x));
    }
    throw new Error("That formula could not be read. Try something like x^2 - 3.");
  }
  const f = expr();
  if (i < list.length) throw new Error("That formula could not be read. Try something like x^2 - 3.");
  return f;
}

export function compile(src) {
  if (!String(src || "").trim()) throw new Error("Type a formula, like x^2 - 3.");
  return parse(tokens(src));
}

// Points of y = f(x) across [x0, x1], broken where it is undefined or shoots
// off, so 1/x and tan x draw as separate pieces.
export function sample(f, [x0, x1], n = 240) {
  const runs = [];
  let run = [];
  for (let k = 0; k <= n; k++) {
    const x = x0 + ((x1 - x0) * k) / n;
    let y;
    try { y = f(x); } catch { y = NaN; }
    const prev = run[run.length - 1];
    if (!Number.isFinite(y) || (prev && Math.abs(y - prev[1]) > 1e3)) { if (run.length > 1) runs.push(run); run = []; continue; }
    run.push([x, y]);
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

// A y range that shows the interesting part: the middle of the values, not
// the spikes near an asymptote.
export function autoRange(runs, fallback = [-10, 10]) {
  const ys = runs.flat().map((p) => p[1]).sort((a, b) => a - b);
  if (!ys.length) return fallback;
  const lo = ys[Math.floor(ys.length * 0.03)], hi = ys[Math.ceil(ys.length * 0.97) - 1];
  if (!(hi > lo)) return [lo - 1, lo + 1];
  const pad = (hi - lo) * 0.12;
  return [lo - pad, hi + pad];
}

export function niceStep(span, target = 8) {
  const raw = span / target, p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) || p * 10;
}
