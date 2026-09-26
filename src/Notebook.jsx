// Notebooks: write by hand, type, drop in pictures and PDFs, on paper of your
// choosing, and then have Dwiddle turn a page into notes and questions.
//
// Each page is an SVG in page units (A4 at 96 dpi), drawn over its paper
// template, so ink stays sharp at any zoom and a page can be turned into an
// image for Dwiddle to read. Ink uses perfect-freehand, which shapes a stroke
// from the pen's pressure the way a real nib spreads, and a pen being used
// switches touch to scrolling, so a resting palm does not draw.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  return d.map((n) => (typeof n === "number" ? Math.round(n * 10) / 10 : n)).join(" ");
}

// Pens write like three real ones: a ballpoint's even line, a fountain
// pen's swell with pressure and speed, a brush's thick-to-thin.
const PEN_STYLES = [
  { id: "ball", name: "Ballpoint", thinning: 0.12, taper: 0 },
  { id: "fountain", name: "Fountain", thinning: 0.55, taper: 8 },
  { id: "brush", name: "Brush", thinning: 0.8, taper: 22 },
];

function inkPath(item) {
  const hl = item.tool === "highlighter" || item.tool === "revealer";
  // A round highlighter has round ends, a flat one square ends like a chisel tip.
  const round = hl && item.tip !== "flat";
  const pen = PEN_STYLES.find((p) => p.id === item.style) || PEN_STYLES[1];
  // Stability 1 follows the pen exactly (handwriting); 10 irons out every
  // wobble (graphs and diagrams). Strokes from before the setting are 4.
  const st = Math.max(1, Math.min(10, item.stab ?? 4));
  return pathFrom(getStroke(item.points, {
    size: item.size,
    thinning: hl ? 0 : pen.thinning,
    smoothing: 0.35 + st * 0.05,
    streamline: item.straight ? 0 : 0.06 + (st - 1) * 0.09,
    last: true,
    simulatePressure: !item.pressure && !hl,
    start: { cap: !hl || round, taper: hl ? 0 : pen.taper * 0.7 },
    end: { cap: !hl || round, taper: hl ? 0 : pen.taper },
  }));
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
function useFont(f) {
  useEffect(() => {
    if (f.load && !loadedFonts.has(f.id)) { loadedFonts.add(f.id); f.load().catch(() => loadedFonts.delete(f.id)); }
  }, [f]);
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
        return <span key={i} style={{ display: "inline-block", transform: `translateY(${dy}em) rotate(${r}deg) scale(${sc})` }}>{ch}</span>;
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
function moveItem(it, dx, dy) {
  if (it.type === "stroke") return { ...it, points: it.points.map(([x, y, p]) => [x + dx, y + dy, p]) };
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
    return <path d={it.d || inkPath(it)} fill={it.color} opacity={shown ? 0.16 : 1} className="nb-cover-ink" />;
  }
  if (it.type === "stroke") {
    return <path d={it.d || inkPath(it)} fill={it.color} opacity={it.tool === "highlighter" ? 0.38 : 1}
      style={it.tool === "highlighter" ? { mixBlendMode: "multiply" } : undefined} />;
  }
  if (it.type === "shape") return <Shape it={it} />;
  if (it.type === "image") return <image href={it.src} x={it.x} y={it.y} width={it.w} height={it.h} preserveAspectRatio="xMidYMid meet" />;
  if (it.type === "text") {
    const f = fontOf(it.font);
    return (
      <foreignObject x={it.x} y={it.y} width={it.w} height={Math.max(it.h || 60, 40)} style={{ overflow: "visible" }}>
        <TextBox it={it} f={f} editing={editing} onText={onText} />
      </foreignObject>
    );
  }
  return null;
}

// While being typed into, the box keeps its own contents, so the caret does
// not jump back to the start each time the page saves what was typed.
function TextBox({ it, f, editing, onText }) {
  const el = useRef(null);
  useFont(f);
  useEffect(() => {
    if (!editing || !el.current) return;
    el.current.innerText = it.text || "";
    el.current.focus();
    const r = document.createRange();
    r.selectNodeContents(el.current);
    r.collapse(false);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  }, [editing]);
  const style = { fontFamily: f.css, fontSize: it.fontSize * f.scale, color: it.color, lineHeight: 1.35,
    transform: f.id !== "sans" && f.id !== "serif" ? `rotate(${it.tilt || 0}deg)` : undefined };
  if (editing) {
    return <div ref={el} className="nb-text editing" contentEditable suppressContentEditableWarning style={style}
      onInput={(e) => onText?.(e.currentTarget.innerText, e.currentTarget.scrollHeight)}
      onPointerDown={(e) => e.stopPropagation()} />;
  }
  return <div className="nb-text" style={style}>{f.hand && it.wobble !== false ? <HandText text={it.text} seed={it.id} /> : (it.text || " ")}</div>;
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
            <div className="seg tight nb-pop-seg">
              <button className={prefs.tip !== "flat" ? "on" : ""} onClick={() => setPrefs((o) => ({ ...o, tip: "round" }))}>Round tip</button>
              <button className={prefs.tip === "flat" ? "on" : ""} onClick={() => setPrefs((o) => ({ ...o, tip: "flat" }))}>Flat tip</button>
            </div>
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
            <p className="small muted">Rubs out whole strokes it touches. The circle on the page shows how big it is.</p>
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

// A YouTube video floating over the notebook, to take notes while it plays.
// Drag it by its bar; it stays where it is left.
function VideoFloat({ id, onId, onClose }) {
  const [link, setLink] = useState("");
  const [pos, setPos] = useState(() => ({ x: Math.max(16, innerWidth - 460), y: 120 }));
  const drag = useRef(null);
  const [bad, setBad] = useState(false);
  const submit = () => {
    const m = link.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/) || link.trim().match(/^([\w-]{11})$/);
    if (m) onId(m[1]); else setBad(true);
  };
  return (
    <div className="nb-video" style={{ left: pos.x, top: pos.y }}>
      <div className="nb-video-bar"
        onPointerDown={(e) => { if (e.target.closest("button")) return; drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } }}
        onPointerMove={(e) => { if (drag.current) setPos({ x: Math.max(0, Math.min(innerWidth - 120, e.clientX - drag.current.dx)), y: Math.max(0, Math.min(innerHeight - 60, e.clientY - drag.current.dy)) }); }}
        onPointerUp={() => { drag.current = null; }}>
        <Icon name="video" size={15} /><b>Video</b>
        {id && <button className="nb-pill" onClick={() => onId("")}>Change</button>}
        <button className="icon-btn" onClick={onClose} aria-label="Close the video"><Icon name="close" size={15} /></button>
      </div>
      {id ? (
        <iframe title="Video" src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" />
      ) : (
        <form className="nb-video-ask" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <p className="small muted">Paste a YouTube link to watch it here while you write.</p>
          <div className="nb-video-row">
            <input autoFocus value={link} onChange={(e) => { setLink(e.target.value); setBad(false); }} placeholder="https://youtu.be/..." />
            <button className="btn cta small" type="submit">Play</button>
          </div>
          {bad && <p className="small" style={{ color: "var(--warn)" }}>That does not look like a YouTube link.</p>}
        </form>
      )}
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
  { id: "select", icon: "select", name: "Select and move" },
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
      stab: { pen: 2, highlighter: 5, revealer: 5 }, refine: true, finger: true,
      // The pencil case: favourite pens, one tap away.
      pens: [
        { id: "p1", tool: "pen", color: "#1b1d26", size: 2.5, style: "fountain", stab: 2 },
        { id: "p2", tool: "pen", color: "#3B5BFD", size: 2, style: "ball", stab: 2 },
        { id: "p3", tool: "pen", color: "#e5484d", size: 2, style: "ball", stab: 2 },
        { id: "p4", tool: "highlighter", color: "#ffe066", size: 3, tip: "round", stab: 5 },
        { id: "p5", tool: "highlighter", color: "#a7f3d0", size: 3, tip: "flat", stab: 5 },
      ] };
    try { const saved = JSON.parse(localStorage.getItem("dwiddle-nb-tools") || "{}"); return { ...base, ...saved, stab: { ...base.stab, ...(saved.stab || {}) } }; } catch { return base; }
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
  const livePath = useRef(null);
  const [liveOn, setLiveOn] = useState(null); // { pageId, color, tool } while a stroke is drawn
  const frame = useRef(0);
  const drawLive = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (liveStroke.current && livePath.current) livePath.current.setAttribute("d", inkPath(liveStroke.current));
    });
  };
  const [sel, setSel] = useState(null); // { pageId, itemId }
  const [editingText, setEditingText] = useState(null); // itemId
  const [current, setCurrent] = useState(0); // page index in view
  const [busy, setBusy] = useState("");
  const [cov, setCov] = useState(COVERS_INK[0]);
  const [shown, setShown] = useState(() => new Set()); // revealer strokes tapped open
  const [video, setVideo] = useState(null); // YouTube id playing beside the notes
  const [adding, setAdding] = useState(false); // the add page menu
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
  useEffect(() => { setEditingText(null); if (tool !== "compass") setCompass(null); }, [tool]);

  // Phones and iPads: one finger draws, two fingers scroll, and the hand
  // tool scrolls with one. The browser has to be told not to scroll on its
  // own, which only a non-passive touch listener can do.
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const fingerRef = useRef(true);
  fingerRef.current = prefs.finger !== false;
  const twoFinger = useRef(null); // { x, y } midpoint while two fingers scroll
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
  useEffect(() => {
    const el = pagesRef.current;
    if (!el) return;
    const mid = (t) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
    // Simple rule: with a drawing tool, a finger or a Pencil writes; with the
    // hand tool, it scrolls. Two fingers always scroll.
    const stylus = (e) => [...e.changedTouches].some((t) => t.touchType === "stylus");
    const onStart = (e) => {
      logRef.current("touchstart", e);
      if (toolRef.current === "hand") return; // the browser scrolls
      // "Pencil only": fingers scroll, and only an Apple Pencil writes.
      if (e.target.closest?.(".nb-ruler")) { e.preventDefault(); return; }
      if (!fingerRef.current) { if (stylus(e)) e.preventDefault(); return; }
      if (e.target.closest?.(".nb-text.editing")) return; // placing the caret in text being typed
      if (e.touches.length >= 2) {
        twoFinger.current = mid(e.touches);
        setLive(null);
        liveStroke.current = null;
        setLiveOn(null);
        drag.current = null;
        e.preventDefault();
        return;
      }
      if (e.target.closest?.(".nb-svg")) e.preventDefault();
    };
    const onMove = (e) => {
      if (toolRef.current === "hand") return;
      if (!fingerRef.current) { if (stylus(e)) e.preventDefault(); return; }
      if (e.target.closest?.(".nb-text.editing")) return;
      if (twoFinger.current && e.touches.length >= 2) {
        const m = mid(e.touches);
        el.scrollBy(twoFinger.current.x - m.x, twoFinger.current.y - m.y);
        twoFinger.current = m;
        e.preventDefault();
        return;
      }
      if (e.target.closest?.(".nb-svg")) e.preventDefault();
    };
    const onEnd = (e) => {
      logRef.current("touchend", e);
      if (e.touches.length === 0) twoFinger.current = null;
      // iPhones and iPads only bring up the keyboard when focus happens
      // during the tap itself, so a new text box is focused here.
      if (toolRef.current === "text") {
        const box = el.querySelector(".nb-text.editing");
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
      else if ((e.key === "Backspace" || e.key === "Delete") && sel) {
        updatePage(sel.pageId, (p) => ({ ...p, items: p.items.filter((i) => i.id !== sel.itemId) }));
        setSel(null);
      } else if (!mod) {
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
    // Pencil only: a finger scrolls, though it can still move the ruler.
    if (e.pointerType === "touch" && prefs.finger === false && !e.target.closest?.(".nb-ruler")) return;
    // With the hand tool a mouse drags the pages around; fingers scroll natively.
    if (tool === "hand") {
      if (e.pointerType === "mouse") { drag.current = { pan: { x: e.clientX, y: e.clientY } }; capture(e.currentTarget, e); }
      return;
    }
    const svg = e.currentTarget;
    const [x, y] = toPage(e, svg, page);
    const pressure = e.pointerType === "pen" ? e.pressure || 0.5 : 0.5;

    if (tool === "text") {
      const hit = page.items.find((i) => i.type === "text" && x >= i.x && x <= i.x + i.w && y >= i.y && y <= i.y + (i.h || 40));
      if (hit) { setEditingText(hit.id); setSel({ pageId: page.id, itemId: hit.id }); return; }
      const it = { id: uid(), type: "text", x, y: y - 20, w: 360, h: 60, text: "", font, fontSize: 22, color: ink, tilt: (Math.random() - 0.5) * 1.2 };
      updatePage(page.id, (p) => ({ ...p, items: [...p.items, it] }));
      setEditingText(it.id);
      setSel({ pageId: page.id, itemId: it.id });
      e.preventDefault();
      return;
    }
    setEditingText(null);

    if (tool === "select") {
      const hit = [...page.items].reverse().find((i) => { const b = boxOf(i); return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; });
      setSel(hit ? { pageId: page.id, itemId: hit.id } : null);
      if (hit) {
        const b = boxOf(hit);
        const resize = (hit.type === "image" || hit.type === "text") && x > b.x + b.w - 26 && y > b.y + b.h - 26;
        drag.current = { pageId: page.id, id: hit.id, x, y, resize, start: book };
        capture(svg, e);
      }
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
      drag.current = { pageId: page.id, erase: true, start: book };
      capture(svg, e);
      erase(page, x, y);
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
        stab: 1, style: "ball", points: [[x, y, 0.5]], arc: { cx: compass.x, cy: compass.y, r, a0, last: a0, sweep: 0 } };
      setLiveOn({ pageId: page.id, color: ink, tool: "pen" });
      drawLive();
      return;
    }

    capture(svg, e);
    if (tool === "shape") {
      setLive({ pageId: page.id, item: { id: uid(), type: "shape", kind: shapeKind, x1: x, y1: y, x2: x, y2: y, color: ink, size: Math.max(2, size * 1.2) } });
    } else {
      const isHl = tool === "highlighter" || tool === "revealer";
      const color = tool === "revealer" ? cov : isHl ? hl : ink;
      liveStroke.current = { pageId: page.id, id: uid(), type: "stroke", tool, color,
        size: widthOf(tool, size), pressure: e.pointerType === "pen", points: [[x, y, pressure]], stab: prefs.stab[tool] ?? 4,
        ...(tool === "pen" ? { style: prefs.style } : {}), ...(tool === "highlighter" ? { tip: prefs.tip } : {}) };
      if (ruler && ruler.pageId === page.id && tool !== "revealer") {
        const { lx, ly } = rulerLocal(ruler, x, y);
        const edge = ly > -32 && ly < 10 ? 0 : ly > RULER_H - 10 && ly < RULER_H + 32 ? RULER_H : null;
        if (edge !== null && lx > -30 && lx < ruler.len + 30) {
          const s0 = rulerPoint(ruler, lx, edge);
          liveStroke.current.ruler = { edge };
          liveStroke.current.straight = true;
          liveStroke.current.points = [[s0[0], s0[1], pressure], [s0[0], s0[1], pressure]];
        }
      }
      setLiveOn({ pageId: page.id, color, tool });
      drawLive();
    }
  }

  function erase(page, x, y) {
    const r = widthOf("eraser", size) / 2;
    const keep = page.items.filter((i) => !(i.type === "stroke" && nearStroke(i, x, y, r)) &&
      !(i.type === "shape" && (() => { const b = boxOf(i); return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; })()));
    if (keep.length !== page.items.length) updatePage(page.id, (p) => ({ ...p, items: keep }), { record: false });
  }

  // Draws the size circle under the pointer, straight on the page, without
  // re-rendering anything.
  function showRing(e, svg, page) {
    const el = ring.current;
    if (!el) return;
    const sized = ["pen", "highlighter", "revealer", "eraser"].includes(tool);
    if (!sized || e.pointerType === "touch") { el.style.display = "none"; return; }
    const d = Math.max(4, widthOf(tool, size) * (svg.getBoundingClientRect().width / page.w));
    const c = tool === "highlighter" ? hl : tool === "revealer" ? cov : ink;
    el.style.display = "block";
    el.style.width = el.style.height = d + "px";
    el.style.transform = `translate(${e.clientX - d / 2}px, ${e.clientY - d / 2}px)`;
    el.style.borderColor = tool === "eraser" ? "rgba(0,0,0,.55)" : c;
    el.className = "nb-ring" + (tool === "eraser" ? " eraser" : "");
  }

  function move(e, page) {
    const svg = e.currentTarget;
    showRing(e, svg, page);
    if (twoFinger.current) return;
    if (drag.current?.pan) {
      pagesRef.current?.scrollBy(drag.current.pan.x - e.clientX, drag.current.pan.y - e.clientY);
      drag.current.pan = { x: e.clientX, y: e.clientY };
      return;
    }
    const [x, y] = toPage(e, svg, page);
    if (drag.current?.erase) { erase(page, x, y); return; }
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
    if (drag.current && tool === "select") {
      const d = drag.current;
      const dx = x - d.x, dy = y - d.y;
      d.x = x; d.y = y;
      updatePage(d.pageId, (p) => ({ ...p, items: p.items.map((i) => {
        if (i.id !== d.id) return i;
        if (d.resize) {
          const ratio = i.type === "image" ? (i.h / i.w) : null;
          const w = Math.max(40, i.w + dx);
          return { ...i, w, h: ratio ? w * ratio : Math.max(30, (i.h || 40) + dy) };
        }
        return moveItem(i, dx, dy);
      }) }), { record: false });
      return;
    }
    const ls = liveStroke.current;
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
    if (ls && ls.pageId === page.id && ls.ruler) {
      const { lx } = rulerLocal(ruler, x, y);
      const p1 = rulerPoint(ruler, lx, ls.ruler.edge);
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
        ls.points.push([px, py, ev.pointerType === "pen" ? ev.pressure || 0.5 : 0.5]);
      }
      drawLive();
      // Draw and hold still for a moment: the line snaps straight, then
      // follows the pen from its start, as in GoodNotes.
      clearTimeout(holdT.current);
      holdT.current = setTimeout(() => {
        const l = liveStroke.current;
        if (l && !l.straight && l.points.length > 4) { l.straight = true; l.points = [l.points[0], l.points[l.points.length - 1]]; drawLive(); }
      }, 600);
      return;
    }
    if (!live || live.pageId !== page.id) return;
    setLive((l) => (l && l.item.type === "shape" ? { ...l, item: { ...l.item, x2: x, y2: y } } : l));
  }

  function up(e) {
    if (e?.type) log(e.type, e);
    if (drag.current) {
      const start = drag.current.start;
      if (start && start !== book) { past.current.push(start); future.current = []; }
      drag.current = null;
      return;
    }
    clearTimeout(holdT.current);
    const ls = liveStroke.current;
    if (ls) {
      liveStroke.current = null;
      const { pageId, arc, ruler: onRuler, ...rest } = ls;
      let done = rest;
      if (done.tool === "highlighter" && prefs.hlStraight && done.points.length > 1) done = { ...done, straight: true, points: [done.points[0], done.points[done.points.length - 1]] };
      else if (prefs.refine && !done.straight && !arc) done = { ...done, points: refine(done.points) };
      const item = { ...done, d: inkPath(done) };
      updatePage(pageId, (p) => ({ ...p, items: [...p.items, item] }));
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

  function addPage(after = current, template, ready) {
    const ref = book.pages[after] || book.pages[book.pages.length - 1];
    const made = ready || [newPage(template || ref?.template || book.template, ref?.paper || book.paper)];
    const pg = made[0];
    const pages = [...book.pages];
    pages.splice(after + 1, 0, ...made);
    commit({ ...book, pages });
    setTimeout(() => pagesRef.current?.querySelectorAll(".nb-page")[after + 1]?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
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
    <div className="nb">
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
          <label className="nb-tool" title="Add a picture" aria-label="Add a picture">
            <input ref={imgInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) addImage(f); }} />
            <Icon name="image" size={18} />
          </label>
          <button className={"nb-tool" + (video !== null ? " on" : "")} title="Watch a video while you write" aria-label="Watch a video while you write"
            onClick={() => setVideo((v) => (v === null ? "" : null))}>
            <Icon name="video" size={18} />
          </button>
        </div>
        <button className={"nb-tool" + (ruler ? " on" : "")} title="Ruler: lay it on the page, draw along its edge for a straight line"
          aria-label="Ruler" aria-pressed={!!ruler}
          onClick={() => setRuler((r) => (r ? null : { pageId: book.pages[current]?.id, x: 110, y: 420, angle: 0, len: 560 }))}>
          <Icon name="ruler" size={18} />
        </button>
        <button className={"nb-pill nb-drawwith" + (prefs.finger === false ? " on" : "")} onClick={() => setPrefs((o) => ({ ...o, finger: o.finger === false }))}
          title={prefs.finger === false ? "Only an Apple Pencil or stylus writes. Fingers scroll." : "Fingers and pens both write. Tap for Pencil only."}>
          {prefs.finger === false ? "✏️ Pencil only" : "☝️ Finger + pen"}
        </button>
        {(prefs.pens || []).length > 0 && (
          <div className="nb-group nb-case" aria-label="Pencil case">
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
        <div className="nb-group nb-colors">
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
        {(tool === "text" || selected?.type === "text") && (
          <div className="nb-group">
            <select className="nb-font" value={selected?.type === "text" ? selected.font : font}
              onChange={(e) => {
                if (e.target.value === "__import") { fontInput.current?.click(); return; }
                setFont(e.target.value);
                if (selected?.type === "text") updatePage(sel.pageId, (p) => ({ ...p, items: p.items.map((i) => (i.id === selected.id ? { ...i, font: e.target.value } : i)) }));
              }} aria-label="Writing style">
              <optgroup label="Handwriting">{FONTS.filter((f) => f.hand).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>
              <optgroup label="Typed">{FONTS.filter((f) => !f.hand).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>
              {customFonts.length > 0 && <optgroup label="Your fonts">{customFonts.map((n) => <option key={n} value={"custom:" + n}>{n}</option>)}</optgroup>}
              <option value="__import">＋ Import a font…</option>
            </select>
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
              onClick={() => pagesRef.current?.querySelectorAll(".nb-page")[i]?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <svg viewBox={`0 0 ${p.w} ${p.h}`}><Paper page={p} />{p.items.map((it) => <Item key={it.id} it={it} />)}</svg>
              <span>{i + 1}</span>
            </button>
          ))}
          <button className="nb-thumb nb-thumb-add" onClick={() => addPage(book.pages.length - 1)} aria-label="Add a page"><Icon name="plus" size={18} /></button>
        </aside>

        <div className={"nb-pages" + (tool === "hand" ? " hand" : "") + (prefs.finger === false ? " pencil-only" : "")} ref={pagesArea}>
          <div className="nb-page-opts">
            <span className="small muted">Page {current + 1} of {book.pages.length}</span>
            <select value={book.pages[current]?.template} onChange={(e) => setPageTemplate(e.target.value)} aria-label="Page paper">
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="nb-swatches small">{PAPERS.map((pp) => (
              <button key={pp.id} className={book.pages[current]?.paper === pp.id ? "on" : ""} style={{ background: pp.bg }} onClick={() => setPagePaper(pp.id)} aria-label={pp.name} title={pp.name} />
            ))}</div>
            <div className="nb-addwrap">
              <button className="btn quiet small" onClick={() => setAdding((v) => !v)} aria-expanded={adding}><Icon name="pagesadd" size={14} /> Add page</button>
              {adding && (
                <div className="nb-addmenu" onMouseLeave={() => setAdding(false)}>
                  <span className="qv-label">Paper</span>
                  <div className="nb-addpapers">
                    {TEMPLATES.map((t) => (
                      <button key={t.id} className="nb-paper" onClick={() => { addPage(current, t.id); setAdding(false); }}>
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
            <button className="btn quiet small" onClick={() => removePage(current)} disabled={book.pages.length === 1}><Icon name="trash" size={13} /> <span className="nb-lbl">Remove page</span></button>
            <button className="btn quiet small" onClick={() => window.print()}><Icon name="sheet" size={13} /> <span className="nb-lbl">Print or PDF</span></button>
          </div>

          {book.pages.map((page, i) => (
            <div key={page.id} className="nb-page" data-index={i} style={{ width: page.w * zoom, height: page.h * zoom }}>
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
                  <Item key={it.id} it={it} editing={editingText === it.id} shown={shown.has(it.id)}
                    onText={(text, hPx) => updatePage(page.id, (p) => ({ ...p, items: p.items.map((x) => (x.id === it.id ? { ...x, text, h: Math.max(40, hPx / zoom + 8) } : x)) }), { record: false })} />
                ))}
                {live?.pageId === page.id && <Item it={live.item} />}
                {ruler?.pageId === page.id && <Ruler r={ruler} />}
                {compass?.pageId === page.id && tool === "compass" && (
                  <g className="nb-compass" pointerEvents="none">
                    <circle cx={compass.x} cy={compass.y} r="5" fill="#e5484d" />
                    <circle cx={compass.x} cy={compass.y} r="12" fill="none" stroke="#e5484d" strokeWidth="1.5" strokeDasharray="3 3" />
                  </g>
                )}
                {liveOn?.pageId === page.id && (
                  <path ref={livePath} fill={liveOn.color} opacity={liveOn.tool === "highlighter" ? 0.38 : 1}
                    style={liveOn.tool === "highlighter" ? { mixBlendMode: "multiply" } : undefined} />
                )}
                {sel?.pageId === page.id && selected && (() => {
                  const b = boxOf(selected);
                  return <g className="nb-sel">
                    <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="4" fill="none" stroke="#3B5BFD" strokeWidth="1.5" strokeDasharray="6 4" />
                    {(selected.type === "image" || selected.type === "text") && <rect x={b.x + b.w - 12} y={b.y + b.h - 12} width="16" height="16" rx="4" fill="#3B5BFD" />}
                  </g>;
                })()}
              </svg>
            </div>
          ))}
          <button className="nb-add-end" onClick={() => addPage(book.pages.length - 1)}><Icon name="plus" size={15} /> Add a page</button>
        </div>
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
