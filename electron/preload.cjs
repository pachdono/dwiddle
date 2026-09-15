// The only thing the page is told about its host: where to send API calls,
// since a page loaded from disk has no origin of its own to be relative to.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld(
  "DWIDDLE_API",
  process.env.DWIDDLE_SITE || "https://dwiddle.vercel.app",
);

// So the interface can lay itself out for a window rather than a tab.
contextBridge.exposeInMainWorld("DWIDDLE_DESKTOP", {
  platform: process.platform,
  version: (process.argv.find((a) => a.startsWith("--dwiddle-version=")) || "").split("=")[1] || "",
});

// The sign in link comes back through the app's own scheme, and the page is
// handed only the URL, never the ipc channel itself.
contextBridge.exposeInMainWorld("DWIDDLE_AUTH", {
  onCallback: (fn) => {
    const handler = (_event, url) => fn(url);
    ipcRenderer.on("dwiddle:auth", handler);
    return () => ipcRenderer.removeListener("dwiddle:auth", handler);
  },
});

// Update progress, and the button that restarts into the new version.
contextBridge.exposeInMainWorld("DWIDDLE_UPDATE", {
  on: (fn) => {
    const handler = (_e, payload) => fn(payload);
    ipcRenderer.on("dwiddle:update", handler);
    return () => ipcRenderer.removeListener("dwiddle:update", handler);
  },
  install: () => ipcRenderer.invoke("dwiddle:install-update"),
});

// Removing the app. The page can ask what would be removed, and can ask for it
// to happen, but only by passing the phrase the person typed, which the main
// process checks again for itself.
contextBridge.exposeInMainWorld("DWIDDLE_UNINSTALL", {
  plan: () => ipcRenderer.invoke("dwiddle:uninstall-plan"),
  run: (phrase) => ipcRenderer.invoke("dwiddle:uninstall", phrase),
});
