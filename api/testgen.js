// Fresh questions for a standardised test section.
//
// This is the answer to the complaint every prep app earns eventually: a fixed
// bank runs out, and the second sitting is the first one again. Papers are
// topped up from here with items the person has not seen, written to the style
// and difficulty of the section they asked for.

import { ask, safeParse, guard, fail, userError } from "./_llm.js";
import { allow } from "./_guard.js";

export const config = { maxDuration: 60 };

const DISCRETE = `You write practice questions for standardised tests.

Write mathematics the way it is printed on an exam paper, not the way it is
typed. Use real symbols: x², 10⁻⁴, H₂O, √49, π, ×, ÷, ≤, ≥, ≠, ±, °, →.
Never write a caret, so x^2 is wrong. Never spell an operation out as a word
where a symbol exists, so "x squared" is wrong.

Return ONE JSON object and nothing else:
{ "questions": [ { "skill": "...", "q": "...", "choices": ["..."], "answer": 0, "why": "..." } ] }

Rules:
- Match the named test's real style, difficulty and phrasing conventions.
- "answer" is the index of the correct choice.
- "why" is two sentences: why the answer is right, and why the most tempting
  wrong choice is wrong. It must teach, not restate.
- Every question must be answerable from the question alone. No diagrams, no
  "refer to the passage", no reference to material that is not present.
- Vary the position of the correct answer. Do not put it in the same place
  every time.
- Write in British English. Do not use em dashes or en dashes.`;

const TRANSCRIPT = `You write practice listening material for standardised tests.

Write mathematics the way it is printed on an exam paper, not the way it is
typed. Use real symbols: x², 10⁻⁴, H₂O, √49, π, ×, ÷, ≤, ≥, ≠, ±, °, →.
Never write a caret, so x^2 is wrong. Never spell an operation out as a word
where a symbol exists, so "x squared" is wrong.

Return ONE JSON object and nothing else:
{ "passage": "...", "questions": [ { "skill": "...", "q": "...", "choices": ["..."], "answer": 0, "why": "..." } ] }

Rules:
- "passage" is a TRANSCRIPT of something spoken, and it will be read aloud, so
  write it to be heard: a lecture, a campus conversation, a booking call, an
  announcement. Name the speakers where there is more than one.
- Include the things listening tests actually turn on: a speaker correcting
  themselves, a number or a spelling given aloud, a detail contradicted later.
- Questions must be answerable from having listened once, so avoid anything
  that needs the exact wording to be re read.
- "answer" is the index of the correct choice, and its position must vary.
- "why" is two sentences and must point at the moment in the recording that
  settles it.
- Write in British English. Do not use em dashes or en dashes.`;

const PASSAGE = `You write practice reading material for standardised tests.

Write mathematics the way it is printed on an exam paper, not the way it is
typed. Use real symbols: x², 10⁻⁴, H₂O, √49, π, ×, ÷, ≤, ≥, ≠, ±, °, →.
Never write a caret, so x^2 is wrong. Never spell an operation out as a word
where a symbol exists, so "x squared" is wrong.

Return ONE JSON object and nothing else:
{ "passage": "...", "questions": [ { "skill": "...", "q": "...", "choices": ["..."], "answer": 0, "why": "..." } ] }

Rules:
- The passage must be self contained and substantial enough to support every
  question. Write it in the register the named test uses.
- Questions must be answerable from the passage alone.
- "answer" is the index of the correct choice, and its position must vary.
- "why" is two sentences and must quote or point to the part of the passage
  that settles it.
- Write in British English. Do not use em dashes or en dashes.`;

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 10 })) return;

  const test = String(req.body?.test || "").slice(0, 60);
  const section = String(req.body?.section || "").slice(0, 60);
  const skills = (Array.isArray(req.body?.skills) ? req.body.skills : []).slice(0, 8).map(String);
  const count = Math.min(Math.max(Number(req.body?.count) || 8, 1), 12);
  const passage = Boolean(req.body?.passage);
  const audio = Boolean(req.body?.audio);
  const avoid = (Array.isArray(req.body?.avoid) ? req.body.avoid : []).slice(0, 25).map(String);

  if (!test || !section) return userError(res, 400, "Which test and section?");

  const brief = [
    `Test: ${test}`,
    `Section: ${section}`,
    skills.length ? `Skills to cover, spread across the set: ${skills.join(", ")}` : null,
    `Write ${count} questions.`,
    avoid.length
      ? `These have been used already, so write on different material and do not repeat them:\n- ${avoid.join("\n- ")}`
      : null,
  ].filter(Boolean).join("\n");

  try {
    const text = await ask({
      system: audio ? TRANSCRIPT : passage ? PASSAGE : DISCRETE,
      user: brief,
      maxTokens: 5000,
      temperature: 0.9, // variety matters more than consistency here
      json: true,
    });

    const data = safeParse(text, "questions");
    if (!data || !Array.isArray(data.questions)) {
      return userError(res, 502, "Could not write new questions just now. Try again.");
    }

    const stamp = Date.now().toString(36);
    const questions = data.questions
      .filter((q) => q && typeof q.q === "string" && Array.isArray(q.choices) && q.choices.length >= 2)
      .map((q, i) => ({
        id: `gen-${stamp}-${i}`,
        section,
        skill: String(q.skill || skills[0] || section),
        passage: passage ? String(data.passage || "") : undefined,
        q: String(q.q),
        choices: q.choices.map(String),
        answer: Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length ? q.answer : 0,
        why: String(q.why || ""),
        fresh: true,
      }));

    if (questions.length === 0) return userError(res, 502, "No usable questions came back. Try again.");

    res.status(200).json({ questions });
  } catch (err) {
    fail(res, err);
  }
}
