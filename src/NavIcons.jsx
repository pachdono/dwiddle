// The sidebar's pictures, drawn like the Testiddle avatars: each object sits on a coloured disc
// with a darker rim offset behind it, is lit from the top left with its far side in shade, has a
// fine outline and a white shine, and pokes out over the edge of the disc. Each is drawn in a
// 40 unit square.

import { useClean } from "./clean.js";

let n = 0;

// The New layout keeps the study rail's icons, but as plain outlines in the
// text colour, with a word under each, as a tool bar does. Everywhere else it
// is words only.
const LINE_ICONS = {
  report: "M5 20v-6M12 20V6M19 20v-10",
  planner: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M9 3v4M15 3v4",
  home: "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z",
  exams: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  duel: "M13 3 5 13h6l-1 8 8-10h-6z",
  explore: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5z",
  trophy: "M8 4h8v6a4 4 0 0 1-8 0zM8 6H4c0 3 1.5 4.5 4 5M16 6h4c0 3-1.500 4.500-4 5M12 14v4M8 20h8",
  chat: "M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-5 4v-4H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 10h8M8 13h5",
  folders: "M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  notebook: "M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6zM9 4v16M12 9h4M12 13h4",
  social: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 2.7-5 6-5s6 2 6 5M16 11a2.5 2.5 0 1 0 0-5M17 14c2.5.3 4 2 4 5",
  notes: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6",
  learn: "M3 6h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H3zM21 6h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7z",
  practice: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 12l3 3 5-6",
  topics: "M4 6h16M4 12h16M4 18h10",
  videos: "M4 6h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM16 10l5-3v10l-5-3",
};
const line = (id, size) => LINE_ICONS[id] && (
  <svg className="nav-line" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={LINE_ICONS[id]} /></svg>
);



const LINE = "#2e4a5c";
const BLUSH = "#ff9fb4";

// light, mid and shade for each colour
const Y = ["#fff3b0", "#ffd25e", "#e3a12a"], B = ["#d6e7ff", "#7ab8ff", "#3f7fe0"], G = ["#dcf8cf", "#7fd38a", "#3f9a4c"],
  P = ["#ffdbe8", "#ff8fb3", "#d84a7e"], V = ["#ece2ff", "#b9a0f0", "#7b5cc4"], R = ["#ffd6cf", "#ff7a6a", "#c93a2a"],
  O = ["#ffe6c8", "#ffbf7a", "#e0832e"], W = ["#ffffff", "#f3f6f9", "#c3cdd8"], BR = ["#f3d6b6", "#c9905a", "#8e5d33"],
  GR = ["#f2f4f7", "#c9d1db", "#8e9aa8"], T = ["#d4f6ee", "#7ed3c4", "#3aa38f"];

/** The disc behind: a darker rim offset down and right, a lit face and a faint edge. */
const Disc = ({ k, bg, rim }) => <>
  <defs><radialGradient id={`${k}h`} cx=".32" cy=".28" r=".85"><stop offset="0" stopColor="#fff" stopOpacity=".8" /><stop offset=".55" stopColor="#fff" stopOpacity="0" /></radialGradient></defs>
  <circle cx="21.3" cy="22.6" r="15.2" fill={rim} />
  <circle cx="20" cy="21.2" r="15.2" fill={bg} />
  <circle cx="20" cy="21.2" r="15.2" fill={`url(#${k}h)`} />
  <circle cx="20" cy="21.2" r="15.2" stroke={LINE} strokeWidth=".5" opacity=".4" fill="none" />
</>;

/** A shaded object: lit gradient, a crescent of shade on the far side, a soft cast shadow and a fine line. */
const Obj = ({ k, d, c, shine, cast = true }) => <>
  <defs><clipPath id={`${k}c`}><path d={d} /></clipPath>
    <linearGradient id={`${k}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c[0]} /><stop offset=".7" stopColor={c[1]} /></linearGradient></defs>
  {cast && <path d={d} fill="#1d3340" opacity=".16" transform="translate(1.6 1.8)" />}
  <path d={d} fill={c[2]} />
  <g clipPath={`url(#${k}c)`}><path d={d} fill={`url(#${k}g)`} transform="translate(-1.7 -1.5)" /></g>
  <path d={d} stroke={LINE} strokeWidth=".85" strokeLinejoin="round" fill="none" />
  {shine && <path d={shine} stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity=".85" fill="none" />}
</>;
/** Two small eyes and cheeks, for the few icons with a face. */
const Face = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="-3.4" cy="1.8" rx="1.5" ry=".9" fill={BLUSH} opacity=".85" /><ellipse cx="3.4" cy="1.8" rx="1.5" ry=".9" fill={BLUSH} opacity=".85" />
    <ellipse cx="-2.1" cy="-.6" rx=".9" ry="1.15" fill="#283a4b" /><ellipse cx="2.1" cy="-.6" rx=".9" ry="1.15" fill="#283a4b" />
    <circle cx="-1.8" cy="-1" r=".33" fill="#fff" /><circle cx="2.4" cy="-1" r=".33" fill="#fff" />
    <path d="M-1 1.3 Q0 2.2 1 1.3" stroke="#283a4b" strokeWidth=".7" strokeLinecap="round" fill="none" />
  </g>
);
const Sparkle = ({ x, y, r = 1 }) => <path transform={`translate(${x} ${y}) scale(${r})`} d="M0 -3 C.4 -.8 .8 -.4 3 0 C.8 .4 .4 .8 0 3 C-.4 .8 -.8 .4 -3 0 C-.8 -.4 -.4 -.8 0 -3 Z" fill="#ffd25e" stroke={LINE} strokeWidth=".4" />;
const ln = { stroke: LINE, strokeWidth: ".85", strokeLinecap: "round", strokeLinejoin: "round" };

const ICONS = {
  home: { bg: "#d6e7ff", rim: "#8fb1ef", draw: (k) => <>
    <Obj k={k + 1} d="M9 19 20 9.5 31 19v13.5a1.5 1.5 0 0 1-1.5 1.5h-19A1.5 1.5 0 0 1 9 32.5z" c={O} />
    <Obj k={k + 2} d="M4.5 20 20 6.5l15.5 13.5-2.6 2.8L20 11.6 7.1 22.8z" c={R} shine="M8.5 18.5l6-5.2" />
    <Obj k={k + 3} d="M17.2 34v-7.4a1.4 1.4 0 0 1 1.4-1.4h2.8a1.4 1.4 0 0 1 1.4 1.4V34z" c={BR} cast={false} />
    <Face x={20} y={20.5} s={0.85} />
  </> },
  chat: { bg: "#ece2ff", rim: "#b49ae6", draw: (k) => <>
    <Obj k={k + 1} d="M9 7h21a4.5 4.5 0 0 1 4.5 4.5v12A4.5 4.5 0 0 1 30 28H19l-7 5.5V28H9a4.5 4.5 0 0 1-4.5-4.5v-12A4.5 4.5 0 0 1 9 7z" c={V} shine="M9 10.5c2-1 4.5-1.3 7-1.2" />
    <Face x={19.5} y={17.3} s={1.2} />
    <Sparkle x={35} y={6} r={0.9} />
  </> },
  folders: { bg: "#fff1c9", rim: "#efc56a", draw: (k) => <>
    <Obj k={k + 1} d="M5 11a2.5 2.5 0 0 1 2.5-2.5h7.5l3 3h14.5a2.5 2.5 0 0 1 2.5 2.5V31a2.5 2.5 0 0 1-2.5 2.5h-25A2.5 2.5 0 0 1 5 31z" c={O} />
    <Obj k={k + 2} d="M9 25V13.5h22V25z" c={W} cast={false} />
    <path d="M12.5 17h14M12.5 20.5h9" {...ln} stroke="#8aa0b6" />
    <Obj k={k + 3} d="M5 20.5a2 2 0 0 1 2-2h26a2 2 0 0 1 2 2V31a2.5 2.5 0 0 1-2.5 2.5h-25A2.5 2.5 0 0 1 5 31z" c={Y} shine="M8.5 22.5h10" cast={false} />
  </> },
  notebook: { bg: "#dcf8cf", rim: "#8fd48a", draw: (k) => <>
    <Obj k={k + 1} d="M9.5 4.5h20.5a2.5 2.5 0 0 1 2.5 2.5v26a2.5 2.5 0 0 1-2.5 2.5H9.5z" c={G} shine="M28.5 8v6" />
    <Obj k={k + 2} d="M14 9.5h13a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H14a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 14 9.5z" c={W} cast={false} />
    <Face x={20.5} y={14.2} s={0.8} />
    {[11, 18, 25, 32].map((y) => <rect key={y} x="6" y={y - 1.2} width="6.5" height="2.4" rx="1.2" fill="#dfe6ee" {...ln} />)}
  </> },
  duel: { bg: "#fff1c9", rim: "#f0b552", draw: (k) => <>
    <Obj k={k + 1} d="M23 3 8.5 22H18l-3 15L31.5 16H22z" c={Y} shine="M20.5 7.5 13.5 17" />
  </> },
  social: { bg: "#ffe1ec", rim: "#f2a2bd", draw: (k) => <>
    <Obj k={k + 1} d="M17.5 35.5c0-6.5 4.2-10.5 9.8-10.5s9.8 4 9.8 10.5z" c={B} />
    <Obj k={k + 2} d="M27.3 23a6.3 6.3 0 1 0 0-12.6 6.3 6.3 0 0 0 0 12.6z" c={O} cast={false} />
    <path d="M21 16c.5-3.8 3-5.8 6.3-5.8s5.8 2 6.3 5.8c-2-1.4-3.9-2-6.3-2s-4.3.6-6.3 2z" fill="#6b4a33" {...ln} />
    <Obj k={k + 3} d="M3 36.5c0-7 4.5-11.5 10.5-11.5S24 29.5 24 36.5z" c={P} />
    <Obj k={k + 4} d="M13.5 24a6.8 6.8 0 1 0 0-13.6 6.8 6.8 0 0 0 0 13.6z" c={O} cast={false} />
    <path d="M6.7 16.5c0-4.4 2.9-6.8 6.8-6.8s6.8 2.4 6.8 6.8c-1.2-2.2-3.4-3.3-6.8-3.3s-5.6 1.1-6.8 3.3z" fill="#2f2f3a" {...ln} />
    <Face x={13.5} y={18.6} s={0.75} /><Face x={27.3} y={18.2} s={0.7} />
  </> },
  explore: { shrink: 0.82, bg: "#d4f6ee", rim: "#7fcbb9", draw: (k) => <>
    <Obj k={k + 1} d="M20 35.5a15 15 0 1 0 0-30 15 15 0 0 0 0 30z" c={B} shine="M9.5 12c2.6-3.2 6.6-4.6 10-4" />
    <path d="M11 11c4.4-.2 5.8 3.4 3.9 6.1s-5.6 1.6-5.4 5.4 3.9 4 2.6 8.9C7 28.6 4.9 22.3 7.4 16.2 8.4 13.7 9.6 11.9 11 11zM25 7.5c4.4.9 8.1 4.4 9.3 9.3-2.6-.9-4.4 0-5.3-2.7-.9-2.6-4.4-2.6-4-6.6zM27.4 26.3c2.6 0 5.3.9 6.2 2.7-1.7 2.6-4.4 4.4-8 5.3.9-2.7-.9-5.3 1.8-8z" fill="#8fe39c" {...ln} />
  </> },
  notes: { bg: "#d6e7ff", rim: "#8fb1ef", draw: (k) => <>
    <Obj k={k + 1} d="M9.5 4.5h15l7 7V33a2.5 2.5 0 0 1-2.5 2.5H9.5A2.5 2.5 0 0 1 7 33V7a2.5 2.5 0 0 1 2.5-2.5z" c={W} />
    <path d="M24.5 4.5v7h7z" fill="#9cc6ff" {...ln} />
    <path d="M11.5 17h14M11.5 22h14M11.5 27h8" stroke="#5b8de0" strokeWidth="1.8" strokeLinecap="round" />
  </> },
  learn: { bg: "#fff1c9", rim: "#efc56a", draw: (k) => <>
    <Obj k={k + 1} d="M20 3.5c-6.4 0-11 4.5-11 10.2 0 3.6 1.8 6 4 8 1 1 1.5 2 1.5 3.4h11c0-1.4.5-2.4 1.5-3.4 2.2-2 4-4.4 4-8C31 8 26.4 3.5 20 3.5z" c={Y} shine="M12.5 11c.6-2.5 2.4-4.2 4.6-4.8" />
    <Obj k={k + 2} d="M14.5 27.5h11v3.5h-11zM16 31.8h8v3.5h-8z" c={GR} cast={false} />
    <Face x={20} y={15} />
    <Sparkle x={35} y={7} r={1} /><Sparkle x={5.5} y={9} r={.7} />
  </> },
  practice: { shrink: 0.82, bg: "#ffe1ec", rim: "#f2a2bd", draw: (k) => <>
    <Obj k={k + 1} d="M20 35.5a15 15 0 1 0 0-30 15 15 0 0 0 0 30z" c={P} shine="M10 13c2-3 5.5-4.8 9-5" />
    <path d="M15 16.5c0-3 2.5-5 5.2-5s5 1.8 5 4.5c0 2.2-1.6 3.2-3 4.2-1.2.8-1.8 1.5-1.8 3" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
    <circle cx="20.4" cy="28.5" r="2" fill="#fff" />
  </> },
  topics: { bg: "#dcf8cf", rim: "#8fd48a", draw: (k) => <>
    <Obj k={k + 1} d="M7.5 7h25a3 3 0 0 1 0 6h-25a3 3 0 0 1 0-6z" c={G} shine="M8 9.3h8" />
    <Obj k={k + 2} d="M7.5 17h25a3 3 0 0 1 0 6h-25a3 3 0 0 1 0-6z" c={Y} shine="M8 19.3h8" />
    <Obj k={k + 3} d="M7.5 27h17a3 3 0 0 1 0 6h-17a3 3 0 0 1 0-6z" c={B} shine="M8 29.3h6" />
  </> },
  videos: { bg: "#ffe1dc", rim: "#f3a094", draw: (k) => <>
    <Obj k={k + 1} d="M9 8.5h22a5.5 5.5 0 0 1 5.5 5.5v12a5.5 5.5 0 0 1-5.5 5.5H9A5.5 5.5 0 0 1 3.5 26V14A5.5 5.5 0 0 1 9 8.5z" c={R} shine="M8 12.5h6" />
    <path d="M16.5 14.5 26.5 20l-10 5.5z" fill="#fff" {...ln} />
  </> },
  report: { bg: "#d6e7ff", rim: "#8fb1ef", draw: (k) => <>
    <Obj k={k + 1} d="M6 21.5h7a1.5 1.5 0 0 1 1.5 1.5v12h-10V23A1.5 1.5 0 0 1 6 21.5z" c={B} shine="M7 24v4" />
    <Obj k={k + 2} d="M17 13h7a1.5 1.5 0 0 1 1.5 1.5V35h-10V14.5A1.5 1.5 0 0 1 17 13z" c={Y} shine="M18 15.5v4" />
    <Obj k={k + 3} d="M28 5h7a1.5 1.5 0 0 1 1.5 1.5V35h-10V6.5A1.5 1.5 0 0 1 28 5z" c={G} shine="M29 7.5v4" />
    <Face x={31.5} y={13} s={0.75} />
  </> },
  trophy: { bg: "#fff1c9", rim: "#f0b552", draw: (k) => <>
    <path d="M11.5 8H6c0 6 2.2 9.3 6.3 9.8M28.5 8H34c0 6-2.2 9.3-6.3 9.8" stroke="#e3a12a" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    <Obj k={k + 1} d="M11 4.5h18v10a9 9 0 0 1-18 0z" c={Y} shine="M14 7.5v6" />
    <Obj k={k + 2} d="M17.2 23.5h5.6V30h-5.6z" c={Y} cast={false} />
    <Obj k={k + 3} d="M11.5 29.5h17a1.5 1.5 0 0 1 1.5 1.5v4H10v-4a1.5 1.5 0 0 1 1.5-1.5z" c={BR} />
    <path d="m20 8.4 1.4 2.9 3.2.5-2.3 2.2.5 3.2-2.8-1.5-2.8 1.5.5-3.2-2.3-2.2 3.2-.5z" fill="#fff" {...ln} strokeWidth=".6" />
  </> },
  exams: { shrink: 0.82, bg: "#ffe1dc", rim: "#f3a094", draw: (k) => <>
    <Obj k={k + 1} d="M19 35a14.5 14.5 0 1 0 0-29 14.5 14.5 0 0 0 0 29z" c={R} shine="M8.5 15c1.4-3.6 4.4-6 8-6.6" />
    <circle cx="19" cy="20.5" r="9.5" fill="#fff" {...ln} /><circle cx="19" cy="20.5" r="5" fill="#ff7a6a" {...ln} />
    <path d="M20 19.5 33 6.5" stroke={LINE} strokeWidth="2" strokeLinecap="round" />
    <path d="M30 4.5h5.5V10z" fill="#ffd25e" {...ln} />
  </> },
  upload: { bg: "#d6e7ff", rim: "#8fb1ef", draw: (k) => <>
    <Obj k={k + 1} d="M6 22h28a2 2 0 0 1 2 2v8a2.5 2.5 0 0 1-2.5 2.5h-27A2.5 2.5 0 0 1 4 32v-8a2 2 0 0 1 2-2z" c={B} shine="M8 25h9" />
    <Obj k={k + 2} d="M20 3.5 30 13.5h-6v10h-8v-10h-6z" c={Y} shine="M19 7l-4 4" />
    <Sparkle x={34} y={8} r={0.9} />
  </> },
  paste: { bg: "#ffe1ec", rim: "#f2a2bd", draw: (k) => <>
    <Obj k={k + 1} d="M9 7h22a2 2 0 0 1 2 2v25a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" c={BR} />
    <Obj k={k + 2} d="M11 11.5h18v20.5H11z" c={W} cast={false} />
    <Obj k={k + 3} d="M15.5 4h9a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 24.5 10h-9A1.5 1.5 0 0 1 14 8.5v-3A1.5 1.5 0 0 1 15.5 4z" c={GR} cast={false} />
    <path d="M14.5 16.5h11M14.5 20.5h11M14.5 24.5h7" stroke="#ff8fb3" strokeWidth="1.8" strokeLinecap="round" />
    <Face x={25} y={27.5} s={0.6} />
  </> },
  youtube: { bg: "#ffe1dc", rim: "#f3a094", draw: (k) => <>
    <Obj k={k + 1} d="M9.5 8h21a6 6 0 0 1 6 6v11a6 6 0 0 1-6 6h-21a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z" c={R} shine="M8.5 12h6" />
    <path d="M16.5 13.5 27 19.5l-10.5 6z" fill="#fff" {...ln} />
  </> },
};

export function NavIcon({ id, size = 34, rail = false }) {
  const clean = useClean();
  if (clean && LINE_ICONS[id] && !["trophy", "duel"].includes(id)) return line(id, rail ? 24 : Math.round(size * 0.62));
  const icon = ICONS[id];
  if (!icon) return null;
  const k = `ni${(n = (n + 1) % 100000)}-`;
  return (
    <svg className="nav-pic" width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <Disc k={k} bg={icon.bg} rim={icon.rim} />
      {icon.shrink ? <g transform={`translate(20 20) scale(${icon.shrink}) translate(-20 -20)`}>{icon.draw(k)}</g> : icon.draw(k)}
    </svg>
  );
}

/** The streak flame: lit and smiling, or grey and asleep when the streak is out. */
export function Flame({ size = 26, lit = true }) {
  const k = `fl${(n = (n + 1) % 100000)}-`;
  const d = "M21 3c1 7 9.5 10 9.5 20.5a10.5 10.5 0 0 1-21 0c0-4.3 2-7.4 4.2-9.4 0 3 1 5 3 6-1-8 1.3-13 4.3-17.1z";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <Obj k={k + 1} d={d} c={lit ? ["#ffe27a", "#ffa43a", "#e5512a"] : GR} shine="M14 17c.6-2 1.6-3.4 3-4.4" />
      <Obj k={k + 2} d="M20 22.5c.8 2.4 4.3 3.2 4.3 6.4a4.3 4.3 0 0 1-8.6 0c0-1.6.8-2.6 1.7-3.4.3.8.8 1.4 1.4 1.7-.3-2.4.3-3.6 1.2-4.7z" c={lit ? Y : W} cast={false} />
      {lit ? <Face x={20} y={18} /> : <g transform="translate(20 18)" stroke="#283a4b" strokeWidth=".8" strokeLinecap="round" fill="none"><path d="M-3.2 -.6 Q-2.1 .5 -1 -.6 M1 -.6 Q2.1 .5 3.2 -.6" /><path d="M-.8 1.8 H.8" /></g>}
    </svg>
  );
}

export function Coin({ size = 26 }) {
  const k = `co${(n = (n + 1) % 100000)}-`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <Obj k={k + 1} d="M20 36.5a16 16 0 1 0 0-32 16 16 0 0 0 0 32z" c={Y} shine="M9 14c1.8-3.6 5-6 9-6.6" />
      <circle cx="20" cy="20.5" r="11" fill="#ffe27a" stroke={LINE} strokeWidth=".6" />
      <path d="m20 12.6 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.6-5 2.6.9-5.6-4-4 5.6-.8z" fill="#fff" stroke={LINE} strokeWidth=".7" strokeLinejoin="round" />
    </svg>
  );
}
