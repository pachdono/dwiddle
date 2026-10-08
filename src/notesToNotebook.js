// Turns a set of notes into a notebook that looks like a page of good
// handwritten notes: two columns filled top to bottom, topics running on one
// after another rather than each on its own mostly empty page, a big
// highlighted title, underlined headings in a colour per topic, ring bullets,
// boxed warnings, and the notes' highlights drawn as highlighter strokes.
//
// Everything hand drawn (underlines, bullets, boxes, arrows, doodles) is a
// real pen stroke with a little wobble, so it looks drawn and can be moved or
// rubbed out like anything else written on the page.
//
// Lines are broken here, measured with the font itself, and written into the
// text with line breaks, so the page draws them exactly where they were
// measured and the highlights land on the right words.

import { newBook, newPage, putBook, uid, PAGE_W, PAGE_H } from "./notebookStore.js";
import { fontById, readyFont } from "./nbFonts.js";
import { sketchFor, graphItems } from "./NotebookGraph.jsx";
import { MARK, flatMarks, blockTexts } from "./marks.js";

const M = 42;                               // page margin
const GAP = 26;                             // between the two columns
const COL = (PAGE_W - 2 * M - GAP) / 2;     // a column's width
const INK = "#1b1d26";
const MUTED = "#5b6070";
const HL = { def: "#93c5fd", key: "#ffd84d", exam: "#fda4af", word: "#c4b5fd" };
// A colour for each topic's headings, in turn, like a set of fineliners.
const TOPIC_INKS = ["#3B5BFD", "#db2777", "#7c3aed", "#0d9488", "#ea580c", "#16a34a"];
const TITLE_BAND = ["#c7d2fe", "#fbcfe8", "#ddd6fe", "#99f6e4", "#fed7aa", "#bbf7d0"];

// The plain words of a note, and where each highlight starts and ends in them.
function unmark(text) {
  let plain = "";
  const marks = [];
  let last = 0;
  const s = String(text || "").replace(/\s+/g, " ").trim();
  s.replace(MARK, (whole, kind, t, w, _def, at) => {
    const shown = kind ? t : w;
    plain += s.slice(last, at);
    marks.push({ kind: kind || "word", a: plain.length, b: plain.length + shown.length });
    plain += shown;
    last = at + whole.length;
    return whole;
  });
  plain += s.slice(last);
  return { plain, marks };
}

// A steady wobble, the same every time for the same seed, so drawn lines look
// hand drawn without jittering between saves.
function wobbler(seed) {
  let h = 2166136261;
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000 - 0.5; };
}

export async function notesToNotebook(made, { fontId = "patrick", template = "grid", pictures = true, rich = false, spacing = "normal", onProgress } = {}) {
  const f = fontById(fontId);
  // Lines sit on the paper: every square on squared or dotted paper, every
  // line on ruled paper.
  const LH = template === "lined" || template === "pastel" ? 32 : template === "wide" ? 44 : template === "journal" ? 28 : 24;
  // Spacing: compact fits more on a page, huge leaves a line free under every
  // line written and a gap between points, room to add your own notes.
  const SP = spacing === "compact" ? 0 : spacing === "huge" ? 2 : 1;
  const px = spacing === "compact" ? LH / 1.5 : LH / 1.35;
  await readyFont(f, px);
  const ctx = document.createElement("canvas").getContext("2d");
  // A little over the measured width, so a line never wraps again on the page.
  const measure = (t, size = px) => { ctx.font = `${size}px ${f.css}`; return ctx.measureText(t).width * 1.03; };
  const PAD = 4; // the text box's own padding on each side
  const wob = wobbler(made?.title || "notes");

  const book = newBook({ title: made?.title || "Notes", template, cover: TOPIC_INKS[0] });
  book.pages = [];
  let page = null, col = 0, y = 0, top = M;
  const bottom = PAGE_H - M;
  const colX = () => M + col * (COL + GAP);
  const snap = (v) => Math.ceil(v / LH) * LH; // onto the paper's lines

  function newSheet() {
    page = newPage(template, "white");
    book.pages.push(page);
    col = 0;
    top = snap(M);
    y = top;
  }
  function nextColumn() {
    if (col === 0) { col = 1; y = top; } else newSheet();
  }
  // Room for h more, moving on to the next column or page when there is not.
  function room(h) {
    if (!page) newSheet();
    if (y + h > bottom && y > top) nextColumn();
  }

  function text(t, x, yy, w, { size = px, color = INK } = {}) {
    return { id: uid(), type: "text", x, y: yy, w, h: LH, text: t, font: f.id, fontSize: +(size / f.scale).toFixed(2), color, tilt: 0, wobble: false };
  }
  // A drawn line through points, as a pen stroke.
  function stroke(points, { color = INK, size = 1.7 } = {}) {
    page.items.push({ id: uid(), type: "stroke", tool: "pen", style: "ball", color, size, pressure: false, tip: "round", stab: 1,
      points: points.map(([px2, py]) => [px2, py, 0.5]) });
  }
  function handLine(x1, y1, x2, y2, opts) {
    const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 14));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([x1 + (x2 - x1) * t + wob() * 0.8, y1 + (y2 - y1) * t + wob() * 1.2]);
    }
    stroke(pts, opts);
  }
  function handBox(x, yy, w, h, opts) {
    const c = [[x, yy], [x + w, yy], [x + w, yy + h], [x, yy + h], [x + 2, yy - 1]];
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const [a, b] = [c[i], c[i + 1]];
      const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 16));
      for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * (k / n) + wob(), a[1] + (b[1] - a[1]) * (k / n) + wob()]);
    }
    pts.push(c[4]);
    stroke(pts, opts);
  }
  function ring(cx, cy, r, opts) {
    const pts = [];
    for (let k = 0; k <= 14; k++) { const a = (k / 13) * 2 * Math.PI - 0.6; pts.push([cx + Math.cos(a) * (r + wob() * 0.5), cy + Math.sin(a) * (r + wob() * 0.5)]); }
    stroke(pts, { size: 1.4, ...opts });
  }
  function star(cx, cy, r, opts) {
    const pts = [];
    for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5; const rr = k % 2 ? r * 0.45 : r; pts.push([cx + Math.cos(a) * rr + wob() * 0.6, cy + Math.sin(a) * rr + wob() * 0.6]); }
    stroke(pts, { size: 1.5, ...opts });
  }
  function arrowDown(x, y1, y2, opts) {
    handLine(x, y1, x, y2, opts);
    stroke([[x - 5, y2 - 7], [x, y2], [x + 5, y2 - 7]], opts);
  }

  // Breaks words into lines no wider than w, keeping where each starts.
  function wrap(plain, w, size = px) {
    const lines = [];
    let start = 0, line = "";
    for (const word of plain.split(" ")) {
      const next = line ? line + " " + word : word;
      if (line && measure(next, size) > w) { lines.push({ t: line, at: start }); start += line.length + 1; line = word; }
      else line = next;
    }
    if (line) lines.push({ t: line, at: start });
    return lines;
  }
  // Highlighter strokes behind the marked words of some lines.
  function highlight(lines, marks, x, yy, size = px, step = LH) {
    lines.forEach((l, k) => {
      for (const m of marks) {
        if (m.kind === "word" && !rich) continue;
        const a = Math.max(m.a, l.at), b = Math.min(m.b, l.at + l.t.length);
        if (b <= a) continue;
        const x1 = x + PAD + measure(l.t.slice(0, a - l.at), size) / 1.03, x2 = x + PAD + measure(l.t.slice(0, b - l.at), size) / 1.03;
        const cy = yy + k * step + LH * 0.58;
        page.items.push({ id: uid(), type: "stroke", tool: "highlighter", color: HL[m.kind], size: size * 0.85, pressure: false,
          tip: "round", stab: 1, points: [[x1 + 2, cy, 0.5], [x2 - 2, cy, 0.5]] });
      }
    });
  }
  // Writes marked text in the current column from indent, carrying on into
  // the next column or page when it runs out of room. Returns the lines'
  // top and bottom in the column it finished in.
  function write(raw, { indent = 0, color = INK, size = px, keep = false } = {}) {
    const { plain, marks } = unmark(raw);
    if (!plain) return null;
    const w = COL - indent - 2 * PAD - 4;
    const lines = wrap(plain, w, size);
    const lh = LH * Math.max(1, Math.ceil((size * 1.35) / LH - 0.05)) * (spacing === "huge" ? 2 : 1);
    if (keep && lines.length * lh <= bottom - top) room(lines.length * lh);
    let i = 0, first = null;
    while (i < lines.length) {
      room(lh);
      const take = Math.max(1, Math.min(lines.length - i, Math.floor((bottom - y) / lh)));
      const chunk = lines.slice(i, i + take);
      const x = colX() + indent;
      // Spaced out leaves a free line under every line: a blank line is really
      // written between them (the page draws lines a fixed height apart), and
      // the highlighter follows the lines down.
      const item = text(chunk.map((l) => l.t).join(spacing === "huge" ? "\n\n" : "\n"), x, y, COL - indent, { color, size });
      item.h = take * lh;
      highlight(chunk, marks, x, y, size, lh);
      page.items.push(item);
      first ??= { y, col, page };
      y += take * lh;
      i += take;
    }
    return first;
  }

  // The title, big and highlighted, with a few doodled stars.
  newSheet();
  const titleSize = LH * 1.75;
  const title = made?.title || "Notes";
  // A long title takes more than one line, and everything below it starts
  // after the last of them, not under the first.
  const tLines = wrap(unmark(title).plain, PAGE_W - 2 * M - 2 * PAD - 70, titleSize);
  const titleLH = titleSize * 1.35;
  const tw = Math.min(PAGE_W - 2 * M - 60, Math.max(...tLines.map((l) => measure(l.t, titleSize))));
  tLines.forEach((l, k) => {
    const lw = Math.min(PAGE_W - 2 * M - 60, measure(l.t, titleSize));
    page.items.push({ id: uid(), type: "stroke", tool: "highlighter", color: TITLE_BAND[0], size: titleSize * 0.55, pressure: false, tip: "round", stab: 1,
      points: [[M + 4, y + k * titleLH + titleSize * 0.95, 0.5], [M + lw + 10, y + k * titleLH + titleSize * 0.9, 0.5]] });
  });
  page.items.push({ ...text(tLines.map((l) => l.t).join("\n"), M, y, PAGE_W - 2 * M, { size: titleSize, color: TOPIC_INKS[0] }), h: tLines.length * titleLH + titleSize * 0.05 });
  const firstW = Math.min(PAGE_W - 2 * M - 60, measure(tLines[0].t, titleSize));
  star(M + firstW + 30, y + titleSize * 0.35, 8, { color: TOPIC_INKS[1] });
  star(M + firstW + 52, y + titleSize * 0.85, 5, { color: TOPIC_INKS[2] });
  y = snap(y + tLines.length * titleLH + titleSize * 0.1);
  handLine(M, y - 6, PAGE_W - M, y - 8, { color: TOPIC_INKS[0], size: 1.4 });
  top = y + 4;
  y = top;

  const topics = (made?.topics || []).filter((t) => made?.notes?.[t.name]?.length);
  for (let ti = 0; ti < topics.length; ti++) {
    const topic = topics[ti];
    const accent = TOPIC_INKS[ti % TOPIC_INKS.length];
    onProgress?.(`Writing ${topic.name}`, ti / topics.length);
    // Tables, diagrams, pictures in place and the Key words list are for
    // staff and testers for now.
    const blocks = rich ? made.notes[topic.name] : made.notes[topic.name].filter((b) => !b.table && !b.flow && !b.pic);

    // The topic's heading: numbered, in capitals, underlined twice.
    if (y > top) y += LH * 0.5 * Math.max(0.5, SP);
    room(LH * 4);
    const hsize = px;
    const head = `${ti + 1}. ${topic.name.toUpperCase()}`;
    const at = write(head, { color: accent, size: hsize, keep: true });
    if (at) {
      const hw = Math.min(COL - 4, measure(head, hsize) + 8);
      handLine(colX() + 2, y + 3, colX() + hw, y + 2, { color: accent, size: 1.6 });
      handLine(colX() + 5, y + 7, colX() + hw * 0.7, y + 6, { color: accent, size: 1.1 });
    }
    y += 12;

    // A drawn graph where the topic is one a standard graph shows (enzymes
    // and temperature, supply and demand), in place of a photograph.
    const sketch = rich ? sketchFor([topic.name, ...blocks.map(blockTexts).flat()].join(" ")) : null;
    if (sketch) graph(sketch);
    else if (pictures && rich && !blocks.some((b) => b.pic)) {
      const pic = await pictureFor(topic.name).catch(() => null);
      if (pic) picture(pic);
    }

    for (const [bi, b] of blocks.entries()) {
      if (bi && spacing === "huge") y = snap(y + LH);
      if (b.h) {
        y += LH * 0.25 * SP;
        room(LH * 2);
        const sub = flatMarks(b.h).toUpperCase();
        write(sub, { color: accent, size: px * 0.95, keep: true });
        handLine(colX() + 2, y + 1, colX() + Math.min(COL - 8, measure(sub, px * 0.95) + 8), y, { color: accent, size: 1.1 });
        y += 5;
      } else if (b.p) {
        write(b.p);
      } else if (b.list) {
        for (const it of b.list) {
          room(LH);
          ring(colX() + 6, y + LH * 0.55, 3.2, { color: accent });
          write(it, { indent: 16 });
        }
      } else if (b.term) {
        room(LH * 2);
        write(`${b.term}:`, { color: accent });
        write(b.def, { indent: 14 });
      } else if (b.eg) {
        write(`e.g. ${b.eg}`, { indent: 10, color: MUTED });
      } else if (b.watch) {
        // Boxed, and kept in one column so the box goes round all of it.
        const { plain } = unmark(b.watch);
        const n = wrap(plain, COL - 30).length;
        y += 4;
        room(n * LH + 10);
        const x0 = colX(), y0 = y;
        write(`! ${b.watch}`, { indent: 10, color: "#b42318", keep: true });
        handBox(x0 + 2, y0 - 2, COL - 6, y - y0 + 6, { color: "#e5484d", size: 1.4 });
        y += 10;
      } else if (b.table) {
        table(b.table, accent);
      } else if (b.flow) {
        flow(b.flow, accent);
      } else if (b.pic) {
        if (!pictures) continue;
        const pic = await pictureFor(b.pic).catch(() => null);
        if (pic) picture(pic);
      }
    }

    // The hard words of the topic and what they mean, to learn at the end.
    const words = rich ? keyWords(blocks) : [];
    if (words.length) {
      y += LH * 0.25;
      room(LH * 3);
      write("KEY WORDS", { color: accent, size: px * 0.95, keep: true });
      for (const { w, d } of words) write(`{word|${w}|}: ${d}`);
    }
  }

  // A table with hand drawn rules, a row at a time, the heading row written
  // again at the top of a new column.
  function table({ head, rows }, accent) {
    const n = head.length;
    const size = px * (n > 3 ? 0.72 : 0.82);
    const cw = (COL - 6) / n;
    const cell = (c) => { const { plain, marks } = unmark(c); return { lines: plain ? wrap(plain, cw - 2 * PAD - 8, size) : [], marks }; };
    const drawRow = (cells, isHead) => {
      const laid = cells.map(cell);
      const h = Math.max(1, ...laid.map((c) => c.lines.length)) * LH;
      room(h + 4);
      const x = colX();
      laid.forEach((c, i) => {
        if (!c.lines.length) return;
        const cx = x + i * cw + 5;
        const item = text(c.lines.map((l) => l.t).join("\n"), cx, y, cw - 6, { size, color: isHead || i === 0 ? accent : INK });
        item.h = c.lines.length * LH;
        highlight(c.lines, c.marks, cx, y, size);
        page.items.push(item);
      });
      handLine(x, y + h + 2, x + COL - 6, y + h + 1, { color: isHead ? accent : "#9aa3b2", size: isHead ? 1.5 : 1 });
      for (let i = 1; i < n; i++) handLine(x + i * cw, y + 2, x + i * cw, y + h, { color: "#9aa3b2", size: 1 });
      y += h + 4;
    };
    y += 4;
    drawRow(head, true);
    for (const r of rows) {
      const before = `${book.pages.length}:${col}`;
      const h = Math.max(1, ...r.map((c) => cell(c).lines.length)) * LH;
      room(h + 4);
      if (`${book.pages.length}:${col}` !== before) drawRow(head, true);
      drawRow(r, false);
    }
    y += LH * 0.25;
  }

  // Steps in hand drawn boxes, one under another, joined by arrows.
  function flow({ title: ft, steps, cycle }, accent) {
    if (ft) write(ft.toUpperCase(), { color: accent, size: px * 0.9, keep: true });
    const bw = COL - 30;
    steps.forEach((step, i) => {
      const { plain, marks } = unmark(step);
      const lines = wrap(`${i + 1}. ${plain}`, bw - 2 * PAD - 16, px * 0.92);
      const h = lines.length * LH;
      room(h + (i ? LH : 6));
      if (i && y > top) { arrowDown(colX() + 15 + bw / 2, y + 2, y + LH - 4, { color: accent, size: 1.4 }); y += LH; }
      const x = colX() + 15;
      const item = text(lines.map((l) => l.t).join("\n"), x + 8, y + 2, bw - 12, { size: px * 0.92 });
      item.h = h;
      highlight(lines, marks.map((m) => ({ ...m, a: m.a + `${i + 1}. `.length, b: m.b + `${i + 1}. `.length })), x + 8, y + 2, px * 0.92);
      page.items.push(item);
      handBox(x, y, bw, h + 4, { color: accent, size: 1.4 });
      y += h + 6;
    });
    if (cycle) write("↻ back to step 1", { indent: 15, color: accent });
    y += 6;
  }

  // A hand drawn graph the width of a column.
  function graph(spec) {
    const w = Math.round(COL - 8), h = Math.round(w * 0.68);
    room(h + LH);
    page.items.push(...graphItems(spec, colX() + 4, y + 4, w, h, uid));
    y = snap(y + h + LH);
  }

  // A picture the width of a column at most, with its credit.
  function picture(pic) {
    const k = Math.min((COL - 8) / pic.w, 210 / pic.h, 1);
    const w = Math.round(pic.w * k), h = Math.round(pic.h * k);
    room(h + LH);
    page.items.push({ id: uid(), type: "image", x: colX() + (COL - w) / 2, y: y + 4, w, h, src: pic.src });
    page.items.push(text(`${pic.title}, Wikipedia`, colX(), y + h + 4, COL, { size: px * 0.6, color: "#8a8f9c" }));
    y = snap(y + h + LH);
  }

  if (!book.pages.length) book.pages.push(newPage(template, "white"));
  onProgress?.("Saving", 1);
  await putBook(book);
  return book.id;
}

// The words a topic marks as hard, with their meanings, in the order they come.
function keyWords(blocks) {
  const seen = new Map();
  const texts = (blocks || []).flatMap(blockTexts);
  for (const t of texts) {
    String(t).replace(MARK, (whole, kind, _t, w, d) => {
      const key = w?.trim().toLowerCase();
      if (!kind && key && d?.trim() && !seen.has(key)) seen.set(key, { w: w.trim(), d: flatMarks(d.trim()) });
      return whole;
    });
  }
  return [...seen.values()];
}

/* ---------- a picture for a topic ---------- */

// The same match the notes page shows, kept as a small copy inside the
// notebook so it works offline.
async function pictureFor(query) {
  const { findPicture } = await import("./wikiPic.js");
  const found = await findPicture(query);
  if (!found) return null;
  const src = await shrink(found.src);
  return src ? { ...src, title: found.title } : null;
}

// Fetches a picture and keeps a small copy in the notebook, so it works offline.
async function shrink(url) {
  const blob = await fetch(url).then((r) => (r.ok ? r.blob() : null));
  if (!blob) return null;
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  return { src: c.toDataURL("image/jpeg", 0.85), w: c.width, h: c.height };
}
