// Reading a .docx without a library.
//
// A .docx is a ZIP archive. The text lives in word/document.xml as a stream of
// <w:t> runs inside <w:p> paragraphs. So this unzips the one entry it needs
// and pulls the runs out. No AI is involved and nothing is sent anywhere: the
// result is exact, not a transcription.
//
// The browser can inflate on its own through DecompressionStream, so this
// costs a couple of kilobytes rather than the hundred a ZIP library would.

const dec = new TextDecoder();

function u16(v, o) { return v.getUint16(o, true); }
function u32(v, o) { return v.getUint32(o, true); }

// Walks the central directory backwards from the end of central directory
// record, which is the only reliable way to find entries in a ZIP.
function entries(buf) {
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);

  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 65558; i--) {
    if (u32(v, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("That file is not a valid Word document.");

  const count = u16(v, eocd + 10);
  let at = u32(v, eocd + 16);
  const out = [];

  for (let i = 0; i < count; i++) {
    if (u32(v, at) !== 0x02014b50) break;
    const method = u16(v, at + 10);
    const compressed = u32(v, at + 20);
    const nameLen = u16(v, at + 28);
    const extraLen = u16(v, at + 30);
    const commentLen = u16(v, at + 32);
    const localAt = u32(v, at + 42);
    const name = dec.decode(bytes.subarray(at + 46, at + 46 + nameLen));
    out.push({ name, method, compressed, localAt });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function read(buf, entry) {
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);
  if (u32(v, entry.localAt) !== 0x04034b50) throw new Error("That Word document is damaged.");

  // The local header repeats the name and extra field with its own lengths.
  const start = entry.localAt + 30 + u16(v, entry.localAt + 26) + u16(v, entry.localAt + 28);
  const raw = bytes.subarray(start, start + entry.compressed);

  if (entry.method === 0) return dec.decode(raw);
  if (entry.method !== 8) throw new Error("That Word document uses an unsupported compression method.");

  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return dec.decode(await new Response(stream).arrayBuffer());
}

// Paragraph and row boundaries become newlines, tabs become spaces, and every
// other tag is dropped. Keeping paragraphs matters: the model reads structure.
function textOf(xml) {
  return xml
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<w:br\b[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:tc>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function readDocx(file) {
  const buf = await file.arrayBuffer();
  const list = entries(buf);

  const main = list.find((e) => e.name === "word/document.xml");
  if (!main) {
    // .doc is a completely different, pre 2007 binary format.
    throw new Error("That looks like an older .doc file. Open it in Word and save it as .docx first.");
  }

  const parts = [textOf(await read(buf, main))];

  // Text boxes, headers and footnotes live in their own parts. Skipping them
  // silently loses content people put definitions in.
  for (const e of list) {
    if (/^word\/(footnotes|endnotes|header\d*|footer\d*)\.xml$/.test(e.name)) {
      const t = textOf(await read(buf, e));
      if (t.length > 40) parts.push(t);
    }
  }

  const text = parts.join("\n\n").trim();
  if (!text) throw new Error("That Word document has no text in it.");
  return text;
}
