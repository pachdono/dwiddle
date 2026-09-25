// Cutting the subject out of a photo, for a notebook cover sticker: a pet,
// a person, a car, a plant pot. Runs on the device with Google's MediaPipe
// and a small DeepLab model served with the app, so nothing is uploaded
// and it costs nothing.

let segmenter = null;

async function load() {
  if (segmenter) return segmenter;
  const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
  const base = new URL("seg/", document.baseURI).href;
  const fileset = await FilesetResolver.forVisionTasks(base + "wasm");
  segmenter = await ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: base + "deeplab_v3.tflite" },
    runningMode: "IMAGE",
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });
  return segmenter;
}

const loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

// Returns a PNG data URL of the subject on a transparent background, with a
// white sticker outline, trimmed to fit. Throws when nothing stands out.
export async function cutout(src, { outline = true } = {}) {
  const img = await loadImage(src);
  const max = 640;
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * k), h = Math.round(img.height * k);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0, w, h);

  const seg = await load();
  const result = seg.segment(c);
  const mask = result.categoryMask;
  const labels = mask.getAsUint8Array();
  const mw = mask.width, mh = mask.height;

  // Anything that is not background (category 0) is kept, softened a little
  // at the edge so it does not look jagged.
  const alpha = document.createElement("canvas");
  alpha.width = mw; alpha.height = mh;
  const ag = alpha.getContext("2d");
  const data = ag.createImageData(mw, mh);
  let kept = 0;
  for (let i = 0; i < labels.length; i++) {
    const on = labels[i] !== 0;
    if (on) kept++;
    data.data[i * 4 + 3] = on ? 255 : 0;
  }
  mask.close?.();
  result.close?.();
  if (kept < labels.length * 0.02) throw new Error("Nothing stood out in that photo.");
  ag.putImageData(data, 0, 0);

  const cut = document.createElement("canvas");
  cut.width = w; cut.height = h;
  const cg = cut.getContext("2d");
  cg.filter = "blur(1.5px)";
  cg.drawImage(alpha, 0, 0, w, h);
  cg.filter = "none";
  // Pulls the edge in a touch, so none of the old background (grass behind
  // a dog, a wall behind a person) clings to the outline.
  const edge = cg.getImageData(0, 0, w, h);
  for (let i = 3; i < edge.data.length; i += 4) {
    const a = edge.data[i];
    edge.data[i] = a < 150 ? 0 : Math.min(255, (a - 150) * 2.5);
  }
  cg.putImageData(edge, 0, 0);
  cg.globalCompositeOperation = "source-in";
  cg.drawImage(c, 0, 0);

  // The white border of a real sticker: the shape drawn in white a few
  // pixels out in every direction, underneath.
  const pad = outline ? 10 : 0;
  const out = document.createElement("canvas");
  out.width = w + pad * 2; out.height = h + pad * 2;
  const og = out.getContext("2d");
  if (outline) {
    const white = document.createElement("canvas");
    white.width = w; white.height = h;
    const wg = white.getContext("2d");
    wg.drawImage(cut, 0, 0);
    wg.globalCompositeOperation = "source-in";
    wg.fillStyle = "#fff";
    wg.fillRect(0, 0, w, h);
    og.shadowColor = "rgba(0,0,0,.25)"; og.shadowBlur = 8; og.shadowOffsetY = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) og.drawImage(white, pad + Math.cos(a) * 6, pad + Math.sin(a) * 6);
    og.shadowColor = "transparent";
  }
  og.drawImage(cut, pad, pad);
  return trim(out).toDataURL("image/png");
}

// Crops away the empty edges.
function trim(canvas) {
  const g = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  const d = g.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0 || y1 <= y0) return canvas;
  const t = document.createElement("canvas");
  t.width = x1 - x0 + 1; t.height = y1 - y0 + 1;
  t.getContext("2d").drawImage(canvas, -x0, -y0);
  return t;
}
