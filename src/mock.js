// What the app still ships with. There is no built in study material any more:
// everything a person practises comes from their own notes.

export const DECKS = [
  { id: "all", label: "All cards", hint: "Every term and method in this material" },
  { id: "terms", label: "Terms", hint: "Vocabulary and what it means" },
  { id: "howto", label: "How to", hint: "The steps of a method or process" },
];

// Realistic paper sizes and durations.
export const EXAM_SIZES = [15, 25, 40];
export const EXAM_TIMES = [30, 60, 90];

export const HL_KINDS = {
  def: { label: "Definition", hint: "Learn these word for word" },
  key: { label: "Key fact", hint: "Worth memorising" },
  exam: { label: "Likely on the exam", hint: "Where marks are usually lost" },
};

export const SAMPLE_NOTES = `Membrane transport comes in two families. Passive transport needs no energy: simple diffusion, facilitated diffusion through channel proteins, and osmosis (water only). Active transport spends ATP to move substances against the concentration gradient. The sodium potassium pump is the classic example, moving 3 Na out for every 2 K in, which makes it electrogenic.

Tonicity describes the solution outside the cell. Hypertonic means more solute outside, so water leaves and the cell shrinks. Hypotonic means less solute outside, so water enters and the cell swells, and in animal cells it can burst. Isotonic means no net movement.

Bulk transport handles anything too large for a protein channel: endocytosis brings material in via vesicles, exocytosis pushes it out.`;
