// A small, safe calculator for the coordinates in video diagrams.
//
// The model is bad at arithmetic in its head, so a diagram written in
// decimals drifts: circles that should touch overlap, a point meant to be on
// a line sits beside it. Instead it writes exact expressions, like "8/9",
// "sqrt(3)/2" or "2*cos(pi/6)", and they are worked out here. Nothing is ever
// passed to eval: this parses numbers, a fixed list of functions and
// constants, and the variable x, and nothing else.

const FUNCS = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp,
  ln: Math.log, log: Math.log10, log10: Math.log10, log2: Math.log2,
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  min: Math.min, max: Math.max, atan2: Math.atan2, pow: Math.pow,
};
const CONSTS = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI };

// Printed maths into what the parser reads: −, ×, ÷, π, √, ², ³.
function normalise(src) {
  return String(src)
    .replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/")
    .replace(/π/g, "pi").replace(/²/g, "^2").replace(/³/g, "^3")
    .replace(/√\s*\(/g, "sqrt(").replace(/√\s*([0-9.]+|[a-z]+)/gi, "sqrt($1)");
}

function tokens(src) {
  const out = [];
  const s = normalise(src);
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
    if (num) { out.push({ t: "n", v: parseFloat(num[0]) }); i += num[0].length; continue; }
    const id = /^[a-z_][a-z0-9_]*/i.exec(s.slice(i));
    if (id) { out.push({ t: "id", v: id[0].toLowerCase() }); i += id[0].length; continue; }
    if ("+-*/^(),".includes(c)) { out.push({ t: c }); i++; continue; }
    throw new Error(`unexpected "${c}"`);
  }
  return out;
}

// expr := term (('+'|'-') term)*   term := unary (('*'|'/'|implicit) unary)*
// unary := '-' unary | power       power := atom ('^' unary)?
function parse(list, vars) {
  let p = 0;
  const peek = () => list[p];
  const take = (t) => { if (list[p]?.t !== t) throw new Error(`expected ${t}`); p++; };
  const startsAtom = (tk) => tk && (tk.t === "n" || tk.t === "id" || tk.t === "(");

  function expr() {
    let v = term();
    while (peek() && (peek().t === "+" || peek().t === "-")) v = list[p++].t === "+" ? v + term() : v - term();
    return v;
  }
  function term() {
    let v = unary();
    for (;;) {
      if (peek()?.t === "*") { p++; v *= unary(); }
      else if (peek()?.t === "/") { p++; v /= unary(); }
      else if (startsAtom(peek())) v *= unary(); // 2pi, 3sqrt(2), 2(x+1)
      else return v;
    }
  }
  function unary() {
    if (peek()?.t === "-") { p++; return -unary(); }
    if (peek()?.t === "+") { p++; return unary(); }
    return power();
  }
  function power() {
    const base = atom();
    if (peek()?.t === "^") { p++; return base ** unary(); }
    return base;
  }
  function atom() {
    const tk = list[p++];
    if (!tk) throw new Error("unexpected end");
    if (tk.t === "n") return tk.v;
    if (tk.t === "(") { const v = expr(); take(")"); return v; }
    if (tk.t === "id") {
      if (Object.hasOwn(FUNCS, tk.v) && peek()?.t === "(") {
        p++;
        const args = [expr()];
        while (peek()?.t === ",") { p++; args.push(expr()); }
        take(")");
        return FUNCS[tk.v](...args);
      }
      if (Object.hasOwn(vars, tk.v)) return vars[tk.v];
      if (Object.hasOwn(CONSTS, tk.v)) return CONSTS[tk.v];
      throw new Error(`unknown "${tk.v}"`);
    }
    throw new Error(`unexpected "${tk.t}"`);
  }

  const v = expr();
  if (p !== list.length) throw new Error("unexpected text at the end");
  return v;
}

// A finite number from an expression or a number, or null.
export function evaluate(src, vars = {}) {
  if (typeof src === "number") return Number.isFinite(src) ? src : null;
  if (typeof src !== "string" || !src.trim() || src.length > 200) return null;
  try {
    const v = parse(tokens(src), vars);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// A function of x, compiled once, for plotting a graph.
export function compile(src) {
  if (typeof src !== "string" || !src.trim() || src.length > 200) return null;
  let list;
  try { list = tokens(src); } catch { return null; }
  return (x) => { try { const v = parse(list, { x }); return Number.isFinite(v) ? v : null; } catch { return null; } };
}
