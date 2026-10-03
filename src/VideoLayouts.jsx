// Layouts for scenes that have no object to draw: the steps of a process, two
// things compared, events in order, a line of writing taken apart, a cycle,
// or a formula and what its letters mean. They are how subjects without
// things to picture (English, history, business, maths concepts) still get a
// proper visual. Each part appears on the line that talks about it.
//
// The shapes are cleaned in api/video.js; everything is read defensively here
// because a saved video may predate a change.

const COLORS = ["blue", "green", "orange", "purple", "red"];
const col = (i) => COLORS[i % COLORS.length];
const list = (v) => (Array.isArray(v) ? v : []);
const txt = (v) => (typeof v === "string" ? v : "");
const shown = (items, line) => list(items).map((it, i) => ({ ...it, i })).filter((it) => (Number.isInteger(it.at) ? it.at : 0) <= line);
const cls = (it, line, base) => `${base} vl-c-${col(it.i)}` + ((Number.isInteger(it.at) ? it.at : 0) === line ? " vl-in" : "");

export function Layout({ layout, line }) {
  if (!layout || typeof layout !== "object") return null;
  switch (layout.type) {
    case "steps": return <Steps items={layout.items} line={line} />;
    case "compare": return <Compare layout={layout} line={line} />;
    case "timeline": return <Timeline items={layout.items} line={line} />;
    case "quote": return <Quote layout={layout} line={line} />;
    case "cycle": return <Cycle items={layout.items} line={line} />;
    case "formula": return <Formula layout={layout} line={line} />;
    default: return null;
  }
}

function Steps({ items, line }) {
  const all = list(items);
  return (
    <div className="vl vl-steps">
      {shown(all, line).map((it, k) => (
        <div key={it.i} className="vl-step-wrap">
          {k > 0 && <span className="vl-arrow" aria-hidden="true">→</span>}
          <div className={cls(it, line, "vl-card")}>
            <span className="vl-num">{it.i + 1}</span>
            {txt(it.head) && <b>{it.head}</b>}
            <span>{txt(it.text)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Compare({ layout, line }) {
  const side = (s, c) => (
    <div className={"vl-side vl-c-" + c}>
      <h4>{txt(s?.title)}</h4>
      {shown(s?.points, line).map((p) => <div key={p.i} className={"vl-point" + ((Number.isInteger(p.at) ? p.at : 0) === line ? " vl-in" : "")}>{txt(p.text)}</div>)}
    </div>
  );
  return (
    <div className="vl vl-compare">
      {side(layout.left, "blue")}
      <span className="vl-vs" aria-hidden="true">vs</span>
      {side(layout.right, "orange")}
    </div>
  );
}

function Timeline({ items, line }) {
  return (
    <div className="vl vl-timeline">
      {shown(items, line).map((it) => (
        <div key={it.i} className={cls(it, line, "vl-event")}>
          <span className="vl-when">{txt(it.head)}</span>
          <i className="vl-dot" aria-hidden="true" />
          <span className="vl-what">{txt(it.text)}</span>
        </div>
      ))}
    </div>
  );
}

// A line of writing with the techniques picked out: each marked part is
// coloured, and named beneath.
function Quote({ layout, line }) {
  const text = txt(layout.text);
  const marks = shown(layout.marks, line)
    .map((m) => ({ ...m, at0: text.indexOf(txt(m.part)) }))
    .filter((m) => m.at0 >= 0 && txt(m.part))
    .sort((a, b) => a.at0 - b.at0);
  const parts = [];
  let pos = 0;
  for (const m of marks) {
    if (m.at0 < pos) continue;
    if (m.at0 > pos) parts.push({ t: text.slice(pos, m.at0) });
    parts.push({ t: m.part, m });
    pos = m.at0 + m.part.length;
  }
  if (pos < text.length) parts.push({ t: text.slice(pos) });
  return (
    <div className="vl vl-quote">
      <blockquote>
        {parts.map((p, k) => p.m ? <mark key={k} className={"vl-mark vl-c-" + col(p.m.i) + ((Number.isInteger(p.m.at) ? p.m.at : 0) === line ? " vl-in" : "")}>{p.t}</mark> : <span key={k}>{p.t}</span>)}
      </blockquote>
      <div className="vl-labels">
        {marks.map((m) => <span key={m.i} className={cls(m, line, "vl-chip")}>{txt(m.label)}</span>)}
      </div>
    </div>
  );
}

const wrap = (s, n) => {
  const out = []; let cur = "";
  for (const w of txt(s).split(/\s+/)) { if ((cur + " " + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) out.push(cur);
  return out.slice(0, 3);
};

function Cycle({ items, line }) {
  const all = list(items).slice(0, 6);
  const n = all.length;
  if (n < 2) return null;
  const cx = 260, cy = 160, rx = 190, ry = 104;
  const at = (k) => { const a = -Math.PI / 2 + (k / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a), a]; };
  return (
    <div className="vl vl-cycle">
      <svg viewBox="0 0 520 320" role="img" aria-label="A cycle">
        <defs><marker id="vl-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.6" markerHeight="3.6" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor" /></marker></defs>
        {all.map((it, k) => {
          const [x, y] = at(k), [x2, y2] = at((k + 1) % n);
          const a1 = -Math.PI / 2 + (k / n) * Math.PI * 2, a2 = a1 + (Math.PI * 2) / n;
          const p = (a, off) => [cx + (rx + 0) * Math.cos(a + off), cy + (ry + 0) * Math.sin(a + off)];
          const [sx, sy] = p(a1, 0.3 / (n / 4)), [ex, ey] = p(a2, -0.3 / (n / 4));
          const vis = (Number.isInteger(it.at) ? it.at : 0) <= line && (Number.isInteger(all[(k + 1) % n]?.at) ? all[(k + 1) % n].at : 0) <= line;
          return vis ? <path key={"a" + k} d={`M${sx} ${sy} A${rx} ${ry} 0 0 1 ${ex} ${ey}`} className="vl-cycle-arrow" fill="none" markerEnd="url(#vl-head)" /> : null;
        })}
        {all.map((it, k) => {
          if ((Number.isInteger(it.at) ? it.at : 0) > line) return null;
          const [x, y] = at(k);
          const lines = wrap(it.text || it.head, 18);
          const h = 22 + lines.length * 17;
          return (
            <g key={k} className={"vl-node vl-c-" + col(k) + ((Number.isInteger(it.at) ? it.at : 0) === line ? " vl-in" : "")}>
              <rect x={x - 78} y={y - h / 2} width="156" height={h} rx="14" />
              {lines.map((l, j) => <text key={j} x={x} y={y - h / 2 + 24 + j * 17} textAnchor="middle">{l}</text>)}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Formula({ layout, line }) {
  return (
    <div className="vl vl-formula">
      <div className="vl-expr">{txt(layout.expr)}</div>
      <div className="vl-parts">
        {shown(layout.parts, line).map((p) => (
          <div key={p.i} className={cls(p, line, "vl-part")}>
            <b>{txt(p.sym)}</b><span>{txt(p.means)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
