// Works a question through and shows the working.
//
// The point of this endpoint is the method, not the answer. An answer on its
// own teaches nothing and is worth nothing the next time a similar question
// comes up, so the shape below forces the model to lay out the steps, say why
// each one is the right move, and name the idea being tested. The answer is
// one field among several on purpose.

import { ask, safeParse, fail, userError, MAX_INPUT } from "./_llm.js";
import { allow } from "./_guard.js";

export const config = { maxDuration: 60 };

const SYSTEM = `You are a patient tutor working through a student's question.

Write mathematics the way it is printed on an exam paper, not the way it is
typed. Use real symbols: x², 10⁻⁴, H₂O, √49, π, ×, ÷, ≤, ≥, ≠, ±, °, →.
Never write a caret, so x^2 is wrong. Never spell an operation out as a word
where a symbol exists, so "x squared" is wrong.

Return ONE JSON object and nothing else. No prose, no code fences.

Shape:
{
  "ok": true,
  "title": "four to six words naming what this question is",
  "subject": "the subject, one or two words",
  "asked": "the question restated in one sentence, so the student can check you read it correctly",
  "answer": "the final answer alone, as short as it can honestly be",
  "steps": [
    {
      "do": "what this step does, as a short heading of four to eight words",
      "work": "the working for this step: the equation, the substitution, the sentence. Use real symbols. May be empty when the step is reasoning rather than calculation.",
      "why": "one or two sentences on why this is the right move here, not what was done"
    }
  ],
  "idea": "the principle this question is really testing, two sentences, written to the student",
  "check": "how to check the answer is sensible without redoing the work",
  "watch": ["the mistakes students actually make on this, one short sentence each"],
  "similar": { "q": "one similar question to try alone", "answer": "its answer" }
}

If the input is not a question, or there is not enough of it to work on, return
exactly { "ok": false, "message": "one sentence saying what is missing" }.

Rules:
- Between 3 and 7 steps. Never fold two moves into one step to save space, and never pad with a step that does nothing.
- "why" is the part that teaches. Never let it restate "work" in words.
- Show every substitution and every unit. Carry units through the working and put them in the answer.
- If the question is ambiguous, solve the most likely reading and say which reading you took in "asked".
- If the question has no single answer, put the best available answer in "answer" and explain the limitation in "idea".
- 2 to 4 entries in "watch".
- Write in British English. Do not use em dashes or en dashes.`;

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 8 })) return;

  const problem = String(req.body?.problem || "").trim();

  if (problem.length < 12) {
    return userError(res, 400, "Give the question itself, or a photo of it, and it will be worked through.");
  }
  if (problem.length > MAX_INPUT) {
    return userError(res, 413, `That is longer than the ${MAX_INPUT} character limit. Send one question at a time.`);
  }

  try {
    const text = await ask({
      system: SYSTEM,
      user: `Work through this question and show every step.\n\n${problem}`,
      maxTokens: 2600,
      // Low, because working should be reproducible rather than creative.
      temperature: 0.2,
      json: true,
    });

    const data = safeParse(text, "steps");
    if (!data) return userError(res, 502, "The model did not return a usable answer. Try again.");

    if (data.ok === false) {
      return userError(res, 400, String(data.message || "That does not look like a question."));
    }

    // Never trust the shape. A malformed step is dropped rather than allowed
    // to reach the page and render as an empty box.
    const steps = (Array.isArray(data.steps) ? data.steps : [])
      .filter((s) => s && typeof s.do === "string" && s.do.trim())
      .map((s) => ({
        do: String(s.do).trim(),
        work: String(s.work || "").trim(),
        why: String(s.why || "").trim(),
      }));

    if (steps.length === 0) {
      return userError(res, 502, "The model returned no working. Try again, or send a clearer photo.");
    }

    res.status(200).json({
      title: String(data.title || "Worked through"),
      subject: String(data.subject || "").trim(),
      asked: String(data.asked || "").trim(),
      answer: String(data.answer || "").trim(),
      steps,
      idea: String(data.idea || "").trim(),
      check: String(data.check || "").trim(),
      watch: (Array.isArray(data.watch) ? data.watch : []).map(String).filter(Boolean).slice(0, 4),
      similar: data.similar && typeof data.similar === "object" && data.similar.q
        ? { q: String(data.similar.q), answer: String(data.similar.answer || "") }
        : null,
    });
  } catch (err) {
    fail(res, err);
  }
}
