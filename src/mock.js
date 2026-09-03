// Mock data. Swap these for real API calls later; every page reads from here only.

export const MATERIALS = [
  { id: "m1", title: "Cell Biology, Lecture 4", kind: "PDF", pages: 18, added: "2 days ago" },
  { id: "m2", title: "Linear Algebra: Eigenvalues", kind: "Notes", pages: 6, added: "5 days ago" },
  { id: "m3", title: "Modern History: Cold War", kind: "PDF", pages: 24, added: "1 week ago" },
];

// Recommended topics, ranked by how much they need work.
export const TOPICS = [
  {
    id: "tp1",
    name: "Active transport",
    source: "Cell Biology, Lecture 4",
    reason: "You missed 4 of the last 6 questions here.",
    mastery: 32,
    questions: 12,
    priority: "focus",
  },
  {
    id: "tp2",
    name: "Tonicity and osmosis",
    source: "Cell Biology, Lecture 4",
    reason: "Hypertonic and hypotonic keep getting swapped.",
    mastery: 48,
    questions: 9,
    priority: "focus",
  },
  {
    id: "tp3",
    name: "The sodium potassium pump",
    source: "Cell Biology, Lecture 4",
    reason: "Ratio questions are worth an easy mark. Lock it in.",
    mastery: 55,
    questions: 7,
    priority: "focus",
  },
  {
    id: "tp4",
    name: "Facilitated diffusion",
    source: "Cell Biology, Lecture 4",
    reason: "Solid, but you last reviewed it 5 days ago.",
    mastery: 76,
    questions: 8,
    priority: "warm",
  },
  {
    id: "tp5",
    name: "Bulk transport",
    source: "Cell Biology, Lecture 4",
    reason: "Strong. A quick pass keeps it there.",
    mastery: 88,
    questions: 6,
    priority: "warm",
  },
];

export const QUIZ = [
  {
    q: "Which process moves molecules against their concentration gradient?",
    choices: ["Simple diffusion", "Active transport", "Osmosis", "Facilitated diffusion"],
    answer: 1,
    why: "Active transport uses ATP to push molecules from low to high concentration. The other three are all passive.",
  },
  {
    q: "The sodium potassium pump moves which ions, and in what ratio?",
    choices: ["3 Na out, 2 K in", "2 Na out, 3 K in", "1 Na out, 1 K in", "3 K out, 2 Na in"],
    answer: 0,
    why: "Three sodium ions leave the cell for every two potassium ions that enter, which is why the pump is electrogenic.",
  },
  {
    q: "Osmosis specifically refers to the movement of which substance?",
    choices: ["Glucose", "Ions", "Water", "Proteins"],
    answer: 2,
    why: "Osmosis is diffusion of water across a semi permeable membrane. Everything else is just diffusion.",
  },
  {
    q: "A cell placed in a hypertonic solution will:",
    choices: ["Swell and burst", "Shrink", "Stay the same size", "Divide"],
    answer: 1,
    why: "A hypertonic solution has more solute outside the cell, so water leaves and the cell shrinks.",
  },
  {
    q: "Facilitated diffusion differs from simple diffusion because it:",
    choices: ["Requires ATP", "Uses membrane proteins", "Moves against the gradient", "Only moves water"],
    answer: 1,
    why: "It still runs down the gradient and needs no energy, but molecules pass through channel or carrier proteins.",
  },
];

export const SHEET = {
  title: "Membrane Transport",
  readTime: "4 min read",
  big: [
    "Everything crossing a membrane either costs energy or it does not. That single split explains most of the chapter.",
    "Passive processes always run down a concentration gradient. Active processes always run up it, and always cost ATP.",
    "Water gets its own name, osmosis, because it moves in response to solute concentration, not its own.",
  ],
  terms: [
    { t: "Passive transport", d: "Movement down a gradient, no energy required." },
    { t: "Active transport", d: "Movement up a gradient, powered by ATP." },
    { t: "Osmosis", d: "Diffusion of water across a semi permeable membrane." },
    { t: "Hypertonic", d: "More solute outside the cell; the cell shrinks." },
    { t: "Hypotonic", d: "Less solute outside the cell; the cell swells." },
    { t: "Electrogenic pump", d: "A pump that creates a net charge difference across the membrane." },
  ],
  watch: [
    "Confusing hypertonic and hypotonic. Anchor on \"hyper = more stuff outside = cell shrinks\".",
    "Calling facilitated diffusion active. It uses proteins, but no ATP.",
    "Forgetting the 3:2 ratio of the sodium potassium pump. It is a common one mark question.",
  ],
};

export const SAMPLE_NOTES = `Membrane transport comes in two families. Passive transport needs no energy: simple diffusion, facilitated diffusion through channel proteins, and osmosis (water only). Active transport spends ATP to move substances against the concentration gradient. The sodium potassium pump is the classic example, moving 3 Na out for every 2 K in, which makes it electrogenic.

Tonicity describes the solution outside the cell. Hypertonic means more solute outside, so water leaves and the cell shrinks. Hypotonic means less solute outside, so water enters and the cell swells, and in animal cells it can burst. Isotonic means no net movement.

Bulk transport handles anything too large for a protein channel: endocytosis brings material in via vesicles, exocytosis pushes it out.`;
