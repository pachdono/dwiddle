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
  "checks": [
    {
      "q": "a complete question, exactly as it would be printed on an exam paper",
      "choices": ["four options"],
      "answer": 0,
      "why": "two sentences: why the answer is right, and why the most tempting wrong option is wrong"
    }
  ]
}

How to write it:
- Between 4 and 7 cards, depending on how much there genuinely is to teach. Never pad.
- The first card sets the idea up. Each card after it adds exactly one new idea, in the order a teacher would introduce them. The last card pulls the topic together.
- "points" has 0 to 4 entries. Use them when the idea has parts, types or cases worth separating. Leave the array empty when a paragraph says it better.
- Write to the student, plainly, in short sentences. Explain why things are the way they are, not just what they are.
- Every definition, formula, name and figure in the source must appear somewhere in the lesson.
- Exactly 2 checks, testing understanding rather than recall of a single word. Each "q" is a full question, never a bare term.
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
      maxTokens: 2600,
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

    const checks = (Array.isArray(data?.checks) ? data.checks : [])
      .filter((q) => q && typeof q.q === "string" && Array.isArray(q.choices) && q.choices.length >= 2)
      .slice(0, 3)
      .map((q) => ({
        q: String(q.q),
        choices: q.choices.map(String),
        answer: Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length ? q.answer : 0,
        why: String(q.why || ""),
      }));

    res.status(200).json({ topic, cards, checks });
  } catch (err) {
    fail(res, err);
  }
}
