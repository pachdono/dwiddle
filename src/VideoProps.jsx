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

// A dot travelling a path over and over. Done with CSS motion paths rather
// than SVG animation, so that saving a video can move it to any moment.
export const mover = (d, dur, delay = 0, rotate = false) => ({ offsetPath: `path("${d}")`, animationDuration: `${dur}s`, animationDelay: `${delay}s`, offsetRotate: rotate ? "auto" : "0deg" });

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
          <circle r="5" fill="#2F80ED" className="vp-mover" style={mover("M106 60a46 16 0 1 1-92 0a46 16 0 1 1 92 0", 2 + r / 120)} />
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
          <circle r="8" {...PART} className="vp-mover" style={mover(d, 1.6 + i * 0.35)} />
        </g>
      ))}
    </g>
  );
}

/* Substances and diffusion: a drop, a crystal, a beaker of particles, and the
   way a dye spreads from where it is crowded to where it is not. */
function Droplet({ oil }) {
  const fill = oil ? "#F2B93B" : "#4FA3F7";
  return (
    <g>
      <path d="M60 12 C60 12 24 56 24 78 a36 36 0 0 0 72 0 C96 56 60 12 60 12 Z" fill={fill} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M42 80 a18 18 0 0 0 12 16" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.7" />
    </g>
  );
}
const OilDroplet = () => <Droplet oil />;

function Cube() {
  return (
    <g strokeLinejoin="round" stroke={INK} strokeWidth="3.5">
      <path d="M60 18 L100 38 L60 58 L20 38 Z" fill="#FFFFFF" />
      <path d="M20 38 L60 58 L60 104 L20 84 Z" fill="#E4E8EE" />
      <path d="M100 38 L60 58 L60 104 L100 84 Z" fill="#CBD2DC" />
    </g>
  );
}

function Beaker() {
  const dots = [[40, 80], [58, 90], [76, 78], [88, 92], [48, 64], [70, 66], [92, 70], [60, 100], [84, 60]];
  return (
    <g>
      <path d="M26 12 V98 a8 8 0 0 0 8 8 H86 a8 8 0 0 0 8 -8 V12" fill="none" stroke="#8AA4C0" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 52 H92 V98 a6 6 0 0 1 -6 6 H34 a6 6 0 0 1 -6 -6 Z" fill="#BFE3F5" opacity="0.8" />
      {dots.map(([x, y], i) => <circle key={i} className="vp-jit" style={{ animationDelay: `${i * -0.21}s` }} cx={x} cy={y} r="5" fill="#2F80ED" stroke={INK} strokeWidth="1.6" />)}
    </g>
  );
}

// Dye particles bunched at the left, then spreading until the beaker is the
// same all through, over and over: from high concentration to low.
function Diffusion() {
  const end = [[40, 70], [60, 64], [80, 72], [96, 66], [48, 86], [68, 90], [88, 88], [38, 94], [58, 76], [78, 60], [98, 84], [50, 58]];
  const start = [[36, 66], [42, 74], [36, 82], [44, 90], [34, 98], [46, 62], [40, 86], [48, 80], [34, 72], [44, 96], [38, 58], [50, 70]];
  return (
    <g>
      <path d="M22 12 V98 a8 8 0 0 0 8 8 H90 a8 8 0 0 0 8 -8 V12" fill="none" stroke="#8AA4C0" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 46 H96 V98 a6 6 0 0 1 -6 6 H30 a6 6 0 0 1 -6 -6 Z" fill="#DDEFFA" />
      {end.map(([x, y], i) => (
        <circle key={i} r="5" fill="#E5484D" stroke={INK} strokeWidth="1.6" cx={start[i][0]} cy={start[i][1]} className="vp-spread"
          style={{ "--dx": `${x - start[i][0]}px`, "--dy": `${y - start[i][1]}px`, animationDelay: `${i * -0.05}s` }} />
      ))}
    </g>
  );
}

/* More things to draw, for every subject: places and history, writing and
   speaking, forces and machines, shopping and business, and a few for maths. */
const stroke = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: "round", strokeLinecap: "round" };
function Mountain() {
  return (
    <g {...stroke}>
      <path d="M8 98 L46 30 L66 62 L82 38 L112 98 Z" fill="#8EA3B8" />
      <path d="M46 30 L36 48 L46 44 L54 50 Z" fill="#fff" />
      <path d="M82 38 L74 52 L82 49 L90 54 Z" fill="#fff" />
    </g>
  );
}
function Volcano() {
  return (
    <g {...stroke}>
      <circle className="vp-drift" cx="52" cy="22" r="9" fill="#C9CED6" /><circle className="vp-drift" cx="68" cy="14" r="7" fill="#D6DAE0" />
      <path d="M10 100 L44 38 H76 L110 100 Z" fill="#9A6B4A" />
      <path d="M44 38 L52 48 L60 40 L68 49 L76 38 Z" fill="#E5484D" />
    </g>
  );
}
function Pin() {
  return (
    <g {...stroke}>
      <ellipse cx="60" cy="104" rx="26" ry="7" fill="rgba(0,0,0,0.12)" stroke="none" />
      <path d="M60 98 C60 98 28 66 28 44 a32 32 0 0 1 64 0 C92 66 60 98 60 98 Z" fill="#E5484D" />
      <circle cx="60" cy="44" r="12" fill="#fff" />
    </g>
  );
}
function Castle() {
  return (
    <g {...stroke}>
      <path d="M16 100 V44 h14 v-8 h8 v8 h8 v-8 h8 v8 h12 v-8 h8 v8 h8 v-8 h8 v8 h12 V100 Z" fill="#C9B79C" />
      <path d="M50 100 V72 a10 10 0 0 1 20 0 V100 Z" fill="#6B4A2F" />
      <path d="M16 44 V28 M104 44 V28" /><path d="M16 28 l8 -8 l8 8 Z M96 28 l8 -8 l8 8 Z" fill="#E5484D" />
    </g>
  );
}
function Scroll() {
  return (
    <g {...stroke}>
      <path d="M26 24 H92 V92 H26 Z" fill="#F3E3B8" />
      <ellipse cx="26" cy="24" rx="9" ry="9" fill="#E5D1A0" /><ellipse cx="92" cy="92" rx="9" ry="9" fill="#E5D1A0" />
      <path d="M40 42 H80 M40 56 H80 M40 70 H66" />
    </g>
  );
}
function Crown() {
  return (
    <g {...stroke}>
      <path d="M18 88 L12 40 L40 62 L60 28 L80 62 L108 40 L102 88 Z" fill="#F5C842" />
      <path d="M18 88 H102 V98 H18 Z" fill="#E0A82E" />
      <circle cx="12" cy="38" r="5" fill="#E5484D" /><circle cx="60" cy="26" r="5" fill="#2F80ED" /><circle cx="108" cy="38" r="5" fill="#2E9E5B" />
    </g>
  );
}
function Ship() {
  return (
    <g {...stroke}>
      <path d="M60 14 V76" /><path d="M60 18 L100 70 H60 Z" fill="#fff" /><path d="M56 26 L26 70 H56 Z" fill="#F3E3B8" />
      <path d="M14 78 H106 L92 100 H28 Z" fill="#9A6B4A" />
      <path className="vp-ripple" d="M8 106 q8 -6 16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#5B9DF5" />
    </g>
  );
}
function Quill() {
  return (
    <g {...stroke}>
      <path d="M100 16 C60 20 34 46 26 90 C52 84 84 64 100 16 Z" fill="#F4F0E6" />
      <path d="M26 90 L18 108" /><path d="M96 24 C70 40 50 62 34 84" fill="none" strokeWidth="2.5" />
    </g>
  );
}
function Speech() {
  return (
    <g {...stroke}>
      <path d="M16 20 H104 a8 8 0 0 1 8 8 V70 a8 8 0 0 1 -8 8 H62 L38 100 V78 H16 a8 8 0 0 1 -8 -8 V28 a8 8 0 0 1 8 -8 Z" fill="#EAF2FE" />
      <circle cx="38" cy="49" r="4.5" fill={INK} /><circle cx="60" cy="49" r="4.5" fill={INK} /><circle cx="82" cy="49" r="4.5" fill={INK} />
    </g>
  );
}
function Quotes() {
  return (
    <g fill="#2F80ED" stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <path d="M18 78 C18 54 28 40 46 36 L48 46 C38 50 34 58 36 64 H46 V90 H18 Z" />
      <path d="M66 78 C66 54 76 40 94 36 L96 46 C86 50 82 58 84 64 H94 V90 H66 Z" />
    </g>
  );
}
function Lightning() {
  return <path d="M70 8 L26 66 H54 L44 112 L94 48 H64 Z" fill="#F5C842" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" className="vp-glow" />;
}
function Spring() {
  return (
    <g {...stroke} fill="none">
      <path d="M16 60 H34 L40 34 L52 86 L64 34 L76 86 L88 34 L94 60 H108" />
      <rect x="6" y="40" width="8" height="40" fill="#8EA3B8" /><rect x="106" y="44" width="10" height="32" fill="#8EA3B8" />
    </g>
  );
}
function Car() {
  return (
    <g {...stroke}>
      <path d="M10 76 V62 L28 58 L42 38 H78 L94 58 L110 62 V76 Z" fill="#E5484D" />
      <path d="M46 44 H62 V58 H36 Z M66 44 H76 L88 58 H66 Z" fill="#DCEBFA" />
      <circle cx="34" cy="78" r="11" fill="#2B2F3A" /><circle cx="88" cy="78" r="11" fill="#2B2F3A" />
    </g>
  );
}
function Tag() {
  return (
    <g {...stroke}>
      <path d="M12 56 L56 12 H100 V56 L56 100 Z" fill="#F5C842" transform="rotate(0)" />
      <circle cx="82" cy="30" r="6" fill="#fff" />
      <text x="50" y="68" textAnchor="middle" fontSize="30" fontWeight="800" fill={INK} stroke="none" fontFamily="system-ui, sans-serif" transform="rotate(-45 50 62)">£</text>
    </g>
  );
}
function Cart() {
  return (
    <g {...stroke}>
      <path d="M10 18 H26 L38 70 H94 L104 34 H32" fill="#EAF2FE" />
      <circle cx="46" cy="90" r="7" fill="#2B2F3A" /><circle cx="86" cy="90" r="7" fill="#2B2F3A" />
    </g>
  );
}
function Document() {
  return (
    <g {...stroke}>
      <path d="M26 10 H72 L94 32 V108 H26 Z" fill="#fff" /><path d="M72 10 V32 H94" fill="#E4E8EE" />
      <path d="M38 52 H82 M38 66 H82 M38 80 H82 M38 94 H64" />
    </g>
  );
}
function Laptop() {
  return (
    <g {...stroke}>
      <rect x="24" y="20" width="72" height="52" rx="5" fill="#2B2F3A" /><rect x="30" y="26" width="60" height="40" rx="2" fill="#BFE3F5" />
      <path d="M10 80 H110 L102 94 H18 Z" fill="#C9CED6" />
    </g>
  );
}
function Eye() {
  return (
    <g {...stroke}>
      <path d="M8 60 C28 28 92 28 112 60 C92 92 28 92 8 60 Z" fill="#fff" />
      <circle cx="60" cy="60" r="19" fill="#5B9DF5" /><circle cx="60" cy="60" r="8" fill={INK} /><circle cx="54" cy="53" r="4" fill="#fff" stroke="none" />
    </g>
  );
}
function Bone() {
  return (
    <g {...stroke} fill="#F4F0E6">
      <path d="M30 40 a12 12 0 1 1 10 -14 L84 70 a12 12 0 1 1 14 10 a12 12 0 1 1 -10 14 L44 50 a12 12 0 1 1 -14 -10 Z" />
    </g>
  );
}
function Magnifier() {
  return (
    <g {...stroke}>
      <circle cx="50" cy="50" r="30" fill="#EAF2FE" /><path d="M72 72 L104 104" strokeWidth="9" />
      <path d="M34 42 a18 18 0 0 1 14 -10" fill="none" stroke="#fff" strokeWidth="5" />
    </g>
  );
}
function Lock() {
  return (
    <g {...stroke}>
      <path d="M38 52 V38 a22 22 0 0 1 44 0 V52" fill="none" strokeWidth="7" />
      <rect x="24" y="52" width="72" height="52" rx="8" fill="#F5C842" /><circle cx="60" cy="74" r="7" fill={INK} /><path d="M60 78 V90" />
    </g>
  );
}
function Triangle() {
  return (
    <g {...stroke}>
      <path d="M16 100 V22 L104 100 Z" fill="#EAF2FE" />
      <path d="M16 84 H32 V100" fill="none" strokeWidth="3" />
      <path d="M86 82 a22 22 0 0 0 -4 -14" fill="none" stroke="#E5484D" />
    </g>
  );
}
function Compass() {
  return (
    <g {...stroke}>
      <circle cx="60" cy="60" r="44" fill="#fff" />
      <path d="M60 22 L70 60 L60 98 L50 60 Z" fill="#E5484D" /><path d="M60 98 L50 60 L70 60 Z" fill="#8EA3B8" />
      <circle cx="60" cy="60" r="5" fill={INK} />
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
  droplet: { draw: Droplet, words: /droplet|water drop|raindrop/ },
  oildroplet: { draw: OilDroplet, words: /oil droplet|fat droplet|lipid droplet/ },
  cube: { draw: Cube, words: /salt crystal|sugar cube|sugar crystal|\bcubes?\b|crystal lattice/ },
  beaker: { draw: Beaker, words: /beaker/ },
  diffusion: { draw: Diffusion, words: /diffus|concentration gradient|\bdye\b|perfume|high to low concentration/, says: "high to low concentration" },
  mountain: { draw: Mountain, words: /mountain|peak|range|altitude|tectonic|fold|alps|himalaya/ },
  volcano: { draw: Volcano, words: /volcan|eruption|lava|magma|crater/ },
  pin: { draw: Pin, words: /location|\bmap\b|\bplace\b|site|region|settlement|capital city|where/ },
  castle: { draw: Castle, words: /castle|medieval|fort|feudal|norman|siege|kingdom|empire/ },
  scroll: { draw: Scroll, words: /scroll|ancient|manuscript|charter|source|record|decree|treaty|parchment/ },
  crown: { draw: Crown, words: /\bking|queen|monarch|crown|royal|dynasty|reign|throne|emperor/ },
  ship: { draw: Ship, words: /\bships?\b|voyage|navy|naval|boat|sail|colonial|armada|explor/ },
  quill: { draw: Quill, words: /quill|\bwrit(er|ing|e)\b|author|poet|poem|essay|narrat|pen\b|draft/ },
  speech: { draw: Speech, words: /speech|dialogue|speak|narrator|voice|conversation|argument|persuas|rhetoric|say\b|said/ },
  quotes: { draw: Quotes, words: /quotation|quote|evidence|cite|extract|\bphrase/ },
  lightning: { draw: Lightning, words: /lightning|static|thunder|energy transfer|\bpower\b|storm/ },
  spring: { draw: Spring, words: /spring|elastic|hooke|extension|compress|stretch/ },
  car: { draw: Car, words: /\bcars?\b|vehicle|motion|journey|velocity|accelerat|braking|collision/ },
  tag: { draw: Tag, words: /price tag|\bprice|discount|\bsale\b|cheap|expensive|\bcost per|tariff/ },
  cart: { draw: Cart, words: /basket|shopping|\bbuy|purchase|consumer spending|trolley/ },
  document: { draw: Document, words: /document|contract|report|\blaw\b|policy|legal|invoice|statement|form\b|accounts/ },
  laptop: { draw: Laptop, words: /laptop|computer|software|website|e-commerce|\bcode\b|program/ },
  eye: { draw: Eye, words: /\beyes?\b|vision|sight|retina|observe|visual/ },
  bone: { draw: Bone, words: /\bbones?\b|skeleton|joint|skeletal|fracture/ },
  magnifier: { draw: Magnifier, words: /analys|investigat|inspect|closer look|zoom|examin|research|detail/ },
  lock: { draw: Lock, words: /\block|secure|password|encrypt|private|confiden/ },
  triangle: { draw: Triangle, words: /triangle|pythag|trigonometr|hypotenuse|\bsine|cosine|tangent ratio|right.angle/ },
  compass: { draw: Compass, words: /compass|direction|navigat|bearing|north|orient/ },
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

// A drawing has to look like what it is called. The model sometimes reached
// for the nearest one it had (a pot plant for "oil droplet" or "salt shaker",
// a person for "protein"). Where the name is plainly something we can draw,
// that drawing is used; where the name does not fit the drawing at all and
// nothing else does, the drawing is dropped (null) rather than left lying.
const STRICT = new Set(["plant", "tree", "person", "people", "children", "worker", "house", "school", "food", "heart", "lungs", "brain", "bacteria", "dna", "fire", "cloud", "sun", "shop", "factory", "book", "star", "cell"]);
const NAMES = [
  [/\boil\b|\bfat\b|lipid/, "oildroplet"], [/\bwater\b|droplet|\bdrops?\b|\brain/, "droplet"], [/\bsalt|sugar|cube|crystal/, "cube"],
  [/protein|amino|fatty|glycerol|enzyme|molecule|\bions?\b|mineral|starch|compound/, "molecule"],
  [/mountain|peak/, "mountain"], [/volcan|lava|magma/, "volcano"], [/\bmap\b|location|\bpin\b/, "pin"], [/castle|fort\b/, "castle"],
  [/scroll|charter|treaty|manuscript/, "scroll"], [/\bcrown|\bking|\bqueen|monarch/, "crown"], [/\bship|\bboat|\bnavy/, "ship"],
  [/quill|\bpoet|\bauthor|writer/, "quill"], [/speech|dialogue|narrator|conversation/, "speech"], [/quotation|\bquote/, "quotes"],
  [/lightning|\bbolt/, "lightning"], [/\bspring/, "spring"], [/\bcar\b|vehicle/, "car"], [/price tag|\bprice|discount/, "tag"],
  [/basket|shopping|trolley/, "cart"], [/document|contract|report|invoice/, "document"], [/laptop|computer/, "laptop"], [/\beye\b|\bsight/, "eye"],
  [/\bbone|skeleton/, "bone"], [/magnif|analys|investigat/, "magnifier"], [/\block\b|padlock|secure/, "lock"], [/triangle|hypotenuse|pythag/, "triangle"],
  [/compass|bearing/, "compass"],
];
// Returns the drawing to use for p, or null to leave it out.
export function fitProp(p) {
  if (!p || !PROPS[p.kind]) return p;
  const label = String(p.label || "").toLowerCase().trim();
  if (!label || PROPS[p.kind].words.test(label)) return p;
  const named = NAMES.find(([re, kind]) => re.test(label) && PROPS[kind]);
  if (named && named[1] !== p.kind) return { ...p, kind: named[1] };
  return STRICT.has(p.kind) ? null : p;
}

// Each arrow's curve and the spot for its label. Arrows that meet at the same
// drawing are spread apart so they do not run on top of each other, and each
// label sits beside its arrow, never over any arrow, drawing or other label.
function route(links, placed) {
  const boxes = placed.map(boxOf);
  const meets = new Map();
  links.forEach((l, i) => { for (const k of [l.from, l.to]) meets.set(k, [...(meets.get(k) || []), i]); });
  const spread = (k, i) => { const list = meets.get(k); return (list.indexOf(i) - (list.length - 1) / 2) * 34; };

  // First every arrow's straight run, so labels can keep clear of all of them.
  const runs = links.map((l, i) => {
    const from = placed[l.from], to = placed[l.to];
    const len = Math.hypot(to.xy[0] - from.xy[0], to.xy[1] - from.xy[1]) || 1;
    const ux = (to.xy[0] - from.xy[0]) / len, uy = (to.xy[1] - from.xy[1]) / len, nx = -uy, ny = ux;
    const sf = spread(l.from, i), st = spread(l.to, i);
    const [ax, ay] = edge(boxes[l.from], from.xy[0] + nx * sf, from.xy[1] + ny * sf, ux, uy, 6);
    const [bx, by] = edge(boxes[l.to], to.xy[0] + nx * st, to.xy[1] + ny * st, -ux, -uy, 10);
    return { ax, ay, bx, by, ux, uy, nx, ny };
  });
  const points = (r) => Array.from({ length: 14 }, (_, k) => [r.ax + ((r.bx - r.ax) * k) / 13, r.ay + ((r.by - r.ay) * k) / 13]);
  const inside = (r, x, y) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];

  const taken = [];
  return links.map((l, i) => {
    const r0 = runs[i];
    const w = (l.label || "").length * 8.6 + 22, h = 28;
    let best = null;
    if (l.label) {
      for (const off of [h / 2 + 10, -(h / 2 + 10), h / 2 + 34, -(h / 2 + 34), h / 2 + 58, -(h / 2 + 58), 0]) {
        for (const t of [0.5, 0.36, 0.64, 0.24, 0.76]) {
          const mx = r0.ax + (r0.bx - r0.ax) * t + r0.nx * off, my = r0.ay + (r0.by - r0.ay) * t + r0.ny * off;
          const rect = [mx - w / 2, my - h / 2, mx + w / 2, my + h / 2];
          let cost = [...boxes, ...taken].reduce((n, b) => n + overlap(rect, b), 0);
          for (const r of runs) cost += points(r).filter(([x, y]) => inside(rect, x, y)).length * 400;
          cost += rect[0] < 4 || rect[2] > 516 || rect[1] < 4 || rect[3] > 396 ? 5000 : 0;
          cost += Math.abs(off) * 0.4 + Math.abs(t - 0.5) * 30;
          if (!best || cost < best.cost) best = { cost, mx, my, rect, off };
        }
        if (best && best.cost < 20) break;
      }
      taken.push(best.rect);
    }
    // A gentle curve, bent away from the side the label sits on.
    const bend = best && best.off ? -Math.sign(best.off) * 16 : 14;
    const cx = (r0.ax + r0.bx) / 2 + r0.nx * bend, cy = (r0.ay + r0.by) / 2 + r0.ny * bend;
    return { d: `M${r0.ax} ${r0.ay}Q${cx} ${cy} ${r0.bx} ${r0.by}`, mx: best?.mx ?? cx, my: best?.my ?? cy, w };
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
      <g className="vp-link-dotwrap"><circle r="5" className="vp-link-dot vp-mover" style={mover(d, 2.2)} /></g>
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
