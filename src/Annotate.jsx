// Highlighting and notes on a reading passage, the way the computer delivered
// IELTS does it: select some words, right click, and choose Highlight or
// Notes. A note is attached to its words, marked with a small tab, and opens
// when the highlight is clicked.
//
// Highlights are kept as character positions in the passage, not as changes
// to the page, so React can redraw the passage without losing them, and they
// last for the rest of the test (in this tab), as they would on the day.

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, Portal } from "./ui.jsx";

const KEY = "dwiddle-annotations";

function hashOf(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
function loadAll() { try { return JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch { return {}; } }
function saveAll(all) { try { sessionStorage.setItem(KEY, JSON.stringify(all)); } catch {} }

// Character offset of a point in the container, counting text only.
function offsetOf(container, node, offset) {
  const r = document.createRange();
  r.selectNodeContents(container);
  r.setEnd(node, offset);
  return r.toString().length;
}

export function AnnotatedText({ text, className = "" }) {
  const id = useMemo(() => hashOf(String(text || "")), [text]);
  const [marks, setMarks] = useState(() => loadAll()[id] || []);
  const [open, setOpen] = useState(null); // { mark, x, y, fresh }
  const box = useRef(null);

  useEffect(() => { const all = loadAll(); all[id] = marks; saveAll(all); }, [id, marks]);

  // The right click menu asks for these through an event on the passage.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onAction = (e) => {
      const { action, range, markId, x, y } = e.detail || {};
      if (action === "remove") { setMarks((m) => m.filter((k) => k.id !== markId)); return; }
      if (action === "note-existing") {
        const mark = marks.find((k) => k.id === markId);
        if (mark) setOpen({ mark, x, y });
        return;
      }
      if (!range || !el.contains(range.startContainer) || !el.contains(range.endContainer)) return;
      let start = offsetOf(el, range.startContainer, range.startOffset);
      let end = offsetOf(el, range.endContainer, range.endOffset);
      if (end <= start) return;
      // Trim spaces off the ends, which a double click tends to include.
      const t = String(text);
      while (start < end && /\s/.test(t[start])) start++;
      while (end > start && /\s/.test(t[end - 1])) end--;
      if (end <= start) return;
      const mark = { id: Math.random().toString(36).slice(2, 9), start, end, note: "" };
      // A new highlight replaces any it overlaps, so marks never nest.
      setMarks((m) => [...m.filter((k) => k.end <= start || k.start >= end), mark].sort((a, b) => a.start - b.start));
      window.getSelection()?.removeAllRanges();
      if (action === "note") setOpen({ mark, x, y, fresh: true });
    };
    el.addEventListener("ann:action", onAction);
    return () => el.removeEventListener("ann:action", onAction);
  }, [marks, text]);

  const t = String(text || "");
  const pieces = [];
  let at = 0;
  marks.forEach((m) => {
    if (m.start > at) pieces.push(<span key={"t" + at}>{t.slice(at, m.start)}</span>);
    pieces.push(
      <mark key={m.id} className={"ann" + (m.note ? " has-note" : "")} data-mark={m.id}
        title={m.note || undefined}
        onClick={(e) => { if (m.note) { const r = e.currentTarget.getBoundingClientRect(); setOpen({ mark: m, x: r.left, y: r.bottom }); } }}>
        {t.slice(m.start, m.end)}
        {m.note && <sup className="ann-tab" aria-label="Has a note"><Icon name="note" size={10} /></sup>}
      </mark>,
    );
    at = m.end;
  });
  if (at < t.length) pieces.push(<span key={"t" + at}>{t.slice(at)}</span>);

  function saveNote(note) {
    setMarks((m) => m.map((k) => (k.id === open.mark.id ? { ...k, note } : k)));
    setOpen(null);
  }

  return (
    <>
      <div className={className} data-annotate ref={box}>{pieces}</div>
      {marks.length > 0 && (
        <div className="ann-bar">
          <span className="small muted">{marks.length} highlight{marks.length === 1 ? "" : "s"}{marks.some((m) => m.note) ? `, ${marks.filter((m) => m.note).length} with notes` : ""}</span>
          <button className="btn quiet small" onClick={() => setMarks([])}>Clear all</button>
        </div>
      )}
      {open && <NotePopover mark={open.mark} x={open.x} y={open.y} fresh={open.fresh} words={t.slice(open.mark.start, open.mark.end)}
        onSave={saveNote} onClose={() => { if (open.fresh && !open.mark.note) { /* keep the highlight */ } setOpen(null); }}
        onRemove={() => { setMarks((m) => m.filter((k) => k.id !== open.mark.id)); setOpen(null); }} />}
    </>
  );
}

function NotePopover({ mark, x, y, words, onSave, onClose, onRemove }) {
  const [note, setNote] = useState(mark.note || "");
  const area = useRef(null);
  useEffect(() => { area.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose]);
  const left = Math.max(12, Math.min((x || 0), window.innerWidth - 332));
  const top = Math.min((y || 0) + 8, window.innerHeight - 250);
  return (
    <Portal>
      <div className="ann-scrim" onMouseDown={onClose} />
      <div className="ann-pop" style={{ left, top }} role="dialog" aria-label="Note">
        <span className="ann-pop-words">"{words.length > 70 ? words.slice(0, 67) + "..." : words}"</span>
        <textarea ref={area} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Your note"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave(note.trim()); }} />
        <div className="ann-pop-actions">
          <button className="btn quiet small" onClick={onRemove}>Remove highlight</button>
          <button className="btn cta small" onClick={() => onSave(note.trim())}>Save note</button>
        </div>
      </div>
    </Portal>
  );
}
