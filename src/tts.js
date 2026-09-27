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

// A voice for each duck: Dwiddle is a boy, Puddle a girl. The student's own
// choice of voice goes to whichever duck it suits; the other gets the best
// voice of the other gender. Only when a device has no voice of one gender do
// both ducks share one (Puddle then speaks a little higher).
export function characterVoices() {
  const list = allVoices();
  const mine = mainVoice();
  const best = (g) => list.find((v) => genderOf(v) === g && score(v) > -100) || null;
  const male = genderOf(mine) === "male" ? mine : best("male");
  const female = genderOf(mine) === "female" ? mine : best("female");
  return { dwiddle: male || mine || null, puddle: female || (male ? list.find((v) => v !== male && score(v) > -100) : null) || mine || null };
}

// The narrator: a British woman, like the natural narrator voice, when the
// device has one (Serena, Kate, Libby, Sonia, Google UK English Female...);
// failing that Puddle's voice, and failing that the main one.
export function britishWoman() {
  const list = allVoices().filter((v) => score(v) > -100);
  return list.find((v) => /^en-GB/i.test(v.lang) && genderOf(v) === "female")
    || list.find((v) => /^en-GB/i.test(v.lang) && /female/i.test(v.name))
    || characterVoices().puddle
    || mainVoice();
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

export function stopSpeaking() { synth()?.cancel(); current?.(); current = null; }

// How to get better voices on this device, in a sentence.
export function voiceTip() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Mac|iPhone|iPad/.test(ua)) return "For the most natural voices on a Mac, iPhone or iPad, open System Settings, then Accessibility, Spoken Content, System voice, Manage Voices, and download a Premium or Enhanced English voice such as Ava, Zoe or Serena. Then pick it here.";
  if (/Windows/.test(ua)) return "Microsoft Edge has the most natural voices on Windows, the ones marked Natural. Windows Settings, Time and language, Speech, also lets you add more.";
  if (/Android/.test(ua)) return "Chrome on Android uses Google's voices. Settings, Accessibility, Text to speech lets you download higher quality ones.";
  return "Voices marked Natural, Neural, Premium or Enhanced sound the most human. Edge and Chrome have the best built in.";
}

/* ---------- natural voices, made on the device ---------- */

// Each character has its own voice from Kokoro, an open voice model that
// runs on the device's graphics chip: Dwiddle is Echo pitched up a little,
// Puddle is Bella pitched up, and listening tests use a plain British
// reader, as exams do. Speech is made a touch slow and played back a touch
// fast, which raises the pitch without changing the pace.
export const CHARACTERS = {
  dwiddle: { voice: "am_echo", semis: 3 },
  puddle: { voice: "af_bella", semis: 3 },
  narrator: { voice: "bf_emma", semis: 0 },
};
const NATURAL_KEY = "dwiddle-natural-voices";
export const naturalOn = () => { try { return localStorage.getItem(NATURAL_KEY) !== "false"; } catch { return true; } };
export const setNaturalOn = (on) => { try { localStorage.setItem(NATURAL_KEY, on ? "true" : "false"); } catch { /* private mode */ } };
// Without the graphics chip the model is too slow to keep up with speech.
export const naturalSupported = () => typeof navigator !== "undefined" && !!navigator.gpu && typeof Worker !== "undefined";

let worker = null;
let state = "idle"; // idle | loading | ready | failed
let loadPromise = null;
const waiting = new Map();
let nextId = 1;
const progressListeners = new Set();
export const onNaturalProgress = (fn) => { progressListeners.add(fn); return () => progressListeners.delete(fn); };
export const naturalState = () => state;

// The model runs on one processor core per copy, so narration is made by a
// few copies side by side where the device has the cores and the memory for
// it, each making its own lines. The first copy downloads the voice; the
// others load it from the browser's cache once it is there.
const pool = []; // { w, ready, busy, dead }
function makeWorker() {
  const w = new Worker(new URL("./kokoroWorker.js", import.meta.url), { type: "module" });
  w.onmessage = ({ data }) => {
    if (data.type === "progress" && w === worker) progressListeners.forEach((f) => f(data.loaded / data.total));
    if (data.type === "audio" || data.type === "error") {
      const job = waiting.get(data.id);
      waiting.delete(data.id);
      if (!job) return;
      job.slot.busy -= 1;
      data.type === "audio" ? job.resolve(data) : job.reject(new Error(data.message));
    }
  };
  return w;
}
function getWorker() {
  if (worker) return worker;
  worker = makeWorker();
  pool.push({ w: worker, ready: false, busy: 0 });
  return worker;
}
// How many copies: one on a phone, up to three on a computer with the cores
// and memory to spare.
export function narratorLanes() {
  if (typeof navigator === "undefined") return 1;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPod|Android.*Mobile/i.test(ua)) return 1;
  const cores = navigator.hardwareConcurrency || 2;
  const mem = navigator.deviceMemory; // not given by Safari
  const byMem = mem == null ? 2 : mem >= 8 ? 3 : mem >= 4 ? 2 : 1;
  return Math.max(1, Math.min(3, Math.floor(cores / 2), byMem));
}
function growPool() {
  while (pool.length < narratorLanes()) {
    const slot = { w: makeWorker(), ready: false, busy: 0 };
    pool.push(slot);
    slot.w.addEventListener("message", ({ data }) => {
      if (data.type === "ready") slot.ready = true;
      if (data.type === "failed") slot.dead = true;
    });
    slot.w.postMessage({ type: "load" });
  }
}

// Downloads the voice the first time (about 90 MB, then kept by the
// browser) and gets it ready. Resolves true when natural speech can be used.
export function prepareNatural() {
  if (!naturalOn() || !naturalSupported()) return Promise.resolve(false);
  return loadModel();
}

// Where the model runs once loaded: "webgpu" is quick enough to speak live,
// "wasm" (the processor) only to make speech ahead of time.
let device = null;
function loadModel() {
  if (state === "ready") return Promise.resolve(true);
  if (loadPromise) return loadPromise;
  state = "loading";
  loadPromise = new Promise((resolve) => {
    const w = getWorker();
    const on = ({ data }) => {
      if (data.type === "ready") { state = "ready"; device = data.device; pool[0].ready = true; w.removeEventListener("message", on); resolve(true); }
      if (data.type === "failed") { state = "failed"; loadPromise = null; w.removeEventListener("message", on); resolve(false); }
    };
    w.addEventListener("message", on);
    w.postMessage({ type: "load" });
  });
  return loadPromise;
}

/* ---------- the video narrator ---------- */

// Videos are always read by the same British woman: the model's narrator
// voice, on any device, made a line or two ahead so the processor can keep
// up where there is no graphics chip.
export const NARRATOR = CHARACTERS.narrator.voice;
export const prepareNarrator = () => loadModel().then((ok) => { if (ok) growPool(); return ok; });

// One line of narration as audio: { audio, sr }.
export const narrate = (text, rate = 1) => makeSpeech(text, NARRATOR, rate);

// Plays audio made by narrate. Returns a function that stops it.
export function playClip(clip, { onEnd } = {}) {
  const ac = audioCtx();
  let source = null, stopped = false;
  (async () => {
    if (ac.state === "suspended") await ac.resume().catch(() => {});
    if (stopped) return;
    const buf = ac.createBuffer(1, clip.audio.length, clip.sr);
    buf.copyToChannel(clip.audio, 0);
    source = ac.createBufferSource();
    source.buffer = buf;
    source.connect(ac.destination);
    source.onended = () => { if (!stopped) onEnd?.(); };
    source.start();
  })();
  return () => { stopped = true; try { source?.stop(); } catch { /* already stopped */ } };
}

function makeSpeech(text, voice, speed) {
  const id = nextId++;
  getWorker();
  // The least busy copy that is ready; the first copy until others are.
  const slot = pool.filter((sl) => sl.ready && !sl.dead).sort((a, b) => a.busy - b.busy)[0] || pool[0];
  slot.busy += 1;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject, slot });
    slot.w.postMessage({ type: "speak", id, text, voice, speed });
  });
}

let ctx = null;
const audioCtx = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

// Reads text aloud as one of the characters. Uses the natural voice when it
// is ready, and the device's voice otherwise (starting the natural one
// downloading for next time). Returns a function that stops it.
export function sayAs(who, text, { rate = 1, onStart, onEnd, device: onDevice = false } = {}) {
  const c = CHARACTERS[who] || CHARACTERS.dwiddle;
  // Live speech needs the graphics chip; on the processor it would stall
  // between sentences, so the device's own voice reads instead.
  if (onDevice || state !== "ready" || device !== "webgpu") {
    // The natural voice is for videos, which make their speech ahead of time;
    // live speech stays on the device's voice rather than downloading it.
    const v = characterVoices();
    const voice = who === "narrator" ? britishWoman() : who === "puddle" ? v.puddle : v.dwiddle;
    return say(text, { voice, rate, pitch: who === "narrator" ? 1 : 1.08, onStart, onEnd });
  }
  stopSpeaking();
  stopNatural();
  const playRate = 2 ** (c.semis / 12);
  const parts = chunks(text);
  const jobs = parts.map((p) => makeSpeech(p, c.voice, rate / playRate)); // made in order, ahead of playback
  let stopped = false;
  let source = null;
  const run = async () => {
    const ac = audioCtx();
    if (ac.state === "suspended") await ac.resume().catch(() => {});
    for (let i = 0; i < jobs.length; i++) {
      let out;
      try { out = await jobs[i]; } catch { continue; }
      if (stopped) return;
      const buf = ac.createBuffer(1, out.audio.length, out.sr);
      buf.copyToChannel(out.audio, 0);
      source = ac.createBufferSource();
      source.buffer = buf;
      source.playbackRate.value = playRate;
      source.connect(ac.destination);
      if (i === 0) onStart?.();
      await new Promise((res) => { source.onended = res; source.start(); });
      if (stopped) return;
    }
    onEnd?.();
  };
  run();
  const stop = () => { stopped = true; try { source?.stop(); } catch { /* already stopped */ } };
  current = stop;
  return stop;
}
let current = null;
export function stopNatural() { current?.(); current = null; }
