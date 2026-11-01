// Patterns in how someone answers: which kind of question keeps going wrong,
// worked out from the answer log. A "skill" is the kind of thing a question
// tests (vocabulary, inference, main idea, algebra), so a pattern shows up that
// a list of topics would hide. Kept apart from the screen so it can be tested.

const KIND_SKILL = { vocab: "Key terms", concept: "Concepts", process: "Processes" };
// what a question of the material adds to the log, beside its topic
export const skillMeta = (q) => (q?.kind && KIND_SKILL[q.kind] ? { skill: KIND_SKILL[q.kind] } : undefined);

const DAY = 864e5;

// Vocabulary, reading or maths: it decides what Dwiddle offers to do about it.
export function areaType(skill, section = "") {
  const s = `${skill} ${section}`.toLowerCase();
  if (/key terms/.test(s)) return "terms";
  if (/vocab|synonym|analog|word|verbal|diction|definition/.test(s)) return "vocab";
  if (/infer|detail|main idea|purpose|perspective|point of view|tone|poem|poetry|theme|passage|reading|figurative|attitude|author|narrat|evidence|compar|summar|sequence|cause/.test(s)) return "reading";
  if (/quant|math|arith|algebra|geometr|fraction|ratio|percent|equation|number|measure|data|probab|graph/.test(s)) return "maths";
  return "other";
}

// The skills that are holding someone back: enough answers to mean something,
// well below what they get right overall, newest answers only.
export function findWeakSpots(log, { min = 6, below = 70, max = 4, days = 90, now = Date.now() } = {}) {
  const recent = (Array.isArray(log) ? log : []).filter((e) => e && now - e.t < days * DAY);
  const overall = recent.length >= 12 ? Math.round((recent.filter((e) => e.ok).length / recent.length) * 100) : null;
  const groups = new Map();
  for (const e of recent) {
    if (!e.skill) continue;
    const key = [e.test || "", e.section || "", e.skill].join("|");
    const g = groups.get(key) || { skill: e.skill, section: e.section || "", test: e.test || "", right: 0, total: 0, last: 0 };
    g.total += 1; if (e.ok) g.right += 1; g.last = Math.max(g.last, e.t);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, pct: Math.round((g.right / g.total) * 100), type: areaType(g.skill, g.section), overall }))
    // weak on its own terms, or clearly weaker than the rest of what they do
    .filter((g) => g.total >= min && g.pct < below && (g.pct < 50 || overall == null || g.pct <= overall - 8))
    .sort((a, b) => a.pct - b.pct || b.total - a.total)
    .slice(0, max);
}

// Flashcards from the key term questions of a material, no writing needed: the
// term, and the answer the question has for it. One card per term.
export function termCards(made) {
  const seen = new Set();
  const cards = [];
  for (const q of made?.questions || []) {
    if (q?.kind !== "vocab" || !q.term || !Array.isArray(q.choices) || q.choices[q.answer] == null) continue;
    const key = String(q.term).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cards.push({ front: String(q.term).trim(), back: String(q.choices[q.answer]).trim() });
  }
  return cards;
}
