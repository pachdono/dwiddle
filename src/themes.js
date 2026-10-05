// The themes in Settings. Each is a complete look, with its own light and dark
// form, rather than a set of controls: a page gradient, the surface the cards
// sit on, the ink, one accent, a font and a corner radius, chosen together so
// they cannot be combined into something that clashes.
//
// Classic is the look the stylesheet already has, so choosing it sets nothing.

import { load, save } from "./store.js";
import { scheme, mix, ensure, inkOn } from "./custom.js";

export const LOOK_KEY = "dwiddle-look";

const SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif';
// No web font is named here: the notebook loads its fonts (Nunito among them)
// for itself, and a name shared with this list made the whole app switch to
// whichever notebook font had been opened.
const ROUNDED = '"SF Pro Rounded", ui-rounded, "Segoe UI", system-ui, sans-serif';

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
  {
    id: "sunset", name: "Sunset", blurb: "Peach and coral, golden hour.", font: ROUNDED, radius: "16px",
    light: { grad: ["#FFF3E6", "#FFD3BC"], card: "#FFFCF8", ink: "#35231A", accent: "#DE5F37" },
    dark: { grad: ["#2A1812", "#140C09"], card: "#23150F", ink: "#FBE9DD", accent: "#FF9A6B" },
  },
  {
    id: "autumn", name: "Autumn", blurb: "Maple, amber and warm browns.", font: SERIF, radius: "10px",
    light: { grad: ["#FBF3E7", "#F0DCC0"], card: "#FFFBF4", ink: "#33241A", accent: "#B24E1E" },
    dark: { grad: ["#251A12", "#130D09"], card: "#21170F", ink: "#F4E6D6", accent: "#E48B4E" },
  },
  {
    id: "midnight", name: "Midnight", blurb: "A starry sky, with gold for the stars.", radius: "14px",
    light: { grad: ["#EEF0FB", "#D3D8F2"], card: "#FBFBFF", ink: "#171A33", accent: "#3D48B8" },
    dark: { grad: ["#141836", "#080A1A"], card: "#12152C", ink: "#E9EBFA", accent: "#F2C75C" },
  },
];

// The New layout's only look: warm cream by day, soft charcoal at night, with
// one calm purple. It is not in the list; the layout switches to it.
export const CALM = {
  id: "calm", name: "Calm", radius: "14px",
  light: { grad: ["#F7F2E8", "#F0E9DB"], card: "#FCFAF5", ink: "#2A2722", accent: "#6A4FE0" },
  dark: { grad: ["#1A1A1B", "#161617"], card: "#202022", ink: "#ECE9E2", accent: "#A38BF5" },
};

export const themeOf = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
export const loadLook = () => load(LOOK_KEY, "classic");
export const saveLook = (id) => save(LOOK_KEY, id);

const SET = [...Object.keys(scheme("#ffffff", "#000000", "#000000")),
  "--bg-grad", "--radius", "--font", "--hl-def"];

export function applyLook(id, resolved) {
  const root = document.documentElement;
  SET.forEach((v) => root.style.removeProperty(v));
  // the New layout has no scenery: its own look is the only one
  root.dataset.look = root.dataset.clean === "1" ? "calm" : id || "classic";
  const calm = root.dataset.clean === "1";
  const t = calm ? CALM : themeOf(id);
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

  // Measured on the panels the text actually sits on, not just the page:
  // muted text and the accent, used as text, have to stay readable on all of them.
  const sits = [bottom, top, m.card, vars["--panel"], vars["--sunken"], vars["--hover"], vars["--active"], vars["--accent-soft"]];
  vars["--ink-3"] = ensure(mix(m.ink, m.card, 0.55), sits, 4.6, m.ink);
  vars["--ink-2"] = ensure(mix(m.ink, m.card, 0.32), sits, 7, m.ink);
  vars["--accent"] = ensure(m.accent, [m.card, vars["--panel"], bottom], 4.5, m.ink);
  vars["--accent-ink"] = inkOn(vars["--accent"]);

  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.setProperty("--bg-grad", `linear-gradient(170deg, ${top} 0%, ${bottom} 100%)`);
  if (t.radius) root.style.setProperty("--radius", t.radius);
  if (t.font) root.style.setProperty("--font", t.font);
}
