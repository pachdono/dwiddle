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
- Order the topics as the notes do.
- "large" is true when the notes say a lot about that topic.
${STYLE}`;

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
      "why": "two sentences: why the right answer is right, and why the most tempting wrong one is wrong"
    }
  ]
}

Rules:
- Write questions only for the topics you are given, and nothing on any other part of the notes.
- 3 questions for each topic, 4 when it is marked large.
- 4 choices each; "answer" is the index of the correct one. The wrong options must be believable.
- Every "q" is a full question a student could answer without guessing what is being asked. For a vocab question write "What is meant by the term demand curve?" or "Define opportunity cost.", never the bare term on its own.
- "why" must teach something, not restate the answer. Two sentences, no more.
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
        { "watch": "a common mistake or exam trap" }
      ]
    }
  ]
}

Marking, inside any text:
- {def|...} around wording to learn word for word, usually the core of a definition.
- {key|...} around a fact, figure, name or date to memorise.
- {exam|...} around the part of a "watch" block where marks are lost.

Rules:
- Write a section for each topic you are given, in that order, and nothing on any other part of the source.
- Include EVERY fact, definition, figure, date, name, formula, list item, reason, advantage, disadvantage and example that the source gives for these topics. Nothing may be left out. If the source lists four things, all four appear.
- Do not summarise or shorten. Reorganise for clarity instead: put each definition in a "term" block, turn anything the source lists into a "list", and break long passages up under subheadings.
- Keep the source's own wording for definitions, marked with {def|...}.
- Add a "watch" block only where the source makes a common mistake or a distinction clear.
${STYLE}`;

// Never trust the shape that comes back. Anything malformed is dropped rather
// than allowed into the app, where it would break a quiz halfway through.
function cleanQuestions(list, allowed, prefix) {
  return (Array.isArray(list) ? list : [])
    .filter((q) => q && typeof q.q === "string" && Array.isArray(q.choices) && q.choices.length >= 2)
    .filter((q) => !allowed || allowed.includes(String(q.topic)))
    .map((q, i) => ({
      id: `${prefix}${i}`,
      topic: String(q.topic || allowed?.[0] || "General"),
      kind: ["vocab", "concept", "process"].includes(q.kind) ? q.kind : "concept",
      q: String(q.q),
      ...(q.kind === "vocab" && q.term ? { term: String(q.term) } : {}),
      choices: q.choices.map(String),
      answer: Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length ? q.answer : 0,
      why: String(q.why || ""),
    }));
}

function sheetSize(length) {
  return length > 9000 ? "6 big idea lines, 10 terms and 5 watch out lines"
    : length > 4000 ? "6 big idea lines, 10 terms and 5 watch out lines"
    : "4 big idea lines, 7 terms and 4 watch out lines";
}

async function part(req, res, mode, notes) {
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
      .filter((t) => t && t.name).slice(0, 4)
      .map((t) => ({ name: String(t.name).slice(0, 160), large: !!t.large }));
    if (!topics.length) return userError(res, 400, "Which topics should the questions cover?");
    const names = topics.map((t) => t.name);
    const list = topics.map((t) => `- ${t.name}${t.large ? " (large)" : ""}`).join("\n");
    const text = await ask({
      system: QUESTIONS,
      user: `Write questions for these topics only:\n${list}\n\nThe notes:\n\n${notes}`,
      maxTokens: 2600,
      json: true,
      temperature: 0.3,
    });
    const data = safeParse(text, "questions");
    const prefix = `ai${String(req.body?.batch ?? 0).replace(/[^0-9]/g, "")}q`;
    const questions = cleanQuestions(data?.questions, names, prefix);
    if (questions.length === 0) return userError(res, 502, "The model returned no usable questions. Try again.");
    return res.status(200).json({ questions });
  }

  if (mode === "notes") {
    const names = (Array.isArray(req.body?.topics) ? req.body.topics : [])
      .map((t) => String(t?.name || t || "").slice(0, 160)).filter(Boolean).slice(0, 4);
    if (!names.length) return userError(res, 400, "Which topics should the notes cover?");
    const text = await ask({
      system: NOTES,
      user: `Write the complete notes for these topics only:\n${names.map((n) => `- ${n}`).join("\n")}\n\nThe source:\n\n${notes}`,
      maxTokens: 3400,
      json: true,
      temperature: 0.2,
    });
    const data = safeParse(text, "sections");
    const KINDS = ["h", "p", "list", "term", "eg", "watch"];
    const sections = (Array.isArray(data?.sections) ? data.sections : [])
      .filter((sec) => sec && names.includes(String(sec.topic)) && Array.isArray(sec.blocks))
      .map((sec) => ({
        topic: String(sec.topic),
        blocks: sec.blocks
          .filter((b) => b && typeof b === "object" && KINDS.some((k) => k in b))
          .map((b) => {
            if (b.term) return { term: String(b.term), def: String(b.def || "") };
            if (Array.isArray(b.list)) return { list: b.list.map(String).filter(Boolean) };
            const kind = KINDS.find((k) => typeof b[k] === "string" && b[k].trim());
            return kind ? { [kind]: String(b[kind]) } : null;
          })
          .filter(Boolean),
      }))
      .filter((sec) => sec.blocks.length);
    if (!sections.length) return userError(res, 502, "The notes did not come back complete. Try again.");
    return res.status(200).json({ sections });
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
  // A generation from notes is now several calls arriving together, a plan
  // then up to four at once, so the allowance per minute is higher to match.
  if (!allow(req, res, { limit: 16 })) return;

  const syllabus = req.body?.syllabus;
  const notes = String(req.body?.notes || "").trim();
  const mode = req.body?.mode;

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
