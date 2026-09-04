// Builds the social share card as a real PNG.
//
// Link previews on WhatsApp, Discord, Instagram and X do not render SVG, so the
// card has to be a raster image. This draws it as SVG, which keeps it in source
// control as text, and renders it once at 1200x630.
//
//   node scripts/make-og.mjs

import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

// Reuse the mascot from the component so the two can never drift apart.
const duckSource = readFileSync(new URL("../src/Duck.jsx", import.meta.url), "utf8");
const colours = Object.fromEntries(
  [...duckSource.matchAll(/^const (\w+) = "(#[0-9A-Fa-f]{6})";/gm)].map((m) => [m[1], m[2]]),
);

let duck = duckSource
  .slice(duckSource.indexOf("      {shadow &&"), duckSource.indexOf("    </svg>\n  );\n}\n\n// For small spaces"))
  .replace("{shadow && ", "")
  .replace(' opacity="0.055" />}', ' opacity="0.055" />')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

for (const [name, hex] of Object.entries(colours)) {
  duck = duck.replaceAll(`{${name}}`, `"${hex}"`);
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const tag = (label, x) => `
  <g transform="translate(${x} 470)">
    <rect width="${28 + label.length * 15}" height="46" rx="23" fill="#171a24" stroke="#2c3040"/>
    <text x="${(28 + label.length * 15) / 2}" y="30" font-family="${FONT}" font-size="20"
          font-weight="600" fill="#c9cfe0" text-anchor="middle">${label}</text>
  </g>`;

let x = 84;
const tags = ["SAT", "ACT", "SSAT", "IELTS", "TOEFL"]
  .map((t) => { const el = tag(t, x); x += 28 + t.length * 15 + 12; return el; })
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="30%" cy="0%" r="75%">
      <stop offset="0%" stop-color="#5a6eff" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#5a6eff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="#0f1117"/>
  <rect width="1200" height="440" fill="url(#glow)"/>

  <text x="84" y="205" font-family="${FONT}" font-size="74" font-weight="800"
        letter-spacing="-2.5" fill="#ffffff">Turn your notes into</text>
  <text x="84" y="285" font-family="${FONT}" font-size="74" font-weight="800"
        letter-spacing="-2.5" fill="#8ba0ff">the real exam.</text>

  <text x="84" y="360" font-family="${FONT}" font-size="26" fill="#a9b0c4">Questions, explanations and full length timed papers,</text>
  <text x="84" y="398" font-family="${FONT}" font-size="26" fill="#a9b0c4">written from whatever you are studying.</text>

  ${tags}

  <g transform="translate(880 130) scale(2.4)">
    ${duck}
  </g>
</svg>`;

writeFileSync(new URL("../public/og.svg", import.meta.url), svg);

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(
  new URL("../public/og.png", import.meta.url).pathname,
);

const meta = await sharp(new URL("../public/og.png", import.meta.url).pathname).metadata();
console.log(`og.png written: ${meta.width}x${meta.height}`);
