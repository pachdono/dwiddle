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

// When each value last changed on this device, so syncing can tell which of
// two copies is newer instead of one device overwriting the other.
const TIMES = "dwiddle-times";
export function changedAt() { return load(TIMES, {}); }
export function save(key, value, { at = Date.now() } = {}) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (key !== TIMES && at) {
      const t = load(TIMES, {});
      t[key] = at;
      localStorage.setItem(TIMES, JSON.stringify(t));
    }
  } catch {
    // Nothing to do. The value still applies for this visit.
  }
}
export function setChangedAt(times) {
  try { localStorage.setItem(TIMES, JSON.stringify({ ...load(TIMES, {}), ...times })); } catch { /* private mode */ }
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
  madeCleared: "dwiddle-made-cleared", // when material was last deleted, so another device does not bring it back
  bannerOff: "dwiddle-banner", // the not signed in notice was dismissed
  entered: "dwiddle-entered",  // landing passed, for this tab only
  testBank: "dwiddle-bank",   // questions written for test sections, kept and reused
  seen: "dwiddle-seen",       // question ids already served, so papers do not repeat
  freeGen: "dwiddle-freegen", // generations used before signing in
  srs: "dwiddle-srs",         // when each question is next due for review
  srsOn: "dwiddle-srs-on",    // whether review is suggested at all
  name: "dwiddle-name",       // what to call you before you sign in
  level: "dwiddle-level",     // the level they study at, sent with every AI request
  focus: "dwiddle-focus",     // the library item Study is focused on
  sources: "dwiddle-sources", // the notes each topic came from; kept on this device, never synced
};
