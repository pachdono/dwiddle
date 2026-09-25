// Spaced repetition, offered rather than imposed.
//
// Every question answered goes into one of six boxes. Right moves it up a box
// and pushes the next look further away, one day, then two, four, a week, two
// weeks, a month; wrong sends it back to the first box, due again tomorrow. So
// what is known comes round rarely, what is shaky comes round often, and each
// look lands about when it would otherwise start to fade, which is what makes
// the spacing work.
//
// Nothing here stops anyone doing anything. The home page mentions what is
// due, Practice has a Review mode, and both can be ignored entirely.

import { load, save, KEYS } from "./store.js";

const GAPS = [1, 2, 4, 7, 14, 30]; // days until the next look, by box

const today = () => new Date().toISOString().slice(0, 10);
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const loadSrs = () => load(KEYS.srs, {});

export function recordReview(id, correct) {
  const all = loadSrs();
  const was = all[id];
  const box = correct ? Math.min((was ? was.box : 0) + 1, GAPS.length - 1) : 0;
  all[id] = { box, due: addDays(today(), GAPS[box]), seen: today() };
  save(KEYS.srs, all);
  return all;
}

// The items from a pool that are due today or overdue, most overdue first.
export function dueFrom(pool, srs = loadSrs()) {
  const now = today();
  return pool
    .filter((q) => srs[q.id] && srs[q.id].due <= now)
    .sort((a, b) => (srs[a.id].due < srs[b.id].due ? -1 : 1));
}

export const reviewOn = () => load(KEYS.srsOn, true) !== false;
export const setReviewOn = (on) => save(KEYS.srsOn, !!on);
