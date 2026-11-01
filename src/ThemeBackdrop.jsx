import { useEffect } from "react";
// A painted scene behind the whole app, one for each theme, so a theme is a
// place rather than a gradient: a cherry tree and Mount Fuji for Sakura, a
// lighthouse over the sea for Ocean, a moonlit lake and a cabin in the pines
// for Midnight. Each is drawn in layers, far to near, each layer a little
// deeper in colour, like a picture-book landscape, with a little grain so
// nothing looks flat, and slow movement: a tree swaying, smoke rising, a boat
// bobbing, stars twinkling, never fast enough to pull the eye from the work.
//
// Flat colour, not glow: only the moon and a setting sun give off light.
//
// The scene fills the page and the panels over it are frosted glass, so it
// shows through without getting in the way of the words. It never catches a
// tap, and stands still for anyone who has asked their device for less motion.

const rnd = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const W = 1440, H = 900;

/* ---------- pieces ---------- */

// Fine paper grain over the whole page, the difference between printed and flat.
// Paper grain: a small tile of noise made once and repeated, rather than a
// noise filter over the whole screen, which the browser redrew constantly.
let grainTile = null;
function grain() {
  if (grainTile !== null) return grainTile;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const g = c.getContext("2d");
    const img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 60;
    }
    g.putImageData(img, 0, 0);
    grainTile = c.toDataURL("image/png");
  } catch { grainTile = ""; }
  return grainTile;
}
function Grain({ opacity = 0.05 }) {
  const tile = grain();
  if (!tile) return null;
  return <div className="tb-grain" aria-hidden="true" style={{ opacity: opacity * 2.2, backgroundImage: `url(${tile})` }} />;
}

// Stars that twinkle, each at its own pace.
function Stars({ n = 70, color = "#FFF6D8", seed = 3, top = 60 }) {
  return (
    <div className="tb-stars">
      {Array.from({ length: n }, (_, i) => {
        const s = 1 + rnd(seed + i) * 2.2;
        return <i key={i} style={{ left: `${rnd(seed + i * 13) * 100}%`, top: `${rnd(seed + i * 17) * top}%`, width: s, height: s, background: color,
          animationDelay: `-${rnd(seed + i * 19) * 6}s`, animationDuration: `${2.5 + rnd(seed + i * 23) * 4}s` }} />;
      })}
    </div>
  );
}

// Things falling across the whole page: petals or leaves.
function Fall({ kind, n = 9 }) {
  return (
    <div className={"tb-fall " + kind}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ left: `${rnd(i + 40) * 100}%`, animationDelay: `-${rnd(i + 80) * 30}s`, animationDuration: `${22 + rnd(i + 120) * 18}s` }}>
          <i style={{ transform: `scale(${(0.6 + rnd(i) * 0.8).toFixed(2)})`, animationDuration: `${3 + rnd(i + 160) * 3}s` }} />
        </span>
      ))}
    </div>
  );
}

// Bubbles rising from the bottom.
function Bubbles({ n = 14, color }) {
  return (
    <div className="tb-bubbles">
      {Array.from({ length: n }, (_, i) => {
        const s = 4 + rnd(i + 7) * 12;
        return <i key={i} style={{ left: `${rnd(i + 3) * 100}%`, width: s, height: s, borderColor: color,
          animationDelay: `-${rnd(i + 11) * 20}s`, animationDuration: `${12 + rnd(i + 19) * 14}s` }} />;
      })}
    </div>
  );
}

// A smooth ridge of hills across the scene, filled down to the bottom.
function ridge(base, amp, seed, step = 180) {
  const pts = [];
  for (let x = -step; x <= W + step * 2; x += step) pts.push([x, base - rnd(seed * 31 + x * 0.013) * amp]);
  let d = `M${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0]} ${pts[i][1].toFixed(1)} ${mx} ${my.toFixed(1)}`;
  }
  return d + ` L${W + step * 2} ${H} L${-step} ${H}Z`;
}

// Mountains: each peak lit on one side, shaded on the other, snow on top.
function Mountains({ peaks, base, fill, shade, snow }) {
  return (
    <g>
      {peaks.map(([x, h, w], i) => {
        const top = base - h, t = 0.26;
        const cap = [[x - w * t, top + h * t], [x - w * t * 0.45, top + h * t * 0.72], [x - w * t * 0.1, top + h * t * 1.08], [x + w * t * 0.35, top + h * t * 0.78], [x + w * t, top + h * t]];
        return (
          <g key={i}>
            <path d={`M${x - w} ${base} L${x} ${top} L${x + w} ${base}Z`} fill={fill} />
            <path d={`M${x} ${top} L${x + w} ${base} L${x + w * 0.15} ${base}Z`} fill={shade} />
            {snow && <path d={`M${x} ${top} ${cap.map(([a, b]) => `L${a.toFixed(0)} ${b.toFixed(0)}`).join(" ")}Z`} fill={snow} />}
          </g>
        );
      })}
      <rect x="-200" y={base - 1} width={W + 400} height={H - base + 1} fill={fill} />
    </g>
  );
}

// A row of pine trees along a line, varied in height.
const pine = (x, y, h) => {
  const w = h * 0.34;
  const p = [[0, -h], [0.5, -0.6], [0.28, -0.6], [0.78, -0.24], [0.4, -0.24], [1, 0]];
  const right = p.slice(1).map(([a, b]) => `L${(x + w * a).toFixed(1)} ${(y + h * b).toFixed(1)}`).join(" ");
  const left = p.slice(1).reverse().map(([a, b]) => `L${(x - w * a).toFixed(1)} ${(y + h * b).toFixed(1)}`).join(" ");
  return `M${x.toFixed(1)} ${(y - h).toFixed(1)} ${right} ${left}Z`;
};
function Pines({ y, n, min, max, seed, fill, from = -20, to = W + 20 }) {
  const d = Array.from({ length: n }, (_, i) => {
    const x = from + (i + rnd(seed + i) * 0.8) * ((to - from) / n);
    return pine(x, y + rnd(seed + i * 5) * 14, min + rnd(seed + i * 3) * (max - min));
  }).join(" ");
  return <path d={d} fill={fill} />;
}

// A round leafy tree, two tones so it has a lit side.
function RoundTree({ x, y, s, leaf, lit, trunk }) {
  return (
    <g>
      <path d={`M${x - s * 0.07} ${y} L${x - s * 0.04} ${y - s * 0.9} L${x + s * 0.04} ${y - s * 0.9} L${x + s * 0.07} ${y}Z`} fill={trunk} />
      <circle cx={x - s * 0.34} cy={y - s * 0.95} r={s * 0.4} fill={leaf} />
      <circle cx={x + s * 0.36} cy={y - s * 0.98} r={s * 0.42} fill={leaf} />
      <circle cx={x} cy={y - s * 1.25} r={s * 0.55} fill={leaf} />
      <circle cx={x - s * 0.14} cy={y - s * 1.42} r={s * 0.3} fill={lit} />
      <circle cx={x - s * 0.42} cy={y - s * 1.08} r={s * 0.2} fill={lit} />
    </g>
  );
}

// A cloud made of overlapping puffs, drifting slowly across.
function Cloud({ x, y, s, fill, dur, delay }) {
  return (
    <g className="tb-drift-x" style={{ animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}>
      <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
        <ellipse cx="0" cy="0" rx="90" ry="24" />
        <circle cx="-34" cy="-14" r="30" /><circle cx="14" cy="-26" r="40" /><circle cx="54" cy="-8" r="26" />
      </g>
    </g>
  );
}

// Birds flying across, wings beating.
function Birds({ fill, y = 200, n = 5, seed = 1, dur = 60 }) {
  return (
    <g className="tb-drift-x" style={{ animationDuration: `${dur}s`, animationDelay: `-${rnd(seed) * dur}s` }}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${200 + i * 40 + rnd(seed + i) * 30} ${y + rnd(seed + i * 3) * 60 - i * 6})`}>
          <path className="tb-flap" style={{ animationDelay: `-${rnd(seed + i * 7)}s` }} d="M-12 0 Q-6 -8 0 0 Q6 -8 12 0" stroke={fill} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

// The soft halo round the moon or a setting sun. Nothing else glows.
function Halo({ x, y, r, color, id, strength = 0.35 }) {
  return (
    <>
      <defs><radialGradient id={id}><stop offset="0" stopColor={color} stopOpacity={strength} /><stop offset="1" stopColor={color} stopOpacity="0" /></radialGradient></defs>
      <circle className="tb-breathe" cx={x} cy={y} r={r} fill={`url(#${id})`} />
    </>
  );
}

/* ---------- theme pieces ---------- */

function BlossomTree({ x, y, s, trunk, bloom, seed }) {
  return (
    <g>
      <path d={`M${x} ${y} C${x - 3} ${y - s * 0.4} ${x + 5} ${y - s * 0.6} ${x} ${y - s * 0.85}`} stroke={trunk} strokeWidth={s * 0.09} fill="none" strokeLinecap="round" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = rnd(seed + i) * Math.PI * 2, r = s * 0.32 * rnd(seed + i * 3);
        return <circle key={i} cx={x + Math.cos(a) * r * 1.4} cy={y - s * 0.95 + Math.sin(a) * r * 0.8} r={s * (0.2 + rnd(seed + i * 5) * 0.12)} fill={bloom[i % bloom.length]} />;
      })}
    </g>
  );
}

// The big cherry tree in the corner: a gnarled trunk, branches and heavy clouds of blossom.
function CherryTree({ trunk, bloom }) {
  const clusters = [[1060, 470, 90], [1190, 380, 110], [1350, 420, 110], [1280, 300, 90], [1440, 330, 80], [1130, 560, 60]];
  return (
    <g className="tb-sway">
      <path d="M1330 900 C1320 800 1300 700 1260 620 C1230 560 1220 500 1200 440" stroke={trunk} strokeWidth="44" fill="none" strokeLinecap="round" />
      <path d="M1250 600 C1190 560 1120 520 1060 480 M1215 480 C1250 420 1270 360 1280 310 M1255 560 C1300 500 1340 460 1360 420 M1290 420 C1360 380 1410 350 1440 330 M1230 620 C1190 590 1160 575 1130 560"
        stroke={trunk} strokeWidth="16" fill="none" strokeLinecap="round" />
      {clusters.map(([cx, cy, s], k) => (
        <g key={k} className="tb-bloom" style={{ animationDelay: `-${k * 0.9}s` }}>
          {Array.from({ length: 14 }, (_, i) => {
            const a = rnd(k * 20 + i) * Math.PI * 2, r = s * 0.62 * Math.sqrt(rnd(k * 20 + i * 3));
            return <circle key={i} cx={cx + Math.cos(a) * r * 1.2} cy={cy + Math.sin(a) * r * 0.75} r={s * (0.22 + rnd(k * 20 + i * 5) * 0.18)} fill={bloom[i % bloom.length]} />;
          })}
        </g>
      ))}
    </g>
  );
}

function Pagoda({ x, y, fill }) {
  return (
    <g fill={fill}>
      {[0, 1, 2, 3].map((i) => {
        const w = 74 - i * 13, yy = y - 30 - i * 30;
        return (
          <g key={i}>
            <rect x={x - w * 0.3} y={yy} width={w * 0.6} height={30} />
            <path d={`M${x - w / 2 - 12} ${yy + 3} Q${x - w / 2} ${yy - 4} ${x - w * 0.32} ${yy - 12} L${x + w * 0.32} ${yy - 12} Q${x + w / 2} ${yy - 4} ${x + w / 2 + 12} ${yy + 3}Z`} />
          </g>
        );
      })}
      <rect x={x - 1.5} y={y - 180} width="3" height="42" />
    </g>
  );
}

function Lighthouse({ x, y, body, stripe, lamp, beam }) {
  return (
    <g>
      <g className="tb-beam" style={{ transformOrigin: `${x}px ${y - 188}px` }}>
        <path d={`M${x} ${y - 188} L${x - 480} ${y - 230} L${x - 480} ${y - 160}Z`} fill={beam} />
      </g>
      <path d={`M${x - 26} ${y} L${x - 16} ${y - 170} L${x + 16} ${y - 170} L${x + 26} ${y}Z`} fill={body} />
      <path d={`M${x - 23.5} ${y - 40} L${x - 21.5} ${y - 72} L${x + 21.5} ${y - 72} L${x + 23.5} ${y - 40}Z M${x - 19.5} ${y - 104} L${x - 18} ${y - 136} L${x + 18} ${y - 136} L${x + 19.5} ${y - 104}Z`} fill={stripe} />
      <rect x={x - 22} y={y - 176} width="44" height="8" rx="2" fill={stripe} />
      <rect x={x - 12} y={y - 200} width="24" height="24" rx="3" fill={lamp} />
      <path d={`M${x - 16} ${y - 200} L${x} ${y - 218} L${x + 16} ${y - 200}Z`} fill={stripe} />
    </g>
  );
}

function Sailboat({ x, y, hull, sail }) {
  return (
    <g className="tb-bob">
      <g transform={`translate(${x} ${y})`}>
        <path d="M-46 0 L46 0 L34 16 L-34 16Z" fill={hull} />
        <path d="M0 -2 L0 -96 L40 -8Z" fill={sail} />
        <path d="M-4 -8 L-4 -80 L-36 -8Z" fill={sail} opacity="0.8" />
      </g>
    </g>
  );
}

function Cabin({ x, y, wall, roof, win, smoke }) {
  return (
    <g>
      {smoke && [0, 1, 2, 3].map((i) => (
        <circle key={i} className="tb-smoke" cx={x + 30} cy={y - 100} r={9 + i * 3} fill={smoke} style={{ animationDelay: `-${i * 1.6}s` }} />
      ))}
      <rect x={x + 22} y={y - 96} width="14" height="30" fill={roof} />
      <rect x={x - 50} y={y - 56} width="100" height="56" fill={wall} />
      <path d={`M${x - 62} ${y - 52} L${x} ${y - 100} L${x + 62} ${y - 52}Z`} fill={roof} />
      <rect x={x - 36} y={y - 40} width="20" height="18" rx="2" fill={win} />
      <rect x={x + 16} y={y - 40} width="20" height="18" rx="2" fill={win} />
      <rect x={x - 8} y={y - 30} width="16" height="30" rx="2" fill={roof} />
    </g>
  );
}

function Teahouse({ x, y, wall, roof }) {
  return (
    <g>
      <rect x={x - 44} y={y - 40} width="88" height="40" fill={wall} />
      <path d={`M${x - 74} ${y - 36} Q${x - 50} ${y - 44} ${x - 40} ${y - 70} L${x + 40} ${y - 70} Q${x + 50} ${y - 44} ${x + 74} ${y - 36}Z`} fill={roof} />
      <path d={`M${x - 30} ${y - 70} Q${x - 20} ${y - 76} ${x - 16} ${y - 92} L${x + 16} ${y - 92} Q${x + 20} ${y - 76} ${x + 30} ${y - 70}Z`} fill={roof} />
      <rect x={x - 30} y={y - 30} width="16" height="30" fill={roof} opacity="0.5" />
      <rect x={x + 14} y={y - 30} width="16" height="30" fill={roof} opacity="0.5" />
    </g>
  );
}

// Bamboo stalks at a side of the page, leaves and all, swaying together.
function Bamboo({ side, stalk, node, leaf }) {
  const xs = side === "l" ? [30, 78, 118] : [1330, 1372, 1414];
  return (
    <g className="tb-sway slow">
      {xs.map((x, i) => (
        <g key={i}>
          <rect x={x - 7} y={-20} width="14" height={H + 40} rx="5" fill={stalk} />
          {Array.from({ length: 8 }, (_, k) => <rect key={k} x={x - 8} y={60 + k * 110 + i * 30} width="16" height="4" rx="2" fill={node} />)}
          {[0, 1, 2, 3].map((k) => {
            const y = 120 + k * 190 + i * 40, dir = (k + i) % 2 ? 1 : -1;
            return <path key={k} d={`M${x} ${y} q${dir * 40} -18 ${dir * 90} -6 q${-dir * 44} 16 ${-dir * 90} 6 M${x} ${y + 14} q${dir * 36} 6 ${dir * 76} 26 q${-dir * 42} -2 ${-dir * 76} -26`} fill={leaf} />;
          })}
        </g>
      ))}
    </g>
  );
}

function Seaweed({ x, h, fill, delay = 0 }) {
  return (
    <path className="tb-weed" style={{ animationDelay: `-${delay}s` }}
      d={`M${x} ${H} C${x - 30} ${H - h * 0.3} ${x + 30} ${H - h * 0.6} ${x - 6} ${H - h} C${x + 14} ${H - h * 0.62} ${x - 14} ${H - h * 0.32} ${x + 16} ${H}Z`} fill={fill} />
  );
}

function Fish({ y, fill, dur, delay, s = 1, back = false }) {
  return (
    <g className={"tb-swim" + (back ? " back" : "")} style={{ animationDuration: `${dur}s`, animationDelay: `-${delay}s` }}>
      <g transform={`translate(0 ${y}) scale(${back ? -s : s} ${s})`}>
        <ellipse cx="0" cy="0" rx="22" ry="10" fill={fill} />
        <path d="M-18 0 L-34 -10 L-34 10Z" fill={fill} />
      </g>
    </g>
  );
}

function Coral({ x, fill, s = 1 }) {
  return (
    <g transform={`translate(${x} ${H}) scale(${s})`} stroke={fill} strokeWidth="12" strokeLinecap="round" fill="none">
      <path d="M0 0 L0 -70 M0 -40 C-20 -50 -30 -70 -30 -100 M0 -60 C20 -70 30 -90 28 -120 M-30 -80 L-50 -100 M28 -100 L48 -112" />
    </g>
  );
}

// Waves along the bottom, each rolling at its own speed.
function Waves({ colors }) {
  const wave = "M0 60 C120 30 240 30 360 60 C480 90 600 90 720 60 C840 30 960 30 1080 60 C1200 90 1320 90 1440 60 C1560 30 1680 30 1800 60 C1920 90 2040 90 2160 60 C2280 30 2400 30 2520 60 C2640 90 2760 90 2880 60 L2880 160 L0 160Z";
  return (
    <div className="tb-waves">
      {colors.map((c, i) => (
        <svg key={i} className={`w${i}`} viewBox="0 0 2880 160" preserveAspectRatio="none" aria-hidden="true"><path d={wave} fill={c} /></svg>
      ))}
    </div>
  );
}

/* ---------- the scenes ---------- */

const scene = (children, extra = null) => (
  <>
    <svg className="tb-scene" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">{children}</svg>
    {extra}
  </>
);

const SCENES = {
  sakura: (dark) => {
    const c = dark
      ? { sun: "#E7B5C4", fuji: "#3F2C44", fujiS: "#33223A", snow: "#CDB6CC", far: "#4A2E42", mid: "#3A2334", near: "#2A1824", pag: "#22131D", trunk: "#1C1016", bloom: ["#C77D93", "#E39AA2", "#A86479"], treeBloom: ["#B96E86", "#D98C9E", "#9A5870", "#E7A6B2"] }
      : { sun: "#FFF4F7", fuji: "#D4B3CC", fujiS: "#C29FBA", snow: "#FFFFFF", far: "#F6CFDC", mid: "#F0B2C7", near: "#E794B0", pag: "#B8718C", trunk: "#6E4440", bloom: ["#FBCFE0", "#F9A8C4", "#FFE3EC"], treeBloom: ["#FFD5E3", "#F9A8C4", "#F48FB1", "#FFE8F0"] };
    return scene(
      <>
        <circle cx={360} cy={230} r={70} fill={c.sun} opacity={dark ? 0.3 : 0.9} />
        <Cloud x={600} y={170} s={0.8} fill={dark ? "#FFFFFF10" : "#FFFFFF99"} dur={160} delay={40} />
        <path d="M640 600 L900 360 Q940 330 980 360 L1260 600Z" fill={c.fuji} />
        <path d="M940 346 L980 360 L1260 600 L1000 600Z" fill={c.fujiS} />
        <path d="M858 400 L900 360 Q940 330 980 360 L1024 400 L1000 394 L982 414 L960 390 L938 416 L916 392 L890 410Z" fill={c.snow} />
        <path d={ridge(640, 70, 3)} fill={c.far} />
        {[140, 520, 760, 980].map((x, i) => <BlossomTree key={i} x={x} y={640 - rnd(i) * 30} s={60} trunk={c.pag} bloom={c.bloom} seed={i * 9} />)}
        <Pagoda x={300} y={650} fill={c.pag} />
        <path d={ridge(730, 60, 7)} fill={c.mid} />
        {[60, 420, 640, 880].map((x, i) => <BlossomTree key={i} x={x} y={740 - rnd(i + 4) * 20} s={90} trunk={c.trunk} bloom={c.bloom} seed={i * 13 + 5} />)}
        <path d={ridge(820, 40, 11)} fill={c.near} />
        <CherryTree trunk={c.trunk} bloom={c.treeBloom} />
      </>,
      <Fall kind="petal" n={16} />,
    );
  },

  midnight: (dark) => {
    const c = dark
      ? { moon: "#F7E7B0", crater: "#E3CF92", halo: "#F2D98C", far: "#2A3068", farS: "#222757", snow: "#9AA2D6", mid: "#1B2050", pine: "#0F1330", lake: "#121637", shine: "#F7E7B0", cabin: "#0A0D22", roof: "#070918", win: "#FFC861", smoke: "#8C93C455" }
      : { moon: "#FFFFFF", crater: "#E3E7FA", halo: "#FFFFFF", far: "#C4CAEE", farS: "#B2B9E6", snow: "#FFFFFF", mid: "#A4ADE0", pine: "#7C86C8", lake: "#B9C0EC", shine: "#FFFFFF", cabin: "#6670B4", roof: "#525CA2", win: "#FFE39A", smoke: "#FFFFFF88" };
    return scene(
      <>
        <Halo x={1130} y={170} r={170} color={c.halo} id="tb-mid-moon" strength={dark ? 0.25 : 0.4} />
        <circle cx={1130} cy={170} r={64} fill={c.moon} />
        <circle cx={1108} cy={150} r={12} fill={c.crater} /><circle cx={1150} cy={196} r={9} fill={c.crater} /><circle cx={1156} cy={144} r={6} fill={c.crater} />
        <Cloud x={380} y={200} s={0.7} fill={dark ? "#FFFFFF0C" : "#FFFFFFAA"} dur={180} delay={60} />
        <Mountains base={640} fill={c.far} shade={c.farS} snow={c.snow} peaks={[[120, 260, 260], [420, 330, 300], [700, 240, 240], [980, 300, 280], [1300, 260, 260]]} />
        <Pines y={660} n={60} min={40} max={80} seed={4} fill={c.mid} />
        <rect x="-200" y="655" width={W + 400} height="30" fill={c.mid} />
        <rect x="-200" y="680" width={W + 400} height={H - 680} fill={c.lake} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} className="tb-glint" x={1130 - 60 + i * 7 - rnd(i) * 30} y={700 + i * 22} width={120 - i * 14} height="3" rx="1.5" fill={c.shine}
            style={{ animationDelay: `-${i * 0.7}s` }} />
        ))}
        <path d={`M-40 ${H} L-40 760 Q120 730 280 770 Q380 800 440 ${H}Z`} fill={c.pine} />
        <Pines y={790} n={7} min={90} max={170} seed={9} fill={c.pine} from={-30} to={180} />
        <Cabin x={300} y={784} wall={c.cabin} roof={c.roof} win={c.win} smoke={c.smoke} />
        <path d={`M1480 ${H} L1480 740 Q1320 760 1220 800 Q1160 830 1140 ${H}Z`} fill={c.pine} />
        <Pines y={800} n={5} min={120} max={200} seed={13} fill={c.pine} from={1240} to={1460} />
      </>,
      <>
        <Stars n={dark ? 120 : 40} color={dark ? "#FFF6D8" : "#8C96D8"} seed={5} top={60} />
        {dark && <b className="tb-shooting" />}
      </>,
    );
  },

  ocean: (dark) => {
    const c = dark
      ? { sun: "#9CC9F0", cloud: "#FFFFFF10", island: "#18314F", sea: "#10263F", glint: "#9CC9F0", cliff: "#0B1B2E", body: "#D8E4F0", stripe: "#9E3B3B", lamp: "#FFE39A", beam: "#FFE39A1A", hull: "#0B1B2E", sail: "#D8E4F0", bird: "#9CC9F0", waves: ["#1E3A5FAA", "#16324FCC", "#0E2440EE"] }
      : { sun: "#FFFFFF", cloud: "#FFFFFFCC", island: "#8DB9DC", sea: "#7FB6E2", glint: "#FFFFFF", cliff: "#4F7FA6", body: "#FFFFFF", stripe: "#E0605A", lamp: "#FFD66B", beam: "#FFF2B22A", hull: "#3F6A8E", sail: "#FFFFFF", bird: "#4F7FA6", waves: ["#A9D3F2CC", "#86BFEADD", "#5FA6DDEE"] };
    return scene(
      <>
        <circle cx={400} cy={260} r={56} fill={c.sun} opacity={dark ? 0.4 : 0.9} />
        <Cloud x={700} y={150} s={1} fill={c.cloud} dur={170} delay={20} />
        <Cloud x={200} y={330} s={0.6} fill={c.cloud} dur={130} delay={90} />
        <Birds fill={c.bird} y={230} n={4} seed={3} dur={70} />
        <path d="M-40 580 Q120 540 260 568 Q340 548 420 580Z" fill={c.island} />
        <rect x="-200" y="578" width={W + 400} height={H - 578} fill={c.sea} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} className="tb-glint" x={400 - 70 + rnd(i + 2) * 40 - i * 4} y={596 + i * 20} width={100 + i * 10} height="3" rx="1.5" fill={c.glint} style={{ animationDelay: `-${i * 0.6}s` }} />
        ))}
        <Sailboat x={760} y={600} hull={c.hull} sail={c.sail} />
        <path d={`M1480 ${H} L1480 520 L1300 520 Q1250 540 1230 600 Q1200 700 1120 ${H}Z`} fill={c.cliff} />
        <Lighthouse x={1360} y={522} body={c.body} stripe={c.stripe} lamp={c.lamp} beam={c.beam} />
      </>,
      <Waves colors={c.waves} />,
    );
  },

  sunset: (dark) => {
    const c = dark
      ? { sun1: "#FFB36B", sun2: "#FF5F6D", far: "#5A2A3A", farS: "#4A2231", mid: "#3A1A24", near: "#1E0D12", bird: "#1E0D12", cloud: "#FFB08A22" }
      : { sun1: "#FFE08A", sun2: "#FF8A65", far: "#E9A08F", farS: "#DD8E7D", mid: "#C8705F", near: "#8A4640", bird: "#8A4640", cloud: "#FFFFFFAA" };
    return scene(
      <>
        <defs>
          <linearGradient id="tb-sun-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.sun1} /><stop offset="1" stopColor={c.sun2} /></linearGradient>
          <mask id="tb-sun-m"><rect x="0" y="0" width={W} height={H} fill="#fff" />
            {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x="400" y={520 + i * 22} width="640" height={3 + i * 2.2} fill="#000" />)}
          </mask>
        </defs>
        <Halo x={720} y={520} r={340} color={c.sun1} id="tb-sun-halo" strength={0.3} />
        <circle className="tb-rise" cx={720} cy={520} r={230} fill="url(#tb-sun-g)" mask="url(#tb-sun-m)" />
        <Cloud x={260} y={200} s={1.1} fill={c.cloud} dur={150} delay={10} />
        <Cloud x={1100} y={140} s={0.8} fill={c.cloud} dur={190} delay={80} />
        <Birds fill={c.bird} y={260} n={6} seed={8} dur={80} />
        <Mountains base={660} fill={c.far} shade={c.farS} peaks={[[80, 200, 240], [360, 150, 220], [1040, 210, 260], [1340, 170, 240]]} />
        <path d={ridge(720, 70, 5)} fill={c.mid} />
        <path d={ridge(810, 50, 9)} fill={c.near} />
        <Pines y={830} n={6} min={120} max={200} seed={21} fill={c.near} from={-20} to={260} />
        <Pines y={830} n={5} min={110} max={190} seed={25} fill={c.near} from={1200} to={1460} />
      </>,
    );
  },

  autumn: (dark) => {
    const c = dark
      ? { sun: "#C9774A", far: "#3A2618", mid: "#2E1D12", near: "#20140C", trunk: "#1A0F08", leaves: [["#7A3A1C", "#A4542A"], ["#8A5A1E", "#B07A2A"], ["#6E2A1C", "#94402A"]], pine: "#1A120B", fence: "#3A2618", path: "#3A2618" }
      : { sun: "#FFD08A", far: "#E8C49A", mid: "#D9A06A", near: "#B97A48", trunk: "#6B4226", leaves: [["#E0662E", "#F59A4E"], ["#E8A33A", "#F7C766"], ["#C2452A", "#E0663E"]], pine: "#6E5A34", fence: "#8A5A36", path: "#E3C79C" };
    return scene(
      <>
        <circle cx={1060} cy={280} r={60} fill={c.sun} opacity={dark ? 0.35 : 0.9} />
        <Cloud x={380} y={180} s={0.9} fill={dark ? "#FFFFFF0C" : "#FFFFFFAA"} dur={170} delay={50} />
        <Birds fill={dark ? "#C9774A" : "#8A5A36"} y={220} n={5} seed={12} dur={75} />
        <path d={ridge(620, 80, 2)} fill={c.far} />
        {Array.from({ length: 14 }, (_, i) => {
          const [leaf, lit] = c.leaves[i % 3];
          return <RoundTree key={i} x={i * 110 + rnd(i) * 40} y={650 - rnd(i + 3) * 30} s={50 + rnd(i + 5) * 20} leaf={leaf} lit={lit} trunk={c.trunk} />;
        })}
        <path d={ridge(700, 60, 6)} fill={c.mid} />
        {[80, 330, 1120].map((x, i) => { const [leaf, lit] = c.leaves[(i + 1) % 3]; return <RoundTree key={i} x={x} y={740} s={110 + i * 10} leaf={leaf} lit={lit} trunk={c.trunk} />; })}
        <path d={ridge(790, 40, 10)} fill={c.near} />
        <path d="M600 900 C680 850 740 820 770 790" stroke={c.path} strokeWidth="46" fill="none" opacity="0.7" />
        <g stroke={c.fence} strokeWidth="6" strokeLinecap="round">
          {[860, 910, 960, 1010, 1060].map((x) => <path key={x} d={`M${x} ${840 - (x - 860) * 0.12} l0 -44`} />)}
          <path d="M852 812 L1068 786 M852 830 L1068 804" />
        </g>
        <Pines y={900} n={4} min={200} max={260} seed={31} fill={c.pine} from={1260} to={1470} />
      </>,
      <Fall kind="leaf" n={16} />,
    );
  },

  matcha: (dark) => {
    const c = dark
      ? { far: "#2E4524", mid: "#243A1B", near: "#1B2D13", row: "#3C5A2C", house: "#3A3226", roof: "#10180B", stalk: "#355228", node: "#26401C", leaf: "#40632F", mist: "#FFFFFF0E" }
      : { far: "#D5E8BD", mid: "#B6D594", near: "#94C173", row: "#7FAF5C", house: "#F3EAD8", roof: "#4F6B3A", stalk: "#8FB86B", node: "#6E9A4E", leaf: "#7DB05A", mist: "#FFFFFF99" };
    const rows = (base, id, fill, seed) => (
      <>
        <defs><clipPath id={id}><path d={ridge(base, 60, seed)} /></clipPath></defs>
        <path d={ridge(base, 60, seed)} fill={fill} />
        <g clipPath={`url(#${id})`} stroke={c.row} strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.7">
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M-40 ${base - 40 + i * 24} Q360 ${base - 70 + i * 24} 720 ${base - 40 + i * 24} T1480 ${base - 40 + i * 24}`} />)}
        </g>
      </>
    );
    return scene(
      <>
        <path d={ridge(560, 90, 4)} fill={c.far} />
        <Teahouse x={980} y={556} wall={c.house} roof={c.roof} />
        <ellipse className="tb-mist" cx="500" cy="560" rx="420" ry="26" fill={c.mist} />
        {rows(660, "tb-mat-r1", c.mid, 8)}
        <ellipse className="tb-mist slow" cx="1000" cy="680" rx="460" ry="22" fill={c.mist} />
        {rows(780, "tb-mat-r2", c.near, 12)}
        <Bamboo side="l" stalk={c.stalk} node={c.node} leaf={c.leaf} />
        <Bamboo side="r" stalk={c.stalk} node={c.node} leaf={c.leaf} />
      </>,
      <Fall kind="leaf-g" n={9} />,
    );
  },

  cottage: (dark) => {
    const c = dark
      ? { far: "#28331E", mid: "#20291A", near: "#171E12", wall: "#3A2E22", roof: "#1E1510", win: "#E9B35A", smoke: "#FFFFFF18", leaf: "#26361A", lit: "#34482A", trunk: "#140E09", fence: "#3A2E22", flower: ["#8A6A9E", "#A06070", "#C9A55A"] }
      : { far: "#D7DEB4", mid: "#BCCB8E", near: "#A0B774", wall: "#F4E7CE", roof: "#A2553A", win: "#FFE39A", smoke: "#FFFFFFCC", leaf: "#7FA055", lit: "#9CBC6C", trunk: "#6B4A30", fence: "#FFFFFF", flower: ["#E58AAA", "#F2C94C", "#FFFFFF", "#B48AD8"] };
    return scene(
      <>
        <Cloud x={420} y={190} s={0.9} fill={dark ? "#FFFFFF0A" : "#FFFFFFBB"} dur={160} delay={30} />
        <Cloud x={1250} y={120} s={0.6} fill={dark ? "#FFFFFF0A" : "#FFFFFFBB"} dur={200} delay={110} />
        <Birds fill={dark ? "#4A5A3A" : "#6B7F4A"} y={240} n={3} seed={17} dur={90} />
        <path d={ridge(640, 70, 13)} fill={c.far} />
        <path d={ridge(720, 60, 17)} fill={c.mid} />
        <Cabin x={1060} y={738} wall={c.wall} roof={c.roof} win={c.win} smoke={c.smoke} />
        <RoundTree x={1210} y={744} s={100} leaf={c.leaf} lit={c.lit} trunk={c.trunk} />
        <RoundTree x={170} y={820} s={170} leaf={c.leaf} lit={c.lit} trunk={c.trunk} />
        <path d={ridge(800, 40, 19)} fill={c.near} />
        <g stroke={c.fence} strokeWidth="6" strokeLinecap="round" opacity="0.9">
          {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${880 + i * 50} 832 l0 -40`} />)}
          <path d="M870 806 L1290 806 M870 822 L1290 822" />
        </g>
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={rnd(i + 50) * W} cy={836 + rnd(i + 90) * 60} r={3 + rnd(i) * 3} fill={c.flower[i % c.flower.length]} />
        ))}
      </>,
    );
  },

  violet: (dark) => {
    const c = dark
      ? { far: "#3A2A66", farS: "#2F2256", snow: "#B7A6E8", mid: "#241A48", pine: "#150F2E", lake: "#1C1540", glint: "#E9D5FF" }
      : { far: "#D4C8F5", farS: "#C4B5EE", snow: "#FFFFFF", mid: "#B8A6EA", pine: "#8E78D6", lake: "#CFC3F5", glint: "#FFFFFF" };
    return (
      <>
        <div className="tb-aurora">
          <i style={{ background: dark ? "#8B5CF655" : "#C4B5FD77" }} />
          <i style={{ background: dark ? "#EC489933" : "#F9A8D455" }} />
          <i style={{ background: dark ? "#2DD4BF33" : "#A5F3FC55" }} />
        </div>
        <Stars n={dark ? 80 : 30} color={dark ? "#E9D5FF" : "#A78BFA"} seed={11} top={55} />
        {scene(
          <>
            <Mountains base={620} fill={c.far} shade={c.farS} snow={c.snow} peaks={[[160, 300, 280], [520, 250, 260], [860, 340, 300], [1220, 280, 280]]} />
            <Pines y={640} n={50} min={40} max={80} seed={17} fill={c.mid} />
            <rect x="-200" y="636" width={W + 400} height="30" fill={c.mid} />
            <rect x="-200" y="662" width={W + 400} height={H - 662} fill={c.lake} />
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} className="tb-glint" x={500 + rnd(i) * 400} y={690 + i * 34} width={140 + rnd(i + 3) * 120} height="3" rx="1.5" fill={c.glint} style={{ animationDelay: `-${i}s` }} />
            ))}
            <Pines y={900} n={5} min={200} max={300} seed={19} fill={c.pine} from={-40} to={260} />
            <Pines y={900} n={5} min={180} max={280} seed={23} fill={c.pine} from={1200} to={1480} />
          </>,
        )}
      </>
    );
  },

  prismarine: (dark) => {
    const c = dark
      ? { ray: "#7DE3D0", sand: "#123A3A", sandS: "#0E2F30", weed: ["#1F6B5A", "#17574A", "#2A7F6A"], coral: ["#9E4F6A", "#B8784A"], fish: ["#5ED7BE", "#F2B36B", "#7DD3FC"], rock: "#0B2627" }
      : { ray: "#FFFFFF", sand: "#E8E0C0", sandS: "#D9CFAA", weed: ["#3FAE8C", "#2E9A7A", "#5CC3A0"], coral: ["#F28B9B", "#F6A96B"], fish: ["#F29E4C", "#FFD166", "#FF7B7B"], rock: "#6FA89C" };
    return scene(
      <>
        {[0, 1, 2, 3].map((i) => (
          <path key={i} className="tb-ray" style={{ animationDelay: `-${i * 2.2}s` }}
            d={`M${200 + i * 300} -20 L${260 + i * 300} -20 L${400 + i * 320} ${H} L${260 + i * 320} ${H}Z`} fill={c.ray} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => <Fish key={i} y={260 + i * 90} fill={c.fish[i % 3]} dur={34 + i * 9} delay={i * 11} s={0.8 + rnd(i) * 0.6} back={i % 2 === 1} />)}
        <path d={ridge(800, 50, 29)} fill={c.sand} />
        <path d="M-40 900 Q60 740 200 780 Q260 800 300 900Z M1180 900 Q1240 770 1340 760 Q1440 770 1480 900Z" fill={c.rock} />
        {[40, 110, 170, 1250, 1320, 1400, 600, 900].map((x, i) => <Seaweed key={i} x={x} h={160 + rnd(i + 2) * 200} fill={c.weed[i % 3]} delay={i * 1.3} />)}
        <Coral x={340} fill={c.coral[0]} s={1.1} />
        <Coral x={1120} fill={c.coral[1]} s={0.9} />
        <Coral x={760} fill={c.coral[0]} s={0.7} />
        <path d={ridge(870, 20, 31)} fill={c.sandS} />
      </>,
      <Bubbles n={16} color={dark ? "#7DE3D088" : "#FFFFFFCC"} />,
    );
  },
};

export function ThemeBackdrop({ theme, resolved, inOverlay = false }) {
  const draw = SCENES[theme];
  // A class on the body says a scene is showing, so the stylesheet need not
  // search the whole page for it (body:has(), slow in Safari) on every change.
  useEffect(() => {
    if (!draw) return;
    if (inOverlay) return;
    document.body.classList.add("has-backdrop");
    return () => document.body.classList.remove("has-backdrop");
  }, [draw, inOverlay]);
  if (!draw) return null;
  const dark = resolved === "dark";
  return (
    <div className={`theme-backdrop tb-${theme}${inOverlay ? " tb-over" : ""}`} aria-hidden="true">
      {draw(dark)}
      <div className="tb-scrim" />
      <Grain opacity={dark ? 0.07 : 0.05} />
    </div>
  );
}
