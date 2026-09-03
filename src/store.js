// Everything the app remembers between visits lives here.
// Browser storage can throw (private windows, blocked site data), so every
// access is guarded and falls back to working in memory for the session.

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do. The value still applies for this visit.
  }
}

export const KEYS = {
  theme: "dwiddle-theme",
  known: "dwiddle-known",   // card ids retired from the deck
  missed: "dwiddle-missed", // question ids answered wrong
  topic: "dwiddle-topic",   // the topic Practice is currently working on
  hidden: "dwiddle-hidden", // topic ids removed from the list
  quizLen: "dwiddle-quizlen", // questions per quiz run
  stats: "dwiddle-stats",     // answered, correct, and the days you studied
  made: "dwiddle-made",       // material generated from your own notes
  sample: "dwiddle-sample",   // whether the demonstration material is loaded
  bannerOff: "dwiddle-banner", // the not signed in notice was dismissed
};
