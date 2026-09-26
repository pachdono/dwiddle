// Notebooks: write by hand, type, drop in pictures and PDFs, on paper of your
// choosing, and then have Dwiddle turn a page into notes and questions.
//
// Each page is an SVG in page units (A4 at 96 dpi), drawn over its paper
// template, so ink stays sharp at any zoom and a page can be turned into an
// image for Dwiddle to read. Ink uses perfect-freehand, which shapes a stroke
// from the pen's pressure the way a real nib spreads, and a pen being used
// switches touch to scrolling, so a resting palm does not draw.

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getStroke } from "perfect-freehand";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/600.css";
import "@fontsource/patrick-hand/400.css";
import "@fontsource/kalam/400.css";
import "@fontsource/shadows-into-light/400.css";
import { Icon, PageHead, Loading, Portal } from "./ui.jsx";
import { DuckMark } from "./Duck.jsx";
import { listBooks, getBook, putBook, deleteBook, newBook, newPage, uid, PAGE_W, PAGE_H, listFonts, putFont } from "./notebookStore.js";
import { syncNotebooks, queueUpload, queueDelete } from "./notebookSync.js";
import { readImage } from "./ai.js";
import { openDwiddle } from "./Chat.jsx";
import { FullscreenButton } from "./ContextMenu.jsx";
import { shrink } from "./custom.js";

/* ---------- paper ---------- */

export const TEMPLATES = [
  { id: "blank", name: "Blank" },
  { id: "lined", name: "Lined" },
  { id: "wide", name: "Wide lined" },
  { id: "grid", name: "Squared" },
  { id: "graph", name: "Graph paper" },
  { id: "dots", name: "Dotted" },
  { id: "cornell", name: "Cornell notes" },
  { id: "mindmap", name: "Mind map" },
  { id: "daily", name: "Daily plan" },
  { id: "todo", name: "To-do list" },
  { id: "week", name: "Week planner" },
  { id: "revision", name: "Revision card" },
  { id: "dwiddle", name: "Dwiddle page" },
];
export const PAPERS = [
  { id: "white", name: "White", bg: "#ffffff", line: "#dfe3ea", ink: "#1b1d26" },
  { id: "cream", name: "Cream", bg: "#fbf6e9", line: "#e6dcc4", ink: "#2b2519" },
  { id: "mint", name: "Mint", bg: "#f1faf5", line: "#cfe7da", ink: "#1b2a22" },
  { id: "blush", name: "Blush", bg: "#fdf2f4", line: "#f0d3da", ink: "#2d1c21" },
  { id: "dark", name: "Dark", bg: "#1c1d24", line: "#34363f", ink: "#f1f1f4" },
];
const paperOf = (id) => PAPERS.find((p) => p.id === id) || PAPERS[0];

const Paper = memo(PaperView, (a, b) => a.page.id === b.page.id && a.page.template === b.page.template && a.page.paper === b.page.paper
  && a.page.bg === b.page.bg && a.page.w === b.page.w && a.page.h === b.page.h);

function PaperView({ page }) {
  const p = paperOf(page.paper);
  const { w, h } = page;
  const L = p.line;
  const lines = (gap, top = 110, left = 0) => {
    const out = [];
    for (let y = top; y < h - 40; y += gap) out.push(<line key={y} x1={left} x2={w} y1={y} y2={y} stroke={L} strokeWidth="1" />);
    return out;
  };
  let body = null;
  switch (page.template) {
    case "lined":
      body = <>{lines(32)}<line x1="96" x2="96" y1="0" y2={h} stroke="#f2a7a7" strokeWidth="1.4" /></>;
      break;
    case "wide":
      body = <>{lines(44)}<line x1="96" x2="96" y1="0" y2={h} stroke="#f2a7a7" strokeWidth="1.4" /></>;
      break;
    case "grid":
      body = <>
        <defs><pattern id={`g-${page.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke={L} strokeWidth="1" /></pattern></defs>
        <rect width={w} height={h} fill={`url(#g-${page.id})`} />
      </>;
      break;
    case "dots":
      body = <>
        <defs><pattern id={`d-${page.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="1.4" fill={L} /></pattern></defs>
        <rect width={w} height={h} fill={`url(#d-${page.id})`} />
      </>;
      break;
    case "cornell":
      body = <>
        {lines(32, 150, 230)}
        <line x1="40" x2={w - 40} y1="100" y2="100" stroke={L} strokeWidth="2" />
        <line x1="230" x2="230" y1="100" y2={h - 230} stroke={L} strokeWidth="2" />
        <line x1="40" x2={w - 40} y1={h - 230} y2={h - 230} stroke={L} strokeWidth="2" />
        <text x="48" y="130" fontSize="15" fill={L} fontWeight="700" letterSpacing="2">CUES</text>
        <text x="248" y="130" fontSize="15" fill={L} fontWeight="700" letterSpacing="2">NOTES</text>
        <text x="48" y={h - 200} fontSize="15" fill={L} fontWeight="700" letterSpacing="2">SUMMARY</text>
      </>;
      break;
    case "mindmap":
      body = <>
        <ellipse cx={w / 2} cy={h / 2} rx="150" ry="80" fill="none" stroke={L} strokeWidth="2.5" strokeDasharray="8 7" />
        {[0, 60, 120, 180, 240, 300].map((a) => {
          const r = (a * Math.PI) / 180;
          const x = w / 2 + Math.cos(r) * 290, y = h / 2 + Math.sin(r) * 330;
          return <g key={a}>
            <line x1={w / 2 + Math.cos(r) * 160} y1={h / 2 + Math.sin(r) * 90} x2={x - Math.cos(r) * 90} y2={y - Math.sin(r) * 45} stroke={L} strokeWidth="2" />
            <ellipse cx={x} cy={y} rx="100" ry="50" fill="none" stroke={L} strokeWidth="2" />
          </g>;
        })}
      </>;
      break;
    case "week":
      body = <>
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Notes"].map((d, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          const bw = (w - 120) / 2, bh = (h - 170) / 4;
          const x = 40 + col * (bw + 40), y = 110 + row * (bh + 16);
          return <g key={d}>
            <rect x={x} y={y} width={bw} height={bh} rx="14" fill="none" stroke={L} strokeWidth="2" />
            <text x={x + 16} y={y + 30} fontSize="16" fill={L} fontWeight="700" letterSpacing="1.5">{d.toUpperCase()}</text>
          </g>;
        })}
      </>;
      break;
    case "daily":
      body = <>
        <text x="48" y="78" fontSize="15" fill={L} fontWeight="700" letterSpacing="2">DATE</text>
        <line x1="112" x2="330" y1="80" y2="80" stroke={L} strokeWidth="1.5" />
        <text x="430" y="78" fontSize="15" fill={L} fontWeight="700" letterSpacing="2">TOP 3 TODAY</text>
        {[0, 1, 2].map((i) => <g key={i}>
          <rect x="430" y={100 + i * 40} width="20" height="20" rx="5" fill="none" stroke={L} strokeWidth="2" />
          <line x1="462" x2={w - 48} y1={118 + i * 40} y2={118 + i * 40} stroke={L} strokeWidth="1" />
        </g>)}
        {Array.from({ length: 15 }, (_, i) => {
          const y = 250 + i * 50, hr = 7 + i;
          return <g key={i}>
            <text x="48" y={y + 20} fontSize="14" fill={L} fontWeight="700">{String(hr > 12 ? hr - 12 : hr) + (hr >= 12 ? " pm" : " am")}</text>
            <line x1="112" x2="380" y1={y + 32} y2={y + 32} stroke={L} strokeWidth="1" />
          </g>;
        })}
        <text x="430" y="250" fontSize="15" fill={L} fontWeight="700" letterSpacing="2">NOTES</text>
        <rect x="430" y="266" width={w - 478} height={h - 330} rx="14" fill="none" stroke={L} strokeWidth="2" />
      </>;
      break;
    case "todo":
      body = <>
        <text x="48" y="78" fontSize="15" fill={L} fontWeight="700" letterSpacing="2">TO DO</text>
        {Array.from({ length: 22 }, (_, i) => {
          const y = 120 + i * 42;
          return <g key={i}>
            <rect x="48" y={y} width="20" height="20" rx="5" fill="none" stroke={L} strokeWidth="2" />
            <line x1="82" x2={w - 150} y1={y + 18} y2={y + 18} stroke={L} strokeWidth="1" />
            <line x1={w - 130} x2={w - 48} y1={y + 18} y2={y + 18} stroke={L} strokeWidth="1" />
          </g>;
        })}
        <text x={w - 130} y="78" fontSize="15" fill={L} fontWeight="700" letterSpacing="2">DUE</text>
      </>;
      break;
    case "revision":
      body = <>
        <rect x="40" y="110" width={w - 80} height={(h - 190) / 2} rx="18" fill="none" stroke={L} strokeWidth="2" />
        <rect x="40" y={130 + (h - 190) / 2} width={w - 80} height={(h - 190) / 2} rx="18" fill="none" stroke={L} strokeWidth="2" strokeDasharray="10 8" />
        <text x="60" y="145" fontSize="15" fill={L} fontWeight="700" letterSpacing="2">QUESTION</text>
        <text x="60" y={165 + (h - 190) / 2} fontSize="15" fill={L} fontWeight="700" letterSpacing="2">ANSWER</text>
      </>;
      break;
    case "graph": {
      // Millimetre graph paper, as maths and science papers use: a faint
      // line every millimetre, a firmer one every centimetre, the firmest
      // every five.
      const mm = 96 / 25.4;
      const out = [];
      for (let i = 0, x = 0; x <= w; i++, x = i * mm) out.push(<line key={"x" + i} x1={x} x2={x} y1="0" y2={h} stroke={L} strokeWidth={i % 50 === 0 ? 1.6 : i % 10 === 0 ? 1 : 0.35} />);
      for (let i = 0, y = 0; y <= h; i++, y = i * mm) out.push(<line key={"y" + i} y1={y} y2={y} x1="0" x2={w} stroke={L} strokeWidth={i % 50 === 0 ? 1.6 : i % 10 === 0 ? 1 : 0.35} />);
      body = <>{out}</>;
      break;
    }
    case "dwiddle":
      body = <>
        {lines(32, 150)}
        <text x="48" y="78" fontSize="15" fill={L} fontWeight="700" letterSpacing="2">TOPIC</text>
        <line x1="120" x2={w - 230} y1="80" y2="80" stroke={L} strokeWidth="1.5" />
        <text x={w - 210} y="78" fontSize="15" fill={L} fontWeight="700" letterSpacing="2">DATE</text>
        <line x1={w - 150} x2={w - 48} y1="80" y2="80" stroke={L} strokeWidth="1.5" />
        <g opacity="0.14" transform={`translate(${w - 118} ${h - 128}) scale(0.8)`}>
          <ellipse cx="63" cy="90" rx="45" ry="31" fill="#F8DC6E" /><circle cx="63" cy="59" r="29" fill="#F8DC6E" />
          <ellipse cx="64" cy="27" rx="41" ry="8.6" fill="#D9BE7E" />
        </g>
      </>;
      break;
    default:
      body = null;
  }
  return (
    <g>
      <rect width={w} height={h} fill={p.bg} />
      {page.bg && <image href={page.bg} x="0" y="0" width={w} height={h} preserveAspectRatio="xMidYMid meet" />}
      {!page.bg && body}
    </g>
  );
}

/* ---------- ink ---------- */

function pathFrom(stroke) {
  if (!stroke.length) return "";
  const d = stroke.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length];
    acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    return acc;
  }, ["M", ...stroke[0], "Q"]);
  d.push("Z");
  return d.map((n) => (typeof n === "number" ? Math.round(n * 100) / 100 : n)).join(" ");
}

// Pens write like three real ones: a ballpoint's even line, a fountain
// pen's swell with pressure and speed, a brush's thick-to-thin.
const PEN_STYLES = [
  { id: "ball", name: "Ballpoint", thinning: 0.12, taper: 0 },
  { id: "fountain", name: "Fountain", thinning: 0.35, taper: 0 },
  { id: "brush", name: "Brush", thinning: 0.6, taper: 5 },
];

// Evens out a stroke before its ink shape is made: points spaced evenly
// along the line, then position and pressure averaged with their
// neighbours, so neither the edge nor the thickness can wobble.
function smoothPts(points) {
  if (points.length < 4) return points;
  // How big the stroke is: small handwriting keeps its exact shape, only
  // long, large strokes are evened out, whatever the zoom.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const extent = Math.hypot(x1 - x0, y1 - y0);
  // Small writing is evened out over about half a millimetre: enough to
  // remove a Pencil's shimmer, far too little to change a letter.
  const step = Math.min(1.8, Math.max(0.5, extent / 36));
  const even = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay, ap] = points[i - 1], [bx, by, bp] = points[i];
    const len = Math.hypot(bx - ax, by - ay);
    if (!len) continue;
    let t = step - carry;
    while (t <= len) { const k = t / len; even.push([ax + (bx - ax) * k, ay + (by - ay) * k, ap + (bp - ap) * k]); t += step; }
    carry = len - (t - step);
  }
  even.push(points[points.length - 1]);
  const W = [1, 6, 15, 20, 15, 6, 1];
  const h = (W.length - 1) / 2, sum = W.reduce((a, b) => a + b, 0);
  return even.map((p, i) => {
    if (i < h || i > even.length - 1 - h) return p;
    let x = 0, y = 0, pr = 0;
    for (let j = -h; j <= h; j++) { const q = even[i + j], wt = W[j + h]; x += q[0] * wt; y += q[1] * wt; pr += q[2] * wt; }
    return [x / sum, y / sum, pr / sum];
  });
}

function inkPath(item) {
  const hl = item.tool === "highlighter" || item.tool === "revealer";
  // A round highlighter has round ends, a flat one square ends like a chisel tip.
  const round = hl && item.tip !== "flat";
  const pen = PEN_STYLES.find((p) => p.id === item.style) || PEN_STYLES[1];
  // Stability 1 follows the pen exactly (handwriting); 10 irons out every
  // wobble (graphs and diagrams). Strokes from before the setting are 4.
  const st = Math.max(1, Math.min(10, item.stab ?? 4));
  const pts = item.straight ? item.points : smoothPts(item.points);
  // The pen thins in and out over part of the stroke, never more than it
  // has: short strokes and dots keep their ink.
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const dot = L < 1.5;
  const tStart = dot ? 0 : Math.min(pen.taper * 0.7, L * 0.18), tEnd = dot ? 0 : Math.min(pen.taper, L * 0.22);
  return pathFrom(getStroke(pts, {
    size: item.size,
    thinning: hl || dot ? 0 : pen.thinning,
    smoothing: Math.min(0.95, 0.62 + st * 0.03),
    streamline: item.straight ? 0 : (st - 1) * 0.095,
    last: true,
    simulatePressure: !item.pressure && !hl,
    start: { cap: !hl || round, taper: hl || item.cut ? 0 : tStart },
    end: { cap: !hl || round, taper: hl || item.cut ? 0 : tEnd },
  }));
}

// A smooth, even line through points, for arcs and ruler lines: drawn as a
// real stroke, so it stays crisp at any zoom.
function linePath(points) {
  if (!points.length) return "";
  if (points.length < 3) return `M${points[0][0]} ${points[0][1]} L${points[points.length - 1][0]} ${points[points.length - 1][1]}`;
  let d = `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1];
    d += ` Q${x0.toFixed(2)} ${y0.toFixed(2)} ${((x0 + x1) / 2).toFixed(2)} ${((y0 + y1) / 2).toFixed(2)}`;
  }
  const last = points[points.length - 1];
  return d + ` L${last[0].toFixed(2)} ${last[1].toFixed(2)}`;
}

// Auto refine: once a stroke is finished, its corners are rounded off a
// little (one pass of Chaikin's method), so shaky writing comes out neat.
function refine(points) {
  const pts = points.filter((p, i) => i === 0 || Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 0.6);
  if (pts.length < 4) return pts;
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0, p0] = pts[i], [x1, y1, p1] = pts[i + 1];
    out.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25, p0 * 0.75 + p1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75, p0 * 0.25 + p1 * 0.75]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// How wide each tool draws, in page units, from its size setting of 1 to 12.
const widthOf = (tool, s) => (tool === "highlighter" || tool === "revealer" ? s * 5 + 8 : tool === "eraser" ? 20 + s * 5 : s * 1.2 + 0.8);

// Handwriting fonts get a natural wobble when shown (see HandText), so they
// read as written rather than typed. Most load only when first used.
const FONTS = [
  { id: "caveat", name: "Handwriting", css: '"Caveat", cursive', scale: 1.25, hand: true },
  { id: "nanum", name: "Pen script", css: '"Nanum Pen Script", cursive', scale: 1.45, hand: true, load: () => import("@fontsource/nanum-pen-script/400.css") },
  { id: "patrick", name: "Neat hand", css: '"Patrick Hand", cursive', scale: 1.1, hand: true },
  { id: "gochi", name: "Round hand", css: '"Gochi Hand", cursive', scale: 1.1, hand: true, load: () => import("@fontsource/gochi-hand/400.css") },
  { id: "indie", name: "Bubbly hand", css: '"Indie Flower", cursive', scale: 1.1, hand: true, load: () => import("@fontsource/indie-flower/400.css") },
  { id: "grace", name: "Casual hand", css: '"Covered By Your Grace", cursive', scale: 1.15, hand: true, load: () => import("@fontsource/covered-by-your-grace/400.css") },
  { id: "another", name: "Tall hand", css: '"Just Another Hand", cursive', scale: 1.5, hand: true, load: () => import("@fontsource/just-another-hand/400.css") },
  { id: "reenie", name: "Quick scrawl", css: '"Reenie Beanie", cursive', scale: 1.45, hand: true, load: () => import("@fontsource/reenie-beanie/400.css") },
  { id: "apple", name: "Joined up", css: '"Homemade Apple", cursive', scale: 0.9, hand: true, load: () => import("@fontsource/homemade-apple/400.css") },
  { id: "kalam", name: "Marker", css: '"Kalam", cursive', scale: 1.05, hand: true },
  { id: "shadows", name: "Light scribble", css: '"Shadows Into Light", cursive', scale: 1.15, hand: true },
  { id: "sans", name: "Typed", css: 'Inter, -apple-system, system-ui, sans-serif', scale: 1 },
  { id: "serif", name: "Book", css: 'Georgia, serif', scale: 1 },
  { id: "roboto", name: "Roboto", css: '"Roboto", sans-serif', scale: 1, load: () => import("@fontsource/roboto/400.css") },
  { id: "opensans", name: "Open Sans", css: '"Open Sans", sans-serif', scale: 1, load: () => import("@fontsource/open-sans/400.css") },
  { id: "lato", name: "Lato", css: '"Lato", sans-serif', scale: 1, load: () => import("@fontsource/lato/400.css") },
  { id: "montserrat", name: "Montserrat", css: '"Montserrat", sans-serif', scale: 0.95, load: () => import("@fontsource/montserrat/400.css") },
  { id: "poppins", name: "Poppins", css: '"Poppins", sans-serif', scale: 0.95, load: () => import("@fontsource/poppins/400.css") },
  { id: "nunito", name: "Nunito", css: '"Nunito", sans-serif', scale: 1, load: () => import("@fontsource/nunito/400.css") },
  { id: "lexend", name: "Lexend", css: '"Lexend", sans-serif', scale: 0.95, load: () => import("@fontsource/lexend/400.css") },
  { id: "atkinson", name: "Easy to read", css: '"Atkinson Hyperlegible", sans-serif', scale: 1, load: () => import("@fontsource/atkinson-hyperlegible/400.css") },
  { id: "comic", name: "Comic Neue", css: '"Comic Neue", cursive', scale: 1.05, load: () => import("@fontsource/comic-neue/400.css") },
  { id: "lora", name: "Lora", css: '"Lora", serif', scale: 1, load: () => import("@fontsource/lora/400.css") },
  { id: "merriweather", name: "Merriweather", css: '"Merriweather", serif', scale: 0.92, load: () => import("@fontsource/merriweather/400.css") },
  { id: "playfair", name: "Playfair", css: '"Playfair Display", serif', scale: 1, load: () => import("@fontsource/playfair-display/400.css") },
  { id: "sourceserif", name: "Source Serif", css: '"Source Serif 4", serif', scale: 1, load: () => import("@fontsource/source-serif-4/400.css") },
  { id: "mono", name: "Code", css: '"Roboto Mono", monospace', scale: 0.92, load: () => import("@fontsource/roboto-mono/400.css") },
];
const loadedFonts = new Set();
function loadFont(f) {
  if (f.load && !loadedFonts.has(f.id)) { loadedFonts.add(f.id); f.load().catch(() => loadedFonts.delete(f.id)); }
}
function useFont(f) {
  useEffect(() => { loadFont(f); }, [f]);
}

// The font gallery: every font shown writing in itself.
function FontPop({ current, custom, onPick, onImport, onClose }) {
  useEffect(() => { FONTS.forEach(loadFont); }, []);
  const Row = ({ f }) => (
    <button className={"nb-fontrow" + (current === f.id ? " on" : "")} onClick={() => onPick(f.id)}>
      <span className="nb-fontname" style={{ fontFamily: f.css, fontSize: 20 * f.scale }}>{f.name}</span>
      <span className="nb-fontsample" style={{ fontFamily: f.css, fontSize: 15 * f.scale }}>The quick brown fox, 0123</span>
    </button>
  );
  return (
    <>
      <div className="nb-pop-scrim" onPointerDown={onClose} />
      <div className="nb-pop nb-fontpop" role="dialog" aria-label="Fonts">
        <div className="nb-pop-head"><b>Fonts</b><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={15} /></button></div>
        <div className="nb-fontlist">
          <span className="qv-label">Handwriting</span>
          {FONTS.filter((f) => f.hand).map((f) => <Row key={f.id} f={f} />)}
          <span className="qv-label">Typed</span>
          {FONTS.filter((f) => !f.hand).map((f) => <Row key={f.id} f={f} />)}
          {custom.length > 0 && <span className="qv-label">Your fonts</span>}
          {custom.map((n) => <Row key={n} f={fontOf("custom:" + n)} />)}
        </div>
        <button className="btn ghost small" onClick={onImport}><Icon name="plus" size={14} /> Import a font (.ttf, .otf, .woff)</button>
      </div>
    </>
  );
}
// Imported fonts are named "custom:Their Name".
const fontOf = (id) => (String(id).startsWith("custom:")
  ? { id, name: id.slice(7), css: `"${id.slice(7)}", Inter, sans-serif`, scale: 1 }
  : FONTS.find((f) => f.id === id) || FONTS[0]);

// Handwriting drawn letter by letter, each sitting a little differently,
// the way real writing never repeats a letter exactly.
function rand(seed) { let h = 2166136261; for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; }
function HandText({ text, seed }) {
  return String(text || " ").split("\n").map((line, li) => (
    <span key={li} style={{ display: "block", minHeight: "1.2em" }}>
      {[...line].map((ch, i) => {
        if (ch === " ") return " ";
        const k = seed + ":" + li + ":" + i;
        const r = (rand(k + "r") - 0.5) * 5, dy = (rand(k + "y") - 0.5) * 0.09, sc = 0.94 + rand(k + "s") * 0.12;
        // No CSS transforms here: inside the drawing, Safari paints transformed
        // text in the wrong place (far off on a phone), so each letter is
        // nudged with its line position and size instead.
        return <span key={i} style={{ verticalAlign: `${(-dy - r * 0.004).toFixed(3)}em`, fontSize: `${sc.toFixed(3)}em` }}>{ch}</span>;
      })}
    </span>
  ));
}

// Bounding box of anything on a page, in page units.
function boxOf(it) {
  if (it.type === "stroke") {
    const xs = it.points.map((p) => p[0]), ys = it.points.map((p) => p[1]);
    const pad = it.size;
    return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
  }
  if (it.type === "shape") {
    return { x: Math.min(it.x1, it.x2) - 6, y: Math.min(it.y1, it.y2) - 6, w: Math.abs(it.x2 - it.x1) + 12, h: Math.abs(it.y2 - it.y1) + 12 };
  }
  return { x: it.x, y: it.y, w: it.w, h: it.h || 40 };
}
// Grows or shrinks anything about a corner, for resizing a lasso selection.
function scaleItem(it, ox, oy, k) {
  const X = (v) => ox + (v - ox) * k, Y = (v) => oy + (v - oy) * k;
  if (it.type === "stroke") { const { d, ...rest } = it; return { ...rest, size: it.size * k, points: it.points.map(([x, y, p]) => [X(x), Y(y), p]) }; }
  if (it.type === "shape") return { ...it, x1: X(it.x1), y1: Y(it.y1), x2: X(it.x2), y2: Y(it.y2), size: Math.max(1, it.size * k) };
  if (it.type === "text") return { ...it, x: X(it.x), y: Y(it.y), w: it.w * k, h: (it.h || 40) * k, fontSize: Math.max(8, Math.round(it.fontSize * k)) };
  return { ...it, x: X(it.x), y: Y(it.y), w: it.w * k, h: it.h * k };
}
function unionBox(items) {
  if (!items.length) return null;
  const bs = items.map(boxOf);
  const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
  return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
}
// The top thing under a spot. A fingertip is wide and a phone shows the
// page small, so touches get some room around each thing.
function itemAt(items, x, y, pad) {
  return [...items].reverse().find((i) => {
    if (i.type === "text" && !String(i.text || "").trim()) return false;
    if (i.type === "stroke") return strokeDist(i, x, y) < i.size / 2 + pad;
    const b = boxOf(i);
    return x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;
  });
}
function insidePoly(poly, x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
// Whether the lasso loop takes in an item: most of a stroke, or the middle
// of anything else.
function lassoTakes(poly, it) {
  if (it.type === "stroke") {
    const P = it.points, step = Math.max(1, Math.floor(P.length / 40));
    let n = 0, inn = 0;
    for (let i = 0; i < P.length; i += step) { n++; if (insidePoly(poly, P[i][0], P[i][1])) inn++; }
    return inn / n >= 0.6;
  }
  const b = boxOf(it);
  return insidePoly(poly, b.x + b.w / 2, b.y + b.h / 2);
}

function moveItem(it, dx, dy) {
  if (it.type === "stroke") { const { d, ...rest } = it; return { ...rest, points: it.points.map(([x, y, p]) => [x + dx, y + dy, p]) }; }
  if (it.type === "shape") return { ...it, x1: it.x1 + dx, y1: it.y1 + dy, x2: it.x2 + dx, y2: it.y2 + dy };
  return { ...it, x: it.x + dx, y: it.y + dy };
}
const nearStroke = (it, x, y, r) => it.points.some(([px, py]) => Math.hypot(px - x, py - y) < r + it.size / 2);

function Shape({ it }) {
  const common = { stroke: it.color, strokeWidth: it.size, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  const { x1, y1, x2, y2 } = it;
  if (it.kind === "rect") return <rect x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} rx="6" {...common} />;
  if (it.kind === "ellipse") return <ellipse cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} rx={Math.abs(x2 - x1) / 2} ry={Math.abs(y2 - y1) / 2} {...common} />;
  if (it.kind === "arrow") {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 14 + it.size * 2;
    return <g><line x1={x1} y1={y1} x2={x2} y2={y2} {...common} />
      <path d={`M${x2 - L * Math.cos(a - 0.45)} ${y2 - L * Math.sin(a - 0.45)} L${x2} ${y2} L${x2 - L * Math.cos(a + 0.45)} ${y2 - L * Math.sin(a + 0.45)}`} {...common} /></g>;
  }
  return <line x1={x1} y1={y1} x2={x2} y2={y2} {...common} />;
}

const Item = memo(ItemView, (a, b) => a.it.type !== "text" && a.it === b.it && a.editing === b.editing && a.shown === b.shown);

function ItemView({ it, editing, onText, shown }) {
  if (it.type === "stroke" && it.tool === "revealer") {
    // Hides what is under it until tapped. Revealed ones stay faint so the
    // answer shows through.
    return <path d={inkPath(it)} fill={it.color} opacity={shown ? 0.16 : 1} className="nb-cover-ink" />;
  }
  if (it.type === "stroke" && (it.uniform || it.straight || it.tool === "highlighter" || (it.tool === "pen" && it.style === "ball")) && isDot(it.points)) {
    return <circle cx={it.points[0][0]} cy={it.points[0][1]} r={it.size / 2} fill={it.color} opacity={it.tool === "highlighter" ? 0.38 : 1} />;
  }
  if (it.type === "stroke" && (it.uniform || it.straight || it.tool === "highlighter" || (it.tool === "pen" && it.style === "ball"))) {
    return <path d={linePath(it.uniform || it.straight ? it.points : smoothPts(it.points))} fill="none" stroke={it.color} strokeWidth={it.size} strokeLinecap="round" strokeLinejoin="round"
      opacity={it.tool === "highlighter" ? 0.38 : 1} />;
  }
  if (it.type === "stroke") {
    return <path d={inkPath(it)} fill={it.color} opacity={it.tool === "highlighter" ? 0.38 : 1}
      />;
  }
  if (it.type === "shape") return <Shape it={it} />;
  if (it.type === "image") {
    // A cropped picture keeps the whole original; only the chosen part shows.
    if (it.crop) {
      const c = it.crop;
      return (
        <svg x={it.x} y={it.y} width={it.w} height={it.h} viewBox={`${c.x} ${c.y} ${c.w} ${c.h}`} preserveAspectRatio="none" overflow="hidden">
          <image href={it.src} x="0" y="0" width="1" height="1" preserveAspectRatio="none" />
        </svg>
      );
    }
    return <image href={it.src} x={it.x} y={it.y} width={it.w} height={it.h} preserveAspectRatio="xMidYMid meet" />;
  }
  if (it.type === "text") {
    if (editing) return null; // shown by the editor over the page while typing
    const f = fontOf(it.font);
    // The slight tilt of handwriting is turned by the drawing itself: a CSS
    // transform inside it lands in the wrong place in Safari.
    const tilt = f.id !== "sans" && f.id !== "serif" ? it.tilt || 0 : 0;
    const h = Math.max(it.h || 60, 40);
    return (
      <g transform={tilt ? `rotate(${tilt} ${it.x + it.w / 2} ${it.y + h / 2})` : undefined}>
        <foreignObject x={it.x} y={it.y} width={it.w} height={h} style={{ overflow: "visible", pointerEvents: "none" }}>
          <TextBox it={it} f={f} />
        </foreignObject>
      </g>
    );
  }
  return null;
}

function TextBox({ it, f }) {
  useFont(f);
  const style = { fontFamily: f.css, fontSize: it.fontSize * f.scale, color: it.color, lineHeight: 1.35 };
  return <div className="nb-text" style={style}>{f.hand && it.wobble !== false ? <HandText text={it.text} seed={it.id} /> : (it.text || " ")}</div>;
}

// A bar that floats over the page by what it acts on, kept inside the
// page's edges: on a phone the page is narrow and it would run off.
function FitBar({ className, x, y, children }) {
  const el = useRef(null);
  useLayoutEffect(() => {
    const d = el.current, p = d?.parentElement;
    if (!d || !p) return;
    d.style.left = Math.max(4, Math.min(x, p.clientWidth - d.offsetWidth - 4)) + "px";
  });
  return <div ref={el} className={className} style={{ left: x, top: y }} onPointerDown={(e) => e.stopPropagation()}>{children}</div>;
}

// Typing happens in an ordinary box laid over the page, not inside the
// drawing: Safari on iPad does not show text being typed inside SVG. The box
// keeps its own contents while typed into, so the caret never jumps.
function TextEditor({ it, zoom, onText }) {
  const el = useRef(null);
  const f = fontOf(it.font);
  useFont(f);
  useEffect(() => {
    const d = el.current;
    if (!d) return;
    d.innerText = it.text || "";
    try { d.focus({ preventScroll: true }); } catch { d.focus(); }
    // keep the box in sight above the on-screen keyboard
    setTimeout(() => { try { d.scrollIntoView({ block: "center", behavior: "smooth" }); } catch { /* old browsers */ } }, 350);
    const r = document.createRange();
    r.selectNodeContents(d);
    r.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }, [it.id]);
  return (
    <div ref={el} className="nb-textedit" contentEditable suppressContentEditableWarning spellCheck
      style={{ left: it.x * zoom, top: it.y * zoom, width: it.w * zoom, minHeight: 40 * zoom, fontFamily: f.css, fontSize: it.fontSize * f.scale * zoom, color: it.color, lineHeight: 1.35 }}
      onInput={(e) => onText(e.currentTarget.innerText, e.currentTarget.scrollHeight)}
      onPointerDown={(e) => e.stopPropagation()} />
  );
}

// Cropping a picture: the whole original shown faintly, the kept part
// bright, with handles on its corners and edges.
function CropBox({ it, zoom, onDone, onCancel }) {
  const c0 = it.crop || { x: 0, y: 0, w: 1, h: 1 };
  // the whole original's place on the page
  const full = { w: it.w / c0.w, h: it.h / c0.h };
  full.x = it.x - c0.x * full.w; full.y = it.y - c0.y * full.h;
  const [c, setC] = useState(c0);
  const drag = useRef(null);
  const start = (e, edge) => {
    e.stopPropagation(); e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine */ }
    drag.current = { edge, x: e.clientX, y: e.clientY, c };
  };
  const moveC = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / (full.w * zoom), dy = (e.clientY - d.y) / (full.h * zoom);
    let { x, y, w, h } = d.c;
    const min = 0.05;
    if (d.edge === "move") { x = Math.min(1 - w, Math.max(0, x + dx)); y = Math.min(1 - h, Math.max(0, y + dy)); }
    if (d.edge.includes("l")) { const nx = Math.min(x + w - min, Math.max(0, x + dx)); w += x - nx; x = nx; }
    if (d.edge.includes("r")) w = Math.min(1 - x, Math.max(min, w + dx));
    if (d.edge.includes("t")) { const ny = Math.min(y + h - min, Math.max(0, y + dy)); h += y - ny; y = ny; }
    if (d.edge.includes("b")) h = Math.min(1 - y, Math.max(min, h + dy));
    setC({ x, y, w, h });
  };
  const done = () => {
    const whole = c.x < 0.001 && c.y < 0.001 && c.w > 0.999 && c.h > 0.999;
    onDone({ ...it, x: full.x + c.x * full.w, y: full.y + c.y * full.h, w: c.w * full.w, h: c.h * full.h, crop: whole ? undefined : c });
  };
  const pct = (v) => v * 100 + "%";
  return (
    <div className="nb-crop" style={{ left: full.x * zoom, top: full.y * zoom, width: full.w * zoom, height: full.h * zoom }}
      onPointerMove={moveC} onPointerUp={() => { drag.current = null; }} onPointerDown={(e) => e.stopPropagation()}>
      <img src={it.src} alt="" draggable={false} />
      <div className="nb-crop-keep" style={{ left: pct(c.x), top: pct(c.y), width: pct(c.w), height: pct(c.h) }} onPointerDown={(e) => start(e, "move")}>
        <span className="nb-crop-clip"><img className="nb-crop-bright" src={it.src} alt="" draggable={false}
          style={{ left: pct(-c.x / c.w), top: pct(-c.y / c.h), width: pct(1 / c.w), height: pct(1 / c.h) }} /></span>
        {["tl", "tr", "bl", "br", "t", "b", "l", "r"].map((k) => <i key={k} className={"nb-crop-h h-" + k} onPointerDown={(e) => start(e, k)} />)}
      </div>
      <div className="nb-crop-bar" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => setC({ x: 0, y: 0, w: 1, h: 1 })}>Reset</button>
        <button onClick={onCancel}>Cancel</button>
        <button className="on" onClick={done}>Done</button>
      </div>
    </div>
  );
}

/* ---------- the list of notebooks ---------- */

const COVERS = ["#3B5BFD", "#D1497A", "#4F8536", "#7447D6", "#1C6DAA", "#168F79", "#DE5F37", "#B24E1E", "#1b1d26"];
const FOLDERS_KEY = "dwiddle-nb-folders";
const loadFolders = () => { try { return JSON.parse(localStorage.getItem(FOLDERS_KEY) || "[]"); } catch { return []; } };
const saveFolders = (f) => { try { localStorage.setItem(FOLDERS_KEY, JSON.stringify(f)); } catch {} };

const VIEW_KEY = "dwiddle-nb-view";
const FOLDER_COLORS_KEY = "dwiddle-nb-folder-colors";
const loadJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const FOLDER_COLORS = ["#5AB0F5", "#8E8E93", "#FF6B6B", "#FFA94D", "#FFD43B", "#69DB7C", "#38D9A9", "#9775FA", "#F783AC"];

// A folder drawn the way a Mac draws one, in any colour, with the covers of
// the first few notebooks peeking out of the top.
function MacFolder({ color = FOLDER_COLORS[0], peek = [] }) {
  return (
    <svg className="nb-macfolder" viewBox="0 0 120 96" aria-hidden="true">
      <defs>
        <linearGradient id={"fb" + color.slice(1)} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.78" /><stop offset="1" stopColor={color} stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={"ff" + color.slice(1)} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" /><stop offset="0.08" stopColor={color} /><stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>
      <path d="M8 14a6 6 0 0 1 6-6h28a6 6 0 0 1 4.6 2.2L51 16h55a6 6 0 0 1 6 6v8H8Z" fill={`url(#fb${color.slice(1)})`} />
      <path d="M8 22h104v8H8z" fill={color} opacity="0.6" />
      {peek.slice(0, 3).map((c, i) => (
        <rect key={i} x={22 + i * 26} y={20 - (i % 2) * 3} width="24" height="30" rx="2.5" fill={c} stroke="#fff" strokeWidth="1.5" transform={`rotate(${(i - 1) * 5} ${34 + i * 26} 35)`} />
      ))}
      <path d="M4 32a6 6 0 0 1 6-6h100a6 6 0 0 1 6 6l-3 52a6 6 0 0 1-6 5.6H13a6 6 0 0 1-6-5.6Z" fill={`url(#ff${color.slice(1)})`} />
      <path d="M10 30h100" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.2" />
    </svg>
  );
}

// A small picture of a page, for choosing paper and for covers.
export function PagePreview({ page, className = "" }) {
  return (
    <svg className={className} viewBox={`0 0 ${page.w} ${page.h}`} aria-hidden="true">
      <Paper page={page} />
      {(page.items || []).map((it) => <Item key={it.id} it={it} />)}
    </svg>
  );
}

export default function NotebookPage({ go }) {
  const [books, setBooks] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [folder, setFolder] = useState("all");
  const [extraFolders, setExtraFolders] = useState(loadFolders);
  const [view, setViewRaw] = useState(() => loadJSON(VIEW_KEY, "folders")); // "folders" like a Mac, or "tabs"
  const setView = (v) => { setViewRaw(v); saveJSON(VIEW_KEY, v); };
  const [folderColors, setFolderColors] = useState(() => loadJSON(FOLDER_COLORS_KEY, {}));
  const [folderMenu, setFolderMenu] = useState(null); // folder with its menu open
  const [renaming, setRenaming] = useState(null); // { from, to }
  const [dropOn, setDropOn] = useState(null); // folder a notebook is being dragged over
  const [menu, setMenu] = useState(null); // book id with its menu open
  const [sync, setSync] = useState(null); // { state, message }

  const refresh = useCallback(() => listBooks().then(setBooks).catch(() => setBooks([])), []);
  useEffect(() => { refresh(); }, [refresh]);

  // Signed in, notebooks are brought up to date with the account first.
  useEffect(() => {
    let live = true;
    setSync({ state: "working" });
    syncNotebooks().then((r) => { if (!live) return; setSync(r); if (r.changed) refresh(); })
      .catch(() => live && setSync({ state: "error", message: "Could not sync just now." }));
    return () => { live = false; };
  }, [refresh]);

  const folders = [...new Set([...extraFolders, ...(books || []).map((b) => b.folder).filter(Boolean)])].sort();
  // Shown as Mac folders, the top level holds the folders and the notebooks
  // in none; opening a folder shows what is in it.
  const shown = (books || []).filter((b) => (folder === "all" ? (view === "folders" ? !b.folder : true) : folder === "none" ? !b.folder : b.folder === folder));
  const inFolder = (f) => (books || []).filter((b) => b.folder === f);

  function setFolderColor(f, c) {
    const next = { ...folderColors, [f]: c };
    setFolderColors(next); saveJSON(FOLDER_COLORS_KEY, next);
  }
  // Enter and then the box losing focus both finish a rename; only the first counts.
  const renamed = useRef(null);
  async function renameFolder(from, to) {
    if (renamed.current === from + "\u0000" + to) return;
    renamed.current = from + "\u0000" + to;
    setTimeout(() => { renamed.current = null; }, 500);
    setRenaming(null);
    to = to?.trim();
    if (!to || to === from) return;
    await Promise.all(inFolder(from).map((b) => putBook({ ...b, folder: to }).then(() => queueUpload(b.id))));
    const next = [...new Set(extraFolders.map((x) => (x === from ? to : x)).concat(to))];
    setExtraFolders(next); saveFolders(next);
    if (folderColors[from]) { const c = { ...folderColors, [to]: folderColors[from] }; delete c[from]; setFolderColors(c); saveJSON(FOLDER_COLORS_KEY, c); }
    if (folder === from) setFolder(to);
    refresh();
  }
  async function removeFolder(f) {
    await Promise.all(inFolder(f).map((b) => putBook({ ...b, folder: "" }).then(() => queueUpload(b.id))));
    const next = extraFolders.filter((x) => x !== f);
    setExtraFolders(next); saveFolders(next);
    if (folder === f) setFolder("all");
    refresh();
  }

  async function create(opts) {
    const b = { ...newBook(opts), folder: opts.folder || "", coverStyle: opts.coverStyle, coverImg: opts.coverImg, sticker: opts.sticker, pic: opts.pic };
    await putBook(b);
    queueUpload(b.id);
    setCreating(false);
    setOpenId(b.id);
  }

  async function update(book, change) {
    const next = { ...book, ...change };
    await putBook(next);
    queueUpload(next.id);
    refresh();
  }

  const [naming, setNaming] = useState(null); // text while naming a new folder
  const [editing, setEditing] = useState(null); // the notebook being edited
  function addFolder(name) {
    setNaming(null);
    if (!name?.trim()) return;
    const next = [...new Set([...extraFolders, name.trim()])];
    setExtraFolders(next); saveFolders(next); setFolder(name.trim());
  }

  // Each PDF page becomes a notebook page with the page as its paper, ready
  // to write on, the way worksheets and lecture slides get annotated.
  async function importPdf(file) {
    setImporting("Opening the PDF");
    try {
      const pages = await pdfPages(file, (i, n) => setImporting(`Page ${i} of ${n}`));
      const b = { ...newBook({ title: file.name.replace(/\.pdf$/i, ""), template: "blank", cover: "#1C6DAA" }), pages, folder: folder !== "all" && folder !== "none" ? folder : "" };
      await putBook(b);
      queueUpload(b.id);
      setOpenId(b.id);
    } catch {
      alert("That PDF could not be opened.");
    } finally {
      setImporting("");
    }
  }

  if (openId) return <Portal><Editor id={openId} go={go} onClose={() => { setOpenId(null); refresh(); }} /></Portal>;

  return (
    <div className="page wide fade nb-home" onClick={() => setMenu(null)}>
      <div className="dash-top">
        <PageHead title="Notebooks" sub="Write by hand, type, add pictures and PDFs, then let Dwiddle turn any page into notes and questions." />
        <div className="row" style={{ marginTop: 6 }}>
          <label className="btn ghost">
            <input type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importPdf(f); }} />
            <Icon name="file" size={15} /> Import a PDF
          </label>
          <button className="btn cta" onClick={() => setCreating(true)}><Icon name="plus" size={15} /> New notebook</button>
        </div>
      </div>

      <div className="nb-folders" role="tablist" aria-label="Folders">
        <div className="seg tight nb-viewpick" role="group" aria-label="Show folders as">
          <button className={view === "folders" ? "on" : ""} onClick={() => setView("folders")} title="Folders, like on a Mac"><Icon name="folder" size={14} /> Folders</button>
          <button className={view === "tabs" ? "on" : ""} onClick={() => setView("tabs")} title="Folders as tabs"><Icon name="more" size={14} /> Tabs</button>
        </div>
        {view === "folders" ? (
          <nav className="nb-crumbs" aria-label="Where you are">
            <button className={folder === "all" ? "on" : ""} onClick={() => setFolder("all")}>All notebooks</button>
            {folder !== "all" && <><span aria-hidden="true">›</span><b>{folder === "none" ? "Not in a folder" : folder}</b></>}
          </nav>
        ) : <>
        <button role="tab" aria-selected={folder === "all"} className={folder === "all" ? "on" : ""} onClick={() => setFolder("all")}>All notebooks</button>
        {folders.map((f) => (
          <button key={f} role="tab" aria-selected={folder === f} className={folder === f ? "on" : ""} onClick={() => setFolder(f)}>
            <Icon name="folder" size={14} /> {f}
          </button>
        ))}
        {books?.some((b) => !b.folder) && folders.length > 0 && (
          <button role="tab" aria-selected={folder === "none"} className={folder === "none" ? "on" : ""} onClick={() => setFolder("none")}>Not in a folder</button>
        )}
        </>}
        {naming === null
          ? <button className="nb-folder-add" onClick={() => setNaming("")}><Icon name="plus" size={13} /> New folder</button>
          : <input className="nb-folder-input" autoFocus placeholder="Folder name, then Enter" value={naming} onChange={(e) => setNaming(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addFolder(naming); if (e.key === "Escape") setNaming(null); }} onBlur={() => addFolder(naming)} />}
        <span className={"nb-sync " + (sync?.state || "")} title={sync?.message || ""}>
          <Icon name="cloud" size={14} />
          {sync?.state === "working" ? "Syncing" : sync?.state === "synced" ? "Synced to your account"
            : sync?.state === "signed-out" ? "On this device only. Sign in to sync" : sync?.state === "unavailable" ? "Sync is not set up yet" : sync?.state === "error" ? "Not synced" : ""}
        </span>
      </div>

      {importing && <div className="card card-pad note-card"><Loading label={`Importing: ${importing}`} /></div>}

      {books === null ? <Loading label="Opening your notebooks" /> : shown.length === 0 && !(view === "folders" && folder === "all" && folders.length) ? (
        <div className="card card-pad nb-empty">
          <div className="nb-empty-art"><DuckMark size={56} /></div>
          <b>{folder === "all" ? "Your first notebook" : "Nothing in this folder yet"}</b>
          <p className="small muted">Lined, squared, Cornell notes, a mind map, a week planner and more. Use an Apple Pencil, a mouse or your finger.</p>
          <button className="btn cta" onClick={() => setCreating(true)}><Icon name="plus" size={15} /> New notebook</button>
        </div>
      ) : (
        <div className="nb-grid" onClick={() => setFolderMenu(null)}>
          {view === "folders" && folder === "all" && folders.map((f) => {
            const kids = inFolder(f);
            return (
              <div key={"f:" + f} className={"nb-folder-tile" + (dropOn === f ? " drop" : "")} role="button" tabIndex={0}
                onClick={() => { if (!renaming) setFolder(f); }} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) setFolder(f); }}
                onDragOver={(e) => { e.preventDefault(); setDropOn(f); }} onDragLeave={() => setDropOn(null)}
                onDrop={(e) => { e.preventDefault(); setDropOn(null); const id = e.dataTransfer.getData("text/dwiddle-book"); const b = books.find((x) => x.id === id); if (b) update(b, { folder: f }); }}>
                <div className="nb-folder-art"><MacFolder color={folderColors[f] || FOLDER_COLORS[0]} peek={kids.map((k) => k.cover)} /></div>
                <div className="nb-meta">
                  {renaming?.from === f ? (
                    <input className="nb-folder-input" autoFocus value={renaming.to} onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenaming({ from: f, to: e.target.value })}
                      onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") renameFolder(f, renaming.to); if (e.key === "Escape") setRenaming(null); }}
                      onBlur={() => renameFolder(f, renaming.to)} />
                  ) : <b>{f}</b>}
                  <span className="small muted">{kids.length} notebook{kids.length === 1 ? "" : "s"}</span>
                </div>
                <button className="icon-btn nb-more" aria-label={`Options for the ${f} folder`}
                  onClick={(e) => { e.stopPropagation(); setFolderMenu(folderMenu === f ? null : f); }}><Icon name="more" size={18} /></button>
                {folderMenu === f && (
                  <div className="nb-menu" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setRenaming({ from: f, to: f }); setFolderMenu(null); }}><span>Rename</span><Icon name="pen" size={14} /></button>
                    <div className="nb-menu-covers">{FOLDER_COLORS.map((c) => <button key={c} style={{ background: c }} aria-label="Folder colour" onClick={() => { setFolderColor(f, c); setFolderMenu(null); }} />)}</div>
                    <button className="danger" onClick={() => { setFolderMenu(null); if (window.confirm(`Remove the ${f} folder? The notebooks in it are kept.`)) removeFolder(f); }}>Remove folder</button>
                  </div>
                )}
              </div>
            );
          })}
          {shown.map((b) => (
            <div key={b.id} className="nb-book" onClick={() => setOpenId(b.id)} role="button" tabIndex={0}
              draggable onDragStart={(e) => { e.dataTransfer.setData("text/dwiddle-book", b.id); e.dataTransfer.effectAllowed = "move"; }}
              onKeyDown={(e) => { if (e.key === "Enter") setOpenId(b.id); }}>
              <div className="nb-cover"><CoverArt book={b} page={b.pages[0]} /></div>
              <div className="nb-meta">
                <b>{b.title}</b>
                <span className="small muted">{b.folder ? `${b.folder} · ` : ""}{b.pages.length} page{b.pages.length === 1 ? "" : "s"} · {new Date(b.updated || b.created).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </div>
              <button className="icon-btn nb-more" aria-label={`Options for ${b.title}`}
                onClick={(e) => { e.stopPropagation(); setMenu(menu === b.id ? null : b.id); }}><Icon name="more" size={18} /></button>
              {menu === b.id && (
                <div className="nb-menu" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setEditing(b); setMenu(null); }}><span>Edit name and cover</span><Icon name="pen" size={14} /></button>
                  <label>Move to
                    <select value={b.folder || ""} onChange={(e) => { update(b, { folder: e.target.value }); setMenu(null); }}>
                      <option value="">No folder</option>
                      {folders.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </label>
                  <div className="nb-menu-covers">{COVERS.map((c) => <button key={c} style={{ background: c }} aria-label="Cover colour" onClick={() => { update(b, { cover: c }); setMenu(null); }} />)}</div>
                  <button className="danger" onClick={() => { setConfirm(b); setMenu(null); }}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {creating && <BookDialog folders={folders} folder={folder !== "all" && folder !== "none" ? folder : ""} onSave={create} onClose={() => setCreating(false)} />}
      {editing && <BookDialog folders={folders} book={editing} onClose={() => setEditing(null)}
        onSave={({ title, cover, coverStyle, coverImg, sticker, pic, folder: f }) => { update(editing, { title, cover, coverStyle, coverImg, sticker, pic, folder: f }); setEditing(null); }} />}
      {confirm && (
        <Portal>
          <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
            <div className="gate lib-confirm" role="alertdialog" aria-modal="true">
              <div className="lib-confirm-icon"><Icon name="trash" size={22} /></div>
              <h2>Delete "{confirm.title}"?</h2>
              <p className="gate-sub">All {confirm.pages.length} page{confirm.pages.length === 1 ? "" : "s"} are removed from this device and your account. It cannot be undone.</p>
              <div className="gate-actions">
                <button className="btn lib-confirm-go" onClick={async () => { await deleteBook(confirm.id); queueDelete(confirm.id); setConfirm(null); refresh(); }}>Delete it</button>
                <button className="btn ghost" onClick={() => setConfirm(null)}>Keep it</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

const COVER_STYLES = [
  { id: "page", name: "First page" },
  { id: "plain", name: "Plain" },
  { id: "linen", name: "Linen" },
  { id: "stripe", name: "Stripe" },
  { id: "photo", name: "Photo" },
];
// Ready to tap, grouped so the right one is quick to find.
const STICKER_SETS = [
  { name: "Subjects", items: ["📚", "🧪", "🧬", "🔬", "📐", "➗", "🌍", "🏛️", "📝", "🎨", "🎵", "⚖️", "💻", "🩺", "🗣️", "💰", "⚽", "🧠"] },
  { name: "Cute", items: ["🦆", "🐶", "🐱", "🐰", "🐻", "🐼", "🦊", "🐸", "🐧", "🦋", "🌸", "🍓", "🍀", "🌈", "☁️", "🌙"] },
  { name: "Mood", items: ["⭐", "✨", "💡", "🔥", "💯", "✅", "📌", "🎯", "🚀", "🏆", "❤️", "💜"] },
];

// A notebook's cover: its first page on the cover colour, a plain or
// patterned cover, or a photo, with the name on a label and an optional sticker.
export function CoverArt({ book, page, label = true }) {
  const style = book.coverStyle || "page";
  const photo = style === "photo" && book.coverImg;
  return (
    <div className={"nb-art s-" + style} style={{ background: book.cover, ...(photo ? { backgroundImage: `url(${book.coverImg})` } : {}) }}>
      {style === "page" && page && <PagePreview page={page} className="nb-cover-page" />}
      {book.pic?.src && (
        <img className={"nb-pic at-" + (book.pic.pos || "middle") + (book.pic.cut ? " cut" : "")} src={book.pic.src} alt=""
          style={{ width: `${Math.round((book.pic.size || 0.6) * 100)}%` }} />
      )}
      {book.sticker && <span className="nb-sticker" aria-hidden="true">{book.sticker}</span>}
      {label && <span className="nb-cover-label">{book.title?.trim() || "Untitled"}</span>}
    </div>
  );
}

// Making a notebook, or changing one later: its name, folder and cover, and
// for a new one, its paper.
function BookDialog({ folders, folder: startFolder, book, onSave, onClose }) {
  const editing = !!book;
  const [title, setTitle] = useState(book?.title || "");
  const [template, setTemplate] = useState(book?.template || "lined");
  const [paper, setPaper] = useState(book?.paper || "white");
  const [cover, setCover] = useState(book?.cover || COVERS[0]);
  const [coverStyle, setCoverStyle] = useState(book?.coverStyle || "page");
  const [coverImg, setCoverImg] = useState(book?.coverImg || "");
  const [sticker, setSticker] = useState(book?.sticker || "");
  // A picture on the cover, background removed or not. The original is kept
  // while the dialog is open so the cut can be undone.
  const [pic, setPic] = useState(book?.pic || null);
  const [picOrig, setPicOrig] = useState(book?.pic?.orig || "");
  const [cutting, setCutting] = useState("");
  const picInput = useRef(null);
  async function addPic(f) {
    let src;
    try { src = await shrink(f, 900, 0.85); } catch { alert("That picture could not be used."); return; }
    setPicOrig(src);
    setPic({ src, cut: false, size: 0.6, pos: "middle" });
    await cut(src);
  }
  async function cut(src) {
    setCutting("Removing the background");
    try {
      const { cutout } = await import("./cutout.js");
      const png = await cutout(src);
      setPic((p) => ({ ...(p || {}), src: png, cut: true, size: p?.size || 0.6, pos: p?.pos || "middle" }));
      setCutting("");
    } catch {
      setCutting("Could not find a clear subject, so the whole picture is used.");
    }
  }
  const [folder, setFolder] = useState(book ? book.folder || "" : startFolder || "");
  const [newFolder, setNewFolder] = useState(null); // text while naming a new folder
  const photoInput = useRef(null);
  const save = () => onSave({ title: title.trim() || "Untitled notebook", template, paper, cover, coverStyle, coverImg: coverStyle === "photo" ? coverImg : "", sticker,
    pic: pic ? { ...pic, orig: pic.cut ? picOrig : "" } : null,
    folder: newFolder?.trim() ? newFolder.trim() : folder });
  const draft = { title, cover, coverStyle, coverImg, sticker, pic };
  const preview = book?.pages?.[0] || { ...newPage(template, paper), id: "cover" };

  async function pickPhoto(f) {
    try { setCoverImg(await shrink(f, 700, 0.8)); setCoverStyle("photo"); } catch { alert("That picture could not be used."); }
  }

  return (
    <Portal>
      <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="gate nb-new" role="dialog" aria-modal="true" aria-label={editing ? "Edit notebook" : "New notebook"}>
          <h2>{editing ? "Edit notebook" : "New notebook"}</h2>
          <div className="nb-new-top">
            <div className="nb-new-cover"><CoverArt book={draft} page={preview} /></div>
            <div className="nb-new-fields">
              <label className="nb-field"><span>Name</span>
                <input autoFocus placeholder="Biology, Chapter 3, Revision…" value={title} onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
              </label>
              <label className="nb-field"><span>Folder</span>
                {newFolder === null ? (
                  <select value={folder} onChange={(e) => { if (e.target.value === "\u0000new") setNewFolder(""); else setFolder(e.target.value); }}>
                    <option value="">No folder</option>
                    {folders.map((f) => <option key={f} value={f}>{f}</option>)}
                    <option value={"\u0000new"}>New folder…</option>
                  </select>
                ) : (
                  <input autoFocus placeholder="Name the new folder" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} />
                )}
              </label>
              <div className="nb-field"><span>Cover colour</span>
                <div className="nb-swatches">{COVERS.map((c) => (
                  <button key={c} className={cover === c ? "on" : ""} style={{ background: c }} aria-label="Cover colour" onClick={() => setCover(c)} />
                ))}
                  <label className="nb-custom nb-swatch-custom" title="Any colour"><input type="color" value={cover} onChange={(e) => setCover(e.target.value)} /></label>
                </div>
              </div>
            </div>
          </div>

          <span className="qv-label">Cover</span>
          <div className="nb-cover-styles">
            {COVER_STYLES.map((cs) => (
              <button key={cs.id} className={"nb-cs" + (coverStyle === cs.id ? " on" : "")}
                onClick={() => { if (cs.id === "photo" && !coverImg) photoInput.current?.click(); else setCoverStyle(cs.id); }}>
                <CoverArt book={{ ...draft, sticker: "", pic: null, coverStyle: cs.id }} page={preview} label={false} />
                <span>{cs.name}</span>
              </button>
            ))}
            <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pickPhoto(f); }} />
          </div>
          {coverStyle === "photo" && <button className="btn quiet small" style={{ justifySelf: "start", marginTop: -8, marginBottom: 12 }} onClick={() => photoInput.current?.click()}><Icon name="image" size={13} /> Choose another photo</button>}

          <span className="qv-label">Picture on the cover</span>
          <div className="nb-picrow">
            <input ref={picInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) addPic(f); }} />
            {!pic ? (
              <button className="btn ghost small" onClick={() => picInput.current?.click()}><Icon name="image" size={14} /> Add a picture</button>
            ) : (
              <>
                <button className="btn ghost small" onClick={() => picInput.current?.click()}>Change</button>
                {pic.cut
                  ? <button className="btn ghost small" disabled={!picOrig} onClick={() => setPic((p) => ({ ...p, src: picOrig, cut: false }))}>Keep the background</button>
                  : <button className="btn ghost small" disabled={!!cutting && cutting.startsWith("Removing")} onClick={() => cut(pic.src)}>Remove background</button>}
                <div className="seg tight">
                  {[["top", "Top"], ["middle", "Middle"], ["corner", "Corner"]].map(([k, n]) => (
                    <button key={k} className={(pic.pos || "middle") === k ? "on" : ""} onClick={() => setPic((p) => ({ ...p, pos: k }))}>{n}</button>
                  ))}
                </div>
                <label className="nb-picsize"><span className="small muted">Size</span>
                  <input type="range" min="0.25" max="1" step="0.05" value={pic.size || 0.6} onChange={(e) => setPic((p) => ({ ...p, size: Number(e.target.value) }))} />
                </label>
                <button className="btn quiet small" onClick={() => { setPic(null); setPicOrig(""); setCutting(""); }}>Remove</button>
              </>
            )}
          </div>
          {cutting && <p className="small muted" style={{ margin: "-6px 0 12px" }}>{cutting.startsWith("Removing") ? <Loading label={cutting} /> : cutting}</p>}
          <p className="small muted" style={{ margin: "-6px 0 14px" }}>Your dog, a friend, a favourite thing: the background is cut away on this device, nothing is uploaded.</p>

          <div className="nb-sticker-head"><span className="qv-label">Sticker</span>
            {sticker && <button className="btn quiet small" onClick={() => setSticker("")}>No sticker</button>}</div>
          <div className="nb-stickers">
            {STICKER_SETS.map((set) => (
              <div key={set.name} className="nb-sticker-set">
                <span>{set.name}</span>
                <div>{set.items.map((st) => (
                  <button key={st} className={sticker === st ? "on" : ""} onClick={() => setSticker(sticker === st ? "" : st)} aria-label={"Sticker " + st} aria-pressed={sticker === st}>{st}</button>
                ))}</div>
              </div>
            ))}
          </div>

          {!editing && (
            <>
              <div className="nb-field" style={{ marginBottom: 6 }}><span>Paper colour</span>
                <div className="nb-swatches">{PAPERS.map((p) => (
                  <button key={p.id} className={paper === p.id ? "on" : ""} style={{ background: p.bg }} title={p.name} aria-label={p.name} onClick={() => setPaper(p.id)} />
                ))}</div>
              </div>
              <span className="qv-label">Paper</span>
              <div className="nb-papers">
                {TEMPLATES.map((t) => (
                  <button key={t.id} className={"nb-paper" + (template === t.id ? " on" : "")} onClick={() => setTemplate(t.id)}>
                    <PagePreview page={{ ...newPage(t.id, paper), id: "p-" + t.id }} />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="gate-actions">
            <button className="btn cta gate-go" onClick={save}>{editing ? "Save" : "Create notebook"}</button>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Distance from a point to a stroke's line (not just its points, so a long
// straight line is hit in the middle too).
function strokeDist(it, x, y) {
  const P = it.points;
  if (P.length === 1) return Math.hypot(P[0][0] - x, P[0][1] - y);
  let best = Infinity;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1];
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L));
    best = Math.min(best, Math.hypot(ax + t * dx - x, ay + t * dy - y));
  }
  return best;
}
// Points no more than a step apart, so a stroke can be cut anywhere.
function densify(P, step = 1.5) {
  const out = [P[0]];
  for (let i = 1; i < P.length; i++) {
    const [ax, ay, ap] = P[i - 1], [bx, by, bp] = P[i];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / step);
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, ap + ((bp - ap) * k) / n]);
  }
  return out;
}
// Rubs out under a circle: whole strokes, or (like a real eraser) only
// the parts of strokes the circle passes over.
function eraseItems(items, x, y, r, whole) {
  let changed = false;
  const out = [];
  for (const it of items) {
    if (it.type === "stroke") {
      const lim = r + it.size * 0.4;
      if (strokeDist(it, x, y) > lim) { out.push(it); continue; }
      changed = true;
      if (whole) continue;
      const runs = [];
      let run = [];
      for (const pt of densify(it.points)) {
        if (Math.hypot(pt[0] - x, pt[1] - y) < lim) { if (run.length) runs.push(run); run = []; } else run.push(pt);
      }
      if (run.length) runs.push(run);
      const { d, ...rest } = it;
      for (const pts of runs) if (pts.length > 1) out.push({ ...rest, id: uid(), points: pts, straight: false, cut: true });
      continue;
    }
    if (it.type === "shape") {
      const b = boxOf(it);
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { changed = true; continue; }
    }
    out.push(it);
  }
  return changed ? out : items;
}

// Guides: a ruler's edges, a protractor's curve and base. A stroke or the
// eraser started on one follows it.
function guideAt(ruler, prot, pageId, x, y) {
  if (ruler && ruler.pageId === pageId) {
    const { lx, ly } = rulerLocal(ruler, x, y);
    const edge = ly > -32 && ly < 10 ? 0 : ly > RULER_H - 10 && ly < RULER_H + 32 ? RULER_H : null;
    if (edge !== null && lx > -30 && lx < ruler.len + 30) {
      const a = (ruler.angle * Math.PI) / 180, o = rulerPoint(ruler, 0, edge);
      return { kind: "line", ox: o[0], oy: o[1], ux: Math.cos(a), uy: Math.sin(a) };
    }
  }
  if (prot && prot.pageId === pageId) {
    const { lx, ly } = protLocal(prot, x, y);
    const d = Math.hypot(lx, ly);
    if (Math.abs(d - prot.r) < 22 && ly < 12) return { kind: "arc", cx: prot.x, cy: prot.y, r: prot.r };
    if (Math.abs(ly) < 16 && Math.abs(lx) < prot.r + 20) {
      const a = (prot.angle * Math.PI) / 180;
      return { kind: "line", ox: prot.x, oy: prot.y, ux: Math.cos(a), uy: Math.sin(a) };
    }
  }
  return null;
}
function onGuide(g, x, y) {
  if (g.kind === "line") { const t = (x - g.ox) * g.ux + (y - g.oy) * g.uy; return [g.ox + t * g.ux, g.oy + t * g.uy]; }
  const a = Math.atan2(y - g.cy, x - g.cx);
  return [g.cx + Math.cos(a) * g.r, g.cy + Math.sin(a) * g.r];
}

// A protractor: a half circle over its base, marked in degrees.
function protLocal(p, x, y) {
  const a = (p.angle * Math.PI) / 180, dx = x - p.x, dy = y - p.y;
  return { lx: dx * Math.cos(a) + dy * Math.sin(a), ly: -dx * Math.sin(a) + dy * Math.cos(a) };
}
function Protractor({ p }) {
  const marks = [];
  for (let d = 0; d <= 180; d++) {
    const t = Math.PI - (d * Math.PI) / 180, c = Math.cos(t), sn = -Math.sin(t);
    const len = d % 10 === 0 ? 16 : d % 5 === 0 ? 10 : 5;
    marks.push(<line key={d} x1={c * p.r} y1={sn * p.r} x2={c * (p.r - len)} y2={sn * (p.r - len)} stroke="#334" strokeWidth={d % 10 === 0 ? 1.1 : 0.6} />);
    if (d % 10 === 0) marks.push(<text key={"t" + d} x={c * (p.r - 28)} y={sn * (p.r - 28) + 4} fontSize="10" textAnchor="middle" fill="#334" fontFamily="Inter, system-ui, sans-serif">{d}</text>);
  }
  const deg = ((Math.round(p.angle) % 360) + 360) % 360;
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`} className="nb-ruler nb-protractor">
      <path d={`M${-p.r} 0 A${p.r} ${p.r} 0 0 1 ${p.r} 0 Z`} fill="rgba(235, 242, 255, 0.72)" stroke="rgba(59, 91, 253, 0.55)" strokeWidth="1.2" />
      {marks}
      <line x1="-8" x2="8" y1="0" y2="0" stroke="#e5484d" strokeWidth="1.5" /><line x1="0" x2="0" y1="-8" y2="0" stroke="#e5484d" strokeWidth="1.5" />
      <text x="0" y={-p.r / 2.6} fontSize="12" textAnchor="middle" fill="#3B5BFD" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">{deg}°</text>
      <circle cx={p.r - 24} cy="-16" r="13" fill="#3B5BFD" opacity="0.9" />
      <path d={`M${p.r - 30} -18 a6 6 0 1 1 6 8`} stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

// An Apple Pencil in normal writing presses lightly (around a quarter of
// its range), so pressure is lifted to make everyday writing a normal line
// and pressing hard a thick one.
const penPressure = (p) => (p > 0 ? Math.min(1, 0.22 + p * 1.05) : 0.5);

// A tap with an even pen is a dot, drawn as a circle (a line of no length
// does not show in every browser).
function isDot(points) {
  let L = 0;
  for (let i = 1; i < points.length; i++) L += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return L < 1.5;
}

// Paints a stroke onto a canvas using the very same shape the page shows
// once it is finished.
function paintStroke(ctx, it) {
  ctx.globalAlpha = 1;
  if (it.uniform || it.straight || it.tool === "highlighter" || (it.tool === "pen" && it.style === "ball")) {
    if (isDot(it.points)) { ctx.fillStyle = it.color; ctx.beginPath(); ctx.arc(it.points[0][0], it.points[0][1], it.size / 2, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.strokeStyle = it.color;
    ctx.lineWidth = it.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(new Path2D(linePath(it.uniform || it.straight ? it.points : smoothPts(it.points))));
    return;
  }
  ctx.fillStyle = it.color;
  ctx.fill(new Path2D(inkPath(it)));
}

const RULER_H = 64;
const CM = 96 / 2.54;
// A point's position along the ruler (lx) and away from its top edge (ly).
function rulerLocal(r, x, y) {
  const a = (r.angle * Math.PI) / 180, dx = x - r.x, dy = y - r.y;
  return { lx: dx * Math.cos(a) + dy * Math.sin(a), ly: -dx * Math.sin(a) + dy * Math.cos(a) };
}
function rulerPoint(r, lx, ly) {
  const a = (r.angle * Math.PI) / 180;
  return [r.x + lx * Math.cos(a) - ly * Math.sin(a), r.y + lx * Math.sin(a) + ly * Math.cos(a)];
}
function Ruler({ r }) {
  const ticks = [];
  for (let i = 0; i * CM / 10 <= r.len - 64; i++) {
    const x = (i * CM) / 10, big = i % 10 === 0, mid = i % 5 === 0;
    ticks.push(<line key={i} x1={x + 8} x2={x + 8} y1="0" y2={big ? 18 : mid ? 12 : 7} stroke="#334" strokeWidth={big ? 1.3 : 0.8} />);
    if (big) ticks.push(<text key={"t" + i} x={x + 8} y="31" fontSize="11" textAnchor="middle" fill="#334" fontFamily="Inter, system-ui, sans-serif">{i / 10}</text>);
  }
  const deg = ((Math.round(r.angle) % 360) + 360) % 360;
  return (
    <g transform={`translate(${r.x} ${r.y}) rotate(${r.angle})`} className="nb-ruler">
      <rect x="0" y="0" width={r.len} height={RULER_H} rx="6" fill="rgba(235, 242, 255, 0.72)" stroke="rgba(59, 91, 253, 0.55)" strokeWidth="1.2" />
      {ticks}
      <text x={r.len / 2 - 20} y={RULER_H - 12} fontSize="12" fill="#3B5BFD" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">{deg}°</text>
      <circle cx={r.len - 30} cy={RULER_H / 2} r="17" fill="#3B5BFD" opacity="0.9" />
      <path d={`M${r.len - 38} ${RULER_H / 2 - 3} a8 8 0 1 1 8 11 M${r.len - 33} ${RULER_H / 2 + 8} l-3 -3 4 -2`} stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

const SETTINGS = ["pen", "highlighter", "revealer", "eraser", "shape"];
const DRAWING_TOOLS = ["pen", "highlighter", "revealer", "eraser", "shape", "compass"];
const MORE_INKS = ["#1b1d26", "#6b7280", "#3B5BFD", "#0891b2", "#16a34a", "#84cc16", "#f59e0b", "#f97316", "#e5484d", "#db2777", "#9333ea", "#7c4a2d"];
const MORE_HIGHLIGHTS = ["#ffe066", "#fde68a", "#a7f3d0", "#bbf7d0", "#fbcfe8", "#fecdd3", "#bfdbfe", "#c7d2fe", "#fed7aa", "#e9d5ff"];

// The toolbar picture of a pen or highlighter, tipped in its colour.
function ToolTip({ tool, color }) {
  const hl = tool !== "pen";
  return (
    <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden="true">
      <path d={hl ? "M6 2h8v9l-2 5H8l-2-5Z" : "M7 2h6v11l-3 6-3-6Z"} fill="currentColor" opacity="0.28" />
      <path d={hl ? "M8 16h4l-.5 4h-3Z" : "M8.2 14.5h3.6L10 19Z"} fill={color} stroke="rgba(0,0,0,.25)" strokeWidth="0.5" />
      <rect x={hl ? 6 : 7} y="6" width={hl ? 8 : 6} height="2.5" fill={color} opacity="0.9" />
    </svg>
  );
}

// A sample stroke, drawn with the tool's real settings, so the size and style
// can be seen before writing.
function StrokeSample({ tool, size, color, style, tip }) {
  const pts = Array.from({ length: 40 }, (_, i) => [14 + i * 5.4, 30 + Math.sin(i / 5.5) * 12, 0.3 + 0.5 * Math.sin((i / 39) * Math.PI)]);
  const it = { tool, size: widthOf(tool, size), points: tool === "pen" ? pts : pts.map(([x, , p]) => [x, 30, p]), style, tip, pressure: tool === "pen" };
  return (
    <svg className="nb-sample" viewBox="0 0 240 60" aria-hidden="true">
      {tool === "eraser"
        ? <circle cx="120" cy="30" r={Math.min(28, widthOf("eraser", size) / 2.2)} fill="var(--surface)" stroke="var(--ink-3)" strokeWidth="1.5" />
        : <path d={inkPath(it)} fill={color} opacity={tool === "highlighter" ? 0.55 : 1} />}
    </svg>
  );
}

function ToolPop({ tool, prefs, setPrefs, size, setSize, savePen, removePen, colors, color, setColor, shapeKind, setShapeKind, onShowAll, onHideAll, onClearPage, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);
  const palette = tool === "highlighter" ? MORE_HIGHLIGHTS : tool === "revealer" ? colors : MORE_INKS;
  const names = { pen: "Pen", highlighter: "Highlighter", revealer: "Revealer pen", eraser: "Eraser", shape: "Shapes" };
  return (
    <>
      <div className="nb-pop-scrim" onPointerDown={onClose} />
      <div className="nb-pop" role="dialog" aria-label={names[tool] + " settings"}>
        <div className="nb-pop-head"><b>{names[tool]}</b><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={15} /></button></div>
        {tool !== "shape" && <StrokeSample tool={tool} size={size} color={color} style={prefs.style} tip={prefs.tip} />}
        {tool === "pen" && (
          <div className="seg tight nb-pop-seg">
            {PEN_STYLES.map((p) => <button key={p.id} className={prefs.style === p.id ? "on" : ""} onClick={() => setPrefs((o) => ({ ...o, style: p.id }))}>{p.name}</button>)}
          </div>
        )}
        {tool === "highlighter" && (
          <>
            <label className="nb-pop-check"><input type="checkbox" checked={!!prefs.hlStraight} onChange={(e) => setPrefs((o) => ({ ...o, hlStraight: e.target.checked }))} /> Always draw straight lines</label>
          </>
        )}
        {tool === "shape" && (
          <div className="seg tight nb-pop-seg">
            {[["line", "Line"], ["arrow", "Arrow"], ["rect", "Box"], ["ellipse", "Circle"]].map(([k, n]) => (
              <button key={k} className={shapeKind === k ? "on" : ""} onClick={() => setShapeKind(k)}>{n}</button>
            ))}
          </div>
        )}
        <label className="nb-pop-size">
          <span>Size</span>
          <input type="range" min="1" max="12" step="0.5" value={size} onChange={(e) => setSize(Number(e.target.value))} />
          <b>{size}</b>
        </label>
        {(tool === "pen" || tool === "highlighter" || tool === "revealer") && (
          <>
            <label className="nb-pop-size">
              <span>Stability</span>
              <input type="range" min="1" max="10" step="1" value={prefs.stab?.[tool] ?? 4}
                onChange={(e) => setPrefs((o) => ({ ...o, stab: { ...o.stab, [tool]: Number(e.target.value) } }))} />
              <b>{prefs.stab?.[tool] ?? 4}</b>
            </label>
            <p className="small muted nb-pop-hint">Low follows your hand exactly, good for writing (try 2). High smooths out wobble, good for graphs and curves (try 8).</p>
            {tool === "pen" && <label className="nb-pop-check"><input type="checkbox" checked={prefs.refine !== false} onChange={(e) => setPrefs((o) => ({ ...o, refine: e.target.checked }))} /> Auto refine: tidy each stroke when you lift the pen</label>}
          </>
        )}
        {tool !== "eraser" && (
          <div className="nb-pop-colors">
            {palette.map((c) => <button key={c} className={"nb-color" + (color === c ? " on" : "")} style={{ background: c }} onClick={() => setColor(c)} aria-label="Colour" />)}
            <label className="nb-color nb-custom" title="Any colour"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
          </div>
        )}
        {tool === "revealer" && (
          <>
            <p className="small muted">Cover answers, key words or labels. Tap a cover with this pen to peek, tap again to hide.</p>
            <div className="nb-pop-row"><button className="btn ghost small" onClick={onShowAll}>Show all</button><button className="btn ghost small" onClick={onHideAll}>Hide all</button></div>
          </>
        )}
        {tool === "eraser" && (
          <>
            <div className="seg tight nb-pop-seg">
              <button className={prefs.eraseWhole !== true ? "on" : ""} onClick={() => setPrefs((o) => ({ ...o, eraseWhole: false }))}>Part of a stroke</button>
              <button className={prefs.eraseWhole === true ? "on" : ""} onClick={() => setPrefs((o) => ({ ...o, eraseWhole: true }))}>Whole strokes</button>
            </div>
            <p className="small muted">The circle on the page shows how big it is. Start on the ruler's edge or the protractor to rub out in a straight line or a curve.</p>
            <div className="nb-pop-row"><button className="btn ghost small danger" onClick={() => { if (window.confirm("Clear everything on this page?")) { onClearPage(); onClose(); } }}>Clear this page</button></div>
          </>
        )}
        {(tool === "pen" || tool === "highlighter" || tool === "revealer") && (
          <div className="nb-pop-case">
            <span className="small muted">Pencil case</span>
            <div>
              {(prefs.pens || []).map((pn) => (
                <span key={pn.id} className="nb-pop-casepen"><ToolTip tool={pn.tool} color={pn.color} />
                  <button onClick={() => removePen(pn.id)} aria-label="Take out of the pencil case">×</button></span>
              ))}
              <button className="btn ghost small" onClick={savePen}>+ Add this pen</button>
            </div>
          </div>
        )}
        {(tool === "pen" || tool === "highlighter") && <p className="small muted nb-pop-tip">Tip: draw a line and hold still to make it straight.</p>}
      </div>
    </>
  );
}

// Something to watch or listen to while writing: a YouTube video, or a
// lecture recording, video or audio file from the device. It floats over
// the notebook and can be dragged anywhere.
function VideoFloat({ id, onId, onClose }) {
  const [link, setLink] = useState("");
  const [pos, setPos] = useState(() => ({ x: Math.max(16, innerWidth - 460), y: 120 }));
  const [file, setFile] = useState(null); // { url, name, audio }
  const [rate, setRate] = useState(1);
  // Sized to taste by dragging the corner; remembered for next time.
  const [width, setWidth] = useState(() => { try { return Number(localStorage.getItem("dwiddle-nb-video-w")) || 420; } catch { return 420; } });
  const sizing = useRef(null);
  const media = useRef(null);
  const fileInput = useRef(null);
  const drag = useRef(null);
  const [bad, setBad] = useState(false);
  useEffect(() => () => { if (file?.url) URL.revokeObjectURL(file.url); }, [file]);
  useEffect(() => { if (media.current) media.current.playbackRate = rate; }, [rate, file]);
  const submit = () => {
    const m = link.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/) || link.trim().match(/^([\w-]{11})$/);
    if (m) { setFile(null); onId(m[1]); } else setBad(true);
  };
  const pick = (f) => {
    if (!f) return;
    if (file?.url) URL.revokeObjectURL(file.url);
    setFile({ url: URL.createObjectURL(f), name: f.name, audio: f.type.startsWith("audio") || /\.(mp3|m4a|wav|aac|ogg)$/i.test(f.name) });
    onId("file");
  };
  const showing = file ? "file" : id ? "yt" : "ask";
  return (
    <div className={"nb-video" + (file?.audio ? " audio" : "") + (sizing.current ? " sizing" : "")} style={{ left: pos.x, top: pos.y, width }}>
      <div className="nb-video-bar"
        onPointerDown={(e) => { if (e.target.closest("button")) return; drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } }}
        onPointerMove={(e) => { if (drag.current) setPos({ x: Math.max(0, Math.min(innerWidth - 120, e.clientX - drag.current.dx)), y: Math.max(0, Math.min(innerHeight - 60, e.clientY - drag.current.dy)) }); }}
        onPointerUp={() => { drag.current = null; }}>
        <Icon name="video" size={15} /><b>{file ? file.name : "Watch or listen"}</b>
        {showing !== "ask" && <button className="nb-pill" onClick={() => { setFile(null); onId(""); }}>Change</button>}
        <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={15} /></button>
      </div>
      {showing === "yt" && (
        <iframe title="Video" src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" />
      )}
      {showing === "file" && (
        <div className="nb-media">
          {file.audio
            ? <audio ref={media} src={file.url} controls autoPlay />
            : <video ref={media} src={file.url} controls autoPlay playsInline />}
          <div className="seg tight nb-rate">
            {[0.75, 1, 1.25, 1.5, 2].map((r) => <button key={r} className={rate === r ? "on" : ""} onClick={() => setRate(r)}>{r}×</button>)}
          </div>
        </div>
      )}
      {showing === "ask" && (
        <form className="nb-video-ask" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <p className="small muted">Paste a YouTube link, or open a lecture recording, video or audio file.</p>
          <div className="nb-video-row">
            <input autoFocus value={link} onChange={(e) => { setLink(e.target.value); setBad(false); }} placeholder="https://youtu.be/..." />
            <button className="btn cta small" type="submit">Play</button>
          </div>
          {bad && <p className="small" style={{ color: "var(--warn)" }}>That does not look like a YouTube link.</p>}
          <input ref={fileInput} type="file" accept="audio/*,video/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" className="btn ghost small" onClick={() => fileInput.current?.click()}><Icon name="file" size={14} /> Open an audio or video file</button>
        </form>
      )}
      <div className="nb-video-size" aria-label="Drag to resize" title="Drag to resize"
        onPointerDown={(e) => { sizing.current = { x: e.clientX, w: width }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } e.preventDefault(); }}
        onPointerMove={(e) => { if (sizing.current) setWidth(Math.round(Math.max(240, Math.min(innerWidth - 16, sizing.current.w + e.clientX - sizing.current.x)))); }}
        onPointerUp={() => { sizing.current = null; try { localStorage.setItem("dwiddle-nb-video-w", String(width)); } catch { /* private mode */ } }} />
    </div>
  );
}

// Split screen: research beside the notebook. The desktop app has a real
// browser; websites cannot show most other sites inside them, so on the web
// there is Wikipedia, with its articles and pictures, to read and take from.
const WIKI = "https://en.wikipedia.org/w/api.php";
const COMMONS = "https://commons.wikimedia.org/w/api.php";
async function imageFile(url) {
  let src = null;
  if (window.DWIDDLE_WEB) src = await window.DWIDDLE_WEB.fetchImage(url);
  const blob = src ? await (await fetch(src)).blob() : await (await fetch(url)).blob();
  if (!blob.type.startsWith("image/")) throw new Error("not a picture");
  return new File([blob], "picture", { type: blob.type });
}

function SplitPanel({ onClose, onAddImage, onAddText }) {
  const desktop = typeof window !== "undefined" && !!window.DWIDDLE_WEB;
  const [tab, setTab] = useState(desktop ? "web" : "wiki");
  return (
    <aside className="nb-split" aria-label="Research">
      <div className="nb-split-bar">
        <div className="seg tight">
          {desktop && <button className={tab === "web" ? "on" : ""} onClick={() => setTab("web")}>Browser</button>}
          <button className={tab === "wiki" ? "on" : ""} onClick={() => setTab("wiki")}>Wikipedia</button>
        </div>
        <span className="small muted nb-split-tip">Drag pictures onto your page, or copy and paste.</span>
        <button className="icon-btn" onClick={onClose} aria-label="Close split screen"><Icon name="close" size={16} /></button>
      </div>
      {tab === "web" && desktop ? <WebView /> : <WikiPanel onAddImage={onAddImage} onAddText={onAddText} />}
    </aside>
  );
}

function WebView() {
  const view = useRef(null);
  const [addr, setAddr] = useState("https://www.google.com");
  const [src] = useState("https://www.google.com");
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const on = (e) => setAddr(e.url);
    v.addEventListener("did-navigate", on);
    v.addEventListener("did-navigate-in-page", on);
    return () => { v.removeEventListener("did-navigate", on); v.removeEventListener("did-navigate-in-page", on); };
  }, []);
  const go = (e) => {
    e.preventDefault();
    const t = addr.trim();
    const url = /^https?:\/\//.test(t) ? t : /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(t) ? "https://" + t : "https://www.google.com/search?q=" + encodeURIComponent(t);
    view.current?.loadURL(url);
  };
  return (
    <div className="nb-web">
      <form className="nb-web-bar" onSubmit={go}>
        <button type="button" className="icon-btn" onClick={() => view.current?.goBack()} aria-label="Back"><Icon name="back" size={15} /></button>
        <button type="button" className="icon-btn" onClick={() => view.current?.reload()} aria-label="Reload"><Icon name="refresh" size={15} /></button>
        <input value={addr} onChange={(e) => setAddr(e.target.value)} onFocus={(e) => e.target.select()} aria-label="Address or search" />
      </form>
      <webview ref={view} src={src} partition="persist:dwiddle-browse" style={{ flex: 1 }} />
    </div>
  );
}

function WikiPanel({ onAddImage, onAddText }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [article, setArticle] = useState(null); // { title, text }
  const [pics, setPics] = useState([]);
  const [busy, setBusy] = useState(false);
  const textRef = useRef(null);
  async function search(e) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setArticle(null);
    try {
      const [r, p] = await Promise.all([
        fetch(`${WIKI}?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=8&format=json&origin=*`).then((x) => x.json()),
        fetch(`${COMMONS}?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&iiurlwidth=360&format=json&origin=*`).then((x) => x.json()),
      ]);
      setResults(r.query?.search || []);
      setPics(Object.values(p.query?.pages || {}).map((x) => x.imageinfo?.[0]).filter((x) => x && /image\/(png|jpe?g|gif|webp|svg)/.test(x.mime)).map((x) => x.thumburl));
    } catch { setResults([]); } finally { setBusy(false); }
  }
  async function open(title) {
    setBusy(true);
    try {
      const r = await fetch(`${WIKI}?action=query&prop=extracts&explaintext=1&exsectionformat=plain&titles=${encodeURIComponent(title)}&format=json&origin=*`).then((x) => x.json());
      const page = Object.values(r.query?.pages || {})[0];
      setArticle({ title, text: page?.extract || "" });
    } finally { setBusy(false); }
  }
  const addSelected = () => {
    const sel = String(window.getSelection() || "").trim();
    onAddText(sel || (article?.text || "").split("\n").find((l) => l.trim().length > 40) || "");
  };
  return (
    <div className="nb-wiki">
      <form className="nb-web-bar" onSubmit={search}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Wikipedia, e.g. mitochondria" aria-label="Search Wikipedia" />
        <button className="btn small cta" disabled={busy}>{busy ? "…" : "Search"}</button>
      </form>
      <div className="nb-wiki-body">
        {pics.length > 0 && (
          <div className="nb-wiki-pics">
            {pics.map((u) => (
              <button key={u} className="nb-wiki-pic" draggable onDragStart={(e) => e.dataTransfer.setData("text/uri-list", u)}
                onClick={async () => { try { onAddImage(await imageFile(u)); } catch { alert("That picture could not be added."); } }} title="Add to the page">
                <img src={u} alt="" loading="lazy" /><span>+</span>
              </button>
            ))}
          </div>
        )}
        {article ? (
          <div className="nb-wiki-article">
            <div className="nb-wiki-head"><button className="btn quiet small" onClick={() => setArticle(null)}><Icon name="back" size={13} /> Results</button>
              <button className="btn ghost small" onClick={addSelected}>Add selected text to page</button></div>
            <h3>{article.title}</h3>
            <div ref={textRef} className="nb-wiki-text">{article.text.split("\n").filter(Boolean).slice(0, 80).map((l, i) => <p key={i}>{l}</p>)}</div>
          </div>
        ) : results && (
          <ul className="nb-wiki-results">
            {results.length === 0 && <li className="small muted">Nothing found.</li>}
            {results.map((r) => (
              <li key={r.pageid}><button onClick={() => open(r.title)}><b>{r.title}</b>
                <span className="small muted" dangerouslySetInnerHTML={{ __html: r.snippet.replace(/<(?!\/?span)[^>]*>/g, "") + "…" }} /></button></li>
            ))}
          </ul>
        )}
        {!results && !article && <p className="small muted" style={{ padding: 12 }}>Look anything up without leaving your notes. Tap a picture to add it, or drag it onto the page.</p>}
      </div>
    </div>
  );
}

// Every page of a PDF, as pictures to write on.
async function pdfPages(file, progress) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  const n = Math.min(doc.numPages, 60);
  for (let i = 1; i <= n; i++) {
    progress?.(i, n);
    const pg = await doc.getPage(i);
    const vp = pg.getViewport({ scale: 1 });
    const view = pg.getViewport({ scale: Math.min(2, 1600 / vp.width) });
    const c = document.createElement("canvas");
    c.width = view.width; c.height = view.height;
    await pg.render({ canvasContext: c.getContext("2d"), viewport: view }).promise;
    pages.push({ ...newPage("blank"), w: PAGE_W, h: Math.round(PAGE_W * (vp.height / vp.width)), bg: c.toDataURL("image/jpeg", 0.85) });
  }
  return pages;
}

// A picture as a whole page, sized to the picture.
async function imagePage(file) {
  const src = await shrink(file, 1800, 0.86);
  const img = new Image();
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = src; });
  return { ...newPage("blank"), w: PAGE_W, h: Math.round(PAGE_W * (img.height / img.width)), bg: src };
}

/* ---------- the editor ---------- */

// Keeps the stroke going when the pen leaves the page. Never allowed to stop a
// stroke starting, whatever the device.
function capture(el, e) {
  try { el.setPointerCapture(e.pointerId); } catch { /* not a capturable pointer */ }
}

const TOOLS = [
  { id: "hand", icon: "hand", name: "Scroll: move around without drawing" },
  { id: "pen", icon: "pen", name: "Pen" },
  { id: "highlighter", icon: "marker", name: "Highlighter" },
  { id: "revealer", icon: "eyeoff", name: "Revealer pen: hide answers, then tap to reveal" },
  { id: "eraser", icon: "eraser", name: "Eraser" },
  { id: "shape", icon: "shape", name: "Shapes" },
  { id: "compass", icon: "compass", name: "Compass: tap to place the point, then draw around it" },
  { id: "text", icon: "type", name: "Text" },
  { id: "select", icon: "lasso", name: "Lasso: circle things to move, resize or delete them" },
];
const INKS = ["#1b1d26", "#3B5BFD", "#e5484d", "#16a34a", "#9333ea", "#f59e0b"];
const HIGHLIGHTS = ["#ffe066", "#a7f3d0", "#fbcfe8", "#bfdbfe", "#fed7aa"];
const COVERS_INK = ["#b9a7f5", "#8fb6f7", "#f5a7c4", "#9ad9b5", "#f7c98f"];

// Saved on this device, and to the account when signed in.
const saveBook = (b) => putBook(b).then(() => queueUpload(b.id)).catch(() => {});

function Editor({ id, go, onClose }) {
  const [book, setBook] = useState(null);
  const [tool, setTool] = useState("pen");
  const [shapeKind, setShapeKind] = useState("line");
  const [ink, setInk] = useState(INKS[0]);
  const [hl, setHl] = useState(HIGHLIGHTS[0]);
  // Each tool keeps its own size and style, remembered between visits.
  const [prefs, setPrefs] = useState(() => {
    const base = { size: { pen: 3, highlighter: 3, revealer: 3, eraser: 3, shape: 3 }, style: "fountain", tip: "round", hlStraight: false,
      stab: { pen: 1, highlighter: 4, revealer: 4 }, refine: false, finger: true,
      // The pencil case: favourite pens, one tap away.
      pens: [
        { id: "p1", tool: "pen", color: "#1b1d26", size: 2.5, style: "fountain", stab: 2 },
        { id: "p2", tool: "pen", color: "#3B5BFD", size: 2, style: "ball", stab: 2 },
        { id: "p3", tool: "pen", color: "#e5484d", size: 2, style: "ball", stab: 2 },
        { id: "p4", tool: "highlighter", color: "#ffe066", size: 3, tip: "round", stab: 5 },
        { id: "p5", tool: "highlighter", color: "#a7f3d0", size: 3, tip: "round", stab: 5 },
      ] };
    try {
      const saved = JSON.parse(localStorage.getItem("dwiddle-nb-tools") || "{}");
      // Auto refine made small writing hard; it starts off for everyone once.
      if (!saved.v2) { saved.refine = false; saved.v2 = true; }
      return { ...base, ...saved, stab: { ...base.stab, ...(saved.stab || {}) } };
    } catch { return base; }
  });
  useEffect(() => { try { localStorage.setItem("dwiddle-nb-tools", JSON.stringify(prefs)); } catch { /* private mode */ } }, [prefs]);
  const size = prefs.size[tool] ?? 3;
  const setSize = (v) => setPrefs((o) => ({ ...o, size: { ...o.size, [tool]: v } }));
  function pickPen(pn) {
    setTool(pn.tool);
    if (pn.tool === "highlighter") setHl(pn.color); else if (pn.tool === "revealer") setCov(pn.color); else setInk(pn.color);
    setPrefs((o) => ({ ...o, size: { ...o.size, [pn.tool]: pn.size }, stab: { ...o.stab, [pn.tool]: pn.stab ?? o.stab?.[pn.tool] },
      ...(pn.style ? { style: pn.style } : {}), ...(pn.tip ? { tip: pn.tip } : {}) }));
  }
  function savePen() {
    const pn = { id: uid(), tool, color: tool === "highlighter" ? hl : tool === "revealer" ? cov : ink, size, stab: prefs.stab?.[tool],
      ...(tool === "pen" ? { style: prefs.style } : {}), ...(tool === "highlighter" ? { tip: prefs.tip } : {}) };
    setPrefs((o) => ({ ...o, pens: [...(o.pens || []), pn].slice(-10) }));
  }
  const removePen = (id) => setPrefs((o) => ({ ...o, pens: (o.pens || []).filter((x) => x.id !== id) }));

  // Fonts the student imported: kept on this device and loaded here.
  const [customFonts, setCustomFonts] = useState([]);
  const fontInput = useRef(null);
  useEffect(() => {
    listFonts().then(async (fonts) => {
      for (const f of fonts) { try { document.fonts.add(await new FontFace(f.name, f.data).load()); } catch { /* a broken font file */ } }
      setCustomFonts(fonts.map((f) => f.name));
    }).catch(() => {});
  }, []);
  async function importFont(file) {
    const name = file.name.replace(/\.(ttf|otf|woff2?)$/i, "").replace(/[-_]+/g, " ").trim().slice(0, 40) || "My font";
    try {
      const data = await file.arrayBuffer();
      document.fonts.add(await new FontFace(name, data).load());
      await putFont({ name, data });
      setCustomFonts((c) => [...new Set([...c, name])]);
      setFont("custom:" + name);
      if (selected?.type === "text") updatePage(sel.pageId, (p) => ({ ...p, items: p.items.map((i) => (i.id === selected.id ? { ...i, font: "custom:" + name } : i)) }));
    } catch {
      alert("That file could not be used as a font. Try a .ttf, .otf or .woff file.");
    }
  }
  const [pop, setPop] = useState(null); // the tool whose settings are open
  const ring = useRef(null); // the circle that shows a tool's size under the pointer
  const holdT = useRef(null);
  const [font, setFont] = useState("caveat");
  const [zoom, setZoom] = useState(1);
  const [live, setLive] = useState(null); // { pageId, item }: a shape being drawn
  // A stroke being drawn lives outside React state and is drawn straight
  // onto its own path, so nothing else re-renders while the pen moves.
  const liveStroke = useRef(null);
  // A ruler laid on the page: strokes started along its edge come out
  // perfectly straight. Measured in real centimetres (A4 at 96 dpi).
  const [ruler, setRuler] = useState(null); // { pageId, x, y, angle, len }
  const [compass, setCompass] = useState(null); // { pageId, x, y } the compass point
  const [prot, setProt] = useState(null); // { pageId, x, y, angle, r } a protractor
  // The lasso: a loop being drawn, then what it took in.
  const [group, setGroup] = useState(null); // { pageId, ids }
  const [cropping, setCropping] = useState(null); // id of a picture being cropped
  const widthDrag = useRef(null);
  const moveDrag = useRef(null);
  const lastTextTap = useRef({ id: null, t: 0 });
  const lasso = useRef(null);
  const lassoPath = useRef(null);
  const [lassoOn, setLassoOn] = useState(null); // pageId while a loop is drawn
  const livePath = useRef(null);
  const [liveOn, setLiveOn] = useState(null); // { pageId, color, tool } while a stroke is drawn
  const frame = useRef(0);
  // "Wet ink", as note apps do it: while the pen moves, only the newest
  // piece of line is painted onto a canvas over the page, the same small
  // job however long the stroke gets. The finished, smoothed ink ("dry
  // ink") is worked out once, when the pen lifts.
  const wet = useRef({ ctx: null, drawn: 0, el: null });
  const [wetPage, setWetPage] = useState(null); // the page the ink canvas sits on, kept between strokes
  const wetCanvas = useCallback((el) => {
    if (!el) { wet.current = { ctx: null, drawn: 0, el: null }; return; }
    const r = el.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    el.width = Math.max(1, Math.round(r.width * dpr));
    el.height = Math.max(1, Math.round(r.height * dpr));
    let ctx = null;
    try { ctx = el.getContext("2d", { desynchronized: true }); } catch { /* older browsers */ }
    ctx ||= el.getContext("2d");
    const k = (r.width / (Number(el.dataset.w) || PAGE_W)) * dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    wet.current = { ctx, drawn: 0, el };
    drawLiveRef.current?.();
  }, []);
  const drawLiveRef = useRef(null);
  const clearWet = () => {
    const w = wet.current;
    if (w.ctx) { w.ctx.save(); w.ctx.setTransform(1, 0, 0, 1, 0, 0); w.ctx.clearRect(0, 0, w.el.width, w.el.height); w.ctx.restore(); }
    w.drawn = 0;
  };
  // Painted with exactly the same shape the finished stroke will have, so
  // nothing shifts when the pen lifts; redrawn once per screen refresh.
  const drawLive = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const ls = liveStroke.current, w = wet.current, ctx = w.ctx;
      if (!ls || !ctx) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w.el.width, w.el.height); ctx.restore();
      paintStroke(ctx, ls);
      w.drawn = ls.points.length;
    });
  };
  drawLiveRef.current = drawLive;
  const [sel, setSel] = useState(null); // { pageId, itemId }
  const [editingText, setEditingText] = useState(null); // itemId
  // A text box left empty is removed, so invisible boxes never pile up
  // over real writing and catch taps meant for it.
  const lastEditing = useRef(null);
  useEffect(() => {
    const prev = lastEditing.current;
    lastEditing.current = editingText;
    if (!prev || prev === editingText || !book) return;
    const pg = book.pages.find((p) => p.items.some((i) => i.id === prev));
    const it = pg?.items.find((i) => i.id === prev);
    if (it && it.type === "text" && !String(it.text || "").trim()) {
      updatePage(pg.id, (p) => ({ ...p, items: p.items.filter((i) => i.id !== prev) }), { record: false });
    }
  }, [editingText]);
  const [current, setCurrent] = useState(0); // page index in view
  const [busy, setBusy] = useState("");
  const [cov, setCov] = useState(COVERS_INK[0]);
  const [shown, setShown] = useState(() => new Set()); // revealer strokes tapped open
  const [video, setVideo] = useState(null); // YouTube id playing beside the notes
  const [split, setSplit] = useState(false); // research beside the notebook
  const [adding, setAdding] = useState(false); // the add page menu
  const [pageMenu, setPageMenu] = useState(false); // paper, add, remove, print
  const [more, setMore] = useState(false); // on a phone: pictures, split screen, video, ruler, protractor
  const [fontPop, setFontPop] = useState(false);
  const [thumbMenu, setThumbMenu] = useState(null); // { i, top } options for a page in the sidebar
  const past = useRef([]);
  const future = useRef([]);
  const drag = useRef(null);
  const saveT = useRef(0);
  const imgInput = useRef(null);
  const pagesRef = useRef(null);

  useEffect(() => { getBook(id).then((b) => setBook(b || null)); }, [id]);

  // Pages open fitted to the width of the window, as a real notebook app does.
  const fit = useCallback(() => {
    const el = pagesRef.current;
    if (!el) return;
    setZoom(Math.max(0.3, Math.min(1.4, +((el.clientWidth - 40) / PAGE_W).toFixed(2))));
  }, []);
  // Fitted once, the moment the page area first appears and has a width.
  const fitted = useRef(false);
  const pagesArea = useCallback((el) => {
    pagesRef.current = el;
    if (!el || fitted.current) return;
    fitted.current = true;
    const measure = () => {
      if (!el.isConnected) return;
      if (!el.clientWidth) { requestAnimationFrame(measure); return; }
      setZoom(Math.max(0.3, Math.min(1.4, +((el.clientWidth - 40) / PAGE_W).toFixed(2))));
    };
    measure();
  }, []);
  useEffect(() => { setEditingText(null); if (tool !== "compass") setCompass(null); if (tool !== "select" && tool !== "hand") setGroup(null); }, [tool]);

  // Phones and iPads: one finger draws, two fingers scroll, and the hand
  // tool scrolls with one. The browser has to be told not to scroll on its
  // own, which only a non-passive touch listener can do.
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const bookRef = useRef(book);
  bookRef.current = book;
  const groupRef = useRef(group);
  groupRef.current = group;
  const fingerRef = useRef(true);
  fingerRef.current = prefs.finger !== false;
  const twoFinger = useRef(null); // { x, y, d, z } while two fingers pinch or scroll
  const zoomRef = useRef(zoom);
  // With the iPad keyboard up, the notebook fits the space above it, so the
  // text being typed is never hidden behind the keys.
  const nbRef = useRef(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const fit = () => {
      const el = nbRef.current;
      if (!el) return;
      const shrunk = vv.height < window.innerHeight - 80;
      el.style.height = shrunk ? vv.height + "px" : "";
      el.style.transform = shrunk && vv.offsetTop ? `translateY(${vv.offsetTop}px)` : "";
    };
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => { vv.removeEventListener("resize", fit); vv.removeEventListener("scroll", fit); };
  }, []);
  const lastPen = useRef(0); // when the Pencil last touched: fingers are a resting hand for a moment after
  zoomRef.current = zoom;
  // Safari's own pinch zoom would scale the page as a picture; the notebook
  // does its own.
  useEffect(() => {
    const stop = (e) => e.preventDefault();
    document.addEventListener("gesturestart", stop);
    document.addEventListener("gesturechange", stop);
    return () => { document.removeEventListener("gesturestart", stop); document.removeEventListener("gesturechange", stop); };
  }, []);
  // Add ?nbdebug to the address to see what the device sends while drawing.
  const [debug, setDebug] = useState(() => (/nbdebug/.test(location.search) ? [] : null));
  const log = (type, e) => {
    if (!debug) return;
    const t = e.changedTouches?.[0];
    const line = `${type} ${e.pointerType || t?.touchType || ""} ${e.defaultPrevented ? "blocked" : ""} ${e.target?.nodeName || ""}`;
    setDebug((d) => [line, ...(d || [])].slice(0, 14));
  };
  const logRef = useRef(log);
  logRef.current = log;
  const loaded = !!book;
  // Paste a picture (or some text) straight onto the page.
  const pasteRef = useRef(null);
  pasteRef.current = (e) => {
    const t = e.target;
    if (t.closest?.("input, textarea, [contenteditable=true], .nb-textedit")) return;
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
    if (f) { e.preventDefault(); addImage(f); return; }
    const text = e.clipboardData?.getData("text/plain");
    if (text?.trim()) { e.preventDefault(); addText(text); }
  };
  useEffect(() => {
    const on = (e) => pasteRef.current?.(e);
    window.addEventListener("paste", on);
    return () => window.removeEventListener("paste", on);
  }, []);
  useEffect(() => {
    const el = pagesRef.current;
    if (!el) return;
    const stylus = (e) => [...e.changedTouches].some((t) => t.touchType === "stylus");
    const mid = (t) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
    const span = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    // Two fingers pinch to zoom and drag to scroll, whatever the tool. The
    // notebook zooms itself, redrawing the ink sharp at every size, rather
    // than letting the browser blow the page up like a photo.
    const pinchStart = (e) => {
      const f = fingers(e);
      twoFinger.current = { ...mid(f), d: span(f), z: zoomRef.current };
      setLive(null);
      liveStroke.current = null;
      setLiveOn(null);
      lasso.current = null;
      setLassoOn(null);
      drag.current = null;
      e.preventDefault();
    };
    const pinchMove = (e) => {
      const f = fingers(e), m = mid(f), t = twoFinger.current;
      const r = el.getBoundingClientRect();
      const z = Math.max(0.4, Math.min(3, t.z * (span(f) / t.d)));
      const old = zoomRef.current;
      if (Math.abs(z - old) > 0.004) {
        // keep the spot between the fingers where it is
        const cx = el.scrollLeft + (m.x - r.left), cy = el.scrollTop + (m.y - r.top);
        zoomRef.current = z;
        setZoom(z);
        requestAnimationFrame(() => { el.scrollLeft = cx * (z / old) - (m.x - r.left); el.scrollTop = cy * (z / old) - (m.y - r.top); });
      }
      const now = performance.now(), dt = Math.max(1, now - (t.t || now - 16));
      el.scrollBy(t.x - m.x, t.y - m.y);
      t.vx = (t.vx || 0) * 0.6 + ((t.x - m.x) / dt) * 0.4; t.vy = (t.vy || 0) * 0.6 + ((t.y - m.y) / dt) * 0.4; t.t = now;
      t.x = m.x; t.y = m.y;
      e.preventDefault();
    };
    // Simple rule: with a drawing tool, a finger or a Pencil writes; with the
    // hand tool, it scrolls. Two fingers always scroll.
    // With the hand, a touch that lands on something takes it (select, move,
    // resize); a touch on bare paper is left to the iPad's own smooth scrolling.
    const onSomething = (t) => {
      const pageEl = t.target.closest?.(".nb-page");
      const b = bookRef.current;
      if (!pageEl || !b) return false;
      const pg = b.pages[Number(pageEl.dataset.index)];
      const svgEl = pageEl.querySelector(".nb-svg");
      if (!pg || !svgEl) return false;
      const r = svgEl.getBoundingClientRect(), k = r.width / pg.w;
      const x = (t.clientX - r.left) / k, y = (t.clientY - r.top) / k;
      const g = groupRef.current;
      if (g && g.pageId === pg.id) {
        const gb = unionBox(pg.items.filter((i) => g.ids.includes(i.id)));
        if (gb && x >= gb.x - 30 / k && x <= gb.x + gb.w + 30 / k && y >= gb.y - 30 / k && y <= gb.y + gb.h + 30 / k) return true;
      }
      return !!itemAt(pg.items, x, y, 16 / k);
    };
    const fingers = (e) => [...e.touches].filter((t) => t.touchType !== "stylus");
    const penOn = (e) => [...e.touches].some((t) => t.touchType === "stylus");
    const onStart = (e) => {
      logRef.current("touchstart", e);
      // the crop box holds the page still, except its buttons, which must stay tappable
      if (e.target.closest?.(".nb-textgrip, .nb-textwidth")) { e.preventDefault(); return; } // moving or sizing the text box
      if (e.target.closest?.(".nb-textbar, .nb-textedit")) return; // typing, selecting words, the text bar
      if (e.target.closest?.(".nb-crop") && !e.target.closest("button")) { e.preventDefault(); return; }
      if (e.target.closest?.(".nb-crop-bar")) return;
      const onPage = !!e.target.closest?.(".nb-svg");
      if (stylus(e)) {
        lastPen.current = Date.now();
        if (onPage && (toolRef.current !== "hand" || onSomething(e.changedTouches[0]))) e.preventDefault();
        return;
      }
      // A hand resting on the page while the Pencil writes: ignored, and
      // never taken for a pinch. Buttons around the page still work.
      if (DRAWING_TOOLS.includes(toolRef.current) && (penOn(e) || Date.now() - lastPen.current < 1500)) { if (onPage) e.preventDefault(); return; }
      if (fingers(e).length >= 2) { pinchStart(e); return; }
      if (toolRef.current === "hand") { if (e.target.closest?.(".nb-svg") && onSomething(e.changedTouches[0])) e.preventDefault(); return; }
      // "Pencil only": fingers scroll, and only an Apple Pencil writes.
      if (e.target.closest?.(".nb-ruler")) { e.preventDefault(); return; }
      if (!fingerRef.current && DRAWING_TOOLS.includes(toolRef.current)) return; // Pencil only: a finger scrolls instead of drawing
      if (e.target.closest?.(".nb-textedit")) return; // placing the caret in text being typed
      if (e.target.closest?.(".nb-svg")) e.preventDefault();
    };
    const onMove = (e) => {
      // moving, resizing or cropping something: the page must stay still
      if (e.target.closest?.(".nb-textgrip, .nb-textwidth") || (e.target.closest?.(".nb-crop") && !e.target.closest("button")) || drag.current?.groupMove || drag.current?.groupResize || drag.current?.textMove || drag.current?.ruler || drag.current?.prot) { e.preventDefault(); return; }
      const onPage = !!e.target.closest?.(".nb-svg");
      if (stylus(e)) { lastPen.current = Date.now(); if (toolRef.current !== "hand" && onPage) e.preventDefault(); return; }
      if (DRAWING_TOOLS.includes(toolRef.current) && (penOn(e) || Date.now() - lastPen.current < 1500)) { if (onPage) e.preventDefault(); return; }
      if (twoFinger.current && fingers(e).length >= 2) { pinchMove(e); return; }
      if (toolRef.current === "hand") return;
      if (!fingerRef.current && DRAWING_TOOLS.includes(toolRef.current)) return; // Pencil only: a finger scrolls instead of drawing
      if (e.target.closest?.(".nb-textedit")) return;
      if (e.target.closest?.(".nb-svg")) e.preventDefault();
    };
    const onEnd = (e) => {
      logRef.current("touchend", e);
      if (e.touches.length === 0 && twoFinger.current) {
        // let a two-finger flick glide on, like normal scrolling
        let { vx = 0, vy = 0 } = twoFinger.current;
        twoFinger.current = null;
        let last = performance.now();
        const glide = (now) => {
          const dt = now - last; last = now;
          vx *= Math.pow(0.93, dt / 16); vy *= Math.pow(0.93, dt / 16);
          if (Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02) return;
          el.scrollBy(vx * dt, vy * dt);
          requestAnimationFrame(glide);
        };
        if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) requestAnimationFrame(glide);
      }
      // iPhones and iPads only bring up the keyboard when focus happens
      // during the tap itself, so a new text box is focused here.
      if (toolRef.current === "text") {
        const box = el.querySelector(".nb-textedit");
        if (box && document.activeElement !== box) box.focus();
      }
    };
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [loaded]);

  // Every change is saved shortly after it is made, and kept for undo.
  const commit = useCallback((next, { record = true } = {}) => {
    setBook((prev) => {
      if (record && prev) { past.current.push(prev); if (past.current.length > 60) past.current.shift(); future.current = []; }
      clearTimeout(saveT.current);
      saveT.current = setTimeout(() => saveBook(next), 500);
      return next;
    });
  }, []);
  const updatePage = (pageId, fn, opts) => setBook((prev) => {
    const next = { ...prev, pages: prev.pages.map((p) => (p.id === pageId ? fn(p) : p)) };
    if (opts?.record !== false) { past.current.push(prev); if (past.current.length > 60) past.current.shift(); future.current = []; }
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => saveBook(next), 500);
    return next;
  });
  function undo() { const prev = past.current.pop(); if (!prev) return; future.current.push(book); setBook(prev); saveBook(prev); }
  function redo() { const next = future.current.pop(); if (!next) return; past.current.push(book); setBook(next); saveBook(next); }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest("input, textarea"))) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if ((e.key === "Backspace" || e.key === "Delete") && (group || sel)) {
        if (group) groupDelete();
        else { updatePage(sel.pageId, (p) => ({ ...p, items: p.items.filter((i) => i.id !== sel.itemId) })); setSel(null); }
      } else if (e.key === "Escape" && group) { setGroup(null); setSel(null); }
      else if (!mod) {
        const k = e.key.toLowerCase();
        const map = { p: "pen", h: "highlighter", e: "eraser", s: "shape", t: "text", v: "select" };
        if (map[k]) setTool(map[k]);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  // Pictures can be pasted straight onto the page in view.
  useEffect(() => {
    const onPaste = (e) => {
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest("input, textarea"))) return;
      const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
      if (f) { e.preventDefault(); addImage(f); }
    };
    addEventListener("paste", onPaste);
    return () => removeEventListener("paste", onPaste);
  });

  // Which page is in view, for the thumbnails and for "this page".
  useEffect(() => {
    const el = pagesRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((x) => x.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (vis) setCurrent(Number(vis.target.dataset.index));
    }, { threshold: [0.3, 0.6] });
    el.querySelectorAll(".nb-page").forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [book?.pages.length, zoom]);

  if (book === null) return <div className="page"><Loading label="Opening the notebook" /></div>;
  if (!book) return <div className="page"><p>That notebook could not be found.</p><button className="btn" onClick={onClose}>Back</button></div>;

  const pageOf = (pid) => book.pages.find((p) => p.id === pid);

  function toPage(e, svg, page) {
    const r = svg.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * page.w, ((e.clientY - r.top) / r.height) * page.h];
  }

  function down(e, page) {
    log("pointerdown", e);
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (twoFinger.current) return;
    if (e.pointerType === "pen") lastPen.current = Date.now();
    // a resting hand while the Pencil writes: ignored for drawing tools only,
    // so a finger can still lasso, type, pick and scroll
    else if (e.pointerType === "touch" && Date.now() - lastPen.current < 1500 && DRAWING_TOOLS.includes(tool)) return;
    // Pencil only: a finger scrolls, though it can still move the ruler.
    // Pencil only means a finger never draws; it can still select, move and type.
    if (e.pointerType === "touch" && prefs.finger === false && DRAWING_TOOLS.includes(tool) && !e.target.closest?.(".nb-ruler")) return;
    // With the hand tool a mouse drags the pages around; fingers scroll natively.
    const svg = e.currentTarget;
    const [x, y] = toPage(e, svg, page);
    // The hand: a pointer. Tap text to type, tap anything else to select it
    // (then move, resize, crop, delete); drag on nothing to scroll.
    if (tool === "hand") {
      capture(svg, e);
      if (group && group.pageId === page.id) {
        const gb = unionBox(page.items.filter((i) => group.ids.includes(i.id)));
        if (gb && Math.hypot(x - (gb.x + gb.w), y - (gb.y + gb.h)) < (e.pointerType === "touch" ? 44 : 28) / zoom) {
          drag.current = { groupResize: true, pageId: page.id, box: gb, base: page.items.filter((i) => group.ids.includes(i.id)), start: book };
          return;
        }
        const gp = (e.pointerType === "mouse" ? 0 : 12) / zoom;
        if (gb && x >= gb.x - gp && x <= gb.x + gb.w + gp && y >= gb.y - gp && y <= gb.y + gb.h + gp) {
          drag.current = { groupMove: true, pageId: page.id, x, y, sx: x, sy: y, moved: false, start: book };
          return;
        }
      }
      const hit = itemAt(page.items, x, y, (e.pointerType === "mouse" ? 6 : 16) / zoom);
      log("hand hit " + (hit ? hit.type : "nothing"), e);
      // (a second tap on the same text, counted when the finger lifts, opens it for typing)
      if (hit) {
        setEditingText(null);
        setGroup({ pageId: page.id, ids: [hit.id] });
        setSel({ pageId: page.id, itemId: hit.id });
        drag.current = { groupMove: true, pageId: page.id, x, y, sx: x, sy: y, moved: false, start: book };
        return;
      }
      setGroup(null); setSel(null); setEditingText(null);
      // a mouse drags the paper; a finger or Pencil scrolls it natively
      if (e.pointerType === "mouse") drag.current = { pan: { x: e.clientX, y: e.clientY, t: performance.now(), vx: 0, vy: 0 } };
      return;
    }
    const pressure = e.pointerType === "pen" ? penPressure(e.pressure) : 0.5;

    if (tool === "text") {
      const hit = [...page.items].reverse().find((i) => i.type === "text" && String(i.text || "").trim() && x >= i.x && x <= i.x + i.w && y >= i.y && y <= i.y + (i.h || 40));
      log("text tool hit " + (hit ? "text" : "nothing"), e);
      if (hit) {
        // press and drag moves the text; a tap (no drag) opens it for typing
        setEditingText(null);
        setSel({ pageId: page.id, itemId: hit.id });
        drag.current = { textMove: true, pageId: page.id, id: hit.id, x, y, sx: x, sy: y, moved: false, start: book };
        capture(e.currentTarget, e);
        return;
      }
      const it = { id: uid(), type: "text", x, y: y - 20, w: 360, h: 60, text: "", font, fontSize: 22, color: ink, tilt: (Math.random() - 0.5) * 1.2 };
      updatePage(page.id, (p) => ({ ...p, items: [...p.items, it] }));
      setEditingText(it.id);
      setSel({ pageId: page.id, itemId: it.id });
      e.preventDefault();
      return;
    }
    setEditingText(null);

    if (tool === "select") {
      capture(svg, e);
      if (group && group.pageId === page.id) {
        const gb = unionBox(page.items.filter((i) => group.ids.includes(i.id)));
        if (gb) {
          if (Math.hypot(x - (gb.x + gb.w), y - (gb.y + gb.h)) < (e.pointerType === "touch" ? 44 : 28) / zoom) {
            drag.current = { groupResize: true, pageId: page.id, box: gb, base: page.items.filter((i) => group.ids.includes(i.id)), start: book };
            return;
          }
          const gp = (e.pointerType === "mouse" ? 0 : 12) / zoom;
          if (x >= gb.x - gp && x <= gb.x + gb.w + gp && y >= gb.y - gp && y <= gb.y + gb.h + gp) {
            drag.current = { groupMove: true, pageId: page.id, x, y, sx: x, sy: y, moved: false, start: book };
            return;
          }
        }
      }
      setGroup(null);
      setSel(null);
      lasso.current = { pageId: page.id, pts: [[x, y]], mouse: e.pointerType === "mouse" };
      setLassoOn(page.id);
      return;
    }

    if (tool === "revealer") {
      const hit = [...page.items].reverse().find((i) => i.type === "stroke" && i.tool === "revealer" && nearStroke(i, x, y, 2));
      if (hit) {
        setShown((s) => { const n = new Set(s); n.has(hit.id) ? n.delete(hit.id) : n.add(hit.id); return n; });
        return;
      }
    }

    if (tool === "eraser") {
      const guide = guideAt(ruler, prot, page.id, x, y);
      const [ex, ey] = guide ? onGuide(guide, x, y) : [x, y];
      drag.current = { pageId: page.id, erase: true, start: book, guide, last: [ex, ey] };
      capture(svg, e);
      erase(page, ex, ey);
      return;
    }

    // The ruler: drag its body to move it, its handle to turn it.
    if (ruler && ruler.pageId === page.id) {
      const { lx, ly } = rulerLocal(ruler, x, y);
      if (lx >= 0 && lx <= ruler.len && ly >= 0 && ly <= RULER_H) {
        const turning = lx > ruler.len - 60;
        drag.current = { ruler: turning ? "turn" : "move", x, y, from: ruler };
        capture(svg, e);
        return;
      }
    }

    if (prot && prot.pageId === page.id) {
      const { lx, ly } = protLocal(prot, x, y);
      if (ly <= 2 && ly >= -prot.r && Math.hypot(lx, ly) <= prot.r && !guideAt(null, prot, page.id, x, y)) {
        const turning = Math.hypot(lx - (prot.r - 24), ly + 16) < 22;
        drag.current = { prot: turning ? "turn" : "move", x, y, from: prot };
        capture(svg, e);
        return;
      }
    }

    // The compass: tap to place its point; press away from it and draw
    // round to make an arc or a circle at that radius.
    if (tool === "compass") {
      capture(svg, e);
      if (!compass || compass.pageId !== page.id || Math.hypot(x - compass.x, y - compass.y) < 18) {
        setCompass({ pageId: page.id, x, y });
        drag.current = { compassPoint: true };
        return;
      }
      const r = Math.hypot(x - compass.x, y - compass.y);
      const a0 = Math.atan2(y - compass.y, x - compass.x);
      liveStroke.current = { pageId: page.id, id: uid(), type: "stroke", tool: "pen", color: ink, size: widthOf("pen", size), pressure: false,
        stab: 1, style: "ball", uniform: true, points: [[x, y, 0.5]], arc: { cx: compass.x, cy: compass.y, r, a0, last: a0, sweep: 0 } };
      setLiveOn({ pageId: page.id, color: ink, tool: "pen", uniform: true, size: widthOf("pen", size) });
      drawLive();
      return;
    }

    capture(svg, e);
    if (tool === "shape") {
      setLive({ pageId: page.id, item: { id: uid(), type: "shape", kind: shapeKind, x1: x, y1: y, x2: x, y2: y, color: ink, size: Math.max(2, size * 1.2) } });
    } else {
      const isHl = tool === "highlighter" || tool === "revealer";
      const color = tool === "revealer" ? cov : isHl ? hl : ink;
      liveStroke.current = { pageId: page.id, pointerId: e.pointerId, id: uid(), type: "stroke", tool, color,
        size: widthOf(tool, size), pressure: e.pointerType === "pen", points: [[x, y, pressure]], stab: prefs.stab[tool] ?? 4,
        ...(tool === "pen" ? { style: prefs.style } : {}), ...(tool === "highlighter" ? { tip: prefs.tip } : {}) };
      const guide = tool !== "revealer" ? guideAt(ruler, prot, page.id, x, y) : null;
      if (guide) {
        const s0 = onGuide(guide, x, y);
        liveStroke.current.uniform = true;
        if (guide.kind === "line") {
          liveStroke.current.guide = guide;
          liveStroke.current.straight = true;
          liveStroke.current.points = [[s0[0], s0[1], pressure], [s0[0], s0[1], pressure]];
        } else {
          const a0 = Math.atan2(s0[1] - guide.cy, s0[0] - guide.cx);
          liveStroke.current.arc = { cx: guide.cx, cy: guide.cy, r: guide.r, a0, last: a0, sweep: 0 };
          liveStroke.current.points = [[s0[0], s0[1], pressure]];
        }
      }
      setWetPage(page.id);
      clearWet();
      setLiveOn({ pageId: page.id, color, tool, uniform: !!liveStroke.current.uniform || (tool === "pen" && prefs.style === "ball"), size: liveStroke.current.size });
      drawLive();
    }
  }

  // The eraser rubs along the path between the last spot and this one, so
  // a quick swipe leaves no gaps.
  function erase(page, x, y, from) {
    const r = widthOf("eraser", size) / 2;
    const whole = prefs.eraseWhole === true;
    updatePage(page.id, (p) => {
      let items = p.items;
      const steps = from ? Math.max(1, Math.ceil(Math.hypot(x - from[0], y - from[1]) / (r * 0.5))) : 1;
      for (let k = 1; k <= steps; k++) {
        const ex = from ? from[0] + ((x - from[0]) * k) / steps : x, ey = from ? from[1] + ((y - from[1]) * k) / steps : y;
        items = eraseItems(items, ex, ey, r, whole);
      }
      return items === p.items ? p : { ...p, items };
    }, { record: false });
  }

  // Draws the size circle under the pointer, straight on the page, without
  // re-rendering anything.
  function showRing(e, svg, page) {
    const el = ring.current;
    if (!el) return;
    const sized = ["pen", "highlighter", "revealer", "eraser"].includes(tool);
    // While the pen is on the page the ink itself shows where it is; the
    // dot is only for hovering.
    if (!sized || e.pointerType === "touch" || (e.buttons & 1 && e.pointerType === "pen") || liveStroke.current) { el.style.display = "none"; return; }
    const d = Math.max(4, widthOf(tool, size) * (svg.getBoundingClientRect().width / page.w));
    const c = tool === "highlighter" ? hl : tool === "revealer" ? cov : ink;
    el.style.display = "block";
    el.style.width = el.style.height = d + "px";
    el.style.transform = `translate(${e.clientX - d / 2}px, ${e.clientY - d / 2}px)`;
    el.style.borderColor = tool === "eraser" ? "rgba(0,0,0,.55)" : c;
    el.style.background = tool === "pen" ? c : "";
    el.className = "nb-ring" + (tool === "eraser" ? " eraser" : tool === "pen" ? " dot" : "");
  }

  function move(e, page) {
    const svg = e.currentTarget;
    showRing(e, svg, page);
    if (twoFinger.current) return;
    if (drag.current?.pan) {
      const p = drag.current.pan, now = performance.now(), dt = Math.max(1, now - p.t);
      const dx = p.x - e.clientX, dy = p.y - e.clientY;
      pagesRef.current?.scrollBy(dx, dy);
      drag.current.pan = { x: e.clientX, y: e.clientY, t: now, vx: p.vx * 0.6 + (dx / dt) * 0.4, vy: p.vy * 0.6 + (dy / dt) * 0.4 };
      return;
    }
    const [x, y] = toPage(e, svg, page);
    if (drag.current?.erase) {
      const d = drag.current;
      const [ex, ey] = d.guide ? onGuide(d.guide, x, y) : [x, y];
      erase(page, ex, ey, d.last);
      d.last = [ex, ey];
      return;
    }
    if (drag.current?.prot) {
      const d = drag.current, f = d.from;
      if (d.prot === "move") setProt({ ...f, x: f.x + x - d.x, y: f.y + y - d.y });
      else {
        const a0 = Math.atan2(d.y - f.y, d.x - f.x), a1 = Math.atan2(y - f.y, x - f.x);
        let ang = f.angle + ((a1 - a0) * 180) / Math.PI;
        const snap = Math.round(ang / 15) * 15;
        if (Math.abs(ang - snap) < 2.5) ang = snap;
        setProt({ ...f, angle: ang });
      }
      return;
    }
    if (drag.current?.ruler) {
      const d = drag.current, f = d.from;
      if (d.ruler === "move") setRuler({ ...f, x: f.x + x - d.x, y: f.y + y - d.y });
      else {
        // turn about the ruler's middle, snapping to 0, 15, 30, 45 ... degrees
        const c = rulerPoint(f, f.len / 2, RULER_H / 2);
        const a0 = Math.atan2(d.y - c[1], d.x - c[0]), a1 = Math.atan2(y - c[1], x - c[0]);
        let ang = f.angle + ((a1 - a0) * 180) / Math.PI;
        const snap = Math.round(ang / 15) * 15;
        if (Math.abs(ang - snap) < 2.5) ang = snap;
        const rad = (ang * Math.PI) / 180, fr = (f.angle * Math.PI) / 180;
        // keep the middle where it is while turning
        const mx = f.x + Math.cos(fr) * f.len / 2 - Math.sin(fr) * RULER_H / 2, my = f.y + Math.sin(fr) * f.len / 2 + Math.cos(fr) * RULER_H / 2;
        setRuler({ ...f, angle: ang, x: mx - Math.cos(rad) * f.len / 2 + Math.sin(rad) * RULER_H / 2, y: my - Math.sin(rad) * f.len / 2 - Math.cos(rad) * RULER_H / 2 });
      }
      return;
    }
    if (drag.current?.compassPoint) { setCompass({ pageId: page.id, x, y }); return; }
    if (drag.current?.textMove) {
      const d = drag.current;
      // a finger or Pencil wobbles a little on a tap; only a clear drag moves the text
      if (!d.moved && Math.hypot(x - d.sx, y - d.sy) < 12 / zoom) return;
      const dx = x - d.x, dy = y - d.y;
      d.moved = true; d.x = x; d.y = y;
      updatePage(d.pageId, (p) => ({ ...p, items: p.items.map((i) => (i.id === d.id ? moveItem(i, dx, dy) : i)) }), { record: false });
      return;
    }
    if (drag.current?.groupMove && group) {
      const d = drag.current;
      // a tap wobbles a little; only a clear drag moves the selection
      if (!d.moved && Math.hypot(x - d.sx, y - d.sy) < 10 / zoom) return;
      d.moved = true;
      const dx = x - d.x, dy = y - d.y;
      d.x = x; d.y = y;
      updatePage(d.pageId, (p) => ({ ...p, items: p.items.map((i) => (group.ids.includes(i.id) ? moveItem(i, dx, dy) : i)) }), { record: false });
      return;
    }
    if (drag.current?.groupResize) {
      const d = drag.current, b = d.box;
      const k = Math.max(0.15, Math.min(6, ((x - b.x) / b.w + (y - b.y) / b.h) / 2));
      const scaled = new Map(d.base.map((i) => [i.id, scaleItem(i, b.x, b.y, k)]));
      updatePage(d.pageId, (p) => ({ ...p, items: p.items.map((i) => scaled.get(i.id) || i) }), { record: false });
      return;
    }
    if (lasso.current && lasso.current.pageId === page.id) {
      lasso.current.pts.push([x, y]);
      lassoPath.current?.setAttribute("d", "M" + lasso.current.pts.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" L") + " Z");
      return;
    }
    const ls = liveStroke.current;
    if (ls && ls.pointerId !== undefined && e.pointerId !== ls.pointerId) return;
    if (ls && ls.pageId === page.id && ls.arc) {
      const A = ls.arc;
      const a = Math.atan2(y - A.cy, x - A.cx);
      let da = a - A.last;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      A.sweep = Math.max(-2 * Math.PI, Math.min(2 * Math.PI, A.sweep + da));
      A.last = a;
      const n = Math.max(2, Math.ceil(Math.abs(A.sweep) / 0.03));
      ls.points = Array.from({ length: n + 1 }, (_, i) => { const t = A.a0 + (A.sweep * i) / n; return [A.cx + Math.cos(t) * A.r, A.cy + Math.sin(t) * A.r, 0.5]; });
      drawLive();
      return;
    }
    if (ls && ls.pageId === page.id && ls.guide) {
      const p1 = onGuide(ls.guide, x, y);
      ls.points = [ls.points[0], [p1[0], p1[1], ls.points[0][2]]];
      drawLive();
      return;
    }
    if (ls && ls.pageId === page.id) {
      // Every point the pen reported since the last frame, not just the
      // last one, so fast strokes stay smooth.
      const list = e.nativeEvent?.getCoalescedEvents?.();
      const events = list && list.length ? list : [e];
      if (ls.straight) ls.points = [ls.points[0], [x, y, ls.points[0][2]]];
      else for (const ev of events) {
        const [px, py] = toPage(ev, svg, page);
        const last = ls.points[ls.points.length - 1];
        // A Pencil's pressure flickers from one reading to the next; eased,
        // the line swells and thins smoothly instead of looking grainy.
        const raw = ev.pointerType === "pen" ? penPressure(ev.pressure) : 0.5;
        const pr = last[2] * 0.85 + raw * 0.15;
        // Movements smaller than the screen can show are just the pen
        // trembling; the last point is nudged instead of adding a new one.
        if (Math.hypot(px - last[0], py - last[1]) < 0.5 / zoom && ls.points.length > 1) { ls.points[ls.points.length - 1] = [px, py, pr]; continue; }
        // Stability above 2 also steadies the position a little; at 1 or 2
        // the ink goes exactly where the pen is.
        const st = ls.stab ?? 1, keep = st <= 2 ? 0 : Math.min(0.6, (st - 2) * 0.08);
        ls.points.push([last[0] * keep + px * (1 - keep), last[1] * keep + py * (1 - keep), pr]);
      }
      drawLive();
      // Draw and hold still for a moment: the line snaps straight, then
      // follows the pen from its start, as in GoodNotes.
      clearTimeout(holdT.current);
      holdT.current = setTimeout(() => {
        const l = liveStroke.current;
        if (!l || l.straight || l.points.length < 5) return;
        // only a long stroke (a line, not a letter) held still snaps straight
        const a = l.points[0], b = l.points[l.points.length - 1];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) * zoom < 90) return;
        l.straight = true; l.points = [a, b]; drawLive();
      }, 850);
      return;
    }
    if (!live || live.pageId !== page.id) return;
    setLive((l) => (l && l.item.type === "shape" ? { ...l, item: { ...l.item, x2: x, y2: y } } : l));
  }

  function up(e) {
    if (e?.type) log(e.type, e);
    // Lifting a resting hand must not end the Pencil's stroke.
    if (e?.pointerId !== undefined && liveStroke.current?.pointerId !== undefined && e.pointerId !== liveStroke.current.pointerId) return;
    if (drag.current?.textMove && !drag.current.moved) { const id = drag.current.id; drag.current = null; setEditingText(id); return; }
    // tapping a selected text box again (without dragging) opens it for typing
    if (drag.current?.groupMove && !drag.current.moved && group?.ids.length === 1) {
      const id = group.ids[0], pg = pageOf(group.pageId), it = pg?.items.find((i) => i.id === id);
      drag.current = null;
      if (it?.type === "text") {
        const now = Date.now(), again = lastTextTap.current.id === id && now - lastTextTap.current.t < 600;
        lastTextTap.current = { id, t: now };
        if (again) { setGroup(null); setEditingText(id); setSel({ pageId: pg.id, itemId: id }); }
      }
      return;
    }
    if (drag.current?.pan) {
      // a flick keeps the page gliding for a moment, like normal scrolling
      let { vx, vy } = drag.current.pan;
      drag.current = null;
      const el = pagesRef.current;
      let last = performance.now();
      const glide = (now) => {
        const dt = now - last; last = now;
        vx *= Math.pow(0.92, dt / 16); vy *= Math.pow(0.92, dt / 16);
        if (!el || (Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02)) return;
        el.scrollBy(vx * dt, vy * dt);
        requestAnimationFrame(glide);
      };
      if (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1) requestAnimationFrame(glide);
      return;
    }
    if (drag.current) {
      const start = drag.current.start;
      if (start && start !== book) { past.current.push(start); future.current = []; }
      drag.current = null;
      return;
    }
    if (lasso.current) {
      const L = lasso.current;
      lasso.current = null;
      setLassoOn(null);
      const page = pageOf(L.pageId);
      if (!page) return;
      // A tap, however much a Pencil trembles on the glass, stays close to
      // where it started; a loop goes somewhere.
      let far = 0;
      for (const q of L.pts) far = Math.max(far, Math.hypot(q[0] - L.pts[0][0], q[1] - L.pts[0][1]));
      let ids;
      if (far < 16 / zoom) {
        // a tap picks the one thing under it; a second tap on text opens it
        const [x, y] = L.pts[0];
        const hit = itemAt(page.items, x, y, (L.mouse ? 6 : 16) / zoom);
        log("lasso tap " + (hit ? hit.type : "nothing"), {});
        if (hit?.type === "text") {
          const now = Date.now(), again = lastTextTap.current.id === hit.id && now - lastTextTap.current.t < 450;
          lastTextTap.current = { id: hit.id, t: now };
          if (again) { setGroup(null); setEditingText(hit.id); setSel({ pageId: page.id, itemId: hit.id }); return; }
        }
        ids = hit ? [hit.id] : [];
      } else ids = page.items.filter((i) => lassoTakes(L.pts, i)).map((i) => i.id);
      if (ids.length) {
        setGroup({ pageId: page.id, ids });
        setSel(ids.length === 1 ? { pageId: page.id, itemId: ids[0] } : null);
      }
      return;
    }
    clearTimeout(holdT.current);
    const ls = liveStroke.current;
    if (ls && e?.type === "pointerup" && !ls.straight && !ls.arc && e.currentTarget?.getBoundingClientRect) {
      // where the pen left the glass is the true end of the stroke
      const pg = pageOf(ls.pageId);
      if (pg) { const [ex, ey] = toPage(e, e.currentTarget, pg); const lp = ls.points[ls.points.length - 1]; if (Math.hypot(ex - lp[0], ey - lp[1]) > 0.3 && Math.hypot(ex - lp[0], ey - lp[1]) < 30) ls.points.push([ex, ey, lp[2]]); }
    }
    if (ls) {
      liveStroke.current = null;
      const { pageId, arc, guide, ...rest } = ls;
      let done = rest;
      if (done.tool === "highlighter" && prefs.hlStraight && done.points.length > 1) done = { ...done, straight: true, points: [done.points[0], done.points[done.points.length - 1]] };
      else if (prefs.refine && !done.straight && !arc) done = { ...done, points: refine(done.points) };
      const item = done.uniform || done.straight ? done : { ...done, d: inkPath(done) };
      cancelAnimationFrame(frame.current); frame.current = 0;
      updatePage(pageId, (p) => ({ ...p, items: [...p.items, item] }));
      clearWet();
      setLiveOn(null);
      return;
    }
    if (!live) return;
    const item = live.item;
    const tiny = item.type === "shape" && Math.hypot(item.x2 - item.x1, item.y2 - item.y1) < 4;
    if (!tiny) updatePage(live.pageId, (p) => ({ ...p, items: [...p.items, item] }));
    setLive(null);
  }

  async function addImage(file) {
    const page = book.pages[current] || book.pages[0];
    try {
      const src = await shrink(file, 1600, 0.85);
      const img = new Image();
      await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = src; });
      const w = Math.min(page.w * 0.6, img.width), h = w * (img.height / img.width);
      const it = { id: uid(), type: "image", x: (page.w - w) / 2, y: 140, w, h, src };
      updatePage(page.id, (p) => ({ ...p, items: [...p.items, it] }));
      setTool("select");
      setSel({ pageId: page.id, itemId: it.id });
    } catch {
      alert("That picture could not be added.");
    }
  }

  // What the lasso bar does to everything selected.
  function groupDelete() {
    if (!group) return;
    updatePage(group.pageId, (p) => ({ ...p, items: p.items.filter((i) => !group.ids.includes(i.id)) }));
    setGroup(null); setSel(null);
  }
  function groupDuplicate() {
    if (!group) return;
    const page = pageOf(group.pageId);
    const copies = page.items.filter((i) => group.ids.includes(i.id)).map((i) => ({ ...moveItem(i, 24, 24), id: uid() }));
    updatePage(group.pageId, (p) => ({ ...p, items: [...p.items, ...copies] }));
    setGroup({ pageId: group.pageId, ids: copies.map((c) => c.id) });
  }
  function groupColor(c) {
    if (!group) return;
    updatePage(group.pageId, (p) => ({ ...p, items: p.items.map((i) => (group.ids.includes(i.id) && i.type !== "image" && i.tool !== "highlighter" ? (() => { const { d, ...rest } = i; return { ...rest, color: c }; })() : i)) }));
  }

  // A text box of words from elsewhere, dropped near the top of this page.
  function addText(text) {
    const t = String(text || "").trim().slice(0, 1200);
    if (!t) return;
    const page = book.pages[current] || book.pages[0];
    const it = { id: uid(), type: "text", x: 60, y: 140, w: 660, h: 80, text: t, font: "sans", fontSize: 18, color: "#1b1d26", tilt: 0 };
    updatePage(page.id, (p) => ({ ...p, items: [...p.items, it] }));
    setSel({ pageId: page.id, itemId: it.id });
  }

  function addPage(after = current, template, ready) {
    const ref = book.pages[after] || book.pages[book.pages.length - 1];
    const made = ready || [newPage(template || ref?.template || book.template, ref?.paper || book.paper)];
    const pg = made[0];
    const pages = [...book.pages];
    pages.splice(after + 1, 0, ...made);
    commit({ ...book, pages });
    setTimeout(() => pagesRef.current?.querySelectorAll(".nb-page")[after + 1]?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }
  function duplicatePage(i) {
    const src = book.pages[i];
    const copy = { ...src, id: uid(), items: src.items.map((it) => ({ ...it, id: uid() })) };
    const pages = [...book.pages];
    pages.splice(i + 1, 0, copy);
    commit({ ...book, pages });
  }
  function movePage(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= book.pages.length) return;
    const pages = [...book.pages];
    [pages[i], pages[j]] = [pages[j], pages[i]];
    commit({ ...book, pages });
    setTimeout(() => pagesRef.current?.querySelectorAll(".nb-page")[j]?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }
  function removePage(i) {
    if (book.pages.length === 1) return;
    commit({ ...book, pages: book.pages.filter((_, n) => n !== i) });
  }
  function setPageTemplate(t) {
    const page = book.pages[current];
    updatePage(page.id, (p) => ({ ...p, template: t }));
  }
  function setPagePaper(pp) {
    const page = book.pages[current];
    updatePage(page.id, (p) => ({ ...p, paper: pp }));
  }

  // The page in view as a picture, for Dwiddle to read the handwriting, plus
  // whatever was typed, which needs no reading at all.
  async function pageForDwiddle() {
    const page = book.pages[current];
    const typed = page.items.filter((i) => i.type === "text" && i.text.trim()).map((i) => i.text.trim()).join("\n");
    const drawn = page.items.some((i) => i.type !== "text") || page.bg;
    let read = "";
    if (drawn) {
      const svg = pagesRef.current.querySelectorAll(".nb-page svg")[current].cloneNode(true);
      svg.querySelectorAll("foreignObject").forEach((f) => f.remove());
      svg.setAttribute("width", page.w); svg.setAttribute("height", page.h);
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = url; });
      const c = document.createElement("canvas");
      const k = 1400 / page.w;
      c.width = page.w * k; c.height = page.h * k;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const r = await readImage(c.toDataURL("image/jpeg", 0.88));
      read = r.text || "";
    }
    return [typed, read].filter(Boolean).join("\n\n").trim();
  }

  async function dwiddle(action) {
    setBusy(action === "questions" ? "Reading the page" : "Reading the page");
    try {
      const text = await pageForDwiddle();
      if (!text) { alert("There is nothing on this page for Dwiddle to read yet."); return; }
      if (action === "questions") {
        sessionStorage.setItem("dwiddle-handoff-notes", text);
        go("upload");
      } else {
        openDwiddle(`A page from the student's notebook "${book.title}", page ${current + 1}. What is written on it:\n${text}`,
          { ask: "Can you explain what's on this page, and tell me if anything looks wrong?" });
      }
    } catch (err) {
      alert(err.message || "Dwiddle could not read this page just now.");
    } finally {
      setBusy("");
    }
  }

  const selected = sel && pageOf(sel.pageId)?.items.find((i) => i.id === sel.itemId);
  const colors = tool === "highlighter" ? HIGHLIGHTS : tool === "revealer" ? COVERS_INK : INKS;
  const color = tool === "highlighter" ? hl : tool === "revealer" ? cov : ink;
  const setColor = (c) => {
    if (tool === "highlighter") setHl(c); else if (tool === "revealer") setCov(c); else setInk(c);
    if (selected && (selected.type === "text" || selected.type === "shape" || selected.type === "stroke")) {
      updatePage(sel.pageId, (p) => ({ ...p, items: p.items.map((i) => (i.id === selected.id ? { ...i, color: c } : i)) }));
    }
  };

  return (
    <div className="nb" ref={nbRef}>
      <div className="nb-bar">
        <button className="icon-btn" onClick={onClose} aria-label="Back to notebooks" title="Back to notebooks"><Icon name="back" size={18} /></button>
        <input className="nb-title" value={book.title} onChange={(e) => commit({ ...book, title: e.target.value }, { record: false })} aria-label="Notebook name" />
        <div className="nb-group">
          <button className="icon-btn" onClick={undo} disabled={!past.current.length} title="Undo (Ctrl Z)" aria-label="Undo"><Icon name="undo" size={17} /></button>
          <button className="icon-btn" onClick={redo} disabled={!future.current.length} title="Redo" aria-label="Redo"><Icon name="redo" size={17} /></button>
        </div>
        <div className="nb-toolrow">
        <div className="nb-group nb-tools" role="toolbar" aria-label="Tools">
          {TOOLS.map((t) => (
            <button key={t.id} className={"nb-tool" + (tool === t.id ? " on" : "") + (SETTINGS.includes(t.id) ? " has-opts" : "")}
              onClick={() => { if (tool === t.id && SETTINGS.includes(t.id)) setPop((p) => (p ? null : t.id)); else { setTool(t.id); setPop(null); } }}
              title={t.name + (SETTINGS.includes(t.id) ? ". Tap again for size and colour" : "")} aria-label={t.name} aria-pressed={tool === t.id}>
              {t.id === "pen" || t.id === "highlighter" || t.id === "revealer"
                ? <ToolTip tool={t.id} color={t.id === "pen" ? ink : t.id === "highlighter" ? hl : cov} />
                : <Icon name={t.icon} size={18} />}
            </button>
          ))}
          <label className="nb-tool nb-extra" title="Add a picture" aria-label="Add a picture">
            <input ref={imgInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) addImage(f); }} />
            <Icon name="image" size={18} />
          </label>
          <button className={"nb-tool nb-extra" + (split ? " on" : "")} title="Split screen: search and browse beside your notes" aria-label="Split screen" aria-pressed={split}
            onClick={() => setSplit((v) => !v)}>
            <Icon name="split" size={18} />
          </button>
          <button className={"nb-tool nb-extra" + (video !== null ? " on" : "")} title="Watch a video or listen to a recording while you write" aria-label="Watch or listen while you write"
            onClick={() => setVideo((v) => (v === null ? "" : null))}>
            <Icon name="video" size={18} />
          </button>
          {/* On a phone the rarer tools live in here, so every tool you
              write with fits on one row without scrolling. */}
          <button className={"nb-tool nb-morebtn" + (more ? " on" : "")} aria-label="More tools" aria-expanded={more} title="More tools"
            onClick={() => setMore((v) => !v)}>
            <Icon name="more" size={18} />
          </button>
        </div>
        <button className={"nb-tool nb-extra" + (ruler ? " on" : "")} title="Ruler: lay it on the page, draw along its edge for a straight line"
          aria-label="Ruler" aria-pressed={!!ruler}
          onClick={() => setRuler((r) => (r ? null : { pageId: book.pages[current]?.id, x: 110, y: 420, angle: 0, len: 560 }))}>
          <Icon name="ruler" size={18} />
        </button>
        <button className={"nb-tool nb-extra" + (prot ? " on" : "")} title="Protractor: measure angles, draw along its curve or base"
          aria-label="Protractor" aria-pressed={!!prot}
          onClick={() => setProt((p) => (p ? null : { pageId: book.pages[current]?.id, x: 400, y: 620, angle: 0, r: 190 }))}>
          <Icon name="protractor" size={18} />
        </button>
        <button className={"nb-pill nb-drawwith nb-extra" + (prefs.finger === false ? " on" : "")} onClick={() => setPrefs((o) => ({ ...o, finger: o.finger === false }))}
          title={prefs.finger === false ? "Only an Apple Pencil or stylus writes. Fingers scroll." : "Fingers and pens both write. Tap for Pencil only."}>
          {prefs.finger === false ? "✏️ Pencil only" : "☝️ Finger + pen"}
        </button>
        {(prefs.pens || []).length > 0 && (
          <div className="nb-group nb-case nb-extra" aria-label="Pencil case">
            {prefs.pens.map((pn) => {
              const on = tool === pn.tool && (pn.tool === "highlighter" ? hl : pn.tool === "revealer" ? cov : ink) === pn.color && size === pn.size
                && (pn.tool !== "pen" || prefs.style === pn.style);
              return (
                <button key={pn.id} className={"nb-casepen" + (on ? " on" : "")} onClick={() => pickPen(pn)}
                  title={`${pn.tool === "pen" ? (PEN_STYLES.find((x) => x.id === pn.style)?.name || "Pen") : pn.tool === "highlighter" ? "Highlighter" : "Revealer"}, size ${pn.size}`}>
                  <ToolTip tool={pn.tool} color={pn.color} />
                </button>
              );
            })}
          </div>
        )}
        <div className={"nb-group nb-colors" + (tool === "hand" || tool === "select" || tool === "compass" ? " nb-idle" : "")}>
          {colors.map((c) => (
            <button key={c} className={"nb-color" + (color === c ? " on" : "")} style={{ background: c }} onClick={() => setColor(c)} aria-label="Colour" />
          ))}
          <label className="nb-color nb-custom" title="Any colour">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
        {(tool === "pen" || tool === "highlighter" || tool === "revealer" || tool === "eraser") && (
          <div className="nb-group nb-size">
            {[2, 4, 7].map((s) => (
              <button key={s} className={"nb-dot" + (size === s ? " on" : "")} onClick={() => setSize(s)} aria-label={`Size ${s}`} title="Tap the tool again for any size">
                <i style={{ width: Math.min(22, 3 + s * (tool === "pen" ? 1.6 : 2.4)), height: Math.min(22, 3 + s * (tool === "pen" ? 1.6 : 2.4)) }} />
              </button>
            ))}
          </div>
        )}
        {tool === "shape" && (
          <div className="nb-group">
            {[["line", "Line"], ["arrow", "Arrow"], ["rect", "Box"], ["ellipse", "Circle"]].map(([k, n]) => (
              <button key={k} className={"nb-pill" + (shapeKind === k ? " on" : "")} onClick={() => setShapeKind(k)}>{n}</button>
            ))}
          </div>
        )}
        {/* Only while the text tool is picked, so selecting something never
            reflows the toolbar and shifts the page under your finger. */}
        {tool === "text" && (
          <div className="nb-group">
            {(() => { const cf = fontOf(selected?.type === "text" ? selected.font : font); return (
              <button className="nb-pill nb-fontbtn" onClick={() => setFontPop(true)} aria-label="Font" style={{ fontFamily: cf.css }}>{cf.name} ▾</button>
            ); })()}
            <input ref={fontInput} type="file" accept=".ttf,.otf,.woff,.woff2,font/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importFont(f); }} />
            {selected?.type === "text" && (
              <select className="nb-font" value={selected.fontSize} aria-label="Text size"
                onChange={(e) => updatePage(sel.pageId, (p) => ({ ...p, items: p.items.map((i) => (i.id === selected.id ? { ...i, fontSize: Number(e.target.value) } : i)) }))}>
                {[16, 20, 22, 26, 32, 40, 52].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
        )}
        </div>
        <div className="nb-spacer" />
        <button className={"nb-pill nb-pagebtn" + (pageMenu ? " on" : "")} onClick={() => setPageMenu((v) => !v)} aria-expanded={pageMenu} title="Page: paper, add, remove, print">
          <Icon name="pagesadd" size={15} /> {current + 1} / {book.pages.length}
        </button>
        <div className="nb-group nb-zoom">
          <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))} aria-label="Zoom out">−</button>
          <button className="nb-pill" onClick={fit} title="Fit to width">{Math.round(zoom * 100)}%</button>
          <button className="icon-btn" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))} aria-label="Zoom in">+</button>
          <FullscreenButton />
        </div>
        <div className="nb-group">
          <button className="btn small ghost nb-ask" onClick={() => dwiddle("ask")} disabled={!!busy}><DuckMark size={16} /> <span className="nb-lbl">Ask</span></button>
          <button className="btn small ghost nb-ask" onClick={() => dwiddle("questions")} disabled={!!busy} title="Turn this page into practice questions">
            {busy ? <Loading label={busy} /> : <><Icon name="quiz" size={14} /> <span className="nb-lbl">Questions</span></>}
          </button>
        </div>
      </div>

      <div ref={ring} className="nb-ring" aria-hidden="true" />
      {more && (
        <>
          <div className="nb-pop-scrim" onPointerDown={() => setMore(false)} />
          <div className="nb-menu nb-moremenu" role="menu" onClick={() => setMore(false)}>
            <button onClick={() => imgInput.current?.click()}><span><Icon name="image" size={16} /> Add a picture</span></button>
            <button className={split ? "on" : ""} onClick={() => setSplit((v) => !v)}><span><Icon name="split" size={16} /> Split screen</span>{split && "✓"}</button>
            <button className={video !== null ? "on" : ""} onClick={() => setVideo((v) => (v === null ? "" : null))}><span><Icon name="video" size={16} /> Video or audio</span>{video !== null && "✓"}</button>
            <button className={ruler ? "on" : ""} onClick={() => setRuler((r) => (r ? null : { pageId: book.pages[current]?.id, x: 110, y: 420, angle: 0, len: 560 }))}><span><Icon name="ruler" size={16} /> Ruler</span>{ruler && "✓"}</button>
            <button className={prot ? "on" : ""} onClick={() => setProt((p) => (p ? null : { pageId: book.pages[current]?.id, x: 400, y: 620, angle: 0, r: 190 }))}><span><Icon name="protractor" size={16} /> Protractor</span>{prot && "✓"}</button>
            <button onClick={() => setPrefs((o) => ({ ...o, finger: o.finger === false }))}>
              <span>{prefs.finger === false ? "✏️ Pencil only" : "☝️ Finger + pen"}</span><small className="muted">change</small>
            </button>
          </div>
        </>
      )}
      {fontPop && <FontPop current={selected?.type === "text" ? selected.font : font} custom={customFonts}
        onPick={(id) => {
          setFont(id);
          const target = editingText || (selected?.type === "text" ? selected.id : null);
          if (target) book.pages.forEach((pg) => { if (pg.items.some((i) => i.id === target)) updatePage(pg.id, (p) => ({ ...p, items: p.items.map((i) => (i.id === target ? { ...i, font: id } : i)) })); });
          setFontPop(false);
        }}
        onImport={() => { setFontPop(false); fontInput.current?.click(); }} onClose={() => setFontPop(false)} />}
      {thumbMenu && (
        <>
          <div className="nb-pop-scrim" onPointerDown={() => setThumbMenu(null)} />
          <div className="nb-menu nb-thumbmenu" style={{ top: thumbMenu.top }} role="menu">
            <b className="small">Page {thumbMenu.i + 1}</b>
            <button onClick={() => { addPage(thumbMenu.i); setThumbMenu(null); }}>New page after</button>
            <button onClick={() => { duplicatePage(thumbMenu.i); setThumbMenu(null); }}>Duplicate</button>
            <button disabled={thumbMenu.i === 0} onClick={() => { movePage(thumbMenu.i, -1); setThumbMenu(null); }}>Move up</button>
            <button disabled={thumbMenu.i === book.pages.length - 1} onClick={() => { movePage(thumbMenu.i, 1); setThumbMenu(null); }}>Move down</button>
            <button onClick={() => { setThumbMenu(null); setPageMenu(true); }}>Paper and colour</button>
            <button className="danger" disabled={book.pages.length === 1} onClick={() => { if (window.confirm(`Delete page ${thumbMenu.i + 1}?`)) removePage(thumbMenu.i); setThumbMenu(null); }}>Delete page</button>
          </div>
        </>
      )}
      {pageMenu && (
        <>
          <div className="nb-pop-scrim" onPointerDown={() => { setPageMenu(false); setAdding(false); }} />
          <div className="nb-pop nb-pagemenu" role="dialog" aria-label="Page">
            <div className="nb-pop-head"><b>Page {current + 1} of {book.pages.length}</b><button className="icon-btn" onClick={() => { setPageMenu(false); setAdding(false); }} aria-label="Close"><Icon name="close" size={15} /></button></div>
            <label className="nb-pm-row"><span>Paper</span>            <select value={book.pages[current]?.template} onChange={(e) => setPageTemplate(e.target.value)} aria-label="Page paper">
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select></label>
            <div className="nb-pm-row"><span>Colour</span><div className="nb-swatches small">{PAPERS.map((pp) => (
              <button key={pp.id} className={book.pages[current]?.paper === pp.id ? "on" : ""} style={{ background: pp.bg }} onClick={() => setPagePaper(pp.id)} aria-label={pp.name} title={pp.name} />
            ))}</div></div>
            <div className="nb-addwrap">
              <button className="btn ghost small nb-pm-add" onClick={() => setAdding((v) => !v)} aria-expanded={adding}><Icon name="pagesadd" size={14} /> Add page</button>
              {adding && (
                <div className="nb-addmenu">
                  <span className="qv-label">Paper</span>
                  <div className="nb-addpapers">
                    {TEMPLATES.map((t) => (
                      <button key={t.id} className="nb-paper" onClick={() => { addPage(current, t.id); setAdding(false); setPageMenu(false); }}>
                        <PagePreview page={{ ...newPage(t.id, book.pages[current]?.paper || "white"), id: "a-" + t.id }} />
                        <span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="nb-addmore">
                    <label className="btn ghost small"><input type="file" accept="image/*" hidden onChange={async (e) => {
                      const f = e.target.files?.[0]; e.target.value = ""; setAdding(false);
                      if (f) { try { addPage(current, null, [await imagePage(f)]); } catch { alert("That picture could not be added."); } }
                    }} /><Icon name="image" size={14} /> A picture as a page</label>
                    <label className="btn ghost small"><input type="file" accept="application/pdf,.pdf" hidden onChange={async (e) => {
                      const f = e.target.files?.[0]; e.target.value = ""; setAdding(false);
                      if (f) { setBusy("Adding the PDF"); try { addPage(current, null, await pdfPages(f)); } catch { alert("That PDF could not be added."); } finally { setBusy(""); } }
                    }} /><Icon name="file" size={14} /> Pages from a PDF</label>
                  </div>
                </div>
              )}
            </div>
            <div className="nb-pm-row nb-pm-actions">
            <button className="btn quiet small" onClick={() => { removePage(current); setPageMenu(false); }} disabled={book.pages.length === 1}><Icon name="trash" size={13} /> <span className="nb-lbl">Remove page</span></button>
            <button className="btn quiet small" onClick={() => window.print()}><Icon name="sheet" size={13} /> <span className="nb-lbl">Print or PDF</span></button>
            </div>
          </div>
        </>
      )}

      {tool === "compass" && <div className="nb-hint">{compass ? "Press away from the red point and draw round it. Drag the point to move it." : "Tap where the compass point goes."}</div>}
      {debug && <pre className="nb-debug">{`tool ${tool}\n` + debug.join("\n")}</pre>}
      {pop && tool === pop && (
        <ToolPop tool={tool} prefs={prefs} setPrefs={setPrefs} size={size} setSize={setSize} savePen={savePen} removePen={removePen}
          colors={colors} color={color} setColor={setColor} shapeKind={shapeKind} setShapeKind={setShapeKind}
          onShowAll={() => setShown(new Set(book.pages.flatMap((p) => p.items.filter((i) => i.tool === "revealer").map((i) => i.id))))}
          onHideAll={() => setShown(new Set())}
          onClearPage={() => updatePage(book.pages[current].id, (p) => ({ ...p, items: [] }))}
          onClose={() => setPop(null)} />
      )}
      {video !== null && <VideoFloat id={video} onId={setVideo} onClose={() => setVideo(null)} />}
      <div className="nb-work">
        <aside className="nb-thumbs" aria-label="Pages">
          {book.pages.map((p, i) => (
            <button key={p.id} className={"nb-thumb" + (i === current ? " on" : "")}
              onClick={(e) => {
                if (i === current) { const r = e.currentTarget.getBoundingClientRect(); setThumbMenu({ i, top: Math.min(r.top, innerHeight - 330) }); return; }
                pagesRef.current?.querySelectorAll(".nb-page")[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
              }} title={i === current ? "Page options" : `Go to page ${i + 1}`}>
              <svg viewBox={`0 0 ${p.w} ${p.h}`}><Paper page={p} />{p.items.map((it) => <Item key={it.id} it={it} />)}</svg>
              <span>{i + 1}</span>
            </button>
          ))}
          <button className="nb-thumb nb-thumb-add" onClick={() => addPage(book.pages.length - 1)} aria-label="Add a page"><Icon name="plus" size={18} /></button>
        </aside>

        <div className={"nb-pages" + (tool === "hand" ? " hand" : "") + (prefs.finger === false && DRAWING_TOOLS.includes(tool) ? " pencil-only" : "")} ref={pagesArea}
          onDragOver={(e) => { if ([...e.dataTransfer.types].some((t) => t === "Files" || t === "text/uri-list")) e.preventDefault(); }}
          onDrop={async (e) => {
            e.preventDefault();
            const f = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/"));
            if (f) { addImage(f); return; }
            const url = (e.dataTransfer.getData("text/uri-list") || "").split("\n")[0].trim();
            if (url) { try { addImage(await imageFile(url)); } catch { alert("That picture could not be added. Try copying it and pasting instead."); } }
          }}>
          {book.pages.map((page, i) => (
            <div key={page.id} className={"nb-page" + (editingText && page.items.some((it) => it.id === editingText) ? " typing" : "")} data-index={i} style={{ width: page.w * zoom, height: page.h * zoom }}>
              <svg viewBox={`0 0 ${page.w} ${page.h}`} width={page.w * zoom} height={page.h * zoom}
                className={"nb-svg tool-" + tool}
                onPointerDown={(e) => down(e, page)} onPointerMove={(e) => move(e, page)}
                onPointerUp={up} onPointerCancel={up} onPointerLeave={(e) => {
                  if (ring.current) ring.current.style.display = "none";
                  // Only a mouse can leave mid stroke; a finger or Pencil is held by the page
                  // until it lifts, and Safari reports a "leave" the moment it is held.
                  if (e.pointerType === "mouse" && e.buttons === 0) up(e);
                  else log("pointerleave (ignored)", e);
                }}>
                <Paper page={page} />
                {page.items.map((it) => (
                  <Item key={it.id} it={it} editing={editingText === it.id} shown={shown.has(it.id)} />
                ))}
                {live?.pageId === page.id && <Item it={live.item} />}
                {ruler?.pageId === page.id && <Ruler r={ruler} />}
                {prot?.pageId === page.id && <Protractor p={prot} />}
                {compass?.pageId === page.id && tool === "compass" && (
                  <g className="nb-compass" pointerEvents="none">
                    <circle cx={compass.x} cy={compass.y} r="5" fill="#e5484d" />
                    <circle cx={compass.x} cy={compass.y} r="12" fill="none" stroke="#e5484d" strokeWidth="1.5" strokeDasharray="3 3" />
                  </g>
                )}

                {lassoOn === page.id && <path ref={lassoPath} fill="rgba(59, 91, 253, 0.06)" stroke="#3B5BFD" strokeWidth={1.5 / zoom} strokeDasharray={`${6 / zoom} ${5 / zoom}`} />}
                {group?.pageId === page.id && (() => {
                  const b = unionBox(page.items.filter((i) => group.ids.includes(i.id)));
                  if (!b) return null;
                  const u = 1 / zoom;
                  return <g className="nb-sel">
                    <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={4 * u} fill="rgba(59, 91, 253, 0.04)" stroke="#3B5BFD" strokeWidth={1.5 * u} strokeDasharray={`${6 * u} ${4 * u}`} />
                    <circle cx={b.x + b.w} cy={b.y + b.h} r={9 * u} fill="#fff" stroke="#3B5BFD" strokeWidth={2 * u} />
                  </g>;
                })()}
              </svg>
              {(() => {
                const ed = editingText && page.items.find((i) => i.id === editingText && i.type === "text");
                if (!ed) return null;
                const set = (ch) => updatePage(page.id, (p) => ({ ...p, items: p.items.map((x) => (x.id === ed.id ? { ...x, ...ch } : x)) }));
                return (
                  <>
                    <FitBar className="nb-textbar" x={ed.x * zoom} y={Math.max(4, ed.y * zoom - 50)}>
                      <span className="nb-textgrip" aria-label="Drag to move the text box" title="Drag to move"
                        onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine */ } moveDrag.current = { x: e.clientX, y: e.clientY, ox: ed.x, oy: ed.y }; }}
                        onPointerMove={(e) => { const d = moveDrag.current; if (d) set({ x: d.ox + (e.clientX - d.x) / zoom, y: d.oy + (e.clientY - d.y) / zoom }); }}
                        onPointerUp={() => { moveDrag.current = null; }}>✥</span>
                      <button onClick={() => { setEditingText(null); setSel(null); }}>Done</button>
                      <button onClick={() => setFontPop(true)} style={{ fontFamily: fontOf(ed.font).css }}>{fontOf(ed.font).name}</button>
                      <button onClick={() => set({ fontSize: Math.max(10, ed.fontSize - 2) })} aria-label="Smaller text">A−</button>
                      <button onClick={() => set({ fontSize: Math.min(96, ed.fontSize + 2) })} aria-label="Bigger text">A+</button>
                      <button className="danger" onClick={() => { updatePage(page.id, (p) => ({ ...p, items: p.items.filter((x) => x.id !== ed.id) })); setEditingText(null); setSel(null); }}>Delete</button>
                    </FitBar>
                    <TextEditor it={ed} zoom={zoom}
                      onText={(text, hPx) => updatePage(page.id, (p) => ({ ...p, items: p.items.map((x) => (x.id === ed.id ? { ...x, text, h: Math.max(40, hPx / zoom + 8) } : x)) }), { record: false })} />
                    <div className="nb-textwidth" style={{ left: (ed.x + ed.w) * zoom - 8, top: ed.y * zoom, height: Math.max(40, ed.h || 40) * zoom }}
                      aria-label="Drag to change the width" title="Drag to change the width"
                      onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine */ } widthDrag.current = { x: e.clientX, w: ed.w }; }}
                      onPointerMove={(e) => { const d = widthDrag.current; if (d) set({ w: Math.max(60, d.w + (e.clientX - d.x) / zoom) }); }}
                      onPointerUp={() => { widthDrag.current = null; }} />
                  </>
                );
              })()}
              {cropping && page.items.some((i) => i.id === cropping) && (
                <CropBox it={page.items.find((i) => i.id === cropping)} zoom={zoom} onCancel={() => setCropping(null)}
                  onDone={(next) => { updatePage(page.id, (p) => ({ ...p, items: p.items.map((i) => (i.id === next.id ? next : i)) })); setCropping(null); }} />
              )}
              {group?.pageId === page.id && !cropping && (() => {
                const b = unionBox(page.items.filter((i) => group.ids.includes(i.id)));
                if (!b) return null;
                return (
                  <FitBar className="nb-lassobar" x={b.x * zoom} y={Math.max(4, b.y * zoom - 50)}>
                    {group.ids.length === 1 && page.items.find((i) => i.id === group.ids[0])?.type === "text" && (
                      <button onClick={() => { const id = group.ids[0]; setGroup(null); setEditingText(id); setSel({ pageId: page.id, itemId: id }); }}>Edit text</button>
                    )}
                    {group.ids.length === 1 && page.items.find((i) => i.id === group.ids[0])?.type === "image" && (
                      <button onClick={() => setCropping(group.ids[0])}>Crop</button>
                    )}
                    <button onClick={groupDuplicate}>Duplicate</button>
                    {page.items.some((i) => group.ids.includes(i.id) && i.type !== "image") &&
                      INKS.slice(0, 5).map((c) => <button key={c} className="nb-lassocolor" style={{ background: c }} onClick={() => groupColor(c)} aria-label="Colour" />)}
                    <button className="danger" onClick={groupDelete}>Delete</button>
                  </FitBar>
                );
              })()}
              {wetPage === page.id && (
                <canvas key={zoom} ref={wetCanvas} data-w={page.w} className="nb-wet" aria-hidden="true" style={{ opacity: liveOn?.tool === "highlighter" ? 0.38 : 1 }} />
              )}
            </div>
          ))}
          <button className="nb-add-end" onClick={() => addPage(book.pages.length - 1)}><Icon name="plus" size={15} /> Add a page</button>
        </div>
        {split && <SplitPanel onClose={() => setSplit(false)} onAddImage={addImage} onAddText={addText} />}
      </div>

      {/* What prints: every page, one to a sheet. */}
      <div className="nb-print" aria-hidden="true">
        {book.pages.map((page) => (
          <svg key={page.id} viewBox={`0 0 ${page.w} ${page.h}`}><Paper page={page} />{page.items.map((it) => <Item key={it.id} it={it} />)}</svg>
        ))}
      </div>
    </div>
  );
}
