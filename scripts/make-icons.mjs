// Builds the home screen and installed app icons as PNGs.
//
// iOS ignores an SVG apple-touch-icon entirely and falls back to a screenshot
// of the page, which is why the duck was not appearing on the home screen.
// Android and the desktop installers want specific raster sizes too.
//
//   node scripts/make-icons.mjs

import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

// Reuse the mascot from the component so the two can never drift apart.
const source = readFileSync(new URL("../src/Duck.jsx", import.meta.url), "utf8");
const colours = Object.fromEntries(
  [...source.matchAll(/^const (\w+) = "(#[0-9A-Fa-f]{6})";/gm)].map((m) => [m[1], m[2]]),
);

let duck = source
  .slice(source.indexOf("      {shadow &&"), source.indexOf("    </svg>\n  );\n}\n\n// For small spaces"))
  .replace("{shadow && ", "")
  .replace(' opacity="0.055" />}', ' opacity="0.055" />')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

for (const [name, hex] of Object.entries(colours)) {
  duck = duck.replaceAll(`{${name}}`, `"${hex}"`);
}

const BG = "#2438C4", INNER = "#5A70FF";

// The head alone, because the full body turns to mush at the size a home
// screen actually draws an icon.
function icon(size, { maskable = false } = {}) {
  // A maskable icon may be cropped to a circle by the launcher, so the art has
  // to sit inside the middle 80%. A plain one can fill the square.
  const box = maskable ? "0 -16 132 132" : "8 -6 112 112";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><radialGradient id="g" cx="50%" cy="36%" r="76%">
      <stop offset="0%" stop-color="${INNER}"/><stop offset="100%" stop-color="${BG}"/>
    </radialGradient></defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
    <svg x="0" y="0" width="${size}" height="${size}" viewBox="${box}">${duck}</svg>
  </svg>`;
}

const jobs = [
  ["public/apple-touch-icon.png", 180, {}],          // iOS home screen
  ["public/icon-192.png", 192, {}],                  // Android, browser tab lists
  ["public/icon-512.png", 512, {}],                  // splash screens, stores
  ["public/icon-maskable-512.png", 512, { maskable: true }], // adaptive launchers
];

for (const [path, size, opts] of jobs) {
  const png = await sharp(Buffer.from(icon(size, opts))).png().toBuffer();
  writeFileSync(new URL(`../${path}`, import.meta.url), png);
  console.log("wrote", path, `${size}x${size}`, `${(png.length / 1024).toFixed(1)} KB`);
}
