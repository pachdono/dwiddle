// Settings: when Dwiddle may send notifications.

import { useState } from "react";
import { prefs, setDaily, setHour, supported } from "./notify.js";
import { save } from "./store.js";

function Row({ label, hint, on, onChange, busy }) {
  return (
    <div className="set-row">
      <div className="sec-main">
        <div className="list-title">{label}</div>
        <div className="small muted">{hint}</div>
      </div>
      <button type="button" role="switch" aria-checked={on} disabled={busy} className={"vd-voice-toggle" + (on ? " on" : "")} onClick={() => onChange(!on)}>
        <i aria-hidden="true" /> {on ? "On" : "Off"}
      </button>
    </div>
  );
}

export function NotifyCard({ user }) {
  const [p, setP] = useState(prefs);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!supported()) return null;
  const setReady = async (on) => {
    if (on && Notification.permission === "default") await Notification.requestPermission().catch(() => {});
    save("dwiddle-notify", { ...prefs(), ready: on });
    setP(prefs());
  };
  const daily = async (on) => {
    setBusy(true); setErr("");
    try { await setDaily(on, user); } catch (e) { setErr(e.message || "That did not work."); }
    setP(prefs()); setBusy(false);
  };
  return (
    <div className="card">
      <div className="card-head"><h3>Notifications</h3></div>
      <Row label="When something is ready" hint="Your study material, a video, a notebook or a practice paper, if you have switched to another tab or app." on={p.ready} onChange={setReady} />
      <Row label="Daily study reminder" hint="One friendly nudge a day from Dwiddle, only on days you have not studied yet." on={p.daily} onChange={daily} busy={busy} />
      {p.daily && (
        <div className="set-row">
          <div className="sec-main">
            <div className="list-title">Remind me at</div>
            <div className="small muted">Your own time, wherever you are.</div>
          </div>
          <select value={p.hour} onChange={async (e) => { await setHour(+e.target.value, user).catch(() => {}); setP(prefs()); }} style={{ maxWidth: 140 }}>
            {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => (
              <option key={h} value={h}>{h === 12 ? "12 noon" : h < 12 ? `${h} am` : `${h - 12} pm`}</option>
            ))}
          </select>
        </div>
      )}
      {err && <p className="small" style={{ color: "var(--warn)", margin: "0 20px 14px" }}>{err}</p>}
    </div>
  );
}
