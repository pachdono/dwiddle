// Every font a notebook can write in: handwriting first, then typed fonts.
// Shared by the notebook and by turning notes into a notebook.

export const FONTS = [
  { id: "caveat", name: "Handwriting", css: '"Caveat", cursive', scale: 1.25, hand: true },
  { id: "nanum", name: "Pen script", css: '"Nanum Pen Script", cursive', scale: 1.45, hand: true, load: () => import("@fontsource/nanum-pen-script/400.css") },
  { id: "patrick", name: "Neat hand", css: '"Patrick Hand", cursive', scale: 1.1, hand: true },
  { id: "gochi", name: "Round hand", css: '"Gochi Hand", cursive', scale: 1.1, hand: true, load: () => import("@fontsource/gochi-hand/400.css") },
  { id: "indie", name: "Bubbly hand", css: '"Indie Flower", cursive', scale: 1.1, hand: true, load: () => import("@fontsource/indie-flower/400.css") },
  { id: "grace", name: "Casual hand", css: '"Covered By Your Grace", cursive', scale: 1.15, hand: true, load: () => import("@fontsource/covered-by-your-grace/400.css") },
  { id: "another", name: "Tall hand", css: '"Just Another Hand", cursive', scale: 1.5, hand: true, load: () => import("@fontsource/just-another-hand/400.css") },
  { id: "reenie", name: "Quick scrawl", css: '"Reenie Beanie", cursive', scale: 1.45, hand: true, load: () => import("@fontsource/reenie-beanie/400.css") },
  { id: "apple", name: "Joined up", css: '"Homemade Apple", cursive', scale: 0.9, hand: true, load: () => import("@fontsource/homemade-apple/400.css") },
  { id: "kalam", name: "Marker", css: '"Kalam", cursive', scale: 1.05, hand: true },
  { id: "shadows", name: "Light scribble", css: '"Shadows Into Light", cursive', scale: 1.15, hand: true },
  { id: "arial", name: "Arial", css: 'Arial, Helvetica, "Liberation Sans", sans-serif', scale: 1 },
  { id: "sans", name: "Typed", css: 'Inter, -apple-system, system-ui, sans-serif', scale: 1 },
  { id: "serif", name: "Book", css: 'Georgia, serif', scale: 1 },
  { id: "roboto", name: "Roboto", css: '"Roboto", sans-serif', scale: 1, load: () => import("@fontsource/roboto/400.css") },
  { id: "opensans", name: "Open Sans", css: '"Open Sans", sans-serif', scale: 1, load: () => import("@fontsource/open-sans/400.css") },
  { id: "lato", name: "Lato", css: '"Lato", sans-serif', scale: 1, load: () => import("@fontsource/lato/400.css") },
  { id: "montserrat", name: "Montserrat", css: '"Montserrat", sans-serif', scale: 0.95, load: () => import("@fontsource/montserrat/400.css") },
  { id: "poppins", name: "Poppins", css: '"Poppins", sans-serif', scale: 0.95, load: () => import("@fontsource/poppins/400.css") },
  { id: "nunito", name: "Nunito", css: '"Nunito", sans-serif', scale: 1, load: () => import("@fontsource/nunito/400.css") },
  { id: "lexend", name: "Lexend", css: '"Lexend", sans-serif', scale: 0.95, load: () => import("@fontsource/lexend/400.css") },
  { id: "atkinson", name: "Easy to read", css: '"Atkinson Hyperlegible", sans-serif', scale: 1, load: () => import("@fontsource/atkinson-hyperlegible/400.css") },
  { id: "comic", name: "Comic Neue", css: '"Comic Neue", cursive', scale: 1.05, load: () => import("@fontsource/comic-neue/400.css") },
  { id: "lora", name: "Lora", css: '"Lora", serif', scale: 1, load: () => import("@fontsource/lora/400.css") },
  { id: "merriweather", name: "Merriweather", css: '"Merriweather", serif', scale: 0.92, load: () => import("@fontsource/merriweather/400.css") },
  { id: "playfair", name: "Playfair", css: '"Playfair Display", serif', scale: 1, load: () => import("@fontsource/playfair-display/400.css") },
  { id: "sourceserif", name: "Source Serif", css: '"Source Serif 4", serif', scale: 1, load: () => import("@fontsource/source-serif-4/400.css") },
  { id: "mono", name: "Code", css: '"Roboto Mono", monospace', scale: 0.92, load: () => import("@fontsource/roboto-mono/400.css") },
];

// Fonts the notebook imports up front have no load of their own; these
// fetch them when the notebook is not open.
const UP_FRONT = {
  caveat: () => import("@fontsource/caveat/400.css"),
  patrick: () => import("@fontsource/patrick-hand/400.css"),
  kalam: () => import("@fontsource/kalam/400.css"),
  shadows: () => import("@fontsource/shadows-into-light/400.css"),
};

export const fontById = (id) => FONTS.find((f) => f.id === id) || FONTS[0];

// Resolves once the font can be measured and drawn.
export async function readyFont(f, px = 24) {
  try { await (f.load || UP_FRONT[f.id])?.(); } catch { /* falls back to the next font */ }
  try { await document.fonts.load(`${px}px ${f.css}`); } catch { /* measured with a fallback */ }
}
