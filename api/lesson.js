// Teaches one topic, a card at a time.
//
// The study sheet condenses a whole chapter onto one page, which is what it
// is for, and exactly why it cannot teach: there is no room. A lesson is the
// other half. It covers a single topic in full, one idea per card, so a
// chapter with eight topics gets eight lessons rather than eight bullet
// points.
//
// Lessons are written when a topic is first opened rather than all at once
// with the questions. Writing every lesson up front would not fit inside the
// time a serverless function is allowed, and most people open a few topics,
// not all of them.

import { ask, safeParse, fail, userError, MAX_INPUT } from "./_llm.js";
import { allow } from "./_guard.js";

export const config = { maxDuration: 60 };

const SYSTEM = `You are writing a short lesson that teaches one topic to a student, one idea per card.

Write mathematics the way it is printed on an exam paper: x², 10⁻⁴, H₂O, √49, π, ×, ÷, ≤, ≥, °.
Never write a caret.

Return ONE JSON object and nothing else. No prose, no code fences.

Shape:
{
  "cards": [
    {
      "heading": "a short, specific heading of three to seven words that names the idea on this card",
      "body": "two or three sentences explaining the idea. Put each key term in **double asterisks** the first time it appears, followed straight away by a plain definition in brackets.",
      "points": [{ "lead": "a short bold label", "text": "one sentence, ideally a concrete example" }],
      "example": "optional: one worked example or real world case in one or two sentences, or an empty string"
    }
  ],
  "figures": [
    { "id": "g1", "title": "short title of the graph", "xLabel": "Time (s)", "yLabel": "Velocity (m/s)", "points": [[0, 0], [4, 22], [12, 22], [16, 0]], "shade": false, "marks": [{ "x": 4, "y": 22, "label": "22 m/s" }] }
  ],
  "checks": [
    {
      "type": "choice",
      "q": "a complete question, exactly as it would be printed on an exam paper",
      "choices": ["four options"],
      "answer": 0,
      "why": "two sentences: why the answer is right, and why the most tempting wrong option is wrong"
    },
    { "type": "blank", "q": "one sentence from the lesson with the key word replaced by ___", "answer": "the missing word", "accept": ["other spellings or synonyms that are also right"], "why": "one sentence" },
    { "type": "word", "q": "a clue: the definition or a description of the term", "answer": "the single term itself", "why": "one sentence" },
    { "type": "tf", "q": "one statement, either true or containing one common misconception", "answer": true, "correction": "if false, the corrected statement in one sentence; otherwise empty", "why": "one sentence" },
    { "type": "match", "q": "Match each term to its meaning", "pairs": [{ "a": "a term", "b": "its meaning in a few words" }], "why": "" },
    { "type": "order", "q": "Put these steps in order", "items": ["the steps of a process from the lesson, in the correct order"], "why": "one sentence" },
    { "type": "finish", "q": "the start of an important sentence from the lesson, ending with ...", "answer": "the rest of the sentence, as a full marks answer", "points": ["what the ending must contain"] },
    {
      "type": "written",
      "q": "a question answered in one to three sentences of the student's own words, such as explain, describe, compare or calculate",
      "answer": "a model answer that would earn full marks, one to three sentences",
      "points": ["each thing a full answer must contain, as a short phrase; 2 or 3 of them"]
    }
  ]
}

This is the standard to write to. Match its quality, not its subject:
{
  "heading": "Why cells cannot just keep growing",
  "body": "As a cell grows, its volume rises faster than its surface, so its **surface area to volume ratio** (how much outside there is for each unit of inside) falls. With less surface for its size, the cell cannot take in food and oxygen fast enough to keep up.",
  "points": [
    { "lead": "Small cell", "text": "a 1 cm cube has a ratio of 6 to 1, plenty of surface for its size." },
    { "lead": "Large cell", "text": "a 3 cm cube falls to 2 to 1, so much of it is far from the outside." }
  ],
  "example": "It is why a single celled amoeba manages on diffusion alone, while an elephant needs lungs and a heart."
}

How to write it:
- Between 4 and 6 cards, depending on how much there genuinely is to teach. Never pad.
- Each card's body is two or three short sentences. Brevity is what makes a card readable at a glance.
- The first card sets the idea up. Each card after it adds exactly one new idea, in the order a teacher would introduce them. The last card pulls the topic together.
- Headings are specific and vivid, naming the idea in plain words the way a good textbook subheading does. Never "Definition of", "Introduction to", "Overview" or "Summary".
- Explain in your own words, as a good teacher would say it out loud. Never copy sentences from the source.
- Put each key term in **double asterisks** the first time it appears in the lesson, followed straight away by what it means in brackets. Define each term once in the whole lesson; after that, use it plainly.
- The meaning in brackets must be accurate. Where the source defines the term, use its definition. Never invent a detail, direction, number or fact to make an explanation vivid.
- About half the cards have "points", 2 or 3 of them, breaking the idea into its parts, types or cases, each with a concrete example where one fits. The other cards leave "points" empty.
- When the source describes a graph, diagram or table, describe what it shows in words in a card, with the key values (for example "speed rises from 0 to 42 m/s over 25 s, stays at 42 m/s for 80 s, then falls to 0 over 15 s"), because the student is not shown the original picture.
- When the topic is a graph (distance-time, velocity-time, supply and demand, a graph of results), add it to "figures" as a drawing: "points" are the corners of the line in order as [x, y] numbers (at most 12, straight lines between them), "xLabel" and "yLabel" name each axis with units, "marks" label the values the cards and checks talk about, and "shade" is true when the area under the line matters. Give a figure only when the topic really is a graph, otherwise leave "figures" out or empty. Every card or check that talks about the graph sets "figure" to its id (for example "figure": "g1"), and the check then needs the figure to be answerable. The values in "points" must match the values the cards state.
- At least two cards have an "example": a real, specific case a student would recognise.
- Short sentences. Explain why things are the way they are, not just what they are.
- Every definition, formula, name and figure in the source must appear somewhere in the lesson.
- After the cards, 5 or 6 checks on what the cards taught, each a different way of recalling it:
  1 or 2 of type "choice"; 1 of type "blank" or "word"; 1 of type "tf"; 1 of type "match" (3 or 4 pairs, when the lesson defines at least 3 terms) or "order" (3 to 5 steps, when it teaches a process with a fixed sequence); and 1 of type "written" or "finish".
- Every check is answerable from the cards alone, and each "q" is a full question or sentence, never a bare term. A check that asks for a calculated value, including a fill in the blank whose answer is a number, must state every number it needs in its own wording or point at a figure that shows them (for example the speed and the time), because the student sees nothing but the check. Write units as m/s, m/s², kg/m³. A check may refer to "the graph" or "the diagram" the lesson describes, because the app draws it from the lesson cards, so the cards must give every value it needs.
- A "blank" removes one key word that has a single right answer. A "word" answer is one word the student can spell from the lesson.
- A false "tf" statement contains one realistic misconception, and its "correction" puts it right.
- Order the checks from easiest to hardest, and end on the "written" or "finish" one. Its "points" are what an examiner would look for.
- Write in British English. Do not use em dashes or en dashes; use commas, colons or full stops.`;

const FROM_NOTES = `
- Teach only what the source notes say about this topic. Never add facts that are not there.
- Do not teach the other topics listed; they have lessons of their own.`;

const FROM_SYLLABUS = `
- Teach this topic as the named course examines it, at that level and no further.
- Do not teach the other topics listed; they have lessons of their own.`;

const FROM_CONTEXT = `
- The original notes are not available, only the questions and summary written from them. Teach the topic accurately at the level those imply, and never contradict them.
- Do not teach the other topics listed; they have lessons of their own.`;

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 12 })) return;

  const topic = String(req.body?.topic || "").trim().slice(0, 160);
  const others = (Array.isArray(req.body?.others) ? req.body.others : [])
    .map((t) => String(t).slice(0, 160)).filter((t) => t && t !== topic).slice(0, 12);
  const notes = String(req.body?.notes || "").trim();
  const context = String(req.body?.context || "").trim();
  const syllabus = req.body?.syllabus;

  if (!topic) return userError(res, 400, "Which topic should the lesson teach?");

  let rules;
  let source;
  if (notes) {
    if (notes.length > MAX_INPUT) return userError(res, 413, "Those notes are too long to teach from in one go.");
    rules = FROM_NOTES;
    source = `The source notes:\n\n${notes}`;
  } else if (syllabus?.course && syllabus?.subject) {
    rules = FROM_SYLLABUS;
    source = `The course: ${String(syllabus.course).slice(0, 80)} ${String(syllabus.subject).slice(0, 80)}${
      syllabus.topic ? `, syllabus topic "${String(syllabus.topic).slice(0, 120)}"` : ""}.`;
  } else if (context) {
    rules = FROM_CONTEXT;
    source = `What was written from the original notes:\n\n${context.slice(0, MAX_INPUT)}`;
  } else {
    return userError(res, 400, "There is nothing to teach this topic from.");
  }

  const user = `Write the lesson for the topic "${topic}".${
    others.length ? `\n\nThe other topics, which have their own lessons: ${others.join("; ")}.` : ""
  }\n\n${source}`;

  try {
    const text = await ask({
      system: SYSTEM + rules,
      user,
      maxTokens: 3400,
      temperature: 0.35,
      json: true,
    });

    const data = safeParse(text, "cards");
    const cards = (Array.isArray(data?.cards) ? data.cards : [])
      .filter((c) => c && typeof c.heading === "string" && typeof c.body === "string" && c.body.trim())
      .map((c) => ({
        heading: c.heading.trim(),
        body: c.body.trim(),
        points: (Array.isArray(c.points) ? c.points : [])
          .filter((p) => p && (p.text || p.lead))
          .slice(0, 4)
          .map((p) => ({ lead: String(p.lead || "").trim(), text: String(p.text || "").trim() })),
        example: String(c.example || "").trim(),
      }));

    if (cards.length < 2) {
      return userError(res, 502, "The lesson did not come back complete. Try opening it again.");
    }

    // Graphs the cards and checks refer to: a few numbers each, checked, so the
    // app can draw them exactly. Anything that is not plain numbers is dropped.
    const num = (v) => (typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1e7 ? v : null);
    const figures = (Array.isArray(data?.figures) ? data.figures : []).slice(0, 3).map((f, n) => {
      const points = (Array.isArray(f?.points) ? f.points : []).slice(0, 12)
        .map((p) => (Array.isArray(p) ? [num(Number(p[0])), num(Number(p[1]))] : null)).filter((p) => p && p[0] !== null && p[1] !== null);
      if (points.length < 2) return null;
      const marks = (Array.isArray(f.marks) ? f.marks : []).slice(0, 6)
        .map((m) => ({ x: num(Number(m?.x)), y: num(Number(m?.y)), label: String(m?.label || "").trim().slice(0, 30) }))
        .filter((m) => m.x !== null && m.y !== null);
      return { id: /^g\d$/.test(String(f.id)) ? String(f.id) : `g${n + 1}`, title: String(f.title || "").trim().slice(0, 80),
        xLabel: String(f.xLabel || "").trim().slice(0, 40), yLabel: String(f.yLabel || "").trim().slice(0, 40), points, marks, shade: f.shade === true };
    }).filter(Boolean);
    const figureIds = new Set(figures.map((f) => f.id));
    const withFigure = (raw, out) => (out && typeof raw?.figure === "string" && figureIds.has(raw.figure) ? { ...out, figure: raw.figure } : out);
    cards.forEach((c, i) => { const raw = data.cards.filter((x) => x && typeof x.heading === "string" && typeof x.body === "string" && x.body.trim())[i]; if (raw && typeof raw.figure === "string" && figureIds.has(raw.figure)) c.figure = raw.figure; });

    // Each kind is checked for the fields its question needs, and anything
    // malformed is dropped rather than shown half built.
    const str = (v, n = 400) => String(v ?? "").trim().slice(0, n);
    const list = (v, n) => (Array.isArray(v) ? v : []).map((x) => str(x, 200)).filter(Boolean).slice(0, n);
    const shape = {
      // no valid answer index is no question: it used to become "A is correct"
      choice: (q) => Array.isArray(q.choices) && q.choices.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length && {
        q: str(q.q), choices: q.choices.map((c) => str(c, 200)),
        answer: q.answer,
        why: str(q.why),
      },
      blank: (q) => /_{3,}/.test(q.q) && q.answer && { type: "blank", q: str(q.q), answer: str(q.answer, 80), accept: list(q.accept, 4), why: str(q.why) },
      word: (q) => q.answer && !/\s/.test(String(q.answer).trim()) && String(q.answer).trim().length >= 3 &&
        { type: "word", q: str(q.q), answer: str(q.answer, 40), why: str(q.why) },
      tf: (q) => typeof q.answer === "boolean" && { type: "tf", q: str(q.q), answer: q.answer, correction: q.answer ? "" : str(q.correction), why: str(q.why) },
      match: (q) => {
        const pairs = (Array.isArray(q.pairs) ? q.pairs : []).filter((p) => p && p.a && p.b).slice(0, 5)
          .map((p) => ({ a: str(p.a, 80), b: str(p.b, 160) }));
        return pairs.length >= 3 && { type: "match", q: str(q.q) || "Match each term to its meaning", pairs, why: str(q.why) };
      },
      order: (q) => { const items = list(q.items, 6); return items.length >= 3 && { type: "order", q: str(q.q) || "Put these in order", items, why: str(q.why) }; },
      finish: (q) => q.answer && { type: "finish", q: str(q.q), answer: str(q.answer), points: list(q.points, 4) },
      written: (q) => q.answer && { type: "written", q: str(q.q), answer: str(q.answer), points: list(q.points, 4) },
    };
    const checks = (Array.isArray(data?.checks) ? data.checks : [])
      .filter((q) => q && typeof q.q === "string" && q.q.trim())
      .map((q) => withFigure(q, (shape[q.type] || (Array.isArray(q.choices) ? shape.choice : null))?.(q)))
      .filter(Boolean)
      // a calculation with no numbers to calculate from, and no graph to read them off, cannot be answered
      .filter((q) => q.figure || !(
        (Array.isArray(q.choices) && q.choices.length >= 3 && !/\d/.test(q.q) && q.choices.every((c) => /^[-+]?\d[\d.,]*\s*[^\d]{0,14}$/.test(String(c).trim())))
        || ((q.type === "blank" || q.type === "word") && /^[-+]?\d[\d.,]*$/.test(String(q.answer).trim()) && !/\d/.test(String(q.q).replace(/_{3,}/g, "")))))
      .slice(0, 7);

    res.status(200).json({ topic, cards, checks, figures });
  } catch (err) {
    fail(res, err);
  }
}
