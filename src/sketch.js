// Hand drawn graphs for the notes and for Dwiddle's chat: a line or two on a
// pair of labelled axes, like a teacher's whiteboard sketch. The model gives
// the labels and a few points; everything else is drawn here, so a graph can
// be about the notes themselves instead of being a loosely related picture.
//
// { title, x: "Time (s)", y: "Distance (m)",
//   lines: [{ pts: [[0,0],[2,2],[4,2],[6,5]], label: "stopped", smooth: false, dashed: false }] }

const short = (s, n) => String(s ?? "").replace(/[–—]/g, "-").trim().slice(0, n);

export function cleanSketch(s) {
  if (!s || typeof s !== "object") return null;
  const lines = (Array.isArray(s.lines) ? s.lines : []).slice(0, 4).map((l) => {
    const pts = (Array.isArray(l?.pts) ? l.pts : []).slice(0, 40)
      .map((p) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : null))
      .filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (pts.length < 2) return null;
    return { pts, label: short(l.label, 28), smooth: l.smooth === true, dashed: l.dashed === true };
  }).filter(Boolean);
  if (!lines.length) return null;
  return { title: short(s.title, 40), x: short(s.x, 28), y: short(s.y, 28), lines };
}

// Where everything goes, in a 300 by 220 box. Axes start at zero when the
// data does, so a straight line from the origin looks like one.
export function layoutSketch(s) {
  const L = 46, R = 284, T = 22, B = 176;
  const all = s.lines.flatMap((l) => l.pts);
  const lo = (i) => Math.min(0, ...all.map((p) => p[i]));
  const hi = (i) => Math.max(...all.map((p) => p[i]));
  const x0 = lo(0), y0 = lo(1);
  const dx = (hi(0) - x0) || 1, dy = (hi(1) - y0) || 1;
  const px = (v) => L + 14 + ((v - x0) / dx) * (R - L - 36);
  const py = (v) => B - 12 - ((v - y0) / dy) * (B - T - 30);
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
const OK_TAGS = new Set(["svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "text", "tspan"]);
const OK_ATTRS = new Set(["d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "transform", "font-size", "font-family", "text-anchor", "viewBox", "font-weight", "font-style"]);
export function cleanSvg(src) {
  if (typeof src !== "string" || src.length > 12000) return null;
  const doc = new DOMParser().parseFromString(src, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.nodeName !== "svg" || doc.querySelector("parsererror")) return null;
  const walk = (el) => {
    for (const child of [...el.children]) {
      if (!OK_TAGS.has(child.nodeName)) { child.remove(); continue; }
      walk(child);
    }
    for (const a of [...el.attributes]) {
      const bad = !OK_ATTRS.has(a.name) || /url\(|javascript:|data:|<|&/i.test(a.value);
      if (bad) el.removeAttribute(a.name);
    }
  };
  walk(root);
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!root.getAttribute("viewBox")) root.setAttribute("viewBox", "0 0 300 220");
  root.removeAttribute("width"); root.removeAttribute("height");
  return new XMLSerializer().serializeToString(root);
}
