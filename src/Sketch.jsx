// A hand drawn graph card: blue pen on whiteboard axes, with the labels the
// topic needs. See sketch.js for what it is given.

import { cleanSketch, layoutSketch, pathOf } from "./sketch.js";

const HAND = '"Caveat", "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive';

export function Sketch({ spec }) {
  const s = cleanSketch(spec);
  if (!s) return null;
  const { L, R, T, B, px, py } = layoutSketch(s);
  return (
    <figure className="nt-sketch">
      <svg viewBox="0 0 300 220" role="img" aria-label={s.title || `${s.y} against ${s.x}`}>
        <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d={`M${L} ${B} L${L} ${T}`} /><path d={`M${L - 5} ${T + 8} L${L} ${T} L${L + 5} ${T + 8}`} />
          <path d={`M${L} ${B} L${R} ${B}`} /><path d={`M${R - 8} ${B - 5} L${R} ${B} L${R - 8} ${B + 5}`} />
        </g>
        {s.lines.map((l, i) => {
          const pts = l.pts.map((p) => [px(p[0]), py(p[1])]);
          const mid = pts[Math.floor(pts.length / 2)];
          return (
            <g key={i}>
              <path d={pathOf(pts, l.smooth)} fill="none" stroke="var(--accent)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={l.dashed ? "7 6" : undefined} />
              {l.label && <text x={Math.min(250, Math.max(60, mid[0]))} y={Math.max(16, mid[1] - 20)} textAnchor="middle" fontFamily={HAND} fontSize="17" fontStyle="italic" fill="var(--accent)">{l.label}</text>}
            </g>
          );
        })}
        {s.x && <text x={(L + R) / 2 + 20} y={B + 24} textAnchor="middle" fontFamily={HAND} fontSize="16" fontStyle="italic" fill="currentColor">{s.x}</text>}
        {s.y && <text transform={`translate(14 ${(T + B) / 2}) rotate(-90)`} textAnchor="middle" fontFamily={HAND} fontSize="16" fontStyle="italic" fill="currentColor">{s.y}</text>}
      </svg>
      {s.title && <figcaption>{s.title}</figcaption>}
    </figure>
  );
}
