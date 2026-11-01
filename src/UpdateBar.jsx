// Updates, as the installed app shows them.
//
// With automatic updates off, a new version is announced in a card at the top
// when the app opens, and nothing happens unless the person says so. Not now,
// or the cross, puts it away until the next time the app is opened.
//
// Updating takes over the whole window: the duck carries the new version
// along the progress bar while it downloads, and the app reopens by itself
// when it is in. There is nothing to do meanwhile, and a full screen view says
// so better than a small bar that invites clicking elsewhere.

import { useEffect, useState } from "react";
import { DuckParts } from "./Duck.jsx";
import { Portal } from "./ui.jsx";

const api = () => window.DWIDDLE_UPDATE;

export function useUpdate() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    const u = api();
    if (!u) return;
    u.state?.().then((s) => s && setInfo(s)).catch(() => {});
    return u.on(setInfo);
  }, []);
  return info;
}

// The duck with the new version in a parcel, which waddles on a loop.
function DuckDelivery({ size = 120 }) {
  return (
    <svg className="uw-duck" width={size} height={size * (140 / 120)} viewBox="0 0 120 140" fill="none" aria-hidden="true">
      <g className="uw-body">
        <DuckParts />
        <rect x="38" y="84" width="52" height="38" rx="4" fill="#C99A5B" />
        <rect x="38" y="84" width="52" height="9" rx="3" fill="#B5854A" />
        <rect x="60" y="84" width="8" height="38" fill="#E8D2A6" />
        <path d="M64 97 v14 M58.5 106 l5.5 5.5 5.5 -5.5" stroke="#8A5A2E" strokeWidth="3" strokeLinecap="round"
          strokeLinejoin="round" fill="none" />
        <ellipse cx="37" cy="100" rx="7" ry="10" fill="#EFC94E" />
        <ellipse cx="91" cy="100" rx="7" ry="10" fill="#EFC94E" />
      </g>
    </svg>
  );
}

function UpdateScreen({ info, onClose }) {
  const pct = Math.max(0, Math.min(100, info.percent || 0));
  const failed = info.state === "error";
  const done = !failed && pct >= 100;
  const known = pct > 0;

  return (
    <Portal>
      <div className="uw" role="dialog" aria-modal="true" aria-label="Updating Dwiddle">
        <div className="uw-in">
          {failed ? (
            <>
              <div className="uw-stage still"><DuckDelivery size={110} /></div>
              <h2>{info.manual ? "Almost there" : "That did not work"}</h2>
              <p>{info.message}</p>
              <div className="uw-actions">
                {!info.manual && <button className="btn cta" onClick={() => api()?.install()}>Try again</button>}
                <button className="btn ghost" onClick={onClose}>{info.manual ? "Done" : "Not now"}</button>
              </div>
            </>
          ) : (
            <>
              <div className="uw-stage">
                <div className={"uw-walker" + (known ? "" : " pacing")} style={known ? { left: `${pct}%` } : undefined}>
                  <DuckDelivery size={116} />
                </div>
              </div>
              <div className="uw-track" aria-hidden="true">
                <span className={known ? "" : "indeterminate"} style={known ? { width: `${pct}%` } : undefined} />
              </div>
              <h2>{done ? "Putting it in place" : `Updating to ${info.version || "the new version"}`}</h2>
              <p>
                {done
                  ? "Dwiddle closes and opens again by itself in a moment."
                  : known ? `Downloading, ${pct}%` : "Starting the download"}
              </p>
              <p className="uw-fine">Your notes and progress are kept. Nothing needs doing meanwhile.</p>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}

function Pop({ title, sub, later, go, onLater, onGo }) {
  return (
    <Portal>
      <div className="upd-pop" role="status">
        <span className="upd-pop-art" aria-hidden="true"><DuckDelivery size={40} /></span>
        <div className="upd-pop-text">
          <b>{title}</b>
          <span>{sub}</span>
        </div>
        <div className="upd-pop-actions">
          <button className="btn ghost small" onClick={onLater}>{later}</button>
          <button className="btn cta small" onClick={onGo}>{go}</button>
        </div>
        <button className="upd-pop-x" onClick={onLater} aria-label="Close">×</button>
      </div>
    </Portal>
  );
}

export default function UpdateBar() {
  const info = useUpdate();
  const [hidden, setHidden] = useState(false); // put away until next launch
  const [full, setFull] = useState(false);     // the full screen view is up

  useEffect(() => {
    if (info?.state === "installing") setFull(true);
  }, [info?.state]);

  if (!info) return null;

  if (full && (info.state === "installing" || info.state === "error")) {
    return <UpdateScreen info={info} onClose={() => { setFull(false); setHidden(true); }} />;
  }
  if (hidden) return null;

  const update = () => { setFull(true); api()?.install(); };

  if (info.state === "available") {
    return <Pop title="A new version of Dwiddle is out"
      sub={`Version ${info.version} is ready to install. It takes about a minute.`}
      later="Not now" go="Update now" onLater={() => setHidden(true)} onGo={update} />;
  }
  if (info.state === "ready") {
    return <Pop title={`Version ${info.version} is downloaded`}
      sub="It goes in next time you close Dwiddle, or now if you restart."
      later="Later" go="Restart now" onLater={() => setHidden(true)} onGo={update} />;
  }
  return null;
}
