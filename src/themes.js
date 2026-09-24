// The themes in Settings. Each is a complete look, with its own light and dark
// form, rather than a set of controls: a page gradient, the surface the cards
// sit on, the ink, one accent, a font and a corner radius, chosen together so
// they cannot be combined into something that clashes.
//
// Classic is the look the stylesheet already has, so choosing it sets nothing.

import { load, save } from "./store.js";
import { scheme, mix } from "./custom.js";

export const LOOK_KEY = "dwiddle-look";

const SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif';
const ROUNDED = '"SF Pro Rounded", ui-rounded, "Nunito", "Segoe UI", system-ui, sans-serif';

// grad: the page, top to bottom. card: what panels sit on. The rest seed the
// shades in between.
export const THEMES = [
  {
    id: "classic", name: "Classic", blurb: "White and black, nothing else.",
    preview: { light: ["#FFFFFF", "#F4F4F2", "#3B5BFD"], dark: ["#121215", "#1B1B20", "#8BA0FF"] },
  },
  {
    id: "sakura", name: "Sakura", blurb: "Cherry blossom pinks.", font: ROUNDED, radius: "16px",
    light: { grad: ["#FFF0F4", "#FBD3E0"], card: "#FFFBFC", ink: "#3A2230", accent: "#D1497A" },
    dark: { grad: ["#1D1519", "#151013"], card: "#211A1E", ink: "#F3E7E6", accent: "#E39AA2" },
  },
  {
    id: "cottage", name: "Cottage", blurb: "Parchment, moss and a storybook serif.", font: SERIF, radius: "8px",
    light: { grad: ["#F8F2E2", "#EADFC3"], card: "#FDF9EF", ink: "#2E2A1D", accent: "#46652D" },
    dark: { grad: ["#221F17", "#12100B"], card: "#1F1C15", ink: "#EFE8D5", accent: "#A9C47A" },
  },
  {
    id: "matcha", name: "Matcha", blurb: "Soft greens, like the tea.", radius: "14px",
    light: { grad: ["#F3F8EC", "#D9EBC6"], card: "#FCFEF8", ink: "#1E2A18", accent: "#4F8536" },
    dark: { grad: ["#18210F", "#0C1108"], card: "#18200F", ink: "#E6F0DB", accent: "#9DCC76" },
  },
  {
    id: "violet", name: "Violet", blurb: "Lavender by day, deep purple at night.", radius: "14px",
    light: { grad: ["#F6F1FE", "#E2D5FA"], card: "#FDFBFF", ink: "#261D38", accent: "#7447D6" },
    dark: { grad: ["#221733", "#110B1C"], card: "#1D1529", ink: "#EEE7FB", accent: "#B99CFF" },
  },
  {
    id: "ocean", name: "Ocean blue", blurb: "Sky and sea blues.", radius: "12px",
    light: { grad: ["#EEF7FD", "#CBE5F6"], card: "#FAFDFF", ink: "#0F2231", accent: "#1C6DAA" },
    dark: { grad: ["#10223A", "#07111F"], card: "#0F1F31", ink: "#DFEDF8", accent: "#5CB1EA" },
  },
  {
    id: "prismarine", name: "Prismarine", blurb: "Mint and sea glass.", radius: "12px",
    light: { grad: ["#EDFBF6", "#C3EEE0"], card: "#FAFFFD", ink: "#0E2923", accent: "#168F79" },
    dark: { grad: ["#0F2A26", "#061613"], card: "#0E2521", ink: "#DCF5EE", accent: "#5ED7BE" },
  },
];

export const themeOf = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
export const loadLook = () => load(LOOK_KEY, "classic");
export const saveLook = (id) => save(LOOK_KEY, id);

const SET = [...Object.keys(scheme("#ffffff", "#000000", "#000000")),
  "--bg-grad", "--radius", "--font", "--hl-def"];

export function applyLook(id, resolved) {
  const root = document.documentElement;
  SET.forEach((v) => root.style.removeProperty(v));
  root.dataset.look = id || "classic";
  const t = themeOf(id);
  const m = t[resolved === "dark" ? "dark" : "light"];
  if (!m) return;

  const [top, bottom] = m.grad;
  const bg = mix(top, bottom, 0.5);
  const vars = scheme(bg, m.ink, m.accent);

  // Panels are solid, so text on them reads the same wherever the gradient
  // behind is at. Hover and pressed states are shades of the panel, not the
  // page, or they would show as a different colour from the card they are in.
  vars["--surface"] = m.card;
  vars["--panel"] = mix(m.card, bottom, 0.35);
  vars["--sunken"] = mix(m.card, m.ink, 0.025);
  vars["--hover"] = mix(m.card, m.ink, 0.055);
  vars["--active"] = mix(m.card, m.ink, 0.1);
  vars["--line"] = mix(m.card, m.ink, 0.1);
  vars["--line-soft"] = mix(m.card, m.ink, 0.05);
  vars["--accent-soft"] = mix(m.card, m.accent, resolved === "dark" ? 0.2 : 0.12);
  vars["--dash"] = mix(m.card, m.ink, 0.2);
  // The highlighters take a tint of the theme, so a pink page does not carry
  // the default blue definition marks.
  vars["--hl-def"] = mix(m.card, m.accent, resolved === "dark" ? 0.3 : 0.2);

  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty("--bg-grad", `linear-gradient(170deg, ${top} 0%, ${bottom} 100%)`);
  if (t.radius) root.style.setProperty("--radius", t.radius);
  if (t.font) root.style.setProperty("--font", t.font);
}
