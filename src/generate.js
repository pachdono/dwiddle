// Question generation.
//
// A fixed list of eight questions is repetitive the second time you sit it, so
// the quantitative, grammar and vocabulary sections are GENERATED: each item is
// a template filled with fresh numbers or a fresh word pair, drawn without
// replacement, so a full length paper never repeats itself and no two sittings
// are the same.
//
// Reading and listening cannot be generated this way without producing nonsense,
// so those draw from authored passage banks and are labelled short form where
// the bank is smaller than the real paper.

import { tidyMath } from "./mathText.js";

/* ---------- helpers ---------- */

const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Builds a question, shuffling the options and tracking where the answer landed.
// Options are deduplicated first: a template that happens to generate the same
// value twice would otherwise produce a question with two identical choices, or
// worse, two correct ones.
let uid = 0;
function make({ section, skill, passage, q, correct, wrong, why }) {
  // Written as words and carets in the templates above, printed as real
  // symbols here, so one pass covers every question this file produces.
  q = tidyMath(q);
  why = tidyMath(why);
  passage = tidyMath(passage);
  correct = tidyMath(correct);
  wrong = wrong.map(tidyMath);
  const want = wrong.length + 1;
  const unique = [];
  for (const o of [correct, ...wrong]) {
    if (!unique.includes(o)) unique.push(o);
  }
  let bump = 1;
  while (unique.length < want) {
    const n = Number(correct);
    const filler = Number.isFinite(n) && String(n) === String(correct)
      ? String(n + bump)
      : `${correct} (${bump})`;
    if (!unique.includes(filler)) unique.push(filler);
    bump++;
  }
  const options = shuffled(unique.slice(0, want));
  return {
    id: `gen${uid++}`,
    section,
    skill,
    passage,
    q,
    choices: options,
    answer: options.indexOf(correct),
    why,
  };
}

// Distractors must be distinct from the answer and from each other.
function distinct(correct, candidates, n) {
  const out = [];
  for (const c of candidates) {
    if (c !== correct && !out.includes(c) && out.length < n) out.push(c);
  }
  let bump = 1;
  while (out.length < n) {
    const isNum = typeof correct === "number" || /^-?[\d.]+$/.test(String(correct));
    const filler = isNum ? String(Number(correct) + bump) : `${correct} ${bump}`;
    if (filler !== correct && !out.includes(filler)) out.push(filler);
    bump++;
  }
  return out;
}

/* ---------- maths templates ---------- */
// Each returns one question with fresh numbers every call.

const MATH = {
  linearSystem: (section) => {
    const y = ri(2, 9), d = ri(1, 5), x = y + d, a = ri(2, 5), b = ri(2, 5);
    const total = a * x + b * y;
    return make({
      section, skill: "Algebra",
      q: `If ${a}x + ${b}y = ${total} and x = y + ${d}, what is the value of y?`,
      correct: String(y),
      wrong: distinct(String(y), [String(x), String(y + d), String(total - y)], 3),
      why: `Substitute x = y + ${d}: ${a}(y + ${d}) + ${b}y = ${total}, so ${a + b}y = ${total - a * d} and y = ${y}. Answer ${x} is x, which is the value the question does not ask for.`,
    });
  },

  successiveDiscount: (section) => {
    const d1 = pick([20, 25, 30, 40]), d2 = pick([10, 15, 20]);
    const final = Math.round((1 - d1 / 100) * (1 - d2 / 100) * 100);
    return make({
      section, skill: "Problem solving",
      q: `An item is marked down ${d1} percent, and a member then takes a further ${d2} percent off the reduced price. The final price is what percent of the original?`,
      correct: `${final} percent`,
      wrong: [`${100 - d1 - d2} percent`, `${final + 2} percent`, `${100 - d1} percent`],
      why: `Discounts multiply rather than add: ${(1 - d1 / 100).toFixed(2)} x ${(1 - d2 / 100).toFixed(2)} = ${(final / 100).toFixed(2)}, so ${final} percent. Adding them to get ${100 - d1 - d2} percent is the intended trap.`,
    });
  },

  vertex: (section) => {
    const h = ri(2, 7), k = ri(1, 9);
    const b = 2 * h, c = h * h + k;
    return make({
      section, skill: "Advanced maths",
      q: `The function f is defined by f(x) = x² − ${b}x + ${c}. What is the minimum value of f(x)?`,
      correct: String(k),
      wrong: distinct(String(k), [String(h), String(c), String(-k)], 3),
      why: `Complete the square: x² − ${b}x + ${c} = (x − ${h})² + ${k}. A square is never negative, so the minimum is ${k}, at x = ${h}.`,
    });
  },

  circle: (section) => {
    const r = ri(3, 12), a = ri(1, 9), b = ri(1, 9);
    return make({
      section, skill: "Geometry",
      q: `A circle in the xy plane has equation (x − ${a})² + (y + ${b})² = ${r * r}. What is the length of its diameter?`,
      correct: String(2 * r),
      wrong: distinct(String(2 * r), [String(r), String(r * r), String(r * r * 2)], 3),
      why: `The right hand side is the radius squared, so r = ${r} and the diameter is ${2 * r}. Taking ${r * r} as the radius is the common slip.`,
    });
  },

  slope: (section) => {
    const x1 = ri(0, 5), y1 = ri(0, 8), run = ri(2, 5), m = ri(2, 4);
    const x2 = x1 + run, y2 = y1 + m * run;
    return make({
      section, skill: "Coordinate geometry",
      q: `What is the slope of the line passing through (${x1}, ${y1}) and (${x2}, ${y2})?`,
      correct: String(m),
      wrong: distinct(String(m), [`1/${m}`, String(-m), String(m + 1)], 3),
      why: `Slope is rise over run: (${y2} minus ${y1}) over (${x2} minus ${x1}) = ${m * run}/${run} = ${m}.`,
    });
  },

  perpendicular: (section) => {
    const m = ri(2, 5);
    return make({
      section, skill: "Coordinate geometry",
      q: `A line has slope ${m}. What is the slope of any line perpendicular to it?`,
      correct: `negative 1/${m}`,
      wrong: [`1/${m}`, `negative ${m}`, String(m)],
      why: `Perpendicular slopes are negative reciprocals, so flip it and change the sign: negative 1/${m}. Only flipping, or only changing sign, gives the two nearest wrong answers.`,
    });
  },

  average: (section) => {
    const n = 4, avg = ri(10, 30);
    const a = avg - ri(1, 6), b = avg + ri(1, 6), c = avg - ri(1, 4);
    const d = n * avg - (a + b + c);
    return make({
      section, skill: "Statistics",
      q: `The average of four numbers is ${avg}. Three of them are ${a}, ${b} and ${c}. What is the fourth?`,
      correct: String(d),
      wrong: distinct(String(d), [String(avg), String(n * avg), String(d + 1)], 3),
      why: `The four total ${n} x ${avg} = ${n * avg}. The three given total ${a + b + c}, so the fourth is ${d}.`,
    });
  },

  ratio: (section) => {
    const p = ri(2, 7), qq = ri(2, 5), unit = ri(20, 60);
    return make({
      section, skill: "Ratios",
      q: `Two ingredients are used in the ratio ${p} to ${qq}. If ${p * unit} grams of the first are used, how much of the second is needed?`,
      correct: `${qq * unit} g`,
      wrong: [`${unit} g`, `${p * unit} g`, `${(p + qq) * unit} g`],
      why: `${p * unit} divided by ${p} gives ${unit} per part, and the second ingredient is ${qq} parts, so ${qq * unit} grams. Stopping at ${unit} is the trap.`,
    });
  },

  rectangle: (section) => {
    const w = ri(3, 12), k = ri(2, 3), l = k * w, per = 2 * (w + l);
    return make({
      section, skill: "Geometry",
      q: `A rectangle has perimeter ${per} cm and its length is ${k} times its width. What is its area?`,
      correct: `${w * l} sq cm`,
      wrong: [`${per} sq cm`, `${w * w} sq cm`, `${2 * w * l} sq cm`],
      why: `2(w + ${k}w) = ${per}, so ${2 * (1 + k)}w = ${per} and w = ${w}, length ${l}. Area is ${w} x ${l} = ${w * l}.`,
    });
  },

  exponent: (section) => {
    const a = ri(2, 5), m = ri(2, 5), n = ri(2, 4);
    return make({
      section, skill: "Exponents",
      q: `Simplify: (x^${m})^${n} × x^${a}.`,
      correct: `x to the ${m * n + a}`,
      wrong: [`x to the ${m + n + a}`, `x to the ${m * n * a}`, `x to the ${m + n * a}`],
      why: `A power raised to a power multiplies the exponents (${m} × ${n} = ${m * n}), then multiplying adds them (${m * n} + ${a} = ${m * n + a}). Adding at the first step gives ${m + n + a}.`,
    });
  },

  distanceRate: (section) => {
    const speed = ri(40, 90), hours = ri(2, 6);
    return make({
      section, skill: "Rates",
      q: `A train travels at a constant ${speed} km per hour for ${hours} hours. How far does it travel?`,
      correct: `${speed * hours} km`,
      wrong: [`${speed + hours} km`, `${Math.round(speed / hours)} km`, `${speed * hours + speed} km`],
      why: `Distance is rate times time: ${speed} x ${hours} = ${speed * hours} km.`,
    });
  },

  percentOf: (section) => {
    const base = ri(4, 20) * 25, p = pick([12, 15, 24, 35, 45, 60]);
    const val = (base * p) / 100;
    return make({
      section, skill: "Percentages",
      q: `What is ${p} percent of ${base}?`,
      correct: String(val),
      wrong: distinct(String(val), [String(base - val), String(val * 2), String(Math.round(val / 2))], 3),
      why: `${p} percent means ${p} hundredths: ${base} x ${p / 100} = ${val}.`,
    });
  },

  sequence: (section) => {
    const first = ri(2, 9), d = ri(3, 8), n = ri(8, 20);
    const nth = first + (n - 1) * d;
    return make({
      section, skill: "Sequences",
      q: `An arithmetic sequence starts at ${first} and increases by ${d} each term. What is the ${n}th term?`,
      correct: String(nth),
      wrong: distinct(String(nth), [String(first + n * d), String(nth - d), String(first * n)], 3),
      why: `The nth term is first + (n minus 1) x difference: ${first} + ${n - 1} x ${d} = ${nth}. Using n rather than n minus 1 gives ${first + n * d}.`,
    });
  },

  roots: (section) => {
    const r1 = ri(1, 8), r2 = ri(1, 8);
    const b = r1 + r2, c = r1 * r2;
    return make({
      section, skill: "Advanced maths",
      q: `What is the sum of the solutions to x² − ${b}x + ${c} = 0?`,
      correct: String(b),
      wrong: distinct(String(b), [String(c), String(-b), String(b + c)], 3),
      why: `It factors to (x minus ${r1})(x minus ${r2}) = 0, so the roots are ${r1} and ${r2} and they sum to ${b}. The product ${c} is the near miss.`,
    });
  },

  inequality: (section) => {
    const a = ri(2, 6), b = ri(3, 15), k = ri(2, 9);
    const rhs = a * k + b;
    return make({
      section, skill: "Algebra",
      q: `Solve for x: ${a}x + ${b} is less than or equal to ${rhs}.`,
      correct: `x is less than or equal to ${k}`,
      wrong: [`x is greater than or equal to ${k}`, `x is less than or equal to ${rhs - b}`, `x is less than or equal to ${k + 1}`],
      why: `Subtract ${b} to get ${a}x less than or equal to ${a * k}, then divide by ${a}. The sign only flips when you divide by a negative, which does not happen here.`,
    });
  },

  pythagoras: (section) => {
    const [a, b, c] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]]);
    return make({
      section, skill: "Geometry",
      q: `A right triangle has legs of ${a} and ${b}. What is the length of the hypotenuse?`,
      correct: String(c),
      wrong: distinct(String(c), [String(a + b), String(c - 1), String(Math.round((a + b) / 2))], 3),
      why: `${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c}, and √${c * c} is ${c}. Adding the legs to get ${a + b} is the usual error.`,
    });
  },

  probability: (section) => {
    const r = ri(3, 9), bl = ri(3, 9), g = ri(2, 6);
    const total = r + bl + g;
    return make({
      section, skill: "Probability",
      q: `A bag holds ${r} red, ${bl} blue and ${g} green counters. One is drawn at random. What is the probability it is not blue?`,
      correct: `${r + g}/${total}`,
      wrong: [`${bl}/${total}`, `${r}/${total}`, `${bl}/${r + g}`],
      why: `Not blue means red or green: ${r} + ${g} = ${r + g} out of ${total}. Answering ${bl}/${total} gives the probability it IS blue.`,
    });
  },

  midpoint: (section) => {
    const x1 = ri(0, 10) * 2, y1 = ri(0, 10) * 2, x2 = ri(0, 10) * 2, y2 = ri(0, 10) * 2;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return make({
      section, skill: "Coordinate geometry",
      q: `What is the midpoint of the segment joining (${x1}, ${y1}) and (${x2}, ${y2})?`,
      correct: `(${mx}, ${my})`,
      wrong: [`(${x1 + x2}, ${y1 + y2})`, `(${Math.abs(x2 - x1)}, ${Math.abs(y2 - y1)})`, `(${my}, ${mx})`],
      why: `Average each coordinate: ((${x1} + ${x2})/2, (${y1} + ${y2})/2) = (${mx}, ${my}). Forgetting to halve gives the sum.`,
    });
  },

  unitRate: (section) => {
    const items = ri(3, 9), cost = items * ri(2, 9);
    const want = items * ri(2, 5);
    const per = cost / items;
    return make({
      section, skill: "Rates",
      q: `If ${items} identical notebooks cost ${cost} pounds, how much do ${want} notebooks cost at the same rate?`,
      correct: `${per * want} pounds`,
      wrong: [`${cost + want} pounds`, `${per * items} pounds`, `${Math.round(per * want * 1.5)} pounds`],
      why: `One notebook costs ${cost} divided by ${items} = ${per} pounds, so ${want} cost ${per * want} pounds.`,
    });
  },

  fractionOf: (section) => {
    const total = pick([48, 60, 72, 96, 120]);
    const [n1, d1] = pick([[2, 3], [3, 4], [5, 6]]);
    const [n2, d2] = pick([[1, 2], [3, 4], [2, 3]]);
    const step = (total * n1) / d1;
    const val = (step * n2) / d2;
    return make({
      section, skill: "Fractions",
      q: `What is ${n2}/${d2} of ${n1}/${d1} of ${total}?`,
      correct: String(val),
      wrong: distinct(String(val), [String(step), String(total - val), String(Math.round(val * 2))], 3),
      why: `${n1}/${d1} of ${total} is ${step}, and ${n2}/${d2} of ${step} is ${val}. Stopping at ${step} is the intended trap.`,
    });
  },

  trig: (section) => {
    const [opp, adj, hyp] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13]]);
    const fn = pick(["sine", "cosine", "tangent"]);
    const val = fn === "sine" ? `${opp}/${hyp}` : fn === "cosine" ? `${adj}/${hyp}` : `${opp}/${adj}`;
    const wrongs = [`${adj}/${hyp}`, `${opp}/${hyp}`, `${opp}/${adj}`, `${hyp}/${opp}`].filter((w) => w !== val);
    return make({
      section, skill: "Trigonometry",
      q: `In a right triangle, the side opposite angle A is ${opp}, the adjacent side is ${adj} and the hypotenuse is ${hyp}. What is the ${fn} of A?`,
      correct: val,
      wrong: wrongs.slice(0, 3),
      why: `SOH CAH TOA: ${fn} is ${fn === "sine" ? "opposite over hypotenuse" : fn === "cosine" ? "adjacent over hypotenuse" : "opposite over adjacent"}, so ${val}.`,
    });
  },

  systemElim: (section) => {
    const x = ri(1, 8), y = ri(1, 8);
    const a = ri(2, 5), b = ri(2, 5);
    return make({
      section, skill: "Algebra",
      q: `If ${a}x + ${b}y = ${a * x + b * y} and x minus y = ${x - y}, what is the value of x?`,
      correct: String(x),
      wrong: distinct(String(x), [String(y), String(x + y), String(x - y)], 3),
      why: `From the second equation x = y + ${x - y}. Substituting gives ${a + b}y = ${a * x + b * y - a * (x - y)}, so y = ${y} and x = ${x}. Answer ${y} is the other variable.`,
    });
  },
};

const MATH_KEYS = Object.keys(MATH);

// Draws n maths questions, cycling templates so the same type never appears
// twice in a row and the numbers differ every time.
function mathSet(section, n) {
  const out = [];
  const seen = new Set();
  let order = shuffled(MATH_KEYS);
  let k = 0;
  let guard = 0;
  while (out.length < n && guard++ < n * 40) {
    if (k >= order.length) { order = shuffled(MATH_KEYS); k = 0; }
    const item = MATH[order[k++]](section);
    if (seen.has(item.q)) continue; // same template, same numbers: draw again
    seen.add(item.q);
    out.push(item);
  }
  return out;
}

/* ---------- vocabulary and verbal ---------- */

const SYNONYMS = [
  ["TACITURN", "reserved", ["talkative", "cheerful", "clumsy"]],
  ["MITIGATE", "lessen", ["worsen", "postpone", "explain"]],
  ["PRUDENT", "cautious", ["reckless", "generous", "hostile"]],
  ["ABRIDGE", "shorten", ["lengthen", "publish", "translate"]],
  ["CANDID", "frank", ["secretive", "gentle", "hesitant"]],
  ["LETHARGIC", "sluggish", ["energetic", "furious", "graceful"]],
  ["OBSOLETE", "outdated", ["essential", "expensive", "fragile"]],
  ["PLACATE", "soothe", ["provoke", "abandon", "praise"]],
  ["FRUGAL", "thrifty", ["wasteful", "wealthy", "hungry"]],
  ["AMBIGUOUS", "unclear", ["precise", "lengthy", "dishonest"]],
  ["DILIGENT", "hardworking", ["lazy", "clever", "friendly"]],
  ["SCARCE", "rare", ["plentiful", "costly", "hidden"]],
  ["VERBOSE", "wordy", ["concise", "loud", "confused"]],
  ["RESILIENT", "tough", ["fragile", "flexible", "stubborn"]],
  ["NOVICE", "beginner", ["expert", "teacher", "rival"]],
  ["ARDUOUS", "difficult", ["simple", "lengthy", "unpleasant"]],
  ["BENEVOLENT", "kind", ["cruel", "wealthy", "cautious"]],
  ["CONCUR", "agree", ["object", "consider", "delay"]],
  ["DETER", "discourage", ["encourage", "detect", "delay"]],
  ["ELUSIVE", "hard to catch", ["obvious", "expensive", "graceful"]],
  ["FUTILE", "pointless", ["effective", "hopeful", "brief"]],
  ["GREGARIOUS", "sociable", ["shy", "greedy", "serious"]],
  ["HAMPER", "hinder", ["assist", "carry", "repair"]],
  ["IMPARTIAL", "unbiased", ["prejudiced", "uninterested", "unclear"]],
  ["LUCID", "clear", ["muddled", "bright", "lucky"]],
  ["MEAGRE", "scanty", ["generous", "average", "measured"]],
  ["OBSTINATE", "stubborn", ["obedient", "obvious", "anxious"]],
  ["PERIL", "danger", ["safety", "journey", "delay"]],
  ["RETICENT", "reluctant to speak", ["outspoken", "resentful", "recent"]],
  ["SUPERFLUOUS", "unnecessary", ["essential", "excellent", "superior"]],
  ["TENACIOUS", "persistent", ["yielding", "delicate", "tense"]],
  ["VINDICATE", "clear of blame", ["accuse", "revenge", "confirm"]],
  ["WANE", "decline", ["grow", "wander", "wait"]],
  ["ZEALOUS", "enthusiastic", ["indifferent", "jealous", "careful"]],
  ["AUSTERE", "severely plain", ["ornate", "eastern", "generous"]],
  ["COPIOUS", "abundant", ["sparse", "copied", "helpful"]],
  ["DEFER", "postpone", ["differ", "refuse", "hurry"]],
  ["INDIGENT", "poor", ["angry", "native", "lazy"]],
  ["PARTISAN", "one sided", ["neutral", "partial payment", "separated"]],
  ["QUELL", "suppress", ["encourage", "question", "quicken"]],
];

const ANALOGIES = [
  ["Drought is to rainfall as famine is to", "food", ["hunger", "farming", "poverty"], "A drought is a shortage of rainfall, so a famine is a shortage of food. Hunger is the consequence, not the thing lacking."],
  ["Chapter is to novel as movement is to", "symphony", ["dance", "motion", "orchestra"], "A chapter is a named division of a novel; a movement is a named division of a symphony."],
  ["Sculptor is to marble as poet is to", "words", ["poem", "reader", "emotion"], "The first is the maker and the second the raw material worked on."],
  ["Whisper is to speak as trudge is to", "walk", ["run", "tired", "path"], "The first is a subdued version of the second. A trudge is a laboured walk."],
  ["Thermometer is to temperature as barometer is to", "pressure", ["weather", "altitude", "humidity"], "Each instrument measures one specific quantity."],
  ["Cub is to bear as fawn is to", "deer", ["forest", "spot", "hunter"], "The first is the young of the second."],
  ["Library is to book as gallery is to", "painting", ["artist", "wall", "visitor"], "The first houses collections of the second."],
  ["Parched is to thirsty as famished is to", "hungry", ["full", "food", "weak"], "Both pairs move from an extreme term to its ordinary form."],
  ["Pilot is to cockpit as conductor is to", "podium", ["orchestra", "baton", "music"], "The second is where the first stands to do the job."],
  ["Novice is to expert as sapling is to", "tree", ["seed", "leaf", "forest"], "Each pair runs from an early stage to a mature one."],
  ["Vaccine is to disease as dam is to", "flood", ["river", "water", "power"], "Each is a barrier that prevents a specific harm."],
  ["Feline is to cat as canine is to", "dog", ["tooth", "wolf", "bark"], "The first is the adjective for the animal named second."],
  ["Bouquet is to flowers as flock is to", "birds", ["shepherd", "wool", "field"], "Each is a collective term for the thing that follows."],
  ["Glacier is to ice as dune is to", "sand", ["desert", "wind", "camel"], "Each landform is a mass of the material named."],
  ["Editor is to manuscript as chef is to", "ingredients", ["restaurant", "meal", "menu"], "Each works on the raw material named to produce a finished thing."],
  ["Obscure is to clarify as tangle is to", "unravel", ["knot", "confuse", "rope"], "Each pair is an action and its undoing."],
  ["Second is to hour as centimetre is to", "kilometre", ["ruler", "length", "metre"], "Each pair is a small unit and a far larger one of the same kind."],
  ["Applause is to approval as boos are to", "disapproval", ["theatre", "noise", "crowd"], "Each sound expresses the attitude named."],
  ["Archipelago is to islands as constellation is to", "stars", ["sky", "telescope", "night"], "Each is a named group of the things that follow."],
  ["Miser is to money as glutton is to", "food", ["weight", "greed", "feast"], "Each names a person defined by excess regarding the thing named."],
  ["Blueprint is to building as score is to", "symphony", ["musician", "sound", "concert"], "Each is the written plan from which the finished work is made."],
  ["Prologue is to play as preamble is to", "constitution", ["speech", "actor", "ending"], "Each is the introductory section of the document or work named."],
  ["Nomad is to settle as recluse is to", "socialise", ["hide", "travel", "wander"], "Each pair names a person and the behaviour they characteristically avoid."],
  ["Kiln is to pottery as forge is to", "metal", ["fire", "hammer", "blacksmith"], "Each is the heated place where the named material is worked."],
  ["Drizzle is to downpour as breeze is to", "gale", ["air", "cool", "weather"], "Each pair runs from a mild form to an intense one."],
  ["Perjury is to oath as plagiarism is to", "authorship", ["book", "student", "writing"], "Each is a violation of the obligation named."],
  ["Cartographer is to map as lexicographer is to", "dictionary", ["word", "language", "library"], "Each maker is paired with what they produce."],
  ["Scalpel is to surgeon as chisel is to", "sculptor", ["stone", "hammer", "workshop"], "Each tool is paired with the specialist who uses it."],
  ["Hive is to bee as warren is to", "rabbit", ["hole", "field", "fox"], "Each is the built dwelling of the animal named."],
  ["Sceptical is to believe as reluctant is to", "act", ["refuse", "hesitate", "doubt"], "Each pair names a disposition and what it holds you back from doing."],
];

// The SSAT offers five answer choices, so a fifth distractor is drawn from a
// pool of concrete, unrelated words that cannot be read as a near synonym.
const FILLER = [
  "harbour", "velocity", "porcelain", "trellis", "almanac", "meridian",
  "quarry", "lantern", "thicket", "granite", "satchel", "estuary",
  "cobbler", "plateau", "vellum", "cistern",
];

function fifth(taken) {
  return shuffled(FILLER).find((f) => !taken.includes(f)) || "aqueduct";
}

function synonymSet(section, n) {
  return shuffled(SYNONYMS).slice(0, n).map(([word, correct, wrong]) => {
    const opts = [...wrong, fifth([correct, ...wrong])];
    return make({
      section, skill: "Synonyms", q: word, correct, wrong: opts,
      why: `${word[0] + word.slice(1).toLowerCase()} means ${correct}. The opposite is usually offered as a distractor, which is what catches people reading too fast.`,
    });
  });
}

function analogySet(section, n) {
  return shuffled(ANALOGIES).slice(0, n).map(([q, correct, wrong, why]) =>
    make({ section, skill: "Analogies", q, correct, wrong: [...wrong, fifth([correct, ...wrong])], why }));
}

/* ---------- grammar and usage ---------- */

const GRAMMAR = [
  ["The volunteers, who were all people that had given their time freely without pay, assembled at dawn.", "DELETE the underlined portion.", ["NO CHANGE", "who were all unpaid people giving time freely,", "who were unpaid,"], "Conciseness", "Volunteer already means someone unpaid who gives time freely, so the phrase adds nothing. If a phrase is pure repetition, deleting it is right."],
  ["Rusting quietly in the barn for forty years, the farmer finally sold the tractor.", "the tractor was finally sold by the farmer.", ["NO CHANGE", "the farmer had finally sold the tractor.", "selling the tractor was what the farmer did."], "Modifiers", "The opening phrase describes the tractor, so the tractor must be the subject that follows. As written, the farmer is rusting in the barn."],
  ["She had three reasons for refusing the offer ______ the salary, the commute, and the manager.", ":", [";", ",", "and"], "Punctuation", "A complete clause introduces a list that explains it, which is exactly what a colon does."],
  ["Neither the students nor the teacher ______ ready for the inspection.", "was", ["were", "have been", "are"], "Agreement", "With neither, nor the verb agrees with the nearer subject, and teacher is singular."],
  ["The report, along with its three appendices, ______ due on Friday.", "is", ["are", "were", "have been"], "Agreement", "Along with is not and. The subject is report, which is singular, so the interrupting phrase changes nothing."],
  ["Between you and ______, the plan was doomed from the start.", "me", ["I", "myself", "mine"], "Pronoun case", "After a preposition you need the object form. Between you and I is a common overcorrection."],
  ["The committee released ______ findings on Tuesday.", "its", ["it's", "their", "its'"], "Pronouns", "Committee is a singular collective noun here, and its is the possessive. It's always means it is."],
  ["Having finished the experiment, ______", "the researchers recorded their results.", ["the results were recorded.", "recording the results happened next.", "it was time for recording results."], "Modifiers", "The introductory phrase needs the people who finished the experiment as the subject."],
  ["The novel was praised for its vivid imagery ______ criticised for its ending.", "but", ["and", "so", "because"], "Transitions", "Praised and criticised are opposed, so the connector must signal contrast."],
  ["By the time the rescue team arrived, the climbers ______ for eleven hours.", "had been waiting", ["waited", "have waited", "are waiting"], "Verb tense", "One past action completed before another past action takes the past perfect."],
  ["The data ______ that the treatment shortens recovery time.", "suggest", ["suggests", "is suggesting", "have suggested"], "Agreement", "In formal and scientific writing data is treated as a plural, so it takes suggest."],
  ["He was more interested in the process ______ the result.", "than in", ["then in", "than", "rather"], "Idiom", "The comparison is more interested in X than in Y, and than is the comparison word, not then."],
  ["The professor asked the students to read the chapter, to take notes, and ______", "to summarise the argument.", ["summarising the argument.", "that they summarise the argument.", "a summary of the argument."], "Parallelism", "A list must keep the same grammatical form throughout, and the first two items are infinitives."],
  ["______ the storm warning, the ferry left port on schedule.", "Despite", ["Because of", "Owing to", "According to"], "Transitions", "Leaving in spite of a warning is a contrast, so the concessive preposition is needed."],
  ["The building, ______ was completed in 1897, still houses the original press.", "which", ["that", "who", "whose"], "Relative clauses", "A non essential clause set off by commas takes which, never that."],
  ["Each of the applicants ______ submitted a portfolio.", "has", ["have", "were", "are"], "Agreement", "Each is singular no matter what follows it, so the verb is singular."],
  ["The results were surprising ______ nobody had predicted such a sharp decline.", ";", [",", ":", "and,"], "Punctuation", "Two complete clauses joined without a conjunction need a semicolon. A comma alone is a splice."],
  ["She spoke ______ than her opponent, and the audience noticed.", "more persuasively", ["more persuasive", "most persuasively", "persuasiver"], "Adverbs", "The word modifies the verb spoke, so it takes the adverb form, and comparing two takes more rather than most."],
  ["The reason the launch was delayed ______ the weather.", "was", ["is because of", "was because of", "being"], "Redundancy", "The reason was because is redundant. Reason and because both do the same work."],
  ["Fewer than twenty applicants applied, and ______ money was raised than last year.", "less", ["fewer", "lesser", "least"], "Usage", "Fewer counts separate items, less measures an uncountable quantity, and money is uncountable."],
  ["The scientists ______ the samples for a decade before publishing a single word about them.", "had studied", ["study", "have studied", "were studying"], "Verb tense", "The studying finished before the publishing, and both are in the past, so the earlier action takes the past perfect."],
  ["Of the two candidates, she was clearly the ______", "better qualified.", ["best qualified.", "more better qualified.", "most qualified."], "Comparatives", "Comparing exactly two things takes the comparative, not the superlative."],
  ["The exhibition included works by Kahlo, Rivera ______ and several lesser known muralists.", ",", ["", ";", ":"], "Punctuation", "Items in a list are separated by commas, and the serial comma before and is standard here."],
  ["Neither of the proposals ______ the budget committee's requirements.", "meets", ["meet", "are meeting", "have met"], "Agreement", "Neither is singular, so it takes a singular verb regardless of the plural noun after of."],
  ["Walking through the ruins, ______", "we could hear the wind in the columns.", ["the wind could be heard in the columns.", "the columns echoed with wind.", "there was wind in the columns."], "Modifiers", "The people doing the walking must be the subject of the main clause."],
  ["The curator explained that the vase was older ______ any other object in the room.", "than", ["then", "as", "from"], "Usage", "Than makes comparisons; then refers to time. This is one of the most common errors tested."],
  ["The team celebrated ______ victory long into the night.", "its", ["it's", "their's", "its'"], "Pronouns", "Team is singular here and its is the possessive form. Its' is never a word."],
  ["______ the road was closed, we arrived on time.", "Although", ["Because", "Since", "So"], "Transitions", "Arriving on time in spite of a closure is a contrast, so a concessive conjunction is needed."],
  ["The chemist recorded the temperature, the pressure, and ______", "the reaction time.", ["how long the reaction took.", "timing the reaction.", "that the reaction was timed."], "Parallelism", "The first two items are noun phrases, so the third must be one too."],
  ["There ______ several reasons for the delay, none of them convincing.", "were", ["was", "is", "has been"], "Agreement", "In there is or there are, the verb agrees with what follows, and reasons is plural."],
  ["The witness could not recall ______ he had seen the car before or after midnight.", "whether", ["if", "that", "weather"], "Usage", "Whether introduces alternatives, and the sentence sets up two of them."],
  ["Anyone who wants a ticket should collect ______ from the office.", "it", ["them", "these", "their"], "Pronouns", "Anyone and a ticket are both singular, so the pronoun referring to the ticket is singular."],
  ["The lecture was interesting ______ far too long for a Friday afternoon.", "but", ["and", "or", "for"], "Transitions", "Interesting and too long pull in opposite directions, so the connector is contrastive."],
  ["Having been warned about the currents ______ the swimmers stayed close to shore.", ",", [";", ":", ""], "Punctuation", "An introductory participial phrase is separated from the main clause by a comma."],
  ["The findings ______ published last spring, though the study began in 2019.", "were", ["was", "is", "has been"], "Agreement", "Findings is plural, and the interrupting clause does not change that."],
  ["She is one of those editors who ______ every sentence aloud.", "read", ["reads", "is reading", "has read"], "Agreement", "The relative clause describes editors, which is plural, so the verb is plural."],
  ["The path ______ along the cliff was closed after the landslide.", "running", ["ran", "runs", "which running"], "Modifiers", "A participial phrase modifying path needs the participle form, not a finite verb."],
  ["We had hoped to finish by June ______ the permits arrived three months late.", ", but", [", ", "; but", " but"], "Punctuation", "Two independent clauses joined by but take a comma before the conjunction."],
  ["The principle applies ______ to public and private institutions.", "equally", ["equal", "more equally", "equalling"], "Adverbs", "The word modifies the verb applies, so it takes the adverb form."],
  ["The archive holds letters ______ to the eighteenth century.", "dating back", ["dated back", "which dating back", "date back"], "Verb forms", "A reduced relative clause modifying letters takes the present participle."],
  ["Not only did the bridge come in under budget ______ it opened four months early.", ", but", [", and", "; and", ", so"], "Idiom", "Not only pairs with but also. The correlative must be completed with but."],
  ["The professor, together with two graduate students, ______ leading the excavation.", "is", ["are", "were", "have been"], "Agreement", "Together with is not and, so the subject stays singular."],
  ["Each of the three drafts ______ a different ending.", "has", ["have", "are having", "were having"], "Agreement", "Each is always singular, whatever plural noun follows it."],
  ["The reason for the recall ______ a faulty sensor.", "was", ["was because of", "is because", "being"], "Redundancy", "The reason was because doubles up, since reason already carries the causal sense."],
  ["We interviewed the engineer ______ designed the cooling system.", "who", ["which", "whom", "whose"], "Relative clauses", "The pronoun is the subject of designed, so it takes the subject form who."],
  ["The samples, ______ had been stored improperly, gave inconsistent readings.", "which", ["that", "who", "what"], "Relative clauses", "A non essential clause between commas takes which."],
  ["He ran ______ than anyone else in the field that season.", "faster", ["more fast", "fastest", "more faster"], "Comparatives", "Short adverbs form the comparative with er, and doubling with more is never correct."],
  ["The council voted to ______ the proposal until the next session.", "defer", ["differ", "deter", "confer"], "Word choice", "To defer is to postpone. Differ means to be unlike, and deter means to discourage."],
  ["Fewer commuters ______ the new line than the operator had forecast.", "use", ["uses", "using", "is using"], "Agreement", "Commuters is plural, so the verb is plural."],
  ["The design is elegant ______ it is also, unfortunately, impossible to manufacture.", ";", [",", ":", "and,"], "Punctuation", "Two full clauses with no conjunction need a semicolon, or a full stop."],
];

// Authored items are drawn without replacement, so a paper never repeats one.
// If the paper is longer than the pool, it is capped and the caller reports
// the short form rather than padding it out with duplicates.
function grammarSet(section, n) {
  return shuffled(GRAMMAR).slice(0, n).map(([passage, correct, wrong, skill, why]) =>
    make({ section, skill, passage, q: "Which choice is best?", correct, wrong, why }));
}

/* ---------- words in context ---------- */

const CONTEXT = [
  ["Although the committee had spent months gathering testimony, its final report was notably ______: it ran to just four pages and offered no recommendations.", "perfunctory", ["exhaustive", "contentious", "eloquent"], "The colon explains the blank: four pages, no recommendations. Perfunctory means done with minimum effort."],
  ["The negotiator's ______ tone did more to settle the room than any of the concessions she offered.", "conciliatory", ["strident", "indifferent", "evasive"], "Something that settles a room is calming, and conciliatory means intended to placate."],
  ["Far from being ______, the author's late style is dense with allusion and demands a patient reader.", "accessible", ["obscure", "elegant", "brief"], "Far from signals the opposite of what follows: dense and demanding is the opposite of accessible."],
  ["The fossil record for the period is so ______ that palaeontologists disagree even about which continents the species inhabited.", "fragmentary", ["comprehensive", "recent", "controversial"], "Disagreement about basic facts implies the evidence is incomplete."],
  ["Her results were widely cited, yet the methods section was ______ enough that no other laboratory managed to repeat the experiment.", "vague", ["rigorous", "lengthy", "original"], "Yet marks a contrast with widely cited, and nobody could replicate it, so the method was unclear."],
  ["The senator's speech was praised as ______, since it addressed the objections of both parties without conceding either position.", "adroit", ["clumsy", "partisan", "tedious"], "Managing both sides without conceding is skilful, and adroit means skilful."],
  ["Critics initially dismissed the technique as a ______, but four decades later it remains standard practice.", "fad", ["breakthrough", "necessity", "compromise"], "But signals contrast with lasting forty years, so the dismissal was that it would not last."],
  ["The island's isolation makes its bird populations unusually ______ to introduced predators.", "vulnerable", ["resistant", "indifferent", "attractive"], "Isolated island species evolved without such predators, so they are defenceless against them."],
  ["Rather than ______ the disagreement, the chair's intervention seemed only to sharpen it.", "resolving", ["prolonging", "ignoring", "revealing"], "Rather than sets up the opposite of sharpening, which is resolving."],
  ["The manuscript's marginal notes are so ______ that scholars have reconstructed the author's entire reading list from them.", "copious", ["sparse", "illegible", "recent"], "You could only reconstruct a whole reading list from abundant notes."],
  ["Though the process is ______, the equipment required is simple enough for a school laboratory.", "laborious", ["instantaneous", "expensive", "dangerous"], "Though sets a contrast with simple equipment, and the contrast is about effort, not cost."],
  ["The general's reputation for ______ meant his soldiers were rarely surprised by his orders.", "consistency", ["caprice", "cruelty", "brilliance"], "Not being surprised follows from predictability, which is consistency."],
  ["Early reviewers found the symphony ______, complaining that its themes returned too often and too plainly.", "repetitive", ["intricate", "innovative", "restrained"], "Themes returning too often is the definition of repetitive."],
  ["The treaty was ______ from the outset, as neither side had the means to enforce a single one of its provisions.", "toothless", ["binding", "controversial", "elaborate"], "Unenforceable is precisely what toothless means in this context."],
  ["The proposal was rejected not because it was flawed but because it was ______: three other departments had submitted almost the same plan.", "redundant", ["expensive", "premature", "ambitious"], "The colon explains the blank: three near identical plans already exist, so this one duplicates them."],
  ["Once ______ across the whole continent, the species now survives in two river valleys.", "ubiquitous", ["endangered", "invisible", "migratory"], "Once contrasts the past with a present of two valleys, so the past state was being everywhere."],
  ["The letters reveal a man far more ______ than his public speeches ever suggested, full of doubt and second thoughts.", "irresolute", ["confident", "articulate", "generous"], "Doubt and second thoughts after full of define the blank directly."],
  ["Her argument is ______, moving from a single observation to a conclusion about all mammals without any intermediate evidence.", "overreaching", ["cautious", "conventional", "technical"], "Jumping from one observation to all mammals with nothing between is exactly overreaching."],
  ["The restoration was deliberately ______: the team replaced only what had failed and left every original surface visible.", "restrained", ["thorough", "expensive", "hurried"], "Replacing only what failed is the definition of a restrained approach."],
  ["Reviewers called the performance ______, praising the way each phrase seemed weighed before it was played.", "deliberate", ["frantic", "careless", "loud"], "Weighing each phrase before playing it is deliberateness."],
  ["The policy proved ______ in practice, producing exactly the shortages it had been designed to prevent.", "counterproductive", ["effective", "expensive", "popular"], "Producing the opposite of the intended effect is what counterproductive names."],
  ["Because the instrument is so ______, a passing lorry is enough to spoil a night's readings.", "sensitive", ["durable", "outdated", "portable"], "A passing lorry ruining readings shows extreme responsiveness to disturbance."],
  ["The essay is ______ rather than original, assembling other people's arguments into a readable summary.", "derivative", ["provocative", "obscure", "concise"], "Assembling other people's arguments is derivative, which the sentence explicitly opposes to original."],
  ["Colleagues described him as ______, a man who answered questions he had not been asked and volunteered opinions nobody wanted.", "garrulous", ["taciturn", "diligent", "modest"], "Talking well beyond what is asked is garrulousness."],
  ["The evidence for the earlier date remains ______, resting entirely on a single disputed inscription.", "tenuous", ["overwhelming", "recent", "expensive"], "Resting on one disputed item makes the evidence thin, which is what tenuous means."],
  ["The new regulations were ______ enough that firms simply reorganised on paper and carried on as before.", "lax", ["stringent", "detailed", "costly"], "Rules that can be dodged with a paper reorganisation are loose ones."],
  ["What began as a ______ disagreement about footnotes grew into a decade long feud between the two departments.", "trivial", ["bitter", "public", "scholarly"], "The contrast with a decade long feud requires the beginning to be small."],
  ["The witness's account was ______: every detail she gave was later confirmed by three independent records.", "corroborated", ["disputed", "lengthy", "reluctant"], "Confirmation by independent records is corroboration."],
  ["Rather than ______ his critics, the composer set their harshest phrases to music and performed it.", "rebutting", ["amusing", "quoting", "ignoring"], "Rather than sets up the opposite of what he did, and the natural expectation is that he would argue back."],
  ["The mechanism is ______, which is why it has survived in watches for three hundred years with almost no modification.", "robust", ["delicate", "modern", "decorative"], "Surviving three centuries unchanged points to durability."],
];

function contextSet(section, n) {
  return shuffled(CONTEXT).slice(0, n).map(([passage, correct, wrong, why]) =>
    make({
      section, skill: "Words in context", passage,
      q: "Which choice completes the text with the most logical and precise word?",
      correct, wrong, why,
    }));
}

/* ---------- the section builders ---------- */

export const POOL = {
  grammar: GRAMMAR.length,
  context: CONTEXT.length,
  synonyms: SYNONYMS.length,
  analogies: ANALOGIES.length,
  rw: GRAMMAR.length + CONTEXT.length,
  verbal: SYNONYMS.length + ANALOGIES.length,
  maths: Infinity, // generated, so there is no ceiling
};

export const BUILDERS = {
  satRW: (n) => shuffled([...contextSet("Reading and Writing", Math.ceil(n * 0.55)), ...grammarSet("Reading and Writing", Math.floor(n * 0.45))]).slice(0, n),
  satMath: (n) => mathSet("Math", n),
  actEnglish: (n) => grammarSet("English", n),
  actMath: (n) => mathSet("Mathematics", n),
  ssatVerbal: (n) => shuffled([...synonymSet("Verbal", Math.ceil(n / 2)), ...analogySet("Verbal", Math.floor(n / 2))]),
  ssatQuant: (n) => mathSet("Quantitative", n),
};
