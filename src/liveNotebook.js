// Editing one notebook together, live. Kept apart from the screen so it can be
// tested.
//
// Each person keeps their own copy of the notebook. What travels between them
// is not the notebook but the small changes made to it: an item added or
// changed, an item removed, a page added or taken out, a new title. The
// changes are found by comparing the notebook with the last state both sides
// agreed on (diffBooks) and replayed on the other side (applyOps). Two people
// working on different things never meet; if both change the very same item,
// the last change to arrive wins.
//
// Nothing here stores anything. A notebook that is joined is saved on the
// joiner's device like any other, so it stays theirs afterwards.

const ITEM_TYPES = ["stroke", "shape", "graph", "image", "text"];
export const MAX_PIECE = 150000; // characters per message, well under the room's message limit
const MAX_ITEM = 12000000; // an item bigger than this is not accepted
const META = ["title", "cover", "template", "paper"];
const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");

// Same value, or the same bits inside: cheap, because most items are the very
// same object as before and the ones that are not differ in a field or two.
function sameItem(a, b) {
  if (a === b) return true;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a[k] !== b[k] && !sameValue(a[k], b[k])) return false;
  return true;
}
// a list of points that was rebuilt but holds the same numbers is not a change
function sameValue(x, y) {
  if (!x || !y || typeof x !== "object" || typeof y !== "object") return false;
  try { return JSON.stringify(x) === JSON.stringify(y); } catch { return false; }
}
const pageRest = ({ items, ...rest }) => rest; // eslint-disable-line no-unused-vars
function samePage(a, b) {
  if (a === b) return true;
  const ra = pageRest(a), rb = pageRest(b);
  const ka = Object.keys(ra), kb = Object.keys(rb);
  return ka.length === kb.length && ka.every((k) => ra[k] === rb[k]);
}

// What changed going from one notebook to another, as a list of small ops.
export function diffBooks(a, b) {
  const ops = [];
  const meta = {};
  for (const k of META) if (a?.[k] !== b?.[k]) meta[k] = b?.[k];
  if (Object.keys(meta).length) ops.push({ t: "meta", meta });

  const before = new Map((a?.pages || []).map((p) => [p.id, p]));
  const afterIds = (b?.pages || []).map((p) => p.id);
  for (const p of b?.pages || []) {
    const old = before.get(p.id);
    if (!old || !samePage(old, p)) ops.push({ t: "page", page: pageRest(p) });
  }
  const beforeIds = (a?.pages || []).map((p) => p.id);
  if (afterIds.join() !== beforeIds.join()) ops.push({ t: "pages", order: afterIds });

  for (const p of b?.pages || []) {
    const old = before.get(p.id);
    const oldItems = new Map((old?.items || []).map((i) => [i.id, i]));
    const nowIds = new Set();
    for (const it of p.items || []) {
      nowIds.add(it.id);
      const was = oldItems.get(it.id);
      if (!was || !sameItem(was, it)) ops.push({ t: "item", p: p.id, item: it });
    }
    const gone = [...oldItems.keys()].filter((id) => !nowIds.has(id));
    if (gone.length) ops.push({ t: "rm", p: p.id, ids: gone });
    // z order matters: send it when the order of what was already there changed
    // or something new went somewhere other than the end
    const kept = (old?.items || []).map((i) => i.id).filter((id) => nowIds.has(id));
    const expected = [...kept, ...(p.items || []).map((i) => i.id).filter((id) => !oldItems.has(id))];
    const actual = (p.items || []).map((i) => i.id);
    if (expected.join() !== actual.join()) ops.push({ t: "order", p: p.id, ids: actual });
  }
  return ops;
}

// Everything in a notebook, as ops, for someone who is just arriving.
export const fullOps = (book) => diffBooks({ pages: [] }, book);

// Anything that arrives is a claim, not a fact. Keep only what the notebook
// understands, and refuse what could be harmful when drawn.
export function cleanItem(it) {
  if (!it || typeof it !== "object" || typeof it.id !== "string" || !ITEM_TYPES.includes(it.type)) return null;
  if (it.type === "image" && !(typeof it.src === "string" && /^(data:image\/(png|jpe?g|webp|gif);base64,|https:\/\/)/.test(it.src))) return null;
  if (it.crop && it.type === "image" && !(typeof it.crop === "object")) return null;
  let size = 0;
  try { size = JSON.stringify(it).length; } catch { return null; }
  return size <= MAX_ITEM ? { ...it, id: it.id.slice(0, 40) } : null;
}
function cleanPage(p) {
  if (!p || typeof p !== "object" || typeof p.id !== "string") return null;
  const { items, ...rest } = p; // eslint-disable-line no-unused-vars
  if (rest.bg !== undefined && !(typeof rest.bg === "string" && /^(data:image\/|https:\/\/)/.test(rest.bg))) delete rest.bg;
  return { ...rest, id: p.id.slice(0, 40) };
}

// Replay ops on a notebook. Never changes the one it is given, and keeps every
// object it did not touch, so comparing afterwards stays cheap.
export function applyOps(book, ops) {
  if (!book || !Array.isArray(book.pages)) return book;
  let out = book;
  for (const op of Array.isArray(ops) ? ops : []) {
    if (!op || typeof op !== "object") continue;
    if (op.t === "meta" && op.meta && typeof op.meta === "object") {
      const m = {};
      for (const k of META) if (k in op.meta) m[k] = str(op.meta[k], 200);
      out = { ...out, ...m };
    } else if (op.t === "page") {
      const pg = cleanPage(op.page);
      if (!pg) continue;
      const has = out.pages.some((x) => x.id === pg.id);
      if (has) { out = { ...out, pages: out.pages.map((x) => (x.id === pg.id ? { ...x, ...pg } : x)) }; continue; }
      // a page that comes back (undo) goes after the one it followed, else first
      const at = typeof op.after === "string" ? out.pages.findIndex((x) => x.id === op.after) + 1 : op.after === null ? 0 : out.pages.length;
      const pages = out.pages.slice();
      pages.splice(at, 0, { ...pg, items: [] });
      out = { ...out, pages };
    } else if (op.t === "dropPage" && typeof op.id === "string") {
      if (out.pages.length > 1 && out.pages.some((x) => x.id === op.id)) out = { ...out, pages: out.pages.filter((x) => x.id !== op.id) };
    } else if (op.t === "pages" && Array.isArray(op.order)) {
      const byId = new Map(out.pages.map((x) => [x.id, x]));
      // the new order, and anything that is not in it goes when the sender removed it
      const next = op.order.map((id) => byId.get(id)).filter(Boolean);
      // pages the order does not name stay, after the named ones
      const named = new Set(op.order);
      const rest = op.keep ? out.pages.filter((x) => !named.has(x.id)) : [];
      if (next.length) out = { ...out, pages: [...next, ...rest] };
    } else if (op.t === "item") {
      const it = cleanItem(op.item);
      if (!it || !out.pages.some((x) => x.id === op.p)) continue;
      out = { ...out, pages: out.pages.map((x) => {
        if (x.id !== op.p) return x;
        const i = x.items.findIndex((y) => y.id === it.id);
        return { ...x, items: i < 0 ? [...x.items, it] : x.items.map((y, n) => (n === i ? it : y)) };
      }) };
    } else if (op.t === "rm" && Array.isArray(op.ids)) {
      const gone = new Set(op.ids);
      out = { ...out, pages: out.pages.map((x) => (x.id === op.p && x.items.some((y) => gone.has(y.id)) ? { ...x, items: x.items.filter((y) => !gone.has(y.id)) } : x)) };
    } else if (op.t === "order" && Array.isArray(op.ids)) {
      out = { ...out, pages: out.pages.map((x) => {
        if (x.id !== op.p) return x;
        const rank = new Map(op.ids.map((id, n) => [id, n]));
        const sorted = [...x.items].sort((a, b) => (rank.has(a.id) ? rank.get(a.id) : 1e9) - (rank.has(b.id) ? rank.get(b.id) : 1e9));
        return sorted.every((y, n) => y === x.items[n]) ? x : { ...x, items: sorted };
      }) };
    }
  }
  return out;
}

// The ops that take back one change, and only that change: what changed going
// from `before` to `after`, restored to how it was. They are meant to be
// applied to a notebook that has moved on since, so they name exactly the
// things that change touched and leave everything else (other people's work)
// alone. Used for undo, so each person undoes only their own changes.
export function invertDiff(before, after) {
  const ops = [];
  const meta = {};
  for (const k of META) if (before?.[k] !== after?.[k]) meta[k] = before?.[k];
  if (Object.keys(meta).length) ops.push({ t: "meta", meta });

  const was = new Map((before?.pages || []).map((p) => [p.id, p]));
  const is = new Map((after?.pages || []).map((p) => [p.id, p]));
  const wasIds = (before?.pages || []).map((p) => p.id);
  for (const [id, p] of is) {
    if (!was.has(id)) ops.push({ t: "dropPage", id });
    else if (!samePage(was.get(id), p)) ops.push({ t: "page", page: pageRest(was.get(id)) });
  }
  for (const [id, p] of was) {
    if (is.has(id)) continue;
    const i = wasIds.indexOf(id);
    ops.push({ t: "page", page: pageRest(p), after: i > 0 ? wasIds[i - 1] : null });
    for (const it of p.items || []) ops.push({ t: "item", p: id, item: it });
    ops.push({ t: "order", p: id, ids: (p.items || []).map((i2) => i2.id) });
  }
  const sameSet = wasIds.length === is.size && wasIds.every((id) => is.has(id));
  if (sameSet && wasIds.join() !== (after?.pages || []).map((p) => p.id).join()) ops.push({ t: "pages", order: wasIds, keep: true });

  for (const [id, p] of is) {
    const old = was.get(id);
    if (!old) continue;
    const oldItems = new Map((old.items || []).map((i) => [i.id, i]));
    const nowItems = new Map((p.items || []).map((i) => [i.id, i]));
    const added = [...nowItems.keys()].filter((k) => !oldItems.has(k));
    if (added.length) ops.push({ t: "rm", p: id, ids: added });
    for (const [k, o] of oldItems) if (!nowItems.has(k) || !sameItem(o, nowItems.get(k))) ops.push({ t: "item", p: id, item: o });
    const order = (old.items || []).map((i) => i.id);
    const nowOrder = (p.items || []).map((i) => i.id).filter((k) => oldItems.has(k));
    if (order.some((k) => !nowItems.has(k)) || order.filter((k) => nowItems.has(k)).join() !== nowOrder.join()) ops.push({ t: "order", p: id, ids: order });
  }
  return ops;
}

// Merge ops waiting to go: a later change to the same thing replaces the
// earlier one, so a stroke dragged across the page sends where it ended up.
export function mergeOps(list) {
  const out = [];
  const at = new Map();
  for (const op of list) {
    const key = op.t === "item" ? `i:${op.p}:${op.item?.id}` : op.t === "page" ? `p:${op.page?.id}` : op.t === "order" ? `o:${op.p}` : op.t === "meta" || op.t === "pages" ? op.t : null;
    if (key && at.has(key)) {
      if (op.t === "meta") out[at.get(key)] = { t: "meta", meta: { ...out[at.get(key)].meta, ...op.meta } };
      else out[at.get(key)] = op;
    } else { if (key) at.set(key, out.length); out.push(op); }
  }
  return out;
}

/* ---------- getting big things through a small pipe ---------- */

// A message is sent whole if it is small, otherwise as numbered pieces that
// the other side puts back together. A piece is a plain slice of text.
export function split(text, mid, size = MAX_PIECE) {
  if (text.length <= size) return [{ whole: text }];
  const n = Math.ceil(text.length / size);
  return Array.from({ length: n }, (_, i) => ({ mid, i, n, s: text.slice(i * size, (i + 1) * size) }));
}

export class Joiner {
  constructor(limit = MAX_ITEM * 2) { this.parts = new Map(); this.limit = limit; }
  // returns the whole text when the last piece arrives, otherwise null
  add(p) {
    if (!p || typeof p !== "object") return null;
    if (typeof p.whole === "string") return p.whole;
    if (typeof p.mid !== "string" || !Number.isInteger(p.i) || !Number.isInteger(p.n) || p.n < 1 || p.n > 400 || p.i < 0 || p.i >= p.n || typeof p.s !== "string") return null;
    let e = this.parts.get(p.mid);
    if (!e) { e = { n: p.n, got: new Map(), size: 0 }; this.parts.set(p.mid, e); if (this.parts.size > 50) this.parts.delete(this.parts.keys().next().value); }
    if (e.n !== p.n || e.got.has(p.i)) return null;
    e.size += p.s.length;
    if (e.size > this.limit) { this.parts.delete(p.mid); return null; }
    e.got.set(p.i, p.s);
    if (e.got.size < e.n) return null;
    this.parts.delete(p.mid);
    return Array.from({ length: e.n }, (_, i) => e.got.get(i)).join("");
  }
}

/* ---------- who is here ---------- */

// A colour for each person, the same on every screen, so a cursor and the
// circle for the same person always match.
const HUES = ["#d93a3a", "#2f6fe0", "#2f9e6b", "#e8863a", "#8a4fd8", "#c2528f", "#0e9aa7", "#b8860b"];
export function personColour(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}
export const initials = (name) => {
  const w = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] || "?") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};

// A pointer position from another person. Numbers are clamped so a bad message
// cannot put a cursor off the page or break the drawing.
export function cleanCursor(c) {
  if (!c || typeof c !== "object" || typeof c.id !== "string" || typeof c.p !== "string") return null;
  const x = Number(c.x), y = Number(c.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { id: c.id.slice(0, 40), name: String(c.name || "Guest").slice(0, 30), p: c.p.slice(0, 40), x: Math.max(0, Math.min(5000, x)), y: Math.max(0, Math.min(8000, y)) };
}
