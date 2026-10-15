// Builds the share card for collaboration links (/notebook?live=CODE) as a real
// PNG, the same way scripts/make-og.mjs builds the front page's. The mascot is
// taken from the finished public/og.svg, so the two cards always show the same duck.
//
//   node scripts/make-og-collab.mjs

import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const main = readFileSync(new URL("../public/og.svg", import.meta.url), "utf8");
const start = main.indexOf('<g transform="translate(880 130) scale(2.4)">');
const duck = main.slice(main.indexOf(">", start) + 1, main.lastIndexOf("</g>"));

// The card for a collaboration link: the notebook page with two people writing
// on it at once, each with a named cursor.
const lines = Array.from({ length: 7 }, (_, i) => `<line x1="30" y1="${96 + i * 44}" x2="390" y2="${96 + i * 44}" stroke="#dfe3ee" stroke-width="2"/>`).join("");
const collab = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="30%" cy="0%" r="75%">
      <stop offset="0%" stop-color="#5a6eff" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#5a6eff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0f1117"/>
  <rect width="1200" height="440" fill="url(#glow)"/>

  <text x="84" y="205" font-family="${FONT}" font-size="74" font-weight="800" letter-spacing="-2.5" fill="#ffffff">Write in it</text>
  <text x="84" y="285" font-family="${FONT}" font-size="74" font-weight="800" letter-spacing="-2.5" fill="#8ba0ff">together, live.</text>
  <text x="84" y="360" font-family="${FONT}" font-size="26" fill="#a9b0c4">Open the link to join this notebook. You both write,</text>
  <text x="84" y="398" font-family="${FONT}" font-size="26" fill="#a9b0c4">draw and add things on the same page at once.</text>

  <g transform="translate(84 470)">
    <rect width="296" height="46" rx="23" fill="#171a24" stroke="#2c3040"/>
    <circle cx="30" cy="23" r="9" fill="#2f9e6b"/><circle cx="50" cy="23" r="9" fill="#e8863a"/>
    <text x="72" y="30" font-family="${FONT}" font-size="20" font-weight="600" fill="#c9cfe0">Two people in it now</text>
  </g>

  <g transform="translate(700 90) rotate(3 210 220)">
    <rect width="420" height="440" rx="22" fill="#ffffff"/>
    <line x1="84" y1="0" x2="84" y2="440" stroke="#f0a5a5" stroke-width="2"/>
    ${lines}
    <path d="M110 130 C150 100 190 160 240 124 S320 110 360 134" fill="none" stroke="#2f6fe0" stroke-width="7" stroke-linecap="round"/>
    <path d="M110 218 C160 250 210 190 262 226" fill="none" stroke="#e8863a" stroke-width="7" stroke-linecap="round"/>
    <path d="M110 330 L240 330" fill="none" stroke="#2f9e6b" stroke-width="7" stroke-linecap="round"/>
    <g transform="translate(262 226)"><path d="M0 0 L0 30 L8 23 L14 36 L19 34 L13 21 L24 21 Z" fill="#e8863a" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
      <rect x="22" y="30" width="56" height="28" rx="9" fill="#e8863a"/><text x="50" y="50" font-family="${FONT}" font-size="17" font-weight="700" fill="#fff" text-anchor="middle">Sam</text></g>
    <g transform="translate(240 330)"><path d="M0 0 L0 30 L8 23 L14 36 L19 34 L13 21 L24 21 Z" fill="#2f9e6b" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
      <rect x="22" y="30" width="48" height="28" rx="9" fill="#2f9e6b"/><text x="46" y="50" font-family="${FONT}" font-size="17" font-weight="700" fill="#fff" text-anchor="middle">You</text></g>
  </g>

  <g transform="translate(1040 440) scale(1.25)">
    ${duck}
  </g>
</svg>`;
writeFileSync(new URL("../public/og-collab.svg", import.meta.url), collab);
await sharp(Buffer.from(collab)).png({ compressionLevel: 9 }).toFile(new URL("../public/og-collab.png", import.meta.url).pathname);
console.log("og-collab.png written");
