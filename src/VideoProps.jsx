// Moving drawings for explainer videos: a plant that grows, a sun whose rays
// turn, water dripping, a heart beating, joined by arrows that draw themselves
// and carry dots along to show what goes where. A scene names them (see
// api/video.js "props" and "links"); a scene from an older video that names
// none gets them from the words it says, so every video has something moving
// that matches what is being said.
//
// Each drawing sits in a 120 by 120 box centred on 60, 60.

import { useId, useMemo } from "react";

const INK = "var(--vd-ink, #1b1d26)";

function Sun() {
  return (
    <g className="vp-sun">
      <circle cx="60" cy="60" r="34" fill="#FFE27A" opacity="0.45" className="vp-glow" />
      <g className="vp-spin">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M60 8v12" stroke="#F2A93B" strokeWidth="5" strokeLinecap="round" transform={`rotate(${i * 30} 60 60)`} />
        ))}
      </g>
      <circle cx="60" cy="60" r="24" fill="#FFC93C" stroke="#E89B2C" strokeWidth="3" />
    </g>
  );
}

function Plant() {
  return (
    <g className="vp-plant">
      <path d="M30 104h60l-6 14H36z" fill="#C97B4A" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <ellipse cx="60" cy="104" rx="30" ry="5" fill="#7A4B2A" />
      <path className="vp-grow" d="M60 104C60 86 58 70 60 40" stroke="#3E9B4F" strokeWidth="5" fill="none" strokeLinecap="round" />
      <g className="vp-sway">
        <path className="vp-leaf l1" d="M60 80C46 80 34 72 30 60c14-2 26 6 30 20z" fill="#5DBB63" stroke="#2F7D3A" strokeWidth="2.5" />
        <path className="vp-leaf l2" d="M60 66c14 0 26-8 30-20-14-2-26 6-30 20z" fill="#5DBB63" stroke="#2F7D3A" strokeWidth="2.5" />
        <path className="vp-leaf l3" d="M60 42c-8-6-10-16-6-24 8 4 10 14 6 24z" fill="#7ACB72" stroke="#2F7D3A" strokeWidth="2.5" />
      </g>
    </g>
  );
}

function Tree() {
  return (
    <g className="vp-sway">
      <path d="M54 116V70h12v46z" fill="#8B5A33" stroke={INK} strokeWidth="2.5" />
      <circle cx="60" cy="52" r="34" fill="#5DBB63" stroke="#2F7D3A" strokeWidth="3" />
      <circle cx="44" cy="58" r="16" fill="#4CAF55" />
      <circle cx="74" cy="42" r="14" fill="#73C76A" />
    </g>
  );
}

function Water() {
  const drop = "M60 0c8 12 14 20 14 28a14 14 0 0 1-28 0c0-8 6-16 14-28z";
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${(i - 1) * 30} 20) scale(0.8)`}>
          <path className="vp-drip" style={{ animationDelay: `${i * 0.5}s` }} d={drop} fill="#5AB0F0" stroke="#2F80ED" strokeWidth="3" />
        </g>
      ))}
      <path d="M14 104c12-8 22 8 34 0s22 8 34 0 22 8 26 0" stroke="#2F80ED" strokeWidth="4" fill="none" className="vp-ripple" strokeLinecap="round" />
    </g>
  );
}

function Cloud() {
  return (
    <g>
      <g className="vp-drift">
        <path d="M30 70a18 18 0 0 1 4-35 24 24 0 0 1 45-6 18 18 0 0 1 12 41z" fill="#EEF4FB" stroke="#8AA4C0" strokeWidth="3" strokeLinejoin="round" />
      </g>
      {[38, 56, 74].map((x, i) => <path key={x} className="vp-rain" style={{ animationDelay: `${i * 0.3}s` }} d={`M${x} 82l-4 12`} stroke="#5AB0F0" strokeWidth="4" strokeLinecap="round" />)}
    </g>
  );
}

const atomBall = (cx, cy, r, fill, label) => (
  <g key={cx + ":" + cy}>
    <circle cx={cx} cy={cy} r={r} fill={fill} stroke={INK} strokeWidth="2.5" />
    {label && <text x={cx} y={cy + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff">{label}</text>}
  </g>
);

function CO2() {
  return (
    <g className="vp-bob">
      <path d="M30 60h60" stroke={INK} strokeWidth="5" />
      {atomBall(28, 60, 17, "#E5484D", "O")}{atomBall(60, 60, 20, "#3A3F4B", "C")}{atomBall(92, 60, 17, "#E5484D", "O")}
    </g>
  );
}

function O2() {
  return (
    <g className="vp-bob">
      <path d="M44 60h32" stroke={INK} strokeWidth="5" />
      {atomBall(42, 60, 19, "#E5484D", "O")}{atomBall(78, 60, 19, "#E5484D", "O")}
    </g>
  );
}

function Glucose() {
  return (
    <g className="vp-spin-slow">
      <path d="M60 22l33 19v38L60 98 27 79V41z" fill="#FFF3C9" stroke="#E89B2C" strokeWidth="4" strokeLinejoin="round" />
      <text x="60" y="66" textAnchor="middle" fontSize="16" fontWeight="700" fill="#9A5B0A">C₆H₁₂O₆</text>
    </g>
  );
}

function Cell() {
  return (
    <g>
      <path className="vp-wobble" d="M60 14c26 0 46 18 46 44s-18 48-46 48-46-20-46-48 20-44 46-44z" fill="#E7F6EC" stroke="#2E9E5B" strokeWidth="3.5" />
      <circle cx="56" cy="56" r="17" fill="#C9B6F2" stroke="#7C5CD6" strokeWidth="3" />
      <circle cx="52" cy="52" r="6" fill="#7C5CD6" />
      <g transform="rotate(-20 84 76)"><ellipse cx="84" cy="76" rx="11" ry="6" fill="#FFB27A" stroke="#D9772E" strokeWidth="2" className="vp-bob" /></g>
      <ellipse cx="34" cy="82" rx="9" ry="5" fill="#8FD18F" stroke="#2E9E5B" strokeWidth="2" />
    </g>
  );
}

function Atom() {
  return (
    <g>
      {[0, 60, 120].map((r) => (
        <g key={r} transform={`rotate(${r} 60 60)`}>
          <ellipse cx="60" cy="60" rx="46" ry="16" fill="none" stroke="#5B9DF5" strokeWidth="2.5" />
          <circle r="5" fill="#2F80ED">
            <animateMotion dur={`${2 + r / 120}s`} repeatCount="indefinite" path="M106 60a46 16 0 1 1-92 0a46 16 0 1 1 92 0" />
          </circle>
        </g>
      ))}
      <circle cx="60" cy="60" r="11" fill="#E5484D" stroke={INK} strokeWidth="2" />
    </g>
  );
}

function Molecule() {
  return (
    <g className="vp-spin-slow">
      <path d="M60 60L30 36M60 60l32-20M60 60v34" stroke={INK} strokeWidth="5" />
      {atomBall(60, 60, 17, "#8B5CF6")}{atomBall(28, 34, 12, "#2F80ED")}{atomBall(94, 38, 12, "#2E9E5B")}{atomBall(60, 96, 12, "#E89B2C")}
    </g>
  );
}

function Heart() {
  return (
    <g className="vp-beat">
      <path d="M60 104C24 80 12 60 16 40c4-18 30-24 44-4 14-20 40-14 44 4 4 20-8 40-44 64z" fill="#E5484D" stroke="#A3242A" strokeWidth="3.5" />
      <path d="M36 44c2-6 8-10 14-10" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
    </g>
  );
}

function Lungs() {
  return (
    <g>
      <path d="M60 18v40M60 58l-12 10M60 58l12 10" stroke="#C77A86" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path className="vp-breathe" d="M50 40C30 40 18 64 18 88c0 14 10 18 20 14 10-4 14-12 14-24z" fill="#F4A6B4" stroke="#C0566A" strokeWidth="3" />
      <path className="vp-breathe" d="M70 40c20 0 32 24 32 48 0 14-10 18-20 14-10-4-14-12-14-24z" fill="#F4A6B4" stroke="#C0566A" strokeWidth="3" />
    </g>
  );
}

function Brain() {
  return (
    <g>
      <path d="M34 84c-14-2-20-14-16-26-8-12 2-28 16-28 4-12 22-16 30-6 10-8 28-2 30 10 14 2 18 18 10 28 4 14-8 24-22 22-6 10-22 12-30 2-6 2-14 2-18-2z"
        fill="#F8C5D0" stroke="#C0566A" strokeWidth="3" strokeLinejoin="round" />
      <path d="M44 40c6 4 6 12 0 16M62 34c-4 8 2 14 10 14M70 64c-8 0-12 8-8 14M42 66c6 0 10 6 8 12" stroke="#C0566A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {[[26, 22], [96, 26], [100, 86]].map(([x, y], i) => <circle key={i} className="vp-spark" style={{ animationDelay: `${i * 0.4}s` }} cx={x + 4} cy={y - 3} r="3.5" fill="#FFC93C" />)}
    </g>
  );
}

function Earth() {
  return (
    <g>
      <defs><clipPath id="vp-earth"><circle cx="60" cy="60" r="44" /></clipPath></defs>
      <circle cx="60" cy="60" r="44" fill="#5AB0F0" />
      <g clipPath="url(#vp-earth)">
        <g className="vp-turn">
          {[0, 120].map((dx) => (
            <g key={dx} transform={`translate(${dx} 0)`}>
              <path d="M20 40c10-8 26-6 30 4s-6 14 2 22-6 16-16 12-20-10-18-22z" fill="#5DBB63" />
              <path d="M70 26c10 0 20 6 22 14s-10 8-14 16-12 4-14-6 0-24 6-24z" fill="#5DBB63" />
              <path d="M74 80c8-4 18 0 18 8s-12 10-18 6-6-10 0-14z" fill="#5DBB63" />
            </g>
          ))}
        </g>
      </g>
      <circle cx="60" cy="60" r="44" fill="none" stroke="#2F80ED" strokeWidth="3" />
    </g>
  );
}

function Magnet() {
  return (
    <g>
      {[0, 1, 2].map((i) => <path key={i} className="vp-field" style={{ animationDelay: `${i * 0.4}s` }} d={`M30 ${30 - i * 8}C30 ${-4 - i * 10} 90 ${-4 - i * 10} 90 ${30 - i * 8}`} stroke="#8B5CF6" strokeWidth="2.5" fill="none" strokeDasharray="5 6" />)}
      <path d="M20 40v30a40 40 0 0 0 80 0V40H80v30a20 20 0 0 1-40 0V40z" fill="#E5484D" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 40h20v14H20zM80 40h20v14H80z" fill="#D9DDE3" stroke={INK} strokeWidth="3" />
    </g>
  );
}

function Battery() {
  return (
    <g>
      <rect x="22" y="36" width="72" height="48" rx="8" fill="#fff" stroke={INK} strokeWidth="3.5" />
      <rect x="94" y="50" width="8" height="20" rx="2" fill={INK} />
      <rect x="28" y="42" width="60" height="36" rx="4" fill="#4CC27D" className="vp-charge" />
      <path d="M62 46l-12 16h10l-6 14 14-18H58z" fill="#FFC93C" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </g>
  );
}

function Bulb() {
  return (
    <g>
      <circle cx="60" cy="48" r="38" fill="#FFE27A" opacity="0.5" className="vp-glow" />
      <path d="M60 12a32 32 0 0 0-18 58c4 4 6 8 6 14h24c0-6 2-10 6-14a32 32 0 0 0-18-58z" fill="#FFD84D" stroke="#C9921A" strokeWidth="3" />
      <path d="M52 64l4-14h8l4 14" stroke="#C9921A" strokeWidth="2.5" fill="none" />
      <rect x="47" y="86" width="26" height="16" rx="4" fill="#A0A7B4" stroke={INK} strokeWidth="2.5" />
      <path d="M50 92h20M50 97h20" stroke={INK} strokeWidth="2" />
    </g>
  );
}

function Flask() {
  return (
    <g>
      <defs><clipPath id="vp-flask"><path d="M48 14h24v30l28 56c3 7-1 14-9 14H29c-8 0-12-7-9-14l28-56z" /></clipPath></defs>
      <g clipPath="url(#vp-flask)">
        <rect x="10" y="68" width="100" height="50" fill="#8FD3C6" />
        {[42, 60, 76].map((x, i) => <circle key={x} className="vp-bubble" style={{ animationDelay: `${i * 0.6}s` }} cx={x} cy="104" r="5" fill="#fff" opacity="0.8" />)}
      </g>
      <path d="M48 14h24v30l28 56c3 7-1 14-9 14H29c-8 0-12-7-9-14l28-56z" fill="none" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M44 14h32" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function Thermometer() {
  return (
    <g>
      <rect x="50" y="10" width="20" height="82" rx="10" fill="#fff" stroke={INK} strokeWidth="3.5" />
      <rect x="55" y="40" width="10" height="56" rx="5" fill="#E5484D" className="vp-rise" />
      <circle cx="60" cy="100" r="15" fill="#E5484D" stroke={INK} strokeWidth="3.5" />
      {[30, 46, 62, 78].map((y) => <path key={y} d={`M70 ${y}h8`} stroke={INK} strokeWidth="2.5" />)}
    </g>
  );
}

function DNA() {
  const a = [], b = [], rungs = [];
  for (let i = 0; i <= 24; i++) {
    const y = 4 + i * 4.7, s = Math.sin(i / 3);
    a.push(`${i ? "L" : "M"}${60 + 26 * s} ${y}`);
    b.push(`${i ? "L" : "M"}${60 - 26 * s} ${y}`);
    if (i % 3 === 0) rungs.push(<path key={i} d={`M${60 + 26 * s} ${y}H${60 - 26 * s}`} stroke={["#E5484D", "#2F80ED", "#2E9E5B", "#E89B2C"][i % 4]} strokeWidth="4" />);
  }
  return (
    <g className="vp-twist">
      {rungs}
      <path d={a.join("")} stroke="#8B5CF6" strokeWidth="4.5" fill="none" />
      <path d={b.join("")} stroke="#5B9DF5" strokeWidth="4.5" fill="none" />
    </g>
  );
}

function Coin() {
  return (
    <g>
      {[0, 1, 2].map((i) => <ellipse key={i} cx="46" cy={96 - i * 10} rx="26" ry="9" fill="#FFC93C" stroke="#C9921A" strokeWidth="3" />)}
      <g className="vp-flip">
        <circle cx="84" cy="44" r="22" fill="#FFD84D" stroke="#C9921A" strokeWidth="3.5" />
        <text x="84" y="51" textAnchor="middle" fontSize="20" fontWeight="800" fill="#9A6B0A">£</text>
      </g>
    </g>
  );
}

function gearPath(cx, cy, r, teeth) {
  let d = "";
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r : r + 7;
    const a2 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    d += `${i ? "L" : "M"}${cx + rr * Math.cos(a)} ${cy + rr * Math.sin(a)}L${cx + rr * Math.cos(a2)} ${cy + rr * Math.sin(a2)}`;
  }
  return d + "z";
}
function Gear() {
  return (
    <g>
      <g className="vp-spin"><path d={gearPath(44, 50, 26, 9)} fill="#A0A7B4" stroke={INK} strokeWidth="3" /><circle cx="44" cy="50" r="8" fill="#fff" stroke={INK} strokeWidth="3" /></g>
      <g className="vp-spin-back"><path d={gearPath(84, 84, 18, 7)} fill="#5B9DF5" stroke={INK} strokeWidth="3" /><circle cx="84" cy="84" r="6" fill="#fff" stroke={INK} strokeWidth="3" /></g>
    </g>
  );
}

function Clock() {
  return (
    <g>
      <circle cx="60" cy="60" r="44" fill="#fff" stroke={INK} strokeWidth="4" />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d="M60 20v6" stroke={INK} strokeWidth="3" transform={`rotate(${i * 30} 60 60)`} />)}
      <path className="vp-hand-h" d="M60 60V38" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path className="vp-hand-m" d="M60 60V26" stroke="#E5484D" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="60" r="4" fill={INK} />
    </g>
  );
}

function Book() {
  return (
    <g>
      <path d="M14 34c16-6 32-6 46 4v66c-14-10-30-10-46-4z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M106 34c-16-6-32-6-46 4v66c14-10 30-10 46-4z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {[50, 60, 70, 80].map((y) => <path key={y} d={`M24 ${y - 6}c10-3 20-3 28 2M68 ${y - 4}c8-5 18-5 28-2`} stroke="#A0A7B4" strokeWidth="2.5" fill="none" />)}
      <path className="vp-page" d="M60 38c10-8 24-10 40-6v62c-16-4-30-2-40 6z" fill="#FFF3C9" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  );
}

function Fire() {
  return (
    <g>
      <path d="M28 108h64" stroke="#8B5A33" strokeWidth="8" strokeLinecap="round" />
      <path className="vp-flame" d="M60 12c6 20 28 30 28 58a28 28 0 0 1-56 0c0-14 8-20 12-30 4 10 8 14 12 14 0-14-4-26 4-42z" fill="#FF8A3D" stroke="#D9572E" strokeWidth="3" />
      <path className="vp-flame inner" d="M60 50c4 12 16 18 16 32a16 16 0 0 1-32 0c0-8 6-14 8-20 2 6 6 8 8 6 0-6-2-12 0-18z" fill="#FFD84D" />
    </g>
  );
}

function Wave() {
  let d = "M-60 60";
  for (let x = -60; x <= 180; x += 30) d += `Q${x + 15} ${x % 60 === 0 ? 30 : 90} ${x + 30} 60`;
  return (
    <g>
      <defs><clipPath id="vp-wave"><rect x="8" y="10" width="104" height="100" rx="10" /></clipPath></defs>
      <g clipPath="url(#vp-wave)"><path className="vp-slide" d={d} stroke="#2F80ED" strokeWidth="5" fill="none" strokeLinecap="round" /></g>
      <path d="M8 60h104" stroke="#A0A7B4" strokeWidth="2" strokeDasharray="4 5" />
    </g>
  );
}

function Bacteria() {
  return (
    <g>
      {[[40, 44, -20, "#8FD18F"], [80, 56, 30, "#B8E3A1"], [52, 86, 10, "#7CC47C"]].map(([x, y, r, c], i) => (
        <g key={i} transform={`rotate(${r} ${x} ${y})`}><g className="vp-wiggle" style={{ animationDelay: `${i * 0.3}s` }}>
          <rect x={x - 22} y={y - 10} width="44" height="20" rx="10" fill={c} stroke="#2E7D46" strokeWidth="3" />
          <path d={`M${x + 22} ${y}c6-4 10 4 16 0`} stroke="#2E7D46" strokeWidth="2.5" fill="none" />
          <circle cx={x - 6} cy={y} r="3" fill="#2E7D46" /><circle cx={x + 6} cy={y + 2} r="2.5" fill="#2E7D46" />
        </g></g>
      ))}
    </g>
  );
}

/* Everyday things, for subjects like business, economics, history and
   geography, so a scene about people or firms gets a picture of them rather
   than a science drawing that only sounds similar. */

const SKIN = ["#F6D0B1", "#E0A87C", "#B97A50", "#8A5636"];
// A simple, friendly person standing at x, scaled by k, in a top colour.
const figure = (x, y, k, top, skin = SKIN[0], hair = "#4A3426", extra = null) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <path d="M-20 64v-24c0-14 9-22 20-22s20 8 20 22v24z" fill={top} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    <circle cx="0" cy="0" r="15" fill={skin} stroke={INK} strokeWidth="3" />
    <path d="M-15 -2c0-12 7-17 15-17s15 5 15 17c-6-6-12-8-15-8s-9 2-15 8z" fill={hair} />
    <circle cx="-5" cy="2" r="1.8" fill={INK} /><circle cx="5" cy="2" r="1.8" fill={INK} />
    <path d="M-5 8q5 4 10 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
    {extra}
  </g>
);

function Person() {
  return <g className="vp-bob">{figure(60, 44, 1.15, "#5B9DF5")}</g>;
}

function People() {
  return (
    <g>
      <g className="vp-bob" style={{ animationDelay: "0.4s" }}>{figure(30, 52, 0.85, "#F2A93B", SKIN[2], "#2B1D14")}</g>
      <g className="vp-bob" style={{ animationDelay: "0.8s" }}>{figure(90, 52, 0.85, "#5DBB63", SKIN[1], "#7A4B2A")}</g>
      <g className="vp-bob">{figure(60, 40, 1, "#5B9DF5")}</g>
    </g>
  );
}

function Children() {
  return (
    <g>
      <g className="vp-bob">{figure(30, 56, 0.9, "#F47C8A", SKIN[1], "#5A3A22", <path d="M-16 -8q-6 6-4 14M16 -8q6 6 4 14" stroke="#5A3A22" strokeWidth="4" fill="none" strokeLinecap="round" />)}</g>
      <g className="vp-bob" style={{ animationDelay: "0.6s" }}>{figure(90, 56, 0.9, "#FFC93C", SKIN[3], "#1E140E")}</g>
      <g className="vp-bob" style={{ animationDelay: "0.3s" }}>{figure(60, 66, 0.8, "#5DBB63", SKIN[0], "#C98A3A")}</g>
    </g>
  );
}

function Worker() {
  const hat = <g><path d="M-17 -8a17 15 0 0 1 34 0z" fill="#FFC93C" stroke={INK} strokeWidth="3" /><rect x="-21" y="-9" width="42" height="5" rx="2.5" fill="#FFC93C" stroke={INK} strokeWidth="2.5" /></g>;
  return (
    <g>
      <g className="vp-bob">{figure(52, 44, 1.1, "#F2A93B", SKIN[1], "#4A3426", hat)}</g>
      <g className="vp-wiggle" style={{ transformOrigin: "center" }}>
        <rect x="86" y="70" width="8" height="34" rx="3" fill="#8B5A33" stroke={INK} strokeWidth="2.5" />
        <rect x="76" y="62" width="28" height="12" rx="3" fill="#A0A7B4" stroke={INK} strokeWidth="2.5" />
      </g>
    </g>
  );
}

function Handshake() {
  const arm = (d, c) => (
    <g>
      <path d={d} stroke={INK} strokeWidth="27" strokeLinecap="round" fill="none" />
      <path d={d} stroke={c} strokeWidth="21" strokeLinecap="round" fill="none" />
    </g>
  );
  return (
    <g>
      {arm("M6 92L40 70", "#5B9DF5")}
      {arm("M114 92L80 70", "#F2A93B")}
      <g className="vp-wiggle">
        <path d="M36 66c6-12 16-16 26-16 12 0 20 4 24 12 4 10-2 20-14 22H50c-10 0-16-8-14-18z" fill={SKIN[0]} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M54 60c8 0 14 2 22 6M52 68c8 0 14 2 20 6M54 76c6 0 10 1 14 4" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M46 54c4-8 12-10 18-8" stroke={INK} strokeWidth="3" fill={SKIN[2]} strokeLinecap="round" />
      </g>
      <circle className="vp-spark" cx="60" cy="24" r="5" fill="#FFD84D" />
      <circle className="vp-spark" style={{ animationDelay: "0.5s" }} cx="92" cy="30" r="4" fill="#FFD84D" />
    </g>
  );
}

function Shop() {
  return (
    <g>
      <rect x="16" y="50" width="88" height="58" rx="4" fill="#FFF7EC" stroke={INK} strokeWidth="3" />
      <path d="M10 50l8-22h84l8 22z" fill="#F47C8A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${18 + i * 22} 50q11 12 22 0`} fill={i % 2 ? "#FFF7EC" : "#F47C8A"} stroke={INK} strokeWidth="2.5" />)}
      <rect x="26" y="72" width="30" height="24" rx="3" fill="#BFE3F5" stroke={INK} strokeWidth="2.5" />
      <rect x="66" y="68" width="26" height="40" rx="3" fill="#C97B4A" stroke={INK} strokeWidth="2.5" />
      <g className="vp-wiggle" style={{ transformOrigin: "top center" }}>
        <path d="M66 34l12 0" stroke={INK} strokeWidth="2" />
        <rect x="64" y="34" width="34" height="14" rx="3" fill="#FFD84D" stroke={INK} strokeWidth="2" />
        <text x="81" y="45" textAnchor="middle" fontSize="10" fontWeight="800" fill={INK}>OPEN</text>
      </g>
    </g>
  );
}

function Factory() {
  return (
    <g>
      {[0, 1].map((i) => (
        <circle key={i} className="vp-bubble" style={{ animationDelay: `${i * 0.9}s` }} cx={30 + i * 22} cy="22" r="8" fill="#C9CED6" />
      ))}
      <rect x="22" y="28" width="12" height="40" fill="#A0A7B4" stroke={INK} strokeWidth="3" />
      <rect x="44" y="36" width="12" height="32" fill="#A0A7B4" stroke={INK} strokeWidth="3" />
      <path d="M12 108V64l26 14V64l26 14V64l26 14V54h18v54z" fill="#E89B2C" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      {[24, 50, 76].map((x) => <rect key={x} x={x} y="88" width="14" height="10" rx="2" fill="#FFE27A" stroke={INK} strokeWidth="2" />)}
    </g>
  );
}

function House() {
  return (
    <g className="vp-bob">
      <path d="M18 60L60 24l42 36" fill="#F47C8A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <rect x="28" y="58" width="64" height="50" fill="#FFF7EC" stroke={INK} strokeWidth="3" />
      <rect x="52" y="80" width="18" height="28" rx="2" fill="#C97B4A" stroke={INK} strokeWidth="2.5" />
      <rect x="34" y="68" width="14" height="14" rx="2" fill="#BFE3F5" stroke={INK} strokeWidth="2.5" />
      <rect x="74" y="68" width="14" height="14" rx="2" fill="#BFE3F5" stroke={INK} strokeWidth="2.5" />
      <rect x="76" y="30" width="10" height="18" fill="#A0A7B4" stroke={INK} strokeWidth="2.5" />
    </g>
  );
}

function School() {
  return (
    <g>
      <rect x="14" y="54" width="92" height="54" fill="#FFF0D6" stroke={INK} strokeWidth="3" />
      <path d="M8 56L60 28l52 28z" fill="#E5484D" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="60" cy="44" r="7" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <rect x="50" y="80" width="20" height="28" fill="#C97B4A" stroke={INK} strokeWidth="2.5" />
      {[22, 82].map((x) => <rect key={x} x={x} y="66" width="16" height="16" rx="2" fill="#BFE3F5" stroke={INK} strokeWidth="2.5" />)}
      <g className="vp-wiggle" style={{ transformOrigin: "bottom left" }}>
        <path d="M60 28V8" stroke={INK} strokeWidth="2.5" />
        <path d="M60 8h18l-4 5 4 5H60z" fill="#5DBB63" stroke={INK} strokeWidth="2" />
      </g>
    </g>
  );
}

function Food() {
  return (
    <g>
      <ellipse cx="60" cy="86" rx="46" ry="16" fill="#fff" stroke={INK} strokeWidth="3" />
      <ellipse cx="60" cy="82" rx="34" ry="10" fill="#F4F1EA" />
      <g className="vp-bob">
        <path d="M38 78c0-16 10-26 22-26s22 10 22 26z" fill="#F2A93B" stroke={INK} strokeWidth="3" />
        <path d="M44 66h32" stroke="#C97B4A" strokeWidth="3" strokeLinecap="round" />
        <circle cx="76" cy="58" r="10" fill="#E5484D" stroke={INK} strokeWidth="2.5" />
        <path d="M76 48q2-6 7-6" stroke="#2F7D3A" strokeWidth="2.5" fill="none" />
      </g>
      {[0, 1, 2].map((i) => <path key={i} className="vp-bubble" style={{ animationDelay: `${i * 0.5}s` }} d={`M${48 + i * 12} 44q-4-6 0-12`} stroke="#C9CED6" strokeWidth="3" fill="none" strokeLinecap="round" />)}
    </g>
  );
}

function Chart({ down }) {
  const bars = down ? [70, 54, 40, 26] : [26, 40, 54, 70];
  return (
    <g>
      <path d="M14 108h94M14 108V16" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {bars.map((h, i) => (
        <rect key={i} className="vp-rise" style={{ animationDelay: `${i * 0.2}s` }} x={22 + i * 22} y={106 - h} width="16" height={h} rx="3"
          fill={down ? "#F47C8A" : "#5DBB63"} stroke={INK} strokeWidth="2.5" />
      ))}
      <path className="vp-grow" pathLength="100" d={down ? "M24 30L48 46l22-6 30 30" : "M24 86l24-16 22 6 30-50"} stroke={down ? "#E5484D" : "#2F80ED"} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}
const ChartUp = () => <Chart />;
const ChartDown = () => <Chart down />;

function Target() {
  return (
    <g>
      {[44, 32, 20, 9].map((r, i) => <circle key={r} cx="56" cy="62" r={r} fill={i % 2 ? "#fff" : "#E5484D"} stroke={INK} strokeWidth="2.5" />)}
      <g className="vp-wiggle">
        <path d="M58 60L104 18" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M98 14l10 0-2 12z" fill="#5B9DF5" stroke={INK} strokeWidth="2" />
      </g>
    </g>
  );
}

function Star() {
  return (
    <g>
      <g className="vp-beat"><path d="M60 14l13 28 30 3-23 20 7 30-27-16-27 16 7-30-23-20 30-3z" fill="#FFD84D" stroke="#C9921A" strokeWidth="3.5" strokeLinejoin="round" /></g>
      {[[18, 24], [100, 92], [104, 30]].map(([x, y], i) => <circle key={i} className="vp-spark" style={{ animationDelay: `${i * 0.4}s` }} cx={x} cy={y} r="4" fill="#FFD84D" />)}
    </g>
  );
}

function Scales() {
  return (
    <g>
      <path d="M60 22v80M38 108h44" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="20" r="5" fill="#FFC93C" stroke={INK} strokeWidth="2.5" />
      <g className="vp-wiggle" style={{ transformOrigin: "center" }}>
        <path d="M18 30h84" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M18 30l-12 30h24zM102 30l-12 30h24z" fill="none" stroke={INK} strokeWidth="2" />
        <path d="M4 60a14 6 0 0 0 28 0zM88 60a14 6 0 0 0 28 0z" fill="#FFC93C" stroke={INK} strokeWidth="2.5" />
      </g>
    </g>
  );
}

function Truck() {
  return (
    <g>
      <g className="vp-bob">
        <rect x="8" y="40" width="64" height="46" rx="4" fill="#5B9DF5" stroke={INK} strokeWidth="3" />
        <path d="M72 54h22l16 18v14H72z" fill="#FFC93C" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M78 58h14l10 12H78z" fill="#BFE3F5" stroke={INK} strokeWidth="2" />
      </g>
      {[28, 88].map((x) => <g key={x}><circle cx={x} cy="90" r="11" fill={INK} /><circle className="vp-spin" cx={x} cy="90" r="4" fill="#C9CED6" /></g>)}
      <path className="vp-field" d="M0 106h120" stroke="#A0A7B4" strokeWidth="3" strokeDasharray="12 10" />
    </g>
  );
}

function Phone() {
  return (
    <g>
      <rect x="36" y="10" width="48" height="96" rx="9" fill={INK} />
      <rect x="40" y="18" width="40" height="76" rx="4" fill="#EAF4FC" />
      <g className="vp-bob">
        <rect x="44" y="26" width="28" height="10" rx="5" fill="#5B9DF5" />
        <rect x="48" y="42" width="28" height="10" rx="5" fill="#5DBB63" />
        <path className="vp-beat" d="M60 78c-8-6-12-10-11-14 1-4 7-5 11 0 4-5 10-4 11 0 1 4-3 8-11 14z" fill="#F47C8A" />
      </g>
    </g>
  );
}

function Bank() {
  return (
    <g>
      <path d="M10 44L60 16l50 28z" fill="#C9CED6" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <rect x="14" y="44" width="92" height="8" fill="#E7EAEE" stroke={INK} strokeWidth="2.5" />
      {[22, 44, 66, 88].map((x) => <rect key={x} x={x} y="54" width="10" height="40" fill="#F4F1EA" stroke={INK} strokeWidth="2.5" />)}
      <rect x="10" y="94" width="100" height="12" fill="#E7EAEE" stroke={INK} strokeWidth="2.5" />
      <g className="vp-flip"><circle cx="60" cy="32" r="8" fill="#FFD84D" stroke="#C9921A" strokeWidth="2" /></g>
    </g>
  );
}

function Moneybag() {
  return (
    <g className="vp-wobble">
      <path d="M44 30c-26 16-34 40-28 58 4 14 18 20 44 20s40-6 44-20c6-18-2-42-28-58z" fill="#D9B26B" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M44 30l-6-14c8 4 14 4 22 0 8 4 14 4 22 0l-6 14z" fill="#C9A05A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M42 30h36" stroke="#8B5A33" strokeWidth="4" strokeLinecap="round" />
      <text x="60" y="84" textAnchor="middle" fontSize="34" fontWeight="900" fill="#7A5A1A">£</text>
    </g>
  );
}

function Megaphone() {
  return (
    <g>
      <path d="M22 52h14l46-26v68L36 68H22z" fill="#F47C8A" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M30 68l6 24h10l-4-24" fill="#E5E7EB" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => <path key={i} className="vp-spark" style={{ animationDelay: `${i * 0.3}s` }} d={`M${92 + i * 8} ${40 - i * 4}q8 20 0 40`} stroke="#F2A93B" strokeWidth="4" fill="none" strokeLinecap="round" />)}
    </g>
  );
}

function Shield() {
  return (
    <g className="vp-beat">
      <path d="M60 12l40 14v30c0 26-18 44-40 52-22-8-40-26-40-52V26z" fill="#5B9DF5" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M42 60l12 12 24-26" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Calendar() {
  return (
    <g>
      <rect x="14" y="22" width="92" height="84" rx="8" fill="#fff" stroke={INK} strokeWidth="3" />
      <path d="M14 30a8 8 0 0 1 8-8h76a8 8 0 0 1 8 8v12H14z" fill="#E5484D" stroke={INK} strokeWidth="3" />
      {[34, 86].map((x) => <rect key={x} x={x - 3} y="12" width="6" height="18" rx="3" fill={INK} />)}
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={26 + (i % 3) * 26} y={52 + Math.floor(i / 3) * 16} width="16" height="10" rx="2" fill="#E7EAEE" />)}
      <circle className="vp-spark" cx="60" cy="73" r="10" fill="none" stroke="#2E9E5B" strokeWidth="3.5" />
    </g>
  );
}

/* States of matter: the particles themselves, packed and moving the way
   each state really does, rather than a circle with a few dots in it. */
const PART = { fill: "#5B9DF5", stroke: INK, strokeWidth: 2 };

function Solid() {
  return (
    <g>
      <rect x="14" y="14" width="92" height="92" rx="8" fill="#EEF4FB" stroke="#8AA4C0" strokeWidth="3" />
      {Array.from({ length: 16 }, (_, i) => {
        const x = 30 + (i % 4) * 20, y = 30 + Math.floor(i / 4) * 20;
        return <circle key={i} className="vp-jit" style={{ animationDelay: `${(i % 5) * -0.13}s` }} cx={x} cy={y} r="9" {...PART} />;
      })}
    </g>
  );
}

function Liquid() {
  // Touching, in no pattern, filling the bottom of the container, sliding.
  const at = [[26, 98], [45, 99], [64, 98], [83, 99], [99, 96], [34, 81], [53, 82], [72, 80], [91, 80], [24, 64], [43, 65], [62, 63], [81, 64], [98, 63]];
  return (
    <g>
      <path d="M14 30 V108 a6 6 0 0 0 6 6 H100 a6 6 0 0 0 6 -6 V30" fill="#EEF4FB" stroke="#8AA4C0" strokeWidth="3" />
      <path d="M17 54 H103" stroke="#BFE3F5" strokeWidth="3" />
      {at.map(([x, y], i) => <circle key={i} className="vp-slip" style={{ animationDelay: `${i * -0.37}s` }} cx={x} cy={y} r="9" {...PART} />)}
    </g>
  );
}

function Gas() {
  // Few, far apart, flying in straight lines and bouncing off the walls.
  const paths = [
    "M24 30 L96 86 L40 96 L88 26 Z", "M90 40 L22 70 L70 96 L60 20 Z", "M50 24 L96 60 L26 92 L30 40 Z",
    "M30 88 L80 22 L96 70 L22 50 Z", "M70 60 L28 26 L60 96 L94 34 Z",
  ];
  return (
    <g>
      <rect x="10" y="10" width="100" height="100" rx="8" fill="#EEF4FB" stroke="#8AA4C0" strokeWidth="3" />
      {paths.map((d, i) => (
        <g key={i}>
          <circle r="8" {...PART}><animateMotion dur={`${1.6 + i * 0.35}s`} repeatCount="indefinite" path={d} /></circle>
        </g>
      ))}
    </g>
  );
}

export const PROPS = {
  sun: { draw: Sun, words: /\bsun|sunlight|light energy|solar|daylight/ },
  plant: { draw: Plant, words: /plant|photosynth|leaf|leaves|chlorophyll|chloroplast|flower|crop|seed|root|stomata|xylem|phloem/ },
  tree: { draw: Tree, words: /\btrees?\b|forest|wood/ },
  water: { draw: Water, words: /\bwater\b|h₂o|h2o|liquid|osmosis|droplet/ },
  cloud: { draw: Cloud, words: /cloud|rain|weather|evaporat|condens|water cycle/ },
  co2: { draw: CO2, words: /carbon dioxide|co₂|co2/ },
  o2: { draw: O2, words: /\boxygen\b|o₂\b|o2\b/ },
  glucose: { draw: Glucose, words: /glucose|sugar|starch|carbohydrate/ },
  cell: { draw: Cell, words: /\bcells?\b|nucleus|mitochondri|membrane|cytoplasm|organelle/ },
  atom: { draw: Atom, words: /\batoms?\b|electron|proton|neutron|nucle(us|i) of an atom|isotope/ },
  molecule: { draw: Molecule, words: /molecule|compound|bond|element/ },
  heart: { draw: Heart, words: /heart|blood|circulat|pulse|arter|vein/ },
  lungs: { draw: Lungs, words: /lungs?\b|breath|inhal|exhal|alveol/ },
  brain: { draw: Brain, words: /brain|nerve|neuron|memory|think/ },
  earth: { draw: Earth, words: /earth|planet|globe|climate|world|continent/ },
  magnet: { draw: Magnet, words: /magnet/ },
  battery: { draw: Battery, words: /battery|circuit|current|voltage|charge|cell potential/ },
  bulb: { draw: Bulb, words: /bulb|electric|idea|lamp/ },
  flask: { draw: Flask, words: /reaction|chemical|acid|alkali|solution|experiment|lab|enzyme/ },
  thermometer: { draw: Thermometer, words: /temperature|heat|hot\b|cold\b|thermal|degrees/ },
  dna: { draw: DNA, words: /\bdna\b|gene|chromosome|inherit|mutation/ },
  coin: { draw: Coin, words: /money|price|cost|econom|market|profit|tax|£|\$/ },
  gear: { draw: Gear, words: /machine|engine|mechanism|process|system|gear/ },
  clock: { draw: Clock, words: /\btime\b|rate|speed|hours?\b|minutes?\b|history|century/ },
  book: { draw: Book, words: /book|poem|novel|story|literature|author|text\b/ },
  fire: { draw: Fire, words: /fire|burn|combustion|flame/ },
  wave: { draw: Wave, words: /\bwaves?\b|sound|frequency|vibrat|signal/ },
  bacteria: { draw: Bacteria, words: /bacteri|virus|microbe|germ|disease|infection|pathogen/ },
  solid: { draw: Solid, words: /\bsolids?\b/, says: "packed, vibrating" },
  liquid: { draw: Liquid, words: /\bliquids?\b/, says: "touching, sliding" },
  gas: { draw: Gas, words: /\bgas(es)?\b|\bvapou?r\b/, says: "far apart, fast" },
  person: { draw: Person, words: /\bperson\b|someone|individual|owner|entrepreneur|manager|consumer|customer|citizen|leader|king|queen/ },
  people: { draw: People, words: /\bpeople\b|population|society|community|team|staff|employees|workforce|stakeholder|crowd|public/ },
  children: { draw: Children, words: /child|children|kids|pupils|students|families|family/ },
  worker: { draw: Worker, words: /worker|labour|labor|employee|\bjobs?\b|wage|salary|employ/ },
  handshake: { draw: Handshake, words: /loyal|trust|partner|deal|agree|relationship|reputation|cooperat|negotiat|merger|trade agreement/ },
  shop: { draw: Shop, words: /\bshops?\b|store|retail|business|firm|company|sell|seller|restaurant|cafe|brand/ },
  factory: { draw: Factory, words: /factory|production|produce|manufactur|industr|output|pollut/ },
  house: { draw: House, words: /house|home|household|housing|rent|living/ },
  school: { draw: School, words: /school|education|teacher|lesson|classroom|university/ },
  food: { draw: Food, words: /food|lunch|meal|\beat|diet|nutrition|hunger|farm/ },
  chartUp: { draw: ChartUp, words: /\bgrow|growth|increase|\brise|rising|sales|boost|\bgains?\b/ },
  chartDown: { draw: ChartDown, words: /\bfall|falling|decrease|decline|loss|drop|recession|\bcuts?\b/ },
  target: { draw: Target, words: /\baims?\b|goal|objective|target|purpose|mission/ },
  star: { draw: Star, words: /quality|best|success|reputation|famous|rating|review/ },
  scales: { draw: Scales, words: /balance|fair|law|justice|equal|weigh|compare|trade-off|court/ },
  truck: { draw: Truck, words: /transport|deliver|supply chain|shipping|distribut|export|import|travel/ },
  phone: { draw: Phone, words: /phone|social media|online|internet|app\b|digital|technology|advert/ },
  bank: { draw: Bank, words: /\bbank|loan|interest rate|finance|invest|government/ },
  moneybag: { draw: Moneybag, words: /revenue|income|savings|budget|capital|funds|wealth/ },
  megaphone: { draw: Megaphone, words: /marketing|advertis|promot|campaign|announce|protest|speech/ },
  shield: { draw: Shield, words: /protect|safety|security|insurance|defen|survival|risk/ },
  calendar: { draw: Calendar, words: /year|month|week|date|deadline|schedule|long-term|short-term/ },
};
export const PROP_KINDS = Object.keys(PROPS);
export const STATES = ["solid", "liquid", "gas"];

// For a scene that names none: the things it talks about, in the order it
// first mentions them, three at most.
export function propsFor(scene) {
  const text = [scene.heading, ...(scene.lines || [])].join(" ").toLowerCase();
  const found = [];
  for (const [kind, p] of Object.entries(PROPS)) {
    const m = text.search(p.words);
    if (m >= 0) found.push({ kind, at: m });
  }
  return found.sort((a, b) => a.at - b.at).slice(0, 3).map((f) => {
    const lineAt = Math.max(0, (scene.lines || []).findIndex((l) => PROPS[f.kind].words.test(l.toLowerCase())));
    return { kind: f.kind, label: "", at: lineAt };
  });
}

// Where n drawings sit on a 520 by 400 stage, and how big. Each leaves room
// under it for its name.
const SPOTS = {
  1: { size: 190, at: [[260, 175]] },
  2: { size: 150, at: [[130, 170], [390, 170]] },
  3: { size: 104, at: [[95, 90], [260, 260], [425, 90]] },
  4: { size: 100, at: [[110, 70], [410, 70], [110, 290], [410, 290]] },
};
const NAME_H = 30; // the name under each drawing

// The space a drawing takes, with its name, so nothing is put on top of it.
const nameOf = (p) => p.label || PROPS[p.kind]?.says || "";
const boxOf = (p) => {
  const half = Math.max(p.size, nameOf(p).length * 8.4 + 20) / 2;
  return [p.xy[0] - half, p.xy[1] - p.size / 2, p.xy[0] + half, p.xy[1] + p.size / 2 + NAME_H];
};
const overlap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

// Where a line leaving a box's centre in direction (ux, uy) crosses its edge.
function edge(box, cx, cy, ux, uy, gap) {
  const tx = ux > 0 ? (box[2] - cx) / ux : ux < 0 ? (box[0] - cx) / ux : Infinity;
  const ty = uy > 0 ? (box[3] - cy) / uy : uy < 0 ? (box[1] - cy) / uy : Infinity;
  const t = Math.min(tx, ty) + gap;
  return [cx + ux * t, cy + uy * t];
}

// Each arrow's curve and the spot for its label: the side it bends to and
// the point along it are picked so the label sits on nothing else.
function route(links, placed) {
  const boxes = placed.map(boxOf);
  const taken = [];
  return links.map((l) => {
    const from = placed[l.from], to = placed[l.to];
    const [x1, y1] = from.xy, [x2, y2] = to.xy;
    const len = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const [ax, ay] = edge(boxes[l.from], x1, y1, ux, uy, 6);
    const [bx, by] = edge(boxes[l.to], x2, y2, -ux, -uy, 10);
    const w = (l.label || "").length * 8.6 + 22, h = 28;
    let best = null;
    for (const side of [1, -1]) {
      const cx = (ax + bx) / 2 - uy * 36 * side, cy = (ay + by) / 2 + ux * 36 * side;
      for (const t of [0.5, 0.4, 0.6, 0.32, 0.68]) {
        const mx = (1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * bx;
        const my = (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t * t * by;
        const r = [mx - w / 2, my - h / 2, mx + w / 2, my + h / 2];
        const hit = [...boxes, ...taken].reduce((n, b) => n + overlap(r, b), 0) + (r[0] < 0 || r[2] > 520 || r[1] < 0 || r[3] > 400 ? 5000 : 0);
        if (!best || hit < best.hit) best = { hit, d: `M${ax} ${ay}Q${cx} ${cy} ${bx} ${by}`, mx, my, r, w };
        if (hit === 0) break;
      }
      if (best.hit === 0) break;
    }
    if (l.label) taken.push(best.r);
    return best;
  });
}

function Link({ id, path, label, fresh, color }) {
  const { d, mx, my, w } = path;
  return (
    <g className={"vp-link" + (fresh ? " fresh" : "")} style={{ "--c": color }}>
      {/* One arrowhead per colour: Safari cannot colour a shared one to match. */}
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={color} />
        </marker>
      </defs>
      <path d={d} className="vp-link-path" pathLength="100" markerEnd={`url(#${id})`} />
      <path d={d} className="vp-link-flow" />
      <circle r="5" className="vp-link-dot"><animateMotion dur="2.2s" repeatCount="indefinite" path={d} /></circle>
      {label && (
        <g className="vp-link-label">
          <rect x={mx - w / 2} y={my - 14} width={w} height="28" rx="14" />
          <text x={mx} y={my + 5} textAnchor="middle">{label}</text>
        </g>
      )}
    </g>
  );
}

const LINK_COLORS = ["#2F80ED", "#2E9E5B", "#E89B2C", "#8B5CF6", "#E5484D"];

export function PropStage({ props, links = [], line }) {
  const uid = "vp" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const placed = useMemo(() => {
    const list = props.slice(0, 4);
    const spot = SPOTS[list.length] || SPOTS[1];
    return list.map((p, i) => ({ ...p, xy: spot.at[i], size: spot.size }));
  }, [props]);
  const shown = links.filter((l) => placed[l.from] && placed[l.to]);
  const paths = useMemo(() => route(shown, placed), [shown.length, placed]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!placed.length) return null;
  return (
    <svg className="vp-stage" viewBox="0 0 520 400" role="img" aria-label={placed.map((p) => p.label || p.kind).join(", ")}>
      {placed.filter((p) => p.at <= line).map((p, i) => {
        const Draw = PROPS[p.kind]?.draw;
        if (!Draw) return null;
        const k = p.size / 120;
        return (
          <g key={i} transform={`translate(${p.xy[0] - p.size / 2} ${p.xy[1] - p.size / 2}) scale(${k})`}>
            <g className={"vp-prop" + (p.at === line ? " fresh" : "")}>
              <Draw />
            </g>
          </g>
        );
      })}
      {shown.map((l, i) => (l.at <= line && placed[l.from].at <= line && placed[l.to].at <= line
        ? <Link key={i} id={`${uid}-${i}`} path={paths[i]} label={l.label} fresh={l.at === line} color={LINK_COLORS[i % LINK_COLORS.length]} />
        : null))}
      {placed.filter((p) => p.at <= line).map((p, i) => {
        const name = nameOf(p);
        if (!name) return null;
        const w = name.length * 8.4 + 20;
        return (
          <g key={"n" + i} className="vp-name">
            <rect x={p.xy[0] - w / 2} y={p.xy[1] + p.size / 2 + 4} width={w} height="24" rx="12" />
            <text className="vp-label" x={p.xy[0]} y={p.xy[1] + p.size / 2 + 21} textAnchor="middle">{name}</text>
          </g>
        );
      })}
    </svg>
  );
}
