// A technical graph card, like a textbook or exam board figure: bold axes
// with their labels, clear coloured curves, dashed guides down to the axes
// with the values written on them, and arrows for shifts. It always draws
// dark on white with strong colours, so it reads on every theme.
// See sketch.js for what it is given.

import { cleanSketch, layoutSketch, pathOf } from "./sketch.js";

const INK = "#111827";
const INKS = { blue: "#1d4ed8", red: "#dc2626", green: "#15803d", orange: "#c2410c", black: INK };
const ORDER = ["blue", "red", "green", "orange"];
const FONT = 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
const fmt = (v) => String(Math.round(v * 100) / 100);

export function Sketch({ spec, ...rest }) {
  const s = cleanSketch(spec);
  if (!s) return null;
  const { L, R, T, B, px, py } = layoutSketch(s);
  return (
    <figure className="nt-sketch" {...rest}>
      <svg viewBox="0 0 360 260" role="img" aria-label={s.title || `${s.y} against ${s.x}`} fontFamily={FONT}>
        <defs>
          {Object.entries(INKS).map(([k, c]) => (
            <marker key={k} id={"sk-" + k} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={c} /></marker>
          ))}
        </defs>

        {s.dots.map((d, i) => {
          const x = px(d.at[0]), y = py(d.at[1]);
          return (
            <g key={"g" + i}>
              <path d={`M${L} ${y} H${x} V${B}`} fill="none" stroke="#6b7280" strokeWidth="1.4" strokeDasharray="4 4" />
              {s.numbers && <text x={L - 7} y={y + 4} textAnchor="end" fontSize="13" fontWeight="700" fill={INK}>{fmt(d.at[1])}</text>}
              {s.numbers && <text x={x} y={B + 16} textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>{fmt(d.at[0])}</text>}
            </g>
          );
        })}

        <g stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d={`M${L} ${B} V${T + 4}`} /><path d={`M${L - 6} ${T + 12} L${L} ${T} L${L + 6} ${T + 12}`} />
          <path d={`M${L} ${B} H${R - 4}`} /><path d={`M${R - 12} ${B - 6} L${R} ${B} L${R - 12} ${B + 6}`} />
        </g>

        {s.lines.map((l, i) => {
          const pts = l.pts.map((p) => [px(p[0]), py(p[1])]);
          const ink = INKS[l.color || ORDER[i % ORDER.length]];
          // A rising line is named at its top end; a falling one a third of
          // the way along, just above the line, clear of the axes and dots.
          const rising = pts[pts.length - 1][1] < pts[0][1] - 4 && pts[pts.length - 1][0] > pts[0][0];
          const at = rising ? pts[pts.length - 1] : pts[Math.max(1, Math.floor((pts.length - 1) * 0.3))];
          const atEnd = rising;
          const lx = atEnd ? Math.min(R - 4, at[0] + 4) : at[0] + 10;
          const ly = Math.max(T + 12, at[1] - 10);
          return (
            <g key={i}>
              <path d={pathOf(pts, l.smooth)} fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={l.dashed ? "8 6" : undefined} />
              {l.label && <text x={lx} y={ly} textAnchor={atEnd ? "end" : "start"} fontSize="15" fontWeight="800" fill={ink} stroke="#fff" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">{l.label}</text>}
            </g>
          );
        })}

        {s.arrows.map((a, i) => {
          const f = [px(a.from[0]), py(a.from[1])], t = [px(a.to[0]), py(a.to[1])];
          return (
            <g key={"a" + i}>
              <path d={`M${f[0]} ${f[1]} L${t[0]} ${t[1]}`} stroke={INKS[a.color]} strokeWidth="3" strokeLinecap="round" markerEnd={`url(#sk-${a.color})`} />
              {a.label && <text x={Math.min(t[0] + 9, 356 - a.label.length * 7.6)} y={t[1] + 4} fontSize="13" fontWeight="700" fill={INKS[a.color]}>{a.label}</text>}
            </g>
          );
        })}

        {s.dots.map((d, i) => (
          <g key={"d" + i}>
            <circle cx={px(d.at[0])} cy={py(d.at[1])} r="5.5" fill={INK} stroke="#fff" strokeWidth="1.5" />
            {d.label && (() => {
              // The words stay inside the picture: on the left of the dot when
              // they would run off the right edge.
              const x = px(d.at[0]), flip = x + 9 + d.label.length * 8.6 > 356;
              return <text x={flip ? x - 9 : x + 9} y={py(d.at[1]) - 9} textAnchor={flip ? "end" : "start"} fontSize="15" fontWeight="800" fill={INK} stroke="#fff" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">{d.label}</text>;
            })()}
          </g>
        ))}

        {s.x && <text x={(L + R) / 2} y={B + 40} textAnchor="middle" fontSize="15" fontWeight="800" fill={INK}>{s.x}</text>}
        {s.y && <text transform={`translate(15 ${(T + B) / 2}) rotate(-90)`} textAnchor="middle" fontSize="15" fontWeight="800" fill={INK}>{s.y}</text>}
      </svg>
      {s.title && <figcaption>{s.title}</figcaption>}
    </figure>
  );
}
