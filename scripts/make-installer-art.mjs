// Builds the art the installers use, from build/icon.png.
//
//   build/icon.ico             the Windows installer and uninstaller icon
//   build/dmg-background.tiff  the Mac install window, at 1x and 2x
//
//   node scripts/make-installer-art.mjs

import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const icon = "build/icon.png";

// An .ico is a directory of images followed by the images. Since Vista each
// entry may simply be a PNG, which keeps this free of any icon library.
async function ico() {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(sizes.map((s) => sharp(icon).resize(s, s).png().toBuffer()));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(s >= 256 ? 0 : s, e);      // 0 means 256
    head.writeUInt8(s >= 256 ? 0 : s, e + 1);
    head.writeUInt8(0, e + 2);
    head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(pngs[i].length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += pngs[i].length;
  });
  writeFileSync("build/icon.ico", Buffer.concat([head, ...pngs]));
}

// The window Finder shows when the disk image opens: the app on the left,
// Applications on the right, and an arrow saying which way to drag.
//
// The ground is a mid blue on purpose. Finder draws the names under the two
// icons itself, in black in light mode and in white in dark mode, and cannot
// be told otherwise. Most backgrounds make one of those unreadable; this
// blue sits at roughly 4.5:1 against both.
function backgroundSvg(scale) {
  const w = 620 * scale, h = 400 * scale, s = (n) => n * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5873ff"/>
      <stop offset="1" stop-color="#4863fb"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.1" r="0.75">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="${s(3)}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${s(262)} ${s(196)} C ${s(292)} ${s(176)}, ${s(328)} ${s(176)}, ${s(358)} ${s(196)}"/>
    <path d="M${s(344)} ${s(182)} L ${s(360)} ${s(197)} L ${s(340)} ${s(203)}"/>
  </g>
  <text x="${w / 2}" y="${s(342)}" text-anchor="middle" fill="#ffffff"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${s(15)}" font-weight="600"
    letter-spacing="${s(-0.2)}">Drag Dwiddle into Applications</text>
  <text x="${w / 2}" y="${s(364)}" text-anchor="middle" fill="#ffffff" fill-opacity="0.72"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${s(12)}">
    Then open it from Applications, not from here</text>
</svg>`;
}

async function background() {
  const dir = mkdtempSync(path.join(tmpdir(), "dmg-bg-"));
  const one = path.join(dir, "bg.png");
  const two = path.join(dir, "bg@2x.png");
  await sharp(Buffer.from(backgroundSvg(1))).png().toFile(one);
  await sharp(Buffer.from(backgroundSvg(2))).png().toFile(two);
  // One TIFF holding both, so Finder picks the sharp one on a Retina screen.
  execFileSync("tiffutil", ["-cathidpicheck", one, two, "-out", "build/dmg-background.tiff"]);
}

await ico();
await background();
console.log("wrote build/icon.ico and build/dmg-background.tiff");
