// How much the app does before it asks for an account.
//
// One generation without an account, so nobody has to sign up to find out
// whether the thing works. After that it asks, which is also what stops an
// anonymous visitor spending the whole quota.
//
// This is its own file because more than one page enforces it now, and a rule
// enforced from two copies of itself eventually becomes two rules.

import { load, save, KEYS } from "./store.js";

export const FREE_GENERATIONS = 1;

export function generationsLeft(user) {
  if (user) return Infinity;
  return Math.max(0, FREE_GENERATIONS - load(KEYS.freeGen, 0));
}

export function countGeneration(user) {
  if (user) return;
  save(KEYS.freeGen, load(KEYS.freeGen, 0) + 1);
}
