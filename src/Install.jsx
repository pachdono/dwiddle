import { useEffect, useState } from "react";
import { DuckMark } from "./Duck.jsx";
import { platform, isInstalled, canPrompt, onPromptChange, promptInstall, DOWNLOADS, downloadFor, hrefOf } from "./install.js";
import desktopNotes from "./assets/shots/desktop-notes.webp";
import desktopLesson from "./assets/shots/desktop-lesson.webp";
import phoneLesson from "./assets/shots/phone-lesson.webp";
import phoneNotes from "./assets/shots/phone-notes.webp";

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

// When there is a proper download for the computer, the steps are for that
// download. The browser's own install, which the guides above describe, is a
// lesser version of the same thing, and describing both on one page is how
// someone ends up with two copies and no idea which to open.
const DOWNLOAD_GUIDES = {
  mac: {
    title: "Install on your Mac",
    note: "Choose Apple Silicon for any Mac from late 2020 onwards, and Intel for older ones.",
    steps: [
      "Open the file you downloaded. A window opens with Dwiddle and your Applications folder.",
      "Drag Dwiddle onto Applications.",
      "The first time only, right click Dwiddle in Applications and choose Open, then Open again.",
      "From then on it opens from Launchpad or the Dock like any other app.",
    ],
  },
  windows: {
    title: "Install on Windows",
    note: "The installer is small. It downloads the rest of Dwiddle as it goes.",
    steps: [
      "Open the file you downloaded.",
      "If a blue box says Windows protected your PC, choose More info, then Run anyway.",
      "It installs and opens by itself. There is nothing to choose.",
      "Next time, open it from the Start menu or the shortcut on your desktop.",
    ],
  },
};

export default function Install({ go }) {
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState(canPrompt());
  const p = platform();
  const installed = isInstalled();
  const onPhone = ["ios", "ios-other", "android"].includes(p.id);
  const guide = GUIDES[p.id] || GUIDES.other;

  useEffect(() => onPromptChange(setPrompt), []);

  // The walkthrough loops on its own, and stops for anyone who has asked for
  // less movement rather than looping behind their back.
  useEffect(() => {
    if (!onPhone) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setStep((n) => (n + 1) % STEPS.length), 2400);
    return () => clearInterval(t);
  }, []);

  const downloads = DOWNLOADS.ready && ["mac-chromium", "mac-safari", "windows", "other"].includes(p.id) ? downloadFor(p.id) : [];
  const how = downloads.length && p.id !== "other"
    ? DOWNLOAD_GUIDES[p.id === "windows" ? "windows" : "mac"]
    : guide;
  const size = p.id === "windows"
    ? "A small installer that brings the rest down as it goes, about 100 MB in all."
    : "About 115 MB. Drag it into Applications and it is installed.";

  return (
    <div className="page wide fade ins">
      {/* What it is, shown rather than described: the real app, captured, on
          the two screens most people will put it on. */}
      <section className="ins-hero">
        <div className="ins-hero-copy">
          <span className="ins-kicker">For Mac, Windows, iPhone and Android</span>
          <h1>Dwiddle, as an app</h1>
          <p className="ins-lead">
            Your notes, lessons and practice in a window of their own, one click from your
            Dock, taskbar or home screen. Free, like everything else in Dwiddle.
          </p>

          {installed ? (
            <div className="ins-have"><Check /> You are using the app already, and it keeps itself up to date.</div>
          ) : downloads.length > 0 ? (
            <>
              <div className="ins-dl-row">
                {downloads.map((d) => (
                  <a key={d.file} className={"btn" + (d.primary ? " cta ins-big" : " ghost")}
                    href={hrefOf(d)} download>
                    {d.label}
                  </a>
                ))}
              </div>
              <p className="ins-fine">
                {size} Version {DOWNLOADS.version}.{" "}
                <button className="linkish" onClick={() => go("install-all")}>Other devices</button>
              </p>
            </>
          ) : (
            <div className="ins-dl-row">
              <button className="btn cta ins-big"
                onClick={() => document.getElementById("ins-how")?.scrollIntoView({ behavior: "smooth" })}>
                Show me how
              </button>
              <button className="btn ghost" onClick={() => go("install-all")}>Other devices</button>
            </div>
          )}
        </div>

        <div className="ins-hero-art" aria-hidden="true">
          <MacFrame src={desktopNotes} />
          <PhoneFrame src={phoneLesson} className="ins-hero-phone" />
        </div>
      </section>

      {!installed && (
        <section className="ins-how" id="ins-how">
          {prompt && (
            <div className="card card-pad ins-prompt">
              <div>
                <b>Your browser can install it right now</b>
                <p className="small muted" style={{ margin: "4px 0 0" }}>
                  One click, and it gets its own window and icon.
                </p>
              </div>
              <button className="btn cta" onClick={promptInstall}>Install Dwiddle</button>
            </div>
          )}

          <div className={"ins-grid" + (onPhone ? "" : " no-demo")}>
            {onPhone && (
            <div className="ins-demo">
              <Phone step={step} />
              <div className="ins-caption">
                <span className="ins-step-n">{step + 1}</span>
                {STEPS[step].label}
              </div>
              <div className="ins-dots">
                {STEPS.map((st, i) => (
                  <button
                    key={st.label}
                    className={"ins-pip" + (i === step ? " on" : "")}
                    onClick={() => setStep(i)}
                    aria-label={`Step ${i + 1}`}
                  />
                ))}
              </div>
            </div>
            )}

            <div className="card card-pad ins-guide">
              <h3>{how.title}</h3>
              <p className="small muted ins-note">{how.note}</p>
              <Steps items={how.steps} current={-1} />
            </div>
          </div>
        </section>
      )}

      <section className="ins-features">
        <h2>What you get</h2>

        <div className="ins-feature">
          <div className="ins-feature-art"><MacFrame src={desktopLesson} /></div>
          <div className="ins-feature-copy">
            <h3>A window of its own</h3>
            <p>
              Dwiddle opens from your Dock, taskbar or home screen, the same as any other app. There
              are no browser tabs to dig through, and a lesson has the whole window to itself.
            </p>
          </div>
        </div>

        <div className="ins-feature reverse">
          <div className="ins-feature-art narrow"><PhoneFrame src={phoneNotes} offline /></div>
          <div className="ins-feature-copy">
            <h3>Revise without Wi-Fi</h3>
            <p>
              The notes, lessons and questions you have made are kept on the device, so you can
              revise on a train or a plane. Only making something new needs a connection.
            </p>
          </div>
        </div>

        <div className="ins-feature compact">
          <div className="ins-feature-icon"><Refresh /></div>
          <div className="ins-feature-copy">
            <h3>Always the newest version</h3>
            <p>
              On Windows and on phones, updates arrive on their own. On a Mac, Dwiddle tells you
              when one is ready and takes you straight to it.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// The app in a Mac window. The frame is drawn, the contents are a screenshot.
function MacFrame({ src }) {
  return (
    <div className="frame-mac">
      <div className="frame-mac-bar"><i /><i /><i /></div>
      <img src={src} alt="" loading="lazy" width="1280" height="800" />
    </div>
  );
}

// The app on a phone. A real phone keeps the app clear of the island with a
// status bar, so this does too: the time on the left, and on the right either
// signal and battery or, for the offline example, the aeroplane.
function PhoneFrame({ src, className = "", offline = false }) {
  return (
    <div className={"frame-phone " + className}>
      <div className="frame-phone-screen">
        <div className="frame-phone-status">
          <span className="fps-time">9:41</span>
          <span className="frame-phone-island" />
          <span className="fps-icons">
            {offline ? (
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M18 12.5v-1.6l-6.5-4V3a1.5 1.5 0 0 0-3 0v3.9L2 10.9v1.6l6.5-2v3.9l-1.8 1.3v1.3l3.3-1 3.3 1v-1.3l-1.8-1.3v-3.9z" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 14" fill="currentColor" aria-hidden="true">
                <rect x="0" y="9" width="3" height="5" rx="1" /><rect x="5" y="6" width="3" height="8" rx="1" />
                <rect x="10" y="3" width="3" height="11" rx="1" /><rect x="15" y="0" width="3" height="14" rx="1" />
              </svg>
            )}
            <svg viewBox="0 0 28 14" fill="none" aria-hidden="true">
              <rect x="0.5" y="0.5" width="23" height="13" rx="3.5" stroke="currentColor" opacity="0.4" />
              <rect x="2" y="2" width="17" height="10" rx="2" fill="currentColor" />
              <path d="M25.5 5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
            </svg>
          </span>
        </div>
        <img src={src} alt="" loading="lazy" width="390" height="844" />
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 10.5 8 14l7.5-8" /></svg>
  );
}

function Refresh() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />
    </svg>
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

// Get the app as a page of its own, for the front page's link. It used to drop
// a visitor into the app itself, sidebar and all, to read about installing
// the app: a strange first look at something they had not chosen to open yet.
// This keeps them on the site, under the same bar as the front page.
export function DownloadPage({ onHome, onOpen, onLegal }) {
  const [all, setAll] = useState(false);
  const go = (id) => {
    setAll(id === "install-all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  useEffect(() => { document.title = "Get the app | Dwiddle"; return () => { document.title = "Dwiddle"; }; }, []);

  return (
    <div className="landing dl-page">
      <header className="glassbar">
        <button className="glass-brand" onClick={onHome} aria-label="Back to the front page">
          <DuckMark size={22} />
          <span>Dwiddle</span>
        </button>
        <nav className="glass-nav">
          <button onClick={onHome}>Home</button>
          <button className={all ? "" : "on"} onClick={() => go("install")}>Download</button>
          <button className={all ? "on" : ""} onClick={() => go("install-all")}>Every device</button>
        </nav>
        <button className="btn small glass-cta" onClick={onOpen}>Open Dwiddle</button>
      </header>

      <div className="dl-body">
        {all ? <InstallAll go={go} /> : <Install go={go} />}
      </div>

      <footer className="landing-foot">
        <span>&copy; {new Date().getFullYear()} Dwiddle</span>
        <button className="linkish" onClick={() => onLegal("privacy")}>Privacy</button>
        <button className="linkish" onClick={() => onLegal("terms")}>Terms</button>
        <button className="linkish" onClick={onOpen}>Use it in the browser</button>
        <a className="linkish" href="mailto:dwiddle36@gmail.com">Contact</a>
      </footer>
    </div>
  );
}
