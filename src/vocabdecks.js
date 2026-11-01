// A vocabulary set: about 700 words, written in eight batches and kept as four
// decks that get harder, for someone whose results show vocabulary is the
// weak spot. Words are written by the model, so what is kept here is only
// what can be checked: a single word, a meaning, no repeats.

import { load, save } from "./store.js";

const DECKS_KEY = "dwiddle-decks";

export const TIERS = [
  { tier: 1, name: "Vocabulary 1: Everyday strong words", color: "#16a34a", about: "Words that turn up in almost every reading passage" },
  { tier: 2, name: "Vocabulary 2: Core test words", color: "#0891b2", about: "The words standardised tests lean on most" },
  { tier: 3, name: "Vocabulary 3: Stretch words", color: "#9333ea", about: "Harder words that separate a good score from a great one" },
  { tier: 4, name: "Vocabulary 4: Advanced words", color: "#f97316", about: "Rare and precise words, for the top of the range" },
];
// each tier is two batches, one for words A to L and one for M to Z, so batches
// written side by side cannot hand back the same words
export const BATCHES = TIERS.flatMap((t) => [1, 2].map((half) => ({ tier: t.tier, half, count: 92 })));
const HALF_RANGE = { 1: /^[a-l]/i, 2: /^[m-z]/i };

// Words from the server are checked before they are kept.
export function cleanWords(list, half, avoid = new Set()) {
  const out = [];
  const seen = new Set(avoid);
  for (const w of Array.isArray(list) ? list : []) {
    const word = String(w?.word || "").trim().toLowerCase();
    const meaning = String(w?.meaning || "").trim().replace(/\s*[–—]\s*/g, ", ").replace(/\s*;\s*/g, ", ");
    if (!/^[a-z][a-z'-]{1,23}$/.test(word) || seen.has(word)) continue;
    if (half && !HALF_RANGE[half].test(word)) continue;
    if (meaning.length < 3 || meaning.length > 160) continue;
    seen.add(word);
    out.push({ word, meaning });
  }
  return out;
}

// results: [{ tier, half, words }] in any order. No word is in two decks.
export function buildDecks(results, cap = 180) {
  const used = new Set();
  return TIERS.map((t) => {
    const words = [];
    for (const r of results.filter((x) => x.tier === t.tier)) {
      for (const w of r.words || []) {
        if (used.has(w.word)) continue;
        used.add(w.word);
        words.push(w);
      }
    }
    return { ...t, words: words.sort((a, b) => a.word.localeCompare(b.word)).slice(0, cap) };
  }).filter((d) => d.words.length >= 30);
}

const uid = () => Math.random().toString(36).slice(2, 10);

// Adds decks to My decks. parse turns "word ; meaning" lines into cards with
// their stable ids, the way the deck editor does.
export function addDecks(decks, parse, now = Date.now()) {
  const existing = load(DECKS_KEY, []);
  const made = decks.map((d, n) => ({
    id: uid(), name: d.name, color: d.color || "theme", created: now + n, updated: now + n, known: [],
    cards: parse(d.cards ? d.cards.map((c) => `${c.front} ; ${c.back}`).join("\n") : d.words.map((w) => `${w.word} ; ${w.meaning}`).join("\n")).cards.map(({ id, front, back }) => ({ id, front, back })),
  })).filter((d) => d.cards.length);
  save(DECKS_KEY, [...(Array.isArray(existing) ? existing : []), ...made]);
  try { dispatchEvent(new Event("dwiddle:synced")); } catch { /* not in a browser */ }
  return made;
}
