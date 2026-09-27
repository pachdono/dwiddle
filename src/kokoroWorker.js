// Runs the Kokoro voice model off the main thread, so speech is made
// without freezing the page. Kokoro is a small open voice model (Apache
// licence) that runs on the device: free, private, and offline once its
// files are downloaded the first time (about 90 MB). It runs on the
// processor, and speech is made a line or two ahead of where it is played.

import { KokoroTTS } from "kokoro-js";
import { env } from "@huggingface/transformers";

// The engine's own files come from this site (see vite.config.js), never a CDN.
env.backends.onnx.wasm.wasmPaths = new URL("../ort/", import.meta.url).href;

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
let loading = null;
let device = null;

const progress_callback = (p) => {
  if (p.status === "progress" && p.total > 5e6) postMessage({ type: "progress", loaded: p.loaded, total: p.total });
};

// Always on the processor, in 8 bit. On the graphics chip the model's
// smaller builds garble speech into a low, distorted growl on many machines
// (Macs among them), which is worse than a line taking a moment to make.
async function tryLoad() {
  const tts = await KokoroTTS.from_pretrained(MODEL, { dtype: "q8", device: "wasm", progress_callback });
  device = "wasm";
  return tts;
}

function load() {
  loading ||= tryLoad().catch((e) => { loading = null; throw e; });
  return loading;
}

self.onmessage = async ({ data }) => {
  if (data.type === "load") {
    try { await load(); postMessage({ type: "ready", device }); } catch (e) { postMessage({ type: "failed", message: String(e?.message || e) }); }
    return;
  }
  if (data.type === "speak") {
    try {
      const tts = await load();
      const out = await tts.generate(data.text, { voice: data.voice, speed: data.speed || 1 });
      const audio = out.audio;
      postMessage({ type: "audio", id: data.id, audio, sr: out.sampling_rate }, [audio.buffer]);
    } catch (e) {
      postMessage({ type: "error", id: data.id, message: String(e?.message || e) });
    }
  }
};
