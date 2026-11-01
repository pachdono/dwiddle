// Has this stroke been scribbled out over something? A scribble is a hard,
// tight zigzag: many sweeps back and forth, each one covering most of the width
// of the whole thing, and not moving along as it goes. Handwriting has plenty of
// turns too (m, w, e, l, cursive joins), but each is small next to the word and
// it keeps travelling one way, so it must never be mistaken for one. A light
// wiggle, a wavy line or a letter is just ink; it takes about four hard
// strokes back and forth to rub something out.

const MIN_SWEEPS = 8;     // sweeps, so four times back and forth
const MIN_SPAN = 0.55;           // each sweep covers at least this much of the width
const MIN_LENGTH = 5;            // times the diagonal, so it is dense, not a wave
const MIN_SIZE = 36;             // on screen pixels: a small squiggle is not a scribble

export function sweeps(points) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const w = x1 - x0, h = y1 - y0;
  const k = w >= h ? 0 : 1, extent = Math.max(w, h);
  if (extent <= 0) return { extent: 0, legs: [] };
  const turn = extent * 0.25; // a reversal this big counts as a turn
  const legs = [];
  let dir = 0, ext = points[0][k], start = points[0][k];
  for (const p of points) {
    const v = p[k];
    if (!dir) { if (Math.abs(v - start) >= turn) { dir = Math.sign(v - start); ext = v; } continue; }
    if ((v - ext) * dir > 0) ext = v;                 // still going the same way
    else if (Math.abs(v - ext) >= turn) {              // turned back far enough
      legs.push(Math.abs(ext - start));
      start = ext; ext = v; dir = -dir;
    }
  }
  if (dir) legs.push(Math.abs(ext - start)); // the last sweep, which has no turn after it
  return { extent, legs };
}

export function isScribble(points, zoom = 1) {
  if (!points || points.length < 20) return false;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, len = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    if (i) len += Math.hypot(x - points[i - 1][0], y - points[i - 1][1]);
  }
  const diag = Math.hypot(x1 - x0, y1 - y0);
  if (diag * zoom < MIN_SIZE || len < diag * MIN_LENGTH) return false;
  const { extent, legs } = sweeps(points);
  return legs.filter((l) => l >= extent * MIN_SPAN).length >= MIN_SWEEPS;
}
