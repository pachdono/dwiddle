// Dwiddle's own right click menu, in place of the browser's.
//
// What it offers depends on where the click was: in a reading passage, the
// highlighter and notes; on selected text, copying it or asking Dwiddle about
// it; in a text box, cut, copy and paste; and always the few things worth
// having anywhere, going back, full screen and reloading. Holding Shift gives
// the browser's own menu, for anything this one does not cover.

import { useEffect, useRef, useState } from "react";
import { Icon, Portal } from "./ui.jsx";
import { openDwiddle } from "./Chat.jsx";
import { DuckParts } from "./Duck.jsx";

/* ---------- full screen ---------- */

export const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
export function toggleFullscreen() {
  const el = document.documentElement;
  if (isFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
  else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el).catch?.(() => {});
}
export function useFullscreen() {
  const [on, setOn] = useState(isFullscreen());
  useEffect(() => {
    const sync = () => setOn(isFullscreen());
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    // Ctrl or Cmd, with Shift and F, from anywhere.
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") { e.preventDefault(); toggleFullscreen(); }
    };
    addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      removeEventListener("keydown", onKey);
    };
  }, []);
  return on;
}

export function FullscreenButton({ className = "icon-btn" }) {
  const on = useFullscreen();
  if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) return null;
  return (
    <button className={className} onClick={toggleFullscreen} title={on ? "Exit full screen (Ctrl Shift F)" : "Full screen (Ctrl Shift F)"}
      aria-label={on ? "Exit full screen" : "Full screen"}>
      <Icon name={on ? "shrink" : "expand"} size={16} />
    </button>
  );
}

/* ---------- the menu ---------- */

const mac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
const key = (k) => (mac ? `⌘${k}` : `Ctrl+${k}`);

export function ContextMenu() {
  const [menu, setMenu] = useState(null); // { x, y, items }
  const box = useRef(null);

  useEffect(() => {
    const onMenu = (e) => {
      if (e.shiftKey) return; // the browser's own menu, on purpose
      const target = e.target instanceof Element ? e.target : e.target?.parentElement;
      if (!target || target.closest("[data-native-menu]")) return;

      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      const range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      const field = target.closest("input, textarea, [contenteditable='true']");
      const passage = target.closest("[data-annotate]");
      const mark = target.closest("mark.ann");
      if (!(matchMedia("(pointer: coarse)").matches && !(passage && (text || mark)))) e.preventDefault();
      // On a touch screen a long press belongs to the phone's own selection
      // and copy menu, except in a passage, where it is how you highlight.
      if (matchMedia("(pointer: coarse)").matches && !(passage && (text || mark))) return;
      const items = [];
      const x = e.clientX, y = e.clientY;
      const tell = (action, extra = {}) => passage.dispatchEvent(new CustomEvent("ann:action", { detail: { action, range, x, y, ...extra } }));

      if (passage && mark) {
        items.push({ icon: "note", label: mark.classList.contains("has-note") ? "Edit note" : "Add a note", run: () => tell("note-existing", { markId: mark.dataset.mark }) });
        items.push({ icon: "close", label: "Remove highlight", run: () => tell("remove", { markId: mark.dataset.mark }) });
        items.push("-");
      } else if (passage && text) {
        items.push({ icon: "marker", label: "Highlight", run: () => tell("highlight") });
        items.push({ icon: "note", label: "Highlight and add a note", run: () => tell("note") });
        items.push("-");
      }

      if (field) {
        const editable = !field.readOnly && !field.disabled;
        const hasSel = field.selectionStart !== field.selectionEnd || !!text;
        if (editable) items.push({ icon: "cut", label: "Cut", hint: key("X"), disabled: !hasSel, run: () => { field.focus(); document.execCommand("cut"); } });
        items.push({ icon: "copy", label: "Copy", hint: key("C"), disabled: !hasSel, run: () => { field.focus(); document.execCommand("copy"); } });
        if (editable) items.push({ icon: "paste", label: "Paste", hint: key("V"), run: async () => {
          field.focus();
          try {
            const clip = await navigator.clipboard.readText();
            if (!document.execCommand("insertText", false, clip)) field.value += clip;
          } catch { document.execCommand("paste"); }
        } });
        items.push({ icon: "selectall", label: "Select all", hint: key("A"), run: () => { field.focus(); field.select?.(); } });
        items.push("-");
      } else if (text) {
        items.push({ icon: "copy", label: "Copy", hint: key("C"), run: () => navigator.clipboard?.writeText(text).catch(() => document.execCommand("copy")) });
        items.push({ duck: true, label: "Ask Dwiddle about this", run: () => openDwiddle(undefined, {
          ask: `Explain this: "${text.length > 400 ? text.slice(0, 400) + "..." : text}"`,
        }) });
        items.push("-");
      }

      if (history.length > 1) items.push({ icon: "back", label: "Back", run: () => history.back() });
      if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
        items.push({ icon: isFullscreen() ? "shrink" : "expand", label: isFullscreen() ? "Exit full screen" : "Full screen", hint: mac ? "⌘⇧F" : "Ctrl+Shift+F", run: toggleFullscreen });
      }
      items.push({ icon: "refresh", label: "Reload", hint: key("R"), run: () => location.reload() });

      while (items[items.length - 1] === "-") items.pop();
      setMenu({ x, y, items });
    };
    const close = () => setMenu(null);
    document.addEventListener("contextmenu", onMenu);
    addEventListener("blur", close);
    addEventListener("resize", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("contextmenu", onMenu);
      removeEventListener("blur", close);
      removeEventListener("resize", close);
      document.removeEventListener("scroll", close, true);
    };
  }, []);

  // Kept inside the window, flipping to the other side near an edge.
  useEffect(() => {
    const el = box.current;
    if (!menu || !el) return;
    const r = el.getBoundingClientRect();
    const left = menu.x + r.width > innerWidth - 8 ? Math.max(8, menu.x - r.width) : menu.x;
    const top = menu.y + r.height > innerHeight - 8 ? Math.max(8, menu.y - r.height) : menu.y;
    el.style.left = left + "px";
    el.style.top = top + "px";
    el.style.visibility = "visible";
    el.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => {
      if (e.key === "Escape") { setMenu(null); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const list = [...box.current.querySelectorAll("button:not(:disabled)")];
        const at = list.indexOf(document.activeElement);
        list[(at + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]?.focus();
      }
    };
    const onDown = (e) => { if (!box.current?.contains(e.target)) setMenu(null); };
    addEventListener("keydown", onKey);
    addEventListener("mousedown", onDown, true);
    return () => { removeEventListener("keydown", onKey); removeEventListener("mousedown", onDown, true); };
  }, [menu]);

  if (!menu) return null;
  return (
    <Portal>
      <div className="cm" ref={box} role="menu" style={{ left: menu.x, top: menu.y, visibility: "hidden" }}>
        {menu.items.map((it, i) => it === "-"
          ? <div key={i} className="cm-sep" role="separator" />
          : (
            <button key={i} role="menuitem" className="cm-item" disabled={it.disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setMenu(null); it.run(); }}>
              <span className="cm-icon">{it.duck ? <DuckDot /> : <Icon name={it.icon} size={15} />}</span>
              <span className="cm-label">{it.label}</span>
              {it.hint && <span className="cm-hint">{it.hint}</span>}
            </button>
          ))}
      </div>
    </Portal>
  );
}

function DuckDot() {
  return <svg width="16" height="16" viewBox="20 3 88 88" aria-hidden="true"><DuckParts /></svg>;
}
