// Turns a set of notes into a notebook: each topic on its own pages, written
// in the font the student picks, sitting on the ruled lines, with the same
// highlights as the notes drawn as real highlighter strokes behind the words,
// and a picture from Wikipedia where one clearly matches the topic.
//
// Lines are broken here, measured with the font itself, and written into the
// text with line breaks, so the page draws them exactly where they were
// measured and the highlights land on the right words.

import { newBook, newPage, putBook, uid, PAGE_W } from "./notebookStore.js";
import { fontById, readyFont } from "./nbFonts.js";
import { MARK, flatMarks } from "./marks.js";

const ROW = 32;            // the ruled line spacing
const TOP = 110;           // the first ruled line
const LEFT = 112;          // just past the margin line
const WIDTH = PAGE_W - LEFT - 48;
const ROWS = 30;           // rows on a page, above the bottom margin
const ACCENT = "#3B5BFD";
const HL = { def: "#93c5fd", key: "#ffd84d", exam: "#fda4af", word: "#c4b5fd" };

// The plain words of a note, and where each highlight starts and ends in them.
function unmark(text) {
  let plain = "";
  const marks = [];
  let last = 0;
  const s = String(text || "");
  s.replace(MARK, (whole, kind, t, w, _def, at) => {
    const shown = kind ? t : w;
    plain += s.slice(last, at);
    marks.push({ kind: kind || "word", a: plain.length, b: plain.length + shown.length });
    plain += shown;
    last = at + whole.length;
    return whole;
  });
  plain += s.slice(last);
  return { plain: plain.replace(/\s+/g, " ").trim(), marks };
}

export async function notesToNotebook(made, { fontId = "arial", template = "lined", pictures = true, onProgress } = {}) {
  const f = fontById(fontId);
  const px = ROW / 1.35;                 // one ruled line per line of text
  await readyFont(f, px);
  const ctx = document.createElement("canvas").getContext("2d");
  const measure = (t, size = px) => { ctx.font = `${size}px ${f.css}`; return ctx.measureText(t).width; };

  const book = newBook({ title: made?.title || "Notes", template, cover: ACCENT });
  book.pages = [];
  let page = null, row = 0;
  const startPage = (header) => {
    page = newPage(template, "white");
    book.pages.push(page);
    row = 0;
    if (header) page.items.push(text(header.t, LEFT, header.y ?? 40, WIDTH, { size: header.size, color: header.color }));
  };
  const need = (rows, header) => { if (!page || row + rows > ROWS) startPage(header); };
  const rowY = (r) => TOP + r * ROW - ROW + 2;   // the top of a text row, so it sits on the line below

  function text(t, x, y, w, { size = px, color = "#1b1d26" } = {}) {
    return { id: uid(), type: "text", x, y, w, h: ROW, text: t, font: f.id, fontSize: +(size / f.scale).toFixed(2), color, tilt: 0, wobble: false };
  }

  // Breaks words into lines no wider than the box, keeping where each line
  // starts in the plain text.
  function wrap(plain, maxW, size = px) {
    const lines = [];
    let start = 0, line = "";
    for (const word of plain.split(" ")) {
      const next = line ? line + " " + word : word;
      if (line && measure(next, size) > maxW) {
        lines.push({ t: line, at: start });
        start += line.length + 1;
        line = word;
      } else line = next;
    }
    if (line) lines.push({ t: line, at: start });
    return lines;
  }

  // Writes a paragraph at x, w, highlights and all, breaking across pages.
  function write(raw, x, w, { color, header } = {}) {
    const { plain, marks } = unmark(raw);
    if (!plain) return;
    const lines = wrap(plain, w - 14);
    let i = 0;
    while (i < lines.length) {
      need(1, header);
      const take = Math.min(lines.length - i, ROWS - row);
      const chunk = lines.slice(i, i + take);
      const y = rowY(row);
      const item = text(chunk.map((l) => l.t).join("\n"), x, y, w, { color });
      item.h = take * ROW;
      // highlights, behind the words
      chunk.forEach((l, k) => {
        for (const m of marks) {
          const a = Math.max(m.a, l.at), b = Math.min(m.b, l.at + l.t.length);
          if (b <= a) continue;
          const x1 = x + 4 + measure(l.t.slice(0, a - l.at)), x2 = x + 4 + measure(l.t.slice(0, b - l.at));
          const cy = y + 2 + k * ROW + ROW * 0.55;
          page.items.push({ id: uid(), type: "stroke", tool: "highlighter", color: HL[m.kind], size: px * 0.95, pressure: false,
            tip: "round", stab: 1, points: [[x1 + 3, cy, 0.5], [x2 - 3, cy, 0.5]] });
        }
      });
      page.items.push(item);
      row += take;
      i += take;
    }
  }

  const topics = (made?.topics || []).filter((t) => made?.notes?.[t.name]?.length);
  for (let ti = 0; ti < topics.length; ti++) {
    const topic = topics[ti];
    onProgress?.(`Writing ${topic.name}`, ti / topics.length);
    const header = { t: `${topic.name} (continued)`, size: px * 0.8, color: "#8a8f9c" };
    startPage({ t: `${ti + 1}. ${topic.name}`, size: px * 1.4, color: ACCENT, y: 18 });

    if (pictures) {
      const pic = await pictureFor(topic.name).catch(() => null);
      if (pic) {
        const k = Math.min(300 / pic.w, 230 / pic.h);
        const w = Math.round(pic.w * k), h = Math.round(pic.h * k);
        const rows = Math.ceil((h + 26) / ROW);
        need(rows, header);
        const y = rowY(row) + 6;
        page.items.push({ id: uid(), type: "image", x: LEFT, y, w, h, src: pic.src });
        page.items.push(text(`Picture: ${pic.title}, Wikipedia`, LEFT, y + h + 2, WIDTH, { size: px * 0.55, color: "#8a8f9c" }));
        row += rows;
      }
    }

    const blocks = made.notes[topic.name];
    for (const b of blocks) {
      if (b.h) {
        if (row > 0) row += 1;
        need(2, header);
        write(b.h, LEFT, WIDTH, { color: ACCENT, header });
      } else if (b.p) {
        write(b.p, LEFT, WIDTH, { header });
      } else if (b.list) {
        for (const it of b.list) {
          need(1, header);
          page.items.push(text("•", LEFT + 4, rowY(row), 24, { color: ACCENT }));
          write(it, LEFT + 26, WIDTH - 26, { header });
        }
      } else if (b.term) {
        need(2, header);
        write(b.term, LEFT, WIDTH, { color: ACCENT, header });
        write(b.def, LEFT + 26, WIDTH - 26, { header });
      } else if (b.eg || b.watch) {
        const label = b.eg ? "Example" : "Watch out";
        const color = b.eg ? "#0e7490" : "#c2410c";
        need(2, header);
        const startRow = row, startPageRef = page;
        write(label, LEFT + 18, WIDTH - 18, { color, header });
        write(b.eg || b.watch, LEFT + 18, WIDTH - 18, { header });
        if (page === startPageRef) {
          page.items.push({ id: uid(), type: "shape", kind: "line", x1: LEFT + 6, y1: rowY(startRow) + 6, x2: LEFT + 6, y2: rowY(row) - 4, color, size: 3 });
        }
      }
    }

    // The hard words of the topic and what they mean, to learn at the end.
    const words = keyWords(blocks);
    if (words.length) {
      if (row > 0) row += 1;
      need(3, header);
      write("Key words", LEFT, WIDTH, { color: ACCENT, header });
      for (const { w, d } of words) write(`{word|${w}|}: ${d}`, LEFT, WIDTH, { header });
    }
  }
  if (!book.pages.length) book.pages.push(newPage(template, "white"));
  onProgress?.("Saving", 1);
  await putBook(book);
  return book.id;
}

// The words a topic marks as hard, with their meanings, in the order they come.
function keyWords(blocks) {
  const seen = new Map();
  const texts = (blocks || []).flatMap((b) => b.list || [b.h, b.p, b.def, b.eg, b.watch].filter((t) => typeof t === "string"));
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

const STOP = new Set(["the", "and", "of", "in", "a", "an", "to", "for", "on", "with", "its", "their", "how", "what", "why", "introduction", "basics", "overview", "part", "chapter", "unit", "topic"]);
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

// The top Wikipedia article for the topic, but only when its title shares a
// real word with the topic and it has a picture: a wrong picture is worse
// than none.
async function pictureFor(topic) {
  const want = words(topic);
  if (!want.length) return null;
  const q = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&srlimit=3&format=json&origin=*`).then((r) => r.json());
  for (const hit of q?.query?.search || []) {
    const title = hit.title;
    if (!words(title).some((w) => want.includes(w))) continue;
    const s = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`).then((r) => r.json());
    if (s?.type === "disambiguation" || !s?.thumbnail?.source) continue;
    const src = await shrink(s.originalimage?.width > 900 ? s.thumbnail.source.replace(/\/\d+px-/, "/640px-") : (s.originalimage?.source || s.thumbnail.source));
    if (src) return { ...src, title: s.title };
  }
  return null;
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
