// Mock data. Swap these for real API calls later; every page reads from here only.

// Demonstration material, shown only if someone asks to see it. Nothing here
// is presented as the visitor's own work.
export const MATERIALS = [
  { id: "m1", title: "Cell Biology, Lecture 4", kind: "Sample", pages: 18 },
  { id: "m2", title: "Linear Algebra: Eigenvalues", kind: "Sample", pages: 6 },
  { id: "m3", title: "Modern History: Cold War", kind: "Sample", pages: 24 },
];

// Recommended topics, ranked by how much they need work.
export const TOPICS = [
  {
    id: "tp1",
    name: "Active transport",
    source: "Cell Biology, Lecture 4",
    material: "m1",
    reason: "How pumps move substances against a gradient, and why it costs ATP.",
    questions: 12,
    priority: "focus",
  },
  {
    id: "tp2",
    name: "Tonicity and osmosis",
    source: "Cell Biology, Lecture 4",
    material: "m1",
    reason: "Water movement, and the three tonicity terms that get swapped most.",
    questions: 9,
    priority: "focus",
  },
  {
    id: "tp3",
    name: "The sodium potassium pump",
    source: "Cell Biology, Lecture 4",
    material: "m1",
    reason: "The 3:2 ratio, the ATP cost, and why the pump is electrogenic.",
    questions: 7,
    priority: "focus",
  },
  {
    id: "tp4",
    name: "Facilitated diffusion",
    source: "Cell Biology, Lecture 4",
    material: "m1",
    reason: "Channel and carrier proteins, saturation, and why it is still passive.",
    questions: 8,
    priority: "warm",
  },
  {
    id: "tp5",
    name: "Bulk transport",
    source: "Cell Biology, Lecture 4",
    material: "m1",
    reason: "Endocytosis and exocytosis, and why moving vesicles costs energy.",
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

// Same markup shape as DOC: a line is a list of segments, and a segment with
// `mark` gets highlighted. def = learn it verbatim, key = memorise it,
// exam = where marks are usually lost.
export const SHEET = {
  title: "Membrane Transport",
  readTime: "4 min read",
  big: [
    [
      { t: "Everything crossing a membrane " },
      { t: "either costs energy or it does not", mark: "key" },
      { t: ". That single split explains most of the chapter." },
    ],
    [
      { t: "Passive processes always run " },
      { t: "down a concentration gradient", mark: "def" },
      { t: ". Active processes always run " },
      { t: "up it, and always cost ATP", mark: "def" },
      { t: "." },
    ],
    [
      { t: "Water gets its own name, osmosis, because " },
      { t: "it moves in response to solute concentration, not its own", mark: "key" },
      { t: "." },
    ],
    [
      { t: "Using a protein does not make a process active. " },
      { t: "Facilitated diffusion uses carrier proteins and still spends no energy", mark: "exam" },
      { t: ", which is the distinction most answers get wrong." },
    ],
  ],
  terms: [
    { t: "Passive transport", d: [{ t: "Movement " }, { t: "down a gradient, no energy required", mark: "def" }, { t: "." }] },
    { t: "Active transport", d: [{ t: "Movement " }, { t: "up a gradient, powered by ATP", mark: "def" }, { t: "." }] },
    { t: "Osmosis", d: [{ t: "Diffusion of " }, { t: "water", mark: "key" }, { t: " across a semi permeable membrane." }] },
    { t: "Hypertonic", d: [{ t: "More solute outside the cell; " }, { t: "the cell shrinks", mark: "exam" }, { t: "." }] },
    { t: "Hypotonic", d: [{ t: "Less solute outside the cell; " }, { t: "the cell swells", mark: "exam" }, { t: "." }] },
    { t: "Electrogenic pump", d: [{ t: "A pump that " }, { t: "creates a net charge difference", mark: "def" }, { t: " across the membrane." }] },
  ],
  watch: [
    [
      { t: "Confusing hypertonic and hypotonic. Anchor on " },
      { t: "hyper means more stuff outside, so the cell shrinks", mark: "exam" },
      { t: "." },
    ],
    [
      { t: "Calling facilitated diffusion active. " },
      { t: "It uses proteins, but no ATP", mark: "exam" },
      { t: "." },
    ],
    [
      { t: "Forgetting the " },
      { t: "3:2 ratio of the sodium potassium pump", mark: "key" },
      { t: ". It is a common one mark question." },
    ],
    [
      { t: "Writing that osmosis moves solute. " },
      { t: "Osmosis only ever moves water", mark: "def" },
      { t: "." },
    ],
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

// Topics for the other two materials in the library, so the list groups.
TOPICS.push(
  { id: "tp6", name: "Eigenvalues and eigenvectors", material: "m2", source: "Linear Algebra: Eigenvalues",
    reason: "Finding them, what they mean geometrically, and the trace and determinant shortcut.", questions: 8, priority: "focus" },
  { id: "tp7", name: "Matrix operations", material: "m2", source: "Linear Algebra: Eigenvalues",
    reason: "Multiplication rules, inverses, transposes and when each is defined.", questions: 8, priority: "warm" },
  { id: "tp8", name: "Origins of the Cold War", material: "m3", source: "Modern History: Cold War",
    reason: "Containment, the Marshall Plan, Berlin, and the two schools of interpretation.", questions: 8, priority: "focus" },
  { id: "tp9", name: "The Cuban Missile Crisis", material: "m3", source: "Modern History: Cold War",
    reason: "The thirteen days, the secret half of the deal, and what changed afterwards.", questions: 8, priority: "warm" },
);

BANK.push(
  { id: "la1", kind: "vocab", topic: "Eigenvalues and eigenvectors", q: "Eigenvector", choices: ["A vector whose direction is unchanged when the matrix is applied to it", "A vector of length one", "A row of the matrix", "A vector with all entries equal"], answer: 0, why: "Av = lambda v means the transformation only stretches or flips the vector, never rotates it off its own line." },
  { id: "la2", kind: "vocab", topic: "Eigenvalues and eigenvectors", q: "Eigenvalue", choices: ["The determinant of the matrix", "The scalar by which an eigenvector is stretched", "The number of rows", "The trace divided by two"], answer: 1, why: "The lambda in Av = lambda v. It records how much the vector is scaled, and a negative value means it flips." },
  { id: "la3", kind: "process", topic: "Eigenvalues and eigenvectors", q: "To find the eigenvalues of a matrix A, you solve:", choices: ["A x = 0", "det(A minus lambda I) = 0", "A transpose = A", "trace(A) = 0"], answer: 1, why: "The characteristic equation. A non zero solution to (A minus lambda I)v = 0 requires the matrix to be singular, so its determinant is zero." },
  { id: "la4", kind: "concept", topic: "Eigenvalues and eigenvectors", q: "A 2 by 2 matrix has trace 7 and determinant 12. Its eigenvalues are:", choices: ["3 and 4", "2 and 6", "1 and 12", "7 and 12"], answer: 0, why: "Eigenvalues sum to the trace and multiply to the determinant: 3 + 4 = 7 and 3 x 4 = 12." },
  { id: "la5", kind: "concept", topic: "Eigenvalues and eigenvectors", q: "If a matrix has an eigenvalue of 0, then the matrix is:", choices: ["symmetric", "singular, so it has no inverse", "the identity", "orthogonal"], answer: 1, why: "det(A minus 0I) = det(A) = 0, and a zero determinant means no inverse exists." },
  { id: "la6", kind: "concept", topic: "Eigenvalues and eigenvectors", q: "What does an eigenvalue of negative 1 tell you about its eigenvector?", choices: ["It is stretched to double length", "It keeps its length but reverses direction", "It shrinks to zero", "It rotates 90 degrees"], answer: 1, why: "Multiplying by negative one preserves magnitude and flips the direction along the same line." },
  { id: "la7", kind: "process", topic: "Eigenvalues and eigenvectors", q: "After finding an eigenvalue, how do you find its eigenvector?", choices: ["Take the determinant", "Solve (A minus lambda I)v = 0 for v", "Transpose the matrix", "Divide the matrix by lambda"], answer: 1, why: "Substituting the eigenvalue back gives a singular system whose non trivial solutions are the eigenvectors." },
  { id: "la8", kind: "concept", topic: "Eigenvalues and eigenvectors", q: "For a triangular matrix, the eigenvalues are:", choices: ["always 1", "the entries on the main diagonal", "the row sums", "impossible to determine"], answer: 1, why: "The determinant of a triangular matrix is the product of its diagonal, so the characteristic polynomial factors straight off the diagonal." },

  { id: "lb1", kind: "concept", topic: "Matrix operations", q: "For matrix multiplication AB to be defined, what must be true?", choices: ["A and B must be square", "The columns of A must equal the rows of B", "A and B must be the same size", "Both must be invertible"], answer: 1, why: "An m by n times an n by p gives m by p. The inner dimensions must match." },
  { id: "lb2", kind: "concept", topic: "Matrix operations", q: "Matrix multiplication is generally:", choices: ["commutative", "not commutative", "always undefined", "the same as addition"], answer: 1, why: "AB rarely equals BA, and often only one of the two is even defined. This is the most common early error." },
  { id: "lb3", kind: "vocab", topic: "Matrix operations", q: "Identity matrix", choices: ["A matrix of all ones", "A square matrix with ones on the diagonal and zeros elsewhere", "A matrix with determinant zero", "A matrix equal to its transpose"], answer: 1, why: "It acts like the number one: AI = IA = A." },
  { id: "lb4", kind: "process", topic: "Matrix operations", q: "The inverse of a 2 by 2 matrix exists only if:", choices: ["the trace is zero", "the determinant is non zero", "it is symmetric", "all entries are positive"], answer: 1, why: "The inverse formula divides by the determinant, so a zero determinant makes it undefined." },
  { id: "lb5", kind: "concept", topic: "Matrix operations", q: "What is the transpose of a matrix?", choices: ["Its inverse", "The matrix with rows and columns swapped", "The matrix times negative one", "The determinant"], answer: 1, why: "Entry (i, j) becomes entry (j, i), reflecting the matrix across its main diagonal." },
  { id: "lb6", kind: "concept", topic: "Matrix operations", q: "If A is 3 by 4 and B is 4 by 2, the product AB has size:", choices: ["3 by 2", "4 by 4", "2 by 3", "undefined"], answer: 0, why: "The outer dimensions survive: 3 by 2. The inner fours match, so the product is defined." },
  { id: "lb7", kind: "process", topic: "Matrix operations", q: "(AB) inverse equals:", choices: ["A inverse times B inverse", "B inverse times A inverse", "AB", "the transpose of AB"], answer: 1, why: "The order reverses. Undoing two operations means undoing the last one first." },
  { id: "lb8", kind: "concept", topic: "Matrix operations", q: "A matrix that equals its own transpose is called:", choices: ["singular", "symmetric", "orthogonal", "diagonal"], answer: 1, why: "Symmetric matrices are mirror images across the main diagonal, and they have several useful eigenvalue properties." },

  { id: "cw1", kind: "vocab", topic: "Origins of the Cold War", q: "Containment", choices: ["Rolling back communism by force", "Preventing the further spread of Soviet influence", "Withdrawing from Europe", "Sharing nuclear technology"], answer: 1, why: "Kennan's doctrine was defensive: stop further expansion rather than reverse what already existed." },
  { id: "cw2", kind: "process", topic: "Origins of the Cold War", q: "The Marshall Plan primarily provided:", choices: ["Military bases", "Economic aid to rebuild western Europe", "Nuclear weapons to allies", "Food aid to the Soviet Union"], answer: 1, why: "Around 13 billion dollars of reconstruction aid, on the reasoning that prosperous economies resist communism." },
  { id: "cw3", kind: "concept", topic: "Origins of the Cold War", q: "Why did the Soviet Union reject Marshall Plan aid for its sphere?", choices: ["The sum offered was too small", "Accepting it would mean opening their economies to western oversight", "They had already rebuilt", "It was never offered"], answer: 1, why: "The conditions required economic disclosure and coordination, which Moscow read as a lever for western influence." },
  { id: "cw4", kind: "process", topic: "Origins of the Cold War", q: "The Berlin Blockade of 1948 to 1949 was answered by:", choices: ["An armed invasion", "An airlift supplying the city", "Withdrawal from Berlin", "A United Nations occupation"], answer: 1, why: "Nearly a year of flights supplied over two million people, avoiding the ground confrontation a convoy would have forced." },
  { id: "cw5", kind: "vocab", topic: "Origins of the Cold War", q: "Iron Curtain", choices: ["A physical wall around Moscow", "The division between Soviet controlled eastern Europe and the west", "A trade agreement", "A nuclear defence system"], answer: 1, why: "Churchill's 1946 phrase for the political and ideological division of the continent." },
  { id: "cw6", kind: "concept", topic: "Origins of the Cold War", q: "NATO was founded in 1949 principally as:", choices: ["A trade bloc", "A collective defence alliance", "A scientific body", "A colonial administration"], answer: 1, why: "Article 5 makes an attack on one an attack on all, which is collective defence." },
  { id: "cw7", kind: "concept", topic: "Origins of the Cold War", q: "Historians of the revisionist school argue that the Cold War was:", choices: ["caused solely by Soviet aggression", "driven substantially by American economic expansion", "an accident of miscommunication", "inevitable from 1917"], answer: 1, why: "Revisionists place weight on the economic motives behind American policy, against the orthodox account of Soviet aggression." },
  { id: "cw8", kind: "process", topic: "Origins of the Cold War", q: "The Warsaw Pact was created in 1955 in response to:", choices: ["The Berlin airlift", "West Germany joining NATO", "The Cuban revolution", "The Korean armistice"], answer: 1, why: "West German rearmament and NATO membership was the immediate trigger for a formal eastern alliance." },

  { id: "cm1", kind: "process", topic: "The Cuban Missile Crisis", q: "How were the missile sites in Cuba first confirmed?", choices: ["A defector's testimony", "U-2 reconnaissance photographs", "A Soviet announcement", "Intercepted radio traffic"], answer: 1, why: "U-2 overflight photographs of 14 October 1962 provided the evidence that opened the crisis." },
  { id: "cm2", kind: "vocab", topic: "The Cuban Missile Crisis", q: "Quarantine, as used during the crisis", choices: ["A medical isolation order", "A naval blockade described in softer terms to avoid declaring war", "A trade embargo", "A ceasefire"], answer: 1, why: "A blockade is legally an act of war, so the word quarantine was chosen deliberately." },
  { id: "cm3", kind: "concept", topic: "The Cuban Missile Crisis", q: "Why did the Soviet Union place missiles in Cuba?", choices: ["To invade Florida", "To offset American missiles in Turkey and deter an invasion of Cuba", "To test new engines", "To supply Cuba with electricity"], answer: 1, why: "Both motives are documented: strategic parity given Jupiter missiles in Turkey, and protecting the Castro government." },
  { id: "cm4", kind: "process", topic: "The Cuban Missile Crisis", q: "What was agreed publicly to end the crisis?", choices: ["Soviet withdrawal of missiles for an American pledge not to invade Cuba", "Joint control of Cuba", "American withdrawal from Berlin", "A permanent ban on nuclear weapons"], answer: 0, why: "That was the public bargain. The removal of the Turkish Jupiters was agreed secretly and not revealed at the time." },
  { id: "cm5", kind: "concept", topic: "The Cuban Missile Crisis", q: "Why was the Turkish part of the deal kept secret?", choices: ["It was never agreed", "To avoid the appearance that the United States had been forced into a trade", "Turkey refused to be told", "It breached a treaty"], answer: 1, why: "A visible swap would have looked like a concession under threat and would have alarmed NATO allies." },
  { id: "cm6", kind: "concept", topic: "The Cuban Missile Crisis", q: "One lasting consequence of the crisis was:", choices: ["The end of the Cold War", "A direct communication link between Washington and Moscow", "Cuban membership of NATO", "The dissolution of the Warsaw Pact"], answer: 1, why: "The hotline was established in 1963 precisely because the crisis had exposed how slow communication was." },
  { id: "cm7", kind: "concept", topic: "The Cuban Missile Crisis", q: "The incident involving Vasili Arkhipov is usually cited to illustrate:", choices: ["Soviet technical superiority", "How close an individual decision came to triggering nuclear war", "American naval weakness", "The accuracy of intelligence"], answer: 1, why: "His refusal to authorise a nuclear torpedo aboard B-59 required unanimity, and he was the one who withheld it." },
  { id: "cm8", kind: "process", topic: "The Cuban Missile Crisis", q: "How long did the most acute phase of the crisis last?", choices: ["Thirteen days", "Three months", "One year", "Six weeks"], answer: 0, why: "From the photographs of 16 October to Khrushchev's announcement of 28 October, the thirteen days the standard account is named for." },
);
