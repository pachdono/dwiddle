// A graph drawn from a lesson's own numbers: a line through its corner points,
// axes with ticks and labels, the marked values, and the area under it shaded
// when that is what the lesson is about. Everything is plain SVG in the theme's
// colours, so it reads in light and dark, and it arrives with the lesson, with
// nothing to wait for.

const niceStep = (span, n = 5) => {
  const raw = (span || 1) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
};
const ticksTo = (lo, hi, step) => { const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(+v.toFixed(10)); return out; };
const fmt = (v) => String(+v.toFixed(2));

export function LessonFigure({ fig }) {
  if (!fig || !Array.isArray(fig.points) || fig.points.length < 2) return null;
  const W = 640, H = 340, L = 78, R = 26, T = 40, B = 64;
  const xs = fig.points.map((p) => p[0]), ys = fig.points.map((p) => p[1]);
  const x0 = Math.min(0, ...xs), y0 = Math.min(0, ...ys);
  const sx = niceStep(Math.max(...xs) - x0), sy = niceStep(Math.max(...ys) - y0);
  const x1 = Math.max(sx, Math.ceil(Math.max(...xs) / sx) * sx), y1 = Math.max(sy, Math.ceil(Math.max(...ys) / sy) * sy);
  const X = (x) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const Y = (y) => H - B - ((y - y0) / (y1 - y0)) * (H - T - B);
  const line = fig.points.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" ");
  const area = `${X(fig.points[0][0]).toFixed(1)},${Y(0).toFixed(1)} ${line} ${X(fig.points[fig.points.length - 1][0]).toFixed(1)},${Y(0).toFixed(1)}`;
  const marks = fig.marks?.length ? fig.marks : [];
  return (
    <figure className="lf" role="img" aria-label={fig.title || `${fig.yLabel || "y"} against ${fig.xLabel || "x"}`}>
      {fig.title && <figcaption className="lf-title">{fig.title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} className="lf-svg">
        {ticksTo(y0, y1, sy).map((v) => <line key={"gy" + v} x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className="lf-grid" />)}
        {ticksTo(x0, x1, sx).map((v) => <line key={"gx" + v} x1={X(v)} x2={X(v)} y1={T} y2={H - B} className="lf-grid" />)}
        {fig.shade && <polygon points={area} className="lf-area" />}
        <line x1={L} x2={L} y1={T - 6} y2={H - B} className="lf-axis" />
        <line x1={L} x2={W - R + 6} y1={H - B} y2={H - B} className="lf-axis" />
        {ticksTo(y0, y1, sy).map((v) => <text key={"ty" + v} x={L - 10} y={Y(v) + 5} textAnchor="end" className="lf-t">{fmt(v)}</text>)}
        {ticksTo(x0, x1, sx).map((v) => <text key={"tx" + v} x={X(v)} y={H - B + 22} textAnchor="middle" className="lf-t">{fmt(v)}</text>)}
        <polyline points={line} className="lf-line" pathLength="1" />
        {marks.map((m, i) => (
          <g key={i}>
            <line x1={X(m.x)} x2={X(m.x)} y1={Y(m.y)} y2={H - B} className="lf-guide" />
            <line x1={L} x2={X(m.x)} y1={Y(m.y)} y2={Y(m.y)} className="lf-guide" />
            <circle cx={X(m.x)} cy={Y(m.y)} r="5" className="lf-dot" />
            {m.label && <text x={X(m.x) + 9} y={Y(m.y) - 10} className="lf-label">{m.label}</text>}
          </g>
        ))}
        <text x={(L + W - R) / 2} y={H - 12} textAnchor="middle" className="lf-axisname">{fig.xLabel}</text>
        <text transform={`translate(18 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" className="lf-axisname">{fig.yLabel}</text>
      </svg>
    </figure>
  );
}
