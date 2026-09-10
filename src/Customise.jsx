import { useRef, useState } from "react";
import { PALETTES, FONTS, RADII, WIDGETS, PRESETS, shrink, saveBg } from "./custom.js";

/* The customisation panel. Everything here writes straight through to the live
   theme, because a preview you have to imagine is no preview at all. */

function Row({ label, hint, children }) {
  return (
    <div className="cz-row">
      <div className="cz-label">
        <b>{label}</b>
        {hint && <span>{hint}</span>}
      </div>
      <div className="cz-control">{children}</div>
    </div>
  );
}

export default function Customise({ cfg, setCfg, bg, setBg }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const file = useRef(null);

  const set = (patch) => setCfg({ ...cfg, ...patch });
  const setWidget = (id, on) => set({ widgets: { ...cfg.widgets, [id]: on } });

  function move(id, dir) {
    const order = [...cfg.order];
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    set({ order });
  }

  async function onPick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr(""); setBusy(true);
    try {
      let url = await shrink(f, 1600, 0.82);
      // Browser storage is a few megabytes in total, so a photo that is still
      // large after the first pass gets another, smaller one rather than
      // failing at the point of saving.
      if (url.length > 1_400_000) url = await shrink(f, 1100, 0.7);
      if (url.length > 2_000_000) throw new Error("That image is too large even after resizing. Try a smaller one.");
      if (!saveBg(url)) throw new Error("There was no room left in browser storage. Remove the current photo and try again.");
      setBg(url);
      set({ widgets: { ...cfg.widgets, photo: true } });
    } catch (e2) {
      setErr(e2.message || "That image could not be used.");
    } finally {
      setBusy(false);
    }
  }

  function clearBg() {
    saveBg(null);
    setBg(null);
    set({ widgets: { ...cfg.widgets, photo: false } });
  }

  return (
    <div className="page fade">
      <div className="head">
        <h2>Customise</h2>
        <p className="sub">Changes apply as you make them, and only on this device.</p>
      </div>

      <div className="stack">
        <div className="card card-pad">
          <div className="card-head"><h3>Start from a look</h3></div>
          <div className="cz-presets">
            {PRESETS.map((p) => (
              <button key={p.id} className="cz-preset" onClick={() => set(p.cfg)}>
                <span className="cz-preset-dots">
                  {["default", p.cfg.palette].map((id, i) => {
                    const pal = PALETTES.find((x) => x.id === id) || PALETTES[0];
                    return <i key={i} style={{ background: pal.swatch }} />;
                  })}
                </span>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-head"><h3>Colour</h3></div>

          <Row label="Palette" hint="Light and dark versions of each are built in.">
            <div className="cz-swatches">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  className={"cz-swatch" + (cfg.palette === p.id ? " on" : "")}
                  onClick={() => set({ palette: p.id, accent: null })}
                  title={p.name}
                >
                  <i style={{ background: p.swatch }} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </Row>

          <Row label="Accent" hint="Overrides the palette's own accent.">
            <div className="cz-accent">
              <input
                type="color"
                value={cfg.accent || PALETTES.find((p) => p.id === cfg.palette)?.swatch || "#3B5BFD"}
                onChange={(e) => set({ accent: e.target.value })}
                aria-label="Accent colour"
              />
              {cfg.accent && (
                <button className="btn ghost small" onClick={() => set({ accent: null })}>Reset</button>
              )}
            </div>
          </Row>

          <Row label="Corners">
            <div className="seg">
              {RADII.map((r) => (
                <button key={r.id} className={cfg.radius === r.id ? "on" : ""} onClick={() => set({ radius: r.id })}>
                  {r.name}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Type">
            <div className="seg">
              {FONTS.map((f) => (
                <button key={f.id} className={cfg.font === f.id ? "on" : ""} onClick={() => set({ font: f.id })}>
                  {f.name}
                </button>
              ))}
            </div>
          </Row>
        </div>

        <div className="card card-pad">
          <div className="card-head"><h3>Your photo</h3></div>
          <p className="muted small cz-note">
            Kept on this device only. It is never uploaded and never synced, so it will not follow
            you to another browser.
          </p>

          {bg ? (
            <>
              <div className="cz-preview" style={{ backgroundImage: `url(${bg})` }}>
                <div className="cz-preview-veil" style={{ backdropFilter: `blur(${cfg.blur}px)`, background: `rgba(0,0,0,${cfg.dim / 200})` }} />
              </div>
              <Row label="Dim" hint="Keeps text readable over a busy photo.">
                <input type="range" min="0" max="90" value={cfg.dim}
                  onChange={(e) => set({ dim: Number(e.target.value) })} />
              </Row>
              <Row label="Blur">
                <input type="range" min="0" max="24" value={cfg.blur}
                  onChange={(e) => set({ blur: Number(e.target.value) })} />
              </Row>
              <div className="cz-actions">
                <button className="btn ghost small" onClick={() => file.current?.click()}>Replace</button>
                <button className="btn ghost small" onClick={clearBg}>Remove</button>
              </div>
            </>
          ) : (
            <button className="btn" onClick={() => file.current?.click()} disabled={busy}>
              {busy ? "Working" : "Choose an image"}
            </button>
          )}
          {err && <p className="cz-err">{err}</p>}
          <input ref={file} type="file" accept="image/*" hidden onChange={onPick} />
        </div>

        <div className="card card-pad">
          <div className="card-head"><h3>Dashboard</h3></div>
          <p className="muted small cz-note">Choose what appears, and in what order.</p>
          <ul className="cz-widgets">
            {cfg.order.map((id, i) => {
              const w = WIDGETS.find((x) => x.id === id);
              if (!w) return null;
              const on = !!cfg.widgets[id];
              return (
                <li key={id} className={on ? "" : "off"}>
                  <button className="cz-move" onClick={() => move(id, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                  <button className="cz-move" onClick={() => move(id, 1)} disabled={i === cfg.order.length - 1} aria-label="Move down">↓</button>
                  <span className="cz-wname">{w.name}</span>
                  <button className={"cz-toggle" + (on ? " on" : "")} onClick={() => setWidget(id, !on)}>
                    {on ? "Shown" : "Hidden"}
                  </button>
                </li>
              );
            })}
          </ul>

          {cfg.widgets.quote && (
            <Row label="Your own words" hint="Shown on the dashboard.">
              <input
                className="input"
                value={cfg.quote}
                maxLength={120}
                placeholder="Two more weeks."
                onChange={(e) => set({ quote: e.target.value })}
              />
            </Row>
          )}
        </div>
      </div>
    </div>
  );
}
