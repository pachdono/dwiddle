// Saving a video as a file.
//
// A video here is a script the app plays (see Video.jsx), so a file has to be
// made from it. Every line of the script is drawn off screen exactly as the
// player shows it, with the Dwiddle watermark top right, photographed, and
// the photographs are encoded as an MP4 together with the narration. It is
// all done on the device, faster than the video plays, using the browser's
// own video encoder, so nothing is uploaded and nothing is paid for.
//
// Frames: a title card, one picture per line of the script (with a short
// fade between scenes and a progress bar along the bottom), and a closing
// card. Where the video is narrated, its recording is the soundtrack.

import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { toCanvas } from "html-to-image";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { ExportFrame } from "./Video.jsx";
import { narrationPcm } from "./narration.js";

const W = 1280, H = 800, FPS = 10;
const INTRO = 2.5, OUTRO = 3, FADE = 0.4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const canSaveVideo = () => typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";

const wordsOf = (s) => String(s).split(/\s+/).filter(Boolean).length;
const lineSeconds = (text) => wordsOf(text) / 2.5 + 0.45;

// The best video codec this browser can encode, newest compatible first.
async function pickVideoCodec() {
  const options = [
    { codec: "avc1.640028", mux: "avc", extra: { avc: { format: "avc" } } },
    { codec: "avc1.4d0028", mux: "avc", extra: { avc: { format: "avc" } } },
    { codec: "vp09.00.40.08", mux: "vp9", extra: {} },
    { codec: "av01.0.08M.08", mux: "av1", extra: {} },
  ];
  for (const o of options) {
    try {
      const r = await VideoEncoder.isConfigSupported({ codec: o.codec, width: W, height: H, bitrate: 2_500_000, framerate: FPS, ...o.extra });
      if (r?.supported) return o;
    } catch { /* try the next */ }
  }
  return null;
}
async function pickAudioCodec(sampleRate) {
  if (typeof AudioEncoder === "undefined") return null;
  for (const o of [{ codec: "mp4a.40.2", mux: "aac" }, { codec: "opus", mux: "opus" }]) {
    try {
      const r = await AudioEncoder.isConfigSupported({ codec: o.codec, sampleRate, numberOfChannels: 1, bitrate: 64000 });
      if (r?.supported) return o;
    } catch { /* try the next */ }
  }
  return null;
}

// The photographing library copies every element's style except those inside
// an SVG, where it leaves only the attributes, so drawings lost their fills,
// outlines and hidden parts. Each SVG element's final look is written onto
// it first, from what the browser worked out.
const SVG_LOOK = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "opacity", "display", "visibility", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "paint-order", "letter-spacing", "filter", "clip-path", "mix-blend-mode", "marker-start", "marker-mid", "marker-end", "color"];
function freezeSvg(node) {
  for (const el of node.querySelectorAll("svg *")) {
    const cs = getComputedStyle(el);
    for (const p of SVG_LOOK) el.style.setProperty(p, cs.getPropertyValue(p));
    if (!el.hasAttribute("transform")) {
      const tf = cs.getPropertyValue("transform");
      if (tf && tf !== "none") {
        el.style.setProperty("transform", tf);
        el.style.setProperty("transform-origin", cs.getPropertyValue("transform-origin"));
        el.style.setProperty("transform-box", cs.getPropertyValue("transform-box"));
      }
    }
  }
}

// Draws one frame of the script off screen and returns it as a canvas.
async function shoot(host, root, props, scene) {
  flushSync(() => root.render(createElement(ExportFrame, props)));
  const node = host.querySelector(".vd-stage-export");
  // Fonts, and any picture the scene fetches (a diagram from Wikimedia), are
  // waited for, but never for long: a missing picture is not worth a stall.
  const t0 = Date.now();
  const wantsPicture = !!scene?.diagram?.picture;
  while (Date.now() - t0 < 4500) {
    const imgs = [...node.querySelectorAll("img")];
    if (imgs.every((i) => i.complete && i.naturalWidth > 0) && (!wantsPicture || imgs.length)) break;
    await sleep(80);
  }
  try { await document.fonts?.ready; } catch { /* fine */ }
  await sleep(40);
  freezeSvg(node);
  return toCanvas(node, { width: W, height: H, pixelRatio: 1, cacheBust: false });
}

// onProgress({ phase, done, total }); signal: an AbortSignal to cancel with.
// Resolves to an MP4 Blob.
export async function exportVideo(video, { onProgress, signal } = {}) {
  if (!canSaveVideo()) throw new Error("This browser cannot save videos as a file. Chrome, Edge or the Dwiddle app can.");
  const check = () => { if (signal?.aborted) throw new DOMException("Cancelled", "AbortError"); };

  const beats = video.scenes.flatMap((sc, si) => sc.lines.map((text, li) => ({ si, li, text })));
  const pcm = video.silent ? null : await narrationPcm(video);
  if (!video.silent && !pcm) throw new Error("The narration is not ready yet. Wait for it to finish recording, then save.");
  let t = 0;
  const starts = pcm ? pcm.starts : beats.map((b) => { const s = t; t += lineSeconds(b.text); return s; });
  const bodyLength = pcm ? pcm.duration : t;
  const total = INTRO + bodyLength + OUTRO;

  const segments = [
    { from: 0, to: INTRO, props: { video, card: "intro" } },
    ...beats.map((b, i) => ({ from: INTRO + starts[i], to: INTRO + (starts[i + 1] ?? bodyLength), props: { video, si: b.si, li: b.li, text: b.text }, scene: video.scenes[b.si], si: b.si })),
    { from: INTRO + bodyLength, to: total, props: { video, card: "outro" } },
  ];

  const vcodec = await pickVideoCodec();
  if (!vcodec) throw new Error("This browser cannot encode video. Chrome, Edge or the Dwiddle app can.");
  const acodec = pcm ? await pickAudioCodec(pcm.sr) : null;
  if (pcm && !acodec) throw new Error("This browser cannot encode the narration's sound. Chrome, Edge or the Dwiddle app can.");

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: vcodec.mux, width: W, height: H, frameRate: FPS },
    ...(pcm ? { audio: { codec: acodec.mux, numberOfChannels: 1, sampleRate: pcm.sr } } : {}),
    fastStart: "in-memory",
  });
  let failure = null;
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { failure = e; } });
  venc.configure({ codec: vcodec.codec, width: W, height: H, bitrate: 2_500_000, framerate: FPS, ...vcodec.extra });

  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const work = document.createElement("canvas");
  work.width = W; work.height = H;
  const ctx = work.getContext("2d");
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#3b5bfd";

  try {
    let prev = null, prevScene = null, frame = 0;
    for (let k = 0; k < segments.length; k++) {
      check();
      if (failure) throw failure;
      const seg = segments[k];
      onProgress?.({ phase: "frames", done: k, total: segments.length });
      const shot = await shoot(host, root, seg.props, seg.scene);
      const first = Math.ceil(seg.from * FPS - 1e-9), last = Math.ceil(seg.to * FPS - 1e-9);
      for (let f = Math.max(first, frame); f < last; f++) {
        const at = f / FPS;
        ctx.globalAlpha = 1;
        const fading = prev && seg.si !== prevScene && at - seg.from < FADE;
        if (fading) {
          const a = (at - seg.from) / FADE;
          ctx.drawImage(prev, 0, 0);
          ctx.globalAlpha = a;
          ctx.drawImage(shot, 0, 0);
          ctx.globalAlpha = 1;
        } else ctx.drawImage(shot, 0, 0);
        // A progress bar along the bottom, over the lesson itself.
        if (at >= INTRO && at < INTRO + bodyLength) {
          ctx.fillStyle = accent;
          ctx.fillRect(0, H - 6, W * ((at - INTRO) / bodyLength), 6);
        }
        const vf = new VideoFrame(work, { timestamp: Math.round(at * 1e6), duration: Math.round(1e6 / FPS) });
        venc.encode(vf, { keyFrame: f % (FPS * 2) === 0 });
        vf.close();
        frame = f + 1;
        while (venc.encodeQueueSize > 24) await sleep(8);
      }
      prev = shot; prevScene = seg.si;
    }
    onProgress?.({ phase: "encoding", done: segments.length, total: segments.length });
    await venc.flush();
    if (failure) throw failure;

    if (pcm) {
      const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { failure = e; } });
      aenc.configure({ codec: acodec.codec, sampleRate: pcm.sr, numberOfChannels: 1, bitrate: 64000 });
      // The title card is silent: the soundtrack starts at zero with quiet
      // for the card, as the file format needs, then the narration.
      const lead = Math.round(INTRO * pcm.sr);
      const full = new Int16Array(lead + pcm.pcm.length);
      full.set(pcm.pcm, lead);
      const block = pcm.sr; // one second at a time
      for (let at = 0; at < full.length; at += block) {
        check();
        const n = Math.min(block, full.length - at);
        const data = new Float32Array(n);
        for (let i = 0; i < n; i++) data[i] = full[at + i] / 32768;
        const ad = new AudioData({ format: "f32-planar", sampleRate: pcm.sr, numberOfFrames: n, numberOfChannels: 1, timestamp: Math.round((at / pcm.sr) * 1e6), data });
        aenc.encode(ad);
        ad.close();
        while (aenc.encodeQueueSize > 24) await sleep(8);
      }
      await aenc.flush();
      aenc.close();
      if (failure) throw failure;
    }
    venc.close();
    muxer.finalize();
    return new Blob([muxer.target.buffer], { type: "video/mp4" });
  } finally {
    try { if (venc.state !== "closed") venc.close(); } catch { /* already closed */ }
    root.unmount();
    host.remove();
  }
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
