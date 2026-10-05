// The sidebar's pictures for testers: little lit, rounded objects rather than
// outlines, so each place looks like somewhere. Each is drawn in a 40 unit
// square with its own gradients.

import { useClean } from "./clean.js";

let n = 0;

// The New layout keeps the study rail's icons, but as plain outlines in the
// text colour, with a word under each, as a tool bar does. Everywhere else it
// is words only.
const LINE = {
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
const line = (id, size) => LINE[id] && (
  <svg className="nav-line" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={LINE[id]} /></svg>
);


const grad = (id, a, b) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
);

export function NavIcon({ id, size = 34, rail = false }) {
  const clean = useClean();
  if (clean) return rail ? line(id, 24) || null : null;
  const k = `ni${(n = (n + 1) % 10000)}`;
  const f = (s) => `url(#${k}${s})`;
  const body = {
    home: (<>
      <defs>{grad(k + "a", "#7aa2ff", "#3b5bfd")}{grad(k + "b", "#ffd9a8", "#f0a45c")}</defs>
      <path d="M6 19 20 7l14 12v13a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" fill={f("b")} />
      <path d="M3.5 19.5 20 5l16.5 14.5-2.6 2.8L20 10 6.1 22.3z" fill={f("a")} />
      <rect x="16" y="23" width="8" height="12" rx="2.4" fill={f("a")} />
      <path d="M9 21c3-4 7-7 11-8" stroke="#fff" strokeOpacity=".5" strokeWidth="1.6" strokeLinecap="round" />
    </>),
    chat: (<>
      <defs>{grad(k + "a", "#c9a4ff", "#7a43e6")}</defs>
      <path d="M8 7h24a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H20l-8 6v-6H8a4 4 0 0 1-4-4V11a4 4 0 0 1 4-4z" fill={f("a")} />
      <circle cx="13" cy="18" r="2.2" fill="#fff" /><circle cx="20" cy="18" r="2.2" fill="#fff" /><circle cx="27" cy="18" r="2.2" fill="#fff" />
      <path d="M8 10c4-1.4 12-1.6 16-1" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />
    </>),
    folders: (<>
      <defs>{grad(k + "a", "#ffe08a", "#f2a93a")}{grad(k + "b", "#ffc2d6", "#f0719c")}</defs>
      <path d="M4 12a3 3 0 0 1 3-3h8l3.5 3.5H33a3 3 0 0 1 3 3V30a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill={f("a")} />
      <rect x="7" y="15" width="26" height="9" rx="2" fill={f("b")} />
      <path d="M4 20.5h32V30a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill={f("a")} />
      <path d="M7 24c8-1.4 18-1.4 26 0" stroke="#fff" strokeOpacity=".5" strokeWidth="1.6" strokeLinecap="round" />
    </>),
    notebook: (<>
      <defs>{grad(k + "a", "#8ee6b0", "#27a35f")}</defs>
      <rect x="8" y="4" width="25" height="32" rx="4" fill={f("a")} />
      <rect x="12" y="4" width="21" height="32" rx="3" fill="#fff" fillOpacity=".92" />
      <path d="M16 13h13M16 19h13M16 25h8" stroke="#27a35f" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
      <g fill="#dfe6ea"><circle cx="8" cy="11" r="2.4" /><circle cx="8" cy="20" r="2.4" /><circle cx="8" cy="29" r="2.4" /></g>
    </>),
    duel: (<>
      <defs>{grad(k + "a", "#ffd25e", "#f08a24")}</defs>
      <path d="M23 3 8 22h9l-3 15 18-22h-10z" fill={f("a")} />
      <path d="M22 5 12 19" stroke="#fff" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
    </>),
    social: (<>
      <defs>{grad(k + "a", "#ff9bc0", "#e0457f")}{grad(k + "b", "#8fc2ff", "#3b7dfd")}</defs>
      <circle cx="26" cy="14" r="7" fill={f("b")} /><path d="M13 36c0-8 6-12 13-12s13 4 13 12z" fill={f("b")} />
      <circle cx="14" cy="15" r="7.5" fill={f("a")} /><path d="M1 37c0-9 6-13 13-13s13 4 13 13z" fill={f("a")} />
      <path d="M8 12c2-2.6 6-3 8-1" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
    </>),
    explore: (<>
      <defs>{grad(k + "a", "#7fd8ff", "#2b86e8")}{grad(k + "b", "#8fe39c", "#34a853")}</defs>
      <circle cx="20" cy="20" r="16" fill={f("a")} />
      <path d="M12 9c5 0 6 4 4 7s-6 2-6 6 4 4 3 9c-7-3-11-9-9-15 1-4 4-7 8-7zM25 8c5 1 9 5 10 11-3-1-5 0-6-3-1-3-5-3-4-8zM27 27c3 0 6 1 7 3-2 3-5 5-9 6 1-3-1-6 2-9z" fill={f("b")} />
      <path d="M10 10c3-3 8-4 12-3" stroke="#fff" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
    </>),
    notes: (<>
      <defs>{grad(k + "a", "#8fb4ff", "#3b5bfd")}</defs>
      <path d="M9 4h16l7 7v21a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z" fill="#fff" stroke="#c9d3e6" strokeWidth="1.600" />
      <path d="M25 4v7h7z" fill={f("a")} />
      <path d="M12 17h14M12 22h14M12 27h8" stroke={`url(#${k}a)`} strokeWidth="2.400" strokeLinecap="round" />
    </>),
    learn: (<>
      <defs>{grad(k + "a", "#ffe27a", "#f0a020")}</defs>
      <path d="M20 4c-6.500 0-11 4.500-11 10 0 3.600 1.800 6 4 8 1 1 1.500 2 1.500 3.500h11c0-1.500.5-2.500 1.500-3.500 2.200-2 4-4.400 4-8 0-5.500-4.500-10-11-10z" fill={f("a")} />
      <rect x="14.500" y="27.500" width="11" height="3.500" rx="1.700" fill="#c9ced6" /><rect x="16" y="32" width="8" height="3.500" rx="1.700" fill="#c9ced6" />
    </>),
    practice: (<>
      <defs>{grad(k + "a", "#ff9bc0", "#e0457f")}</defs>
      <circle cx="20" cy="20" r="16" fill={f("a")} />
      <path d="M15 16c0-3 2.500-5 5.200-5s5 1.800 5 4.500c0 2.200-1.600 3.200-3 4.200-1.200.800-1.800 1.500-1.800 3" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="20.500" cy="29" r="2" fill="#fff" />
    </>),
    topics: (<>
      <defs>{grad(k + "a", "#8ee6b0", "#27a35f")}</defs>
      <rect x="5" y="7" width="30" height="7" rx="3.500" fill={f("a")} /><rect x="5" y="17" width="30" height="7" rx="3.500" fill={f("a")} opacity=".8" /><rect x="5" y="27" width="20" height="7" rx="3.500" fill={f("a")} opacity=".6" />
    </>),
    videos: (<>
      <defs>{grad(k + "a", "#ff8a7a", "#e5432f")}</defs>
      <rect x="3" y="8" width="34" height="24" rx="7" fill={f("a")} />
      <path d="M16 14l11 6-11 6z" fill="#fff" />
    </>),
    trophy: (<>
      <defs>{grad(k + "a", "#ffe27a", "#f0a020")}</defs>
      <path d="M11 5h18v10a9 9 0 0 1-18 0z" fill={f("a")} />
      <path d="M11 8H5c0 6 2 9 6 9.500M29 8h6c0 6-2 9-6 9.500" stroke="#f0a020" strokeWidth="2.600" strokeLinecap="round" />
      <rect x="17" y="24" width="6" height="6" fill="#e59316" /><rect x="11" y="30" width="18" height="5" rx="2.500" fill={f("a")} />
    </>),
    exams: (<>
      <defs>{grad(k + "a", "#ff9a8a", "#e5432f")}</defs>
      <circle cx="20" cy="20" r="16" fill={f("a")} />
      <circle cx="20" cy="20" r="11" fill="#fff" /><circle cx="20" cy="20" r="6.5" fill={f("a")} /><circle cx="20" cy="20" r="2.4" fill="#fff" />
      <path d="M21.5 18.5 33 7" stroke="#2b2b33" strokeWidth="2.6" strokeLinecap="round" /><path d="M29.5 5.5 34.5 6 34 11" fill="#2b2b33" />
    </>),
  }[id];
  if (!body) return null;
  return <svg className="nav-pic" width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">{body}</svg>;
}

export function Flame({ size = 26, lit = true }) {
  const clean = useClean();
  if (clean) return null;
  const k = `fl${(n = (n + 1) % 10000)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs><linearGradient id={k} x1=".5" y1="0" x2=".5" y2="1">{lit ? <><stop offset="0" stopColor="#ffb347" /><stop offset="1" stopColor="#ef4a2a" /></> : <><stop offset="0" stopColor="#c9ced6" /><stop offset="1" stopColor="#98a0ac" /></>}</linearGradient></defs>
      <path d="M21 3c1 7 9 10 9 20a10 10 0 0 1-20 0c0-4 2-7 4-9 0 3 1 5 3 6-1-8 1-13 4-17z" fill={`url(#${k})`} />
      <path d="M20 19c1 3 4 4 4 8a4.5 4.5 0 0 1-9 0c0-2 1-3 2-4 .3 1 .8 1.700 1.500 2-.3-3 .3-4.600 1.500-6z" fill="#fff" fillOpacity={lit ? ".7" : ".5"} />
    </svg>
  );
}

export function Coin({ size = 26 }) {
  const k = `co${(n = (n + 1) % 10000)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs><linearGradient id={k} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe27a" /><stop offset="1" stopColor="#f0a020" /></linearGradient></defs>
      <circle cx="20" cy="20" r="17" fill={`url(#${k})`} /><circle cx="20" cy="20" r="12.500" fill="#fff" fillOpacity=".25" />
      <path d="m20 11 2.800 5.800 6.200.9-4.500 4.400 1.100 6.200L20 25.300l-5.600 3 1.100-6.200L11 17.700l6.200-.9z" fill="#fff" />
    </svg>
  );
}
