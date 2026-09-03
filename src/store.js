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
};
