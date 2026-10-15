import test from "node:test";
import assert from "node:assert/strict";
import { findWeakSpots, areaType, termCards, skillMeta } from "../src/weakspots.js";
import { cleanWords, buildDecks, addDecks, BATCHES, TIERS } from "../src/vocabdecks.js";

const NOW = Date.now();
const ans = (skill, ok, extra = {}) => ({ t: NOW - 1000, id: "q" + Math.random(), topic: "SSAT: Reading", ok, kind: "mc", skill, section: "Reading", test: "ssat", ...extra });
const many = (skill, right, wrong, extra) => [...Array(right).fill(0).map(() => ans(skill, true, extra)), ...Array(wrong).fill(0).map(() => ans(skill, false, extra))];

test("a skill that keeps going wrong is found, with where and how bad", () => {
  const log = [...many("Inference", 3, 9), ...many("Detail", 11, 1)];
  const w = findWeakSpots(log);
  assert.equal(w.length, 1);
  assert.equal(w[0].skill, "Inference");
  assert.equal(w[0].pct, 25);
  assert.equal(w[0].total, 12);
  assert.equal(w[0].test, "ssat");
  assert.equal(w[0].type, "reading");
});

test("too few answers, or a fine score, or old answers, are not a pattern", () => {
  assert.equal(findWeakSpots(many("Inference", 1, 3)).length, 0); // only 4 answers
  assert.equal(findWeakSpots(many("Detail", 9, 1)).length, 0); // 90 percent
  const old = many("Inference", 1, 9).map((e) => ({ ...e, t: NOW - 200 * 864e5 }));
  assert.equal(findWeakSpots(old).length, 0);
});

test("a skill is only weak next to what the person usually gets right", () => {
  // 64 percent on one skill when everything else is 95 percent is a weak spot...
  const odd = [...many("Main idea", 7, 4), ...many("Detail", 40, 1)];
  assert.equal(findWeakSpots(odd).map((x) => x.skill).join(), "Main idea");
  // ...but not when the person gets about 64 percent of everything
  const flat = [...many("Main idea", 7, 4), ...many("Detail", 7, 4), ...many("Poetry", 7, 4)];
  assert.equal(findWeakSpots(flat).length, 0);
});

test("the weakest come first, at most four, and answers without a skill are ignored", () => {
  const log = [...many("A skill", 1, 9), ...many("B skill", 2, 8), ...many("C skill", 3, 7), ...many("D skill", 3, 6), ...many("E skill", 4, 6), { t: NOW, id: "x", topic: "T", ok: false, kind: "mc" }];
  const w = findWeakSpots(log);
  assert.equal(w.length, 4);
  assert.equal(w[0].skill, "A skill");
  assert.ok(w.every((x, i) => i === 0 || x.pct >= w[i - 1].pct));
});

test("what kind of skill it is decides what to offer", () => {
  assert.equal(areaType("Vocabulary in context", "Reading"), "vocab");
  assert.equal(areaType("Synonyms", "Verbal"), "vocab");
  assert.equal(areaType("Analogies"), "vocab");
  assert.equal(areaType("Author's perspective"), "reading");
  assert.equal(areaType("Poetry"), "reading");
  assert.equal(areaType("Main idea"), "reading");
  assert.equal(areaType("Algebra", "Quantitative"), "maths");
  assert.equal(areaType("Key terms"), "terms");
  assert.equal(areaType("Something else"), "other");
});

test("questions of a material say which skill they test", () => {
  assert.deepEqual(skillMeta({ kind: "vocab" }), { skill: "Key terms" });
  assert.deepEqual(skillMeta({ kind: "process" }), { skill: "Processes" });
  assert.equal(skillMeta({}), undefined);
});

test("key term questions become flashcards, once per term", () => {
  const made = { questions: [
    { kind: "vocab", term: "Scarcity", choices: ["a", "Limited resources, unlimited wants", "c", "d"], answer: 1 },
    { kind: "vocab", term: "scarcity", choices: ["x", "y"], answer: 0 },
    { kind: "concept", q: "?", choices: ["a", "b"], answer: 0 },
    { kind: "vocab", term: "Broken", choices: ["a"], answer: 5 },
  ] };
  assert.deepEqual(termCards(made), [{ front: "Scarcity", back: "Limited resources, unlimited wants" }]);
});

test("words from the model are checked: single words, in range, new, with a meaning", () => {
  const raw = [{ word: "Benevolent", meaning: "(adj) kind and generous" }, { word: "zealous", meaning: "(adj) eager" }, { word: "benevolent", meaning: "again" },
    { word: "two words", meaning: "no" }, { word: "keen", meaning: "" }, { word: "ardent", meaning: "(adj) passionate; fierce" }, { word: "avid", meaning: "(adj) eager — keen" }, null];
  const a = cleanWords(raw, 1);
  assert.deepEqual(a.map((x) => x.word), ["benevolent", "ardent", "avid"]);
  assert.equal(a[1].meaning, "(adj) passionate, fierce");
  assert.equal(a[2].meaning, "(adj) eager, keen");
  assert.deepEqual(cleanWords(raw, 2).map((x) => x.word), ["zealous"]);
  assert.deepEqual(cleanWords(raw, 1, new Set(["avid"])).map((x) => x.word), ["benevolent", "ardent"]);
});

test("eight batches make four decks of about 175 words, no word twice", () => {
  assert.equal(BATCHES.length, 8);
  assert.equal(BATCHES.reduce((n, b) => n + b.count, 0), 736);
  const words = (tier, half, n) => Array.from({ length: n }, (_, i) => ({ word: (half === 1 ? "a" : "m") + "x".repeat(tier) + i.toString(36).padStart(2, "z"), meaning: "(n) a thing" }));
  const results = BATCHES.map((b) => ({ tier: b.tier, half: b.half, words: words(b.tier, b.half, 90) }));
  results.push({ tier: 1, half: 1, words: [{ word: results[0].words[0].word, meaning: "(n) a repeat" }] }); // a repeat across batches
  const decks = buildDecks(results);
  assert.equal(decks.length, 4);
  assert.ok(decks.every((d) => d.words.length === 180 || d.words.length === 180 || d.words.length >= 150));
  assert.equal(new Set(decks.flatMap((d) => d.words.map((w) => w.word))).size, decks.reduce((n, d) => n + d.words.length, 0));
  assert.deepEqual(decks.map((d) => d.tier), TIERS.map((t) => t.tier));
});

test("a deck that came back nearly empty is not kept", () => {
  const results = [{ tier: 1, half: 1, words: [{ word: "ardent", meaning: "(adj) keen" }] }, { tier: 2, half: 1, words: Array.from({ length: 60 }, (_, i) => ({ word: "b" + "q".repeat(3) + String.fromCharCode(97 + (i % 26)) + Math.floor(i / 26), meaning: "(n) x" })) }];
  const decks = buildDecks(results);
  assert.deepEqual(decks.map((d) => d.tier), [2]);
});
