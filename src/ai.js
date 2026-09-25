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
    throw Object.assign(new Error("Could not reach the server. Check your connection and try again."), { status: 0 });
  }

  let data = null;
  try {
    data = await reply.json();
  } catch {
    // A non JSON body means the function itself fell over.
  }

  // A spent daily allowance is not transient, so it is not retried.
  if (!reply.ok && TRANSIENT.has(reply.status) && attempt === 0 && !data?.limit) {
    await new Promise((r) => setTimeout(r, 1200));
    return post(path, body, 1);
  }

  if (!reply.ok) {
    const fail = (message) => Object.assign(new Error(message), { status: reply.status, limit: !!data?.limit });
    if (reply.status === 504 || (reply.status === 502 && !data)) {
      throw fail("That took too long and the server gave up. The model was probably slow. Try again, and it usually goes through second time.");
    }
    if (reply.status === 503) {
      throw fail(data?.error || "The free model service is busy. Wait a minute and try again.");
    }
    if (reply.status === 404) {
      throw fail("The AI endpoints are not running. They only exist when the app is served by Vercel, so use vercel dev locally.");
    }
    throw fail(data?.error || `The server returned ${reply.status}`);
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

// The transcript of a YouTube video, to build material from.
// In the installed app it is read on the person's own connection; YouTube
// refuses the website's server, so there the message says what to do instead.
export async function readYouTube(url) {
  const lang = (navigator.language || "en").slice(0, 2);
  if (typeof window !== "undefined" && window.DWIDDLE_YT) {
    const r = await window.DWIDDLE_YT.read(url, lang);
    if (r?.error) throw new Error(r.error);
    return r;
  }
  return post("/api/youtube", { url, lang });
}

// A turn of the conversation with Dwiddle about what is on screen.
export const chatWithDwiddle = (context, messages) =>
  post("/api/chat", { context, messages }).then((d) => tidyMath(d.reply));

// Whether a short input is a request to study something, and if it is unclear,
// the one or two questions worth asking before writing anything.
export const clarify = (text) => post("/api/generate", { notes: text, mode: "clarify" });

// Study notes written on a requested topic, which then go through the same
// pipeline as notes someone pasted.
export const writeBrief = (text, answers) =>
  post("/api/generate", { notes: text, mode: "brief", answers }).then((d) => d.notes);

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

// ---------- more than fits in one go ----------

// The most one call is given, a little under the server's own limit so a part
// never trips it. About ten pages of a textbook.
export const PART = 22000;
export const MAX_PARTS = 5; // about forty five pages; past that, split by chapter
export const pagesOf = (chars) => Math.max(1, Math.round(chars / 2400));

// Cuts a long source into parts at line and sentence breaks, never mid word
// where it can be helped. A PDF comes through as one line per page, so a part
// usually ends at the end of a page.
export function splitSource(text, cap = PART) {
  const clean = String(text || "").trim();
  if (clean.length <= cap) return [clean];
  const sentences = (line) => line.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [line];
  const hard = (piece) => piece.match(new RegExp(`[\\s\\S]{1,${cap}}`, "g"));
  const pieces = clean.split(/\n+/)
    .flatMap((line) => (line.length <= cap ? [line] : sentences(line)))
    .flatMap((piece) => (piece.length <= cap ? [piece] : hard(piece)));

  const parts = [];
  let cur = "";
  for (const piece of pieces) {
    if (cur && cur.length + piece.length + 1 > cap) { parts.push(cur); cur = ""; }
    cur += (cur ? "\n" : "") + piece;
  }
  if (cur) parts.push(cur);

  // A last part of a sentence or two makes a poor lesson and falls under the
  // server's minimum, so it joins the one before it.
  const last = parts[parts.length - 1];
  if (parts.length > 1 && last.length < 2000 && parts[parts.length - 2].length + last.length < 24000) {
    parts[parts.length - 2] += "\n" + parts.pop();
  }
  return parts;
}

// One part's material folded into the whole. Question ids are made unique per
// part, and a topic that carries on from one part into the next keeps one
// name, one set of notes and one count rather than appearing twice.
function mergeMaterial(into, part, n) {
  const tag = (id) => (n === 0 ? id : `p${n}-${id}`);
  const questions = part.questions.map((q) => ({ ...q, id: tag(q.id) }));
  if (!into) return { ...part, questions, topics: part.topics.map((t) => ({ ...t, id: tag(t.id) })) };

  const topics = into.topics.map((t) => ({ ...t }));
  part.topics.forEach((t) => {
    const same = topics.find((x) => x.name === t.name);
    if (same) same.questions += t.questions;
    else topics.push({ ...t, id: tag(t.id) });
  });
  const notes = { ...into.notes };
  Object.entries(part.notes || {}).forEach(([name, blocks]) => {
    notes[name] = [...(notes[name] || []), ...blocks];
  });
  return { ...into, topics, notes, questions: [...into.questions, ...questions] };
}

// Works through a long source a part at a time and returns it as one set of
// material.
//
// The AI service allows only so many calls a minute, and a part is about ten of
// them, so parts are paced a minute apart rather than fired back to back: run
// flat out, the third part of a test document was refused as busy. A part that
// is refused anyway waits and tries again. If it still cannot be done, the
// parts that finished are kept and the rest is handed back to be carried on
// with later, rather than minutes of finished work being thrown away over the
// last few pages.
//
// onPart hears about each part as it finishes, with the text it came from, so
// lessons for those topics can later be taught from that part alone. startAt
// numbers the parts when carrying on, so ids stay unique across both runs.
const PACE = 60000;
const RETRIES = [30000, 60000];
const busy = (err) => !err?.limit && [0, 429, 502, 503, 504].includes(err?.status);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export async function generateInParts(text, { onProgress, onPart, onWait, startAt = 0 } = {}) {
  const parts = splitSource(text).slice(0, MAX_PARTS);
  let whole = null;
  let started = 0;

  for (let n = 0; n < parts.length; n++) {
    const wait = started ? PACE - (Date.now() - started) : 0;
    if (wait > 0) { onWait?.(Math.ceil(wait / 1000), "pace"); await pause(wait); }
    started = Date.now();
    onProgress?.(n + 1, parts.length);

    let material = null;
    for (let attempt = 0; !material; attempt++) {
      try {
        material = await generateFromNotes(parts[n]);
      } catch (err) {
        if (!busy(err) || attempt >= RETRIES.length) {
          if (!whole) throw err; // nothing finished, so there is nothing to keep
          return { material: whole, done: n, rest: parts.slice(n).join("\n"), error: err.message };
        }
        onWait?.(RETRIES[attempt] / 1000, "busy");
        await pause(RETRIES[attempt]);
        onProgress?.(n + 1, parts.length);
      }
    }
    onPart?.(material, parts[n]);
    whole = mergeMaterial(whole, material, n + startAt);
  }
  return { material: whole, done: parts.length, rest: "", error: "" };
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
    checks: (d.checks || []).map((q) => q.type
      ? {
          ...q,
          q: tidyMath(q.q),
          ...(typeof q.answer === "string" ? { answer: tidyMath(q.answer) } : {}),
          ...(q.why ? { why: tidyMath(q.why) } : {}),
          ...(q.correction ? { correction: tidyMath(q.correction) } : {}),
          ...(q.points ? { points: q.points.map(tidyMath) } : {}),
          ...(q.items ? { items: q.items.map(tidyMath) } : {}),
          ...(q.pairs ? { pairs: q.pairs.map((p) => ({ a: tidyMath(p.a), b: tidyMath(p.b) })) } : {}),
        }
      : tidyQuestion(q)),
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
