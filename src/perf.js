// Keeps the app smooth on slower machines. The painted backdrop moves all the
// time and most panels blur what is behind them, which a phone or an older
// laptop has to redraw every frame. In "lite" the scenery stands still and the
// blurring is dropped; panels are already close to solid, so they look the same.
//
// "auto" works it out: a small machine, someone who asked their system for less
// motion, or a quick measure of how fast frames are really being drawn.

import { load } from "./store.js";

const KEY = "dwiddle-fx";        // "auto" | "lite" | "full", the person's choice
const MEASURED = "dwiddle-fx-slow"; // set when the measure found frames being dropped

const getFx = () => load(KEY, "auto");
function small() {
  const nav = typeof navigator === "undefined" ? {} : navigator;
  if (nav.deviceMemory && nav.deviceMemory <= 4) return true;
  if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) return true;
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function applyFx() {
  const pref = getFx();
  const slow = (() => { try { return localStorage.getItem(MEASURED) === "1"; } catch { return false; } })();
  const lite = pref === "lite" || (pref === "auto" && (small() || slow));
  document.documentElement.dataset.fx = lite ? "lite" : "full";
  return lite;
}

// A couple of seconds after start, with the app showing, count frames. Under
// about 40 a second means this machine is struggling, so lite switches on and
// is remembered. Only ever measured once a session, and never when hidden.
export function watchFrames() {
  if (typeof requestAnimationFrame === "undefined" || getFx() !== "auto") return;
  setTimeout(() => {
    if (document.hidden || document.documentElement.dataset.fx === "lite") return;
    let n = 0, t0 = 0;
    const tick = (t) => {
      if (document.hidden) return;
      if (!t0) t0 = t;
      n++;
      if (t - t0 < 1500) return requestAnimationFrame(tick);
      const fps = (n * 1000) / (t - t0);
      if (fps < 40) { try { localStorage.setItem(MEASURED, "1"); } catch {} applyFx(); }
    };
    requestAnimationFrame(tick);
  }, 4000);
}
