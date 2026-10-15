// Builds the social share card as a real PNG.
//
// Link previews on WhatsApp, Discord, Instagram and X do not render SVG, so the
// card has to be a raster image. This draws it as SVG, which keeps it in source
// control as text, and renders it once at 1200x630. The look (the Duck Lagoon
// palette) is in og-shared.mjs, shared with the collaboration card.
//
//   node scripts/make-og.mjs

import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { FONT, INK, ACCENT, BODY, QUIET, duckInner, defs, scene, pill, notebook } from "./og-shared.mjs";

const duck = duckInner(); // read before og.svg is rewritten below

let x = 84;
const pills = ["Lessons", "Notebooks", "Duels", "Test prep", "Decks"].map((label) => {
  const p = pill(x, 470, label);
  x += p.w + 12;
  return p.svg;
}).join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${defs}
  ${scene()}

  <text x="84" y="168" font-family="${FONT}" font-size="64" font-weight="800" letter-spacing="-2" fill="${INK}">Turn your notes into</text>
  <text x="84" y="240" font-family="${FONT}" font-size="64" font-weight="800" letter-spacing="-2" fill="${ACCENT}">the real exam.</text>

  <text x="84" y="308" font-family="${FONT}" font-size="26" fill="${BODY}">Questions, lessons and full timed papers from your own</text>
  <text x="84" y="346" font-family="${FONT}" font-size="26" fill="${BODY}">notes, plus notebooks you can write in together, live.</text>
  <text x="84" y="414" font-family="${FONT}" font-size="22" font-weight="600" fill="${QUIET}">Free. SAT, ACT, SSAT, IELTS, TOEFL and your own material.</text>

  ${pills}

  <g transform="translate(830 54) scale(0.8) rotate(-5 160 130)" filter="url(#lift)">
    <rect width="330" height="250" rx="20" fill="#ffffff"/>
    <text x="26" y="48" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK}">What is osmosis?</text>
    <rect x="22" y="70" width="286" height="40" rx="12" fill="#f3f8f6" stroke="#d4e6df"/>
    <text x="40" y="96" font-family="${FONT}" font-size="17" fill="${BODY}">Movement of solute</text>
    <rect x="22" y="120" width="286" height="40" rx="12" fill="#dff5e9" stroke="#2f9e6b" stroke-width="2"/>
    <text x="40" y="146" font-family="${FONT}" font-size="17" font-weight="600" fill="#14532d">Water through a membrane</text>
    <rect x="22" y="170" width="286" height="40" rx="12" fill="#f3f8f6" stroke="#d4e6df"/>
    <text x="40" y="196" font-family="${FONT}" font-size="17" fill="${BODY}">Movement using energy</text>
    <circle cx="300" cy="14" r="26" fill="#1fa866"/><path d="M288 14 L297 23 L312 5" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <g transform="translate(884 244) scale(0.72) rotate(4 150 170)">
    ${notebook()}
  </g>

  <g id="duck" transform="translate(1012 490) scale(0.95)">
    ${duck}
  </g>
</svg>`;

writeFileSync(new URL("../public/og.svg", import.meta.url), svg);

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(
  new URL("../public/og.png", import.meta.url).pathname,
);

const meta = await sharp(new URL("../public/og.png", import.meta.url).pathname).metadata();
console.log(`og.png written: ${meta.width}x${meta.height}`);
