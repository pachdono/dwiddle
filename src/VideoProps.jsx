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
      {[[26, 22], [96, 26], [100, 86]].map(([x, y], i) => <path key={i} className="vp-spark" style={{ animationDelay: `${i * 0.4}s` }} d={`M${x} ${y}l4-8 4 8-8-4 8 0z`} fill="#FFC93C" />)}
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
};
export const PROP_KINDS = Object.keys(PROPS);

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

// Where n drawings sit on a 520 by 400 stage, and how big.
const SPOTS = {
  1: { size: 200, at: [[260, 190]] },
  2: { size: 160, at: [[140, 190], [380, 190]] },
  3: { size: 140, at: [[105, 120], [415, 120], [260, 285]] },
  4: { size: 128, at: [[120, 105], [400, 105], [120, 295], [400, 295]] },
};

function Link({ id, from, to, label, fresh, color }) {
  const [x1, y1] = from.xy, [x2, y2] = to.xy;
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const r1 = from.size * 0.45, r2 = to.size * 0.48;
  const ax = x1 + ux * r1, ay = y1 + uy * r1, bx = x2 - ux * r2, by = y2 - uy * r2;
  const cx = (ax + bx) / 2 - uy * 34, cy = (ay + by) / 2 + ux * 34;
  const d = `M${ax} ${ay}Q${cx} ${cy} ${bx} ${by}`;
  const mx = (ax + 2 * cx + bx) / 4, my = (ay + 2 * cy + by) / 4;
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
          <rect x={mx - label.length * 4.4 - 8} y={my - 13} width={label.length * 8.8 + 16} height="26" rx="13" />
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
  if (!placed.length) return null;
  return (
    <svg className="vp-stage" viewBox="0 0 520 400" role="img" aria-label={placed.map((p) => p.label || p.kind).join(", ")}>
      {links.filter((l) => l.at <= line && placed[l.from] && placed[l.to] && placed[l.from].at <= line && placed[l.to].at <= line).map((l, i) => (
        <Link key={i} id={`${uid}-${i}`} from={placed[l.from]} to={placed[l.to]} label={l.label} fresh={l.at === line} color={LINK_COLORS[i % LINK_COLORS.length]} />
      ))}
      {placed.filter((p) => p.at <= line).map((p, i) => {
        const Draw = PROPS[p.kind]?.draw;
        if (!Draw) return null;
        const k = p.size / 120;
        return (
          <g key={i} transform={`translate(${p.xy[0] - p.size / 2} ${p.xy[1] - p.size / 2}) scale(${k})`}>
            <g className={"vp-prop" + (p.at === line ? " fresh" : "")}>
              <Draw />
            </g>
            {p.label && <text className="vp-label" x="60" y="134" textAnchor="middle">{p.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}
