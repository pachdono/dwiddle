// Stickers for notebook pages: the Dwiddle characters, cute doodles and
// little labels for marking up notes. A sticker goes on the page as a
// picture, so it moves, resizes and rotates like one.

import { useRef, useState } from "react";
import { CHARACTERS, DuckAvatar } from "./DuckAvatars.jsx";

// A white die cut edge and a soft shadow round anything, the way a real
// sticker looks.
const cut = (inner, view = "0 0 100 100") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" width="200" height="200">
<defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="d"/><feFlood flood-color="#fff"/><feComposite in2="d" operator="in" result="w"/><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#5a3c46" flood-opacity="0.28"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<g filter="url(#s)">${inner}</g></svg>`;

const label = (text, bg, ink = "#3a2f3a") => cut(`<rect x="6" y="30" width="88" height="40" rx="20" fill="${bg}"/><text x="50" y="57" text-anchor="middle" font-family="Caveat, 'Patrick Hand', cursive" font-weight="700" font-size="26" fill="${ink}">${text}</text>`);

export const DOODLES = [
  ["Star", cut('<path d="M50 8l11 26 28 2-21 18 7 28-25-15-25 15 7-28-21-18 28-2z" fill="#FFD36B"/>')],
  ["Heart", cut('<path d="M50 86C20 64 8 46 12 30c4-15 25-20 38-4 13-16 34-11 38 4 4 16-8 34-38 56z" fill="#F6A5B6"/>')],
  ["Flower", cut(`${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="28" rx="16" ry="22" fill="#D7CCF2" transform="rotate(${a} 50 50)"/>`).join("")}<circle cx="50" cy="50" r="13" fill="#FFD36B"/>`)],
  ["Sparkles", cut('<path d="M40 12c3 18 10 25 28 28-18 3-25 10-28 28-3-18-10-25-28-28 18-3 25-10 28-28z" fill="#A9D3F0"/><path d="M74 56c2 9 5 12 14 14-9 2-12 5-14 14-2-9-5-12-14-14 9-2 12-5 14-14z" fill="#FFD36B"/>')],
  ["Cloud", cut('<path d="M28 72a16 16 0 0 1 2-32 22 22 0 0 1 42-6 16 16 0 0 1 8 38z" fill="#EAF4FC"/><circle cx="40" cy="56" r="3" fill="#3a2f3a"/><circle cx="60" cy="56" r="3" fill="#3a2f3a"/><path d="M45 63q5 4 10 0" stroke="#3a2f3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>')],
  ["Rainbow", cut('<path d="M12 74a38 38 0 0 1 76 0" stroke="#F6A5B6" stroke-width="9" fill="none"/><path d="M22 74a28 28 0 0 1 56 0" stroke="#FFD36B" stroke-width="9" fill="none"/><path d="M32 74a18 18 0 0 1 36 0" stroke="#9AD9B5" stroke-width="9" fill="none"/>')],
  ["Leaf", cut('<path d="M18 82C18 40 46 14 86 14c0 42-26 68-68 68z" fill="#B8D9A8"/><path d="M18 82C40 58 58 40 78 22" stroke="#6E9E62" stroke-width="4" fill="none" stroke-linecap="round"/>')],
  ["Sun", cut(`<circle cx="50" cy="50" r="20" fill="#FFD36B"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="47" y="10" width="6" height="14" rx="3" fill="#FFB84D" transform="rotate(${a} 50 50)"/>`).join("")}`)],
  ["Moon", cut('<path d="M62 14a36 36 0 1 0 24 58A30 30 0 0 1 62 14z" fill="#E6DEF8"/><circle cx="44" cy="54" r="3" fill="#3a2f3a"/><path d="M50 64q5 3 9-1" stroke="#3a2f3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>')],
  ["Strawberry", cut(`<path d="M50 30c22 0 32 10 30 26-2 18-16 32-30 36-14-4-28-18-30-36-2-16 8-26 30-26z" fill="#F47C8A"/><path d="M36 28c6-2 10 2 14-6 4 8 8 4 14 6-6 6-22 6-28 0z" fill="#7CC47C"/>${[[40, 46], [56, 44], [48, 58], [62, 60], [38, 64], [52, 74]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="2.6" fill="#FFE8A3"/>`).join("")}`)],
  ["Tick", cut('<circle cx="50" cy="50" r="38" fill="#9AD9B5"/><path d="M32 52l12 12 24-26" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')],
  ["Lightbulb", cut('<path d="M50 12a26 26 0 0 0-15 47c3 3 5 7 5 12h20c0-5 2-9 5-12a26 26 0 0 0-15-47z" fill="#FFE8A3"/><rect x="40" y="73" width="20" height="12" rx="4" fill="#C9CED6"/>')],
];

export const LABELS = [
  ["Important", label("important!", "#FBDDE3")],
  ["Exam", label("on the exam", "#FFE8A3")],
  ["Remember", label("remember", "#CFE3C8")],
  ["Key word", label("key word", "#E6DEF8")],
  ["Learn it", label("learn this!", "#C7E3F5")],
  ["A+", cut('<circle cx="50" cy="50" r="38" fill="#FFD36B"/><circle cx="50" cy="50" r="30" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 5"/><text x="50" y="62" text-anchor="middle" font-family="Fredoka, system-ui, sans-serif" font-weight="800" font-size="32" fill="#8a5a00">A+</text>')],
  ["Done", label("done ✓", "#B8E3A1")],
  ["Ask", label("ask teacher", "#FFD2B8")],
];

const asData = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

export function StickerPicker({ onPick, onClose }) {
  const [tab, setTab] = useState("ducks");
  const ducks = useRef(null);
  // A duck sticker is the character drawn here, cut out like the rest.
  const pickDuck = (id) => {
    const svg = ducks.current?.querySelector(`[data-duck="${id}"] svg`);
    if (!svg) return;
    const inner = svg.innerHTML;
    onPick(asData(cut(inner, svg.getAttribute("viewBox") || "5 -12 116 116")), 150);
  };
  return (
    <div className="nb-stk" role="dialog" aria-label="Stickers" onPointerDown={(e) => e.stopPropagation()}>
      <div className="nb-stk-head">
        <div className="nb-stk-tabs" role="tablist">
          {[["ducks", "Ducks"], ["cute", "Cute"], ["labels", "Labels"]].map(([id, n]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{n}</button>
          ))}
        </div>
        <button className="nb-stk-x" onClick={onClose} aria-label="Close stickers">×</button>
      </div>
      <div className="nb-stk-grid" ref={ducks}>
        {tab === "ducks" && CHARACTERS.map((c) => (
          <button key={c.id} data-duck={c.id} title={c.name} onClick={() => pickDuck(c.id)}><DuckAvatar id={c.id} size={52} /></button>
        ))}
        {tab === "cute" && DOODLES.map(([n, svg]) => (
          <button key={n} title={n} onClick={() => onPick(asData(svg), 110)}><img src={asData(svg)} alt={n} width="52" height="52" /></button>
        ))}
        {tab === "labels" && LABELS.map(([n, svg]) => (
          <button key={n} title={n} className="wide" onClick={() => onPick(asData(svg), 150)}><img src={asData(svg)} alt={n} width="84" height="52" /></button>
        ))}
      </div>
      <p className="nb-stk-tip">Tap one to put it on your page. Drag it where you want it.</p>
    </div>
  );
}
