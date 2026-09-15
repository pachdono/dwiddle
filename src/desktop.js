// Am I running inside the desktop app?
//
// The packaged app is not "standalone" display mode, so the media query that
// detects an installed web app does not fire here. The preload bridge is the
// only reliable signal, and it cannot be faked by a page.

const bridge = typeof window !== "undefined" ? window.DWIDDLE_DESKTOP : null;

export const isDesktop = !!bridge;
export const onMac = !!bridge && bridge.platform === "darwin";

// The installed version, so Settings can say which one this is.
export const appVersion = (bridge && bridge.version) || "";

// Removing the app from inside itself. Absent on the web, and absent in any
// build of the app from before it existed.
export const uninstaller = typeof window !== "undefined" ? window.DWIDDLE_UNINSTALL || null : null;
