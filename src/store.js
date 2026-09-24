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

// Session storage clears when the tab closes, which is what we want for things
// that should reset on a fresh visit rather than be remembered forever.
export function loadSession(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // nothing to do
  }
}

export function clearSession(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // nothing to do
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
  bannerOff: "dwiddle-banner", // the not signed in notice was dismissed
  entered: "dwiddle-entered",  // landing passed, for this tab only
  testBank: "dwiddle-bank",   // questions written for test sections, kept and reused
  seen: "dwiddle-seen",       // question ids already served, so papers do not repeat
  freeGen: "dwiddle-freegen", // generations used before signing in
  name: "dwiddle-name",       // what to call you before you sign in
  sources: "dwiddle-sources", // the notes each topic came from; kept on this device, never synced
};
