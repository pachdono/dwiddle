import { useEffect, useState } from "react";

// Clean mode: a quieter layout, as a setting. Off by default; stored on this
// device, and mirrored onto <html> so styles can key off it.
const KEY = "dwiddle-clean";
const getClean = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
export function applyClean() { document.documentElement.dataset.clean = getClean() ? "1" : "0"; }
export function setClean(on) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
  applyClean();
  dispatchEvent(new Event("dwiddle:clean"));
}
export function useClean() {
  const [on, setOn] = useState(getClean());
  useEffect(() => { const f = () => setOn(getClean()); addEventListener("dwiddle:clean", f); return () => removeEventListener("dwiddle:clean", f); }, []);
  return on;
}
