// Removing Dwiddle from this computer, from inside Dwiddle.
//
// It is meant to take deliberate effort, and every step of that effort is
// there to stop an accident rather than to wear someone down. Three things
// stand in the way: a screen that says exactly what goes and what stays, a
// phrase that has to be typed rather than pasted, and a button that has to be
// held down. Keeping the app is always the obvious button, and backing out at
// any point costs nothing.

import { useEffect, useRef, useState } from "react";
import { uninstaller } from "./desktop.js";
import { Portal } from "./ui.jsx";

const PHRASE = "uninstall dwiddle";
const HOLD_MS = 3000;

export function UninstallDialog({ onClose, signedIn }) {
  const [step, setStep] = useState("explain");
  const [plan, setPlan] = useState(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const keep = useRef(null);

  useEffect(() => {
    let live = true;
    uninstaller?.plan().then((p) => live && setPlan(p)).catch(() => live && setPlan({ supported: false, reason: "The app could not work out what to remove." }));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    keep.current?.focus();
    const onKey = (e) => { if (e.key === "Escape" && step !== "running") onClose(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onClose, step]);

  async function remove() {
    setStep("running");
    setError("");
    const result = await uninstaller.run(typed);
    // On success the app closes itself before this line matters.
    if (!result?.ok) {
      setError(result?.reason || "Something stopped it. Nothing was removed.");
      setStep("hold");
    }
  }

  const matches = typed.trim().toLowerCase() === PHRASE;

  return (
    <Portal>
    <div className="un-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget && step !== "running") onClose(); }}>
      <div className="un-dialog" role="dialog" aria-modal="true" aria-labelledby="un-title">
        <div className="un-steps" aria-hidden="true">
          {["explain", "type", "hold"].map((s, i) => (
            <span key={s} className={"un-pip" + (["explain", "type", "hold", "running"].indexOf(step) >= i ? " on" : "")} />
          ))}
        </div>

        {step === "explain" && (
          <>
            <h2 id="un-title">Remove Dwiddle from this computer?</h2>
            {!plan && <p className="un-sub">Checking what is installed.</p>}

            {plan && !plan.supported && (
              <>
                <p className="un-sub">{plan.reason}</p>
                <div className="un-actions">
                  <button className="btn" ref={keep} onClick={onClose}>Close</button>
                </div>
              </>
            )}

            {plan?.supported && (
              <>
                <p className="un-sub">
                  {plan.platform === "darwin"
                    ? "These are moved to the Bin, so they can still be put back until it is emptied."
                    : "These are removed from this computer."}
                </p>
                <ul className="un-list">
                  {plan.items.map((item) => <li key={item}><code>{item}</code></li>)}
                </ul>

                <div className="un-note">
                  {signedIn ? (
                    <><b>Your account is not touched.</b> Everything synced to it stays there and comes back the next time you sign in, here or on the web.</>
                  ) : (
                    <><b>You are not signed in</b>, so your notes, questions and progress exist only on this computer. They go with the app and cannot be recovered afterwards.</>
                  )}
                </div>

                <div className="un-actions">
                  <button className="btn" ref={keep} onClick={onClose}>Keep Dwiddle</button>
                  <button className="btn ghost un-quiet" onClick={() => setStep("type")}>Continue</button>
                </div>
              </>
            )}
          </>
        )}

        {step === "type" && (
          <>
            <h2 id="un-title">Type it to confirm</h2>
            <p className="un-sub">
              Type <b className="un-phrase">{PHRASE}</b> below. It has to be typed; pasting is switched off.
            </p>
            <input
              className={"un-input" + (matches ? " ok" : "")}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={PHRASE}
              aria-label={`Type ${PHRASE} to confirm`}
              autoFocus
            />
            <div className="un-actions">
              <button className="btn" onClick={onClose}>Keep Dwiddle</button>
              <button className="btn ghost un-quiet" disabled={!matches} onClick={() => setStep("hold")}>Continue</button>
            </div>
          </>
        )}

        {(step === "hold" || step === "running") && (
          <>
            <h2 id="un-title">{step === "running" ? "Removing Dwiddle" : "Last step"}</h2>
            <p className="un-sub">
              {step === "running"
                ? "Closing and removing. This takes a few seconds."
                : "Press and hold the button for three seconds. Let go at any point and nothing happens."}
            </p>
            {error && <p className="un-error">{error}</p>}
            <HoldButton disabled={step === "running"} onDone={remove} />
            {step !== "running" && (
              <div className="un-actions">
                <button className="btn" onClick={onClose}>Keep Dwiddle</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </Portal>
  );
}

// A button that only fires once it has been held for the whole time. The fill
// is a CSS transition, so letting go reverses it smoothly rather than snapping
// back, and the timer is what actually decides.
function HoldButton({ onDone, disabled }) {
  const [held, setHeld] = useState(false);
  const timer = useRef(0);

  const start = () => {
    if (disabled || timer.current) return;
    setHeld(true);
    timer.current = setTimeout(() => { timer.current = 0; setHeld(false); onDone(); }, HOLD_MS);
  };
  const stop = () => {
    clearTimeout(timer.current);
    timer.current = 0;
    setHeld(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      className={"un-hold" + (held ? " held" : "") + (disabled ? " busy" : "")}
      style={{ "--hold": `${HOLD_MS}ms` }}
      disabled={disabled}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); start(); }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); start(); } }}
      onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") stop(); }}
      onBlur={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="un-fill" aria-hidden="true" />
      <span className="un-label">
        {disabled ? "Removing" : held ? "Keep holding" : "Hold to remove Dwiddle"}
      </span>
    </button>
  );
}
