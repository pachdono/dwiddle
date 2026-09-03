// Turns a block of notes into everything the app needs in one pass: topics,
// questions with their explanations already written, and a study sheet with
// the important passages marked.

import { ask, safeParse, guard, fail, userError, MAX_INPUT } from "./_llm.js";

// Generating takes real time on a 70B model, and the platform default cuts a
// function off long before it finishes.
export const config = { maxDuration: 60 };

const SYSTEM = `You build study material from a student's own notes.

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
      "q": "the question, or the bare term when kind is vocab",
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
- 3 to 4 topics, 3 to 4 questions per topic, 4 choices each, "answer" is the index of the correct one. Aim for about 12 questions in total.
- Only use what is in the notes. Never invent facts that are not there.
- "why" must teach something, not restate the answer. Two sentences, no more.
- Mark types: "def" for wording to learn verbatim, "key" for a fact to memorise, "exam" for where marks are lost.
- Keep the sheet to 3 big idea lines, 5 terms and 3 watch out lines.
- Each line in "big" and "watch" is an array of segments. Segments without "mark" are plain text. Concatenated, the segments must read as one natural sentence.
- Write in British English. Do not use em dashes or en dashes.`;

export default async function handler(req, res) {
  if (!guard(req, res)) return;

  const notes = String(req.body?.notes || "").trim();
  if (notes.length < 200) return userError(res, 400, "Give at least a couple of paragraphs of notes to work from");
  if (notes.length > MAX_INPUT) return userError(res, 413, `That is longer than the ${MAX_INPUT} character limit. Send one chapter at a time.`);

  try {
    const text = await ask({
      system: SYSTEM,
      user: `Build study material from these notes.\n\n${notes}`,
      maxTokens: 2600,
      temperature: 0.3,
    });

    const data = safeParse(text);
    if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
      // Seeing the reply is the only way to tell a truncation from a model that
      // wrapped its JSON in prose. No key or user content is exposed.
      if (req.query?.debug) {
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
      title: String(data.title || "Your material"),
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
