// Graphs on notebook pages, drawn as if by hand: axes with a slight wobble,
// curves in pen colours and labels in handwriting. A graph is one item on the
// page ({ type: "graph", x, y, w, h, spec }), so it moves and resizes like a
// picture, and tapping Edit opens the helper again.
//
// spec.kind:
//   "fn"     y = f(x) for up to three formulas, with numbered axes
//   "sketch" the shape of a relationship, no numbers, for science and
//            economics (enzyme activity against temperature, supply and demand)
//   "bar"    a bar chart from labels and values

import { useMemo, useState } from "react";
import { compile, sample, autoRange, niceStep } from "./graphMath.js";
import { Portal } from "./ui.jsx";

const GRAPH_COLORS = ["#3B5BFD", "#e5484d", "#16a34a", "#9333ea", "#f97316"];
const HAND = "Caveat, 'Patrick Hand', cursive";
const INK = "#2b2d38";

// A small, steady wobble, the same every time for the same line.
function wobbly(x1, y1, x2, y2, seed = 1) {
  const n = 6, pts = [];
  const len = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  for (let i = 0; i <= n; i++) {
    const t = i / n, j = i === 0 || i === n ? 0 : Math.sin(seed * 12.9 + i * 2.3) * 1.1;
    pts.push([x1 + (x2 - x1) * t + nx * j, y1 + (y2 - y1) * t + ny * j]);
  }
  return smooth(pts);
}
function smooth(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [nx, ny] = pts[i + 1];
    d += `Q${x.toFixed(1)} ${y.toFixed(1)} ${((x + nx) / 2).toFixed(1)} ${((y + ny) / 2).toFixed(1)}`;
  }
  const l = pts[pts.length - 1];
  return d + `L${l[0].toFixed(1)} ${l[1].toFixed(1)}`;
}
const fmt = (v) => (Math.abs(v) < 1e-9 ? "0" : Math.abs(v) >= 1000 || Math.abs(v) < 0.01 ? v.toExponential(0) : String(+v.toFixed(2)));

// Sketch curves: points across 0 to 10, heights 0 to 10.
const SKETCHES = {
  enzyme: { title: "Enzyme activity and temperature", x: "Temperature", y: "Rate of reaction", series: [{ pts: [[0, 0.4], [2, 1.4], [4, 3.2], [5.5, 5.6], [6.6, 8.4], [7.1, 9], [7.6, 7.6], [8.2, 3.6], [8.8, 0.6], [9.2, 0.1]], label: "optimum", mark: 5 }] },
  light: { title: "Rate of photosynthesis and light", x: "Light intensity", y: "Rate of photosynthesis", series: [{ pts: [[0, 0.2], [1.5, 3], [3, 5.6], [4.5, 7.4], [6, 8.3], [7.5, 8.6], [10, 8.7]], label: "another factor limits it here", mark: 5 }] },
  population: { title: "Population growth", x: "Time", y: "Population", series: [{ pts: [[0, 0.4], [2, 0.8], [3.5, 2], [5, 5], [6.5, 7.8], [8, 8.8], [10, 9]], label: "carrying capacity", mark: 6 }] },
  distance: { title: "Distance and time", x: "Time (s)", y: "Distance (m)", series: [{ pts: [[0, 0], [3, 3.6], [5, 3.6], [9, 9]], straight: true, label: "stopped", mark: 1 }] },
  velocity: { title: "Velocity and time", x: "Time (s)", y: "Velocity (m/s)", series: [{ pts: [[0, 0], [3, 6], [7, 6], [9.5, 0]], straight: true, label: "steady speed", mark: 1 }] },
  reaction: { title: "Product formed over time", x: "Time", y: "Product made", series: [{ pts: [[0, 0], [1, 3], [2, 5.2], [3.5, 7], [5, 8], [7, 8.6], [10, 8.8]], label: "reaction finished", mark: 5 }] },
  cooling: { title: "Cooling curve", x: "Time", y: "Temperature", series: [{ pts: [[0, 9], [1.5, 6.2], [3, 4.4], [5, 3], [7, 2.3], [10, 2]], label: "", mark: -1 }] },
  decay: { title: "Radioactive decay", x: "Time", y: "Activity", series: [{ pts: [[0, 9], [2, 4.5], [4, 2.25], [6, 1.1], [8, 0.56], [10, 0.28]], label: "halves each half-life", mark: 1 }] },
  hooke: { title: "Stretching a spring", x: "Extension", y: "Force", series: [{ pts: [[0, 0], [5, 6], [6.5, 7.2], [8, 7.9], [9.5, 8.2]], label: "limit of proportionality", mark: 1 }] },
  supplyOnly: { title: "Supply curve", x: "Quantity", y: "Price", series: [{ pts: [[1, 1.5], [9, 8.5]], straight: true, label: "S", end: true }] },
  demandOnly: { title: "Demand curve", x: "Quantity", y: "Price", series: [{ pts: [[1, 8.5], [9, 1.5]], straight: true, label: "D", end: true, color: 1 }] },
  supplyShift: { title: "Supply rises", x: "Quantity", y: "Price", series: [{ pts: [[1, 1.5], [8, 8.5]], straight: true, label: "S1", end: true }, { pts: [[2.6, 1.5], [9.6, 8.5]], straight: true, label: "S2", end: true, dash: true, color: 0 }, { pts: [[1, 8.5], [9, 1.5]], straight: true, label: "D", end: true, color: 1 }], shift: [[5.2, 6.4], [6.6, 6.4]], dots: [[4.6, 4.9, "E1"], [5.4, 4.1, "E2"]] },
  demandShift: { title: "Demand rises", x: "Quantity", y: "Price", series: [{ pts: [[1, 8.5], [8, 1.5]], straight: true, label: "D1", end: true, color: 1 }, { pts: [[2.6, 8.5], [9.6, 1.5]], straight: true, label: "D2", end: true, color: 1, dash: true }, { pts: [[1, 1.5], [9, 8.5]], straight: true, label: "S", end: true }], shift: [[3.4, 6.1], [4.8, 6.1]], dots: [[4.5, 5, "E1"], [5.3, 5.8, "E2"]] },
  ppf: { title: "Production possibility frontier", x: "Good B", y: "Good A", series: [{ pts: [[0, 8.6], [2.5, 8.1], [4.5, 7], [6.2, 5.2], [7.4, 3], [8.2, 0]], label: "PPF", mark: 3 }], dots: [[3, 4, "inside: unused resources"], [4.5, 7, "on: efficient"], [7, 7, "outside: not possible yet"]] },
  ppfShift: { title: "PPF shifts out (economic growth)", x: "Good B", y: "Good A", series: [{ pts: [[0, 7], [2, 6.6], [3.6, 5.6], [5, 4.1], [6, 2.4], [6.6, 0]], label: "PPF1", mark: 3 }, { pts: [[0, 8.8], [2.5, 8.3], [4.6, 7.1], [6.4, 5.2], [7.6, 3], [8.4, 0]], label: "PPF2", mark: 4, dash: true, color: 0 }], shift: [[4.6, 4.4], [5.8, 5.6]] },
  adas: { title: "Aggregate demand and supply", x: "Real output (Y)", y: "Price level", series: [{ pts: [[1, 8.5], [9, 1.5]], straight: true, label: "AD", end: true, color: 1 }, { pts: [[1, 1.5], [5, 3.5], [7, 5.5], [8, 8.5]], label: "SRAS", end: true }, { pts: [[7.6, 0.5], [7.6, 9.5]], straight: true, label: "LRAS", end: true, color: 2 }], dots: [[6.3, 4.6, "equilibrium"]] },
  ceiling: { title: "Maximum price (price ceiling)", x: "Quantity", y: "Price", series: [{ pts: [[1, 1.5], [9, 8.5]], straight: true, label: "S", end: true }, { pts: [[1, 8.5], [9, 1.5]], straight: true, label: "D", end: true, color: 1 }, { pts: [[0.5, 3.5], [9.5, 3.5]], straight: true, label: "max price", end: true, color: 3, dash: true }], dots: [[3.3, 3.5, "Qs"], [6.7, 3.5, "Qd, shortage between"]] },
  floor: { title: "Minimum price (price floor)", x: "Quantity", y: "Price", series: [{ pts: [[1, 1.5], [9, 8.5]], straight: true, label: "S", end: true }, { pts: [[1, 8.5], [9, 1.5]], straight: true, label: "D", end: true, color: 1 }, { pts: [[0.5, 6.5], [9.5, 6.5]], straight: true, label: "min price", end: true, color: 3, dash: true }], dots: [[3.3, 6.5, "Qd"], [6.7, 6.5, "Qs, surplus between"]] },
  costs: { title: "Cost curves", x: "Output", y: "Cost", series: [{ pts: [[0.8, 6], [2.5, 3.2], [4, 2.6], [5.5, 3.6], [7, 6], [8.5, 9.4]], label: "MC", mark: 5 }, { pts: [[0.8, 8.8], [2.5, 5.6], [4.5, 4], [6, 3.8], [7.5, 4.6], [9.5, 6.4]], label: "AC", mark: 5, color: 1 }], dots: [[6, 3.8, "MC cuts AC at its lowest"]] },
  elastic: { title: "Elastic and inelastic demand", x: "Quantity", y: "Price", series: [{ pts: [[1, 6], [9.5, 4]], straight: true, label: "elastic", end: true }, { pts: [[4.5, 9.5], [5.5, 0.5]], straight: true, label: "inelastic", end: true, color: 1 }] },
  lorenz: { title: "Lorenz curve", x: "Share of population", y: "Share of income", series: [{ pts: [[0, 0], [10, 10]], straight: true, label: "equality", end: true, color: 2, dash: true }, { pts: [[0, 0], [3, 1], [5, 2.3], [7, 4.2], [8.5, 6.2], [10, 10]], label: "Lorenz", mark: 3 }] },
  supply: { title: "Supply and demand", x: "Quantity", y: "Price", series: [{ pts: [[1, 1.5], [9, 8.5]], straight: true, label: "S", end: true }, { pts: [[1, 8.5], [9, 1.5]], straight: true, label: "D", end: true }], meet: [5, 5], meetLabel: "equilibrium" },
};

export const PRESETS = [
  { group: "Maths", name: "y = x²", spec: { kind: "fn", fns: ["x^2"], x: [-5, 5] } },
  { group: "Maths", name: "y = 2x + 1", spec: { kind: "fn", fns: ["2x + 1"], x: [-5, 5] } },
  { group: "Maths", name: "y = x³", spec: { kind: "fn", fns: ["x^3"], x: [-3, 3] } },
  { group: "Maths", name: "y = x² − 4x + 3", spec: { kind: "fn", fns: ["x^2 - 4x + 3"], x: [-1, 5] } },
  { group: "Maths", name: "y = 1/x", spec: { kind: "fn", fns: ["1/x"], x: [-5, 5], y: [-5, 5] } },
  { group: "Maths", name: "y = sin x", spec: { kind: "fn", fns: ["sin(x)"], x: [-6.3, 6.3], y: [-1.5, 1.5] } },
  { group: "Maths", name: "y = cos x", spec: { kind: "fn", fns: ["cos(x)"], x: [-6.3, 6.3], y: [-1.5, 1.5] } },
  { group: "Maths", name: "y = eˣ", spec: { kind: "fn", fns: ["e^x"], x: [-3, 3] } },
  { group: "Maths", name: "y = √x", spec: { kind: "fn", fns: ["sqrt(x)"], x: [0, 10] } },
  { group: "Maths", name: "y = |x|", spec: { kind: "fn", fns: ["abs(x)"], x: [-5, 5] } },
  ...Object.entries(SKETCHES).map(([id, s]) => ({ group: ["supply", "supplyOnly", "demandOnly", "supplyShift", "demandShift", "ppf", "ppfShift", "adas", "ceiling", "floor", "costs", "elastic", "lorenz"].includes(id) ? "Economics" : ["distance", "velocity", "cooling", "decay", "hooke"].includes(id) ? "Physics" : ["reaction"].includes(id) ? "Chemistry" : "Biology", name: s.title, spec: { kind: "sketch", id } })),
  { group: "Charts", name: "Bar chart", spec: { kind: "bar", labels: ["A", "B", "C", "D"], values: [4, 7, 3, 6] } },
];

// Which ready made graph fits some notes, if one clearly does.
const FITS = [
  ["enzyme", /enzyme[^.]{0,80}(temperature|denatur)|(temperature|denatur)[^.]{0,80}enzyme/i],
  ["light", /light intensity[^.]{0,120}(photosynth|rate)|rate of photosynthesis/i],
  ["ppf", /production possibilit|\bppf\b|\bppc\b/i],
  ["adas", /aggregate demand|aggregate supply|\bsras\b|\blras\b/i],
  ["ceiling", /maximum price|price ceiling/i],
  ["floor", /minimum price|price floor|minimum wage/i],
  ["lorenz", /lorenz curve|gini/i],
  ["costs", /marginal cost|average cost/i],
  ["elastic", /price elasticity|elastic demand|inelastic/i],
  ["supply", /supply and demand|demand curve|supply curve/i],
  ["population", /population growth|carrying capacity/i],
  ["decay", /half[- ]life|radioactive decay/i],
  ["hooke", /hooke'?s law|limit of proportionality/i],
  ["velocity", /velocity[- ]time|speed[- ]time graph/i],
  ["distance", /distance[- ]time/i],
  ["cooling", /cooling curve|newton'?s law of cooling/i],
  ["reaction", /rate of (a )?reaction|product formed/i],
];
export function sketchFor(text) {
  const hit = FITS.find(([, re]) => re.test(text));
  return hit ? { kind: "sketch", id: hit[0] } : null;
}

export function GraphView({ spec, w, h, colors = GRAPH_COLORS }) {
  const drawn = useMemo(() => layout(spec, w, h), [spec, w, h]);
  const { pad, inner, plots, xticks, yticks, origin, title, xl, yl, marks } = drawn;
  const X0 = pad.l, Y0 = pad.t, W = inner.w, H = inner.h;
  return (
    <g fontFamily={HAND}>
      <defs><marker id="gh-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill={INK} /></marker></defs>
      <rect x="0" y="0" width={w} height={h} rx="10" fill="#ffffff" opacity="0.6" />
      {spec.grid !== false && spec.kind === "fn" && xticks.map((t, i) => <line key={"gx" + i} x1={t.px} x2={t.px} y1={Y0} y2={Y0 + H} stroke="#e6e9f0" strokeWidth="1" />)}
      {spec.grid !== false && spec.kind === "fn" && yticks.map((t, i) => <line key={"gy" + i} x1={X0} x2={X0 + W} y1={t.py} y2={t.py} stroke="#e6e9f0" strokeWidth="1" />)}
      <path d={wobbly(origin.x, Y0 + H + 2, origin.x, Y0 - 6, 1)} stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d={wobbly(X0 - 2, origin.y, X0 + W + 6, origin.y, 2)} stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d={`M${origin.x - 6} ${Y0 + 2}L${origin.x} ${Y0 - 8}L${origin.x + 6} ${Y0 + 2}`} stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${X0 + W - 2} ${origin.y - 6}L${X0 + W + 8} ${origin.y}L${X0 + W - 2} ${origin.y + 6}`} stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {xticks.map((t, i) => <g key={"tx" + i}><line x1={t.px} x2={t.px} y1={origin.y - 4} y2={origin.y + 4} stroke={INK} strokeWidth="1.6" /><text x={t.px} y={origin.y + 20} textAnchor="middle" fontSize="16" fill={INK}>{t.label}</text></g>)}
      {yticks.map((t, i) => <g key={"ty" + i}><line x1={origin.x - 4} x2={origin.x + 4} y1={t.py} y2={t.py} stroke={INK} strokeWidth="1.6" /><text x={origin.x - 8} y={t.py + 5} textAnchor="end" fontSize="16" fill={INK}>{t.label}</text></g>)}
      {spec.kind === "bar" ? plots.map((b, i) => (
        <g key={i}>
          <path d={`M${b.x} ${b.base}L${b.x} ${b.top}L${b.x + b.w} ${b.top}L${b.x + b.w} ${b.base}`} fill={colors[i % colors.length]} fillOpacity="0.28" stroke={colors[i % colors.length]} strokeWidth="2.4" strokeLinejoin="round" />
          <text x={b.x + b.w / 2} y={b.base + 20} textAnchor="middle" fontSize="17" fill={INK}>{b.label}</text>
          <text x={b.x + b.w / 2} y={b.top - 6} textAnchor="middle" fontSize="16" fill={colors[i % colors.length]}>{b.value}</text>
        </g>
      )) : plots.map((p, i) => p.runs.map((run, k) => (
        <path key={i + ":" + k} d={p.straight ? `M${run.map((q) => q.join(" ")).join("L")}` : smooth(run)} stroke={colors[(p.color ?? i) % colors.length]} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={p.dash ? "9 7" : undefined} />
      )))}
      {marks.dashes.map((d, i) => <path key={"ds" + i} d={`M${d.x1} ${d.y1}L${d.x2} ${d.y2}`} stroke={INK} strokeWidth="1.6" strokeDasharray="5 5" />)}
      {marks.arrows.map((a, i) => <path key={"ar" + i} d={`M${a.x1} ${a.y1}L${a.x2} ${a.y2}`} stroke={INK} strokeWidth="2.4" markerEnd="url(#gh-arrow)" fill="none" />)}
      {marks.dots.map((d, i) => <circle key={"dt" + i} cx={d.x} cy={d.y} r="5" fill={INK} />)}
      {marks.texts.map((t, i) => <text key={"tx" + i} x={t.x} y={t.y} textAnchor={t.anchor || "start"} fontSize={t.size} fill={t.color}>{t.t}</text>)}
      {title && <text x={w / 2} y={22} textAnchor="middle" fontSize="21" fontWeight="700" fill={INK}>{title}</text>}
      {xl && <text x={X0 + W} y={h - 6} textAnchor="end" fontSize="18" fill={INK}>{xl}</text>}
      {yl && <text x={14} y={Y0 + H / 2} textAnchor="middle" fontSize="18" fill={INK} transform={`rotate(-90 14 ${Y0 + H / 2})`}>{yl}</text>}
    </g>
  );
}

const emptyMarks = () => ({ texts: [], dots: [], arrows: [], dashes: [] });

function layout(spec, w, h) {
  const sketch = spec.kind === "sketch" ? SKETCHES[spec.id] : null;
  const title = spec.title ?? sketch?.title ?? "";
  const xl = spec.xLabel ?? sketch?.x ?? (spec.kind === "fn" ? "x" : "");
  const yl = spec.yLabel ?? sketch?.y ?? (spec.kind === "fn" ? "y" : "");
  const pad = { l: spec.kind === "fn" ? 46 : 38, r: 18, t: title ? 38 : 16, b: 36 };
  const inner = { w: Math.max(40, w - pad.l - pad.r), h: Math.max(40, h - pad.t - pad.b) };
  const X0 = pad.l, Y0 = pad.t;
  if (spec.kind === "bar") {
    const values = (spec.values || []).map(Number).map((v) => (Number.isFinite(v) ? v : 0));
    const top = Math.max(1, ...values) * 1.15, n = Math.max(1, values.length), slot = inner.w / n;
    const step = niceStep(top, 5);
    const py = (v) => Y0 + inner.h - (v / top) * inner.h;
    return {
      pad, inner, title, xl, yl, marks: emptyMarks(), origin: { x: X0, y: Y0 + inner.h },
      xticks: [],
      yticks: Array.from({ length: Math.floor(top / step) }, (_, k) => ({ py: py((k + 1) * step), label: fmt((k + 1) * step) })),
      plots: values.map((v, i) => ({ x: X0 + slot * i + slot * 0.18, w: slot * 0.64, base: Y0 + inner.h, top: py(v), value: fmt(v), label: String(spec.labels?.[i] ?? "") })),
    };
  }
  if (sketch) {
    const px = (x) => X0 + (x / 10) * inner.w, py = (y) => Y0 + inner.h - (y / 10) * inner.h;
    const m = emptyMarks();
    sketch.series.forEach((s, i) => {
      const at = s.end ? s.pts[s.pts.length - 1] : s.pts[s.mark] || null;
      if (s.label && at) m.texts.push({ x: px(at[0]) + (s.end ? 8 : 6), y: py(at[1]) - 10, t: s.label, size: 18, color: GRAPH_COLORS[(s.color ?? i) % GRAPH_COLORS.length] });
    });
    (sketch.dots || []).forEach(([x, y, label]) => {
      m.dots.push({ x: px(x), y: py(y) });
      if (label) m.texts.push({ x: px(x) + 9, y: py(y) - 8, t: label, size: 16, color: INK });
    });
    if (sketch.shift) {
      const [[a, b], [c, d]] = sketch.shift;
      m.arrows.push({ x1: px(a), y1: py(b), x2: px(c), y2: py(d) });
    }
    if (sketch.meet) {
      const [mx, my] = sketch.meet;
      m.dashes.push({ x1: px(mx), y1: py(my), x2: px(mx), y2: py(0) }, { x1: px(mx), y1: py(my), x2: px(0), y2: py(my) });
      m.dots.push({ x: px(mx), y: py(my) });
      m.texts.push({ x: px(mx) + 10, y: py(my) + 22, t: sketch.meetLabel, size: 18, color: INK });
    }
    return {
      pad, inner, title, xl, yl, marks: m, origin: { x: X0, y: Y0 + inner.h }, xticks: [], yticks: [],
      plots: sketch.series.map((s) => ({ straight: s.straight, dash: s.dash, color: s.color, runs: [s.pts.map(([x, y]) => [px(x), py(y)])] })),
    };
  }
  // y = f(x)
  const xr = spec.x || [-5, 5];
  const fns = (spec.fns || []).map((src) => { try { return compile(src); } catch { return null; } });
  const runsData = fns.map((f) => (f ? sample(f, xr) : []));
  const yr = spec.y || autoRange(runsData.flat());
  const px = (x) => X0 + ((x - xr[0]) / (xr[1] - xr[0])) * inner.w;
  const py = (y) => Y0 + inner.h - ((y - yr[0]) / (yr[1] - yr[0])) * inner.h;
  const clampY = (y) => Math.max(yr[0] - (yr[1] - yr[0]) * 0.05, Math.min(yr[1] + (yr[1] - yr[0]) * 0.05, y));
  const sx = niceStep(xr[1] - xr[0], Math.max(4, Math.round(inner.w / 60))), sy = niceStep(yr[1] - yr[0], Math.max(4, Math.round(inner.h / 50)));
  const ox = xr[0] <= 0 && xr[1] >= 0 ? px(0) : X0, oy = yr[0] <= 0 && yr[1] >= 0 ? py(0) : Y0 + inner.h;
  const ticks = (a, b, s) => { const out = []; for (let v = Math.ceil(a / s) * s; v <= b + 1e-9; v += s) if (Math.abs(v) > 1e-9) out.push(+v.toFixed(10)); return out; };
  const marks = emptyMarks();
  (spec.fns || []).forEach((src, i) => fns[i] && marks.texts.push({ x: X0 + inner.w - 4, y: Y0 + 18 + i * 22, anchor: "end", size: 18, color: GRAPH_COLORS[i % GRAPH_COLORS.length],
    t: "y = " + String(src).replace(/^\s*y\s*=\s*/i, "").replace(/\^2/g, "²").replace(/\^3/g, "³") }));
  return {
    pad, inner, title, xl, yl, marks, origin: { x: ox, y: oy },
    xticks: ticks(xr[0], xr[1], sx).map((v) => ({ px: px(v), label: fmt(v) })),
    yticks: ticks(yr[0], yr[1], sy).map((v) => ({ py: py(v), label: fmt(v) })),
    plots: runsData.map((runs) => ({ runs: runs.map((run) => run.filter(([, y]) => y >= yr[0] - (yr[1] - yr[0]) * 0.5 && y <= yr[1] + (yr[1] - yr[0]) * 0.5).map(([x, y]) => [px(x), py(clampY(y))])).filter((r) => r.length > 1) })),
  };
}

// The graph helper: type a formula, pick a ready made graph, or make a bar chart.
export function GraphHelper({ initial, onDone, onClose }) {
  const [tab, setTab] = useState(initial?.kind === "bar" ? "bar" : initial?.kind === "sketch" ? "presets" : "plot");
  const [fns, setFns] = useState(initial?.kind === "fn" ? [...initial.fns, "", ""].slice(0, 3) : ["x^2 - 3", "", ""]);
  const [xr, setXr] = useState(initial?.kind === "fn" ? (initial.x || [-5, 5]).map(String) : ["-5", "5"]);
  const [title, setTitle] = useState(initial?.title || "");
  const [bars, setBars] = useState(initial?.kind === "bar" ? initial.labels.map((l, i) => [l, String(initial.values[i])]) : [["Mon", "3"], ["Tue", "5"], ["Wed", "2"], ["Thu", "6"]]);
  const [picked, setPicked] = useState(initial?.kind === "sketch" ? initial : null);

  const errors = fns.map((f) => { if (!f.trim()) return ""; try { compile(f); return ""; } catch (e) { return e.message; } });
  const x0 = parseFloat(xr[0]), x1 = parseFloat(xr[1]);
  const rangeOk = Number.isFinite(x0) && Number.isFinite(x1) && x1 > x0;
  const spec = tab === "plot" ? { kind: "fn", fns: fns.filter((f, i) => f.trim() && !errors[i]), x: rangeOk ? [x0, x1] : [-5, 5], ...(title.trim() ? { title: title.trim() } : {}) }
    : tab === "bar" ? { kind: "bar", labels: bars.map((b) => b[0]), values: bars.map((b) => parseFloat(b[1]) || 0), ...(title.trim() ? { title: title.trim() } : {}) }
    : picked;
  const ok = spec && (spec.kind !== "fn" || spec.fns.length) && (tab !== "plot" || rangeOk);

  return (
    <Portal>
      <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="gate nb-gh" role="dialog" aria-modal="true" aria-label="Add a graph">
          <div className="nb-gh-head">
            <b>{initial ? "Edit graph" : "Add a graph"}</b>
            <div className="nb-stk-tabs" role="tablist">
              {[["plot", "Plot a formula"], ["presets", "Ready made"], ["bar", "Bar chart"]].map(([id, n]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{n}</button>
              ))}
            </div>
          </div>
          <div className="nb-gh-body">
            <div className="nb-gh-form">
              {tab === "plot" && <>
                {fns.map((f, i) => (
                  <label key={i} className="nb-gh-fn" style={{ "--c": GRAPH_COLORS[i] }}>
                    <span>y =</span>
                    <input value={f} placeholder={i === 0 ? "x^2 - 3" : "another, if you like"} onChange={(e) => setFns((all) => all.map((v, k) => (k === i ? e.target.value : v)))} />
                    {errors[i] && <em>{errors[i]}</em>}
                  </label>
                ))}
                <div className="nb-gh-range"><span>x from</span><input value={xr[0]} onChange={(e) => setXr([e.target.value, xr[1]])} inputMode="decimal" /><span>to</span><input value={xr[1]} onChange={(e) => setXr([xr[0], e.target.value])} inputMode="decimal" /></div>
                <p className="small muted">Write it the way you would on paper: 2x + 1, x^2, sin(x), sqrt(x), 1/x, e^x.</p>
              </>}
              {tab === "presets" && (
                <div className="nb-gh-presets">
                  {["Maths", "Biology", "Chemistry", "Physics", "Economics"].map((g) => (
                    <div key={g}>
                      <span className="qv-label">{g}</span>
                      <div className="nb-gh-grid">
                        {PRESETS.filter((p) => p.group === g).map((p) => (
                          <button key={p.name} className={picked && JSON.stringify(picked) === JSON.stringify(p.spec) ? "on" : ""}
                            onClick={() => { if (p.spec.kind === "fn") { setFns([...p.spec.fns, "", ""].slice(0, 3)); setXr(p.spec.x.map(String)); setTab("plot"); } else setPicked(p.spec); }}>
                            <svg viewBox="0 0 160 110" width="100%"><GraphView spec={{ ...p.spec, title: "" }} w={160} h={110} /></svg>
                            <span>{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {tab === "bar" && <>
                {bars.map((b, i) => (
                  <div key={i} className="nb-gh-bar">
                    <input value={b[0]} placeholder="Label" onChange={(e) => setBars((all) => all.map((v, k) => (k === i ? [e.target.value, v[1]] : v)))} />
                    <input value={b[1]} placeholder="Value" inputMode="decimal" onChange={(e) => setBars((all) => all.map((v, k) => (k === i ? [v[0], e.target.value] : v)))} />
                    <button onClick={() => setBars((all) => all.filter((_, k) => k !== i))} aria-label="Remove">×</button>
                  </div>
                ))}
                {bars.length < 10 && <button className="btn ghost small" onClick={() => setBars((all) => [...all, ["", ""]])}>Add a bar</button>}
              </>}
              {tab !== "presets" && <label className="nb-gh-title"><span>Title (optional)</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>}
            </div>
            <div className="nb-gh-preview">
              {spec ? <svg viewBox="0 0 420 300" width="100%"><GraphView spec={spec} w={420} h={300} /></svg> : <p className="muted small">Pick a graph to see it here.</p>}
            </div>
          </div>
          <div className="nb-gh-foot">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn cta" disabled={!ok} onClick={() => onDone(spec)}>{initial ? "Update the graph" : "Put it on the page"}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// A graph as ordinary page items, each one editable on its own like anything
// drawn by hand: the axes and ticks as lines and arrows, each curve as a pen
// stroke, every label as a text box, bars as boxes, points as dots. Placed
// with its top left corner at (gx, gy).
export function graphItems(spec, gx, gy, w, h, newId) {
  const d = layout(spec, w, h);
  const { pad, inner, plots, xticks, yticks, origin, title, xl, yl, marks } = d;
  const X0 = pad.l, Y0 = pad.t, W = inner.w, H = inner.h;
  const X = (v) => +(gx + v).toFixed(1), Y = (v) => +(gy + v).toFixed(1);
  const items = [];
  const shape = (kind, x1, y1, x2, y2, o = {}) => items.push({ id: newId(), type: "shape", kind, x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), color: INK, size: 2, ...o });
  const stroke = (pts, color, size = 3) => items.push({ id: newId(), type: "stroke", tool: "pen", style: "ball", color, size, pressure: false, tip: "round", stab: 1,
    points: pts.map(([x, y]) => [X(x), Y(y), 0.5]) });
  // Handwriting text boxes; (x, y) is where the words sit, as in the preview.
  // Words grow and shrink with the graph, from the size they have in a
  // 420 wide preview.
  const k = Math.max(0.6, Math.min(2.2, w / 420));
  const text = (t, x, y, size0, color = INK, anchor = "start") => {
    const size = size0 * k;
    const str = String(t ?? "");
    if (!str.trim()) return;
    const bw = Math.ceil(str.length * size * 0.45 + 16);
    const left = anchor === "end" ? x - bw + 6 : anchor === "middle" ? x - bw / 2 : x - 6;
    items.push({ id: newId(), type: "text", x: X(left), y: Y(y - size * 1.05), w: bw, h: Math.ceil(size * 1.45), text: str,
      font: "caveat", fontSize: +(size / 1.25).toFixed(2), color, tilt: 0, wobble: false });
  };

  if (spec.kind === "fn" && spec.grid !== false) {
    xticks.forEach((t) => shape("line", t.px, Y0, t.px, Y0 + H, { color: "#d9dee8", size: 1 }));
    yticks.forEach((t) => shape("line", X0, t.py, X0 + W, t.py, { color: "#d9dee8", size: 1 }));
  }
  shape("arrow", origin.x, Y0 + H + 2, origin.x, Y0 - 8, { size: 2.4 });
  shape("arrow", X0 - 2, origin.y, X0 + W + 8, origin.y, { size: 2.4 });
  xticks.forEach((t) => { shape("line", t.px, origin.y - 4, t.px, origin.y + 4, { size: 1.6 }); text(t.label, t.px, origin.y + 20, 16, INK, "middle"); });
  yticks.forEach((t) => { shape("line", origin.x - 4, t.py, origin.x + 4, t.py, { size: 1.6 }); text(t.label, origin.x - 8, t.py + 5, 16, INK, "end"); });

  if (spec.kind === "bar") {
    plots.forEach((b, i) => {
      const c = GRAPH_COLORS[i % GRAPH_COLORS.length];
      shape("rect", b.x, b.top, b.x + b.w, b.base, { color: c, size: 2.4, fill: true });
      text(b.label, b.x + b.w / 2, b.base + 20, 17, INK, "middle");
      text(b.value, b.x + b.w / 2, b.top - 6, 16, c, "middle");
    });
  } else {
    plots.forEach((p, i) => {
      const c = GRAPH_COLORS[(p.color ?? i) % GRAPH_COLORS.length];
      p.runs.forEach((run) => {
        // Straight lines and curves alike become strokes; dashed ones are
        // drawn as short strokes with gaps, so each dash can still be erased.
        const pts = p.straight ? densify(run) : run;
        if (!p.dash) { stroke(pts, c); return; }
        for (let k = 0; k < pts.length - 1; k += 6) stroke(pts.slice(k, k + 4), c);
      });
    });
  }
  marks.dashes.forEach((m) => shape("line", m.x1, m.y1, m.x2, m.y2, { size: 1.6, dash: "dash" }));
  marks.arrows.forEach((m) => shape("arrow", m.x1, m.y1, m.x2, m.y2, { size: 2.4 }));
  marks.dots.forEach((m) => stroke([[m.x, m.y]], INK, 10));
  marks.texts.forEach((t) => text(t.t, t.x, t.y, t.size, t.color, t.anchor));
  if (title) text(title, w / 2, 22, 21, INK, "middle");
  if (xl) text(xl, X0 + W, h - 6, 18, INK, "end");
  if (yl) text(yl, origin.x + 12, Y0 + 12, 18, INK, "start");
  return items;
}

// Points every few units along straight segments, so a stroke drawn through
// them is a proper line that can be partly erased.
function densify(run) {
  const out = [run[0]];
  for (let i = 1; i < run.length; i++) {
    const [ax, ay] = run[i - 1], [bx, by] = run[i];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 8));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}
