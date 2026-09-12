// What platform this is, and whether the browser will offer to install.
//
// The listener is registered at module scope because beforeinstallprompt fires
// once, early, and is gone if nothing is listening when it does.

let deferred = null;
const waiting = new Set();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    waiting.forEach((fn) => fn(true));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    waiting.forEach((fn) => fn(false));
  });
}

export function canPrompt() {
  return !!deferred;
}

export function onPromptChange(fn) {
  waiting.add(fn);
  return () => waiting.delete(fn);
}

// Returns "accepted", "dismissed", or null when the browser never offered.
export async function promptInstall() {
  if (!deferred) return null;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  waiting.forEach((fn) => fn(false));
  return outcome;
}

export function isInstalled() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

export function platform() {
  if (typeof navigator === "undefined") return { id: "other", name: "this device" };
  const ua = navigator.userAgent;
  const touch = navigator.maxTouchPoints > 1;

  // An iPad on recent iPadOS reports itself as a Mac, so the touch count is
  // the only thing that separates the two.
  const iOS = /iPhone|iPod/.test(ua) || (/iPad/.test(ua)) || (/Macintosh/.test(ua) && touch);
  if (iOS) {
    const inApp = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return {
      id: inApp ? "ios-other" : "ios",
      name: /iPad/.test(ua) || (/Macintosh/.test(ua) && touch) ? "iPad" : "iPhone",
      browser: /CriOS/.test(ua) ? "Chrome" : /FxiOS/.test(ua) ? "Firefox"
        : /EdgiOS/.test(ua) ? "Edge" : /OPiOS/.test(ua) ? "Opera" : "Safari",
    };
  }

  if (/Android/.test(ua)) return { id: "android", name: "Android" };

  const mac = /Macintosh|Mac OS X/.test(ua);
  const chromium = /Chrome|Chromium|Edg\//.test(ua) && !/OPR\//.test(ua);
  if (mac) return { id: chromium ? "mac-chromium" : "mac-safari", name: "Mac" };
  if (/Windows/.test(ua)) return { id: "windows", name: "Windows" };
  return { id: "other", name: "this device" };
}

// Where the installers live. They are 120 to 150 MB, which is far past what a
// deployment will serve, so they sit on a releases page instead.
//
// ready stays false until that page exists, and the download card simply does
// not appear, rather than offering a link that 404s.
const RELEASE = "https://github.com/pachdono/dwiddle-releases/releases/download/v1.0.0/";

export const DOWNLOADS = {
  ready: true,
  // The environment variable still wins, so a new build can be pointed
  // somewhere else without a code change.
  base: import.meta.env.VITE_DOWNLOAD_BASE || RELEASE,
  version: "1.0.0",
  page: "https://github.com/pachdono/dwiddle-releases/releases/latest",
};

const MAC_ARM = { file: "Dwiddle-1.0.0-arm64.dmg", label: "Download for Mac (Apple Silicon)", primary: true };
const MAC_X64 = { file: "Dwiddle-1.0.0-x64.dmg", label: "Intel Mac", primary: false };
const WINDOWS = { file: "Dwiddle-Setup-1.0.0.exe", label: "Download for Windows", primary: true };

export function downloadFor(id) {
  if (id === "windows") return [WINDOWS, { ...MAC_ARM, label: "Mac", primary: false }];
  if (id === "mac-chromium" || id === "mac-safari") return [MAC_ARM, MAC_X64, { ...WINDOWS, label: "Windows", primary: false }];
  return [MAC_ARM, WINDOWS];
}
