// Runs the Kokoro voice model off the main thread, so speech is made
// without freezing the page. Kokoro is a small open voice model (Apache
// licence) that runs on the device: free, private, and offline once its
// files are downloaded the first time. It needs the graphics chip (WebGPU)
// to be quick enough to speak without pauses.

import { KokoroTTS } from "kokoro-js";

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
let loading = null;

function load() {
  loading ||= KokoroTTS.from_pretrained(MODEL, {
    dtype: "q4f16",
    device: "webgpu",
    progress_callback: (p) => {
      if (p.status === "progress" && p.total > 5e6) postMessage({ type: "progress", loaded: p.loaded, total: p.total });
    },
  });
  return loading;
}

self.onmessage = async ({ data }) => {
  if (data.type === "load") {
    try { await load(); postMessage({ type: "ready" }); } catch (e) { loading = null; postMessage({ type: "failed", message: String(e?.message || e) }); }
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
