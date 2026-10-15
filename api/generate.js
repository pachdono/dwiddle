// Turns a block of notes into everything the app needs: topics, questions
// with their explanations already written, and a study sheet with the
// important passages marked.
//
// From notes, this happens in parts rather than in one pass. A whole chapter
// yields up to eight topics and twenty six questions, and one call writing all
// of that does not finish inside the time a function is allowed; it was
// measured timing out at exactly sixty seconds. So the app asks for a plan of
// the topics first, then the questions for a few topics at a time and the
// sheet, all at once, and puts the pieces together itself. Each part is small
// enough to finish comfortably, and running them side by side is faster than
// the single call ever was.
//
// A single syllabus topic is small, and still goes through in one call.

import { ask, safeParse, guard, fail, userError, MAX_INPUT } from "./_llm.js";
import { allow } from "./_guard.js";

// Generating takes real time on a 70B model, and the platform default cuts a
// function off long before it finishes.
export const config = { maxDuration: 60 };

const SYSTEM = `You build study material from a student's own notes.

Write mathematics the way it is printed on an exam paper, not the way it is
typed. Use real symbols: x², 10⁻⁴, H₂O, √49, π, ×, ÷, ≤, ≥, ≠, ±, °, →.
Never write a caret, so x^2 is wrong. Never spell an operation out as a word
where a symbol exists, so "x squared" is wrong.

Return ONE JSON object and nothing else. No prose, no code fences.

Shape:
{
  "title": "short name for this material",
  "topics": [
    { "name": "topic name", "reason": "one sentence on why it needs work, written to the student", "questions": 6 }
  ],
  "questions": [
    {
      "topic": "must match a topic name exactly",
      "kind": "vocab" | "concept" | "process",
      "q": "the complete question, exactly as it would be printed on an exam paper",
      "term": "only when kind is vocab: the bare term being defined",
      "choices": ["four options"],
      "answer": 0,
      "why": "two sentences: why the right answer is right, and why the most tempting wrong one is wrong"
    }
  ],
  "sheet": {
    "title": "sheet title",
    "big": [[{ "t": "plain text" }, { "t": "important span", "mark": "key" }]],
    "terms": [{ "t": "term", "d": [{ "t": "definition, " }, { "t": "the critical part", "mark": "def" }] }],
    "watch": [[{ "t": "a mistake students make, " }, { "t": "the trap itself", "mark": "exam" }]]
  }
}

Rules:
- Cover every distinct area the notes deal with, one topic per area: 3 for a short page, up to 8 for a whole chapter. Never merge unrelated areas to keep the count down, and never leave an area of the notes out.
- Only count the study content. Greetings, introductions about the speaker or channel, adverts and sponsors, requests to like or subscribe, course admin, homework reminders, page headers and footers, reference lists, and chat or stories that do not teach the subject are not topics and must not appear in any topic.
- 3 questions per topic, 4 where a topic is large, and no more than 26 in total. 4 choices each, "answer" is the index of the correct one.
- Every "q" is a full question a student could answer without guessing what is being asked. For a vocab question write "What is meant by the term demand curve?" or "Define opportunity cost.", never the bare term on its own.
- Only use what is in the notes. Never invent facts that are not there.
- "why" must teach something, not restate the answer. Two sentences, no more.
- Mark types: "def" for wording to learn verbatim, "key" for a fact to memorise, "exam" for where marks are lost.
- Sheet size: __SHEET_SIZE__.
- Each line in "big" and "watch" is an array of segments. Segments without "mark" are plain text. Concatenated, the segments must read as one natural sentence.
- Write in British English. Do not use em dashes or en dashes.`;

// Working from a syllabus topic rather than pasted notes. The rule about using
// only what is in the notes has to be lifted, since there are none, and
// replaced with the course as the boundary instead.
const SYLLABUS_RULES = `
- The material must match what that course actually examines at that level, in
  its usual style and difficulty. Do not go beyond the syllabus.
- Break the topic into 3 or 4 sub topics and use those as the topic names.`;

// ---------- the parts, for notes ----------

const MATHS = `Write mathematics the way it is printed on an exam paper, not the way it is
typed. Use real symbols: x², 10⁻⁴, H₂O, √49, π, ×, ÷, ≤, ≥, ≠, ±, °, →.
Never write a caret, so x^2 is wrong.`;

const STYLE = `- Write in British English. Do not use em dashes or en dashes.
- Only use what is in the notes. Never invent facts that are not there.`;

const PLAN = `You divide a student's notes into the topics they cover.

Return ONE JSON object and nothing else. No prose, no code fences.

Shape:
{
  "title": "short name for this material",
  "topics": [
    { "name": "topic name", "reason": "one sentence on what this topic is about, written to the student", "large": false }
  ]
}

Rules:
- Cover every distinct area the notes deal with, one topic per area: 3 for a short page, up to 8 for a whole chapter.
- Never merge unrelated areas to keep the count down, and never leave an area of the notes out.
- Only count the study content. Greetings, introductions about the speaker or channel, adverts and sponsors, requests to like or subscribe, course admin, homework reminders, page headers and footers, reference lists, and chat or stories that do not teach the subject are not topics and must not appear in any topic.
- Order the topics as the notes do.
- "large" is true when the notes say a lot about that topic.
${STYLE}`;

const VERIFY = `You are a strict subject expert checking multiple choice questions for factual errors before students see them.

Return ONE JSON object and nothing else:
{ "checks": [ { "n": 1, "verdict": "ok" | "fix" | "drop", "answer": 0 } ] }
One entry per question, in order. "answer" is the 0 based index of the correct option and is only needed for "fix".

Decide using standard textbook knowledge, and the notes where they cover the point.
- "ok": the marked answer is correct and no other option is also correct.
- "fix": the marked answer is wrong but exactly one other listed option is correct.
- "drop": no listed option is correct, or more than one is, or the question is ambiguous, or it cannot be answered without something the student cannot see.
Be exact: an option that is only partly right, or true of something else, is not correct.`;

async function verifyQuestions(qs, notes) {
  if (!qs.length) return qs;
  try {
    const text = await ask({
      system: VERIFY,
      user: `Notes (may be partial):\n${String(notes).slice(0, 5000)}\n\nQuestions:\n${qs.map((q, i) => `${i + 1}. ${q.q}\n${q.choices.map((c, k) => `   ${"ABCDEF"[k]}) ${c}`).join("\n")}\n   Marked answer: ${"ABCDEF"[q.answer]}`).join("\n\n")}`,
      maxTokens: 700,
      json: true,
      temperature: 0,
    });
    const checks = safeParse(text, "checks")?.checks;
    if (!Array.isArray(checks)) return qs;
    const out = [];
    qs.forEach((q, i) => {
      const c = checks.find((x) => Number(x?.n) === i + 1) || {};
      if (c.verdict === "drop") return;
      if (c.verdict === "fix" && Number.isInteger(c.answer) && c.answer >= 0 && c.answer < q.choices.length && c.answer !== q.answer) { out.push({ ...q, answer: c.answer }); return; }
      out.push(q);
    });
    return out;
  } catch { return qs; } // checking is a bonus; never let it stop questions arriving
}

const QUESTIONS = `You write exam style multiple choice questions from a student's notes.

${MATHS}

Return ONE JSON object and nothing else. No prose, no code fences.

Shape:
{
  "questions": [
    {
      "topic": "must be one of the topic names given, exactly",
      "kind": "vocab" | "concept" | "process",
      "q": "the complete question, exactly as it would be printed on an exam paper",
      "term": "only when kind is vocab: the bare term being defined",
      "choices": ["four options"],
      "answer": 0,
      "why": "two sentences: why the right answer is right, and why the most tempting wrong one is wrong",
      "picture": "optional, only when the question truly needs the student to see something: a plain description of the picture to show, such as a labelled plant cell with the nucleus, chloroplast and vacuole marked"
    }
  ]
}

Rules:
- Use "picture" for at most one question in five, only where seeing it is needed (identify a part, read a diagram). The question must then say what to look at, for example "In the picture, which part makes protein?". Leave it out for everything else.
- Write questions only for the topics you are given, and nothing on any other part of the notes.
- A question that asks for a calculated value must state every number it needs in its own wording, because the student sees only the question and its options. Write units as m/s, m/s², kg/m³.
- Every question must be answerable from the notes alone. Only ask about terms, names, facts, figures and definitions that are written in the notes; never ask about anything the notes do not mention, however closely related. The right answer must be stated in the notes. Wrong options can be other believable terms.
- 3 questions for each topic, 4 when it is marked large.
- 4 choices each; "answer" is the index of the correct one, and it must vary: spread it evenly across 0, 1, 2 and 3, never mostly 0. The wrong options must be believable.
- Every question must stand alone. Never refer to a label the student has not been given, such as "molecule Z", "structure X", "tube B" or "Figure 1": name the real thing (protein, starch, the nucleus) or describe it in the question. Never write "in the notes", "listed in the text", "the diagram above" or anything that points at something the student cannot see. Never repeat or reword an earlier question.
- Every "q" is a full question a student could answer without guessing what is being asked. For a vocab question write "What is meant by the term demand curve?" or "Define opportunity cost.", never the bare term on its own.
- "why" must teach something, not restate the answer. Two sentences, no more.
${STYLE}`;

const VOCAB = `You write vocabulary flashcards for a student preparing for a standardised test.

Return ONE JSON object and nothing else:
{ "words": [ { "word": "a single word, lower case", "meaning": "(part of speech) a short plain meaning" } ] }

Rules:
- Write exactly the number of words asked for, all different, each a single word (no phrases, no proper nouns, no abbreviations).
- Only words whose first letter is in the range asked for.
- The meaning is short and plain, in words easier than the word itself, and starts with the part of speech in brackets, like "(adj) lasting a very short time" or "(verb) to make something less severe".
- Choose words real tests use: words that appear in reading passages, synonym questions and sentence completions, with more than one useful meaning where there is one.
- Spread the words across different subjects and parts of speech instead of listing similar words together.
- Never use semicolons in a meaning. Write in British English. Do not use em dashes or en dashes.`;

const SKILLCHECK = `You build a skill check: a short test that finds out, skill by skill, how well a student knows ONE topic, using their notes.

${MATHS}

Return ONE JSON object and nothing else. No prose, no code fences.

Shape:
{
  "skills": ["short name of a skill", "..."],
  "questions": [
    {
      "skill": "must be one of the skills listed, exactly",
      "q": "the complete question, exactly as it would be printed on an exam paper",
      "choices": ["four options"],
      "answer": 0,
      "why": "two sentences: why the right answer is right, and why the most tempting wrong one is wrong"
    }
  ]
}

Rules:
- First decide the skills. A skill is one thing a student must be able to do or recall to have mastered the topic: define a key term, explain a process, apply a rule, calculate a value, read a graph or table, compare two ideas, spot a common mistake. List every distinct skill the notes really contain, as many as there are (usually 4 to 10), and never pad the list or leave a real one out.
- Then write the questions. You decide how many it takes: at least one for every skill, two for a skill that is large or has several steps, so that together they test every skill. Usually 6 to 18 questions in all, never more than 20.
- Each question tests only its own skill, and the skill must be one a student could fail on its own. Mix easy and harder questions; for the bigger skills include one that applies the idea to a situation instead of asking for the term.
- Every question must be answerable from the notes alone. Only ask about terms, names, facts, figures and definitions that are written in the notes. The right answer must be stated in the notes. Wrong options are believable misunderstandings.
- A question that asks for a calculated value must state every number it needs in its own wording. Write units as m/s, m/s², kg/m³.
- 4 choices each; "answer" is the index of the correct one, and it must vary: spread it evenly across 0, 1, 2 and 3.
- Every question must stand alone. Never refer to a label or figure the student has not been given, and never write "in the notes". Never repeat or reword another question.
${STYLE}`;

const SHEET = `You condense a student's notes onto one page, with the important parts marked.

Return ONE JSON object and nothing else. No prose, no code fences.

Shape:
{
  "sheet": {
    "title": "sheet title",
    "big": [[{ "t": "plain text" }, { "t": "important span", "mark": "key" }]],
    "terms": [{ "t": "term", "d": [{ "t": "definition, " }, { "t": "the critical part", "mark": "def" }] }],
    "watch": [[{ "t": "a mistake students make, " }, { "t": "the trap itself", "mark": "exam" }]]
  }
}

Rules:
- Size: __SHEET_SIZE__.
- Mark types: "def" for wording to learn verbatim, "key" for a fact to memorise, "exam" for where marks are lost.
- Each line in "big" and "watch" is an array of segments. Segments without "mark" are plain text. Concatenated, the segments must read as one natural sentence.
- Cover the whole of the notes, not just the start.
${STYLE}`;

// Full notes, rather than a summary. The one page sheet condensed a whole
// chapter into a dozen lines, so most of what the source said never reached
// the student: a PDF would go in and a fraction of it would come out. These
// are written a few topics at a time, like the questions, with one hard rule:
// nothing in the source may be left out.
// Tables, step diagrams and pictures, for staff and testers while they are
// being tried out.
const RICH_SHAPE = `,
        { "table": { "head": ["", "column", "column"], "rows": [["row label", "cell", "cell"]] } },
        { "flow": { "title": "what the steps are", "steps": ["first", "then", "then"], "cycle": false } },
        { "pic": "the exact title of a Wikipedia article whose picture shows this" },
        { "sketch": { "title": "Distance and time", "x": "Time (s)", "y": "Distance (m)", "lines": [{ "pts": [[0, 0], [2, 4], [4, 4], [6, 10]], "label": "stopped", "smooth": false }] } }`;
const RICH_RULES = `Tables, diagrams and pictures, only where they genuinely help:
- "table" when the source compares two or more things on the same points (for example mitosis and meiosis, or types of market structure). Every row the same length as "head". Short cells, marks allowed. Never a table of one row or one column.
- "flow" for a process, sequence, cycle or chain of cause and effect with 3 to 7 steps: each step a short phrase, in order, with "cycle" true when the last step leads back to the first. Use it instead of a numbered list for these.
- "pic" when a labelled diagram or photo would make the idea clearer and a Wikipedia article for exactly that thing exists, such as "Animal cell", "Nephron", "Carbon cycle" or "Supply and demand". At most one per topic, placed where it is discussed, and never for an abstract idea, a person's opinion or anything the article would not show.
- "sketch" whenever the topic has a standard graph, even if the source never draws it: if the topic is the production possibility curve there must be a PPC, supply and demand gets the S and D curves crossing, distance-time and velocity-time get theirs, and the same for AD/AS, costs and revenue, Lorenz curve, growth and titration curves. It is a hand drawn graph with "x" and "y" axis labels including units, and 1 to 3 "lines", each a few "pts" as [x, y] numbers that really show what the notes say (a straight line for constant speed, flat for stopped, a curve with "smooth": true for changing speed), with a short "label" such as "stopped" or "steady speed". Each line may have "color" (blue, red, green, orange or black). Optional "dots": [{ "at": [x, y], "label": "E" }] mark points, each drawn with dashed guides to both axes and its two values written on the axes (so use plausible round numbers); optional "arrows": [{ "from": [x, y], "to": [x, y], "label": "Growth", "color": "blue" }] show a shift such as an equilibrium. Examples: a PPC is one smooth concave line, pts [[0,10],[3,9],[6,7],[8,4],[9,0]] with x "Good B", y "Good A" and two labelled dots A and B on it; an outward shift is a second, larger curve "PPC2" beside "PPC1" with an arrow, an inward shift a third; supply and demand is a rising line labelled "S" and a falling line labelled "D" crossing at a dot "E", with x "Quantity" and y "Price". Use it instead of "pic" for any graph or chart. At most one per topic, placed where it is discussed. Never put a graph, chart, axis or formula in "pic".
- These add to the notes; the facts in them still come only from the source.
`;
// Compact, note form writing with hard words marked, for staff and testers;
// everyone else gets complete notes reorganised for clarity, as before.
const NOTE_STYLE = `- {word|the word|what it means} around a technical, scientific or hard word, the first time it appears in a topic, with a plain meaning a 14 year old would follow in under 15 words. For example: {word|osmosis|the movement of water across a partially permeable membrane}. Never put | or braces inside the meaning.

How the notes should read:
- Like a top student's revision notes, not a textbook. Short bullet points, one idea each, mostly under 20 words. Note form is fine: drop "it is important to note that" and other filler.
- Mostly "list" blocks under "h" subheadings. A "p" is at most two short sentences, and only for a link between ideas that a list cannot show.
- Every definition goes in a "term" block. Steps of a process go in order in a list.
- Highlight generously: nearly every bullet has at least one {key|...}, {def|...} or {word|...}, but mark the few words that matter, never a whole bullet.
- Mark every technical or hard word with {word|...} the first time it appears in the topic, unless it is the "term" of a term block.
`;
const NOTE_STYLE_TAIL = "- Keep the facts, lose the padding.";
const CLASSIC_TAIL = "- Do not summarise or shorten. Reorganise for clarity instead: put each definition in a \"term\" block, turn anything the source lists into a \"list\", and break long passages up under subheadings.";
const notesPrompt = (rich) => NOTES
  .replace("__RICH_SHAPE__", rich ? RICH_SHAPE : "")
  .replace("__RICH_RULES__", rich ? RICH_RULES : "")
  .replace("__STYLE_RULES__", rich ? NOTE_STYLE : "")
  .replace("__STYLE_TAIL__", rich ? NOTE_STYLE_TAIL : CLASSIC_TAIL);

const NOTES = `You turn a student's source material into complete, well organised study notes.

${MATHS}

Return ONE JSON object and nothing else. No prose, no code fences.

Shape:
{
  "sections": [
    {
      "topic": "must be one of the topic names given, exactly",
      "blocks": [
        { "h": "a subheading within the topic" },
        { "p": "a paragraph" },
        { "list": ["one item", "another item"] },
        { "term": "a key term", "def": "its definition" },
        { "eg": "an example from the source" },
        { "watch": "a common mistake or exam trap" }__RICH_SHAPE__
      ]
    }
  ]
}

Marking, inside any text:
- {def|...} around wording to learn word for word, usually the core of a definition.
- {key|...} around a fact, figure, name or date to memorise.
- {exam|...} around the part of a "watch" block where marks are lost.
__STYLE_RULES__
__RICH_RULES__
Rules:
- Write a section for each topic you are given, in that order, and nothing on any other part of the source.
- Stay strictly on topic. Leave out anything in the source that does not teach these topics: greetings, the speaker's life or channel, adverts and sponsors, requests to like or subscribe, course admin, homework reminders, jokes and tangents, page headers and footers, reference lists. If a point belongs to another topic, it goes there, not here.
- Include every fact, definition, figure, date, name, formula, list item, reason, advantage, disadvantage and example that the source gives for these topics. If the source lists four things, all four appear.
__STYLE_TAIL__
- Keep the source's own wording for definitions, marked with {def|...}.
- Add a "watch" block only where the source makes a common mistake or a distinction clear.
- Never add facts, examples or background that the source does not give.
${STYLE}`;

// Never trust the shape that comes back. Anything malformed is dropped rather
// than allowed into the app, where it would break a quiz halfway through.
// Whether a question is about the notes: a defined term must appear in them,
// and the right answer must share at least one real word with them. A quiz
// asking about things the student never wrote down is worse than a shorter
// quiz.
const WORDS = (t) => String(t || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3);
const STOPS = new Set(["that", "this", "with", "from", "they", "their", "there", "which", "when", "what", "into", "have", "been", "were", "will", "than", "more", "most", "less", "only", "also", "because", "about", "other", "some", "none", "both", "each", "does", "does", "true", "false", "above", "below", "always", "never"]);
export function fromNotes(q, notes) {
  if (!notes) return true;
  const text = " " + WORDS(notes).join(" ") + " ";
  const has = (w) => text.includes(" " + w) ;
  if (q.kind === "vocab" && q.term) return WORDS(q.term).every((w) => has(w.slice(0, Math.max(4, w.length - 2))));
  const key = WORDS(q.choices?.[q.answer]).filter((w) => !STOPS.has(w));
  if (!key.length) return true; // a number or a short word: nothing to check
  return key.some((w) => has(w.slice(0, Math.max(4, w.length - 2))));
}

function cleanQuestions(list, allowed, prefix) {
  return (Array.isArray(list) ? list : [])
    .filter((q) => q && typeof q.q === "string" && Array.isArray(q.choices) && q.choices.length >= 2)
    .filter((q) => !allowed || allowed.includes(String(q.topic)))
    // a question with no valid answer index used to become "A is correct", which
    // taught wrong answers; without a clear answer it is dropped instead
    .filter((q) => Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length)
    .filter((q) => new Set(q.choices.map((c) => String(c).trim().toLowerCase())).size === q.choices.length)
    .map((q, i) => ({
      id: `${prefix}${i}`,
      topic: String(q.topic || allowed?.[0] || "General"),
      kind: ["vocab", "concept", "process"].includes(q.kind) ? q.kind : "concept",
      q: String(q.q),
      ...(q.kind === "vocab" && q.term ? { term: String(q.term) } : {}),
      ...(typeof q.skill === "string" && q.skill ? { skill: q.skill } : {}),
      choices: q.choices.map(String),
      answer: q.answer,
      why: String(q.why || ""),
      ...(typeof q.picture === "string" && q.picture.trim() ? { picture: q.picture.trim().slice(0, 240) } : {}),
    }));
}

// A table the notes can draw: a header and rows of the same width, at most
// six columns and twelve rows, or nothing.
function cleanTable(t) {
  const cells = (r) => (Array.isArray(r) ? r : []).map((c) => String(c ?? "").slice(0, 300));
  const head = cells(t.head).slice(0, 6);
  const width = head.length;
  if (width < 2) return null;
  const rows = (Array.isArray(t.rows) ? t.rows : []).map((r) => {
    const row = cells(r).slice(0, width);
    while (row.length < width) row.push("");
    return row;
  }).filter((r) => r.some((c) => c.trim())).slice(0, 12);
  return rows.length ? { table: { head, rows } } : null;
}

function sheetSize(length) {
  return length > 9000 ? "6 big idea lines, 10 terms and 5 watch out lines"
    : length > 4000 ? "6 big idea lines, 10 terms and 5 watch out lines"
    : "4 big idea lines, 7 terms and 4 watch out lines";
}

const CLARIFY = `A student typed or pasted this into a study app that turns material into notes, lessons and practice questions.

Decide two things and return ONE JSON object, nothing else:
{
  "kind": "notes" or "request",
  "clear": true or false,
  "questions": [
    { "id": "short_id", "q": "a short, friendly question", "options": ["2 to 5 short options"], "multi": true or false }
  ]
}

"kind" is "notes" when it is study material itself (notes, a passage, a chapter, a list of facts), and "request" when it names something the student wants to study, like "photosynthesis" or "IGCSE chemistry paper 2".

"clear" is true whenever good material could be written without guessing. Most inputs are clear. Notes are always clear. A request is clear when the topic is specific and the level is obvious or makes little difference.

Only when a request is genuinely unclear, ask at most 2 questions, most important first:
- which part of a broad subject they mean, with the main parts as options and "multi": true, since several can be chosen together;
- the level, when it changes what should be taught and the student's level is not already given, with options such as "GCSE / IGCSE", "A Level / IB", "University", "Just the basics", and "multi": false.
Options are specific to what they typed, 1 to 5 words each. Never ask about something they already said. Never add "All of the above" or "Other"; the app adds those.
When "clear" is true, "questions" is [].
Write in British English. Do not use em dashes or en dashes.`;

const BRIEF = `You write complete, accurate study notes on a topic a student asked for, at the level they asked for, as a good textbook section would.

Plain text only, no JSON and no markdown symbols. Put each heading on its own line in Title Case. Under each heading write short paragraphs and lists, one item per line starting with a hyphen.

Include every definition a student at that level must know, the key facts and figures, how and why things happen, formulae with what each symbol means, one or two concrete examples per section, and the mistakes students commonly make.
Cover the whole of what was asked, in the order a teacher would teach it, in 5 to 8 sections and about 1,200 to 1,600 words. Stay inside what was asked: when the request names a narrow topic, write about that topic only and never drift into neighbouring topics, history or applications nobody asked for.
First decide which points that level's syllabus lists for this topic, then write about those points only. What each level covers:
- Just the basics: what it is, why it matters, the key words, everyday examples. No equations beyond the simplest.
- GCSE / IGCSE: what happens and why, in plain terms; word and balanced symbol equations; the factors that affect it and how they show on graphs; the standard practical experiments. No molecular mechanisms, biochemical pathways or named intermediates: for photosynthesis that means no thylakoids, stroma, ATP, NADPH, electron transport or Calvin cycle; for respiration, no glycolysis or Krebs cycle.
- A Level / IB: the mechanisms, named stages and intermediates, and quantitative work.
- University: full depth, with the detail and nuance a first or second year course expects.
When no level is given, pitch it at the level the request implies, and at GCSE / IGCSE for a school subject.
Only facts found in a standard textbook at that level. Never state a number, quantity or date unless it is a standard figure you are certain of; leave it out rather than guess. Where exam boards differ, keep to what they share.
Write mathematics with real symbols: x², H₂O, √, π, ×, ÷, ≤, ≥, °.
Write in British English. Do not use em dashes or en dashes.`;

const PODCAST = `You write the script for a short study podcast about a student's own notes, two ducks talking.

DWIDDLE explains. PUDDLE is a curious friend studying the same thing, who asks the questions a student would, gets things slightly wrong now and then so Dwiddle can put them right, and sums up.

Return ONE JSON object and nothing else:
{ "title": "a short episode title", "lines": [ { "who": "DWIDDLE" or "PUDDLE", "text": "one or two spoken sentences" } ] }

Rules:
- Between 24 and 34 lines, about three minutes spoken. Alternate speakers naturally; never three lines in a row from one duck.
- Open with Puddle saying what today's episode is about, in one line.
- Cover every topic in the notes, in their order, explaining the ideas and definitions in plain spoken English with an everyday example where it helps.
- Use only what the notes say. Never add facts, figures or dates that are not in them.
- Written to be heard: short sentences, no lists, no brackets, no symbols that cannot be read aloud. Write numbers and units as they are said.
- End with Dwiddle asking three quick recall questions, Puddle answering each correctly in a few words, and a one line sign off.
- British English. Do not use em dashes or en dashes.`;

const SYLLABUS_NOTES = `You write complete revision notes for one topic of a real exam syllabus, the way an experienced teacher of that exact course would.

Plain text only, no JSON, no markdown symbols. Headings on their own line in Title Case; lists one item per line starting with a hyphen.

Start with a heading "Learning Outcomes", listing in your own words what the current published syllabus for this course and code expects a candidate to be able to do on this topic. Then one section per outcome, teaching it fully: every definition exactly as the mark scheme expects it, key facts, processes step by step, equations and formulae with units, one or two worked or real examples, and the common mistakes examiners report.
Where the course is tiered, mark content that only the higher tier examines at the start of its line, using the board's own word: "(Supplement)" for Cambridge IGCSE, "(Higher)" for GCSE, and "(HL)" for IB. Do not leave that content out.
Finish with a heading "How This Is Examined": the command words used for this topic (such as state, describe, explain, calculate, suggest, evaluate) and what each needs in an answer, and the typical mark scheme points.
Stay strictly inside what this syllabus examines. The level decides the depth:
- IGCSE and GCSE (ages 14 to 16): no content from A Level or IB. In biology, for example, no activation energy, induced fit, enzyme inhibitors, Krebs cycle or light dependent reactions; in chemistry, no entropy, orbitals or equilibrium constants; in physics, no calculus.
- A Level and IB (ages 16 to 18): the full depth those courses examine, and nothing from university.
If you are not sure a point is in this syllabus, leave it out. A point missing costs less than teaching one that is not examined.
Only facts found in a standard textbook for the course; never guess a number or date.
About 1,400 to 2,000 words. Mathematics with real symbols. British English. Do not use em dashes or en dashes.`;

const PAST_PAPER = `You are a senior examiner who writes papers for a real exam board. Write a brand new practice paper in exactly the style of that board's past papers for the given course, subject and syllabus code: the same question structure, command words (state, describe, explain, calculate, suggest, evaluate, compare), mark allocations, level of difficulty and wording. Never copy or reproduce a real past paper question; every question must be new.

Return ONE JSON object and nothing else:
{
  "title": "a short paper title, like Paper 2 style practice: Cells and Enzymes",
  "minutes": whole number of minutes a real candidate would get for these marks,
  "questions": [
    {
      "topic": "which of the requested topics it tests",
      "type": "mcq" or "short" or "long",
      "marks": whole number, 1 for mcq, 1 to 4 for short, 5 to 9 for long,
      "stem": "the question exactly as it would be printed, including any data, table values or a described diagram it relies on, and ending with its command",
      "options": ["A", "B", "C", "D"] for mcq only,
      "answer": index of the correct option for mcq only,
      "scheme": ["one creditworthy mark point per mark, worded like a real mark scheme"],
      "model": "a full marks answer as a top candidate would write it"
    }
  ]
}

Rules:
- Mix the types the way this board's papers do, and build some structured questions that step up in difficulty.
- The marks for a short or long question equal the number of scheme points needed; give extra acceptable alternatives in the scheme where a real one would (write them as "ALLOW ...").
- Stay strictly inside this syllabus and its tier. Only facts from a standard textbook for the course; never invent data you then treat as real.
- Mathematics with real symbols and units. British English. Do not use em dashes or en dashes.`;

const LONG_QUESTIONS = `You write long answer exam questions for students, each worth 3 to 6 marks, with a mark scheme.

Return ONE JSON object and nothing else:
{ "questions": [ { "topic": "exactly one of the topic names given", "q": "the question, with its command word (Explain, Describe, Compare, Evaluate, Suggest why) and the marks in brackets at the end, e.g. (4 marks)", "marks": 4, "scheme": ["one mark point per entry, as an examiner would write it", "..."], "model": "a full marks answer, in the way a good student would write it" } ] }

Rules:
- Use only facts that are in the notes. The question must be answerable from the notes alone and stand alone with everything it needs written in it.
- Prefer a situation, an experiment or a real example over just naming a term. The answer must need linking ideas together, not one word.
- "marks" equals the number of mark points in "scheme" (3 to 6). Each point is one clear creditable idea. Add "ALLOW ..." for a real alternative wording.
- The model answer covers every mark point, in three to six sentences.
- British English. Do not use em dashes or en dashes.`;

const CONDENSE = `You condense study material into a digest that exam questions and lessons will later be written from. Nothing a student could be tested on may be lost.

Rules:
- Keep EVERY distinct term, definition, name, date, number, unit, formula, equation, rule, step of a process, classification, cause and effect, worked example and exam question that is in the material. Do not summarise away detail and do not leave out anything because it seems minor.
- The only things to remove are exact repeats: where the same fact, question or example appears again (including past paper questions that repeat in different words), write it once. Also remove filler, introductions, page headers and footers, slide numbers, references and admin that is not subject knowledge.
- Structure it with a short heading line (starting with "## ") for each topic, then compact lines or bullets under it. Keep the original order. Where there are several files, keep their topics distinct.
- Write maths as plain symbols, units included. Never invent anything that is not in the material.
- Use as much room as the material needs, up to about 9000 characters. British English. Do not use em dashes or en dashes. Output the digest as plain text only.`;

const JUDGE = `You decide whether a student's short typed answer means the same as the expected answer to a question.

Return ONE JSON object and nothing else: { "correct": true } or { "correct": false }

Count it correct when it means the same: spelling mistakes, abbreviations, numbers and ordinals written differently (2nd and second), a synonym or common alternative name, singular or plural, a different word order, or the right answer with harmless extra words.
Count it wrong when it names a different thing, is only part of the answer, is vaguer than the answer so that it would not earn the mark, or would be marked wrong on an exam. Be fair but exact.`;

const MARK_PAPER =`You are an experienced examiner marking a candidate's written answers strictly against the mark scheme.

Return ONE JSON object and nothing else:
{ "results": [ { "awarded": whole number of marks, "feedback": "one or two sentences: which mark points were earned, quoting the answer, and exactly what was missing" } ] }
One result per answer, in the same order.

Rules:
- Award a mark only where the answer clearly makes that mark point, or an ALLOW alternative. Never more than the marks available.
- Be accurate rather than generous, but credit correct science in the candidate's own words.
- An empty or irrelevant answer scores 0.
- British English. Do not use em dashes or en dashes.`;

async function part(req, res, mode, notes) {
  if (mode === "syllabus") {
    const s = req.body?.syllabus || {};
    const course = String(s.course || "").slice(0, 80), subject = String(s.subject || "").slice(0, 80);
    const code = String(s.code || "").slice(0, 20), topic = String(s.topic || "").slice(0, 160);
    if (!course || !subject || !topic) return userError(res, 400, "Which course and topic?");
    const text = await ask({
      system: SYLLABUS_NOTES,
      user: `Course: ${course} ${subject}${code ? ` (syllabus code ${code})` : ""}.${s.level ? `\nLevel: ${String(s.level).slice(0, 80)}.` : ""}\nSyllabus topic: ${topic}.`,
      maxTokens: 3400,
      temperature: 0.25,
    });
    const written = String(text || "").replace(/\s*[\u2013\u2014]\s*/g, ": ").trim();
    if (written.length < 600) return userError(res, 502, "The syllabus notes did not come back complete. Try again.");
    return res.status(200).json({ notes: written });
  }

  if (mode === "podcast") {
    const text = await ask({ system: PODCAST, user: `The notes:\n\n${notes}`, maxTokens: 3200, json: true, temperature: 0.5 });
    const data = safeParse(text, "lines");
    const lines = (Array.isArray(data?.lines) ? data.lines : [])
      .filter((l) => l && typeof l.text === "string" && l.text.trim())
      .map((l) => ({ who: String(l.who).toUpperCase().includes("PUD") ? "puddle" : "dwiddle",
        text: l.text.replace(/\s*[\u2013\u2014]\s*/g, ", ").trim() }))
      .slice(0, 40);
    if (lines.length < 8) return userError(res, 502, "The episode did not come back complete. Try again.");
    return res.status(200).json({ title: String(data.title || "Your notes, talked through"), lines });
  }

  if (mode === "clarify") {
    const text = await ask({ system: CLARIFY, user: notes, maxTokens: 500, json: true, temperature: 0.2 });
    const data = safeParse(text, "kind") || {};
    const kind = data.kind === "request" ? "request" : "notes";
    const questions = data.clear === true || kind === "notes" ? [] :
      (Array.isArray(data.questions) ? data.questions : [])
        .filter((q) => q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length >= 2)
        .slice(0, 2)
        .map((q, i) => ({
          id: String(q.id || `q${i}`).slice(0, 30),
          q: String(q.q).slice(0, 140),
          options: q.options.map((o) => String(o).slice(0, 60)).filter(Boolean).slice(0, 5),
          multi: !!q.multi,
        }));
    return res.status(200).json({ kind, questions });
  }

  if (mode === "brief") {
    const answers = (Array.isArray(req.body?.answers) ? req.body.answers : [])
      .filter((a) => a && a.q && Array.isArray(a.chosen) && a.chosen.length)
      .slice(0, 3)
      .map((a) => `${String(a.q).slice(0, 140)} ${a.chosen.map((c) => String(c).slice(0, 120)).join(", ")}`);
    const text = await ask({
      system: BRIEF,
      user: `What the student asked for: ${notes}${answers.length ? `\n\nWhat they chose when asked:\n${answers.join("\n")}` : ""}`,
      maxTokens: 2800,
      temperature: 0.3,
    });
    const written = String(text || "")
      .replace(/\s*[\u2013\u2014]\s*/g, ": ")
      .replace(/\u2011/g, "-")
      .trim();
    if (written.length < 400) return userError(res, 502, "The notes on that topic did not come back complete. Try again.");
    return res.status(200).json({ notes: written });
  }


  if (mode === "plan") {
    const text = await ask({ system: PLAN, user: `The notes:\n\n${notes}`, maxTokens: 900, json: true, temperature: 0.2 });
    const data = safeParse(text, "topics");
    const topics = (Array.isArray(data?.topics) ? data.topics : [])
      .filter((t) => t && typeof t.name === "string" && t.name.trim())
      .slice(0, 8)
      .map((t, i) => ({
        id: `ait${i}`,
        name: t.name.trim(),
        reason: String(t.reason || "From your notes."),
        large: !!t.large,
      }));
    if (topics.length === 0) return userError(res, 502, "The model could not find the topics in those notes. Try again.");
    return res.status(200).json({ title: String(data.title || "Your material"), topics });
  }

  if (mode === "questions") {
    const topics = (Array.isArray(req.body?.topics) ? req.body.topics : [])
      .filter((t) => t && t.name).slice(0, Array.isArray(req.body?.like) ? 10 : 4)
      .map((t) => ({ name: String(t.name).slice(0, 160), large: !!t.large }));
    if (!topics.length) return userError(res, 400, "Which topics should the questions cover?");
    const names = topics.map((t) => t.name);
    const list = topics.map((t) => `- ${t.name}${t.large ? " (large)" : ""}`).join("\n");
    const style = String(req.body?.style || "").slice(0, 120);
    // More of the same: new questions modelled on ones the student already
    // has, so a longer quiz is not padded with repeats.
    const like = (Array.isArray(req.body?.like) ? req.body.like : []).filter((q) => q && q.q).slice(0, 12)
      .map((q, n) => `${n + 1}. [${String(q.topic || "").slice(0, 120)}] ${String(q.q).slice(0, 400)}${Array.isArray(q.choices) ? `\n   Options: ${q.choices.map((c) => String(c).slice(0, 160)).join(" | ")}` : ""}`);
    const avoid = (Array.isArray(req.body?.avoid) ? req.body.avoid : []).map((t) => String(t).slice(0, 200)).slice(0, 60);
    const count = Math.max(1, Math.min(12, Number(req.body?.count) || like.length || 3));
    // Long answer questions, worth three to six marks, with a mark scheme the
    // answer is then marked against (the markpaper mode below).
    if (req.body?.depth === "long") {
      const n = Math.max(1, Math.min(3, Number(req.body?.count) || 1));
      const text = await ask({
        system: LONG_QUESTIONS,
        user: `Write exactly ${n} long answer question${n === 1 ? "" : "s"} for these topics only:\n${list}${avoid.length ? `\n\nAlready asked, so do NOT ask these or anything that tests the same fact:\n${avoid.map((t) => "- " + t).join("\n")}` : ""}${style ? `\n\nUse the command words and mark values of ${style} exam papers.` : ""}\n\nThe notes:\n\n${notes}`,
        maxTokens: 2600,
        json: true,
        temperature: 0.45,
      });
      const data = safeParse(text, "questions");
      const clean = (v) => String(v || "").replace(/\s*[–—]\s*/g, ", ").trim();
      const stamp = String(req.body?.batch ?? 0).replace(/[^0-9a-z]/gi, "").slice(0, 12);
      const questions = (Array.isArray(data?.questions) ? data.questions : []).map((q, i) => {
        const scheme = (Array.isArray(q?.scheme) ? q.scheme : []).map(clean).filter(Boolean).slice(0, 8);
        const marks = Math.max(2, Math.min(6, Math.round(Number(q?.marks) || scheme.length || 4)));
        return {
          id: `lg${stamp}${i}`, type: "long", topic: names.includes(String(q?.topic)) ? String(q.topic) : names[i % names.length],
          q: clean(q?.q), marks, scheme, answer: clean(q?.model), why: "",
        };
      }).filter((q) => q.q.length > 20 && q.scheme.length >= 2 && q.answer);
      if (!questions.length) return userError(res, 502, "The long answer questions did not come back complete. Try again.");
      return res.status(200).json({ questions });
    }
    const apply = req.body?.depth === "apply";
    const asking = apply
      ? `Write exactly ${count} NEW application questions for these topics only:\n${list}\n\nEach one must be INDIRECT: describe a situation, an observation, an experiment result or a real example, and ask what is happening, why it happens, or which process or idea explains it. NEVER name the answer, its term or its definition in the question. Example: instead of "What is osmosis?" write "Red blood cells placed in a strong salt solution shrink. Why?" with osmosis, as water moving out of the cells, among the answers. The wrong options must be believable misunderstandings. Every question must still be answerable from the notes' facts, and must stand alone with everything it needs written in it.${like.length ? `\n\nQuestions the student has already seen, for the topic and level only:\n${like.join("\n")}` : ""}${avoid.length ? `\n\nAlready asked, so do NOT ask these or anything that tests the same fact:\n${avoid.map((t) => "- " + t).join("\n")}` : ""}`
      : like.length
      ? `Write exactly ${count} NEW questions for these topics only:\n${list}\n\nUse these questions the student has already seen only for the kind and style. Every new question must test a DIFFERENT fact, term, step or idea from the notes than any of them: never reword, reverse or repeat one. Where the topic is maths or calculation, use different numbers and situations instead. The "3 or 4 for each topic" rule does not apply; write ${count} in total.\n\nQuestions to match in style:\n${like.join("\n")}${avoid.length ? `\n\nAlready asked, so do NOT ask these or anything that tests the same fact:\n${avoid.map((t) => "- " + t).join("\n")}` : ""}`
      : `Write ${Number(req.body?.count) > 0 ? `exactly ${count} NEW questions` : "questions"} for these topics only:\n${list}${avoid.length ? `\n\nAlready asked, so do NOT ask these or anything that tests the same fact:\n${avoid.map((t) => "- " + t).join("\n")}` : ""}`;
    const text = await ask({
      system: QUESTIONS,
      user: `${asking}${style ? `\n\nWrite them in the style of ${style} exam papers: its command words, its structure and its difficulty, with the marks a real question like it would carry reflected in how much the answer needs. They must be new questions; never reproduce a real past paper question.` : ""}\n\nThe notes:\n\n${notes}`,
      maxTokens: like.length ? 4200 : 2600,
      json: true,
      temperature: like.length ? 0.6 : 0.3,
    });
    const data = safeParse(text, "questions");
    const prefix = `ai${String(req.body?.batch ?? 0).replace(/[^0-9]/g, "")}q`;
    const all = cleanQuestions(data?.questions, names, prefix);
    // Questions about things the notes never mention are dropped, unless that
    // would leave almost nothing, when the check itself is probably wrong.
    const kept = all.filter((q) => fromNotes(q, notes));
    const questions = (kept.length >= Math.ceil(all.length / 2) ? kept : all).map((q) => (apply ? { ...q, level: "apply" } : q));
    // Every answer is checked once more by a second pass; wrong ones are
    // corrected or dropped. If that pass dropped everything, the originals stand
    // rather than leaving a topic with nothing.
    const checked = await verifyQuestions(questions, notes);
    const finalQs = checked.length ? checked : questions;
    if (finalQs.length === 0) return userError(res, 502, "The model returned no usable questions. Try again.");
    return res.status(200).json({ questions: finalQs });
  }

  if (mode === "vocab") {
    const tier = Math.max(1, Math.min(4, Number(req.body?.tier) || 1));
    const half = Number(req.body?.half) === 2 ? 2 : 1;
    const count = Math.max(10, Math.min(110, Number(req.body?.count) || 90));
    const exam = String(req.body?.exam || "a standardised test").replace(/[^\w .&-]/g, "").slice(0, 40);
    const level = ["common words students meet constantly in reading passages", "core words that standardised tests rely on", "harder words that separate a good score from a great one", "advanced and rare words, for the top of the range"][tier - 1];
    const range = half === 1 ? "A to L" : "M to Z";
    const text = await ask({
      system: VOCAB,
      user: `Write exactly ${count} words for ${exam}.\nDifficulty: ${level}.\nOnly words that begin with the letters ${range}.`,
      maxTokens: 4200,
      json: true,
      temperature: 0.7,
    });
    const data = safeParse(text, "vocab");
    const inRange = half === 1 ? /^[a-l]/ : /^[m-z]/;
    const seen = new Set();
    const words = (Array.isArray(data?.words) ? data.words : []).map((w) => ({ word: String(w?.word || "").trim().toLowerCase(), meaning: String(w?.meaning || "").trim().replace(/\s*[–—]\s*/g, ", ").replace(/\s*;\s*/g, ", ") }))
      .filter((w) => /^[a-z][a-z'-]{1,23}$/.test(w.word) && inRange.test(w.word) && w.meaning.length >= 3 && w.meaning.length <= 160 && !seen.has(w.word) && seen.add(w.word));
    if (words.length < 10) return userError(res, 502, "The word list did not come back complete. Try again.");
    return res.status(200).json({ words: words.slice(0, count) });
  }

  if (mode === "skillcheck") {
    const topic = String(req.body?.topics?.[0]?.name || req.body?.topic || "").slice(0, 160);
    if (!topic) return userError(res, 400, "Which topic should the skill check cover?");
    const text = await ask({
      system: SKILLCHECK,
      user: `Build the skill check for this topic only: ${topic}\n\nThe notes:\n\n${notes}`,
      maxTokens: 5200,
      json: true,
      temperature: 0.3,
    });
    const data = safeParse(text, "skillcheck");
    const skills = [...new Set((Array.isArray(data?.skills) ? data.skills : []).map((s) => String(s?.name || s || "").trim().slice(0, 90)).filter(Boolean))].slice(0, 14);
    const key = (s) => s.toLowerCase();
    const raw = (Array.isArray(data?.questions) ? data.questions : []).slice(0, 24).map((q) => {
      const skill = skills.find((s) => key(s) === key(String(q?.skill || "").trim()));
      return skill ? { ...q, skill, topic } : null;
    }).filter(Boolean);
    const prefix = `sk${String(req.body?.batch ?? 0).replace(/[^0-9a-z]/gi, "").slice(0, 10)}q`;
    const matched = cleanQuestions(raw, [topic], prefix).filter((q) => q.skill);
    const kept = matched.filter((q) => fromNotes(q, notes));
    const pool = (kept.length >= Math.ceil(matched.length / 2) ? kept : matched);
    const checked = await verifyQuestions(pool, notes);
    const questions = (checked.length ? checked : pool).slice(0, 20);
    const covered = skills.filter((s) => questions.some((q) => q.skill === s));
    if (questions.length < 3 || covered.length < 2) return userError(res, 502, "The skill check did not come back complete. Try again.");
    return res.status(200).json({ topic, skills: covered, questions });
  }

  if (mode === "notes") {
    const names = (Array.isArray(req.body?.topics) ? req.body.topics : [])
      .map((t) => String(t?.name || t || "").slice(0, 160)).filter(Boolean).slice(0, 4);
    if (!names.length) return userError(res, 400, "Which topics should the notes cover?");
    const text = await ask({
      system: notesPrompt(req.body?.rich === true),
      user: `Write the complete notes for these topics only:\n${names.map((n) => `- ${n}`).join("\n")}\n\nThe source:\n\n${notes}`,
      maxTokens: 4000,
      json: true,
      temperature: 0.2,
    });
    const data = safeParse(text, "sections");
    const KINDS = ["h", "p", "list", "term", "eg", "watch", ...(req.body?.rich === true ? ["table", "flow", "pic", "sketch"] : [])];
    const sections = (Array.isArray(data?.sections) ? data.sections : [])
      .filter((sec) => sec && names.includes(String(sec.topic)) && Array.isArray(sec.blocks))
      .map((sec) => ({
        topic: String(sec.topic),
        blocks: sec.blocks
          .filter((b) => b && typeof b === "object" && KINDS.some((k) => k in b))
          .map((b) => {
            if (b.term) return { term: String(b.term), def: String(b.def || "") };
            if (Array.isArray(b.list)) return { list: b.list.map(String).filter(Boolean) };
            if (b.table && typeof b.table === "object") return cleanTable(b.table);
            if (b.flow && typeof b.flow === "object") {
              const steps = (Array.isArray(b.flow.steps) ? b.flow.steps : []).map((x) => String(x).trim()).filter(Boolean).slice(0, 8);
              return steps.length >= 2 ? { flow: { title: String(b.flow.title || "").slice(0, 120), steps, cycle: b.flow.cycle === true } } : null;
            }
            if (typeof b.pic === "string") { const q = b.pic.trim().slice(0, 80); return q && !/\b(graphs?|charts?|axis|axes|gradient|plot|formula|equation)\b/i.test(q) ? { pic: q } : null; }
            if (b.sketch && typeof b.sketch === "object") return Array.isArray(b.sketch.lines) && b.sketch.lines.length ? { sketch: b.sketch } : null;
            const kind = KINDS.find((k) => typeof b[k] === "string" && b[k].trim());
            return kind ? { [kind]: String(b[kind]) } : null;
          })
          .filter(Boolean),
      }))
      .filter((sec) => sec.blocks.length);
    if (!sections.length) return userError(res, 502, "The notes did not come back complete. Try again.");
    return res.status(200).json({ sections });
  }

  // One long chunk of a big source boiled down to a dense digest, so twenty
  // files can be built from as one. Nothing a student could be asked about is
  // dropped; repetition, filler and admin are.
  if (mode === "condense") {
    const text = await ask({
      system: CONDENSE,
      user: `Condense this part of the student's material:\n\n${notes}`,
      maxTokens: 3400,
      temperature: 0.15,
    });
    const digest = String(text || "").replace(/\s*[\u2013\u2014]\s*/g, ", ").trim();
    if (digest.length < 120) return userError(res, 502, "The summary did not come back complete. Try again.");
    return res.status(200).json({ digest });
  }

  if (mode === "sheet") {
    const text = await ask({
      system: SHEET.replace("__SHEET_SIZE__", sheetSize(notes.length)),
      user: `The notes:\n\n${notes}`,
      maxTokens: 2000,
      json: true,
      temperature: 0.3,
    });
    const data = safeParse(text, "sheet");
    return res.status(200).json({ sheet: data?.sheet && typeof data.sheet === "object" ? data.sheet : null });
  }

  return userError(res, 400, "Unknown part.");
}

export default async function handler(req, res) {
  // A generation from notes is several calls arriving together, a plan then up
  // to five at once, and a long source repeats that for each part back to back,
  // so the allowance per minute is sized for a five part job rather than one.
  if (!allow(req, res, { limit: 40 })) return;

  const syllabus = req.body?.syllabus;
  const notes = String(req.body?.notes || "").trim();
  const mode = req.body?.mode;

  if (mode === "syllabus" || mode === "vocab") {
    try { return await part(req, res, mode, ""); } catch (err) { return fail(res, err); }
  }

  // A practice paper in a board's past paper style, from its syllabus.
  if (mode === "pastpaper") {
    try {
      const sy = req.body?.syllabus || {};
      const course = String(sy.course || "").slice(0, 80), subject = String(sy.subject || "").slice(0, 80);
      const code = String(sy.code || "").slice(0, 20), level = String(sy.level || "").slice(0, 80);
      const topics = (Array.isArray(req.body?.topics) ? req.body.topics : []).map((t) => String(t).slice(0, 160)).slice(0, 30);
      const count = Math.max(4, Math.min(16, Number(req.body?.count) || 8));
      if (!course || !subject || !topics.length) return userError(res, 400, "Which course and topics?");
      const text = await ask({
        system: PAST_PAPER,
        user: `Course: ${course} ${subject}${code ? ` (syllabus code ${code})` : ""}.${level ? `\nLevel: ${level}.` : ""}${Number(req.body?.parts) > 1 ? `\nThis is part ${Number(req.body.part) || 1} of ${Number(req.body.parts)} of one paper; write only these topics so the parts do not repeat each other.` : ""}\nWrite ${count} questions covering these syllabus topics:\n${topics.map((t) => "- " + t).join("\n")}`,
        maxTokens: 6000,
        json: true,
        temperature: 0.45,
      });
      const data = safeParse(text, "questions");
      const clean = (v) => String(v || "").replace(/\s*[\u2013\u2014]\s*/g, ", ").trim();
      const questions = (Array.isArray(data?.questions) ? data.questions : []).map((q, i) => {
        const type = ["mcq", "short", "long"].includes(q?.type) ? q.type : "short";
        const options = type === "mcq" && Array.isArray(q.options) ? q.options.slice(0, 5).map(clean) : null;
        const answer = type === "mcq" ? Number(q.answer) : null;
        return {
          id: "pp" + i, topic: clean(q?.topic), type, stem: clean(q?.stem),
          marks: Math.max(1, Math.min(12, Math.round(Number(q?.marks) || 1))),
          options, answer: options && answer >= 0 && answer < options.length ? answer : null,
          scheme: (Array.isArray(q?.scheme) ? q.scheme : []).map(clean).filter(Boolean).slice(0, 14),
          model: clean(q?.model),
        };
      }).filter((q) => q.stem && (q.type !== "mcq" || q.answer !== null));
      if (questions.length < 3) return userError(res, 502, "The paper did not come back complete. Try again.");
      const total = questions.reduce((n, q) => n + q.marks, 0);
      return res.status(200).json({ title: clean(data.title) || `${subject} practice paper`, minutes: Math.max(10, Math.min(180, Math.round(Number(data.minutes) || total * 1.2))), questions });
    } catch (err) { return fail(res, err); }
  }

  // Does a typed answer mean the same as the expected one? Only asked when the
  // quick matching in the browser said no.
  if (mode === "judge") {
    try {
      const q = String(req.body?.q || "").slice(0, 400), answer = String(req.body?.answer || "").slice(0, 200), given = String(req.body?.given || "").slice(0, 200);
      const accept = (Array.isArray(req.body?.accept) ? req.body.accept : []).map((x) => String(x).slice(0, 120)).slice(0, 6);
      if (!given.trim() || !answer.trim()) return res.status(200).json({ correct: false });
      const text = await ask({ system: JUDGE, user: `Question: ${q}\nExpected answer: ${answer}${accept.length ? `\nAlso accepted: ${accept.join("; ")}` : ""}\nThe student wrote: ${given}`, maxTokens: 60, json: true, temperature: 0 });
      return res.status(200).json({ correct: safeParse(text, "correct")?.correct === true });
    } catch (err) { return fail(res, err); }
  }

  // Marks written answers on a practice paper against its mark scheme.
  if (mode === "markpaper") {
    try {
      const items = (Array.isArray(req.body?.items) ? req.body.items : []).slice(0, 20).map((it) => ({
        stem: String(it?.stem || "").slice(0, 2000), marks: Math.max(1, Math.min(12, Number(it?.marks) || 1)),
        scheme: (Array.isArray(it?.scheme) ? it.scheme : []).map((x) => String(x).slice(0, 400)).slice(0, 14),
        answer: String(it?.answer || "").slice(0, 4000),
      }));
      if (!items.length) return userError(res, 400, "Nothing to mark");
      const text = await ask({
        system: MARK_PAPER,
        user: items.map((it, i) => `Answer ${i + 1} (${it.marks} marks)\nQuestion: ${it.stem}\nMark scheme:\n${it.scheme.map((p) => "- " + p).join("\n")}\nCandidate's answer: ${it.answer || "(no answer)"}`).join("\n\n"),
        maxTokens: 2500,
        json: true,
        temperature: 0.15,
      });
      const data = safeParse(text, "results");
      const results = items.map((it, i) => {
        const r = data?.results?.[i] || {};
        return { awarded: it.answer.trim() ? Math.max(0, Math.min(it.marks, Math.round(Number(r.awarded) || 0))) : 0,
          feedback: String(r.feedback || "").replace(/\s*[\u2013\u2014]\s*/g, ", ").trim() };
      });
      return res.status(200).json({ results });
    } catch (err) { return fail(res, err); }
  }

  if (mode === "clarify" || mode === "brief") {
    if (notes.length < 2) return userError(res, 400, "Type what you want to study, or paste your notes");
    if (notes.length > 2000) return userError(res, 413, "That is long enough to use as notes directly.");
    try {
      return await part(req, res, mode, notes);
    } catch (err) {
      return fail(res, err);
    }
  }

  if (mode) {
    if (notes.length < 200) return userError(res, 400, "Give at least a couple of paragraphs of notes to work from");
    if (notes.length > MAX_INPUT) return userError(res, 413, `That is longer than the ${MAX_INPUT} character limit. Send one chapter at a time.`);
    try {
      return await part(req, res, mode, notes);
    } catch (err) {
      return fail(res, err);
    }
  }

  let system = SYSTEM;
  let user;
  let label;

  if (syllabus?.topic && syllabus?.subject && syllabus?.course) {
    const course = String(syllabus.course).slice(0, 80);
    const subject = String(syllabus.subject).slice(0, 80);
    const topic = String(syllabus.topic).slice(0, 120);
    label = `${subject}: ${topic}`;
    system = SYSTEM
      .replace("- Only use what is in the notes. Never invent facts that are not there.", SYLLABUS_RULES.trim())
      .replace(/- Cover every distinct area[^\n]*\n/, "");
    user = `Write study material for ${course} ${subject}, on the syllabus topic "${topic}".`;
  } else {
    if (notes.length < 200) return userError(res, 400, "Give at least a couple of paragraphs of notes to work from");
    if (notes.length > MAX_INPUT) return userError(res, 413, `That is longer than the ${MAX_INPUT} character limit. Send one chapter at a time.`);
    // Only a copy of the app from before generation was split into parts gets
    // here: the website and every current build ask for the parts. Those older
    // copies are still installed on people's computers, and asking this one call
    // to cover a whole chapter is exactly what timed out, so they keep the
    // limits they were built with until they update.
    system = SYSTEM
      .replace(/- Cover every distinct area[^\n]*\n/, "")
      .replace(/- 3 questions per topic, 4 where[^\n]*\n/,
        "- 3 topics, 3 to 4 questions per topic, 4 choices each, \"answer\" is the index of the correct one. Aim for about 10 questions in total.\n");
    user = `Build study material from these notes.\n\n${notes}`;
  }

  // More material deserves a fuller sheet. A page of notes and a whole chapter
  // should not condense to the same three bullets.
  const size = syllabus
    ? "3 big idea lines, 5 terms and 3 watch out lines"
    : notes.length > 9000
      ? "6 big idea lines, 10 terms and 5 watch out lines"
      : notes.length > 4000
        ? "6 big idea lines, 10 terms and 5 watch out lines"
        : "4 big idea lines, 7 terms and 4 watch out lines";
  system = system.replace("__SHEET_SIZE__", size);

  try {
    const text = await ask({
      system,
      user,
      maxTokens: notes.length > 4000 ? 5200 : 3800,
      json: true,
      temperature: 0.3,
    });

    const data = safeParse(text, "questions");
    if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
      // Seeing the reply is the only way to tell a truncation from a model that
      // wrapped its JSON in prose. No key or user content is exposed.
      if (req.query?.debug && process.env.ADMIN_TOKEN && req.query.token === process.env.ADMIN_TOKEN) {
        return res.status(502).json({
          error: "The model did not return usable material.",
          parsed: data ? Object.keys(data) : null,
          length: text.length,
          head: text.slice(0, 700),
          tail: text.slice(-400),
        });
      }
      return userError(res, 502, "The model did not return usable material. Try again, or send shorter notes.");
    }

    // Never trust the shape that comes back. Drop anything malformed rather
    // than letting it reach the app and break a quiz halfway through.
    const questions = data.questions
      .filter((q) => q && typeof q.q === "string" && Array.isArray(q.choices) && q.choices.length >= 2)
      .map((q, i) => ({
        id: `ai${i}`,
        topic: String(q.topic || data.topics?.[0]?.name || "General"),
        kind: ["vocab", "concept", "process"].includes(q.kind) ? q.kind : "concept",
        q: String(q.q),
        ...(q.kind === "vocab" && q.term ? { term: String(q.term) } : {}),
        choices: q.choices.map(String),
        answer: Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length ? q.answer : 0,
        why: String(q.why || ""),
      }));

    if (questions.length === 0) return userError(res, 502, "The model returned no usable questions. Try again.");

    const names = [...new Set(questions.map((q) => q.topic))];
    const topics = (Array.isArray(data.topics) ? data.topics : [])
      .filter((t) => t && names.includes(t.name))
      .map((t, i) => ({
        id: `ait${i}`,
        name: String(t.name),
        reason: String(t.reason || "Generated from your notes."),
        questions: questions.filter((q) => q.topic === t.name).length,
      }));

    res.status(200).json({
      title: label || String(data.title || "Your material"),
      topics: topics.length ? topics : names.map((n, i) => ({
        id: `ait${i}`, name: n, reason: "Generated from your notes.",
        questions: questions.filter((q) => q.topic === n).length,
      })),
      questions,
      sheet: data.sheet && typeof data.sheet === "object" ? data.sheet : null,
    });
  } catch (err) {
    fail(res, err);
  }
}
export { notesPrompt }; // for scripts/notes-prompt.test.mjs
