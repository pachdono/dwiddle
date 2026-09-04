// Turns a block of notes into everything the app needs in one pass: topics,
// questions with their explanations already written, and a study sheet with
// the important passages marked.

import { ask, safeParse, guard, fail, userError, MAX_INPUT } from "./_llm.js";
import { allow } from "./_guard.js";

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
- 3 topics, 3 to 4 questions per topic, 4 choices each, "answer" is the index of the correct one. Aim for about 10 questions in total.
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

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 6 })) return;

  const syllabus = req.body?.syllabus;
  const notes = String(req.body?.notes || "").trim();

  let system = SYSTEM;
  let user;
  let label;

  if (syllabus?.topic && syllabus?.subject && syllabus?.course) {
    const course = String(syllabus.course).slice(0, 80);
    const subject = String(syllabus.subject).slice(0, 80);
    const topic = String(syllabus.topic).slice(0, 120);
    label = `${subject}: ${topic}`;
    system = SYSTEM.replace("- Only use what is in the notes. Never invent facts that are not there.", SYLLABUS_RULES.trim());
    user = `Write study material for ${course} ${subject}, on the syllabus topic "${topic}".`;
  } else {
    if (notes.length < 200) return userError(res, 400, "Give at least a couple of paragraphs of notes to work from");
    if (notes.length > MAX_INPUT) return userError(res, 413, `That is longer than the ${MAX_INPUT} character limit. Send one chapter at a time.`);
    user = `Build study material from these notes.\n\n${notes}`;
  }

  // More material deserves a fuller sheet. A page of notes and a whole chapter
  // should not condense to the same three bullets.
  const size = syllabus
    ? "3 big idea lines, 5 terms and 3 watch out lines"
    : notes.length > 9000
      ? "8 big idea lines, 14 terms and 6 watch out lines"
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
