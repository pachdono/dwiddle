// Diagrams for the explainer videos, worked out rather than guessed.
//
// The model describes a figure once per video: named values ("r": "8/9"),
// named points built from them ("C": ["3*r - 2", "r"]), shapes that refer to
// the points, and the facts the figure has to satisfy ("the circle c touches
// the circle big"). Everything is calculated here with the safe calculator,
// every fact is checked, and the visible area is fitted to what is drawn.
// A figure that fails a check goes back to the model with the reasons; one
// that still fails is left out, because a wrong diagram teaches the wrong
// thing and a missing one does not.

import { evaluate, compile } from "./_expr.js";

const COLORS = ["ink", "blue", "green", "purple", "orange", "red"];
const color = (c) => (COLORS.includes(c) ? c : "ink");
const short = (s, n) => String(s ?? "").trim().slice(0, n);
const TYPES = ["circle", "ellipse", "rect", "segment", "arrow", "point", "polygon", "path", "graph", "text", "callout", "mover"];

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function distToLine(p, a, b) {
  const len = dist(a, b);
  if (len < 1e-12) return dist(p, a);
  return Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / len;
}

// One figure: { shapes: { id: shape }, order: [id], x, y, grid, axes } and
// the problems found, in words the model can act on.
export function buildFigure(fig) {
  // A standard labelled diagram, shown from Wikipedia rather than drawn.
  if (typeof fig?.picture === "string" && fig.picture.trim()) {
    return { figure: { picture: short(fig.picture, 80), photo: fig.photo === true, order: [], shapes: {} }, problems: [] };
  }
  const problems = [];
  const vars = {};
  for (const [name, src] of Object.entries(fig?.values || {}).slice(0, 30)) {
    const key = String(name).toLowerCase();
    if (!/^[a-z_][a-z0-9_]*$/.test(key) || key === "x") { problems.push(`value name "${name}" is not a plain name`); continue; }
    const v = evaluate(src, vars);
    if (v === null) problems.push(`value ${name} = "${src}" could not be calculated`);
    else vars[key] = v;
  }

  const points = {};
  for (const [name, xy] of Object.entries(fig?.points || {}).slice(0, 40)) {
    const x = evaluate(Array.isArray(xy) ? xy[0] : null, vars), y = evaluate(Array.isArray(xy) ? xy[1] : null, vars);
    if (x === null || y === null) problems.push(`point ${name} = ${JSON.stringify(xy)} could not be calculated`);
    else points[name] = [x, y];
  }
  // A point is a name from "points", or a pair of expressions.
  const pt = (ref) => {
    if (typeof ref === "string") return points[ref] || null;
    if (Array.isArray(ref) && ref.length === 2) {
      const x = evaluate(ref[0], vars), y = evaluate(ref[1], vars);
      return x === null || y === null ? null : [x, y];
    }
    return null;
  };
  const num = (src) => evaluate(src, vars);

  const shapes = {};
  const order = [];
  (Array.isArray(fig?.shapes) ? fig.shapes : []).slice(0, 24).forEach((s, i) => {
    if (!s || !TYPES.includes(s.type)) return;
    const id = short(s.id, 40) || `shape${i + 1}`;
    const base = { type: s.type, color: color(s.color), ...(s.label ? { label: short(s.label, 40) } : {}), ...(s.pulse === true ? { pulse: true } : {}) };
    let out = null;
    const bad = (what) => problems.push(`shape ${id} (${s.type}): ${what}`);
    switch (s.type) {
      case "circle": {
        const c = pt(s.center), r = num(s.r);
        if (!c) bad(`centre ${JSON.stringify(s.center)} is not a known point`);
        else if (!(r > 0)) bad(`radius "${s.r}" is not a positive number`);
        else out = { ...base, c, r, half: ["upper", "lower"].includes(s.half) ? s.half : null, fill: s.fill === true, organic: s.organic === true };
        break;
      }
      case "ellipse": {
        const c = pt(s.center), rx = num(s.rx), ry = num(s.ry), turn = s.turn === undefined ? 0 : num(s.turn);
        if (!c) bad(`centre ${JSON.stringify(s.center)} is not a known point`);
        else if (!(rx > 0) || !(ry > 0)) bad("rx and ry must be positive numbers");
        else if (turn === null) bad(`turn "${s.turn}" is not a number of degrees`);
        else out = { ...base, c, rx, ry, turn, fill: s.fill === true, organic: s.organic === true };
        break;
      }
      case "rect": {
        const a = pt(s.from), b = pt(s.to), round = s.round === undefined ? 0 : num(s.round);
        if (!a || !b) bad("its corners are not known points");
        else out = { ...base, from: [Math.min(a[0], b[0]), Math.min(a[1], b[1])], to: [Math.max(a[0], b[0]), Math.max(a[1], b[1])], round: Math.max(0, round || 0), fill: s.fill === true, organic: s.organic === true };
        break;
      }
      case "callout": {
        const p = pt(s.to), at = pt(s.at), text = short(s.text, 40);
        if (!p || !at || !text) bad("it needs the point it names (to), where its words go (at), and the words");
        else out = { ...base, p, pos: at, text };
        break;
      }
      case "segment": case "arrow": {
        const from = pt(s.from), to = pt(s.to);
        if (!from || !to) bad("its ends are not known points");
        else out = { ...base, type: s.type, from, to, dashed: s.dashed === true, flow: s.flow === true };
        break;
      }
      case "mover": {
        // Dots that travel along a path, over and over: particles, current.
        const list = (Array.isArray(s.through) ? s.through : []).map(pt);
        if (list.length < 2 || list.some((p) => !p)) bad("its path is not all known points");
        else out = { ...base, points: list.slice(0, 40), closed: s.closed === true };
        break;
      }
      case "point": {
        const p = pt(s.at);
        if (!p) bad(`${JSON.stringify(s.at)} is not a known point`);
        else out = { ...base, p };
        break;
      }
      case "polygon": case "path": {
        const list = (Array.isArray(s.through) ? s.through : []).map(pt);
        if (list.length < 2 || list.some((p) => !p)) bad("its corners are not all known points");
        else out = { ...base, points: list.slice(0, 60), fill: s.type === "polygon" && s.fill === true };
        break;
      }
      case "graph": {
        const f = compile(s.y), a = num(s.from), b = num(s.to);
        if (!f) bad(`"${s.y}" is not a function of x the calculator can read`);
        else if (a === null || b === null || !(b > a)) bad("its from and to are not a range");
        else {
          // Sampled finely, and split where the curve leaves the real numbers.
          const runs = [[]];
          for (let k = 0; k <= 160; k++) {
            const x = a + ((b - a) * k) / 160, y = f(x);
            if (y === null || Math.abs(y) > 1e6) { if (runs[runs.length - 1].length) runs.push([]); continue; }
            runs[runs.length - 1].push([x, y]);
          }
          const pieces = runs.filter((r) => r.length > 1);
          if (!pieces.length) bad(`"${s.y}" has no values between ${s.from} and ${s.to}`);
          else out = { ...base, type: "path", points: pieces[0], more: pieces.slice(1, 6) };
        }
        break;
      }
      case "text": {
        const p = pt(s.at), text = short(s.text, 60);
        if (!p || !text) bad("it needs a known point and some text");
        else out = { ...base, p, text };
        break;
      }
    }
    if (out) { shapes[id] = out; order.push(id); }
  });

  // Points round the edge of a closed shape, and whether a point is inside it.
  const outline = (S) => {
    const out = [];
    if (S.type === "circle" || S.type === "ellipse") {
      const rx = S.rx ?? S.r, ry = S.ry ?? S.r, t = ((S.turn || 0) * Math.PI) / 180;
      const lo = S.half === "upper" ? 0 : S.half === "lower" ? Math.PI : 0, hi = S.half ? lo + Math.PI : 2 * Math.PI;
      for (let k = 0; k <= 48; k++) {
        const a = lo + ((hi - lo) * k) / 48, x = rx * Math.cos(a), y = ry * Math.sin(a);
        out.push([S.c[0] + x * Math.cos(t) - y * Math.sin(t), S.c[1] + x * Math.sin(t) + y * Math.cos(t)]);
      }
    } else if (S.type === "rect") {
      const [a, b] = [S.from, S.to];
      out.push(a, [b[0], a[1]], b, [a[0], b[1]]);
    } else if (S.type === "polygon") out.push(...S.points);
    return out;
  };
  const contains = (S, p) => {
    if (S.type === "circle" || S.type === "ellipse") {
      const rx = S.rx ?? S.r, ry = S.ry ?? S.r, t = (-(S.turn || 0) * Math.PI) / 180;
      const dx = p[0] - S.c[0], dy = p[1] - S.c[1];
      const x = dx * Math.cos(t) - dy * Math.sin(t), y = dx * Math.sin(t) + dy * Math.cos(t);
      if (S.half === "upper" && y < -tol) return false;
      if (S.half === "lower" && y > tol) return false;
      return (x / rx) ** 2 + (y / ry) ** 2 <= 1 + 1e-6;
    }
    if (S.type === "rect") return p[0] >= S.from[0] - tol && p[0] <= S.to[0] + tol && p[1] >= S.from[1] - tol && p[1] <= S.to[1] + tol;
    if (S.type === "polygon") {
      let inside = false;
      for (let i = 0, j = S.points.length - 1; i < S.points.length; j = i++) {
        const [xi, yi] = S.points[i], [xj, yj] = S.points[j];
        if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    return false;
  };
  const closed = (id) => (["circle", "ellipse", "rect", "polygon"].includes(shapes[id]?.type) ? shapes[id] : null);

  // The facts the figure must satisfy.
  const scale = Math.max(1, ...Object.values(points).flat().map(Math.abs));
  const tol = 1e-4 * scale;
  const circle = (id) => (shapes[id]?.type === "circle" ? shapes[id] : null);
  const line = (id) => (["segment", "arrow"].includes(shapes[id]?.type) ? shapes[id] : null);
  for (const c of (Array.isArray(fig?.checks) ? fig.checks : []).slice(0, 30)) {
    if (!c || typeof c !== "object") continue;
    const say = (msg) => problems.push(`check ${JSON.stringify(c)} fails: ${msg}`);
    if (c.type === "tangent") {
      const A = circle(c.a) || line(c.a), B = circle(c.b) || line(c.b);
      if (!A || !B) { say("it names a shape that is not a circle or segment"); continue; }
      if (A.type === "circle" && B.type === "circle") {
        const d = dist(A.c, B.c);
        const ext = Math.abs(d - (A.r + B.r)), int = Math.abs(d - Math.abs(A.r - B.r));
        if (Math.min(ext, int) > tol) say(`the centres are ${d.toFixed(4)} apart, but touching needs ${(A.r + B.r).toFixed(4)} (outside) or ${Math.abs(A.r - B.r).toFixed(4)} (inside)`);
      } else {
        const C = A.type === "circle" ? A : B, L = A.type === "circle" ? B : A;
        const d = distToLine(C.c, L.from, L.to);
        if (Math.abs(d - C.r) > tol) say(`the centre is ${d.toFixed(4)} from the line, but the radius is ${C.r.toFixed(4)}`);
      }
    } else if (c.type === "on") {
      const P = pt(c.point);
      const S = circle(c.shape) || line(c.shape);
      if (!P || !S) { say("it names an unknown point or shape"); continue; }
      const off = S.type === "circle" ? Math.abs(dist(P, S.c) - S.r) : distToLine(P, S.from, S.to);
      if (off > tol) say(`the point is ${off.toFixed(4)} away from it`);
    } else if (c.type === "length") {
      const A = pt(c.from), B = pt(c.to), want = num(c.equals);
      if (!A || !B || want === null) { say("it names unknown points or a length that cannot be calculated"); continue; }
      const d = dist(A, B);
      if (Math.abs(d - want) > tol) say(`the distance is ${d.toFixed(4)}, not ${want.toFixed(4)}`);
    } else if (c.type === "inside") {
      const A = closed(c.inner) || (shapes[c.inner]?.type === "point" ? shapes[c.inner] : null), B = closed(c.outer);
      if (!A || !B) { say("inner must be a shape or point and outer a circle, ellipse, rect or polygon"); continue; }
      const edge = A.type === "point" ? [A.p] : outline(A);
      const out = edge.filter((p) => !contains(B, p)).length;
      if (out) say(`${c.inner} is not inside ${c.outer}: ${out} of ${edge.length} points round its edge are outside it. Make it smaller or move it in`);
    } else if (c.type === "perpendicular" || c.type === "parallel") {
      const A = line(c.a), B = line(c.b);
      if (!A || !B) { say("it names a shape that is not a segment"); continue; }
      const u = [A.to[0] - A.from[0], A.to[1] - A.from[1]], v = [B.to[0] - B.from[0], B.to[1] - B.from[1]];
      const n = Math.hypot(...u) * Math.hypot(...v) || 1;
      const dot = Math.abs(u[0] * v[0] + u[1] * v[1]) / n, cross = Math.abs(u[0] * v[1] - u[1] * v[0]) / n;
      if (c.type === "perpendicular" && dot > 1e-4) say("the segments are not at right angles");
      if (c.type === "parallel" && cross > 1e-4) say("the segments are not parallel");
    }
  }

  // The visible area: everything drawn, with room round it for labels.
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const grow = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  for (const s of Object.values(shapes)) {
    if (s.type === "circle") {
      grow(s.c[0] - s.r, s.half === "upper" ? s.c[1] : s.c[1] - s.r);
      grow(s.c[0] + s.r, s.half === "lower" ? s.c[1] : s.c[1] + s.r);
    } else if (s.type === "ellipse") {
      const r = Math.max(s.rx, s.ry);
      grow(s.c[0] - r, s.c[1] - r); grow(s.c[0] + r, s.c[1] + r);
    } else if (s.from) { grow(...s.from); grow(...s.to); }
    else if (s.type === "callout") { grow(...s.p); grow(...s.pos); }
    else if (s.p) grow(...s.p);
    else if (s.points) [s.points, ...(s.more || [])].flat().forEach((p) => grow(...p));
  }
  if (!Number.isFinite(x0)) return { figure: null, problems: [...problems, "the figure draws nothing"] };
  // Room for the words of each label, on the side they are written.
  const words = Math.max(x1 - x0, y1 - y0, 1e-6);
  for (const s of Object.values(shapes)) {
    if (s.type !== "callout") continue;
    const w = s.text.length * words * 0.019;
    grow(s.pos[0] >= s.p[0] ? s.pos[0] + w : s.pos[0] - w, s.pos[1]);
  }
  const span = Math.max(x1 - x0, y1 - y0, 1e-6);
  const m = span * (fig?.axes === true ? 0.12 : 0.05);
  // A flat figure, like a number line, still gets some height.
  const padY = Math.max(m, (span * 0.3 - (y1 - y0)) / 2);
  const padX = Math.max(m, (span * 0.3 - (x1 - x0)) / 2);
  return {
    figure: { shapes, order, x: [x0 - padX, x1 + padX], y: [y0 - padY, y1 + padY], grid: fig?.grid === true, axes: fig?.axes === true },
    problems,
  };
}

// Every figure in a video, by id.
export function buildFigures(list) {
  const figures = {}, problems = {};
  for (const fig of (Array.isArray(list) ? list : []).slice(0, 4)) {
    const id = short(fig?.id, 40) || "main";
    const { figure, problems: p } = buildFigure(fig);
    figures[id] = figure;
    if (p.length) problems[id] = p;
  }
  return { figures, problems };
}

// What one scene shows of its figure: the named shapes, each arriving with
// the line that talks about it.
export function sceneDiagram(figure, show, lastLine) {
  if (!figure) return null;
  if (figure.picture) return { picture: figure.picture, ...(figure.photo ? { photo: true } : {}) };
  const list = Array.isArray(show) && show.length
    ? show.map((s) => (typeof s === "string" ? { id: s, at: 0 } : s))
    : figure.order.map((id) => ({ id, at: 0 }));
  const seen = new Set();
  const shapes = [];
  for (const { id, at } of list) {
    const shape = figure.shapes[String(id)];
    if (!shape || seen.has(id)) continue;
    seen.add(id);
    const { more, ...one } = shape;
    const when = Math.max(0, Math.min(lastLine, Number.isInteger(at) ? at : 0));
    shapes.push({ ...one, at: when });
    for (const piece of more || []) shapes.push({ ...one, points: piece, at: when });
  }
  if (!shapes.length) return null;
  return { x: figure.x, y: figure.y, grid: figure.grid, axes: figure.axes, shapes };
}
