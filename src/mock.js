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

// The question bank. `kind` drives which flashcard deck a card belongs to.
// vocab = a term to define, concept = an idea to understand, process = a mechanism.
export const BANK = [
  { id: "q1", kind: "concept", topic: "Active transport", q: "Which process moves molecules against their concentration gradient?", choices: ["Simple diffusion", "Active transport", "Osmosis", "Facilitated diffusion"], answer: 1, why: "Active transport uses ATP to push molecules from low to high concentration. The other three are all passive." },
  { id: "q2", kind: "process", topic: "The sodium potassium pump", q: "The sodium potassium pump moves which ions, and in what ratio?", choices: ["3 Na out, 2 K in", "2 Na out, 3 K in", "1 Na out, 1 K in", "3 K out, 2 Na in"], answer: 0, why: "Three sodium ions leave for every two potassium ions that enter, which is why the pump is electrogenic." },
  { id: "q3", kind: "vocab", topic: "Tonicity and osmosis", q: "Osmosis", choices: ["Movement of glucose", "Movement of ions", "Diffusion of water across a semi permeable membrane", "Movement of proteins"], answer: 2, why: "Osmosis is the diffusion of water specifically. Everything else crossing a membrane is just diffusion." },
  { id: "q4", kind: "concept", topic: "Tonicity and osmosis", q: "A cell placed in a hypertonic solution will:", choices: ["Swell and burst", "Shrink", "Stay the same size", "Divide"], answer: 1, why: "Hypertonic means more solute outside the cell, so water leaves and the cell shrinks." },
  { id: "q5", kind: "concept", topic: "Facilitated diffusion", q: "Facilitated diffusion differs from simple diffusion because it:", choices: ["Requires ATP", "Uses membrane proteins", "Moves against the gradient", "Only moves water"], answer: 1, why: "It still runs down the gradient and needs no energy, but molecules pass through channel or carrier proteins." },
  { id: "q6", kind: "vocab", topic: "Active transport", q: "Active transport", choices: ["Movement down a gradient, no energy needed", "Movement up a gradient, powered by ATP", "Movement of water only", "Movement through a channel protein"], answer: 1, why: "Up the gradient, and it always costs ATP. That is the whole definition." },
  { id: "q7", kind: "vocab", topic: "Facilitated diffusion", q: "Passive transport", choices: ["Movement up a gradient using ATP", "Movement down a gradient with no energy cost", "Movement of vesicles", "Movement driven by a pump"], answer: 1, why: "Down the gradient, no energy. It is the mirror of the active transport definition." },
  { id: "q8", kind: "vocab", topic: "The sodium potassium pump", q: "Electrogenic pump", choices: ["A pump that uses light", "A pump that creates a net charge difference across the membrane", "A pump that moves only water", "A pump that works without ATP"], answer: 1, why: "Unequal charge moved in each direction leaves a net charge difference. The sodium potassium pump is the example." },
  { id: "q9", kind: "vocab", topic: "Tonicity and osmosis", q: "Hypotonic solution", choices: ["More solute outside the cell", "Less solute outside the cell", "Equal solute inside and out", "No solute at all"], answer: 1, why: "Less solute outside means water enters the cell and it swells." },
  { id: "q10", kind: "vocab", topic: "Tonicity and osmosis", q: "Isotonic solution", choices: ["Water leaves the cell", "Water enters the cell", "No net movement of water", "The cell bursts"], answer: 2, why: "Solute concentration matches on both sides, so water moves equally in both directions." },
  { id: "q11", kind: "process", topic: "Bulk transport", q: "Endocytosis brings material into the cell by:", choices: ["A channel protein", "Wrapping it in a vesicle", "Diffusion", "A pump"], answer: 1, why: "The membrane folds inward and pinches off a vesicle. Too large for any protein channel." },
  { id: "q12", kind: "process", topic: "Bulk transport", q: "Exocytosis is best described as:", choices: ["A vesicle fusing with the membrane to expel contents", "Water entering the cell", "A protein channel opening", "ATP being made"], answer: 0, why: "The vesicle fuses with the plasma membrane and its contents are released outside." },
  { id: "q13", kind: "concept", topic: "Bulk transport", q: "Why is bulk transport considered active?", choices: ["It moves water", "Forming and moving vesicles costs ATP", "It uses channel proteins", "It works down a gradient"], answer: 1, why: "Membrane has to be remodelled and the vesicle trafficked, and both spend ATP." },
  { id: "q14", kind: "vocab", topic: "Bulk transport", q: "Phagocytosis", choices: ["Taking in liquid", "Taking in solid particles", "Expelling waste", "Making ATP"], answer: 1, why: "Solid particles, which is how a white blood cell swallows a bacterium." },
  { id: "q15", kind: "concept", topic: "Facilitated diffusion", q: "The rate of facilitated diffusion plateaus at high concentration because:", choices: ["ATP runs out", "Every carrier protein is occupied", "The gradient reverses", "Water stops moving"], answer: 1, why: "This is saturation. There are only so many proteins, and once all are busy the rate cannot rise." },
  { id: "q16", kind: "vocab", topic: "Facilitated diffusion", q: "Saturation", choices: ["The membrane is full of water", "All transport proteins are occupied so rate plateaus", "The gradient is zero", "The cell has burst"], answer: 1, why: "It happens in facilitated diffusion and active transport, never in simple diffusion." },
  { id: "q17", kind: "concept", topic: "Facilitated diffusion", q: "Which of these does NOT show saturation?", choices: ["Facilitated diffusion", "Active transport", "Simple diffusion", "The sodium potassium pump"], answer: 2, why: "Simple diffusion uses no proteins, so there is nothing to run out of." },
  { id: "q18", kind: "concept", topic: "Tonicity and osmosis", q: "An animal cell in a strongly hypotonic solution may:", choices: ["Shrink", "Burst", "Stay identical", "Stop respiring"], answer: 1, why: "Water floods in and there is no cell wall to resist the pressure. This is lysis." },
  { id: "q19", kind: "concept", topic: "Tonicity and osmosis", q: "Why does a plant cell not burst in a hypotonic solution?", choices: ["It has no water", "The cell wall resists the pressure", "It is isotonic already", "It pumps water out"], answer: 1, why: "The rigid wall pushes back, producing turgor pressure instead of lysis." },
  { id: "q20", kind: "vocab", topic: "Tonicity and osmosis", q: "Lysis", choices: ["A cell shrinking", "A cell bursting", "A cell dividing", "A cell pumping ions"], answer: 1, why: "Bursting, from too much water entering a cell with no wall." },
  { id: "q21", kind: "process", topic: "The sodium potassium pump", q: "How many ATP does one cycle of the sodium potassium pump consume?", choices: ["None", "One", "Three", "Five"], answer: 1, why: "One ATP per cycle, moving 3 Na out and 2 K in." },
  { id: "q22", kind: "concept", topic: "The sodium potassium pump", q: "After many cycles of the pump, the inside of the cell becomes:", choices: ["More positive", "More negative", "Neutral", "Unchanged"], answer: 1, why: "Three positive charges leave for every two that enter, so the interior loses net positive charge." },
  { id: "q23", kind: "concept", topic: "The sodium potassium pump", q: "The gradient built by the sodium potassium pump is later spent on:", choices: ["Photosynthesis", "An action potential in nerve cells", "DNA replication", "Cell division"], answer: 1, why: "The standing gradient is the stored charge a nerve impulse discharges." },
  { id: "q24", kind: "vocab", topic: "Facilitated diffusion", q: "Channel protein", choices: ["A protein that makes ATP", "A protein forming a pore for specific molecules to pass", "A protein that digests food", "A protein in DNA"], answer: 1, why: "It provides a route through the membrane. It does not push anything." },
  { id: "q25", kind: "vocab", topic: "Facilitated diffusion", q: "Carrier protein", choices: ["A protein that changes shape to move a molecule across", "A protein that stores fat", "A protein that copies DNA", "A protein in the nucleus"], answer: 0, why: "It binds the molecule, changes conformation, and releases it on the other side." },
  { id: "q26", kind: "concept", topic: "Active transport", q: "Which is the clearest evidence a transport process is active?", choices: ["It uses a protein", "It stops when ATP is depleted", "It moves water", "It is fast"], answer: 1, why: "Remove the energy supply and active transport stops. Passive processes carry on." },
  { id: "q27", kind: "concept", topic: "Active transport", q: "Cooling a cell to near freezing slows active transport mainly because:", choices: ["Water freezes", "Respiration slows so less ATP is made", "The membrane dissolves", "Gradients reverse"], answer: 1, why: "Less ATP means less energy for pumps. It is an indirect effect, through metabolism." },
  { id: "q28", kind: "process", topic: "Active transport", q: "In which direction does a pump move its substrate?", choices: ["Always into the cell", "Always out of the cell", "Against the concentration gradient", "Down the concentration gradient"], answer: 2, why: "Direction in or out varies. What defines a pump is working against the gradient." },
  { id: "q29", kind: "concept", topic: "Facilitated diffusion", q: "Why can oxygen cross the membrane without a protein?", choices: ["It is charged", "It is small and non polar", "It is a protein", "It is dissolved in water"], answer: 1, why: "Small non polar molecules slip between the phospholipid tails unaided." },
  { id: "q30", kind: "concept", topic: "Facilitated diffusion", q: "Why do ions need a protein to cross the membrane?", choices: ["They are too large", "They are charged and the membrane interior is non polar", "They are too fast", "They dissolve the membrane"], answer: 1, why: "The hydrophobic core repels charge, so ions need a channel." },
  { id: "q31", kind: "vocab", topic: "Tonicity and osmosis", q: "Semi permeable membrane", choices: ["A membrane nothing crosses", "A membrane everything crosses", "A membrane that lets some substances through but not others", "A membrane made of protein only"], answer: 2, why: "Selective permeability is the whole reason gradients can exist at all." },
  { id: "q32", kind: "concept", topic: "Tonicity and osmosis", q: "Water moves from a solution that is:", choices: ["Concentrated to dilute", "Dilute to concentrated", "Warm to cold", "Acidic to basic"], answer: 1, why: "Water moves toward the higher solute concentration, diluting it." },
  { id: "q33", kind: "process", topic: "Bulk transport", q: "Which happens first in endocytosis?", choices: ["The vesicle fuses with a lysosome", "The membrane folds inward around the material", "ATP is regenerated", "The vesicle leaves the cell"], answer: 1, why: "Invagination first, then the vesicle pinches off, then it is trafficked inside." },
  { id: "q34", kind: "concept", topic: "Bulk transport", q: "A neuron releasing neurotransmitter into a synapse is using:", choices: ["Endocytosis", "Exocytosis", "Osmosis", "Simple diffusion"], answer: 1, why: "Vesicles of neurotransmitter fuse with the membrane and release their contents outward." },
  { id: "q35", kind: "concept", topic: "Active transport", q: "Root hair cells take up minerals from very dilute soil water. This requires:", choices: ["Osmosis", "Simple diffusion", "Active transport", "Facilitated diffusion"], answer: 2, why: "Soil is more dilute than the cell, so uptake runs against the gradient and costs ATP." },
  { id: "q36", kind: "concept", topic: "Tonicity and osmosis", q: "Red blood cells are stored in an isotonic saline drip so that:", choices: ["They swell", "They shrink", "They keep their normal shape", "They divide faster"], answer: 2, why: "No net water movement means no swelling and no shrinking." },
  { id: "q37", kind: "vocab", topic: "Active transport", q: "ATP", choices: ["A structural protein", "The cell's immediate energy currency", "A type of lipid", "A waste product"], answer: 1, why: "Hydrolysing ATP releases the energy a pump uses to change shape." },
  { id: "q38", kind: "process", topic: "The sodium potassium pump", q: "What causes the pump to change shape during its cycle?", choices: ["A drop in temperature", "Phosphorylation by ATP", "Water entering", "Contact with a vesicle"], answer: 1, why: "A phosphate group from ATP attaches, the protein changes conformation, and the ions are released." },
  { id: "q39", kind: "concept", topic: "Facilitated diffusion", q: "Which factor does NOT affect the rate of simple diffusion?", choices: ["Concentration gradient", "Temperature", "Number of carrier proteins", "Surface area"], answer: 2, why: "Simple diffusion uses no proteins, so their number is irrelevant." },
  { id: "q40", kind: "concept", topic: "Active transport", q: "A poison that blocks ATP production would immediately stop:", choices: ["Osmosis", "Simple diffusion", "The sodium potassium pump", "Facilitated diffusion"], answer: 2, why: "Only the active processes depend on ATP. The passive three keep going." },
];

// The quiz mode is a short practice run, not the whole bank.
export const QUIZ = BANK.slice(0, 5);

export const DECKS = [
  { id: "all", label: "All cards", hint: "Everything in this material" },
  { id: "vocab", label: "Vocabulary", hint: "Terms to define word for word" },
  { id: "concept", label: "Concepts", hint: "Ideas you have to reason about" },
  { id: "process", label: "Processes", hint: "Mechanisms and their steps" },
];

// Realistic paper sizes and durations.
export const EXAM_SIZES = [15, 25, 40];
export const EXAM_TIMES = [30, 60, 90];

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

// The reader shows source material with the important bits marked up.
// Each block is a run of segments; a segment with `mark` gets highlighted.
// Types: def (a definition), key (a fact worth memorising), exam (likely to be asked).
export const DOC = {
  title: "Cell Biology, Lecture 4",
  subtitle: "Membrane transport",
  pages: 18,
  blocks: [
    {
      h: "1. Two families",
      p: [
        { t: "Everything that crosses a membrane belongs to one of two families, and the split is energy. " },
        { t: "Passive transport moves substances down their concentration gradient and requires no energy from the cell.", mark: "def", note: "The definition to lead with in any answer." },
        { t: " It covers simple diffusion, facilitated diffusion and osmosis. " },
        { t: "Active transport moves substances up their concentration gradient and is powered by ATP.", mark: "def", note: "Mirror wording of the passive definition. Examiners like the symmetry." },
      ],
    },
    {
      h: "2. Facilitated diffusion",
      p: [
        { t: "Some molecules are too large or too polar to slip between the phospholipids. These cross through channel or carrier proteins instead. " },
        { t: "Facilitated diffusion uses membrane proteins but still costs no energy.", mark: "exam", note: "The single most common trap. Proteins involved does not mean active." },
        { t: " The gradient still does the work; the protein only provides a route. Rate rises with concentration until every protein is occupied, at which point it plateaus. " },
        { t: "That plateau is called saturation, and it does not happen in simple diffusion.", mark: "key" },
      ],
    },
    {
      h: "3. The sodium potassium pump",
      p: [
        { t: "The classic worked example of active transport. For each cycle it " },
        { t: "moves 3 Na+ out of the cell and 2 K+ in, using one ATP", mark: "key", note: "Learn the 3:2 ratio verbatim. It is often a single mark." },
        { t: ". Because three positive charges leave and only two enter, the cell interior becomes slightly more negative. " },
        { t: "A pump that creates a net charge difference is called electrogenic.", mark: "def" },
        { t: " This standing gradient is what nerve cells later spend on an action potential." },
      ],
    },
    {
      h: "4. Osmosis and tonicity",
      p: [
        { t: "Water gets its own term because it moves in response to solute, not to itself. " },
        { t: "Osmosis is the diffusion of water across a semi permeable membrane, from a dilute solution to a concentrated one.", mark: "def" },
        { t: " Tonicity describes the solution outside the cell. " },
        { t: "Hypertonic means more solute outside, so water leaves and the cell shrinks. Hypotonic means less solute outside, so water enters and the cell swells.", mark: "exam", note: "Anchor it: hyper means more stuff outside, so the cell shrinks." },
        { t: " Isotonic means no net movement. An animal cell in a strongly hypotonic solution can burst, which is called lysis; a plant cell cannot, because the wall resists." },
      ],
    },
    {
      h: "5. Bulk transport",
      p: [
        { t: "Anything too large for a protein channel is wrapped in membrane instead. " },
        { t: "Endocytosis brings material into the cell in a vesicle, exocytosis expels it.", mark: "key" },
        { t: " Both are active, because forming and moving a vesicle costs ATP. Phagocytosis, taking in solid particles, is the version a white blood cell uses to swallow bacteria." },
      ],
    },
  ],
};

export const HL_KINDS = {
  def: { label: "Definition", hint: "Learn these word for word" },
  key: { label: "Key fact", hint: "Worth memorising" },
  exam: { label: "Likely on the exam", hint: "Where marks are usually lost" },
};
