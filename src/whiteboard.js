// The rules of the shared whiteboard, kept apart from the screen so they can
// be tested. Everyone holds the same list of strokes and changes it with the
// same few messages, so two screens that have heard the same messages agree.
// Nothing is stored: a friend who joins late asks the room and is sent the lot.

export const W = 1600; // the board is a fixed 1600 by 1000 page, scaled to fit
export const H = 1000;
export const COLOURS = ["#16161a", "#d93a3a", "#e8863a", "#2f9e6b", "#2f6fe0", "#8a4fd8"];
export const SIZES = [4, 10, 22];
export const MAX_STROKES = 600; // the oldest go first, so a long session stays quick
const MIN_STEP = 3; // points closer than this add nothing the eye can see

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v) => (Number.isFinite(v) ? Math.round(v) : 0);

export const newStrokeId = (me, rand = Math.random) => me.slice(0, 6) + "-" + Date.now().toString(36) + Math.floor(rand() * 1296).toString(36);

// Drop points that barely moved. The last point is always kept so a short
// flick still ends where the pen lifted.
export function thin(pts, step = MIN_STEP) {
  if (pts.length <= 4) return pts;
  const out = [pts[0], pts[1]];
  for (let i = 2; i < pts.length - 2; i += 2) {
    if (Math.hypot(pts[i] - out[out.length - 2], pts[i + 1] - out[out.length - 1]) >= step) out.push(pts[i], pts[i + 1]);
  }
  out.push(pts[pts.length - 2], pts[pts.length - 1]);
  return out;
}

// Whatever arrives from the wire is a claim, not a fact: keep only what a
// stroke needs and bound it, so one bad message cannot break every screen.
export function cleanStroke(s) {
  if (!s || typeof s.id !== "string" || !Array.isArray(s.pts)) return null;
  const pts = s.pts.slice(0, 20000).map((v, i) => clamp(num(v), 0, i % 2 ? H : W));
  if (pts.length % 2) pts.pop();
  if (pts.length < 2) return null;
  return {
    id: s.id.slice(0, 40),
    by: typeof s.by === "string" ? s.by.slice(0, 40) : "",
    c: COLOURS.includes(s.c) ? s.c : COLOURS[0],
    w: clamp(num(s.w) || SIZES[0], 1, 60),
    pts,
  };
}

const trim = (list) => (list.length > MAX_STROKES ? list.slice(list.length - MAX_STROKES) : list);

// One message in, the new list of strokes out. The list is never changed in
// place, so a screen can hand it straight to its state.
//   seg   more points on a stroke (the first one starts it)
//   del   rub out these strokes, by id
//   clear wipe the board
//   sync  a whole board for someone who has just arrived
export function apply(strokes, kind, p) {
  if (kind === "seg") {
    const add = cleanStroke(p);
    if (!add) return strokes;
    const i = strokes.findIndex((s) => s.id === add.id);
    if (i < 0) return trim([...strokes, add]);
    const next = strokes.slice();
    next[i] = { ...next[i], pts: [...next[i].pts, ...add.pts].slice(0, 20000) };
    return next;
  }
  if (kind === "del") {
    const gone = new Set(Array.isArray(p?.ids) ? p.ids : []);
    const kept = strokes.filter((s) => !gone.has(s.id));
    return kept.length === strokes.length ? strokes : kept;
  }
  if (kind === "clear") return strokes.length ? [] : strokes;
  if (kind === "sync") {
    // Keep what we already drew, add what we are missing, in their order.
    const have = new Set(strokes.map((s) => s.id));
    const theirs = (Array.isArray(p?.strokes) ? p.strokes : []).map(cleanStroke).filter((s) => s && !have.has(s.id));
    return theirs.length ? trim([...theirs, ...strokes]) : strokes;
  }
  return strokes;
}

// Is a point within reach of a stroke? Used by the eraser, which removes a
// whole stroke at a time so every screen can agree on what went.
export function hits(stroke, x, y, reach = 16) {
  const r = reach + stroke.w / 2;
  const p = stroke.pts;
  if (p.length === 2) return Math.hypot(p[0] - x, p[1] - y) <= r;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const [ax, ay, bx, by] = [p[i], p[i + 1], p[i + 2], p[i + 3]];
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? clamp(((x - ax) * dx + (y - ay) * dy) / len, 0, 1) : 0;
    if (Math.hypot(ax + t * dx - x, ay + t * dy - y) <= r) return true;
  }
  return false;
}

export const touching = (strokes, x, y, reach) => strokes.filter((s) => hits(s, x, y, reach)).map((s) => s.id);

// A friendly colour for each person's cursor, the same on every screen.
const HUES = ["#d93a3a", "#2f6fe0", "#2f9e6b", "#e8863a", "#8a4fd8", "#c2528f"];
export function personColour(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}
