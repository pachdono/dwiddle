// Reading aloud, in the best voice this device has.
//
// Every browser ships a mix: a few natural voices (Microsoft's "Online
// (Natural)" ones in Edge and on Windows, Google's in Chrome, Apple's
// Premium and Enhanced ones once downloaded) alongside old robotic and joke
// voices. This ranks them so the natural ones are always used first, and lets
// the student pick their own in Settings.

const KEY = "dwiddle-voice";

// Old or novelty voices that sound like a robot. Never picked on their own.
const ROBOTIC = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|princess|grandma|grandpa|eddy|flo\b|reed|rocko|sandy|shelley|espeak/i;
const FEMALE = /female|samantha|serena|karen|moira|tessa|victoria|ava|zoe|allison|susan|kate|stephanie|fiona|libby|sonia|aria|jenny|emma|michelle|ana\b|natasha|clara|maisie|hazel|sara|nancy|joanna|amy/i;
const MALE = /\bmale|daniel|alex|tom|oliver|arthur|ryan|guy|evan|nathan|aaron|lee\b|gordon|rishi|brian|eric|christopher|roger|steffan|william|thomas|george|noah|andrew/i;

const synth = () => (typeof window !== "undefined" ? window.speechSynthesis : null);

function score(v) {
  const n = v.name;
  let s = 0;
  if (/natural|neural/i.test(n)) s += 100;
  if (/online/i.test(n)) s += 60;
  if (/premium/i.test(n)) s += 90;
  if (/enhanced/i.test(n)) s += 75;
  if (/google/i.test(n)) s += 55;
  if (/siri/i.test(n)) s += 50;
  if (/^(ava|zoe|evan|nathan|serena|daniel|karen|moira|tessa|kate|oliver|jamie|stephanie|samantha)\b/i.test(n)) s += 25;
  if (ROBOTIC.test(n)) s -= 200;
  if (/^en-(GB|US|AU|IE|NZ|CA)/i.test(v.lang)) s += 8;
  if (/^en-GB/i.test(v.lang)) s += 4;
  return s;
}

export const genderOf = (v) => (v && FEMALE.test(v.name) ? "female" : v && MALE.test(v.name) ? "male" : "");

// English voices, best first.
export function allVoices() {
  const list = synth()?.getVoices?.() || [];
  const en = list.filter((v) => /^en/i.test(v.lang));
  return (en.length ? en : list).slice().sort((a, b) => score(b) - score(a));
}

export const isNatural = (v) => !!v && score(v) >= 50;

export function savedVoiceName() {
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
}
export function saveVoiceName(name) {
  try { name ? localStorage.setItem(KEY, name) : localStorage.removeItem(KEY); } catch { /* private mode */ }
}

// The student's own choice, or else the best there is.
export function mainVoice() {
  const list = allVoices();
  const mine = savedVoiceName();
  return list.find((v) => v.name === mine) || list[0] || null;
}

// Two voices that sound clearly different, for two speakers: the main voice,
// and the best one of the other gender, or at least another voice.
export function voicePair() {
  const list = allVoices();
  const a = mainVoice();
  const g = genderOf(a);
  const other = list.find((v) => v !== a && g && genderOf(v) && genderOf(v) !== g && score(v) > -100)
    || list.find((v) => v !== a && score(v) > -100)
    || a;
  return [a, other];
}

// Voices arrive a moment after the page loads in most browsers.
export function onVoices(cb) {
  const s = synth();
  if (!s) return () => {};
  cb();
  s.addEventListener?.("voiceschanged", cb);
  return () => s.removeEventListener?.("voiceschanged", cb);
}

// Chrome cuts off anything read aloud after about fifteen seconds, so long
// text is read a sentence or two at a time.
function chunks(text) {
  const parts = String(text).replace(/\s+/g, " ").match(/[^.!?]+[.!?]*["')\]]*\s*/g) || [String(text)];
  const out = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + p).length > 220 && cur) { out.push(cur.trim()); cur = ""; }
    cur += p;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Reads text aloud. Returns a function that stops it.
export function say(text, { voice, rate = 1, pitch = 1, onStart, onEnd } = {}) {
  const s = synth();
  if (!s || !text) { onEnd?.(); return () => {}; }
  s.cancel();
  const v = voice === undefined ? mainVoice() : voice;
  const parts = chunks(text);
  let stopped = false;
  let i = 0;
  const next = () => {
    if (stopped) return;
    if (i >= parts.length) { onEnd?.(); return; }
    const u = new SpeechSynthesisUtterance(parts[i++]);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
    // Natural voices already pace themselves; robotic ones read better a
    // touch slower.
    u.rate = rate * (isNatural(v) ? 1 : 0.95);
    u.pitch = pitch;
    if (i === 1) u.onstart = () => onStart?.();
    u.onend = next;
    // Cut off by something else being read: stay quiet, whoever interrupted
    // is in charge now.
    u.onerror = (e) => { if (e.error !== "interrupted" && e.error !== "canceled") next(); };
    s.speak(u);
  };
  next();
  return () => { stopped = true; s.cancel(); };
}

export function stopSpeaking() { synth()?.cancel(); }

// How to get better voices on this device, in a sentence.
export function voiceTip() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Mac|iPhone|iPad/.test(ua)) return "For the most natural voices on a Mac, iPhone or iPad, open System Settings, then Accessibility, Spoken Content, System voice, Manage Voices, and download a Premium or Enhanced English voice such as Ava, Zoe or Serena. Then pick it here.";
  if (/Windows/.test(ua)) return "Microsoft Edge has the most natural voices on Windows, the ones marked Natural. Windows Settings, Time and language, Speech, also lets you add more.";
  if (/Android/.test(ua)) return "Chrome on Android uses Google's voices. Settings, Accessibility, Text to speech lets you download higher quality ones.";
  return "Voices marked Natural, Neural, Premium or Enhanced sound the most human. Edge and Chrome have the best built in.";
}
