// A running record of answers, kept on this device: when, which topic, what
// kind of question, right or wrong. The report, the study time advice and the
// harder questions all read from it, so none of them need anything new asked
// of the student. Only the last 3000 answers are kept.
import { load, save } from "./store.js";

export const LOG_KEY = "dwiddle-log";
const MAX = 3000;

export const readLog = () => {
  const l = load(LOG_KEY, []);
  return Array.isArray(l) ? l : [];
};

// skill, section and test say what a question tested, so the report can spot a
// pattern across topics (for instance, inference questions in a reading section).
export function logAnswer({ id, topic, ok, kind = "mc", t = Date.now(), skill, section, test }) {
  const log = readLog();
  log.push({ t, id: String(id), topic: topic || "", ok: !!ok, kind, ...(skill ? { skill: String(skill).slice(0, 60) } : {}), ...(section ? { section: String(section).slice(0, 60) } : {}), ...(test ? { test: String(test).slice(0, 30) } : {}) });
  save(LOG_KEY, log.length > MAX ? log.slice(-MAX) : log);
  try { dispatchEvent(new Event("dwiddle:log")); } catch { /* not in a browser */ }
}

// The questions in the order they should be asked: ones never asked first, in a
// random order, then ones asked before, the longest ago first, so a quiz run
// after run does not circle the same few. A little jitter keeps questions asked
// at about the same time from always coming in the same order.
export function freshFirst(list, log = readLog()) {
  const last = new Map();
  log.forEach((e) => last.set(String(e.id), e.t));
  const unseen = [], seen = [];
  list.forEach((q) => (last.has(String(q.id)) ? seen : unseen).push(q));
  const random = (a) => a.map((x) => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const old = seen.map((q) => [last.get(String(q.id)) + Math.random() * 6 * 36e5, q]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  return { ordered: [...random(unseen), ...old], unseen: unseen.length, seenIds: new Set(seen.map((q) => String(q.id))) };
}
