// Choosing the level you study at: at sign up, and again in Settings.

import { useState } from "react";
import { LEVELS, myLevel, setMyLevel } from "./level.js";

export function LevelPicker({ value, onChange }) {
  return (
    <div className="lvl-grid" role="radiogroup" aria-label="Your level">
      {LEVELS.map((l) => (
        <button type="button" key={l.id} role="radio" aria-checked={value === l.id}
          className={"lvl-opt" + (value === l.id ? " on" : "")} onClick={() => onChange(l.id)}>
          <b>{l.label}</b><span>{l.hint}</span>
        </button>
      ))}
    </div>
  );
}

// The Settings card, saved as soon as one is picked.
export function LevelCard() {
  const [v, setV] = useState(() => myLevel()?.id || null);
  return (
    <div className="card">
      <div className="card-head"><h3>Your level</h3></div>
      <div className="card-pad" style={{ paddingTop: 0 }}>
        <p className="small muted" style={{ margin: "0 0 12px" }}>
          Notes, lessons, questions and explanations are written for this level, and nothing harder comes back unless you ask for it.
        </p>
        <LevelPicker value={v} onChange={(id) => { setV(id); setMyLevel(id); }} />
      </div>
    </div>
  );
}
