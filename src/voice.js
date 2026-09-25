// Dwiddle's own voice for the big moments: finishing a quiz and levelling
// up, recorded ahead of time with real feeling and played as little clips.
//
// They are few and small, so they ship with the app and play instantly,
// even offline. Anything Dwiddle says that is not fixed, like a chat reply,
// is read by the voice in tts.js instead.

import CLIPS from "./voiceClips.json";

const KEY = "dwiddle-talks";
export const talksOn = () => { try { return localStorage.getItem(KEY) !== "false"; } catch { return true; } };
export const setTalksOn = (on) => { try { localStorage.setItem(KEY, on ? "true" : "false"); } catch { /* private mode */ } };

let playing = null;
let lastFile = "";
const important = new Set(["levelup", "done-great", "done-okay"]);

// Plays one of Dwiddle's lines of this kind, never over another one.
export function dwiddleSays(kind, { chance = 1 } = {}) {
  if (!talksOn() || !CLIPS[kind]) return;
  if (Math.random() > chance) return;
  if (playing && !playing.ended && !playing.paused) {
    if (!important.has(kind)) return;
    playing.pause();
  }
  const options = CLIPS[kind].filter((c) => c.file !== lastFile);
  const pick = options[Math.floor(Math.random() * options.length)] || CLIPS[kind][0];
  lastFile = pick.file;
  try {
    const a = new Audio(new URL("voice/" + pick.file, document.baseURI).href);
    a.volume = 0.9;
    playing = a;
    window.dispatchEvent(new CustomEvent("dwiddle:talk", { detail: { text: pick.text, kind } }));
    a.play().catch(() => {}); // a browser may refuse sound before the first tap
  } catch { /* no audio here */ }
}
