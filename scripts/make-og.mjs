// Builds the social share card as a real PNG.
//
// Link previews on WhatsApp, Discord, Instagram and X do not render SVG, so the
// card has to be a raster image. This draws it as SVG, which keeps it in source
// control as text, and renders it once at 1200x630.
//
// The mascot is lifted from the SVG this script wrote last time, so the card
// and scripts/make-og-collab.mjs always show the same duck. (Pulling it out of
// src/Duck.jsx broke once that file moved on.)
//
//   node scripts/make-og.mjs

import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const prev = readFileSync(new URL("../public/og.svg", import.meta.url), "utf8");
const at = Math.max(prev.indexOf('<g id="duck"'), prev.indexOf('<g transform="translate(880 130) scale(2.4)">'));
const duck = prev.slice(prev.indexOf(">", at) + 1, prev.lastIndexOf("</g>"));

const PILLS = ["Lessons", "Notebooks", "Duels", "Test prep", "Decks"];
let x = 84;
const pills = PILLS.map((label) => {
  const w = 34 + label.length * 13;
  const el = `
  <g transform="translate(${x} 478)">
    <rect width="${w}" height="46" rx="23" fill="#171a24" stroke="#2c3040"/>
    <text x="${w / 2}" y="30" font-family="${FONT}" font-size="20" font-weight="600" fill="#c9cfe0" text-anchor="middle">${label}</text>
  </g>`;
  x += w + 12;
  return el;
}).join("");

const lines = Array.from({ length: 6 }, (_, i) => `<line x1="24" y1="${78 + i * 40}" x2="300" y2="${78 + i * 40}" stroke="#dfe3ee" stroke-width="2"/>`).join("");
const cursor = (fill, label, w) => `<path d="M0 0 L0 28 L7 21 L13 33 L18 31 L12 19 L22 19 Z" fill="${fill}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
      <rect x="20" y="28" width="${w}" height="26" rx="9" fill="${fill}"/><text x="${20 + w / 2}" y="46" font-family="${FONT}" font-size="16" font-weight="700" fill="#fff" text-anchor="middle">${label}</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="30%" cy="0%" r="75%">
      <stop offset="0%" stop-color="#5a6eff" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#5a6eff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="#0f1117"/>
  <rect width="1200" height="440" fill="url(#glow)"/>

  <text x="84" y="190" font-family="${FONT}" font-size="64" font-weight="800" letter-spacing="-2" fill="#ffffff">Turn your notes into</text>
  <text x="84" y="262" font-family="${FONT}" font-size="64" font-weight="800" letter-spacing="-2" fill="#8ba0ff">the real exam.</text>

  <text x="84" y="344" font-family="${FONT}" font-size="26" fill="#a9b0c4">Questions, lessons and full timed papers from your own</text>
  <text x="84" y="382" font-family="${FONT}" font-size="26" fill="#a9b0c4">notes, plus notebooks you can write in together, live.</text>
  <text x="84" y="436" font-family="${FONT}" font-size="22" font-weight="600" fill="#6f7792">Free. SAT, ACT, SSAT, IELTS, TOEFL and your own material.</text>

  ${pills}

  <g transform="translate(830 64) scale(0.8) rotate(-5 160 130)">
    <rect width="330" height="250" rx="20" fill="#1b1f2c" stroke="#2c3040" stroke-width="2"/>
    <text x="26" y="48" font-family="${FONT}" font-size="20" font-weight="700" fill="#e8ebf5">What is osmosis?</text>
    <rect x="22" y="70" width="286" height="40" rx="12" fill="#151824" stroke="#2c3040"/>
    <text x="40" y="96" font-family="${FONT}" font-size="17" fill="#a9b0c4">Movement of solute</text>
    <rect x="22" y="120" width="286" height="40" rx="12" fill="#12301f" stroke="#2f9e6b" stroke-width="2"/>
    <text x="40" y="146" font-family="${FONT}" font-size="17" font-weight="600" fill="#bdf0d4">Water through a membrane</text>
    <rect x="22" y="170" width="286" height="40" rx="12" fill="#151824" stroke="#2c3040"/>
    <text x="40" y="196" font-family="${FONT}" font-size="17" fill="#a9b0c4">Movement using energy</text>
    <circle cx="300" cy="14" r="26" fill="#1fa866"/><path d="M288 14 L297 23 L312 5" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <g transform="translate(884 244) scale(0.72) rotate(4 150 170)">
    <rect width="324" height="318" rx="20" fill="#ffffff"/>
    <line x1="64" y1="0" x2="64" y2="318" stroke="#f0a5a5" stroke-width="2"/>
    ${lines}
    <path d="M84 104 C112 80 146 126 184 98 S252 88 288 108" fill="none" stroke="#2f6fe0" stroke-width="6" stroke-linecap="round"/>
    <path d="M84 176 C122 204 160 150 206 182" fill="none" stroke="#e8863a" stroke-width="6" stroke-linecap="round"/>
    <g transform="translate(206 182)">${cursor("#e8863a", "Sam", 48)}</g>
    <path d="M84 250 L136 250" fill="none" stroke="#2f9e6b" stroke-width="6" stroke-linecap="round"/>
    <g transform="translate(136 250)">${cursor("#2f9e6b", "You", 44)}</g>
  </g>

  <g id="duck" transform="translate(1022 496) scale(0.95)">
    ${duck}
  </g>
</svg>`;

writeFileSync(new URL("../public/og.svg", import.meta.url), svg);

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(
  new URL("../public/og.png", import.meta.url).pathname,
);

const meta = await sharp(new URL("../public/og.png", import.meta.url).pathname).metadata();
console.log(`og.png written: ${meta.width}x${meta.height}`);
