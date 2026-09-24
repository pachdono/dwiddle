// The duck in each theme's own setting: on a cherry branch for Sakura, by a
// cottage for Cottage, and so on. It stands in for the plain duck in the
// sidebar, so the logo belongs to the theme rather than sitting on top of it.
//
// Every scene is the same duck, drawn at the same size in the same place, in a
// 100 by 100 tile. Only the tile colour follows light and dark mode; the
// things in the scene keep their colours, the way the duck keeps its own.

import { useId } from "react";
import { DuckMark, DuckParts } from "./Duck.jsx";

// Places the 120 by 140 duck with its centre at x and its feet at y.
function Placed({ x = 50, feet = 88, scale = 0.56 }) {
  return (
    <g transform={`translate(${x - 63 * scale} ${feet - 130 * scale}) scale(${scale})`}>
      <DuckParts />
    </g>
  );
}

// Five round petals around a centre.
function Blossom({ x, y, r = 1, fill = "#F9B9CC", heart = "#E0678F" }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${r})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-3.4" rx="2.6" ry="3.3" fill={fill} transform={`rotate(${a})`} />
      ))}
      <circle r="1.5" fill={heart} />
    </g>
  );
}

function Sprig({ x, lean = 1 }) {
  const buds = [0, 1, 2, 3, 4, 5];
  return (
    <g>
      <path d={`M${x} 98 C ${x + lean * 2} 80, ${x + lean * 3} 64, ${x + lean * 5} 46`}
        stroke="#6F9A5B" strokeWidth="2" strokeLinecap="round" fill="none" />
      {buds.map((i) => {
        const t = i / (buds.length - 1);
        const bx = x + lean * (1 + t * 4) + (i % 2 ? 2.6 : -2.6);
        const by = 76 - t * 30;
        return <ellipse key={i} cx={bx} cy={by} rx="2.3" ry="3.4"
          fill={i % 2 ? "#9D7BE3" : "#B79BF2"} transform={`rotate(${i % 2 ? 24 : -24} ${bx} ${by})`} />;
      })}
      <ellipse cx={x + lean * 5} cy="43" rx="2" ry="3" fill="#B79BF2" />
    </g>
  );
}

function Sparkle({ x, y, r = 1, fill = "#FFFFFF" }) {
  return (
    <path transform={`translate(${x} ${y}) scale(${r})`} fill={fill}
      d="M0 -4.5 C0.6 -1.2 1.2 -0.6 4.5 0 C1.2 0.6 0.6 1.2 0 4.5 C-0.6 1.2 -1.2 0.6 -4.5 0 C-1.2 -0.6 -0.6 -1.2 0 -4.5Z" />
  );
}

const SCENES = {
  sakura: {
    tile: { light: ["#FFEAF1", "#F9C3D6"], dark: ["#3B2A31", "#1E161A"] },
    draw: () => (
      <>
        <ellipse cx="16" cy="24" rx="1.6" ry="2.4" fill="#F7A9C1" transform="rotate(35 16 24)" />
        <ellipse cx="86" cy="32" rx="1.6" ry="2.4" fill="#F7A9C1" transform="rotate(-30 86 32)" />
        <ellipse cx="24" cy="50" rx="1.3" ry="2" fill="#F9B9CC" transform="rotate(60 24 50)" />
        <path d="M-4 92 C 18 86, 40 90, 60 87 S 90 78, 106 70" stroke="#6E4636" strokeWidth="5"
          strokeLinecap="round" fill="none" />
        <path d="M78 82 C 84 74, 88 70, 96 65" stroke="#6E4636" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <Placed feet={88} />
        <Blossom x={60} y={27} r={0.62} />
        <Blossom x={10} y={88} r={1.05} />
        <Blossom x={24} y={92} r={0.7} fill="#FBCFDC" />
        <Blossom x={90} y={73} r={1} />
        <Blossom x={96} y={62} r={0.7} fill="#FBCFDC" />
      </>
    ),
  },
  cottage: {
    tile: { light: ["#F8F2E2", "#E4D8B6"], dark: ["#2E2A1F", "#15130D"] },
    draw: () => (
      <>
        <ellipse cx="26" cy="106" rx="62" ry="24" fill="#8FAE6E" />
        <ellipse cx="88" cy="108" rx="44" ry="22" fill="#7A9C5A" />
        <rect x="24" y="48" width="4" height="9" fill="#6E4636" />
        <rect x="6.5" y="60" width="22" height="22" rx="1" fill="#F4E4C4" />
        <path d="M3.5 62 L17.5 47 L31.5 62Z" fill="#8C5A3B" />
        <rect x="9" y="65" width="5.5" height="5.5" rx="0.8" fill="#F6CF6A" />
        <rect x="18" y="71" width="6" height="11" rx="3" fill="#6E4636" />
        <Placed x={60} feet={90} />
        <rect x="86.5" y="82" width="5" height="8" rx="1.5" fill="#F3E6D0" />
        <path d="M81.5 83.5 a7.5 6.2 0 0 1 15 0Z" fill="#C8503A" />
        <circle cx="86" cy="80" r="1.1" fill="#FFF3E6" />
        <circle cx="91.5" cy="78.8" r="0.9" fill="#FFF3E6" />
      </>
    ),
  },
  matcha: {
    tile: { light: ["#EFF7E4", "#CCE3B3"], dark: ["#26341C", "#10170B"] },
    draw: () => (
      <>
        <path d="M34 30 c-3 -4 3 -6 0 -10 M66 28 c-3 -4 3 -6 0 -10" stroke="#FFFFFF" strokeOpacity="0.7"
          strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <Placed feet={94} />
        <g transform="rotate(20 88 62)">
          <rect x="85.5" y="38" width="5" height="22" rx="2" fill="#D6B574" />
          <path d="M82 60 h14 l-2 18 c-1 4 -9 4 -10 0Z" fill="#EAD7A4" />
          <path d="M85 61 l1 16 M89 61 v17 M93 61 l-1 16" stroke="#C9AD6E" strokeWidth="0.9" />
        </g>
        <path d="M20 69 H80 C80 86 67 96 50 96 C33 96 20 86 20 69Z" fill="#3E5B3B" />
        <path d="M24 77 C 34 80, 66 80, 76 77" stroke="#557A51" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <ellipse cx="50" cy="69" rx="30" ry="5.5" fill="#A6CB6C" />
        <ellipse cx="47" cy="68.6" rx="16" ry="2.8" fill="#C7DF94" />
        <circle cx="60" cy="69.5" r="1.2" fill="#C7DF94" />
        <circle cx="36" cy="70" r="0.9" fill="#C7DF94" />
      </>
    ),
  },
  violet: {
    tile: { light: ["#F3ECFE", "#D9C8F7"], dark: ["#33244F", "#170F27"] },
    draw: () => (
      <>
        <Sparkle x={17} y={22} r={0.9} />
        <Sparkle x={86} y={18} r={0.7} />
        <Sparkle x={80} y={34} r={0.45} fill="#C9B4F7" />
        <ellipse cx="50" cy="96" rx="44" ry="7" fill="#B9A0EE" opacity="0.45" />
        <Placed feet={92} />
        <Sprig x={10} lean={1} />
        <Sprig x={90} lean={-1} />
      </>
    ),
  },
  ocean: {
    tile: { light: ["#E4F4FD", "#A9D7F1"], dark: ["#1A3654", "#0A1828"] },
    draw: () => (
      <>
        <circle cx="84" cy="21" r="8" fill="#FFE08A" />
        <path d="M14 26 q3 -3 6 0 q3 -3 6 0" stroke="#2F5D7F" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M-2 76 Q 10 71 22 76 T 46 76 T 70 76 T 94 76 T 118 76 V104 H-2Z" fill="#2E86C1" />
        <Placed feet={106} />
        <path d="M-4 82 Q 9 76 22 82 T 48 82 T 74 82 T 100 82 T 126 82 V104 H-4Z" fill="#4FA6DA" />
        <path d="M-4 90 Q 11 85 26 90 T 56 90 T 86 90 T 116 90 V104 H-4Z" fill="#7CC3E8" />
        <path d="M12 81.5 q5 -3 10 0 M58 81.5 q5 -3 10 0" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="1.3"
          fill="none" strokeLinecap="round" />
      </>
    ),
  },
  prismarine: {
    tile: { light: ["#E3F8F1", "#AEE6D5"], dark: ["#15453D", "#08231F"] },
    draw: () => (
      <>
        <circle cx="22" cy="30" r="3.2" fill="none" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.3" />
        <circle cx="29" cy="20" r="1.8" fill="none" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.1" />
        <circle cx="80" cy="26" r="2.6" fill="none" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.2" />
        <Placed feet={94} />
        <path d="M2 100 L10 64 L19 100Z" fill="#46BFA7" />
        <path d="M10 64 L13 100 L19 100Z" fill="#2E9C87" />
        <path d="M14 100 L23 76 L30 100Z" fill="#7ADBC6" />
        <path d="M23 76 L25 100 L30 100Z" fill="#46BFA7" />
        <path d="M72 100 L83 58 L93 100Z" fill="#46BFA7" />
        <path d="M83 58 L86 100 L93 100Z" fill="#2E9C87" />
        <path d="M86 100 L95 74 L102 100Z" fill="#7ADBC6" />
        <path d="M95 74 L97 100 L102 100Z" fill="#46BFA7" />
      </>
    ),
  },
};

export function ThemeMark({ theme = "classic", dark = false, size = 28, className = "" }) {
  const id = useId().replace(/:/g, "");
  const scene = SCENES[theme];
  if (!scene) return <DuckMark size={size} className={className} />;
  const [a, b] = scene.tile[dark ? "dark" : "light"];
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" fill="none"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dwiddle">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <clipPath id={`c${id}`}><rect width="100" height="100" rx="24" /></clipPath>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect width="100" height="100" fill={`url(#g${id})`} />
        {scene.draw()}
      </g>
    </svg>
  );
}
