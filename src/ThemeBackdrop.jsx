// A painted backdrop behind the whole app, one for each theme, so a theme is
// a place rather than a gradient: blossom and branches for Sakura, rolling
// waves for Ocean, a starry sky over mountains for Midnight. Layers of soft
// shapes, a little grain so nothing looks flat, and slow movement: drifting,
// twinkling, swaying, never fast enough to pull the eye from the work.
//
// It sits behind everything, never catches a tap, keeps to the edges and
// corners where there is no text, and stands still for anyone who has asked
// their device for less motion.

const rnd = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

// Fine paper grain over the whole page, the difference between printed and flat.
function Grain({ opacity = 0.05 }) {
  return (
    <svg className="tb-grain" aria-hidden="true" style={{ opacity }}>
      <filter id="tb-grain-f"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter="url(#tb-grain-f)" />
    </svg>
  );
}

// Soft blurred lights, drifting slowly: bokeh.
function Bokeh({ colors, n = 7, seed = 1 }) {
  return (
    <div className="tb-bokeh">
      {Array.from({ length: n }, (_, i) => {
        const s = 90 + rnd(seed + i) * 260;
        return <i key={i} style={{ left: `${rnd(seed + i * 3) * 100}%`, top: `${rnd(seed + i * 7) * 100}%`, width: s, height: s,
          background: colors[i % colors.length], animationDelay: `-${rnd(seed + i * 5) * 30}s`, animationDuration: `${26 + rnd(seed + i * 11) * 24}s` }} />;
      })}
    </div>
  );
}

// Stars that twinkle, each at its own pace.
function Stars({ n = 70, color = "#FFF6D8", seed = 3, top = 70 }) {
  return (
    <div className="tb-stars">
      {Array.from({ length: n }, (_, i) => {
        const s = 1 + rnd(seed + i) * 2.4;
        return <i key={i} style={{ left: `${rnd(seed + i * 13) * 100}%`, top: `${rnd(seed + i * 17) * top}%`, width: s, height: s, background: color,
          boxShadow: s > 2.6 ? `0 0 6px ${color}` : "none", animationDelay: `-${rnd(seed + i * 19) * 6}s`, animationDuration: `${2.5 + rnd(seed + i * 23) * 4}s` }} />;
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

// Hills along the bottom, in layers, each a little paler into the distance.
function Hills({ layers, sway = false }) {
  return (
    <svg className={"tb-hills" + (sway ? " sway" : "")} viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
      {layers.map(([d, fill, op], i) => <path key={i} className={`h${i}`} d={d} fill={fill} opacity={op} />)}
    </svg>
  );
}
const HILL_A = "M0 230 C160 190 300 200 460 214 C640 230 760 170 940 176 C1120 182 1260 226 1440 206 L1440 320 L0 320Z";
const HILL_B = "M0 262 C200 236 360 250 540 258 C720 266 880 226 1060 232 C1220 238 1340 262 1440 250 L1440 320 L0 320Z";
const HILL_C = "M0 290 C240 272 420 282 620 286 C820 290 1000 270 1200 276 C1320 280 1400 290 1440 288 L1440 320 L0 320Z";
const MOUNTAINS = "M0 240 L140 170 L230 214 L360 120 L470 196 L560 156 L700 230 L820 140 L930 206 L1060 150 L1180 214 L1300 164 L1440 226 L1440 320 L0 320Z";
const TREELINE = "M0 250 Q20 200 40 250 Q58 185 80 250 Q96 214 114 250 Q140 170 166 250 Q184 206 204 250 Q230 190 254 250 Q270 220 290 250 Q318 176 346 250 Q362 210 382 250 Q410 196 436 250 Q452 222 470 250 Q500 180 530 250 Q548 212 566 250 Q592 192 618 250 Q636 218 656 250 Q686 170 716 250 Q732 208 752 250 Q778 196 804 250 Q822 220 840 250 Q870 178 900 250 Q918 206 936 250 Q962 190 988 250 Q1006 224 1024 250 Q1054 174 1084 250 Q1100 212 1120 250 Q1146 194 1172 250 Q1190 222 1208 250 Q1238 182 1268 250 Q1284 210 1304 250 Q1330 192 1356 250 Q1374 222 1392 250 Q1418 196 1440 250 L1440 320 L0 320Z";

// A branch of blossom reaching in from a corner.
function Branch({ side, color, bloom }) {
  return (
    <svg className={"tb-branch " + side} viewBox="0 0 360 260" aria-hidden="true">
      <path d="M0 40 C80 60 130 90 190 130 C230 156 270 170 330 176 M150 102 C170 70 200 56 240 50 M210 142 C220 180 240 200 270 214" stroke={color} strokeWidth="7" fill="none" strokeLinecap="round" />
      {[[190, 130], [240, 50], [270, 214], [330, 176], [120, 80], [215, 60], [300, 172], [250, 198], [165, 112]].map(([x, y], i) => (
        <g key={i} className="tb-bloom" transform={`translate(${x} ${y}) rotate(${i * 37})`} style={{ animationDelay: `-${i * 0.7}s` }}>
          {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-8" rx="6" ry="9" fill={bloom} transform={`rotate(${a})`} />)}
          <circle r="3" fill="#F59EB6" />
        </g>
      ))}
    </svg>
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

const SCENES = {
  sakura: (dark) => (
    <>
      <Bokeh colors={dark ? ["#E39AA255", "#7A3B5344"] : ["#F9A8C455", "#FFD6E466", "#F472B633"]} seed={2} />
      <Branch side="tl" color={dark ? "#4A2B35" : "#8B5A4A"} bloom={dark ? "#E39AA2" : "#FBCFE0"} />
      <Branch side="br" color={dark ? "#4A2B35" : "#8B5A4A"} bloom={dark ? "#C77D93" : "#F9B4CC"} />
      <Fall kind="petal" n={10} />
    </>
  ),
  cottage: (dark) => (
    <>
      <div className="tb-vignette" style={{ "--v": dark ? "rgba(0,0,0,.55)" : "rgba(120,90,40,.16)" }} />
      <div className="tb-glow" style={{ "--g": dark ? "rgba(255,190,110,.18)" : "rgba(255,210,140,.35)" }} />
      <svg className="tb-botanical" viewBox="0 0 300 420" aria-hidden="true">
        <g fill="none" stroke={dark ? "#A9C47A" : "#46652D"} strokeWidth="2" strokeLinecap="round" opacity={dark ? 0.35 : 0.3}>
          <path d="M150 420 C150 320 140 220 160 110 C170 60 190 30 210 10" />
          {[[150, 360, -1], [148, 300, 1], [152, 240, -1], [158, 180, 1], [166, 120, -1], [180, 70, 1]].map(([x, y, s], i) => (
            <path key={i} d={`M${x} ${y} C${x + s * 30} ${y - 20} ${x + s * 60} ${y - 10} ${x + s * 70} ${y - 34} C${x + s * 40} ${y - 44} ${x + s * 16} ${y - 30} ${x} ${y}`} />
          ))}
        </g>
      </svg>
      <Hills layers={[[HILL_A, dark ? "#2E3A22" : "#C9D3A8", 0.55], [HILL_B, dark ? "#26311C" : "#AFBF86", 0.6]]} />
    </>
  ),
  matcha: (dark) => (
    <>
      <Bokeh colors={dark ? ["#9DCC7633", "#4F853633"] : ["#C8E6A855", "#E8F5D866"]} n={5} seed={8} />
      <Hills sway layers={[[HILL_A, dark ? "#2A3F1B" : "#CFE5B5", 0.8], [HILL_B, dark ? "#233617" : "#B2D494", 0.85], [HILL_C, dark ? "#1C2C11" : "#94C173", 0.9]]} />
      <Fall kind="leaf-g" n={7} />
    </>
  ),
  violet: (dark) => (
    <>
      <div className="tb-aurora">
        <i style={{ background: dark ? "#8B5CF666" : "#C4B5FD88" }} />
        <i style={{ background: dark ? "#EC489944" : "#F9A8D466" }} />
        <i style={{ background: dark ? "#6366F155" : "#A5B4FC77" }} />
      </div>
      <Stars n={dark ? 50 : 26} color={dark ? "#E9D5FF" : "#A78BFA"} seed={11} top={90} />
    </>
  ),
  ocean: (dark) => (
    <>
      <div className="tb-caustics" style={{ opacity: dark ? 0.12 : 0.22 }} />
      <Waves colors={dark ? ["#1E3A5F66", "#16324F88", "#0E2440AA"] : ["#BFE0F799", "#93C8EEAA", "#6FB2E4BB"]} />
    </>
  ),
  prismarine: (dark) => (
    <>
      <svg className="tb-facets" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {Array.from({ length: 26 }, (_, i) => {
          const x = rnd(i + 5) * 1440, y = rnd(i + 9) * 900, s = 60 + rnd(i + 13) * 140;
          const pts = [0, 1, 2].map((k) => { const a = rnd(i * 3 + k) * Math.PI * 2; return `${(x + Math.cos(a) * s).toFixed(0)},${(y + Math.sin(a) * s).toFixed(0)}`; }).join(" ");
          return <polygon key={i} points={pts} className="tb-facet" style={{ animationDelay: `-${rnd(i + 17) * 9}s` }}
            fill={[dark ? "#5ED7BE" : "#7FE0C8", dark ? "#3AA89A" : "#A7F3E0", dark ? "#7DD3FC" : "#BAE6FD"][i % 3]} />;
        })}
      </svg>
      <Bokeh colors={dark ? ["#5ED7BE33"] : ["#99F6E455"]} n={4} seed={21} />
    </>
  ),
  sunset: (dark) => (
    <>
      <div className="tb-sun" style={{ "--s1": dark ? "#FF9A6B" : "#FFB36B", "--s2": dark ? "#FF9A6B00" : "#FFD3BC00" }} />
      <div className="tb-clouds" style={{ "--c": dark ? "#FFB08A22" : "#FFFFFFAA" }}><i /><i /><i /></div>
      <Hills layers={[[HILL_A, dark ? "#4A2418" : "#F7B79A", 0.6], [HILL_B, dark ? "#3A1C12" : "#EE9A7C", 0.65], [HILL_C, dark ? "#2A140D" : "#E07C5E", 0.7]]} />
    </>
  ),
  autumn: (dark) => (
    <>
      <div className="tb-glow" style={{ "--g": dark ? "rgba(228,139,78,.14)" : "rgba(242,165,65,.25)" }} />
      <Hills layers={[[TREELINE, dark ? "#2A1C12" : "#D9A77A", 0.55], [HILL_B, dark ? "#1E140C" : "#C98A5B", 0.6]]} />
      <Fall kind="leaf" n={11} />
    </>
  ),
  midnight: (dark) => (
    <>
      <Stars n={dark ? 110 : 36} color={dark ? "#FFF6D8" : "#8C96D8"} seed={5} top={75} />
      {dark && <b className="tb-shooting" />}
      <div className="tb-moon" style={{ "--m": dark ? "#F7E7B0" : "#FFFFFF", "--mg": dark ? "#F2C75C55" : "#C7CEF5AA" }} />
      <Hills layers={[[MOUNTAINS, dark ? "#1A1F45" : "#C3C9EC", 0.75], [HILL_B, dark ? "#10132E" : "#AAB2E2", 0.85]]} />
    </>
  ),
};

export function hasBackdrop(theme) { return !!SCENES[theme]; }

export function ThemeBackdrop({ theme, resolved }) {
  const draw = SCENES[theme];
  if (!draw) return null;
  const dark = resolved === "dark";
  return (
    <div className={`theme-backdrop tb-${theme}`} aria-hidden="true">
      {draw(dark)}
      <Grain opacity={dark ? 0.07 : 0.05} />
    </div>
  );
}
