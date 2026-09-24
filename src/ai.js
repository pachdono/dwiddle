// Calls to our own serverless functions. The NVIDIA key is never here; it
// lives only on the server, so nothing in this file can leak it.

import { tidyQuestion, tidyMath } from "./mathText.js";

const TRANSIENT = new Set([429, 502, 503, 504]);

// The free models fail intermittently: busy, slow, occasionally malformed. One
// quiet retry turns most of those into a success rather than an error the
// person has to act on.
// On the web these are same origin. Inside the desktop app the pages are
// loaded from disk, so there is no origin to be relative to and the calls have
// to name the deployment explicitly.
const API = (typeof window !== "undefined" && window.DWIDDLE_API) || "";

async function post(path, body, attempt = 0) {
  let reply;
  try {
    reply = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  let data = null;
  try {
    data = await reply.json();
  } catch {
    // A non JSON body means the function itself fell over.
  }

  if (!reply.ok && TRANSIENT.has(reply.status) && attempt === 0) {
    await new Promise((r) => setTimeout(r, 1200));
    return post(path, body, 1);
  }

  if (!reply.ok) {
    if (reply.status === 504 || (reply.status === 502 && !data)) {
      throw new Error("That took too long and the server gave up. The model was probably slow. Try again, and it usually goes through second time.");
    }
    if (reply.status === 503) {
      throw new Error(data?.error || "The free model service is busy. Wait a minute and try again.");
    }
    if (reply.status === 404) {
      throw new Error("The AI endpoints are not running. They only exist when the app is served by Vercel, so use vercel dev locally.");
    }
    throw new Error(data?.error || `The server returned ${reply.status}`);
  }
  return data;
}

// However the model chose to write its maths, it is printed the same way
// as everything else.
function tidyMaterial(data) {
  if (!data || typeof data !== "object") return data;
  const sheet = data.sheet && typeof data.sheet === "object"
    ? { ...data.sheet, parts: Array.isArray(data.sheet.parts) ? data.sheet.parts.map(tidyPart) : data.sheet.parts }
    : data.sheet;
  return {
    ...data,
    questions: Array.isArray(data.questions) ? data.questions.map(tidyQuestion) : data.questions,
    sheet,
  };
}

function tidyPart(p) {
  if (typeof p === "string") return tidyMath(p);
  if (!p || typeof p !== "object") return p;
  return { ...p, text: tidyMath(p.text), definition: tidyMath(p.definition) };
}

// A plan of the topics first, then the questions and the full notes for a
// few topics at a time, several calls running at once. One call writing all of
// it for a whole chapter ran past the time a function is allowed; these parts
// each finish well inside it.
const Q_BATCH = 3; // topics per call for questions
const AT_ONCE = 5; // calls in flight together

// Longer sources get fewer topics per notes call, since complete notes run
// about as long as the source itself.
const notesBatch = (length) => (length > 12000 ? 1 : length > 5000 ? 2 : 3);

async function pool(tasks, size) {
  const out = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, tasks.length) }, async () => {
    while (next < tasks.length) {
      const n = next++;
      out[n] = await tasks[n]();
    }
  }));
  return out;
}

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

// Notes blocks carry maths and inline marks. The maths is tidied; the marks
// are left exactly as they are.
function tidyBlock(b) {
  if (b.term) return { term: tidyMath(b.term), def: tidyMath(b.def) };
  if (b.list) return { list: b.list.map(tidyMath) };
  const [k, v] = Object.entries(b)[0];
  return { [k]: tidyMath(v) };
}

function notesTasks(text, topics) {
  return chunk(topics, notesBatch(text.length)).map((batch) => async () => {
    try {
      const d = await post("/api/generate", { notes: text, mode: "notes", topics: batch.map((t) => ({ name: t.name })) });
      return d.sections || [];
    } catch {
      // A missing section is written again later from the Notes page. It is
      // not worth losing the questions over.
      return [];
    }
  });
}

const toNotes = (sectionLists) => Object.fromEntries(
  sectionLists.flat().map((sec) => [sec.topic, sec.blocks.map(tidyBlock)]),
);

export async function generateFromNotes(notes) {
  const plan = await post("/api/generate", { notes, mode: "plan" });
  const topics = plan.topics || [];

  const questionTasks = chunk(topics, Q_BATCH).map((batch, n) => () =>
    post("/api/generate", {
      notes,
      mode: "questions",
      batch: n,
      topics: batch.map((t) => ({ name: t.name, large: t.large })),
    }));
  const noteTasks = notesTasks(notes, topics);

  const results = await pool([...questionTasks, ...noteTasks], AT_ONCE);
  const parts = results.slice(0, questionTasks.length);
  const sections = results.slice(questionTasks.length);

  const questions = parts.flatMap((p) => p.questions || []);
  const counts = {};
  questions.forEach((q) => { counts[q.topic] = (counts[q.topic] || 0) + 1; });

  return tidyMaterial({
    title: plan.title,
    topics: topics.map(({ id, name, reason }) => ({ id, name, reason, questions: counts[name] || 0 })),
    questions,
    notes: toNotes(sections),
    sheet: null,
  });
}

// Full notes for topics that do not have them yet: material made before full
// notes existed, or a batch that failed the first time.
export async function writeNotes(text, topics) {
  return toNotes(await pool(notesTasks(text, topics), AT_ONCE));
}

// No notes needed: the course, subject and syllabus topic are the brief.
export const generateFromSyllabus = ({ course, subject, topic }) =>
  post("/api/generate", { syllabus: { course, subject, topic } }).then(tidyMaterial);

export const gradeWriting = ({ answer, prompt, rubric, criteria, scale }) =>
  post("/api/grade", { answer, prompt, rubric, criteria, scale });

// Fresh questions for a test section, written to that section's style.
export const generateTestQuestions = ({ test, section, skills, count, passage, audio, avoid }) =>
  post("/api/testgen", { test, section, skills, count, passage, audio, avoid });

// Emails a copy of feedback. Storing it is the client's job; this only notifies.
export const notifyFeedback = (payload) => post("/api/feedback", payload);

// A photograph or scan is transcribed on the server by a model that reads
// images, and the text then goes through generateFromNotes like anything else.
export const readImage = (image) => post("/api/read", { image });

// One topic taught as a sequence of cards, with two checks at the end.
export const generateLesson = ({ topic, others, notes, syllabus, context }) =>
  post("/api/lesson", { topic, others, notes, syllabus, context }).then((d) => ({
    ...d,
    cards: (d.cards || []).map((c) => ({
      heading: tidyMath(c.heading),
      body: tidyMath(c.body),
      example: tidyMath(c.example),
      points: (c.points || []).map((p) => ({ lead: tidyMath(p.lead), text: tidyMath(p.text) })),
    })),
    checks: (d.checks || []).map(tidyQuestion),
  }));

// One question, worked through. Everything that comes back is prose or
// working, so all of it goes through the maths tidier rather than a chosen
// field or two.
export const solveProblem = (problem) =>
  post("/api/solve", { problem }).then((d) => ({
    ...d,
    title: tidyMath(d.title),
    asked: tidyMath(d.asked),
    answer: tidyMath(d.answer),
    idea: tidyMath(d.idea),
    check: tidyMath(d.check),
    watch: (d.watch || []).map(tidyMath),
    steps: (d.steps || []).map((st) => ({
      do: tidyMath(st.do),
      work: tidyMath(st.work),
      why: tidyMath(st.why),
    })),
    similar: d.similar
      ? { q: tidyQuestion(d.similar.q), answer: tidyMath(d.similar.answer) }
      : null,
  }));
