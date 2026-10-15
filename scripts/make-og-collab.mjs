// Builds the share card for collaboration links (/notebook?live=CODE) as a real
// PNG, in the same Duck Lagoon look as the front page's (see og-shared.mjs).
//
//   node scripts/make-og-collab.mjs

import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { FONT, INK, ACCENT, BODY, duckInner, defs, scene, pill, notebook } from "./og-shared.mjs";

const duck = duckInner();
const people = pill(84, 470, "Two people in it now", { lead: `<circle cx="30" cy="23" r="9" fill="#2f9e6b"/><circle cx="50" cy="23" r="9" fill="#e8863a"/>` });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${defs}
  ${scene()}

  <text x="84" y="190" font-family="${FONT}" font-size="70" font-weight="800" letter-spacing="-2.2" fill="${INK}">Write in it</text>
  <text x="84" y="268" font-family="${FONT}" font-size="70" font-weight="800" letter-spacing="-2.2" fill="${ACCENT}">together, live.</text>
  <text x="84" y="338" font-family="${FONT}" font-size="26" fill="${BODY}">Open the link to join this notebook. You both write,</text>
  <text x="84" y="376" font-family="${FONT}" font-size="26" fill="${BODY}">draw and add things on the same page at once.</text>

  ${people.svg}

  <g transform="translate(730 84) rotate(3 210 220) scale(1.2)">
    ${notebook(340, 330)}
  </g>

  <g id="duck" transform="translate(1040 500) scale(0.95)">
    ${duck}
  </g>
</svg>`;

writeFileSync(new URL("../public/og-collab.svg", import.meta.url), svg);
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(new URL("../public/og-collab.png", import.meta.url).pathname);
console.log("og-collab.png written");
