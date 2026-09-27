// A short sound for the big moments: a "duh-dun" when a quiz ends and a
// little run of notes on levelling up. Made on the spot with the browser's
// audio, so there is nothing to download, and it can be switched off in
// Settings for anyone who would rather study in quiet.

const KEY = "dwiddle-sounds";
export const soundsOn = () => { try { return localStorage.getItem(KEY) !== "false"; } catch { return true; } };
export const setSoundsOn = (on) => { try { localStorage.setItem(KEY, on ? "true" : "false"); } catch { /* private mode */ } };

let ctx = null;
const audio = () => {
  const C = window.AudioContext || window.webkitAudioContext;
  return C ? (ctx ||= new C()) : null;
};

// One soft, bell like note: a triangle wave with a quieter octave above it.
function note(ac, freq, at, length, loud) {
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(loud, at + 0.015);
  out.gain.exponentialRampToValueAtTime(0.0001, at + length);
  out.connect(ac.destination);
  for (const [type, mult, level] of [["triangle", 1, 1], ["sine", 2, 0.25]]) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * mult, at);
    g.gain.value = level;
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + length + 0.05);
  }
}

const CUES = {
  // duh-dun, up a fourth: a good score
  "done-great": [[392, 0, 0.16], [523.25, 0.14, 0.55]],
  // the same shape, lower and gentler: a score to build on
  "done-okay": [[329.63, 0, 0.16], [440, 0.14, 0.45]],
  // a bright little "ding-ding" for a right answer
  right: [[659.25, 0, 0.1], [987.77, 0.07, 0.3]],
  // a run up for a streak worth cheering
  streak: [[523.25, 0, 0.1], [659.25, 0.07, 0.1], [783.99, 0.14, 0.1], [1046.5, 0.21, 0.45]],
  // a quick run up the chord
  levelup: [[523.25, 0, 0.14], [659.25, 0.09, 0.14], [783.99, 0.18, 0.14], [1046.5, 0.27, 0.6]],
};

export function playCue(kind) {
  if (!soundsOn() || !CUES[kind]) return;
  try {
    const ac = audio();
    if (!ac) return;
    if (ac.state === "suspended") ac.resume().catch(() => {});
    const t = ac.currentTime + 0.02;
    const loud = kind === "done-okay" ? 0.14 : kind === "right" ? 0.12 : 0.2;
    for (const [f, at, len] of CUES[kind]) note(ac, f, t + at, len, loud);
  } catch { /* no audio here */ }
}
