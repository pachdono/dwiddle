// Turns the captured screenshots into WebP for the page, and drops the PNGs.
// A 2560 pixel wide capture is around 280 KB as PNG and a fraction of that as
// WebP at a quality nobody can tell from the original.
//
//   node scripts/compress-shots.mjs

import sharp from "sharp";
import { readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";

const dir = path.join(import.meta.dirname, "..", "src", "assets", "shots");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".png"))) {
  const src = path.join(dir, file);
  const out = src.replace(/\.png$/, ".webp");
  await sharp(src).webp({ quality: 84, effort: 6 }).toFile(out);
  console.log(`  ${file}: ${Math.round(statSync(src).size / 1024)} KB -> ${Math.round(statSync(out).size / 1024)} KB`);
  unlinkSync(src);
}
