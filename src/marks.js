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
