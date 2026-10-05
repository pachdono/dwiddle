import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ContextMenu } from "./ContextMenu.jsx";
import "./styles.css";
import { applyFx, watchFrames } from "./perf.js";
import { applyClean } from "./clean.js";

applyFx();
applyClean();
watchFrames();

// After a new deploy, a page that was already open still asks for the old
// file names, which no longer exist. Load the new version once instead of
// failing, but never loop if the file really is missing.
window.addEventListener("vite:preloadError", (e) => {
  let last = 0;
  try { last = +sessionStorage.getItem("dwiddle-reloaded") || 0; } catch { /* private mode */ }
  if (Date.now() - last < 30000) return;
  e.preventDefault();
  try { sessionStorage.setItem("dwiddle-reloaded", String(Date.now())); } catch { /* private mode */ }
  location.reload();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <ContextMenu />
  </StrictMode>,
);

// Offline support, and what makes the browser offer "Install". Registered only
// in a real build: in dev it would cache the dev server's modules and make
// every later change look like it had not taken.
if (import.meta.env.PROD && "serviceWorker" in navigator &&
  location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // An unsupported or blocked worker only costs offline support.
    });
  });
}
