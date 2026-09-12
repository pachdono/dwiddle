import { DuckSitting } from "./Duck.jsx";
import { SignInPanel } from "./Account.jsx";
import { configured } from "./supabase.js";

/* What the desktop app opens on.
   The website's landing page exists to explain the product to a stranger who
   arrived from a link. Somebody who has installed the app has already been
   convinced, so the marketing is gone and only the one decision remains. */

export default function DesktopWelcome({ onSkip }) {
  return (
    <div className="dw-welcome">
      <div className="dw-inner">
        <DuckSitting size={168} className="dw-duck" />

        <h1>Welcome back</h1>
        <p className="dw-sub">
          {configured
            ? "Sign in and your topics, missed questions and retired cards follow you to every device."
            : "Accounts are not set up on this build, so your work stays on this computer."}
        </p>

        {configured && (
          <div className="dw-panel">
            <SignInPanel />
          </div>
        )}

        <button className="btn quiet dw-skip" onClick={onSkip}>
          {configured ? "Use it without an account" : "Continue"}
        </button>
      </div>

      <p className="dw-foot">Everything here works offline. Writing new questions needs a connection.</p>
    </div>
  );
}
