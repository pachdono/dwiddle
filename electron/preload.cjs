// The only thing the page is told about its host: where to send API calls,
// since a page loaded from disk has no origin of its own to be relative to.

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld(
  "DWIDDLE_API",
  process.env.DWIDDLE_SITE || "https://dwiddle.vercel.app",
);
