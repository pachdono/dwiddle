import { useEffect, useRef, useState } from "react";
import { WIDGETS, PRESETS, PALETTES, GRADIENTS, RADII, acceptImage, saveBg, isDark } from "./custom.js";

/* Editing happens on the dashboard itself rather than on a settings screen, so
   what you are changing and what you are looking at are the same thing.

   Reordering uses pointer events rather than HTML5 drag and drop, because the
   latter does not fire on touch and half the people doing this are on a
   phone. */

export function EditBar({ cfg, setCfg, bg, setBg, onDone }) {
  const [tab, setTab] = useState(null);
  const file = useRef(null);
  const [err, setErr] = useState("");
  const [drop, setDrop] = useState(false);

  const set = (patch) => setCfg({ ...cfg, ...patch });
  const setColor = (patch) => set({ colors: { ...cfg.colors, ...patch } });
  const setPhoto = (patch) => set({ photo: { ...cfg.photo, ...patch } });

  const pal = PALETTES.find((p) => p.id === cfg.palette) || PALETTES[0];
  const seeds = document.documentElement.dataset.theme === "dark" ? pal.dark : pal.light;

  async function take(f) {
    if (!f) return;
    setErr("");
    try {
      const url = await acceptImage(f);
      setBg(url);
      set({ widgets: { ...cfg.widgets, photo: true } });
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    const stop = (e) => { e.preventDefault(); };
    const onDrop = (e) => {
      e.preventDefault();
      setDrop(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) take(f);
    };
    const onOver = (e) => { e.preventDefault(); setDrop(true); };
    const onLeave = (e) => { if (e.relatedTarget === null) setDrop(false); };
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragenter", stop);
    return () => {
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragenter", stop);
    };
  });

  return (
    <>
      {drop && <div className="ed-drop"><b>Drop the image anywhere</b></div>}

      <div className="ed-bar">
        <div className="ed-tabs">
          {[["looks", "Looks"], ["colour", "Colour"], ["photo", "Photo"], ["layout", "Layout"]].map(([id, label]) => (
            <button key={id} className={tab === id ? "on" : ""}
              onClick={() => setTab(tab === id ? null : id)}>{label}</button>
          ))}
        </div>
        <button className="btn small ed-done" onClick={onDone}>Done</button>
      </div>

      {tab && (
        <div className="ed-panel">
          {tab === "looks" && (
            <div className="ed-looks">
              {PRESETS.map((p) => (
                <button key={p.id} className="ed-look" onClick={() => set(p.cfg)}>
                  <span className="ed-look-art" style={{
                    background: `linear-gradient(150deg, ${p.swatches[0]}, ${p.swatches[1]})`,
                  }} />
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {tab === "colour" && (
            <div className="ed-grid">
              <Swatches label="Palette" value={cfg.palette}
                items={PALETTES.map((p) => ({ id: p.id, name: p.name, colour: p.swatch }))}
                onPick={(id) => set({ palette: id, colors: { ...cfg.colors, bg1: null, bg2: null, ink: null, accent: null, card: null, line: null } })} />

              <Field label="Background">
                <Colour value={cfg.colors.bg1 || seeds[0]} onChange={(v) => setColor({ bg1: v })} />
                {cfg.colors.mode === "gradient" && (
                  <Colour value={cfg.colors.bg2 || seeds[0]} onChange={(v) => setColor({ bg2: v })} />
                )}
                <button className="ed-chip"
                  onClick={() => setColor(cfg.colors.mode === "gradient"
                    ? { mode: "flat" }
                    : { mode: "gradient", bg1: cfg.colors.bg1 || seeds[0], bg2: cfg.colors.bg2 || seeds[0] })}>
                  {cfg.colors.mode === "gradient" ? "Flat" : "Gradient"}
                </button>
              </Field>

              {cfg.colors.mode === "gradient" && (
                <Field label="Angle">
                  <input type="range" min="0" max="360" value={cfg.colors.angle}
                    onChange={(e) => setColor({ angle: Number(e.target.value) })} />
                  <span className="ed-num">{cfg.colors.angle}</span>
                </Field>
              )}

              <Field label="Ready made">
                <div className="ed-grads">
                  {GRADIENTS.map((g) => (
                    <button key={g.id} className="ed-grad" title={g.name}
                      style={{ background: g.id === "none" ? (cfg.colors.bg1 || seeds[0]) : `linear-gradient(${g.angle}deg, ${g.a}, ${g.b})` }}
                      onClick={() => g.id === "none"
                        ? setColor({ mode: "flat" })
                        : setColor({ mode: "gradient", bg1: g.a, bg2: g.b, angle: g.angle, ink: isDark(g.b) ? "#F2F2F6" : "#16161A" })} />
                  ))}
                </div>
              </Field>

              <Field label="Boxes">
                <Colour value={cfg.colors.card || seeds[0]} onChange={(v) => setColor({ card: v })} />
                {cfg.colors.card && <button className="ed-chip" onClick={() => setColor({ card: null })}>Reset</button>}
              </Field>

              <Field label="Text">
                <Colour value={cfg.colors.ink || seeds[1]} onChange={(v) => setColor({ ink: v })} />
                {cfg.colors.ink && <button className="ed-chip" onClick={() => setColor({ ink: null })}>Reset</button>}
              </Field>

              <Field label="Accent">
                <Colour value={cfg.colors.accent || seeds[2]} onChange={(v) => setColor({ accent: v })} />
                {cfg.colors.accent && <button className="ed-chip" onClick={() => setColor({ accent: null })}>Reset</button>}
              </Field>

              <Field label="Corners">
                <div className="seg">
                  {RADII.map((r) => (
                    <button key={r.id} className={cfg.radius === r.id ? "on" : ""}
                      onClick={() => set({ radius: r.id })}>{r.name}</button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {tab === "photo" && (
            <div className="ed-grid">
              <div
                className={"ed-dropzone" + (bg ? " has" : "")}
                style={bg ? { backgroundImage: `url(${bg})` } : undefined}
                onClick={() => file.current?.click()}
              >
                {!bg && <span>Drag an image here, or click to choose</span>}
              </div>
              <input ref={file} type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; take(f); }} />

              {bg && (
                <>
                  <Field label="Where">
                    <div className="seg">
                      {[["widget", "Card"], ["background", "Behind"], ["both", "Both"]].map(([id, label]) => (
                        <button key={id} className={cfg.photo.place === id ? "on" : ""}
                          onClick={() => setPhoto({ place: id })}>{label}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Dim">
                    <input type="range" min="0" max="90" value={cfg.photo.dim}
                      onChange={(e) => setPhoto({ dim: Number(e.target.value) })} />
                  </Field>
                  <Field label="Blur">
                    <input type="range" min="0" max="24" value={cfg.photo.blur}
                      onChange={(e) => setPhoto({ blur: Number(e.target.value) })} />
                  </Field>
                  <Field label="">
                    <button className="ed-chip" onClick={() => { saveBg(null); setBg(null); set({ widgets: { ...cfg.widgets, photo: false } }); }}>
                      Remove photo
                    </button>
                  </Field>
                </>
              )}
              {err && <p className="ed-err">{err}</p>}
            </div>
          )}

          {tab === "layout" && (
            <div className="ed-grid">
              <p className="ed-hint">Drag a card by its handle to move it. Use the eye to hide one.</p>
              <Field label="Your own words">
                <input className="input" value={cfg.quote} maxLength={120} placeholder="Two more weeks."
                  onChange={(e) => set({ quote: e.target.value, widgets: { ...cfg.widgets, quote: true } })} />
              </Field>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Field({ label, children }) {
  return (
    <div className="ed-field">
      {label && <span>{label}</span>}
      <div className="ed-field-c">{children}</div>
    </div>
  );
}

function Colour({ value, onChange }) {
  return <input type="color" className="ed-colour" value={value} onChange={(e) => onChange(e.target.value)} />;
}

function Swatches({ label, value, items, onPick }) {
  return (
    <Field label={label}>
      <div className="ed-swatches">
        {items.map((i) => (
          <button key={i.id} className={"ed-sw" + (value === i.id ? " on" : "")} title={i.name}
            style={{ background: i.colour }} onClick={() => onPick(i.id)} />
        ))}
      </div>
    </Field>
  );
}

/* The reorderable wrapper. */
export function EditSlot({ id, index, editing, hidden, onToggle, drag, children }) {
  const w = WIDGETS.find((x) => x.id === id);
  if (!editing) return children;
  return (
    <div
      className={"ed-slot" + (hidden ? " off" : "") + (drag.overIndex === index ? " over" : "") + (drag.fromIndex === index ? " lifting" : "")}
      data-slot={index}
    >
      <div className="ed-slot-bar">
        <button className="ed-handle" onPointerDown={(e) => drag.start(e, index)} aria-label="Move">⠿</button>
        <span className="ed-slot-name">{w ? w.name : id}</span>
        <button className="ed-eye" onClick={onToggle} aria-label={hidden ? "Show" : "Hide"}>
          {hidden ? "Hidden" : "Shown"}
        </button>
      </div>
      <div className="ed-slot-body">{children}</div>
    </div>
  );
}

/* Pointer based reordering. Works with a mouse and with a finger, which HTML5
   drag and drop does not. */
export function useDragOrder(order, setOrder) {
  const [fromIndex, setFrom] = useState(null);
  const [overIndex, setOver] = useState(null);
  // The live indices are mirrored in a ref. Reading them back from state
  // inside the updater would mean calling the parent's setter during a render,
  // which React rightly refuses.
  const state = useRef({ from: null, over: null });

  useEffect(() => {
    if (fromIndex === null) return;

    const move = (e) => {
      const y = e.clientY;
      let target = state.current.from;
      for (const el of document.querySelectorAll("[data-slot]")) {
        const r = el.getBoundingClientRect();
        if (y > r.top && y < r.bottom) { target = Number(el.dataset.slot); break; }
      }
      state.current.over = target;
      setOver(target);
    };

    const up = () => {
      const { from, over: to } = state.current;
      if (from !== null && to !== null && to !== from) {
        const next = [...order];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        setOrder(next);
      }
      state.current = { from: null, over: null };
      setFrom(null);
      setOver(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [fromIndex, order, setOrder]);

  return {
    fromIndex,
    overIndex,
    start(e, index) {
      e.preventDefault();
      state.current = { from: index, over: index };
      setFrom(index);
      setOver(index);
    },
  };
}
