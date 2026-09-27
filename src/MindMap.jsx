// A mind map of a set of material, built from its notes rather than asked
// for, so it is instant, free and always matches what the notes say.
//
// The title sits in the middle, the topics around it, and each topic's key
// terms around that. Every bubble can be dragged (a topic takes its ideas
// with it), bubbles push each other apart so none overlap, and the student
// can add ideas of their own under any bubble. Where things are, and the
// ideas they added, are kept on this device for each set of notes.

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
const SIZE = { root: [260, 92], topic: [210, 64], leaf: [170, 46], mine: [170, 46] };
const GAP = 16;
const keyOf = (made) => "dwiddle-mindmap:" + (made?.title || "material");
const loadSaved = (made) => { try { return JSON.parse(localStorage.getItem(keyOf(made))) || {}; } catch { return {}; } };
const newId = () => "m" + Math.random().toString(36).slice(2, 9);

// Pushes overlapping bubbles apart, a little at a time, until none touch.
// The middle never moves; "heavy" bubbles (where the student put them) give
// way only a little, so everything else moves round them.
function spread(nodes, heavy = new Set()) {
  const out = nodes.map((n) => ({ ...n }));
  const give = (n) => (n.id === "root" ? 0 : heavy.has(n.id) ? 0.1 : 1);
  for (let pass = 0; pass < 200; pass++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i], b = out[j];
        const ox = (a.w + b.w) / 2 + GAP - Math.abs(a.x - b.x);
        const oy = (a.h + b.h) / 2 + GAP - Math.abs(a.y - b.y);
        if (ox <= 0 || oy <= 0) continue;
        const ga = give(a), gb = give(b);
        if (!ga && !gb) continue;
        moved = true;
        const sa = ga / (ga + gb), sb = gb / (ga + gb);
        // push along whichever way needs the smaller move
        if (ox < oy) {
          const d = (a.x < b.x ? -1 : 1) * (ox + 0.5);
          a.x += d * sa; b.x -= d * sb;
        } else {
          const d = (a.y < b.y ? -1 : 1) * (oy + 0.5);
          a.y += d * sa; b.y -= d * sb;
        }
      }
    }
    if (!moved) break;
  }
  return out;
}

export function MindMap({ made, onClose }) {
  const topics = useMemo(() => made?.topics || [], [made]);
  const [saved, setSaved] = useState(() => loadSaved(made)); // { pos, mine, open }
  const save = (next) => { setSaved(next); try { localStorage.setItem(keyOf(made), JSON.stringify(next)); } catch { /* private mode */ } };
  const open = useMemo(() => new Set(saved.open || topics.slice(0, 8).map((t) => "t:" + t.name)), [saved.open, topics]);
  const [sel, setSel] = useState(null);
  const [adding, setAdding] = useState("");
  const fitK = Math.min(1.15, 10 / Math.max(8, (made?.topics || []).length + 2));
  const [view, setView] = useState({ x: 0, y: 0, k: fitK });
  const [live, setLive] = useState(null); // positions while dragging: { id: [x, y] }
  const panning = useRef(null);
  const dragging = useRef(null);
  const box = useRef(null);
  const svg = useRef(null);

  // Every bubble, where the notes would put it, then moved to where the
  // student left it, then spread so nothing overlaps.
  const nodes = useMemo(() => {
    const list = [{ id: "root", kind: "root", label: made?.title || "Mind map", x: 0, y: 0, color: "#1b1d26" }];
    const n = topics.length || 1;
    const R = 300 + Math.max(0, n - 5) * 45;
    topics.forEach((t, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = Math.cos(a) * R, y = Math.sin(a) * R * 0.82, color = COLORS[i % COLORS.length], id = "t:" + t.name;
      list.push({ id, kind: "topic", label: t.name, x, y, color, parent: "root" });
      if (!open.has(id)) return;
      const kids = branchesOf(made?.notes?.[t.name]);
      const fan = Math.min(1.7, 0.3 * kids.length);
      kids.forEach((k, j) => {
        const b = a + (kids.length > 1 ? (j / (kids.length - 1) - 0.5) * fan : 0);
        const r = 190 + (j % 2) * 95;
        list.push({ id: `l:${t.name}:${k.label}`, kind: "leaf", label: k.label, detail: k.detail, x: x + Math.cos(b) * r, y: y + Math.sin(b) * r * 0.78, color, parent: id, topic: t.name });
      });
    });
    // the student's own ideas, beside whatever they belong to
    for (const m of saved.mine || []) {
      const p = list.find((x) => x.id === m.parent);
      if (!p) continue;
      list.push({ id: m.id, kind: "mine", label: m.label, x: p.x + (p.x >= 0 ? 190 : -190), y: p.y + 60, color: p.kind === "root" ? "#64748b" : p.color, parent: p.id, topic: p.topic || (p.kind === "topic" ? p.label : undefined) });
    }
    for (const nd of list) {
      const s = saved.pos?.[nd.id];
      if (s) { nd.x = s[0]; nd.y = s[1]; }
      [nd.w, nd.h] = SIZE[nd.kind];
    }
    return spread(list, new Set(Object.keys(saved.pos || {})));
  }, [topics, made, open, saved.mine, saved.pos]);

  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const at = (n) => live?.[n.id] || [n.x, n.y];

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !e.target.closest?.("input")) (sel ? setSel(null) : onClose()); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose, sel]);

  useEffect(() => {
    const el = box.current;
    const onWheel = (e) => { e.preventDefault(); setView((v) => ({ ...v, k: Math.max(0.35, Math.min(2.5, v.k * (e.deltaY < 0 ? 1.1 : 0.9))) })); };
    el?.addEventListener("wheel", onWheel, { passive: false });
    return () => el?.removeEventListener("wheel", onWheel);
  }, []);

  // Screen pixels per map unit, whatever the zoom.
  const unit = () => (svg.current?.getScreenCTM()?.a || 1) * view.k;
  // A bubble and everything under it, so a topic takes its ideas along.
  const family = (id) => {
    const out = [id];
    for (let i = 0; i < out.length; i++) nodes.forEach((n) => { if (n.parent === out[i]) out.push(n.id); });
    return out;
  };

  const down = (e, n) => {
    e.stopPropagation();
    box.current?.setPointerCapture?.(e.pointerId);
    dragging.current = { id: n.id, sx: e.clientX, sy: e.clientY, moved: false, ids: n.kind === "root" ? [] : family(n.id) };
  };
  const move = (e) => {
    const d = dragging.current;
    if (d) {
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
      d.moved = true;
      const dx = (e.clientX - d.sx) / unit(), dy = (e.clientY - d.sy) / unit();
      setLive(Object.fromEntries(d.ids.map((id) => [id, [byId[id].x + dx, byId[id].y + dy]])));
      return;
    }
    const p = panning.current;
    if (!p) return;
    const k = unit() / view.k;
    setView((v) => ({ ...v, x: v.x + (e.clientX - p.x) / k, y: v.y + (e.clientY - p.y) / k }));
    panning.current = { x: e.clientX, y: e.clientY };
  };
  const up = () => {
    const d = dragging.current;
    dragging.current = null;
    panning.current = null;
    if (!d) return;
    if (!d.moved) {
      // a tap: open or close a topic, and pick the bubble
      const n = byId[d.id];
      if (n.kind === "topic") {
        const next = new Set(open);
        next.has(n.id) ? next.delete(n.id) : next.add(n.id);
        save({ ...saved, open: [...next] });
      }
      setSel(n.id);
      return;
    }
    // a drop: keep where it went, then spread everything else around it
    const pos = { ...(saved.pos || {}) };
    for (const [id, p] of Object.entries(live || {})) pos[id] = p;
    const settled = spread(nodes.map((n) => (pos[n.id] ? { ...n, x: pos[n.id][0], y: pos[n.id][1] } : n)), new Set([d.id]));
    for (const n of settled) if (n.id !== "root") pos[n.id] = [Math.round(n.x), Math.round(n.y)];
    setLive(null);
    save({ ...saved, pos });
  };

  const addIdea = () => {
    const label = adding.trim().slice(0, 60);
    if (!label) return;
    const parent = sel && byId[sel] ? sel : "root";
    save({ ...saved, mine: [...(saved.mine || []), { id: newId(), label, parent }] });
    setAdding("");
  };
  const renameIdea = (id) => {
    const m = (saved.mine || []).find((x) => x.id === id);
    const label = prompt("Rename this idea:", m?.label || "");
    if (label?.trim()) save({ ...saved, mine: saved.mine.map((x) => (x.id === id ? { ...x, label: label.trim().slice(0, 60) } : x)) });
  };
  const deleteIdea = (id) => {
    const gone = new Set(family(id));
    const pos = { ...(saved.pos || {}) };
    gone.forEach((g) => delete pos[g]);
    save({ ...saved, pos, mine: (saved.mine || []).filter((x) => !gone.has(x.id)) });
    setSel(null);
  };

  const picked = sel && byId[sel];
  const pickedColor = picked?.color === "#1b1d26" ? "#3B5BFD" : picked?.color;

  return (
    <Portal>
      <div className="mm" role="dialog" aria-modal="true" aria-label="Mind map">
        <div className="mm-bar">
          <b>{made?.title || "Mind map"}</b>
          <span className="small muted">Drag bubbles to move them. Tap a topic to open or close it, or any bubble to add your own idea under it.</span>
          <div className="mm-actions">
            <button className="btn ghost small" onClick={() => save({ ...saved, open: topics.map((t) => "t:" + t.name) })}>Open all</button>
            <button className="btn ghost small" onClick={() => save({ ...saved, open: [] })}>Close all</button>
            <button className="btn ghost small" onClick={() => { if (confirm("Put every bubble back where it started? Your own ideas are kept.")) save({ ...saved, pos: {} }); }}>Reset layout</button>
            <button className="btn ghost small" onClick={() => setView({ x: 0, y: 0, k: fitK })}>Centre</button>
            <button className="icon-btn" onClick={onClose} aria-label="Close the mind map"><Icon name="close" size={18} /></button>
          </div>
        </div>
        <div className="mm-stage" ref={box}
          onPointerDown={(e) => { if (e.target.closest(".mm-node, .mm-detail")) return; setSel(null); panning.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture?.(e.pointerId); }}
          onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <svg ref={svg} className="mm-svg" viewBox="-820 -660 1640 1320">
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {nodes.filter((n) => n.parent && byId[n.parent]).map((n) => {
                const [x, y] = at(n), [px, py] = at(byId[n.parent]);
                const thick = n.kind === "topic";
                return <path key={"e" + n.id} d={`M${px} ${py} Q ${(px + x) / 2} ${thick ? py + (y - py) * 0.1 : py} ${x} ${y}`} stroke={n.color} strokeWidth={thick ? 5 : 2.5}
                  fill="none" strokeLinecap="round" opacity={thick ? 0.55 : 0.45} strokeDasharray={n.kind === "mine" ? "6 6" : undefined} />;
              })}
              {nodes.map((n) => {
                const [x, y] = at(n);
                return (
                  <foreignObject key={n.id} x={x - n.w / 2} y={y - n.h / 2} width={n.w} height={n.h} className={n.kind === "leaf" ? "mm-in" : ""}>
                    <div className={"mm-node mm-" + n.kind + (sel === n.id ? " on" : "")}
                      style={n.kind === "topic" ? { borderColor: n.color, color: n.color } : { "--c": n.color }}
                      onPointerDown={(e) => down(e, n)}>
                      {n.label}
                    </div>
                  </foreignObject>
                );
              })}
              {/* the open and close badge on topics: drawn by the SVG itself, since Safari
                  misplaces anything positioned inside a bubble */}
              {nodes.filter((n) => n.kind === "topic").map((n) => {
                const kids = branchesOf(made?.notes?.[n.label]).length;
                if (!kids) return null;
                const [x, y] = at(n), cx = x + n.w / 2 - 4, cy = y - n.h / 2 + 4;
                return (
                  <g key={"b" + n.id} pointerEvents="none">
                    <circle cx={cx} cy={cy} r="11" fill={n.color} />
                    <text x={cx} y={cy + 4.5} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#fff" fontFamily="Inter, system-ui, sans-serif">{open.has(n.id) ? "\u2212" : kids}</text>
                  </g>
                );
              })}
            </g>
          </svg>
          {picked && (
            <div className="mm-detail" style={{ borderColor: pickedColor }}>
              {picked.topic && <span className="qv-label" style={{ color: pickedColor }}>{picked.topic}</span>}
              <b>{picked.label}</b>
              {picked.kind === "leaf" && <p>{picked.detail || "Open the notes for more on this."}</p>}
              {picked.kind === "mine" && <p>Your own idea.</p>}
              <form className="mm-add" onSubmit={(e) => { e.preventDefault(); addIdea(); }}>
                <input type="text" value={adding} maxLength={60} placeholder={`Add an idea under "${picked.label.slice(0, 24)}"`} onChange={(e) => setAdding(e.target.value)} />
                <button className="btn small" type="submit" disabled={!adding.trim()}>Add</button>
              </form>
              <div className="row" style={{ gap: 6 }}>
                {picked.kind === "mine" && <button className="btn ghost small" onClick={() => renameIdea(picked.id)}>Rename</button>}
                {picked.kind === "mine" && <button className="btn ghost small" style={{ color: "var(--warn)" }} onClick={() => deleteIdea(picked.id)}>Delete</button>}
                <button className="btn ghost small" onClick={() => setSel(null)}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
