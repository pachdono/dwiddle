import { useEffect, useState } from "react";
import { platform, isInstalled, canPrompt, onPromptChange, promptInstall } from "./install.js";

/* The install page.
   The walkthrough is drawn rather than recorded. A GIF of an iPhone would be a
   megabyte, fixed in size, always light mode, and stale the moment Apple moves
   a button. This is a few kilobytes, sharp at any size, follows the theme, and
   stops for anyone who has asked for less motion. */

const STEPS = [
  { label: "Open dwiddle.vercel.app in Safari" },
  { label: "Tap the share button" },
  { label: "Choose Add to Home Screen" },
  { label: "It lands on your home screen" },
];

function Phone({ step }) {
  return (
    <div className="ins-phone" aria-hidden="true">
      <div className="ins-screen">
        {/* the page behind everything */}
        <div className={"ins-page" + (step === 3 ? " hidden" : "")}>
          <div className="ins-page-top">
            <DuckDot />
            <b>Dwiddle</b>
          </div>
          <div className="ins-line w70" />
          <div className="ins-line w90" />
          <div className="ins-line w50" />
          <div className="ins-cta" />
          <div className="ins-line w80" />
          <div className="ins-line w60" />
        </div>

        {/* the home screen, at the end */}
        <div className={"ins-home" + (step === 3 ? " on" : "")}>
          <div className="ins-apps">
            {[0, 1, 2].map((i) => <span key={i} className="ins-app ghost" />)}
            <span className="ins-app real">
              <img src="/apple-touch-icon.png" alt="" width="44" height="44" />
              <span className="ins-app-name">Dwiddle</span>
            </span>
            {[3, 4].map((i) => <span key={i} className="ins-app ghost" />)}
          </div>
        </div>

        {/* Safari's bottom bar */}
        <div className={"ins-bar" + (step === 2 ? " dim" : "") + (step === 3 ? " gone" : "")}>
          <span className="ins-url">dwiddle.vercel.app</span>
          <span className={"ins-share" + (step === 1 ? " tap" : "")}>
            {/* Safari's share glyph, inlined rather than imported, so this
                page does not have to reach back into App.jsx. */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3M8 7l4-4 4 4" />
              <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
            </svg>
          </span>
        </div>

        {/* the share sheet */}
        <div className={"ins-sheet" + (step === 2 ? " up" : "")}>
          <span className="ins-grab" />
          <div className="ins-sheet-row">
            <span className="ins-sheet-icon" />
            <span className="ins-line w50 tight" />
          </div>
          <div className={"ins-sheet-row pick" + (step === 2 ? " on" : "")}>
            <span className="ins-sheet-icon plus">+</span>
            <b>Add to Home Screen</b>
          </div>
          <div className="ins-sheet-row">
            <span className="ins-sheet-icon" />
            <span className="ins-line w40 tight" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DuckDot() {
  return <img src="/apple-touch-icon.png" alt="" width="16" height="16" className="ins-dot" />;
}

function Steps({ items, current }) {
  return (
    <ol className="ins-steps">
      {items.map((s, i) => (
        <li key={s} className={current === i ? "on" : ""}>
          <span className="ins-num">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

const GUIDES = {
  ios: {
    title: "Add it to your iPhone",
    note: "It has to be Safari. Chrome and Firefox on iOS cannot add to the home screen, because Apple does not let them.",
    steps: [
      "Tap the share button at the bottom of Safari, the square with an arrow coming out of it.",
      "Scroll down the list and tap Add to Home Screen.",
      "Tap Add in the top right.",
      "Open it from your home screen. It runs full screen, with no Safari bars.",
    ],
  },
  "ios-other": {
    title: "Open this in Safari first",
    note: "You are in another browser. Apple only allows Safari to add apps to the home screen, so copy the address and open it there.",
    steps: [
      "Copy this address: dwiddle.vercel.app",
      "Open Safari and paste it in.",
      "Tap the share button, then Add to Home Screen.",
    ],
  },
  android: {
    title: "Install on Android",
    note: "Chrome usually offers this by itself. If it has not, the menu always works.",
    steps: [
      "Tap the three dots in the top right of Chrome.",
      "Tap Install app, or Add to Home screen.",
      "Confirm, and it appears in your app drawer.",
    ],
  },
  "mac-chromium": {
    title: "Install on your Mac",
    note: "It opens in its own window with a Dock icon, and there is no address bar.",
    steps: [
      "Click the install icon at the right of the address bar, a screen with a downward arrow.",
      "If it is not there, open the three dot menu, then Cast, Save and Share, then Install page as app.",
      "Click Install.",
    ],
  },
  "mac-safari": {
    title: "Add it to your Dock",
    note: "Safari on macOS Sonoma and later can do this directly.",
    steps: [
      "In the menu bar choose File, then Add to Dock.",
      "Confirm the name, then click Add.",
      "Launch it from the Dock like any other app.",
    ],
  },
  windows: {
    title: "Install on Windows",
    note: "It gets a taskbar and Start menu entry, and uninstalls like a normal program.",
    steps: [
      "Click the install icon at the right of the address bar in Chrome or Edge.",
      "If it is not there, open the three dot menu and look for Install Dwiddle, or Apps.",
      "Click Install.",
    ],
  },
  other: {
    title: "Install it",
    note: "Most browsers can keep this as an app. The wording varies.",
    steps: [
      "Look for Install or Add to Home Screen in your browser's menu.",
      "Confirm.",
    ],
  },
};

export default function Install({ go }) {
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState(canPrompt());
  const p = platform();
  const installed = isInstalled();
  const guide = GUIDES[p.id] || GUIDES.other;

  useEffect(() => onPromptChange(setPrompt), []);

  // The walkthrough loops on its own, and stops for anyone who has asked for
  // less movement rather than looping behind their back.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setStep((n) => (n + 1) % STEPS.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page fade">
      <div className="page-head">
        <h1>Get the app</h1>
        <p>
          Dwiddle installs from the browser. There is nothing to download, no store, no account
          needed, and it updates itself.
        </p>
      </div>

      {installed ? (
        <div className="card card-pad ins-done">
          <b>You are already running the installed app.</b>
          <p className="small muted" style={{ margin: "6px 0 0" }}>
            Nothing more to do. It will keep itself up to date.
          </p>
        </div>
      ) : (
        <div className="stack">
          {prompt && (
            <div className="card card-pad ins-prompt">
              <div>
                <b>Your browser can install it right now</b>
                <p className="small muted" style={{ margin: "4px 0 0" }}>
                  One click. It gets its own window and an icon, the same as any other app.
                </p>
              </div>
              <button className="btn cta" onClick={promptInstall}>Install Dwiddle</button>
            </div>
          )}

          <div className="ins-grid">
            <div className="ins-demo">
              <Phone step={step} />
              <div className="ins-caption">
                <span className="ins-step-n">{step + 1}</span>
                {STEPS[step].label}
              </div>
              <div className="ins-dots">
                {STEPS.map((s, i) => (
                  <button
                    key={s.label}
                    className={"ins-pip" + (i === step ? " on" : "")}
                    onClick={() => setStep(i)}
                    aria-label={`Step ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="card card-pad ins-guide">
              <h3>{guide.title}</h3>
              <p className="small muted ins-note">{guide.note}</p>
              <Steps items={guide.steps} current={-1} />
              <p className="small muted ins-detected">
                Detected: {p.name}{p.browser ? `, ${p.browser}` : ""}.{" "}
                <button className="linkish" onClick={() => go("install-all")}>
                  Show every platform
                </button>
              </p>
            </div>
          </div>

          <div className="card card-pad">
            <h3 style={{ margin: "0 0 10px" }}>What you get</h3>
            <ul className="ins-perks">
              <li><b>Full screen.</b> No address bar, no browser tabs.</li>
              <li><b>Its own icon.</b> On the home screen, Dock or taskbar.</li>
              <li><b>Works offline.</b> Your material and progress open without a connection. Writing new questions still needs one.</li>
              <li><b>Updates itself.</b> There is nothing to reinstall.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function InstallAll({ go }) {
  return (
    <div className="page fade">
      <div className="page-head">
        <h1>Every platform</h1>
        <p>The same app, installed whichever way your device prefers.</p>
      </div>
      <div className="stack">
        {["ios", "android", "mac-chromium", "mac-safari", "windows"].map((id) => (
          <div key={id} className="card card-pad">
            <h3 style={{ margin: "0 0 4px" }}>{GUIDES[id].title}</h3>
            <p className="small muted ins-note">{GUIDES[id].note}</p>
            <Steps items={GUIDES[id].steps} current={-1} />
          </div>
        ))}
        <button className="btn ghost" onClick={() => go("install")}>Back</button>
      </div>
    </div>
  );
}
