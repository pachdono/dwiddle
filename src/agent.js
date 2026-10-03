// What Dwiddle can do for the student, beyond answering.
//
// The chat model proposes actions ({ type: "notes", ... }); nothing it says is
// trusted. Each action is checked here and only the known kinds run, through
// handlers the App registers. Every action reports back what happened, so the
// chat can say what was done and what was not.

import { cleanSketch, cleanSvg } from "./sketch.js";
import { THEMES } from "./themes.js";
import { blockPlain } from "./marks.js";

let handlers = null;
export const setAgentHandlers = (h) => { handlers = h; };

const PAGES = ["home", "topics", "quiz", "chat", "sheet", "learn", "videos", "courses", "notebook", "upload", "library", "settings", "decks"];
const str = (v, n) => (typeof v === "string" ? v.replace(/[–—]/g, "-").trim().slice(0, n) : "");

// One notes block, checked and trimmed, or null.
export function cleanBlock(b) {
  if (!b || typeof b !== "object") return null;
  for (const k of ["h", "p", "eg", "watch"]) if (str(b[k], 1500)) return { [k]: str(b[k], 1500) };
  if (str(b.term, 100)) return { term: str(b.term, 100), def: str(b.def, 600) };
  if (Array.isArray(b.list)) { const list = b.list.map((x) => str(x, 400)).filter(Boolean).slice(0, 12); return list.length ? { list } : null; }
  if (b.table && Array.isArray(b.table.head) && Array.isArray(b.table.rows)) {
    const head = b.table.head.map((x) => str(x, 60)).slice(0, 5);
    const rows = b.table.rows.slice(0, 10).map((r) => (Array.isArray(r) ? head.map((_, i) => str(r[i], 120)) : null)).filter(Boolean);
    return rows.length && head.length > 1 ? { table: { head, rows } } : null;
  }
  if (b.flow && Array.isArray(b.flow.steps)) {
    const steps = b.flow.steps.map((x) => str(x, 160)).filter(Boolean).slice(0, 8);
    return steps.length >= 2 ? { flow: { title: str(b.flow.title, 100), steps, cycle: b.flow.cycle === true } } : null;
  }
  if (str(b.pic, 80)) return { pic: str(b.pic, 80) };
  if (b.sketch) { const s = cleanSketch(b.sketch); return s ? { sketch: s } : null; }
  return null;
}

// What the model is told about the app: where the student is, their notes with
// each block numbered so it can be changed, and the looks that exist.
export function appState() {
  const st = handlers?.state?.() || {};
  const out = [`Page: ${st.page || "unknown"}.`, `Colour mode: ${st.theme || "system"}. Looks: ${THEMES.map((t) => t.id).join(", ")}. Current look: ${st.look || "classic"}.`];
  const made = st.made;
  if (made?.topics?.length) {
    out.push(`Study material: "${made.title || "untitled"}".`);
    for (const t of made.topics) {
      const blocks = made.notes?.[t.name] || [];
      out.push(`\n## ${t.name}${blocks.length ? "" : " (no notes yet)"}`);
      blocks.forEach((b, i) => { const text = blockPlain(b).replace(/\{(?:key|def|exam|word)\|([^}|]*)[^}]*\}/g, "$1").replace(/\s+/g, " ").slice(0, 160); if (text) out.push(`[${i}] ${text}`); });
    }
  } else out.push("No study material yet.");
  return out.join("\n").slice(0, 8500);
}

// Runs one action. Returns { ok, text, art? } where art is something to show
// in the chat: { sketch } | { svg, caption } | { query } for a picture.
async function run(a) {
  const h = handlers;
  if (!h) return { ok: false, text: "Not ready yet" };
  switch (a.type) {
    case "go": {
      if (!PAGES.includes(a.page)) return { ok: false, text: "Unknown page" };
      h.go(a.page);
      return { ok: true, text: `Opened ${a.page === "quiz" ? "Practice" : a.page === "sheet" ? "Notes" : a.page === "upload" ? "Add material" : a.page}` };
    }
    case "theme": {
      if (!["light", "dark", "system"].includes(a.mode)) return { ok: false, text: "Unknown colour mode" };
      h.setTheme(a.mode);
      return { ok: true, text: `Switched to ${a.mode} mode` };
    }
    case "look": {
      const t = THEMES.find((x) => x.id === a.id);
      if (!t) return { ok: false, text: "Unknown look" };
      h.setLook(t.id);
      return { ok: true, text: `Changed the look to ${t.name}` };
    }
    case "make": {
      const text = str(a.text, 4000);
      if (!text) return { ok: false, text: "Nothing to make" };
      h.prefill(text);
      return { ok: true, text: "Filled in Add material" };
    }
    case "sketch": {
      const sketch = cleanSketch(a.sketch);
      if (!sketch) return { ok: false, text: "Could not draw that graph" };
      let text = "Drew a graph";
      if (a.topic) {
        const done = h.editNotes({ op: "insert", topic: String(a.topic), at: 9999, block: { sketch } });
        text = done ? `Drew a graph and added it to ${a.topic}` : text;
      }
      return { ok: true, text, art: { sketch } };
    }
    case "draw": {
      const svg = cleanSvg(a.svg);
      if (!svg) return { ok: false, text: "Could not draw that" };
      return { ok: true, text: "Drew a picture", art: { svg, caption: str(a.caption, 80) } };
    }
    case "picture": {
      const query = str(a.query, 80);
      return query ? { ok: true, text: "Found a picture", art: { query } } : { ok: false, text: "No picture" };
    }
    case "notes": {
      const op = a.op;
      if (!["insert", "replace", "remove"].includes(op)) return { ok: false, text: "Unknown change" };
      const block = op === "remove" ? null : cleanBlock(a.block);
      if (op !== "remove" && !block) return { ok: false, text: "That note block was not valid" };
      const at = Number.isInteger(a.at) ? a.at : parseInt(a.at, 10);
      if (!Number.isInteger(at) || at < 0) return { ok: false, text: "No place given" };
      const done = h.editNotes({ op, topic: String(a.topic || ""), at, block });
      return done ? { ok: true, text: `${op === "remove" ? "Removed a block from" : op === "replace" ? "Rewrote a block in" : "Added to"} ${done}` } : { ok: false, text: "Could not find that topic" };
    }
    default:
      return { ok: false, text: "Not something I can do yet" };
  }
}

export async function runActions(actions) {
  const results = [];
  for (const a of (Array.isArray(actions) ? actions : []).slice(0, 4)) {
    try { results.push(await run(a)); } catch { results.push({ ok: false, text: "That did not work" }); }
  }
  return results;
}
