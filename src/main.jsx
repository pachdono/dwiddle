import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
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
