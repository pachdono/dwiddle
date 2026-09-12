import { useEffect, useState } from "react";

/* Update state, shown in the app rather than only in a system dialog. */

export default function UpdateBar() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!window.DWIDDLE_UPDATE) return;
    return window.DWIDDLE_UPDATE.on(setInfo);
  }, []);

  if (!info || info.state === "available") return null;

  const downloading = info.state === "downloading";

  return (
    <div className={"upd" + (downloading ? " busy" : "")}>
      <span className="upd-dot" />
      <span className="upd-text">
        {downloading
          ? `Downloading ${info.version || "an update"}${info.percent ? ` ${info.percent}%` : ""}`
          : `Version ${info.version} is ready`}
      </span>
      {!downloading && (
        <button className="btn small" onClick={() => window.DWIDDLE_UPDATE.install()}>
          Restart now
        </button>
      )}
      <button className="upd-x" onClick={() => setInfo(null)} aria-label="Dismiss">×</button>
    </div>
  );
}
