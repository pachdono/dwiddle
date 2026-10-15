// The rules of the shared whiteboard, kept apart from the screen so they can
// be tested. Everyone holds the same list of strokes and changes it with the
// same few messages, so two screens that have heard the same messages agree.
// Nothing is stored: a friend who joins late asks the room and is sent the lot.

export const W = 1600; // the board is a fixed 1600 by 1000 page, scaled to fit
export const H = 1000;
export const COLOURS = ["#16161a", "#d93a3a", "#e8863a", "#2f9e6b", "#2f6fe0", "#8a4fd8"];
export const SIZES = [4, 10, 22];
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

// One message in, the new list of strokes out. The list is never changed in
// place, so a screen can hand it straight to its state.
//   seg   more points on a stroke (the first one starts it)
//   del   remove these strokes, by id (undo)
//   cut   the eraser went through these strokes: each is replaced by the
//         pieces that are left, so only the part rubbed out disappears
//   clear wipe the board
//   sync  a whole board for someone who has just arrived
export function apply(strokes, kind, p) {
  if (kind === "seg") {
    const add = cleanStroke(p);
    if (!add) return strokes;
    const i = strokes.findIndex((s) => s.id === add.id);
    if (i < 0) return [...strokes, add];
    const next = strokes.slice();
    next[i] = { ...next[i], pts: [...next[i].pts, ...add.pts].slice(0, 20000) };
    return next;
  }
  if (kind === "del") {
    const gone = new Set(Array.isArray(p?.ids) ? p.ids : []);
    const kept = strokes.filter((s) => !gone.has(s.id));
    return kept.length === strokes.length ? strokes : kept;
  }
  if (kind === "cut") {
    // in order, because a later cut can name a piece an earlier one made
    let list = strokes;
    for (const c of (Array.isArray(p?.cuts) ? p.cuts : []).slice(0, 500)) {
      if (!c || typeof c.id !== "string" || !Array.isArray(c.pieces) || !list.some((s) => s.id === c.id)) continue;
      const next = [];
      for (const s of list) {
        if (s.id !== c.id) { next.push(s); continue; }
        c.pieces.slice(0, 200).forEach((pts, k) => {
          const piece = cleanStroke({ ...s, id: s.id + "~" + k, pts });
          if (piece) next.push(piece);
        });
      }
      list = next;
    }
    return list;
  }
  if (kind === "clear") return strokes.length ? [] : strokes;
  if (kind === "sync") {
    // Keep what we already drew, add what we are missing, in their order.
    const have = new Set(strokes.map((s) => s.id));
    const theirs = (Array.isArray(p?.strokes) ? p.strokes : []).map(cleanStroke).filter((s) => s && !have.has(s.id));
    return theirs.length ? [...theirs, ...strokes] : strokes;
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

// The drawing a stroke belongs to, so undo takes back a whole line even after
// the eraser has cut it into pieces.
export const baseId = (id) => String(id).split("~")[0];

// Rub a round eraser at (x, y) through a stroke. Returns null if it missed,
// otherwise the pieces left (each a flat list of points, possibly none).
export function cutOut(stroke, x, y, reach = 16) {
  const r = reach + stroke.w / 2;
  const p = stroke.pts;
  // fill in long gaps so the eraser cannot slip between two far apart points
  const dense = [];
  for (let i = 0; i < p.length; i += 2) {
    if (i) {
      const [ax, ay] = [p[i - 2], p[i - 1]];
      const n = Math.floor(Math.hypot(p[i] - ax, p[i + 1] - ay) / 4);
      for (let k = 1; k <= n; k++) dense.push(ax + ((p[i] - ax) * k) / (n + 1), ay + ((p[i + 1] - ay) * k) / (n + 1));
    }
    dense.push(p[i], p[i + 1]);
  }
  const pieces = [];
  let run = [], touched = false;
  const close = () => { if (run.length) pieces.push(run.length === 2 ? [run[0], run[1], run[0], run[1]] : run); run = []; };
  for (let i = 0; i < dense.length; i += 2) {
    if (Math.hypot(dense[i] - x, dense[i + 1] - y) <= r) { touched = true; close(); }
    else run.push(Math.round(dense[i]), Math.round(dense[i + 1]));
  }
  close();
  return touched ? pieces : null;
}

export const touching = (strokes, x, y, reach) => strokes.filter((s) => hits(s, x, y, reach)).map((s) => s.id);

// A friendly colour for each person's cursor, the same on every screen.
const HUES = ["#d93a3a", "#2f6fe0", "#2f9e6b", "#e8863a", "#8a4fd8", "#c2528f"];
export function personColour(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

/* ---------- the chat beside the board ---------- */

// Messages ride the same room channel as the strokes and are kept the same way:
// nothing is stored, and someone arriving late is sent what was said. A photo or
// file travels inside its message, so both are kept small.
export const CHAT_TEXT = 1000;
export const CHAT_DATA = 200000; // characters of data URL, about 150 KB of file
export const CHAT_FILE_BYTES = 140 * 1024;
const short = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");

export function cleanChat(m) {
  if (!m || typeof m.id !== "string" || typeof m.by !== "string") return null;
  const kind = m.kind === "image" || m.kind === "file" ? m.kind : "text";
  const out = { id: short(m.id, 40), by: short(m.by, 40), name: short(m.name, 30) || "Guest", at: Number.isFinite(m.at) ? m.at : 0, kind, body: short(m.body, CHAT_TEXT) };
  if (m.reply && typeof m.reply === "object") out.reply = { from: short(m.reply.from, 30), text: short(m.reply.text, 120) };
  if (kind !== "text") {
    const data = typeof m.data === "string" && m.data.length <= CHAT_DATA ? m.data : ""; // never a cut off file
    if (!/^data:[\w.+-]+\/[\w.+-]+(;[\w=.+-]+)*;base64,/.test(data) || (kind === "image" && !data.startsWith("data:image/"))) return null;
    out.data = data;
    out.attach = { name: short(m.attach?.name, 120) || (kind === "image" ? "photo" : "file"), size: Number(m.attach?.size) || 0 };
  } else if (!out.body.trim()) return null;
  return out;
}

// msg: someone said something. del: the person who said it took it back.
// sync: the history, for someone who has just arrived.
export function applyChat(list, kind, p) {
  if (kind === "msg") {
    const m = cleanChat(p);
    return m && !list.some((x) => x.id === m.id) ? [...list, m] : list;
  }
  if (kind === "del") {
    // only the author can take a message back
    const next = list.filter((x) => !(x.id === p?.id && x.by === p?.by));
    return next.length === list.length ? list : next;
  }
  if (kind === "sync") {
    const have = new Set(list.map((x) => x.id));
    const theirs = (Array.isArray(p?.msgs) ? p.msgs : []).map(cleanChat).filter((m) => m && !have.has(m.id));
    return theirs.length ? [...list, ...theirs].sort((a, b) => a.at - b.at) : list;
  }
  return list;
}

// The history in pieces small enough to send, newest kept if it must be cut.
export function chatBatches(list, limit = 220000) {
  const out = [];
  let cur = [], size = 0;
  for (const m of list) {
    const n = JSON.stringify(m).length;
    if (cur.length && size + n > limit) { out.push(cur); cur = []; size = 0; }
    cur.push(m); size += n;
  }
  if (cur.length) out.push(cur);
  return out;
}
