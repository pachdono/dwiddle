import { spreadAnswers } from "./mathText.js";
// The rules of a duel, kept apart from the screen so they can be tested.
// Everyone gets the same questions in the same order and the same number of
// seconds. A right answer is worth 100, plus up to 50 for being quick, so
// being fast only pays if you are also right. A wrong answer is worth nothing
// and costs nothing, which stops the game rewarding guessing at random.

export const BONUS_SECS = 12;
export const MAX_BONUS = 50;

export function points(right, ms) {
  if (!right) return 0;
  const left = Math.max(0, BONUS_SECS - ms / 1000) / BONUS_SECS;
  return 100 + Math.round(left * MAX_BONUS);
}

// Score first, then fewer seconds spent, then name, so a tie is never random.
export function rank(players) {
  return [...players].sort((a, b) => b.score - a.score || (a.ms || 0) - (b.ms || 0) || String(a.name).localeCompare(String(b.name)));
}

export function tally(p, right, ms) {
  return { ...p, score: p.score + points(right, ms), right: p.right + (right ? 1 : 0), answered: p.answered + 1, ms: (p.ms || 0) + ms };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // nothing that looks like another
export const newCode = (rand = Math.random) => Array.from({ length: 5 }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join("");
export const cleanCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);

// Only multiple choice, with a real answer, can be marked by the other side.
export function duelQuestions(list, n = 20) {
  const ok = (list || []).filter((q) => q && typeof q.q === "string" && Array.isArray(q.choices) && q.choices.length >= 2 && Number.isInteger(q.answer) && q.choices[q.answer] != null);
  const shuffled = [...ok].sort(() => Math.random() - 0.5).slice(0, n);
  return shuffled.map((q) => spreadAnswers(q)).map((q) => ({ q: q.q, choices: q.choices, answer: q.answer, why: q.why || "", topic: q.topic || "" }));
}
