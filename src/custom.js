// Customisation. Palettes are built from three seed colours rather than a long
// list of hand written variables, so a new look is one line and every shade
// stays in proportion to the others.

import { load, save } from "./store.js";

export const CUSTOM_KEY = "dwiddle-custom";
export const CUSTOM_BG_KEY = "dwiddle-custom-bg";

const hex = (h) => {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const str = (r, g, b) =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

function mix(a, b, t) {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  return str(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

// One seed trio produces a whole coherent scheme. The weights are lifted from
// the ratios in the default stylesheet, so a palette never looks flatter or
// harsher than the design it replaces.
function scheme(bg, ink, accent) {
  return {
    "--bg": bg,
    "--panel": mix(bg, ink, 0.022),
    "--surface": bg,
    "--sunken": mix(bg, ink, 0.014),
    "--hover": mix(bg, ink, 0.05),
    "--active": mix(bg, ink, 0.09),
    "--line": mix(bg, ink, 0.085),
    "--line-soft": mix(bg, ink, 0.042),
    "--ink": ink,
    "--ink-2": mix(ink, bg, 0.32),
    "--ink-3": mix(ink, bg, 0.55),
    "--accent": accent,
    "--accent-soft": mix(bg, accent, 0.13),
    "--btn": ink,
    "--btn-ink": bg,
    "--dash": mix(bg, ink, 0.16),
  };
}

export const PALETTES = [
  { id: "default", name: "Dwiddle", swatch: "#3B5BFD", light: null, dark: null },
  { id: "cottage", name: "Cottage", swatch: "#C97B84",
    light: ["#FDF7F4", "#3A2B2E", "#A55561"], dark: ["#191316", "#F3E7E6", "#E39AA2"] },
  { id: "matcha", name: "Matcha", swatch: "#6E9C5A",
    light: ["#F4F8F0", "#232F1F", "#4E7A41"], dark: ["#12170F", "#E7EFE2", "#8FBE7B"] },
  { id: "lavender", name: "Lavender", swatch: "#7C6BC4",
    light: ["#F7F5FC", "#2A2634", "#7059C0"], dark: ["#15121D", "#EAE6F5", "#A995F0"] },
  { id: "sand", name: "Sand", swatch: "#B5813C",
    light: ["#FAF6EE", "#302A21", "#8F6224"], dark: ["#17140F", "#F0E9DC", "#D9A85C"] },
  { id: "ocean", name: "Ocean", swatch: "#2F7FA8",
    light: ["#F1F7FA", "#17262F", "#2A7699"], dark: ["#0E161C", "#E2EEF4", "#65B4D8"] },
  { id: "mono", name: "Mono", swatch: "#3A3A3A",
    light: ["#F7F7F6", "#141414", "#3A3A3A"], dark: ["#131313", "#EDEDED", "#C4C4C4"] },
  { id: "midnight", name: "Midnight", swatch: "#7C8CFF",
    light: ["#F4F5FB", "#1A1C28", "#4B5DE8"], dark: ["#101018", "#ECECF6", "#8B9BFF"] },
];

export const FONTS = [
  { id: "system", name: "Default", stack: null },
  { id: "rounded", name: "Rounded", stack: '"SF Pro Rounded", ui-rounded, "Nunito", "Segoe UI", system-ui, sans-serif' },
  { id: "serif", name: "Serif", stack: 'Georgia, "Iowan Old Style", "Times New Roman", serif' },
  { id: "mono", name: "Mono", stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
];

export const RADII = [
  { id: "sharp", name: "Sharp", v: "4px" },
  { id: "soft", name: "Soft", v: "10px" },
  { id: "round", name: "Round", v: "18px" },
];

// Dashboard widgets, in their default order. Anything not listed in a saved
// order is appended, so adding a widget later cannot strand an old layout.
export const WIDGETS = [
  { id: "stats", name: "Streak and accuracy", fixed: false },
  { id: "photo", name: "Your photo", fixed: false, optIn: true },
  { id: "quote", name: "Your own words", fixed: false, optIn: true },
  { id: "upnext", name: "Recommended topics", fixed: false },
  { id: "actions", name: "Practice and study sheet", fixed: false },
];

export const PRESETS = [
  { id: "clean", name: "Clean", cfg: { palette: "default", radius: "soft", font: "system",
      widgets: { stats: true, photo: false, quote: false, upnext: true, actions: true } } },
  { id: "cottage", name: "Cottage", cfg: { palette: "cottage", radius: "round", font: "rounded",
      widgets: { stats: true, photo: true, quote: true, upnext: true, actions: true } } },
  { id: "study", name: "Dark academia", cfg: { palette: "sand", radius: "sharp", font: "serif",
      widgets: { stats: true, photo: true, quote: true, upnext: true, actions: true } } },
  { id: "focus", name: "Focus", cfg: { palette: "mono", radius: "sharp", font: "system",
      widgets: { stats: true, photo: false, quote: false, upnext: false, actions: true } } },
];

export const DEFAULT_CUSTOM = {
  on: false,
  palette: "default",
  accent: null,
  radius: "soft",
  font: "system",
  quote: "",
  dim: 55,
  blur: 0,
  widgets: { stats: true, photo: false, quote: false, upnext: true, actions: true },
  order: WIDGETS.map((w) => w.id),
};

export function loadCustom() {
  const saved = load(CUSTOM_KEY, null);
  if (!saved) return { ...DEFAULT_CUSTOM };
  return {
    ...DEFAULT_CUSTOM,
    ...saved,
    widgets: { ...DEFAULT_CUSTOM.widgets, ...(saved.widgets || {}) },
    order: orderOf(saved.order),
  };
}

export function saveCustom(cfg) {
  save(CUSTOM_KEY, cfg);
}

// Keeps a saved order valid as widgets are added or removed in later versions.
function orderOf(saved) {
  const ids = WIDGETS.map((w) => w.id);
  const kept = (Array.isArray(saved) ? saved : []).filter((id) => ids.includes(id));
  return [...kept, ...ids.filter((id) => !kept.includes(id))];
}

export function loadBg() {
  try { return localStorage.getItem(CUSTOM_BG_KEY) || null; } catch { return null; }
}

export function saveBg(dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(CUSTOM_BG_KEY, dataUrl);
    else localStorage.removeItem(CUSTOM_BG_KEY);
    return true;
  } catch {
    return false; // quota, almost always an image that is still too large
  }
}

// Photographs off a phone are several megabytes and browser storage is a few,
// so an upload is resized and re-encoded before it is ever stored.
export function shrink(file, maxSide = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not an image this browser can open."));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const VARS = Object.keys(scheme("#ffffff", "#000000", "#000000"));

// Applied to the root element as inline custom properties, which beat the
// stylesheet without editing it, and are removed cleanly when turned off.
export function applyCustom(cfg, resolvedTheme) {
  const root = document.documentElement;
  const clear = () => {
    VARS.forEach((v) => root.style.removeProperty(v));
    root.style.removeProperty("--radius");
    root.style.removeProperty("--font");
    root.classList.remove("has-custom-bg");
  };

  if (!cfg || !cfg.on) { clear(); return; }

  const pal = PALETTES.find((p) => p.id === cfg.palette);
  const seeds = pal && (resolvedTheme === "dark" ? pal.dark : pal.light);
  clear();

  if (seeds) {
    const vars = scheme(seeds[0], seeds[1], cfg.accent || seeds[2]);
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  } else if (cfg.accent) {
    root.style.setProperty("--accent", cfg.accent);
  }

  const r = RADII.find((x) => x.id === cfg.radius);
  if (r && r.id !== "soft") root.style.setProperty("--radius", r.v);

  const f = FONTS.find((x) => x.id === cfg.font);
  if (f && f.stack) root.style.setProperty("--font", f.stack);
}
