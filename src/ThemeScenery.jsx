// A little scene for each theme, with Dwiddle in it: sitting on a sakura
// branch, lounging on a sunset beach, in a pile of autumn leaves, on the moon.
// It fills the empty space in the sidebar, and sits beside the greeting on a
// phone. Purely decoration: it never takes a tap, and it keeps still for
// anyone who has asked their device for less motion.

import { DuckParts } from "./Duck.jsx";

// Places the 120 by 140 duck with its feet (or seat) at x, y.
const Duck = ({ x, y, s = 0.5, flip = false, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s}) translate(-63 -130)`}>
    <DuckParts />
  </g>
);

const Blossom = ({ x, y, r = 1, fill = "#F9B9CC", heart = "#E0678F" }) => (
  <g transform={`translate(${x} ${y}) scale(${r})`}>
    {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-3.4" rx="2.6" ry="3.3" fill={fill} transform={`rotate(${a})`} />)}
    <circle r="1.4" fill={heart} />
  </g>
);

const Maple = ({ x, y, r = 1, rot = 0, fill = "#D9602B" }) => (
  <path transform={`translate(${x} ${y}) rotate(${rot}) scale(${r})`} fill={fill}
    d="M0 -6 L1.6 -2.6 L5 -3.6 L3.6 0 L6.2 1.6 L2.2 2.2 L2.6 5 L0 3.6 L-2.6 5 L-2.2 2.2 L-6.2 1.6 L-3.6 0 L-5 -3.6 L-1.6 -2.6Z" />
);

const Star = ({ x, y, r = 1, cls = "" }) => (
  <circle className={cls} cx={x} cy={y} r={2.2 * r} fill="#FDE68A" />
);

const SCENES = {
  sakura: () => (
    <>
      {/* the tree: a trunk from the ground, one long branch for Dwiddle */}
      <path d="M150 300 C146 250 152 215 138 180 C128 156 132 132 150 110" stroke="#7A4A36" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M140 188 C112 176 84 174 44 170" stroke="#7A4A36" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M146 140 C170 128 186 118 200 100" stroke="#7A4A36" strokeWidth="6" fill="none" strokeLinecap="round" />
      {[[150, 90, 44], [112, 104, 34], [188, 92, 32], [80, 150, 26], [48, 158, 22], [176, 130, 26], [132, 64, 30]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? "#F9C6D6" : "#F7B2C8"} opacity="0.95" />
      ))}
      {[[120, 80], [160, 70], [100, 110], [190, 110], [140, 110], [70, 145], [178, 88], [135, 50], [44, 150], [205, 95]].map(([x, y], i) => <Blossom key={i} x={x} y={y} r={1.3} />)}
      <Duck x={86} y={170} s={0.42} />
      <path d="M0 300 Q110 282 220 300 Z" fill="#E9B8C8" opacity="0.6" />
      {[[30, 230], [70, 260], [190, 250], [110, 245], [160, 280]].map(([x, y], i) => <Blossom key={"g" + i} x={x} y={y} r={0.9} fill="#F9C6D6" />)}
    </>
  ),
  sunset: () => (
    <>
      <circle cx="150" cy="190" r="48" fill="#FFB36B" opacity="0.9" />
      <circle cx="150" cy="190" r="34" fill="#FFD08A" />
      <path d="M0 215 Q110 196 220 212 L220 300 L0 300Z" fill="#F4C58A" />
      <path d="M0 250 Q90 228 220 246 L220 300 L0 300Z" fill="#E9A96B" />
      {/* a palm tree */}
      <path d="M186 256 C180 220 184 180 176 146" stroke="#8A5A3B" strokeWidth="8" fill="none" strokeLinecap="round" />
      {[[-150, 26], [-110, 30], [-60, 28], [-20, 26], [-190, 22]].map(([a, l], i) => (
        <path key={i} transform={`translate(176 146) rotate(${a})`} d={`M0 0 Q${l * 0.6} -10 ${l * 1.6} 4 Q${l * 0.7} -2 0 0Z`} fill={i % 2 ? "#3F9B55" : "#2F7D45"} />
      ))}
      {/* a parasol, a towel and Dwiddle lounging */}
      <path d="M58 262 L72 196" stroke="#8A5A3B" strokeWidth="3" />
      <path d="M36 204 Q72 170 108 196 Z" fill="#E5484D" />
      <path d="M54 196 Q72 176 90 192" stroke="#fff" strokeWidth="5" fill="none" opacity="0.8" />
      <rect x="20" y="262" width="100" height="14" rx="4" fill="#3B82F6" />
      <rect x="20" y="266" width="100" height="4" fill="#fff" opacity="0.8" />
      <Duck x={70} y={266} s={0.36} rot={-8} />
    </>
  ),
  autumn: () => (
    <>
      <path d="M120 300 C118 250 124 214 116 170" stroke="#6B4226" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M118 200 C98 188 86 176 76 160 M120 186 C140 176 152 164 160 150" stroke="#6B4226" strokeWidth="6" fill="none" strokeLinecap="round" />
      {[[118, 128, 50], [76, 150, 32], [160, 142, 34], [96, 104, 30], [146, 100, 30]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={["#E07B39", "#D9602B", "#F2A541", "#C8482B", "#E8913C"][i]} />
      ))}
      {[[90, 120, 20], [140, 130, -30], [118, 96, 60], [70, 160, 10], [165, 160, -60]].map(([x, y, r], i) => <Maple key={i} x={x} y={y} r={1.4} rot={r} fill="#FBD38D" />)}
      {/* a pile of leaves, with Dwiddle in a scarf in the middle of it */}
      <Duck x={112} y={292} s={0.42} />
      <path d="M92 250 Q112 260 134 250 L136 256 Q112 268 90 256Z" fill="#C0563A" />
      <path d="M40 300 Q80 262 118 268 Q160 262 196 300Z" fill="#D9602B" />
      {[[60, 284, 20], [90, 276, -20], [150, 278, 40], [176, 290, -10], [120, 286, 70], [70, 296, 0], [138, 296, 30]].map(([x, y, r], i) => <Maple key={"p" + i} x={x} y={y} r={1.6} rot={r} fill={["#F2A541", "#C8482B", "#E8913C", "#FBD38D"][i % 4]} />)}
    </>
  ),
  midnight: () => (
    <>
      {[[30, 40, 1], [180, 30, 0.8], [200, 120, 1.1], [20, 150, 0.7], [90, 20, 0.9], [60, 220, 0.8], [196, 230, 1]].map(([x, y, r], i) => <Star key={i} x={x} y={y} r={r} cls={"ts-twinkle d" + (i % 3)} />)}
      {/* the moon, and Dwiddle sitting in its curve */}
      <circle cx="116" cy="170" r="70" fill="#FDE68A" />
      <circle cx="146" cy="150" r="62" fill="var(--ts-sky, #1E2A44)" />
      <circle cx="80" cy="200" r="7" fill="#F6D776" opacity="0.7" /><circle cx="68" cy="160" r="5" fill="#F6D776" opacity="0.7" />
      <Duck x={104} y={212} s={0.4} />
      <path d="M20 268 Q50 250 80 262 Q110 248 140 264 Q170 256 200 270 L200 290 L20 290Z" fill="#E5E7F2" opacity="0.18" />
    </>
  ),
  cottage: () => (
    <>
      <path d="M0 246 Q110 222 220 244 L220 300 L0 300Z" fill="#8DB86B" />
      {/* the cottage */}
      <rect x="90" y="186" width="104" height="66" rx="3" fill="#F3E3C3" />
      <path d="M80 190 L142 144 L204 190Z" fill="#8B5E3C" />
      <path d="M86 186 L142 148 L198 186" stroke="#6E4A2E" strokeWidth="3" fill="none" />
      <rect x="168" y="152" width="14" height="26" fill="#A0522D" />
      <path className="ts-smoke" d="M175 148 q-8 -10 0 -18 q8 -8 0 -18" stroke="#CFC8BD" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="132" y="214" width="22" height="38" rx="10" fill="#6E4A2E" />
      <rect x="102" y="204" width="20" height="18" rx="2" fill="#FDE68A" stroke="#8B5E3C" strokeWidth="2" />
      <rect x="164" y="204" width="20" height="18" rx="2" fill="#FDE68A" stroke="#8B5E3C" strokeWidth="2" />
      {[[20, 262], [40, 272], [196, 268], [60, 282], [206, 284]].map(([x, y], i) => <Blossom key={i} x={x} y={y} r={1.1} fill={["#F9B9CC", "#FDE68A", "#C4B5FD"][i % 3]} heart="#E8913C" />)}
      <Duck x={60} y={262} s={0.36} />
    </>
  ),
  matcha: () => (
    <>
      {[[26, 300, 0], [52, 300, 1], [196, 300, 2]].map(([x, y, i]) => (
        <g key={i}>
          <rect x={x - 5} y={y - 250 + i * 30} width="10" height={250 - i * 30} rx="4" fill={i % 2 ? "#6AA84F" : "#7BB661"} />
          {[0, 1, 2, 3].map((k) => <rect key={k} x={x - 6} y={y - 60 - k * 50} width="12" height="3" fill="#4F8A3A" />)}
          <path d={`M${x} ${y - 150} q18 -8 28 -2 q-14 8 -28 2Z`} fill="#5E9E47" />
        </g>
      ))}
      {/* a big bowl of matcha, and Dwiddle having a bath in it */}
      <Duck x={112} y={256} s={0.42} />
      <ellipse cx="112" cy="238" rx="66" ry="14" fill="#9CCB6B" />
      <path d="M46 238 Q50 292 112 294 Q174 292 178 238Z" fill="#2F4F3A" />
      <ellipse cx="112" cy="238" rx="66" ry="10" fill="none" stroke="#3E6B4A" strokeWidth="3" />
      <path className="ts-smoke" d="M84 214 q-6 -10 0 -18 M140 212 q6 -10 0 -18" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M82 262 q30 10 60 0" stroke="#4F8A3A" strokeWidth="2" fill="none" opacity="0.6" />
    </>
  ),
  violet: () => (
    <>
      <path d="M0 256 Q110 236 220 252 L220 300 L0 300Z" fill="#A78BFA" opacity="0.35" />
      {Array.from({ length: 13 }, (_, i) => {
        const x = 10 + i * 16 + (i % 2) * 4, top = 150 + ((i * 37) % 60);
        return (
          <g key={i}>
            <path d={`M${x} 300 L${x + 2} ${top}`} stroke="#6B8E4E" strokeWidth="2" />
            {Array.from({ length: 6 }, (_, k) => <ellipse key={k} cx={x + 2 + (k % 2 ? 2.5 : -2.5)} cy={top + k * 8} rx="3" ry="4.5" fill={k % 2 ? "#8B5CF6" : "#A78BFA"} />)}
          </g>
        );
      })}
      <g className="ts-flutter"><path d="M160 110 q-10 -12 -2 -14 q6 0 2 14 q10 -12 16 -8 q2 8 -16 8Z" fill="#F0ABFC" /></g>
      <Duck x={110} y={286} s={0.42} />
    </>
  ),
  ocean: () => (
    <>
      <circle cx="170" cy="70" r="24" fill="#FDE68A" />
      <path d="M40 80 q8 -8 16 0 q8 -8 16 0" stroke="#475569" strokeWidth="2" fill="none" />
      <path d="M0 212 q27 -14 55 0 t55 0 t55 0 t55 0 L220 300 L0 300Z" fill="#60A5FA" />
      <path className="ts-wave" d="M-40 236 q27 -12 55 0 t55 0 t55 0 t55 0 t55 0 L260 300 L-40 300Z" fill="#3B82F6" />
      {/* Dwiddle floating in a rubber ring */}
      <Duck x={110} y={236} s={0.4} />
      <ellipse cx="110" cy="236" rx="40" ry="12" fill="none" stroke="#F97316" strokeWidth="11" />
      <path d="M78 230 l6 12 M136 230 l-6 12" stroke="#fff" strokeWidth="6" />
      <path className="ts-wave" d="M-40 266 q27 -12 55 0 t55 0 t55 0 t55 0 t55 0 L260 300 L-40 300Z" fill="#2563EB" />
    </>
  ),
  prismarine: () => (
    <>
      <path d="M0 262 Q110 244 220 260 L220 300 L0 300Z" fill="#F1D9A7" />
      <path d="M30 262 C24 230 40 214 34 188 M34 222 C46 212 50 200 48 186 M30 236 C18 226 14 212 18 200" stroke="#F472B6" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M186 262 C190 226 176 210 184 180 M184 214 C196 204 200 190 196 178" stroke="#2DD4BF" strokeWidth="8" fill="none" strokeLinecap="round" />
      {[[70, 270, "#5EEAD4"], [150, 274, "#A5B4FC"], [120, 280, "#99F6E4"]].map(([x, y, c], i) => <ellipse key={i} cx={x} cy={y} rx="7" ry="4.5" fill={c} opacity="0.9" />)}
      {[[96, 170, 6], [120, 140, 4], [104, 110, 5], [132, 90, 3.5], [60, 130, 4]].map(([x, y, r], i) => <circle key={i} className={"ts-bubble d" + (i % 3)} cx={x} cy={y} r={r} fill="none" stroke="#99F6E4" strokeWidth="1.6" />)}
      <path d="M160 250 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1Z" fill="#FB923C" />
      <Duck x={108} y={266} s={0.42} />
    </>
  ),
};

export function hasScenery(theme) { return !!SCENES[theme]; }

export function ThemeScenery({ theme, className = "" }) {
  const draw = SCENES[theme];
  if (!draw) return null;
  return (
    <svg className={"theme-scenery " + className} viewBox="0 0 220 300" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      {draw()}
    </svg>
  );
}

// Things drifting down over the home screen: petals, leaves, bubbles, stars.
// Each one is its own size, speed and sway, so it looks like weather rather
// than a pattern. They float over everything but never catch a tap.
const DRIFT = { sakura: "petal", autumn: "leaf", ocean: "bubble", prismarine: "glass", midnight: "star", violet: "butterfly", cottage: "fluff", matcha: "leaf-g", sunset: "firefly" };
const rnd = (n) => { const x = Math.sin(n * 9301 + 49297) * 233280; return x - Math.floor(x); };
export function ThemeDrift({ theme }) {
  const kind = DRIFT[theme];
  if (!kind) return null;
  return (
    <div className={"theme-drift " + kind} aria-hidden="true">
      {kind === "star" && <b className="shooting" />}
      {Array.from({ length: 7 }, (_, i) => {
        const size = 0.6 + rnd(i) * 0.9;
        return (
          <span key={i} style={{ left: `${rnd(i + 40) * 100}%`, animationDelay: `-${rnd(i + 80) * 18}s`, animationDuration: `${12 + rnd(i + 120) * 12}s` }}>
            <i style={{ transform: `scale(${size.toFixed(2)})`, animationDuration: `${2.5 + rnd(i + 160) * 3}s`, opacity: (0.45 + rnd(i + 200) * 0.35).toFixed(2) }} />
          </span>
        );
      })}
    </div>
  );
}
