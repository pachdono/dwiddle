// The growing question bank.
//
// Every prep app has the same failure: a fixed set of questions, so the second
// paper is the first one again. Two things fix that here. Questions you have
// already been given are remembered and not served again while unseen ones
// remain, and when a section runs low it is topped up with fresh questions
// written for it. The bank therefore gets larger the more you use it.

import { load, save, KEYS } from "./store.js";
import { generateTestQuestions } from "./ai.js";
import { tidyQuestion } from "./mathText.js";

const key = (testId, sectionId) => `${testId}:${sectionId}`;

export function loadBank() {
  return load(KEYS.testBank, {});
}

export function bankFor(testId, sectionId) {
  return loadBank()[key(testId, sectionId)] || [];
}

export function addToBank(testId, sectionId, questions) {
  const all = loadBank();
  const k = key(testId, sectionId);
  const existing = all[k] || [];
  const seen = new Set(existing.map((q) => q.id));
  all[k] = [...existing, ...questions.filter((q) => !seen.has(q.id))].slice(-400);
  save(KEYS.testBank, all);
  return all[k];
}

export function loadSeen() {
  return new Set(load(KEYS.seen, []));
}

export function markSeen(ids) {
  const seen = loadSeen();
  ids.forEach((id) => seen.add(id));
  // Keep the list bounded. The oldest entries falling off simply means very old
  // questions can eventually reappear, which is the right behaviour anyway.
  save(KEYS.seen, [...seen].slice(-3000));
}

export function clearSeen(testId, sectionId) {
  if (!testId) {
    save(KEYS.seen, []);
    return;
  }
  // Only forget the ones belonging to this section.
  const mine = new Set(bankFor(testId, sectionId).map((q) => q.id));
  save(KEYS.seen, [...loadSeen()].filter((id) => !mine.has(id)));
}

// How many unseen questions are available right now, without asking for more.
export function unseenCount(pool, testId, sectionId) {
  const seen = loadSeen();
  const all = [...pool, ...bankFor(testId, sectionId)];
  return all.filter((q) => !seen.has(q.id)).length;
}

/**
 * Build a paper, preferring questions never served before, and writing new ones
 * when there are not enough.
 *
 * @param onProgress reports how many have been written so far, for the UI
 */
export async function buildFresh({
  test,
  sec,
  authored,
  wanted,
  passage = false,
  audio = false,
  skills = [],
  onProgress,
}) {
  const seen = loadSeen();
  const stored = bankFor(test.id, sec.id);

  const pick = (list) => list.filter((q) => !seen.has(q.id));
  let available = [...pick(authored), ...pick(stored)];

  // Ask for more only when the unseen pool cannot fill the paper. Each request
  // returns a modest batch, so several are needed for a long section, and any
  // one of them failing still leaves a usable paper.
  let guard = 0;
  while (available.length < wanted && guard < 6) {
    guard += 1;
    onProgress?.({ have: available.length, wanted });

    try {
      const { questions } = await generateTestQuestions({
        test: test.name,
        section: sec.name,
        skills,
        count: Math.min(12, wanted - available.length),
        passage,
        audio,
        // Show a sample of what has been used so the model writes elsewhere.
        avoid: available.slice(-8).map((q) => q.q),
      });
      if (!questions?.length) break;
      addToBank(test.id, sec.id, questions);
      available = [...available, ...questions];
    } catch {
      break; // a paper shorter than asked for is better than no paper
    }
  }

  // Applied on the way out rather than on the way in, so questions already
  // saved in a bank from an earlier version are printed properly too.
  const qs = available.slice(0, wanted).map(tidyQuestion);
  markSeen(qs.map((q) => q.id));
  return { qs, short: qs.length < wanted, wrote: qs.filter((q) => q.fresh).length };
}
