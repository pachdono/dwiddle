// Hand drawn graphs for the notes and for Dwiddle's chat: a line or two on a
// pair of labelled axes, like a teacher's whiteboard sketch. The model gives
// the labels and a few points; everything else is drawn here, so a graph can
// be about the notes themselves instead of being a loosely related picture.
//
// { title, x: "Time (s)", y: "Distance (m)",
//   lines: [{ pts: [[0,0],[2,2],[4,2],[6,5]], label: "stopped", smooth: false, dashed: false }] }

export const COLORS = ["blue", "red", "green", "orange", "black"];
const short = (s, n) => String(s ?? "").replace(/[–—]/g, "-").trim().slice(0, n);

export function cleanSketch(s) {
  if (!s || typeof s !== "object") return null;
  const lines = (Array.isArray(s.lines) ? s.lines : []).slice(0, 4).map((l) => {
    const pts = (Array.isArray(l?.pts) ? l.pts : []).slice(0, 40)
      .map((p) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : null))
      .filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (pts.length < 2) return null;
    return { pts, label: short(l.label, 30), smooth: l.smooth === true, dashed: l.dashed === true, color: COLORS.includes(l.color) ? l.color : null };
  }).filter(Boolean);
  if (!lines.length) return null;
  const dots = (Array.isArray(s.dots) ? s.dots : []).slice(0, 6)
    .map((d) => (Array.isArray(d?.at) && Number.isFinite(Number(d.at[0])) && Number.isFinite(Number(d.at[1])) ? { at: [Number(d.at[0]), Number(d.at[1])], label: short(d.label, 26) } : null)).filter(Boolean);
  const num = (v) => Number.isFinite(Number(v));
  const arrows = (Array.isArray(s.arrows) ? s.arrows : []).slice(0, 4)
    .filter((a) => Array.isArray(a?.from) && Array.isArray(a?.to) && [...a.from, ...a.to].every(num))
    .map((a) => ({ from: a.from.map(Number), to: a.to.map(Number), label: short(a.label, 26), color: COLORS.includes(a.color) ? a.color : "black" }));
  return { title: short(s.title, 50), x: short(s.x, 32), y: short(s.y, 32), lines, dots, arrows, numbers: s.numbers !== false };
}

// Where everything goes, in a 300 by 220 box. Axes start at zero when the
// data does, so a straight line from the origin looks like one.
export function layoutSketch(s) {
  const L = 62, R = 342, T = 28, B = 214;
  const all = [...s.lines.flatMap((l) => l.pts), ...(s.dots || []).map((d) => d.at), ...(s.arrows || []).flatMap((a) => [a.from, a.to])];
  const lo = (i) => Math.min(0, ...all.map((p) => p[i]));
  const hi = (i) => Math.max(...all.map((p) => p[i]));
  const x0 = lo(0), y0 = lo(1);
  const dx = (hi(0) - x0) || 1, dy = (hi(1) - y0) || 1;
  const px = (v) => L + 8 + ((v - x0) / dx) * (R - L - 40);
  const py = (v) => B - 6 - ((v - y0) / dy) * (B - T - 28);
  return { L, R, T, B, px, py };
}

// Straight segments, or a smooth curve through the points (Catmull-Rom).
export function pathOf(pts, smooth) {
  if (!smooth || pts.length < 3) return pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// A drawing from the model, as SVG text, made safe to put on a page: only
// plain shapes and text, no scripts, links, images or event handlers.
const OK_TAGS = new Set(["svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "text", "tspan", "defs", "linearGradient", "radialGradient", "stop"]);
const OK_ATTRS = new Set(["id", "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "fill-opacity", "stroke-opacity", "transform", "font-size", "font-family", "text-anchor", "dominant-baseline", "viewBox", "font-weight", "font-style", "offset", "stop-color", "stop-opacity", "gradientUnits", "fx", "fy"]);
// Models wrap the drawing in a code fence, leave a bare & in a label or add
// prose around it. All of that is mended before the drawing is thrown away.
function repairSvg(src) {
  let t = String(src || "");
  const m = t.match(/<svg[\s\S]*<\/svg>/i);
  if (m) t = m[0];
  return t.replace(/&(?!(amp|lt|gt|quot|apos|#\d+);)/g, "&amp;");
}
let drawn = 0;
export function cleanSvg(src) {
  src = repairSvg(src);
  if (!src || src.length > 16000) return null;
  const doc = new DOMParser().parseFromString(src, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.nodeName !== "svg" || doc.querySelector("parsererror")) return null;
  const pre = "d" + (++drawn) + "-";
  const walk = (el) => {
    for (const child of [...el.children]) {
      if (!OK_TAGS.has(child.nodeName)) { child.remove(); continue; }
      walk(child);
    }
    for (const a of [...el.attributes]) {
      // a gradient may be used by name from inside the same drawing, nothing else
      const ref = /^url\(#([\w-]+)\)$/.exec(a.value.trim());
      if (ref && (a.name === "fill" || a.name === "stroke")) { el.setAttribute(a.name, `url(#${pre}${ref[1]})`); continue; }
      if (a.name === "id" && /^[\w-]+$/.test(a.value)) { el.setAttribute("id", pre + a.value); continue; }
      const bad = !OK_ATTRS.has(a.name) || /url\(|javascript:|data:|<|&/i.test(a.value);
      if (bad) el.removeAttribute(a.name);
    }
  };
  walk(root);
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!root.getAttribute("viewBox")) root.setAttribute("viewBox", "0 0 400 300");
  root.removeAttribute("width"); root.removeAttribute("height");
  return new XMLSerializer().serializeToString(root);
}
