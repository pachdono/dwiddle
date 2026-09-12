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
