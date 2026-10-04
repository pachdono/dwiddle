// Customisation. Palettes are derived from three seed colours rather than long
// hand written variable lists, so a new look is one line and every shade stays
// in proportion. Anything the user sets by hand overrides the derived value.

import { load, save } from "./store.js";

export const CUSTOM_KEY = "dwiddle-custom";
export const CUSTOM_BG_KEY = "dwiddle-custom-bg";

const hex = (h) => {
  const s = String(h).replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const str = (r, g, b) =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

export function mix(a, b, t) {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  return str(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

// WCAG contrast between two colours, 1 to 21. Body text wants 4.5 or more.
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lumOf = (c) => { const [r, g, b] = hex(c); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
export function contrast(a, b) {
  const x = lumOf(a), y = lumOf(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
// The colour nearest fg, moving towards `toward`, that reads at `min` or more
// on every one of `bgs`. A theme's muted text is picked for looks, and on some
// it came out too faint to read; this nudges it only as far as it needs.
export function ensure(fg, bgs, min, toward) {
  for (let t = 0; t <= 1.0001; t += 0.03) {
    const c = t === 0 ? fg : mix(fg, toward, Math.min(t, 1));
    if (bgs.every((bg) => contrast(c, bg) >= min)) return c;
  }
  return toward;
}
// White or near black, whichever reads better on this colour.
export const inkOn = (c) => (contrast("#FFFFFF", c) >= contrast("#101014", c) ? "#FFFFFF" : "#101014");

// Relative luminance, used to decide whether a colour the user picked needs
// light or dark text on top of it.
export function isDark(c) {
  const [r, g, b] = hex(c).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.42;
}

export function scheme(bg, ink, accent) {
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
    "--ink-2": ensure(mix(ink, bg, 0.32), [bg, mix(bg, ink, 0.09)], 7, ink),
    "--ink-3": ensure(mix(ink, bg, 0.55), [bg, mix(bg, ink, 0.09), mix(bg, accent, 0.2)], 4.6, ink),
    "--accent": accent,
    // Text sitting on the accent. A user can pick anything from near black to
    // near white, so this is measured rather than assumed.
    "--accent-ink": inkOn(accent),
    "--accent-soft": mix(bg, accent, 0.13),
    "--btn": ink,
    "--btn-ink": bg,
    "--dash": mix(bg, ink, 0.16),
  };
}

export const PALETTES = [
  { id: "default", name: "Dwiddle", swatch: "#3B5BFD",
    light: ["#FFFFFF", "#16161A", "#3B5BFD"], dark: ["#121215", "#EEEEF2", "#8B9BFF"] },
  { id: "cottage", name: "Cottage", swatch: "#A55561",
    light: ["#FDF7F4", "#3A2B2E", "#A55561"], dark: ["#191316", "#F3E7E6", "#E39AA2"] },
  { id: "matcha", name: "Matcha", swatch: "#4E7A41",
    light: ["#F4F8F0", "#232F1F", "#4E7A41"], dark: ["#12170F", "#E7EFE2", "#8FBE7B"] },
  { id: "lavender", name: "Lavender", swatch: "#7059C0",
    light: ["#F7F5FC", "#2A2634", "#7059C0"], dark: ["#15121D", "#EAE6F5", "#A995F0"] },
  { id: "sand", name: "Sand", swatch: "#8F6224",
    light: ["#FAF6EE", "#302A21", "#8F6224"], dark: ["#17140F", "#F0E9DC", "#D9A85C"] },
  { id: "ocean", name: "Ocean", swatch: "#2A7699",
    light: ["#F1F7FA", "#17262F", "#2A7699"], dark: ["#0E161C", "#E2EEF4", "#65B4D8"] },
  { id: "mono", name: "Mono", swatch: "#3A3A3A",
    light: ["#F7F7F6", "#141414", "#3A3A3A"], dark: ["#131313", "#EDEDED", "#C4C4C4"] },
  { id: "midnight", name: "Midnight", swatch: "#4B5DE8",
    light: ["#F4F5FB", "#1A1C28", "#4B5DE8"], dark: ["#101018", "#ECECF6", "#8B9BFF"] },
];

export const FONTS = [
  { id: "system", name: "Default", stack: null },
  { id: "rounded", name: "Rounded", stack: '"SF Pro Rounded", ui-rounded, "Segoe UI", system-ui, sans-serif' },
  { id: "serif", name: "Serif", stack: 'Georgia, "Iowan Old Style", "Times New Roman", serif' },
  { id: "mono", name: "Mono", stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
];

export const RADII = [
  { id: "sharp", name: "Sharp", v: "4px" },
  { id: "soft", name: "Soft", v: "10px" },
  { id: "round", name: "Round", v: "18px" },
];

export const WIDGETS = [
  { id: "stats", name: "Streak and accuracy" },
  { id: "continue", name: "Continue learning" },
  { id: "review", name: "Review due" },
  { id: "photo", name: "Photo" },
  { id: "quote", name: "Your own words" },
  { id: "upnext", name: "Recommended topics" },
  { id: "actions", name: "Shortcuts" },
  { id: "focus", name: "Mistakes and tip of the day" },
];

export const GRADIENTS = [
  { id: "none", name: "Flat" },
  { id: "sunset", name: "Sunset", a: "#FFD9C0", b: "#F3A0B8", angle: 160 },
  { id: "mint", name: "Mint", a: "#E6F7EC", b: "#BCE3D6", angle: 170 },
  { id: "dusk", name: "Dusk", a: "#2B2A54", b: "#12121C", angle: 170 },
  { id: "peach", name: "Peach", a: "#FFF1E2", b: "#FBD9D0", angle: 150 },
  { id: "steel", name: "Steel", a: "#EEF2F7", b: "#CBD6E4", angle: 165 },
];

export const DEFAULT_CUSTOM = {
  on: false,
  palette: "default",
  radius: "soft",
  font: "system",
  quote: "",
  // Anything null here falls through to the palette, so a preset stays
  // coherent until the user deliberately overrides one part of it.
  colors: { mode: "flat", bg1: null, bg2: null, angle: 160, card: null, ink: null, accent: null, line: null },
  photo: { dim: 45, blur: 0, place: "widget" }, // widget, background, or both
  widgets: { continue: true, review: true, stats: true, photo: false, quote: false, upnext: true, actions: true, focus: true },
  order: WIDGETS.map((w) => w.id),
};

export const PRESETS = [
  { id: "clean", name: "Clean", swatches: ["#FFFFFF", "#3B5BFD"],
    cfg: { palette: "default", radius: "soft", font: "system",
      colors: { ...DEFAULT_CUSTOM.colors } } },
  { id: "cottage", name: "Cottage", swatches: ["#FDF7F4", "#A55561"],
    cfg: { palette: "cottage", radius: "round", font: "rounded",
      colors: { mode: "gradient", bg1: "#FFF1E2", bg2: "#FBD9D0", angle: 150, card: "#FFFDFB", ink: null, accent: null, line: null } } },
  { id: "study", name: "Dark academia", swatches: ["#17140F", "#D9A85C"],
    cfg: { palette: "sand", radius: "sharp", font: "serif",
      colors: { ...DEFAULT_CUSTOM.colors } } },
  { id: "dusk", name: "Dusk", swatches: ["#2B2A54", "#8B9BFF"],
    cfg: { palette: "midnight", radius: "round", font: "system",
      colors: { mode: "gradient", bg1: "#2B2A54", bg2: "#12121C", angle: 170, card: "#1B1B2A", ink: "#ECECF6", accent: null, line: null } } },
  { id: "focus", name: "Focus", swatches: ["#F7F7F6", "#3A3A3A"],
    cfg: { palette: "mono", radius: "sharp", font: "system",
      colors: { ...DEFAULT_CUSTOM.colors } } },
];

function orderOf(saved) {
  const ids = WIDGETS.map((w) => w.id);
  const out = (Array.isArray(saved) ? saved : []).filter((id) => ids.includes(id));
  // A block added since the order was saved goes where it sits by default,
  // not to the bottom where nobody would find it.
  ids.forEach((id, i) => { if (!out.includes(id)) out.splice(Math.min(i, out.length), 0, id); });
  return out;
}

export function loadCustom() {
  const s = load(CUSTOM_KEY, null);
  if (!s) return structuredClone(DEFAULT_CUSTOM);
  return {
    ...DEFAULT_CUSTOM,
    ...s,
    // Settings saved by the first version kept accent, dim and blur at the top
    // level. They are folded in here so nobody loses their look on upgrade.
    colors: {
      ...DEFAULT_CUSTOM.colors,
      ...(s.colors || {}),
      ...(s.accent && !s.colors ? { accent: s.accent } : {}),
    },
    photo: {
      ...DEFAULT_CUSTOM.photo,
      ...(s.photo || {}),
      ...(s.dim !== undefined && !s.photo ? { dim: s.dim, blur: s.blur ?? 0, place: "both" } : {}),
    },
    widgets: { ...DEFAULT_CUSTOM.widgets, ...(s.widgets || {}) },
    order: orderOf(s.order),
  };
}

export const saveCustom = (cfg) => save(CUSTOM_KEY, cfg);

export function loadBg() {
  try { return localStorage.getItem(CUSTOM_BG_KEY) || null; } catch { return null; }
}

export function saveBg(dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(CUSTOM_BG_KEY, dataUrl);
    else localStorage.removeItem(CUSTOM_BG_KEY);
    return true;
  } catch {
    return false;
  }
}

// Phone photographs are several megabytes and browser storage is a few, so an
// upload is resized and re-encoded before it is ever stored.
export function shrink(file, maxSide = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type?.startsWith("image/")) return reject(new Error("That is not an image."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That image could not be opened."));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Takes a file from a picker or a drop, resizes it, and stores it. Returns the
// data URL so the caller can show it immediately.
export async function acceptImage(file) {
  let url = await shrink(file, 1600, 0.82);
  if (url.length > 1_400_000) url = await shrink(file, 1100, 0.7);
  if (url.length > 2_000_000) throw new Error("That image is too large even after resizing.");
  if (!saveBg(url)) throw new Error("Browser storage is full. Remove the current photo first.");
  return url;
}

const VARS = Object.keys(scheme("#ffffff", "#000000", "#000000"));
const EXTRA = ["--bg-grad", "--radius", "--font", "--card"];

export function applyCustom(cfg, resolvedTheme) {
  const root = document.documentElement;
  [...VARS, ...EXTRA].forEach((v) => root.style.removeProperty(v));
  if (!cfg || !cfg.on) return;

  const pal = PALETTES.find((p) => p.id === cfg.palette) || PALETTES[0];
  const seeds = resolvedTheme === "dark" ? pal.dark : pal.light;
  const c = cfg.colors || {};

  const bg = c.bg1 || seeds[0];
  const ink = c.ink || (c.bg1 ? (isDark(c.bg1) ? "#F2F2F6" : "#16161A") : seeds[1]);
  const accent = c.accent || seeds[2];

  const vars = scheme(bg, ink, accent);

  // Cards are their own surface, so a gradient page can still carry solid,
  // readable panels on top of it.
  if (c.card) {
    vars["--surface"] = c.card;
    vars["--panel"] = c.card;
    vars["--sunken"] = mix(c.card, ink, 0.02);
    vars["--hover"] = mix(c.card, ink, 0.05);
    vars["--active"] = mix(c.card, ink, 0.09);
  }
  if (c.line) {
    vars["--line"] = c.line;
    vars["--line-soft"] = mix(bg, c.line, 0.55);
  }

  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

  if (c.mode === "gradient" && c.bg1 && c.bg2) {
    root.style.setProperty("--bg-grad", `linear-gradient(${c.angle ?? 160}deg, ${c.bg1}, ${c.bg2})`);
  }

  const r = RADII.find((x) => x.id === cfg.radius);
  if (r) root.style.setProperty("--radius", r.v);

  const f = FONTS.find((x) => x.id === cfg.font);
  if (f && f.stack) root.style.setProperty("--font", f.stack);
}
