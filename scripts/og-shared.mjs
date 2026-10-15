// Shared pieces of the two share cards (the front page and a collaboration
// link), so they look like one brand: the Duck Lagoon from the landing page.
// Pale aqua sky, sea glass water, soft green hills, a little sun, and clean
// white cards on top. Colours are the landing scene's own (see .ls-* in
// src/styles.css) plus Prismarine's teal for emphasis.

import { readFileSync } from "node:fs";

export const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export const INK = "#0e2923"; // deep green-teal, for headlines
export const ACCENT = "#168f79"; // sea glass teal, for the one word that matters
export const BODY = "#3c5f57";
export const QUIET = "#6c8d85";

// The mascot comes from the SVG this was last drawn into, so every card shows
// the same duck. (Pulling it out of src/Duck.jsx broke once that file moved on.)
export function duckInner(file = new URL("../public/og.svg", import.meta.url)) {
  const prev = readFileSync(file, "utf8");
  const at = Math.max(prev.indexOf('<g id="duck"'), prev.indexOf('<g transform="translate(880 130) scale(2.4)">'));
  return prev.slice(prev.indexOf(">", at) + 1, prev.lastIndexOf("</g>"));
}

export const defs = `
  <defs>
    <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#cfe7e9"/><stop offset="1" stop-color="#edf3e2"/></linearGradient>
    <linearGradient id="pool" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#8fcbd2"/><stop offset="1" stop-color="#5fa7b3"/></linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff3c4" stop-opacity="0.95"/><stop offset="0.55" stop-color="#fbe7a6" stop-opacity="0.8"/><stop offset="1" stop-color="#fbe7a6" stop-opacity="0"/></radialGradient>
    <filter id="lift" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#0e2923" flood-opacity="0.18"/></filter>
  </defs>`;

const frond = (a, len) => `<path d="M0 0 C${len * 0.35} ${-len * 0.45} ${len * 0.8} ${-len * 0.35} ${len} ${len * 0.12} C${len * 0.7} ${-len * 0.08} ${len * 0.35} ${-len * 0.1} 0 0 Z" transform="rotate(${a})" fill="#4c9c5b"/>`;
const palm = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 C6 -60 4 -120 -10 -190 L2 -192 C18 -122 20 -60 14 0 Z" fill="#8b6a46"/>
    <g transform="translate(-4 -192)">${[-165, -135, -105, -70, -35, -5, 25].map((a, i) => frond(a, 92 - (i % 2) * 14)).join("")}</g>
  </g>`;

// The backdrop: sky, sun, far hills, mid hills, a strip of lagoon along the
// bottom, and a palm. Nothing is drawn behind the left text column below the
// water line, so text stays clear.
export const scene = () => `
  <rect width="1200" height="630" fill="url(#sky)"/>
  <circle cx="1010" cy="120" r="150" fill="url(#sun)"/>
  <path d="M0 500 L150 444 L290 500 L430 428 L590 510 L720 462 L860 514 L1010 450 L1200 506 V630 H0 Z" fill="#a9cba0"/>
  <path d="M0 535 C160 490 300 535 470 518 C640 500 760 490 900 516 C1040 540 1130 515 1200 506 V630 H0 Z" fill="#86b77d"/>
  <path d="M0 565 C220 535 470 575 700 560 C900 548 1060 540 1200 556 V630 H0 Z" fill="url(#pool)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="3" stroke-linecap="round">
    <path d="M70 596 q18 -9 36 0 t36 0"/><path d="M300 612 q18 -9 36 0 t36 0"/><path d="M560 592 q18 -9 36 0 t36 0"/><path d="M780 610 q18 -9 36 0 t36 0"/>
  </g>
  <path d="M900 630 C960 560 1060 548 1200 566 V630 Z" fill="#6fa767"/>
  <path d="M1040 630 C1090 590 1150 584 1200 592 V630 Z" fill="#f3e3b8"/>
  ${palm(1160, 600, 0.55)}`;

export const pill = (x, y, label, { lead = "", min = 0 } = {}) => {
  const w = Math.max(min, 38 + label.length * 12.6 + (lead ? 40 : 0));
  return { w, svg: `
  <g transform="translate(${x} ${y})">
    <rect width="${w}" height="46" rx="23" fill="#ffffff" fill-opacity="0.85" stroke="#b9dccf" stroke-width="1.5"/>
    ${lead}
    <text x="${(lead ? 40 : 0) + (w - (lead ? 40 : 0)) / 2}" y="30" font-family="${FONT}" font-size="20" font-weight="600" fill="#1f5b4d" text-anchor="middle">${label}</text>
  </g>` };
};

export const cursor = (fill, label, w) => `<path d="M0 0 L0 28 L7 21 L13 33 L18 31 L12 19 L22 19 Z" fill="${fill}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
      <rect x="20" y="28" width="${w}" height="26" rx="9" fill="${fill}"/><text x="${20 + w / 2}" y="46" font-family="${FONT}" font-size="16" font-weight="700" fill="#fff" text-anchor="middle">${label}</text>`;

// the notebook page: lined paper, a margin, two pen strokes and two named cursors
export const notebook = (w = 324, h = 318) => {
  const lines = Array.from({ length: 6 }, (_, i) => `<line x1="24" y1="${78 + i * 40}" x2="${w - 24}" y2="${78 + i * 40}" stroke="#dbe8e3" stroke-width="2"/>`).join("");
  return `
    <rect width="${w}" height="${h}" rx="20" fill="#ffffff" filter="url(#lift)"/>
    <line x1="64" y1="0" x2="64" y2="${h}" stroke="#f0b4a8" stroke-width="2"/>
    ${lines}
    <path d="M84 104 C112 80 146 126 184 98 S252 88 288 108" fill="none" stroke="#1c8fa3" stroke-width="6" stroke-linecap="round"/>
    <path d="M84 176 C122 204 160 150 206 182" fill="none" stroke="#e8863a" stroke-width="6" stroke-linecap="round"/>
    <g transform="translate(206 182)">${cursor("#e8863a", "Sam", 48)}</g>
    <path d="M84 250 L136 250" fill="none" stroke="#2f9e6b" stroke-width="6" stroke-linecap="round"/>
    <g transform="translate(136 250)">${cursor("#2f9e6b", "You", 44)}</g>`;
};
