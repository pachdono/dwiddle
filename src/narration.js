// A video's narration, made as one continuous recording.
//
// Making each line just before it is read left gaps: on the processor a line
// can take longer to make than the one before it takes to say, so the video
// kept stopping. Instead the whole narration is made in the background as
// soon as a video exists, line by line, while the student does something
// else, and every finished line is kept on the device. When it is played, the
// lines are joined into one recording with a short pause between them, so it
// plays straight through, and the scenes follow the recording's clock.
//
// Kept in IndexedDB, so a video is only ever narrated once, and a narration
// cut short (the tab closed) picks up where it stopped.

import { narrate, prepareNarrator } from "./tts.js";

const DB = "dwiddle-narration";
const STORE = "lines";
const GAP = 0.45; // seconds of quiet between lines
const KEEP = 8;   // narrations kept on the device, the newest

let dbp = null;
function db() {
  dbp ||= new Promise((ok, no) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => no(req.error);
  });
  return dbp;
}
async function idb(mode, fn) {
  const d = await db();
  return new Promise((ok, no) => {
    const t = d.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => ok(r?.result);
    t.onerror = () => no(t.error);
  });
}
const getLine = (key) => idb("readonly", (s) => s.get(key)).catch(() => undefined);
const putLine = (key, v) => idb("readwrite", (s) => s.put(v, key)).catch(() => {});

// The same words always give the same key, so a video made again with the
// same script reuses its narration.
export function narrationKey(video) {
  const text = video.scenes.flatMap((s) => s.lines).join("\n");
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `v${(h >>> 0).toString(36)}_${text.length}`;
}
const linesOf = (video) => video.scenes.flatMap((s) => s.lines);

// Only the newest few narrations are kept, so the device does not fill up.
function remember(key) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem("dwiddle-narrations") || "[]"); } catch { /* start again */ }
  list = [key, ...list.filter((k) => k !== key)];
  const drop = list.slice(KEEP);
  try { localStorage.setItem("dwiddle-narrations", JSON.stringify(list.slice(0, KEEP))); } catch { /* fine */ }
  if (drop.length) {
    idb("readwrite", (s) => {
      const req = s.openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return;
        if (drop.some((k) => String(c.key).startsWith(k + ":"))) c.delete();
        c.continue();
      };
    }).catch(() => {});
  }
}

/* ---------- making it, in the background ---------- */

const jobs = new Map(); // key -> { done, total, state, error, listeners, promise }

function tell(job) { job.listeners.forEach((f) => f({ done: job.done, total: job.total, state: job.state, error: job.error })); }

// Starts making a video's narration, or returns the job already under way.
// state: "making" | "ready" | "failed"
export function prepareNarration(video) {
  const key = narrationKey(video);
  if (jobs.has(key)) return jobs.get(key);
  const lines = linesOf(video);
  const job = { key, done: 0, total: lines.length, state: "making", error: "", listeners: new Set() };
  jobs.set(key, job);
  remember(key);
  job.promise = (async () => {
    try {
      // Lines already made on an earlier visit are skipped.
      const have = await Promise.all(lines.map((_, i) => getLine(`${key}:${i}`)));
      job.done = have.filter(Boolean).length;
      tell(job);
      if (job.done < lines.length) {
        const ok = await prepareNarrator();
        if (!ok) throw new Error("The narrator's voice could not be downloaded.");
      }
      for (let i = 0; i < lines.length; i++) {
        if (have[i]) continue;
        const clip = await narrate(lines[i], 1);
        // Kept as 16 bit samples: half the size, and all a voice needs.
        const pcm = new Int16Array(clip.audio.length);
        for (let k = 0; k < pcm.length; k++) pcm[k] = Math.max(-1, Math.min(1, clip.audio[k])) * 32767;
        await putLine(`${key}:${i}`, { sr: clip.sr, pcm: pcm.buffer });
        job.done += 1;
        tell(job);
      }
      job.state = "ready";
    } catch (err) {
      job.state = "failed";
      job.error = err?.message || "The narration could not be made.";
      jobs.delete(key); // so a later try starts again
    }
    tell(job);
    return job.state === "ready";
  })();
  return job;
}

// Follows a video's narration as it is made. Returns a function that stops.
export function onNarration(video, fn) {
  const job = prepareNarration(video);
  job.listeners.add(fn);
  fn({ done: job.done, total: job.total, state: job.state, error: job.error });
  return () => job.listeners.delete(fn);
}

/* ---------- playing it ---------- */

// The whole narration as one recording: { url, starts, duration }, where
// starts[i] is when line i begins, in seconds.
export async function narrationAudio(video) {
  const key = narrationKey(video);
  const lines = linesOf(video);
  const parts = await Promise.all(lines.map((_, i) => getLine(`${key}:${i}`)));
  if (parts.some((p) => !p)) return null;
  const sr = parts[0].sr;
  const gap = Math.round(GAP * sr);
  const total = parts.reduce((n, p) => n + p.pcm.byteLength / 2 + gap, 0);
  const pcm = new Int16Array(total);
  const starts = [];
  let at = 0;
  for (const p of parts) {
    starts.push(at / sr);
    pcm.set(new Int16Array(p.pcm), at);
    at += p.pcm.byteLength / 2 + gap;
  }
  return { url: URL.createObjectURL(wav(pcm, sr)), starts, duration: total / sr };
}

// 16 bit mono samples as a WAV file the browser's own audio player can play,
// with its speed control that keeps the voice's pitch.
function wav(pcm, sr) {
  const head = new DataView(new ArrayBuffer(44));
  const text = (o, s) => [...s].forEach((c, i) => head.setUint8(o + i, c.charCodeAt(0)));
  text(0, "RIFF"); head.setUint32(4, 36 + pcm.byteLength, true); text(8, "WAVE");
  text(12, "fmt "); head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 1, true);
  head.setUint32(24, sr, true); head.setUint32(28, sr * 2, true); head.setUint16(32, 2, true); head.setUint16(34, 16, true);
  text(36, "data"); head.setUint32(40, pcm.byteLength, true);
  return new Blob([head.buffer, pcm.buffer], { type: "audio/wav" });
}
