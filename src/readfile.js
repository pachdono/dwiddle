// Turning whatever was dropped in into plain text.
//
// PDF, Word and PowerPoint are read here in the browser and are exact, because
// all three store their text. A photograph has no text to read, so it goes to
// the server to be transcribed by a model that reads images. Nothing is
// trained: the accuracy comes from the format in the first two cases, and from
// an existing model in the third.
//
// This sits on its own because two pages need it: the one that builds material
// out of a chapter, and the one that works a single question through.

import { readImage } from "./ai.js";
import { shrink } from "./custom.js";

export const MAX_FILE = 20 * 1024 * 1024; // the limit the drop zone advertises
export const IMAGE = /\.(png|jpe?g|webp|heic|heif|gif|bmp)$/i;

// onPage(page, of) is told each page of a PDF as it is read, so a long one
// can say how far it has got.
export async function readFile(file, { onPage, photo } = {}) {
  if (file.size > MAX_FILE) {
    throw new Error(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB, over the 20 MB limit. Split it and add a chapter at a time.`);
  }
  if (!/\.(pdf|docx|pptx|txt|md|markdown)$/i.test(file.name) && !IMAGE.test(file.name)) {
    if (/\.(doc|ppt)$/i.test(file.name)) {
      throw new Error("That is the older Office format. Open it and save it as .docx or .pptx first.");
    }
    throw new Error("That file type cannot be read. Use a PDF, Word, PowerPoint, a photo, or plain text.");
  }

  if (/\.(docx|pptx)$/i.test(file.name)) {
    const { readOffice } = await import("./office.js");
    return readOffice(file);
  }

  if (IMAGE.test(file.name)) {
    if (/\.(heic|heif)$/i.test(file.name)) {
      throw new Error("iPhone HEIC photos cannot be read by the browser. In Settings, Camera, Formats, choose Most Compatible, or send the photo to yourself first, which converts it to JPEG.");
    }
    // Resized before sending: a phone photo is several megabytes and the
    // server rejects a body that size, while the text stays legible at 1600px.
    const data = await shrink(file, photo?.maxSide || 1600, photo?.quality || 0.85);
    const { text } = await readImage(data);
    return text;
  }
  if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let text = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      onPage?.(p, doc.numPages);
      text += content.items.map((it) => it.str).join(" ") + "\n";
    }
    // Little or no text means a scan or photographed pages: each page is
    // drawn to a picture and read like a photo, a few at a time.
    if (text.replace(/\s/g, "").length < 40 * doc.numPages * 0.25 || text.trim().length < 80) {
      const pages = Math.min(doc.numPages, 25);
      const out = new Array(pages).fill("");
      let next = 1, done = 0, failed = 0;
      const worker = async () => {
        while (next <= pages) {
          const n = next++;
          try {
            const page = await doc.getPage(n);
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: Math.min(2, 1500 / Math.max(base.width, base.height)) });
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
            await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
            const { text: t } = await readImage(canvas.toDataURL("image/jpeg", 0.8));
            out[n - 1] = t || "";
          } catch { failed++; }
          onPage?.(++done, pages);
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      const joined = out.filter(Boolean).join("\n");
      if (!joined.trim()) throw new Error(failed ? "That PDF is a scan and its pages could not be read just now. Try again in a minute, or add photos of the pages." : "That PDF has no readable text, not even as pictures of pages. Try a clearer copy.");
      return doc.numPages > pages ? `${joined}\n(Only the first ${pages} pages of this scan were read.)` : joined;
    }
    return text;
  }
  return file.text();
}

