// A mind map of a set of material, built from its notes rather than asked
// for, so it is instant, free and always matches what the notes say.
//
// The title sits in the middle, the topics around it, and each topic's key
// terms around that. Clicking a topic opens or closes its branch; clicking a
// term shows what the notes say it means. Drag to move around, scroll or
// pinch to zoom.

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, Portal } from "./ui.jsx";

const flat = (t) => String(t || "").replace(/\{(?:def|key|exam)\|([^{}]*)\}/g, "$1");

// Up to six terms a topic: its defined terms first, then its subheadings,
// then the phrases its notes mark as key.
function branchesOf(blocks = []) {
  const out = [];
  const add = (label, detail) => {
    const l = flat(label).trim();
    if (l && l.length < 48 && !out.some((o) => o.label.toLowerCase() === l.toLowerCase())) out.push({ label: l, detail: flat(detail).trim() });
  };
  blocks.forEach((b) => { if (b.term) add(b.term, b.def); });
  blocks.forEach((b, i) => { if (b.h) add(b.h, blocks[i + 1] ? Object.values(blocks[i + 1])[0] : ""); });
  blocks.forEach((b) => {
    const text = typeof b.p === "string" ? b.p : Array.isArray(b.list) ? b.list.join(" ") : "";
    for (const m of text.matchAll(/\{key\|([^{}]*)\}/g)) add(m[1], text);
  });
  return out.slice(0, 6);
}

const COLORS = ["#3B5BFD", "#D1497A", "#16a34a", "#f59e0b", "#9333ea", "#0891b2", "#e5484d", "#64748b"];

export function MindMap({ made, onClose }) {
  const topics = made?.topics || [];
  const [open, setOpen] = useState(() => new Set(topics.slice(0, 8).map((t) => t.name)));
  const [detail, setDetail] = useState(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const dragging = useRef(null);
  const box = useRef(null);

  const layout = useMemo(() => {
    const n = topics.length || 1;
    const R = 240 + Math.max(0, n - 6) * 18;
    return topics.map((t, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = Math.cos(a) * R, y = Math.sin(a) * R * 0.82;
      const kids = branchesOf(made?.notes?.[t.name]);
      // A wide fan, with alternate terms on an outer ring, so six labels
      // side by side still clear each other.
      const spread = Math.min(2.4, 0.46 * kids.length);
      const leaves = kids.map((k, j) => {
        const b = a + (kids.length > 1 ? (j / (kids.length - 1) - 0.5) * spread : 0);
        const r = 200 + (j % 2) * 85;
        return { ...k, x: x + Math.cos(b) * r, y: y + Math.sin(b) * r * 0.78 };
      });
      return { name: t.name, x, y, a, color: COLORS[i % COLORS.length], leaves };
    });
  }, [topics, made]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") (detail ? setDetail(null) : onClose()); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose, detail]);

  const onWheel = (e) => {
    e.preventDefault();
    setView((v) => ({ ...v, k: Math.max(0.35, Math.min(2.5, v.k * (e.deltaY < 0 ? 1.1 : 0.9))) }));
  };
  useEffect(() => {
    const el = box.current;
    el?.addEventListener("wheel", onWheel, { passive: false });
    return () => el?.removeEventListener("wheel", onWheel);
  }, []);

  const toggle = (name) => setOpen((s) => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });

  return (
    <Portal>
      <div className="mm" role="dialog" aria-modal="true" aria-label="Mind map">
        <div className="mm-bar">
          <b>{made?.title || "Mind map"}</b>
          <span className="small muted">Click a topic to open or close it, a term to see what it means. Drag to move, scroll to zoom.</span>
          <div className="mm-actions">
            <button className="btn ghost small" onClick={() => setOpen(new Set(topics.map((t) => t.name)))}>Open all</button>
            <button className="btn ghost small" onClick={() => setOpen(new Set())}>Close all</button>
            <button className="btn ghost small" onClick={() => setView({ x: 0, y: 0, k: 1 })}>Centre</button>
            <button className="icon-btn" onClick={onClose} aria-label="Close the mind map"><Icon name="close" size={18} /></button>
          </div>
        </div>
        <div className="mm-stage" ref={box}
          onPointerDown={(e) => { if (e.target.closest(".mm-node")) return; dragging.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture?.(e.pointerId); }}
          onPointerMove={(e) => {
            if (!dragging.current) return;
            const dx = e.clientX - dragging.current.x, dy = e.clientY - dragging.current.y;
            dragging.current = { x: e.clientX, y: e.clientY };
            setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
          }}
          onPointerUp={() => { dragging.current = null; }}>
          <svg className="mm-svg" viewBox="-820 -660 1640 1320">
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {layout.map((t) => (
                <g key={t.name}>
                  <path d={`M0 0 Q ${t.x * 0.5} ${t.y * 0.1} ${t.x} ${t.y}`} stroke={t.color} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.55" />
                  {open.has(t.name) && t.leaves.map((l) => (
                    <path key={l.label} d={`M${t.x} ${t.y} Q ${(t.x + l.x) / 2} ${t.y} ${l.x} ${l.y}`} stroke={t.color} strokeWidth="2.5" fill="none" opacity="0.45" className="mm-in" />
                  ))}
                </g>
              ))}
              <foreignObject x="-130" y="-46" width="260" height="92">
                <div className="mm-node mm-root">{made?.title}</div>
              </foreignObject>
              {layout.map((t) => (
                <g key={t.name}>
                  <foreignObject x={t.x - 105} y={t.y - 32} width="210" height="64">
                    <button className="mm-node mm-topic" style={{ borderColor: t.color, color: t.color }} onClick={() => toggle(t.name)}>
                      {t.name}{t.leaves.length > 0 && <span className="mm-count" style={{ background: t.color }}>{open.has(t.name) ? "−" : t.leaves.length}</span>}
                    </button>
                  </foreignObject>
                  {open.has(t.name) && t.leaves.map((l) => (
                    <foreignObject key={l.label} x={l.x - 80} y={l.y - 22} width="160" height="44" className="mm-in">
                      <button className="mm-node mm-leaf" style={{ "--c": t.color }} onClick={() => setDetail({ ...l, topic: t.name, color: t.color })}>{l.label}</button>
                    </foreignObject>
                  ))}
                </g>
              ))}
            </g>
          </svg>
          {detail && (
            <div className="mm-detail" style={{ borderColor: detail.color }}>
              <span className="qv-label" style={{ color: detail.color }}>{detail.topic}</span>
              <b>{detail.label}</b>
              <p>{detail.detail || "Open the notes for more on this."}</p>
              <button className="btn ghost small" onClick={() => setDetail(null)}>Close</button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
