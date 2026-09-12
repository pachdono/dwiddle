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
