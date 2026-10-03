// A narrated explainer, as a script the app animates.
//
// Nothing here is a video file. The model writes scenes: a heading, what is
// said, a diagram described in coordinates, and the lines of working that
// appear on the board as they are talked about. The app draws and reads it,
// which costs one call instead of rendering minutes of footage, and means the
// transcript is the script itself, word for word.
//
// Two sources: a question already worked through on Solve, or one topic of a
// student's notes.

import { ask, safeParse, fail, userError, MAX_INPUT } from "./_llm.js";
import { allow } from "./_guard.js";
import { buildFigures, sceneDiagram } from "./_figure.js";

export const config = { maxDuration: 60 };

// The moving drawings the app can draw (src/VideoProps.jsx), kept in step.
const PROP_KINDS = ["sun", "plant", "tree", "water", "cloud", "co2", "o2", "glucose", "cell", "atom", "molecule", "heart", "lungs", "brain", "earth", "magnet", "battery", "bulb", "flask", "thermometer", "dna", "coin", "gear", "clock", "book", "fire", "wave", "bacteria",
  "person", "people", "children", "worker", "handshake", "shop", "factory", "house", "school", "food", "chartUp", "chartDown", "target", "star", "scales", "truck", "phone", "bank", "moneybag", "megaphone", "shield", "calendar", "solid", "liquid", "gas", "droplet", "oildroplet", "cube", "beaker", "diffusion",
  "mountain", "volcano", "pin", "castle", "scroll", "crown", "ship", "quill", "speech", "quotes", "lightning", "spring", "car", "tag", "cart", "document", "laptop", "eye", "bone", "magnifier", "lock", "triangle", "compass"];

// Science drawings only where the scene is really about that science. The
// model reached for them as loose stand ins (a cell for a worker, a flask for
// costs), which only confuses; a scene that does not use the word gets none.
const SCIENCE = {
  cell: /\bcells?\b|nucleus|mitochondri|membrane|cytoplasm|organelle|tissue/,
  atom: /\batoms?\b|electron|proton|neutron|isotope/,
  molecule: /molecul|compound|chemical bond|\bbonds?\b/,
  dna: /\bdna\b|gene|chromosome|inherit|mutation/,
  bacteria: /bacteri|virus|microbe|germ|pathogen|infection/,
  flask: /chemical|reaction|acid|alkali|experiment|\blab|enzyme|solution of/,
  co2: /carbon dioxide|co₂|co2/, o2: /oxygen|o₂|\bo2\b/, glucose: /glucose|sugar|starch|carbohydrate/,
  heart: /heart|blood|circulat|pulse/, lungs: /lung|breath|inhal|exhal|alveol/, brain: /brain|nerve|neuron/,
  magnet: /magnet/, battery: /battery|circuit|current|voltage|electric/,
  thermometer: /temperature|heat|thermal|degrees|hot|cold/, wave: /\bwaves?\b|sound|frequency|vibrat|signal/,
};

const SHAPE = `Return ONE JSON object and nothing else. No prose, no code fences.

Shape:
{
  "title": "the video's title, four to eight words",
  "subtitle": "subject · the idea it uses",
  "figures": [
    {
      "id": "main",
      "axes": true, "grid": true,
      "values": { "r": "8/9" },
      "points": { "O": ["0", "0"], "S": ["-1", "0"], "C": ["3*r - 2", "r"] },
      "shapes": [
        { "id": "big", "type": "circle", "center": "O", "r": "2", "half": "upper", "color": "blue", "fill": true },
        { "id": "c", "type": "circle", "center": "C", "r": "r", "color": "purple", "fill": true },
        { "id": "OC", "type": "segment", "from": "O", "to": "C", "color": "blue", "label": "2 − r" },
        { "id": "dotO", "type": "point", "at": "O", "label": "O(0, 0)", "color": "ink" }
      ],
      "checks": [
        { "type": "tangent", "a": "big", "b": "c" },
        { "type": "length", "from": "O", "to": "C", "equals": "2 - r" }
      ]
    }
  ],
  "scenes": [
    {
      "heading": "what this scene does, three to six words",
      "lines": ["what is said, one sentence each, in order"],
      "board": [
        { "kind": "label", "text": "a short coloured caption", "color": "blue", "at": 0 },
        { "kind": "math", "text": "OC = 2 − r", "color": "ink", "at": 0 },
        { "kind": "text", "text": "a short point in words", "color": "ink", "at": 1 },
        { "kind": "math", "text": "9r² = 8r", "color": "ink", "at": 2, "via": "− 8r both sides" },
        { "kind": "divide", "text": "3x = 12", "by": "3", "result": "x = 4", "color": "ink", "at": 2 },
        { "kind": "move", "text": "x + 2 = 5", "term": "+ 2", "result": "x = 5 − 2", "color": "ink", "at": 2 },
        { "kind": "math", "text": "r(9r − 8) = 0", "color": "ink", "at": 2, "mark": "9r − 8" },
        { "kind": "answer", "text": "r = 8/9 units", "color": "green", "at": 2 }
      ],
      "figure": "main",
      "show": [{ "id": "big", "at": 0 }, { "id": "c", "at": 1 }, { "id": "OC", "at": 1 }],
      "props": [{ "kind": "sun", "label": "light", "at": 0 }, { "kind": "plant", "label": "leaf", "at": 0 }],
      "links": [{ "from": 0, "to": 1, "label": "light energy", "at": 1 }]
    }
  ]
}`;

const RULES = `How the video works:
- Each scene is shown while its "lines" are read aloud, one after another. "at" is the index of the line during which a board item or figure shape appears, so things arrive as they are talked about. Start each scene's first items at 0.
- The "lines" are the transcript. Spoken, plain, warm, like a good teacher at a whiteboard. Say symbols the way they are read aloud: "x squared", "two minus r", "eight ninths". 1 to 4 lines per scene, each under 30 words.
- 4 to 8 scenes. The first sets out what is asked and the plan. The last states the answer or the key takeaway.
- "board" holds 1 to 7 items per scene: working written with real symbols (x², √, π, ×, ÷, ≤, ≥, −, fractions as 8/9), each line a single step. "label" is a short coloured caption above the working it introduces. "answer" is for the final result only. Never a caret.
Animations, so each step is seen happening rather than only stated. Use them wherever they make a step easier to follow:
- "via" on a board item: a curved arrow is drawn from the line above to this one, labelled with what was done to get here, like "÷ 3 both sides", "square both sides", "substitute x = 2", "expand the brackets". Give nearly every step of working its "via".
- "divide": the whole of "text" is divided by "by": a fraction bar slides in under both sides with "by" beneath, then "result" appears. Use it whenever both sides are divided.
- "move": the part "term" of "text" (written exactly as it appears there) flies across the equals sign, its sign flipping, then "result" appears. Use it when a term is moved to the other side.
- "mark": part of an item's "text" (exactly as it appears) that gets a hand drawn ring round it, to point at what matters now.
- In figures, "flow": true on an arrow or segment makes dashes run along it, for anything that moves or flows: water, current, blood, energy, heat, a force acting. A "mover" shape (through: points, color) sends dots travelling along that path over and over, like particles diffusing, electrons in a wire or blood round a loop. "pulse": true on any shape makes it gently pulse while it is being talked about.

Moving drawings, for anything real a scene talks about:
- "props": 1 to 4 animated drawings the app draws itself, chosen ONLY from: ${PROP_KINDS.join(", ")}. Each has a short "label" (1 to 3 words) and "at", the line it appears on. Pick the ones the line is actually about: talking about photosynthesis, a sun, a plant, co2, water, o2 and glucose; about blood, a heart; about circuits, a battery and a bulb; about free school meals, children and food; about customer loyalty, a handshake; about a firm, a shop or factory; about wages, a worker and a moneybag; about profit rising, chartUp; about an aim, a target.
- Particles in a solid, liquid or gas: always the "solid", "liquid" and "gas" drawings, which show the particles packed and moving the right way. Never draw them yourself as a figure of a circle with dots, and never use "atom" or "molecule" for them. Comparing states, put the drawings side by side in one scene.
- A drawing's label must be what it shows. Never put a plant or a person under a name like "oil droplet", "salt shaker", "protein" or "ions": use "droplet" or "oildroplet" for liquid drops, "cube" for salt or sugar crystals, "molecule" for proteins, amino acids, fatty acids and ions, "beaker" for a solution, and "diffusion" (a beaker of dye spreading from crowded to even) for anything about diffusion or high to low concentration. If no drawing fits, leave "props" out.
- A drawing must look like the thing itself to a student. Never use a science drawing (cell, atom, molecule, dna, bacteria, flask, co2, o2, glucose) unless the scene is about that science: a worker is a worker or person, never a cell; costs are a coin or moneybag, never a flask; a school is a school, not a book.
- "links": arrows between props, by their index in "props", with a short "label" for what goes from one to the other ("light energy", "oxygen out", "blood pumped") and "at", the line it is drawn on. Use them to show processes: inputs flowing in, products flowing out, one thing causing another.
- Give every scene that is not pure maths its props, and links wherever something moves or changes.
- A drawing shows what the scene is about, never a word that only describes it: "heart muscle cell" is a cell, "solar panel" is a battery or bulb, not a sun. If no drawing truly fits, leave "props" out. A scene with props needs no picture; keep "figure" for a real diagram the props cannot show, like a labelled cross section or a graph.

Layouts, for a scene with no object to draw (use one INSTEAD of props or a figure; the board is then not shown, so put the content in the layout):
- { "type": "steps", "items": [{ "head": "short title", "text": "what happens, under 14 words", "at": 0 }] }: the stages of a process or method, 2 to 6, in order.
- { "type": "cycle", "items": [{ "text": "stage", "at": 0 }] }: something that goes round and back to the start (3 to 6 stages).
- { "type": "timeline", "items": [{ "head": "1066", "text": "what happened", "at": 0 }] }: events in order, each with its date or period (2 to 6).
- { "type": "compare", "left": { "title": "Option A", "points": [{ "text": "short point", "at": 0 }] }, "right": { "title": "Option B", "points": [{ "text": "short point", "at": 1 }] } }: two things set side by side (1 to 4 points each).
- { "type": "quote", "text": "an exact line of writing from the source", "marks": [{ "part": "exact words inside the line", "label": "metaphor", "at": 0 }] }: a line of text taken apart, naming a technique or idea for each marked part (1 to 4).
- { "type": "formula", "expr": "F = m × a", "parts": [{ "sym": "F", "means": "force in newtons", "at": 0 }] }: a formula and what each letter means.
"at" is the line on which each part appears.

The subject is worked out for you from what the student entered, and its own rules for what to show are given at the end of this message. Follow them: every scene needs a visual that carries meaning, never a decoration, and the visual should change from scene to scene.

- Colours: "ink", "blue", "green", "purple", "orange", "red". Use one colour for each object and keep it: the same circle, length or quantity is the same colour in the figure and on the board.
- Every scene has something to look at, and it matches what that scene is saying. In maths it is the question's diagram or a graph of what is being worked on. Anything else gets a simple drawn diagram of the structure or process the scene explains, or a picture of the real thing the scene names: talking about plants, a plant; about the heart, a heart; about a volcano, a volcano. Only a scene of pure algebra with nothing to picture sets "figure" to null.
- The board supports the picture, it does not replace it. Outside maths: at most 3 board items a scene, each a key term or a point under 8 words. Never paste sentences from the lines onto the board.
- Only what the source says. Every fact, term, example, formula and symbol in the video must come from the source; explain it in simpler words, but add nothing the source does not have: no extra theory, no formulas or notation the source does not write (no π for profit, no max(), no Greek letters it does not use), no examples or numbers of your own.
- Keep it simple, for the student's level: short everyday words, one idea per line, a familiar example from the source where there is one. If a term is used, say what it means in plain words the first time. Never make it sound harder than the source.
- Outside maths, the board has words, not equations, unless the source itself writes that equation.
- British English. No em dashes or en dashes in the lines.`;

const FIGURES = `Figures, which the app draws to scale and checks before showing:
- A figure is drawn once and used by any scene through "figure" (its id, or null for no diagram) and "show" (which of its shapes appear, and on which line). Keep a figure the same across scenes, revealing more of it.
- Every number is an exact expression the app calculates: "8/9", "2 - r", "sqrt(3)/2", "2*cos(pi/6)", "r^2". Use + - * / ^ ( ), sqrt, sin, cos, tan (radians), pi, and names from "values". Never a rounded decimal you worked out yourself.
- "points" are named positions, [x, y] with y upwards. Shapes refer to points by name or by an [x, y] pair of expressions.
- Shape types: "circle" (center, r, half "upper"/"lower"/null, fill); "ellipse" (center, rx, ry, turn in degrees, fill); "rect" (from and to opposite corners, round for rounded corners, fill); "segment" and "arrow" (from, to, dashed, label); "point" (at, label); "polygon" (through: points, fill); "path" (through: points); "graph" (y: a function of x such as "x^2 - 2", from, to); "text" (at, text); "callout" (to: the point it names, at: where its words go, text) for labelling a part with a line pointing to it. Circles, ellipses and rects of living things (cells, organelles, leaves, organs) set "organic": true so they are drawn with a soft, natural outline. Up to 24 shapes.
- "checks" state every fact the figure must satisfy, and the app tests each one: "tangent" (a, b: circles or segments that touch), "on" (point lies on shape), "length" (from, to, equals), "perpendicular" and "parallel" (a, b: segments), "inside" (inner shape or point lies wholly inside outer). Give a check for every relationship in the question or topic: every touching, every length given, and "inside" for every part drawn within another, like each organelle inside the cell. A figure that fails a check is sent back to you to fix.
- Draw the diagram yourself, simply, like a clear textbook sketch: only the parts the scene talks about, each a plain shape in its own colour with a "callout" label, nothing decorative. A plant cell is a rounded rect wall, a membrane just inside it, a large vacuole, a nucleus and a few small chloroplasts, not every organelle. Sizes true to life relative to each other: a chloroplast is small beside its cell, the nucleus smaller than the cell. Leave space between parts that do not touch.
- Maths and coordinate figures set "axes" and "grid" true. Everything else sets them false and labels parts with "callout".
- For a real thing a scene names that a simple sketch would not do justice to (a plant, an animal, an organ, a volcano, a rock, a place, a person, a painting, an instrument), give a picture instead: { "id": "plant", "picture": "a short plain name for it, e.g. Sunflower", "photo": true }. "photo": true shows a photograph of the thing; false shows a labelled diagram of it, for things like "Plant cell" or "Human heart" where the labels are the point. Give each different thing its own picture figure and show it in the scene that talks about it. Processes, forces, structures and anything with parts to point at are drawn instead.`;

const FIGURE_ONLY = `You draw the diagram for a question a student is solving, so they recognise it at once as their question.

Return ONE JSON object and nothing else: { "figure": { ...a figure with "id": "main"... } }, or { "figure": null } when the question has no diagram and there is nothing a picture would make clearer (pure algebra, a definition, a calculation with no shape or graph).

The figure format:
{ "id": "main", "axes": false, "grid": false, "values": { "r": "8/9" }, "points": { "O": ["0", "0"] }, "shapes": [ ... ], "checks": [ ... ] }

${FIGURES}

Most of all:
- Reproduce the question's own diagram: the same shapes, the same letters on the same points, the same lengths, angles and coordinates written beside the same parts, the same orientation and layout (what is on the left, what is above, what is inside), and the same shading. Nothing from the working or the answer is labelled on it, and nothing is added.
- A diagram described in words ([Diagram: ...]) is drawn exactly as described.
- A question with no diagram but a clear setup (a triangle with given sides, a graph of a function, a circle and a tangent, a ladder against a wall) is drawn the way a textbook would draw it.
- Unknowns keep their letters as labels (x, r, θ). To place them truly to scale use the worked answer you are given in "values", but never write the answer on the figure.
- Label with "callout" or a segment's "label" using the question's own text, like "12 cm", "35°", "x".`;

// The subject is worked out from what the student entered, with no setting to
// choose, and decides what the video shows: the rules the model is given, the
// drawings it may use, and what a scene with no visual falls back to.
const set = (...k) => new Set(k);
export const SUBJECTS = [
  { id: "maths", label: "Maths", allow: set(),
    test: /\b(equation|algebra|geometry|trigonometr\w*|calculus|simplif\w*|factori[sz]\w*|expand\w*|solve|gradient|quadratic|polynomial|probability|statistic\w*|median|vector|matrix|theorem|perimeter|area|volume|fraction|ratio|indices|surds?|sequence|angle|hypotenuse|integrat\w*|differentiat\w*|simultaneous|inequalit\w*)\b|[x-z][²³^]|\d\s*[+×÷=]\s*\d/gi,
    guide: "Maths. Use a figure (the question's diagram, or a graph of what is being worked on) with the working on the board, one step per line, each with its \"via\". No props. A rule or formula that is being stated uses the \"formula\" layout; a method with named stages uses \"steps\"." },
  { id: "biology", label: "Biology", deny: set("shop", "handshake", "moneybag", "bank", "megaphone", "tag", "cart", "chartUp", "chartDown", "scales", "castle", "crown", "scroll", "ship", "quill", "speech", "quotes", "document", "laptop"),
    test: /\b(cells?|organ\w*|enzymes?|photosynth\w*|respiration|dna|genes?|genetic\w*|evolution|ecosystems?|bacteri\w*|osmosis|diffusion|blood|digest\w*|hormones?|nervous|mitosis|meiosis|chromosom\w*|organism|species|habitat|nutrient\w*|membrane|nucleus|tissue|antibod\w*)\b/gi,
    guide: "Biology. Show the real thing: a drawn diagram or the matching drawings (\"cell\", \"plant\", \"heart\", \"lungs\", \"brain\", \"dna\", \"bacteria\", \"eye\", \"bone\", \"diffusion\", \"droplet\", \"molecule\", \"beaker\") with links for what moves in and out (water, oxygen, glucose, ions). Particles or diffusion: the \"diffusion\" drawing. A process in stages: \"steps\" or \"cycle\". Two things contrasted (mitosis and meiosis, plant and animal cell): \"compare\"." },
  { id: "chemistry", label: "Chemistry", deny: set("shop", "handshake", "moneybag", "bank", "megaphone", "tag", "cart", "chartUp", "chartDown", "scales", "castle", "crown", "scroll", "ship", "quill", "speech", "quotes", "document", "laptop"),
    test: /\b(atoms?|molecul\w*|reactions?|acids?|alkali\w*|bonds?|bonding|electrons?|periodic table|compounds?|moles?|ionic|covalent|oxidation|reduction|electrolysis|isotopes?|polymers?|titration|distillation|catalyst\w*|exothermic|endothermic|reactivity|solution)\b/gi,
    guide: "Chemistry. Particle ideas use the \"solid\", \"liquid\", \"gas\", \"atom\", \"molecule\", \"beaker\", \"flask\", \"diffusion\" drawings (side by side to compare states). A reaction is \"steps\" with the word equation, or a \"formula\" layout for an equation and what each part is. Trends, tests and methods are \"steps\"; two substances or types of bonding contrasted are \"compare\"." },
  { id: "physics", label: "Physics", deny: set("shop", "handshake", "moneybag", "bank", "megaphone", "tag", "cart", "chartUp", "chartDown", "scales", "castle", "crown", "scroll", "ship", "quill", "speech", "quotes", "document"),
    test: /\b(forces?|energy|velocity|speed|acceleration|current|voltage|circuits?|waves?|momentum|pressure|radiation|magnet\w*|gravity|resistance|frequency|wavelength|newton|joules?|watts?|density|friction|work done|power|nuclear|half.life)\b/gi,
    guide: "Physics. A law or equation is the \"formula\" layout with what every letter means. Forces, motion and circuits use drawings that are the thing (\"car\", \"spring\", \"magnet\", \"battery\", \"bulb\", \"lightning\", \"wave\", \"thermometer\") with links for what flows or acts; a graph (distance-time, velocity-time) is a figure. Methods and processes are \"steps\"." },
  { id: "business", label: "Economics and business", allow: set("person", "people", "worker", "shop", "factory", "coin", "moneybag", "tag", "cart", "bank", "chartUp", "chartDown", "scales", "truck", "phone", "laptop", "handshake", "megaphone", "house", "school", "food", "target", "star", "shield", "calendar", "clock", "document", "gear", "earth", "lock", "magnifier", "children"),
    test: /\b(demand|supply|prices?|inflation|gdp|elasticity|elastic|markets?|monopol\w*|opportunity cost|fiscal|monetary|unemployment|econom\w*|tax\w*|subsid\w*|externalit\w*|ppc|ppf|trade|business|firms?|stakeholders?|marketing|profit\w*|revenue|cash flow|swot|entrepreneur\w*|human resources?|operations|break.even|objectives|motivation|leadership|competitive|competition|consumers?|producers?|wages?|costs?)\b/gi,
    guide: "Economics and business. Show the people and things involved with the matching drawings (\"shop\", \"factory\", \"worker\", \"person\", \"coin\", \"tag\", \"cart\", \"bank\", \"chartUp\", \"chartDown\", \"megaphone\", \"handshake\") and links for what flows between them (goods, money, wages, advertising). Supply and demand, PPC, costs, revenue, AD/AS and the like are a graph figure. Two options, two market structures, advantages and disadvantages: \"compare\". A method, a decision process or cause and effect chain: \"steps\". Never a science drawing." },
  { id: "english", label: "English", allow: set("quill", "speech", "quotes", "book", "scroll", "pin", "people", "person", "children", "star", "target", "handshake", "megaphone", "heart", "brain", "eye", "crown", "castle", "ship", "fire", "sun", "cloud", "tree"),
    test: /\b(poems?|poet\w*|novels?|plays?|shakespeare|metaphors?|simile|imagery|themes?|characters?|narrator|tone|language analysis|literary|essay|paragraph|punctuation|grammar|persuasi\w*|rhetoric\w*|alliteration|stanza|quotations?|author|writer|sentence|verb|noun|adjective|adverb|conjunction|inference|connotation|structure|dialogue|protagonist|soliloquy|sonnet)\b/gi,
    guide: "English. Almost every scene is a layout. Taking a line of writing apart is \"quote\": the exact words from the source, with the technique or idea named on each marked part (metaphor, repetition, tone, effect). Building an answer, a paragraph or an essay is \"steps\" (for example point, evidence, explain). Two characters, texts, viewpoints or writers' methods are \"compare\". A grammar rule with an example uses \"quote\" or \"steps\". Use a drawing only now and then, for something named in the text, and never a science drawing." },
  { id: "history", label: "History", allow: set("castle", "scroll", "crown", "ship", "pin", "people", "person", "worker", "coin", "moneybag", "handshake", "shield", "fire", "earth", "book", "bank", "factory", "truck", "calendar", "clock", "target", "megaphone", "school", "house", "children", "star", "scales", "compass", "document"),
    test: /\b(wars?|revolution\w*|empires?|treat(y|ies)|dynast\w*|medieval|century|centuries|king|queen|parliament|coloni\w*|nazi\w*|cold war|industrial revolution|civil rights|battles?|reign|monarch\w*|peasants?|feudal\w*|renaissance|reformation|armistice|suffrage|conquest|invasion|crusades?|tudors?|stuarts?|victorian)\b|\b1[0-9]{3}\b/gi,
    guide: "History. Events in order are a \"timeline\" with each date or period. Causes, consequences, two sides or two sources are \"compare\". How something happened in stages (how a law passed, how an empire grew) is \"steps\"; a repeating pattern is \"cycle\". Use the matching drawing (\"castle\", \"crown\", \"scroll\", \"ship\", \"pin\" for a place, \"people\") where a scene is about that thing. Never a science drawing." },
  { id: "geography", label: "Geography", allow: set("mountain", "volcano", "pin", "earth", "cloud", "water", "droplet", "sun", "tree", "plant", "house", "people", "factory", "truck", "ship", "compass", "fire", "wave", "thermometer", "calendar", "clock", "food", "person", "worker", "chartUp", "chartDown", "coin", "school", "bank", "children"),
    test: /\b(rivers?|erosion|glaciers?|plates?|earthquakes?|volcan\w*|climate|population|migration|urban\w*|rainforests?|coast\w*|weather|biomes?|settlements?|tectonic|maps?|deposition|flood\w*|sustainab\w*|deforestation|globali[sz]ation|development|rural|continents?|latitude|longitude|ecosystems?)\b/gi,
    guide: "Geography. Places and features use the matching drawings (\"mountain\", \"volcano\", \"pin\", \"earth\", \"cloud\", \"water\", \"droplet\", \"sun\", \"tree\", \"house\", \"factory\") with links for what moves (water, people, goods). A repeating system (the water cycle, the rock cycle) is \"cycle\"; how a landform or hazard happens in stages is \"steps\"; two places, causes against effects, or advantages and disadvantages are \"compare\"; changes over time are \"timeline\". Never a business drawing." },
];

// The subject whose words appear most, if any appear enough to be sure.
export function detectSubject(...texts) {
  const text = texts.join(" ").slice(0, 8000);
  let best = null, top = 2;
  for (const sub of SUBJECTS) {
    const n = (text.match(sub.test) || []).length;
    if (n > top) { best = sub; top = n; }
  }
  return best;
}
const subjectBlock = (sub) => (sub ? `\n\nThe subject, worked out from what the student entered: ${sub.label}. Rules for what this video shows:\n- ${sub.guide}\n- Use ONLY what the source says for every layout, label and example.` : "\n\nThe subject is not clear, so choose for each scene whichever fits what it says best: a figure, drawings with links, or a layout (steps, cycle, timeline, compare, quote, formula). Vary it from scene to scene.");
const allowedProp = (sub, kind) => !sub || (sub.allow ? sub.allow.has(kind) : !(sub.deny && sub.deny.has(kind)));

const FROM_SOLUTION = `You turn a worked solution into a short narrated explainer video that walks a student through it step by step, like a tutor at a whiteboard.

${SHAPE}

${RULES}

${FIGURES}
- Follow the worked solution's method and reach its answer. Show every step of the working on the board, one move per line.`;

const FROM_NOTES = `You turn one topic of a student's notes into a short narrated explainer video that teaches it, like a teacher at a whiteboard.

${SHAPE}

${RULES}

${FIGURES}
- Teach it like the best study videos, in this order: (1) a hook, the first scene opening on one question or surprise taken from the notes that makes the student want the answer; (2) what it is, in plain words; (3) how it works, one idea per scene, each with something to look at; (4) an example from the notes; (5) a watch-out, the common mistake the notes mention; (6) a recap of the 3 things to remember, as short board points; (7) a quick self test, one question from the notes asked in the last line, with the answer said straight after. Use 5 to 8 scenes, skipping any step the notes give nothing for. Cover the main points of the notes on this topic and nothing from other topics.
- Keep the pace lively: lines of 8 to 20 words, a new thing on the board or the picture with nearly every line, the key term said and shown together. Vary what is shown from scene to scene.
- For a topic with no maths, the board holds short points, key terms and steps rather than equations, and a diagram only when a sketch really helps.`;

const COLORS = ["ink", "blue", "green", "purple", "orange", "red"];
const KINDS = ["label", "math", "text", "answer", "divide", "move"];
const color = (c) => (COLORS.includes(c) ? c : "ink");
const at = (v, max) => Math.max(0, Math.min(max, Number.isInteger(v) ? v : 0));
const short = (s, n) => String(s ?? "").trim().slice(0, n);

const REPAIR = `You fix diagrams for a study video. Each figure below failed checks: the numbers do not satisfy the facts the figure is meant to show, or parts could not be calculated.

Work out the correct exact values, then return ONE JSON object and nothing else:
{ "figures": [ every figure listed, corrected, in the same format and with the same ids and shape ids ] }

Keep every shape id the scenes use. Fix positions and sizes with exact expressions (never rounded decimals) so every check passes; keep checks that state real facts, and only remove a check if the fact it states is wrong. Sizes stay true to life relative to each other.`;

// A layout: steps, cycle, timeline, compare, quote or formula. Anything
// incomplete is dropped (null), so a half made one is not shown.
const LAYOUTS = ["steps", "cycle", "timeline", "compare", "quote", "formula"];
function cleanLayout(l, last) {
  if (!l || typeof l !== "object" || !LAYOUTS.includes(l.type)) return null;
  if (["steps", "cycle", "timeline"].includes(l.type)) {
    const items = (Array.isArray(l.items) ? l.items : [])
      .map((it) => ({ head: short(it?.head, 40), text: short(it?.text ?? (typeof it === "string" ? it : ""), 100), at: at(it?.at, last) }))
      .filter((it) => it.text || it.head).slice(0, 6);
    return items.length >= 2 ? { type: l.type, items } : null;
  }
  if (l.type === "compare") {
    const side = (s2) => ({ title: short(s2?.title, 30), points: (Array.isArray(s2?.points) ? s2.points : []).map((p) => ({ text: short(p?.text ?? (typeof p === "string" ? p : ""), 70), at: at(p?.at, last) })).filter((p) => p.text).slice(0, 4) });
    const left = side(l.left), right = side(l.right);
    return left.points.length && right.points.length && left.title && right.title ? { type: "compare", left, right } : null;
  }
  if (l.type === "quote") {
    const text = short(l.text, 260);
    const marks = (Array.isArray(l.marks) ? l.marks : [])
      .map((m) => ({ part: short(m?.part, 80), label: short(m?.label, 30), at: at(m?.at, last) }))
      .filter((m) => m.part && m.label && text.includes(m.part)).slice(0, 4);
    return text && marks.length ? { type: "quote", text, marks } : null;
  }
  const expr = short(l.expr, 60);
  const parts = (Array.isArray(l.parts) ? l.parts : []).map((p) => ({ sym: short(p?.sym, 12), means: short(p?.means, 50), at: at(p?.at, last) })).filter((p) => p.sym && p.means).slice(0, 5);
  return expr && parts.length ? { type: "formula", expr, parts } : null;
}

// Never trust the shape. Anything the player could not draw is dropped here,
// so a bad part costs that part rather than the whole video.
export function cleanScenes(data, figures, subject = null) {
  const scenes = (Array.isArray(data?.scenes) ? data.scenes : []).map((sc) => {
    const lines = (Array.isArray(sc?.lines) ? sc.lines : []).map((l) => short(l, 400)).filter(Boolean).slice(0, 5);
    if (!lines.length) return null;
    const last = lines.length - 1;
    const board = (Array.isArray(sc.board) ? sc.board : [])
      .filter((b) => b && typeof b.text === "string" && b.text.trim())
      .map((b) => {
        const item = { kind: KINDS.includes(b.kind) ? b.kind : "text", text: short(b.text, 160), color: color(b.color), at: at(b.at, last) };
        if (typeof b.via === "string" && b.via.trim()) item.via = short(b.via, 40);
        if (typeof b.mark === "string" && b.mark.trim() && item.text.includes(b.mark.trim())) item.mark = short(b.mark, 60);
        // A division needs something to divide by and a result; a move needs
        // its term to really be in the line. Otherwise it is plain working.
        if (item.kind === "divide") {
          if (typeof b.by === "string" && b.by.trim() && typeof b.result === "string" && b.result.trim()) { item.by = short(b.by, 20); item.result = short(b.result, 120); }
          else item.kind = "math";
        }
        if (item.kind === "move") {
          const term = typeof b.term === "string" ? b.term.trim() : "";
          if (term && item.text.includes(term) && typeof b.result === "string" && b.result.trim()) { item.term = short(term, 30); item.result = short(b.result, 120); }
          else item.kind = "math";
        }
        return item;
      })
      .slice(0, 8);
    const fig = typeof sc.figure === "string" ? figures[sc.figure] : null;
    const said = [sc.heading, ...lines].join(" ").toLowerCase();
    const props = (Array.isArray(sc.props) ? sc.props : [])
      .filter((p) => p && PROP_KINDS.includes(p.kind) && allowedProp(subject, p.kind) && (!SCIENCE[p.kind] || SCIENCE[p.kind].test(said))).slice(0, 4)
      .map((p) => ({ kind: p.kind, label: short(p.label, 24), at: at(p.at, last) }));
    const links = (Array.isArray(sc.links) ? sc.links : [])
      .filter((l) => l && Number.isInteger(l.from) && Number.isInteger(l.to) && l.from !== l.to && props[l.from] && props[l.to]).slice(0, 5)
      .map((l) => ({ from: l.from, to: l.to, label: short(l.label, 22), at: Math.max(at(l.at, last), props[l.from].at, props[l.to].at) }));
    let layout = cleanLayout(sc.layout, last);
    // A scene left with nothing to look at (no drawing, picture or layout) is
    // given its board as steps, so it is never a wall of words, except in maths
    // where the working is the visual.
    const bare = !layout && !props.length && !sceneDiagram(fig, sc.show, last);
    if (bare && subject?.id !== "maths") {
      const pts = board.filter((b) => ["text", "label", "answer"].includes(b.kind));
      if (pts.length >= 2) layout = { type: "steps", items: pts.slice(0, 6).map((b) => ({ head: "", text: b.text, at: b.at })) };
    }
    return { heading: short(sc.heading, 80) || "Step", lines, board, diagram: sceneDiagram(fig, sc.show, last), ...(props.length ? { props, links } : {}), ...(layout ? { layout } : {}) };
  }).filter(Boolean).slice(0, 8);
  if (scenes.length < 2) return null;
  return { title: short(data.title, 100) || "Explained", subtitle: short(data.subtitle, 120), scenes };
}

// From notes, the board never shows notation the notes do not use: a Greek
// letter or a function like max() that was never in them is the model
// dressing the topic up, and only makes it look harder. Such working is taken
// off the board; the words that are said stay.
const GREEK = /[α-ωΑ-Ω]/g;
const FUNCS = /\b(max|min|lim|log|ln|sin|cos|tan|exp)\s*\(/gi;
function keepToNotes(video, notes) {
  const theirs = new Set([...(notes.match(GREEK) || []), ...(notes.match(FUNCS) || []).map((f) => f.toLowerCase().replace(/\s/g, ""))]);
  const foreign = (t) => (t.match(GREEK) || []).some((g) => !theirs.has(g))
    || (t.match(FUNCS) || []).some((f) => !theirs.has(f.toLowerCase().replace(/\s/g, "")));
  for (const sc of video.scenes) sc.board = sc.board.filter((b) => !foreign(b.text) && !foreign(b.result || ""));
}

// Builds the figures, sends any that fail their checks back once to be
// fixed, and leaves out any that still fail.
// specs, when given, is filled with the figure description each id ended up
// with (the repaired one where it was repaired).
async function checkedFigures(list, specs) {
  let { figures, problems } = buildFigures(list);
  for (const f of list) if (specs && f && typeof f === "object") specs[String(f.id || "main")] = f;
  const failing = Object.keys(problems);
  if (!failing.length) return figures;
  try {
    const broken = list.filter((f) => failing.includes(String(f?.id || "main")));
    const text = await ask({
      system: REPAIR,
      user: broken.map((f) => `Figure ${JSON.stringify(f)}\nProblems:\n- ${problems[String(f?.id || "main")].join("\n- ")}`).join("\n\n"),
      maxTokens: 3000, temperature: 0.1, json: true,
    });
    const fixed = safeParse(text, "figures")?.figures;
    if (Array.isArray(fixed)) {
      const again = buildFigures(fixed);
      for (const id of failing) {
        if (again.figures[id] && !again.problems[id]) {
          figures[id] = again.figures[id]; delete problems[id];
          if (specs) specs[id] = fixed.find((f) => String(f?.id || "main") === id);
        }
      }
    }
  } catch { /* the repair is a second chance, not a requirement */ }
  for (const id of Object.keys(problems)) figures[id] = null;
  return figures;
}

// The question's own diagram, drawn once: shown on Solve under the question
// and used unchanged in every scene of its video.
async function questionFigure(body) {
  const s = body.solution && typeof body.solution === "object" ? body.solution : {};
  const text = [
    `The question as the student gave it:\n${short(body.problem || s.asked, 6000)}`,
    s.asked ? `Restated: ${short(s.asked, 1000)}` : "",
    s.answer ? `Its worked answer, for placing things to scale only: ${short(s.answer, 300)}` : "",
  ].filter(Boolean).join("\n\n");
  const reply = await ask({ system: FIGURE_ONLY, user: text, maxTokens: 2500, temperature: 0.1, json: true });
  const fig = safeParse(reply, "figure")?.figure;
  if (!fig || typeof fig !== "object" || fig.picture) return null;
  const specs = {};
  const figures = await checkedFigures([{ ...fig, id: "main" }], specs);
  return figures.main ? { spec: { ...specs.main, id: "main" }, built: figures.main } : null;
}

// The model's version of the question's diagram, with anything it moved or
// resized put back: the original's points, values and shapes win, and only
// new shapes and points (construction lines, marks) are taken from it.
function keepQuestionFigure(original, drawn) {
  const merged = JSON.parse(JSON.stringify(original));
  if (drawn && typeof drawn === "object") {
    merged.values = { ...(drawn.values || {}), ...(original.values || {}) };
    merged.points = { ...(drawn.points || {}), ...(original.points || {}) };
    const have = new Set((original.shapes || []).map((sh) => sh?.id));
    merged.shapes = [...(original.shapes || []), ...(Array.isArray(drawn.shapes) ? drawn.shapes : []).filter((sh) => sh && !have.has(sh.id))].slice(0, 30);
  }
  return merged;
}

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 6 })) return;
  const body = req.body || {};
  let system, user, subject = null;

  if (body.mode === "figure") {
    try {
      if (String(body.problem || body.solution?.asked || "").trim().length < 12) return res.status(200).json({ figure: null });
      const drawn = await questionFigure(body);
      return res.status(200).json(drawn ? { figure: drawn.spec, diagram: sceneDiagram(drawn.built, null, 0) } : { figure: null });
    } catch (err) {
      return fail(res, err);
    }
  }
  // A question's diagram already drawn (by the figure step above) is kept as
  // it is in every scene.
  const given = body.figure && typeof body.figure === "object" && !body.figure.picture && buildFigures([{ ...body.figure, id: "main" }]).figures.main
    ? { ...body.figure, id: "main" } : null;

  if (body.solution && typeof body.solution === "object") {
    const s = body.solution;
    const steps = (Array.isArray(s.steps) ? s.steps : []).map((st, i) =>
      `Step ${i + 1}: ${short(st?.do, 200)}\n${short(st?.work, 800)}\nWhy: ${short(st?.why, 400)}`).join("\n\n");
    const text = [
      `The question: ${short(s.asked || body.problem, 3000)}`,
      body.problem ? `As the student gave it:\n${short(body.problem, 6000)}` : "",
      `The answer: ${short(s.answer, 400)}`,
      `The worked steps:\n${steps}`,
      s.idea ? `The idea it tests: ${short(s.idea, 600)}` : "",
    ].filter(Boolean).join("\n\n");
    if (text.length < 60) return userError(res, 400, "There is no worked solution to explain yet.");
    subject = detectSubject(s.asked || body.problem || "", s.idea || "") || SUBJECTS[0];
    system = FROM_SOLUTION + subjectBlock(subject);
    user = text.slice(0, MAX_INPUT - 4000);
    if (given) {
      user += `\n\nThe question's own diagram, already drawn to scale, is this figure. Include it in "figures" exactly as it is, with id "main", and use "main" in EVERY scene. Never move, resize or relabel its shapes. To show a step, add new shapes to it (construction lines, a marked angle, a highlighted length, new points) with new ids, and reveal them with "show". Pictures or other figures are not needed for this question.\n${JSON.stringify(given).slice(0, 4000)}`;
    }
  } else {
    const topic = short(body.topic, 160);
    const notes = String(body.notes || "").trim();
    if (!topic || notes.length < 80) return userError(res, 400, "This topic has no notes to make a video from yet.");
    subject = detectSubject(topic, notes);
    system = FROM_NOTES + subjectBlock(subject);
    user = `The topic: ${topic}\n\nThe student's notes on it:\n\n${notes.slice(0, MAX_INPUT)}`;
  }

  try {
    const text = await ask({ system, user, maxTokens: 6000, temperature: 0.3, json: true });
    const data = safeParse(text, "scenes");
    let list = Array.isArray(data?.figures) ? data.figures : [];
    // Axes and a grid only for a topic that is about graphs or coordinates.
    if (!body.solution && !/graph|axis|axes|coordinate|plot|function|gradient|equation/i.test(`${body.topic || ""} ${body.notes || ""}`)) {
      list = list.map((f) => (f && typeof f === "object" ? { ...f, axes: false, grid: false } : f));
    }
    if (given) {
      const theirs = list.find((f) => String(f?.id || "main") === "main");
      list = [keepQuestionFigure(given, theirs), ...list.filter((f) => f !== theirs)];
      // The question's own shapes are on screen from the start of every scene.
      const base = (given.shapes || []).map((sh) => sh?.id).filter(Boolean);
      for (const sc of Array.isArray(data?.scenes) ? data.scenes : []) {
        if (!sc || (sc.figure && sc.figure !== "main")) continue;
        sc.figure = "main";
        const show = Array.isArray(sc.show) ? sc.show.map((x) => (typeof x === "string" ? { id: x, at: 0 } : x)) : [];
        const shown = new Set(show.map((x) => x?.id));
        sc.show = [...base.filter((id) => !shown.has(id)).map((id) => ({ id, at: 0 })), ...show];
      }
    }
    const figures = await checkedFigures(list);
    const video = cleanScenes(data, figures, subject);
    if (video && body.notes) keepToNotes(video, String(body.notes));
    if (!video) return userError(res, 502, "The video did not come back complete. Try again.");
    res.status(200).json(video);
  } catch (err) {
    fail(res, err);
  }
}
