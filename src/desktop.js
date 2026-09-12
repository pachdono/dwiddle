// Am I running inside the desktop app?
//
// The packaged app is not "standalone" display mode, so the media query that
// detects an installed web app does not fire here. The preload bridge is the
// only reliable signal, and it cannot be faked by a page.

const bridge = typeof window !== "undefined" ? window.DWIDDLE_DESKTOP : null;

export const isDesktop = !!bridge;
export const onMac = !!bridge && bridge.platform === "darwin";
