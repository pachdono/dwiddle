// Notebooks: write by hand, type, drop in pictures and PDFs, on paper of your
// choosing, and then have Dwiddle turn a page into notes and questions.
//
// Each page is an SVG in page units (A4 at 96 dpi), drawn over its paper
// template, so ink stays sharp at any zoom and a page can be turned into an
// image for Dwiddle to read. Ink uses perfect-freehand, which shapes a stroke
// from the pen's pressure the way a real nib spreads, and a pen being used
// switches touch to scrolling, so a resting palm does not draw.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStroke } from "perfect-freehand";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/600.css";
import "@fontsource/patrick-hand/400.css";
import "@fontsource/kalam/400.css";
import "@fontsource/shadows-into-light/400.css";
import { Icon, PageHead, Loading, Portal } from "./ui.jsx";
import { DuckMark } from "./Duck.jsx";
import { listBooks, getBook, putBook, deleteBook, newBook, newPage, uid, PAGE_W, PAGE_H } from "./notebookStore.js";
import { readImage } from "./ai.js";
import { openDwiddle } from "./Chat.jsx";
import { shrink } from "./custom.js";

/* ---------- paper ---------- */

export const TEMPLATES = [
  { id: "blank", name: "Blank" },
  { id: "lined", name: "Lined" },
  { id: "wide", name: "Wide lined" },
  { id: "grid", name: "Squared" },
  { id: "dots", name: "Dotted" },
  { id: "cornell", name: "Cornell notes" },
  { id: "mindmap", name: "Mind map" },
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

function Paper({ page }) {
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
    case "revision":
      body = <>
        <rect x="40" y="110" width={w - 80} height={(h - 190) / 2} rx="18" fill="none" stroke={L} strokeWidth="2" />
        <rect x="40" y={130 + (h - 190) / 2} width={w - 80} height={(h - 190) / 2} rx="18" fill="none" stroke={L} strokeWidth="2" strokeDasharray="10 8" />
        <text x="60" y="145" fontSize="15" fill={L} fontWeight="700" letterSpacing="2">QUESTION</text>
        <text x="60" y={165 + (h - 190) / 2} fontSize="15" fill={L} fontWeight="700" letterSpacing="2">ANSWER</text>
      </>;
      break;
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

function inkPath(item) {
  const hl = item.tool === "highlighter";
  return pathFrom(getStroke(item.points, {
    size: item.size,
    thinning: hl ? 0 : 0.55,
    smoothing: 0.55,
    streamline: 0.45,
    simulatePressure: !item.pressure,
    start: { cap: !hl, taper: hl ? 0 : 6 },
    end: { cap: !hl, taper: hl ? 0 : 10 },
  }));
}

const FONTS = [
  { id: "caveat", name: "Handwriting", css: '"Caveat", cursive', scale: 1.25 },
  { id: "patrick", name: "Neat hand", css: '"Patrick Hand", cursive', scale: 1.1 },
  { id: "kalam", name: "Marker", css: '"Kalam", cursive', scale: 1.05 },
  { id: "shadows", name: "Quick scribble", css: '"Shadows Into Light", cursive', scale: 1.15 },
  { id: "sans", name: "Typed", css: 'Inter, -apple-system, system-ui, sans-serif', scale: 1 },
  { id: "serif", name: "Book", css: 'Georgia, serif', scale: 1 },
];
const fontOf = (id) => FONTS.find((f) => f.id === id) || FONTS[0];

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

function Item({ it, selected, editing, onText }) {
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
  return <div className="nb-text" style={style}>{it.text || " "}</div>;
}

/* ---------- the list of notebooks ---------- */

const COVERS = ["#3B5BFD", "#D1497A", "#4F8536", "#7447D6", "#1C6DAA", "#168F79", "#DE5F37", "#B24E1E", "#1b1d26"];

export default function NotebookPage({ go }) {
  const [books, setBooks] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState("");
  const [confirm, setConfirm] = useState(null);

  const refresh = useCallback(() => listBooks().then(setBooks).catch(() => setBooks([])), []);
  useEffect(() => { refresh(); }, [refresh]);

  async function create(opts) {
    const b = newBook(opts);
    await putBook(b);
    setCreating(false);
    setOpenId(b.id);
  }

  // Each PDF page becomes a notebook page with the page as its paper, ready
  // to write on, the way worksheets and lecture slides get annotated.
  async function importPdf(file) {
    setImporting("Opening the PDF");
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = [];
      const n = Math.min(doc.numPages, 60);
      for (let i = 1; i <= n; i++) {
        setImporting(`Page ${i} of ${n}`);
        const pg = await doc.getPage(i);
        const vp = pg.getViewport({ scale: 1 });
        const scale = Math.min(2, 1600 / vp.width);
        const view = pg.getViewport({ scale });
        const c = document.createElement("canvas");
        c.width = view.width; c.height = view.height;
        await pg.render({ canvasContext: c.getContext("2d"), viewport: view }).promise;
        const w = PAGE_W, h = Math.round(PAGE_W * (vp.height / vp.width));
        pages.push({ ...newPage("blank"), w, h, bg: c.toDataURL("image/jpeg", 0.85) });
      }
      const b = { ...newBook({ title: file.name.replace(/\.pdf$/i, ""), template: "blank", cover: "#1C6DAA" }), pages };
      await putBook(b);
      setOpenId(b.id);
    } catch {
      alert("That PDF could not be opened.");
    } finally {
      setImporting("");
    }
  }

  if (openId) return <Editor id={openId} go={go} onClose={() => { setOpenId(null); refresh(); }} />;

  return (
    <div className="page wide fade nb-home">
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

      {importing && <div className="card card-pad note-card"><Loading label={`Importing: ${importing}`} /></div>}

      {books === null ? <Loading label="Opening your notebooks" /> : books.length === 0 ? (
        <div className="card card-pad nb-empty">
          <div className="nb-empty-art"><DuckMark size={56} /></div>
          <b>Your first notebook</b>
          <p className="small muted">Lined, squared, Cornell notes, a mind map, a week planner and more. Use an Apple Pencil, a mouse or your finger.</p>
          <button className="btn cta" onClick={() => setCreating(true)}><Icon name="plus" size={15} /> New notebook</button>
        </div>
      ) : (
        <div className="nb-grid">
          {books.map((b) => (
            <div key={b.id} className="nb-book" onClick={() => setOpenId(b.id)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") setOpenId(b.id); }}>
              <div className="nb-cover" style={{ background: b.cover }}>
                <span className="nb-cover-band" />
                <span className="nb-cover-title">{b.title}</span>
                <span className="nb-cover-duck"><DuckMark size={26} /></span>
              </div>
              <div className="nb-meta">
                <b>{b.title}</b>
                <span className="small muted">{b.pages.length} page{b.pages.length === 1 ? "" : "s"} · {new Date(b.updated || b.created).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </div>
              <button className="icon-btn nb-del" aria-label={`Delete ${b.title}`} title="Delete"
                onClick={(e) => { e.stopPropagation(); setConfirm(b); }}><Icon name="trash" size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {creating && <NewBook onCreate={create} onClose={() => setCreating(false)} />}
      {confirm && (
        <Portal>
          <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
            <div className="gate lib-confirm" role="alertdialog" aria-modal="true">
              <div className="lib-confirm-icon"><Icon name="trash" size={22} /></div>
              <h2>Delete "{confirm.title}"?</h2>
              <p className="gate-sub">All {confirm.pages.length} page{confirm.pages.length === 1 ? "" : "s"} are removed from this device. It cannot be undone.</p>
              <div className="gate-actions">
                <button className="btn lib-confirm-go" onClick={async () => { await deleteBook(confirm.id); setConfirm(null); refresh(); }}>Delete it</button>
                <button className="btn ghost" onClick={() => setConfirm(null)}>Keep it</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

function NewBook({ onCreate, onClose }) {
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("lined");
  const [paper, setPaper] = useState("white");
  const [cover, setCover] = useState(COVERS[0]);
  const preview = useMemo(() => ({ ...newPage(template, paper), id: "preview" }), [template, paper]);
  return (
    <Portal>
      <div className="gate-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="gate nb-new" role="dialog" aria-modal="true" aria-label="New notebook">
          <h2>New notebook</h2>
          <input className="nb-new-title" autoFocus placeholder="Name it, like Biology or Chapter 3" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="nb-new-body">
            <div className="nb-new-preview">
              <svg viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}><Paper page={preview} /></svg>
            </div>
            <div className="nb-new-opts">
              <span className="qv-label">Paper</span>
              <div className="nb-chips">{TEMPLATES.map((t) => (
                <button key={t.id} className={template === t.id ? "on" : ""} onClick={() => setTemplate(t.id)}>{t.name}</button>
              ))}</div>
              <span className="qv-label">Colour</span>
              <div className="nb-swatches">{PAPERS.map((p) => (
                <button key={p.id} className={paper === p.id ? "on" : ""} style={{ background: p.bg }} title={p.name} aria-label={p.name} onClick={() => setPaper(p.id)} />
              ))}</div>
              <span className="qv-label">Cover</span>
              <div className="nb-swatches">{COVERS.map((c) => (
                <button key={c} className={cover === c ? "on" : ""} style={{ background: c }} aria-label="Cover colour" onClick={() => setCover(c)} />
              ))}</div>
            </div>
          </div>
          <div className="gate-actions">
            <button className="btn cta gate-go" onClick={() => onCreate({ title: title.trim() || "Untitled notebook", template, paper, cover })}>Create notebook</button>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ---------- the editor ---------- */

// Keeps the stroke going when the pen leaves the page. Never allowed to stop a
// stroke starting, whatever the device.
function capture(el, e) {
  try { el.setPointerCapture(e.pointerId); } catch { /* not a capturable pointer */ }
}

const TOOLS = [
  { id: "pen", icon: "pen", name: "Pen" },
  { id: "highlighter", icon: "marker", name: "Highlighter" },
  { id: "eraser", icon: "eraser", name: "Eraser" },
  { id: "shape", icon: "shape", name: "Shapes" },
  { id: "text", icon: "text", name: "Text" },
  { id: "select", icon: "select", name: "Select and move" },
];
const INKS = ["#1b1d26", "#3B5BFD", "#e5484d", "#16a34a", "#9333ea", "#f59e0b"];
const HIGHLIGHTS = ["#ffe066", "#a7f3d0", "#fbcfe8", "#bfdbfe", "#fed7aa"];

function Editor({ id, go, onClose }) {
  const [book, setBook] = useState(null);
  const [tool, setTool] = useState("pen");
  const [shapeKind, setShapeKind] = useState("line");
  const [ink, setInk] = useState(INKS[0]);
  const [hl, setHl] = useState(HIGHLIGHTS[0]);
  const [size, setSize] = useState(3);
  const [font, setFont] = useState("caveat");
  const [zoom, setZoom] = useState(1);
  const [live, setLive] = useState(null); // { pageId, item } being drawn
  const [sel, setSel] = useState(null); // { pageId, itemId }
  const [editingText, setEditingText] = useState(null); // itemId
  const [current, setCurrent] = useState(0); // page index in view
  const [busy, setBusy] = useState("");
  const [penSeen, setPenSeen] = useState(false);
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
  useEffect(() => { setEditingText(null); }, [tool]);

  // Every change is saved shortly after it is made, and kept for undo.
  const commit = useCallback((next, { record = true } = {}) => {
    setBook((prev) => {
      if (record && prev) { past.current.push(prev); if (past.current.length > 60) past.current.shift(); future.current = []; }
      clearTimeout(saveT.current);
      saveT.current = setTimeout(() => putBook(next).catch(() => {}), 500);
      return next;
    });
  }, []);
  const updatePage = (pageId, fn, opts) => setBook((prev) => {
    const next = { ...prev, pages: prev.pages.map((p) => (p.id === pageId ? fn(p) : p)) };
    if (opts?.record !== false) { past.current.push(prev); if (past.current.length > 60) past.current.shift(); future.current = []; }
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => putBook(next).catch(() => {}), 500);
    return next;
  });
  function undo() { const prev = past.current.pop(); if (!prev) return; future.current.push(book); setBook(prev); putBook(prev).catch(() => {}); }
  function redo() { const next = future.current.pop(); if (!next) return; past.current.push(book); setBook(next); putBook(next).catch(() => {}); }

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
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (e.pointerType === "pen") setPenSeen(true);
    // With a pen in use, a finger scrolls instead of drawing: palm rejection.
    if (e.pointerType === "touch" && penSeen) return;
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

    if (tool === "eraser") {
      drag.current = { pageId: page.id, erase: true, start: book };
      capture(svg, e);
      erase(page, x, y);
      return;
    }

    capture(svg, e);
    if (tool === "shape") {
      setLive({ pageId: page.id, item: { id: uid(), type: "shape", kind: shapeKind, x1: x, y1: y, x2: x, y2: y, color: ink, size: Math.max(2, size) } });
    } else {
      const isHl = tool === "highlighter";
      setLive({ pageId: page.id, item: { id: uid(), type: "stroke", tool, color: isHl ? hl : ink,
        size: isHl ? size * 6 + 10 : size * 1.4 + 1, pressure: e.pointerType === "pen", points: [[x, y, pressure]] } });
    }
  }

  function erase(page, x, y) {
    const r = 10 + size * 2;
    const keep = page.items.filter((i) => !(i.type === "stroke" && nearStroke(i, x, y, r)) &&
      !(i.type === "shape" && (() => { const b = boxOf(i); return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; })()));
    if (keep.length !== page.items.length) updatePage(page.id, (p) => ({ ...p, items: keep }), { record: false });
  }

  function move(e, page) {
    const svg = e.currentTarget;
    if (e.pointerType === "touch" && penSeen) return;
    const [x, y] = toPage(e, svg, page);
    if (drag.current?.erase) { erase(page, x, y); return; }
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
    if (!live || live.pageId !== page.id) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    setLive((l) => {
      if (!l) return l;
      if (l.item.type === "shape") return { ...l, item: { ...l.item, x2: x, y2: y } };
      const pts = [...l.item.points];
      for (const ev of events) {
        const [px, py] = toPage(ev, svg, page);
        pts.push([px, py, ev.pointerType === "pen" ? ev.pressure || 0.5 : 0.5]);
      }
      return { ...l, item: { ...l.item, points: pts } };
    });
  }

  function up() {
    if (drag.current) {
      const start = drag.current.start;
      if (start && start !== book) { past.current.push(start); future.current = []; }
      drag.current = null;
      return;
    }
    if (!live) return;
    const item = live.item.type === "stroke" ? { ...live.item, d: inkPath(live.item) } : live.item;
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

  function addPage(after = current, template) {
    const ref = book.pages[after] || book.pages[book.pages.length - 1];
    const pg = newPage(template || ref?.template || book.template, ref?.paper || book.paper);
    const pages = [...book.pages];
    pages.splice(after + 1, 0, pg);
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
  const colors = tool === "highlighter" ? HIGHLIGHTS : INKS;
  const color = tool === "highlighter" ? hl : ink;
  const setColor = (c) => {
    if (tool === "highlighter") setHl(c); else setInk(c);
    if (selected && (selected.type === "text" || selected.type === "shape" || selected.type === "stroke")) {
      updatePage(sel.pageId, (p) => ({ ...p, items: p.items.map((i) => (i.id === selected.id ? { ...i, color: c } : i)) }));
    }
  };

  return (
    <div className={"nb" + (penSeen ? " pen" : "")}>
      <div className="nb-bar">
        <button className="icon-btn" onClick={onClose} aria-label="Back to notebooks" title="Back to notebooks"><Icon name="back" size={18} /></button>
        <input className="nb-title" value={book.title} onChange={(e) => commit({ ...book, title: e.target.value }, { record: false })} aria-label="Notebook name" />
        <div className="nb-group">
          <button className="icon-btn" onClick={undo} disabled={!past.current.length} title="Undo (Ctrl Z)" aria-label="Undo"><Icon name="undo" size={17} /></button>
          <button className="icon-btn" onClick={redo} disabled={!future.current.length} title="Redo" aria-label="Redo"><Icon name="redo" size={17} /></button>
        </div>
        <div className="nb-group nb-tools" role="toolbar" aria-label="Tools">
          {TOOLS.map((t) => (
            <button key={t.id} className={"nb-tool" + (tool === t.id ? " on" : "")} onClick={() => setTool(t.id)} title={t.name} aria-label={t.name} aria-pressed={tool === t.id}>
              <Icon name={t.icon} size={18} />
            </button>
          ))}
          <label className="nb-tool" title="Add a picture" aria-label="Add a picture">
            <input ref={imgInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) addImage(f); }} />
            <Icon name="image" size={18} />
          </label>
        </div>
        <div className="nb-group nb-colors">
          {colors.map((c) => (
            <button key={c} className={"nb-color" + (color === c ? " on" : "")} style={{ background: c }} onClick={() => setColor(c)} aria-label="Colour" />
          ))}
          <label className="nb-color nb-custom" title="Any colour">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
        {(tool === "pen" || tool === "highlighter" || tool === "shape" || tool === "eraser") && (
          <div className="nb-group nb-size">
            {[1, 2, 3, 5, 8].map((s) => (
              <button key={s} className={"nb-dot" + (size === s ? " on" : "")} onClick={() => setSize(s)} aria-label={`Size ${s}`}>
                <i style={{ width: 4 + s * 1.6, height: 4 + s * 1.6 }} />
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
                setFont(e.target.value);
                if (selected?.type === "text") updatePage(sel.pageId, (p) => ({ ...p, items: p.items.map((i) => (i.id === selected.id ? { ...i, font: e.target.value } : i)) }));
              }} aria-label="Writing style">
              {FONTS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {selected?.type === "text" && (
              <select className="nb-font" value={selected.fontSize} aria-label="Text size"
                onChange={(e) => updatePage(sel.pageId, (p) => ({ ...p, items: p.items.map((i) => (i.id === selected.id ? { ...i, fontSize: Number(e.target.value) } : i)) }))}>
                {[16, 20, 22, 26, 32, 40, 52].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
        )}
        <div className="nb-spacer" />
        <div className="nb-group">
          <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))} aria-label="Zoom out">−</button>
          <button className="nb-pill" onClick={fit} title="Fit to width">{Math.round(zoom * 100)}%</button>
          <button className="icon-btn" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))} aria-label="Zoom in">+</button>
        </div>
        <div className="nb-group">
          <button className="btn small ghost nb-ask" onClick={() => dwiddle("ask")} disabled={!!busy}><DuckMark size={16} /> Ask</button>
          <button className="btn small cta" onClick={() => dwiddle("questions")} disabled={!!busy}>
            {busy ? <Loading label={busy} /> : <>Make questions</>}
          </button>
        </div>
      </div>

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

        <div className="nb-pages" ref={pagesArea}>
          <div className="nb-page-opts">
            <span className="small muted">Page {current + 1} of {book.pages.length}</span>
            <select value={book.pages[current]?.template} onChange={(e) => setPageTemplate(e.target.value)} aria-label="Page paper">
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="nb-swatches small">{PAPERS.map((pp) => (
              <button key={pp.id} className={book.pages[current]?.paper === pp.id ? "on" : ""} style={{ background: pp.bg }} onClick={() => setPagePaper(pp.id)} aria-label={pp.name} title={pp.name} />
            ))}</div>
            <button className="btn quiet small" onClick={() => addPage(current)}><Icon name="plus" size={13} /> Page after</button>
            <button className="btn quiet small" onClick={() => removePage(current)} disabled={book.pages.length === 1}><Icon name="trash" size={13} /> Remove page</button>
            <button className="btn quiet small" onClick={() => window.print()}><Icon name="sheet" size={13} /> Print or PDF</button>
          </div>

          {book.pages.map((page, i) => (
            <div key={page.id} className="nb-page" data-index={i} style={{ width: page.w * zoom, height: page.h * zoom }}>
              <svg viewBox={`0 0 ${page.w} ${page.h}`} width={page.w * zoom} height={page.h * zoom}
                className={"nb-svg tool-" + tool}
                onPointerDown={(e) => down(e, page)} onPointerMove={(e) => move(e, page)}
                onPointerUp={up} onPointerCancel={up} onPointerLeave={(e) => { if (e.buttons === 0) up(); }}>
                <Paper page={page} />
                {page.items.map((it) => (
                  <Item key={it.id} it={it} editing={editingText === it.id}
                    onText={(text, hPx) => updatePage(page.id, (p) => ({ ...p, items: p.items.map((x) => (x.id === it.id ? { ...x, text, h: Math.max(40, hPx / zoom + 8) } : x)) }), { record: false })} />
                ))}
                {live?.pageId === page.id && <Item it={live.item.type === "stroke" ? { ...live.item } : live.item} />}
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
