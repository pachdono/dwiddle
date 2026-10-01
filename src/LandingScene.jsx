// The front page's backdrop: Duck Lagoon. A waterfall pours off a cliff into
// a pool, and a crowd of Dwiddles are having the best day: one sits under the
// falls getting splashed, one slides down them, two bob about on swim rings,
// one lounges on a lilo and one dives with only its tail showing. Soft green
// cartoon mountains, the same whatever theme the app is in.
//
// Everything moves gently and stops for anyone who asks for less motion.

import { DuckParts } from "./Duck.jsx";

// A duck at (x, y), its feet on that spot, `s` times the usual size.
function D({ x, y, s = 0.5, flip, hat = true, className = "", children }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) translate(-63 -128)`}>
      <g className={className}>
        <DuckParts hat={hat} />
        {children}
      </g>
    </g>
  );
}

// A duck sitting in a swim ring: the ring's back, the duck, then its front.
function Ring({ x, y, color, delay = 0, flip }) {
  return (
    <g className="ls-bob" style={{ animationDelay: `${delay}s` }}>
      <ellipse cx={x} cy={y} rx="46" ry="15" fill={color} />
      <ellipse cx={x} cy={y - 1} rx="28" ry="8" className="ls-water-deep" />
      <D x={x} y={y + 10} s={0.42} flip={flip} />
      <path d={`M${x - 46} ${y}a46 15 0 0 0 92 0`} fill={color} />
      <path d={`M${x - 38} ${y + 6}h14M${x + 6} ${y + 12}h16`} stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}

export default function LandingScene() {
  return (
    <div className="ls" aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="ls-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" className="ls-sky-a" /><stop offset="1" className="ls-sky-b" />
          </linearGradient>
          <linearGradient id="ls-pool" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" className="ls-pool-a" /><stop offset="1" className="ls-pool-b" />
          </linearGradient>
          <linearGradient id="ls-fall" x1="0" x2="1">
            <stop offset="0" stopColor="#bfe8ff" /><stop offset="0.5" stopColor="#ffffff" /><stop offset="1" stopColor="#a6dcfb" />
          </linearGradient>
          <clipPath id="ls-fallclip"><path d="M1196 300h150c4 120 0 260-6 360h-140c-8-100-8-240-4-360z" /></clipPath>
          <clipPath id="ls-poolclip"><path d="M0 640c260-24 520-30 800-26s560 18 800 34V900H0z" /></clipPath>
        </defs>

        <rect width="1600" height="900" fill="url(#ls-sky)" />
        <circle cx="1080" cy="170" r="70" className="ls-sun" />
        <g className="ls-clouds">
          <path d="M120 170a40 40 0 0 1 70-30 50 50 0 0 1 92 18 34 34 0 0 1 2 64H128a30 30 0 0 1-8-52z" className="ls-cloud" />
          <path d="M760 110a30 30 0 0 1 54-22 40 40 0 0 1 72 14 26 26 0 0 1 0 48H768a24 24 0 0 1-8-40z" className="ls-cloud" />
        </g>

        {/* green cartoon mountains, snow on the tallest */}
        <path d="M-40 640L180 300l120 130 140-220 200 300 120-140 180 250 160-280 220 330 140-160 220 260H-40z" className="ls-mtn-far" />
        <path d="M440 210l-60 92 30-10 30 26 26-30 34 12z" className="ls-snow" />
        <path d="M1140 270l-50 78 26-8 24 20 22-24 30 10z" className="ls-snow" />
        <path d="M-40 660L120 470l130 110 170-200 190 230 150-120 210 190 190-170 180 150 140-90 220 180H-40z" className="ls-mtn" />
        <path d="M0 640c180-50 340-60 520-30s340 40 500 10 260-40 580-20V700H0z" className="ls-hill" />
        {[[90, 600], [330, 590], [640, 600], [760, 606], [980, 598]].map(([x, y], i) => (
          <g key={i} className="ls-tree" transform={`translate(${x} ${y}) scale(${0.8 + (i % 3) * 0.15})`}>
            <path d="M0 0l-18 0 18-46 18 46z" fill="#3f8a4f" /><path d="M0-22l-14 0 14-36 14 36z" fill="#4c9c5b" /><rect x="-3" y="0" width="6" height="10" fill="#7a5233" />
          </g>
        ))}

        {/* palm on the left bank */}
        <g transform="translate(-150 40) scale(0.85)"><g className="ls-palm">
          <path d="M210 640c-6-90 4-170 34-240" stroke="#8B5A33" strokeWidth="16" fill="none" strokeLinecap="round" />
          {[-60, -20, 20, 60, 100].map((a) => <path key={a} d="M244 400c40-30 90-30 130 0-40-6-90 0-130 0z" fill="#4CAF55" transform={`rotate(${a} 244 400)`} />)}
        </g>
        </g>

        {/* the pool */}
        <path d="M0 640c260-24 520-30 800-26s560 18 800 34V900H0z" fill="url(#ls-pool)" />
        <g clipPath="url(#ls-poolclip)">
          {[680, 730, 790, 850].map((y, i) => (
            <path key={y} className="ls-ripple" style={{ animationDelay: `${i * 0.7}s` }}
              d={`M-40 ${y}q60-10 120 0t120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0 120 0`} />
          ))}
        </g>
        <g transform="translate(190 0)">
        {/* the cliff and the waterfall */}
        <path d="M1120 700c10-140 20-300 60-420 30-30 100-40 190-30 70 10 120 30 150 60 50 120 60 260 80 390z" className="ls-rock" />
        <path d="M1180 280c40-26 110-30 190-20 60 8 110 26 140 52-60-14-130-20-200-20s-110 4-130-12z" className="ls-grass" />
        <path d="M1196 300h150c4 120 0 260-6 360h-140c-8-100-8-240-4-360z" fill="url(#ls-fall)" />
        <g clipPath="url(#ls-fallclip)">
          <g className="ls-fall-flow">
            {Array.from({ length: 14 }, (_, i) => (
              <path key={i} d={`M${1206 + i * 10} 200v${120 + (i % 3) * 40}`} stroke="#7cc7f2" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
            ))}
            {Array.from({ length: 14 }, (_, i) => (
              <path key={"b" + i} d={`M${1210 + i * 10} 500v${100 + (i % 4) * 30}`} stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            ))}
          </g>
        </g>
        {/* a duck sliding down the falls, round and round */}
        <g className="ls-slide"><D x={1270} y={360} s={0.36} /></g>

        {/* splash and mist where the water lands */}
        <g className="ls-splash">
          {[[1230, 660, 26], [1270, 652, 34], [1312, 662, 28], [1250, 676, 18], [1300, 680, 20]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity="0.85" style={{ animationDelay: `${i * 0.25}s` }} />
          ))}
        </g>

        {/* the duck under the falls, on a rock, getting soaked */}
        <path d="M1170 700c10-24 40-34 74-30 30 4 42 20 40 34z" className="ls-stone" />
        <D x={1222} y={692} s={0.4} className="ls-shiver" />
        </g>

        {/* lily pads and a frog-free flower */}
        <ellipse cx="420" cy="700" rx="34" ry="10" className="ls-pad" />
        <ellipse cx="470" cy="724" rx="26" ry="8" className="ls-pad" />
        <circle cx="426" cy="694" r="7" fill="#f6a5b6" />

        <Ring x={560} y={738} color="#ff8fab" />
        <Ring x={900} y={700} color="#ffd36b" delay={1.1} flip />

        {/* a duck on a lilo, sunbathing */}
        <g className="ls-bob slow">
          <rect x="640" y="788" width="190" height="26" rx="13" fill="#7fd1c4" />
          <path d="M650 796h170M650 806h170" stroke="#fff" strokeWidth="3" opacity="0.6" />
          <D x={735} y={796} s={0.34} />
        </g>

        {/* a diving duck: just the tail and feet */}
        <g className="ls-dive">
          <ellipse cx="1040" cy="772" rx="22" ry="8" className="ls-water-deep" />
          <path d="M1030 772c0-24 8-38 16-44 6 10 8 26 4 44z" fill="#FFD84D" />
          <ellipse cx="1036" cy="726" rx="8" ry="4" fill="#F39A3B" transform="rotate(-30 1036 726)" />
          <ellipse cx="1052" cy="728" rx="8" ry="4" fill="#F39A3B" transform="rotate(30 1052 728)" />
        </g>

        {/* a fish having a look */}
        <g className="ls-fish"><path d="M0 0c14-10 30-10 40 0-10 10-26 10-40 0zM40 0l12-8v16z" fill="#ffb36b" /><circle cx="10" cy="-2" r="2" fill="#2b2d38" /></g>

        {/* the near bank */}
        <path d="M0 860c200-30 420-36 640-20s420 30 520 14V900H0z" className="ls-bank" />
        <D x={120} y={868} s={0.5} className="ls-wave" />
        <D x={1460} y={872} s={0.46} flip className="ls-hop" />
      </svg>
    </div>
  );
}
