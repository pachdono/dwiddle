// The highlights written into notes text.
//
//   {def|...}   wording to learn word for word
//   {key|...}   a fact, figure, name or date to memorise
//   {exam|...}  where marks are lost
//   {word|term|meaning}  a technical or hard word, with a short meaning that
//                        pops up when it is tapped
//
// Every place that reads notes text goes through here, so a new kind of mark
// never leaks its braces into a lesson, a podcast or the chat.

export const MARK = /\{(def|key|exam)\|([^{}]*)\}|\{word\|([^{}|]*)\|([^{}]*)\}/g;

export const flatMarks = (t) => String(t || "").replace(MARK, (_, k, a, w) => (k ? a : w));

// Segments of plain and marked text: { t } or { t, mark } or { t, mark: "word", def }.
export function parseMarks(text) {
  const s = String(text || "");
  const out = [];
  let last = 0;
  s.replace(MARK, (whole, kind, t, w, def, at) => {
    if (at > last) out.push({ t: s.slice(last, at) });
    out.push(kind ? { t, mark: kind } : { t: w, mark: "word", def: def.trim() });
    last = at + whole.length;
    return whole;
  });
  if (last < s.length) out.push({ t: s.slice(last) });
  return out;
}

// A block of notes as plain text, whatever kind it is, for the chat, lessons,
// the podcast and the mind map.
export function blockPlain(b) {
  if (!b || typeof b !== "object") return "";
  if (b.term) return `${flatMarks(b.term)}: ${flatMarks(b.def)}`;
  if (Array.isArray(b.list)) return b.list.map((x) => "- " + flatMarks(x)).join("\n");
  if (b.table) {
    const rows = [b.table.head || [], ...(b.table.rows || [])];
    return rows.map((r) => r.map(flatMarks).join(" | ")).join("\n");
  }
  if (b.flow) return (b.flow.title ? flatMarks(b.flow.title) + ": " : "") + (b.flow.steps || []).map(flatMarks).join(" → ") + (b.flow.cycle ? " → (repeats)" : "");
  if (b.pic) return `(picture of ${b.pic})`;
  if (b.sketch) return `(hand drawn graph: ${b.sketch.title || ""} ${b.sketch.y || ""} against ${b.sketch.x || ""})`;
  const v = b.h ?? b.p ?? b.eg ?? b.watch;
  return typeof v === "string" ? flatMarks(v) : "";
}

// Every piece of marked text in a block, for counting highlights and finding
// the hard words it defines.
export function blockTexts(b) {
  if (!b || typeof b !== "object") return [];
  if (b.term) return [b.def];
  if (Array.isArray(b.list)) return b.list;
  if (b.table) return [...(b.table.head || []), ...(b.table.rows || []).flat()];
  if (b.flow) return b.flow.steps || [];
  const v = b.h ?? b.p ?? b.eg ?? b.watch;
  return typeof v === "string" ? [v] : [];
}
