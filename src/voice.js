// Dwiddle's own voice: short reactions recorded ahead of time with real
// feeling (a cheer for a right answer, a kind word for a wrong one, a
// celebration for a level up), played as little audio clips.
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
const important = new Set(["levelup", "streak", "done-great", "done-okay"]);

// Plays one of Dwiddle's lines of this kind. Everyday reactions only play
// some of the time, so he does not say "nice one" to every single answer,
// and never talk over each other; the big moments always play.
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
