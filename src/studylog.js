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

export function logAnswer({ id, topic, ok, kind = "mc", t = Date.now() }) {
  const log = readLog();
  log.push({ t, id: String(id), topic: topic || "", ok: !!ok, kind });
  save(LOG_KEY, log.length > MAX ? log.slice(-MAX) : log);
  try { dispatchEvent(new Event("dwiddle:log")); } catch { /* not in a browser */ }
}
