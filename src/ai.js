// Calls to our own serverless functions. The NVIDIA key is never here; it
// lives only on the server, so nothing in this file can leak it.

import { tidyQuestion, tidyMath } from "./mathText.js";
import { levelForAI } from "./level.js";
import { cleanSketch } from "./sketch.js";

const TRANSIENT = new Set([429, 502, 503, 504]);

// The free models fail intermittently: busy, slow, occasionally malformed. One
// quiet retry turns most of those into a success rather than an error the
// person has to act on.
// On the web these are same origin. Inside the desktop app the pages are
// loaded from disk, so there is no origin to be relative to and the calls have
// to name the deployment explicitly.
const API = (typeof window !== "undefined" && window.DWIDDLE_API) || "";

async function post(path, body, { retry = true } = {}, attempt = 0) {
  let reply;
  try {
    reply = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: levelForAI() || undefined, ...body }),
    });
  } catch {
    // A dropped connection or a function still starting up: worth one more go.
    if (retry && attempt < 1) {
      await new Promise((r) => setTimeout(r, 1500));
      return post(path, body, { retry }, attempt + 1);
    }
    throw Object.assign(new Error("Could not reach the server. Check your connection and try again."), { status: 0 });
  }

  let data = null;
  try {
    data = await reply.json();
  } catch {
    // A non JSON body means the function itself fell over.
  }

  // A spent daily allowance is not transient, so it is not retried. Anything
  // else that failed on the server (a slow model, an answer that came back
  // broken) usually works on the next go, which is what people found
  // themselves doing by pressing the button again, so it is done for them,
  // once. More than that piles up behind a busy provider and only makes the
  // wait longer.
  const serverSide = reply.status >= 500;
  if (retry && !reply.ok && serverSide && attempt < 1 && !data?.limit && reply.status !== 404) {
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    return post(path, body, { retry }, attempt + 1);
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
const AT_ONCE = 8; // calls in flight together

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
  if (b.sketch) return { sketch: cleanSketch(b.sketch) || {} };
  if (b.term) return { term: tidyMath(b.term), def: tidyMath(b.def) };
  if (b.list) return { list: b.list.map(tidyMath) };
  if (b.table) return { table: { head: b.table.head.map(tidyMath), rows: b.table.rows.map((r) => r.map(tidyMath)) } };
  if (b.flow) return { flow: { ...b.flow, title: tidyMath(b.flow.title), steps: b.flow.steps.map(tidyMath) } };
  const [k, v] = Object.entries(b)[0];
  return { [k]: tidyMath(v) };
}

// Staff and testers get features still being tried out, like tables,
// diagrams and pictures in notes. Set by the app once it knows who is here.
let early = false;
export const setEarlyAccess = (on) => { early = !!on; };
export const earlyAccess = () => early;

// onTopics(n) is told how many topics each batch covered once it is back.
function notesTasks(text, topics, onTopics) {
  return chunk(topics, notesBatch(text.length)).map((batch) => async () => {
    try {
      const d = await post("/api/generate", { notes: text, mode: "notes", rich: early, topics: batch.map((t) => ({ name: t.name })) });
      return d.sections || [];
    } catch {
      // A missing section is written again later from the Notes page. It is
      // not worth losing the questions over.
      return [];
    } finally {
      onTopics?.(batch.length);
    }
  });
}

const toNotes = (sectionLists) => Object.fromEntries(
  sectionLists.flat().map((sec) => [sec.topic, sec.blocks.map(tidyBlock)]),
);

// The transcript of a YouTube video, to build material from.
// The installed app reads locally; the website uses its server-side reader.
export async function readYouTube(url) {
  const lang = (navigator.language || "en").slice(0, 2);
  if (typeof window !== "undefined" && window.DWIDDLE_YT) {
    const r = await window.DWIDDLE_YT.read(url, lang);
    if (r?.error) throw new Error(r.error);
    return r;
  }
  // A retry may spend another transcript credit. Leave retries to the user.
  return post("/api/youtube", { url, lang }, { retry: false });
}

// A narrated explainer video, as scenes the app animates: from a worked
// solution ({ solution, problem }) or one topic of notes ({ topic, notes }).
// The question's own diagram, drawn once: { figure, diagram } or { figure: null }.
export const drawQuestion = (source) => post("/api/video", { ...source, mode: "figure" }, { retry: false }).catch(() => ({ figure: null }));

export const writeVideo = (source) => post("/api/video", source).then((v) => ({
  ...v,
  scenes: v.scenes.map((sc) => ({ ...sc, board: sc.board.map((b) => ({ ...b, text: tidyMath(b.text) })) })),
}));

// The research browser beside the notebook: search, open a page (live when
// it allows it, else as a reader view), or fetch a picture to add.
export const browse = (action, body) => post("/api/browse", { action, ...body }, { retry: false });

// A two duck podcast script about a set of notes.
export const writePodcast = (notes) =>
  post("/api/generate", { notes, mode: "podcast" }).then((d) => ({
    title: d.title, lines: (d.lines || []).map((l) => ({ ...l, text: tidyMath(l.text) })),
  }));

// A turn of the conversation with Dwiddle about what is on screen.
// "Explain like I'm 4" as a few tiny picture cards: { cards: [{ pic, text }], word, means }.
export const explainLikeFour = (context) =>
  post("/api/chat", { mode: "four", context, messages: [{ role: "user", content: "Explain this like I'm four." }] });

export const chatWithDwiddle = (context, messages, { mode } = {}) =>
  post("/api/chat", { context, messages, ...(mode ? { mode } : {}) }).then((d) => tidyMath(d.reply));

// Dwiddle as a helper: { reply, actions } where the actions are proposals the
// app checks (agent.js) before running any of them.
export const askAgent = (context, state, messages) =>
  post("/api/chat", { context, state, messages, mode: "agent" }).then((d) => ({ reply: tidyMath(d.reply), actions: Array.isArray(d.actions) ? d.actions : [] }));

// Whether a short input is a request to study something, and if it is unclear,
// the one or two questions worth asking before writing anything.
export const clarify = (text) => post("/api/generate", { notes: text, mode: "clarify" });

// Study notes written on a requested topic, which then go through the same
// pipeline as notes someone pasted.
export const writeBrief = (text, answers) =>
  post("/api/generate", { notes: text, mode: "brief", answers }).then((d) => d.notes);

// Revision notes for one topic of a real syllabus, written first so a course
// topic is built the same way as your own notes, not from a one line prompt.
export const writeSyllabusNotes = (syllabus) =>
  post("/api/generate", { mode: "syllabus", syllabus }).then((d) => d.notes);

// A practice paper written in a board's past paper style, and the marking of
// its written answers against the paper's own mark scheme.
// A long paper is written in parts at the same time, each on its own share
// of the topics, and put together in order.
export async function writePastPaper(syllabus, topics, count, onProgress) {
  const parts = Math.max(1, Math.ceil(count / 10));
  const share = Array.from({ length: parts }, (_, i) => topics.filter((_, k) => k % parts === i));
  let done = 0;
  const results = await pool(share.map((ts, i) => () =>
    post("/api/generate", { mode: "pastpaper", syllabus, topics: ts.length ? ts : topics, count: Math.round(count / parts), part: i + 1, parts })
      .then((d) => { onProgress?.(++done / parts); return d; })
      .catch(() => { onProgress?.(++done / parts); return null; })), 3); // one part failing still leaves a paper
  const questions = results.flatMap((d, i) => (d?.questions || []).map((q, k) => ({
    ...q, id: `pp${i}-${k}`, stem: tidyMath(q.stem), options: q.options?.map(tidyMath), scheme: q.scheme.map(tidyMath), model: tidyMath(q.model),
  })));
  if (questions.length < 3) throw new Error("The paper did not come back complete. Try again.");
  return { title: results[0]?.title || "Practice paper", questions };
}
export const markPastPaper = (items) => post("/api/generate", { mode: "markpaper", items }).then((d) => d.results);

export async function generateFromNotes(notes, { style = "", onProgress } = {}) {
  onProgress?.(0.03);
  const plan = await post("/api/generate", { notes, mode: "plan" });
  const topics = plan.topics || [];
  onProgress?.(0.15);

  // A batch of questions that fails costs those questions, not the whole
  // material: the notes and the other batches still arrive.
  const questionTasks = chunk(topics, Q_BATCH).map((batch, n) => () =>
    post("/api/generate", {
      notes,
      mode: "questions",
      style,
      batch: n,
      topics: batch.map((t) => ({ name: t.name, large: t.large })),
    }).catch(() => null));
  const noteTasks = notesTasks(notes, topics);

  const all = [...questionTasks, ...noteTasks];
  let finished = 0;
  const results = await pool(all.map((t) => async () => { const r = await t(); onProgress?.(0.15 + 0.8 * (++finished / all.length)); return r; }), AT_ONCE);
  const parts = results.slice(0, questionTasks.length);
  // Batches that failed are tried once more, one at a time, once the rush is
  // over, so a busy moment does not leave a topic with no questions.
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i]) parts[i] = await questionTasks[i]();
    if (!parts[i]) parts[i] = { questions: [] };
  }
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

// A longer quiz than the material has questions for: new ones written in the
// style of the ones already there, each testing the same idea with different
// numbers or examples, so the answer changes and nothing is a repeat.
const plainText = (t) => String(t || "").replace(/\{(?:def|key|exam|word)\|([^{}|]*)(?:\|[^{}]*)?\}/g, "$1");
function notesText(made, names) {
  return names.map((name) => {
    const blocks = made?.notes?.[name] || [];
    const lines = blocks.map((b) => b.h || b.p || b.eg || b.watch || (b.term ? `${b.term}: ${b.def}` : "") || (b.list ? b.list.map((x) => `- ${x}`).join("\n") : "")).filter(Boolean);
    return `${name}\n${lines.map(plainText).join("\n")}`;
  }).join("\n\n");
}

// Questions for topics that have none (their batch failed when the material
// was made), written from the notes already saved for them.
export async function questionsFor(made, names) {
  const notes = notesText(made, names).slice(0, 20000);
  if (notes.length < 80) return [];
  const stamp = Date.now() % 1e6;
  const results = await pool(chunk(names, Q_BATCH).map((batch, n) => () =>
    post("/api/generate", { notes, mode: "questions", batch: `f${stamp}${n}`, topics: batch.map((name) => ({ name })) })
      .then((d) => d.questions || []).catch(() => [])), 3);
  return results.flat().map(tidyQuestion);
}

// Long answer questions (3 to 6 marks) with a mark scheme, written from the
// same notes. Quietly returns nothing if they cannot be written in time, so a
// quiz is never held up by them for long.
export async function longQuestions(made, names, count = 1, avoidMore = []) {
  const have = (made?.questions || []).filter((q) => names.includes(q.topic));
  if (!have.length) return [];
  let notes = notesText(made, names).slice(0, 20000);
  if (notes.length < 220) {
    const facts = have.map((q) => `${q.q} The answer is ${q.choices?.[q.answer] ?? ""}. ${q.why || ""}`.trim()).join("\n");
    notes = `${notes}\n\nFacts already established about these topics:\n${facts}`.slice(0, 20000);
  }
  const topics = names.slice(0, 4).map((name) => ({ name }));
  const avoid = [...have.map((q) => q.q.slice(0, 120)), ...avoidMore].slice(-20);
  const run = post("/api/generate", { notes, mode: "questions", depth: "long", topics, avoid, count, batch: `L${Date.now() % 1e6}` }).then((d) => d.questions || []).catch(() => []);
  const timeout = new Promise((r) => setTimeout(() => r([]), 40000));
  return Promise.race([run, timeout]);
}

// Whether a typed answer that does not match the expected one still means the
// same thing. Quick and quiet: if it cannot be asked in a few seconds, no.
export const judgeAnswer = ({ q, answer, accept, given }) => Promise.race([
  post("/api/generate", { mode: "judge", q, answer, accept, given }, { retry: false }).then((d) => d?.correct === true),
  new Promise((r) => setTimeout(() => r(false), 9000)),
]);

export const markLong = (q, answer) =>
  post("/api/generate", { mode: "markpaper", items: [{ stem: q.q, marks: q.marks, scheme: q.scheme, answer }] }).then((d) => d.results?.[0]);

export async function moreQuestions(made, names, count, avoidMore = [], level = "") {
  const have = (made?.questions || []).filter((q) => names.includes(q.topic));
  if (!have.length || count < 1) return [];
  let notes = notesText(made, names).slice(0, 20000);
  // Material made from a past paper has questions and answers but hardly any
  // notes, and the writer refuses to work from a few lines. What the questions
  // and their explanations already establish is the material then.
  if (notes.length < 220) {
    const facts = have.map((q) => `${q.q} The answer is ${q.choices?.[q.answer] ?? ""}. ${q.why || ""}`.trim()).join("\n");
    notes = `${notes}\n\nFacts already established about these topics (write about the same subject, from different angles):\n${facts}`.slice(0, 20000);
  }
  // Small batches: one call writing ten questions was often too slow for the
  // free models and came back with nothing, so a longer quiz stayed at three.
  // Four at a time finish quickly, run side by side, and a batch that fails is
  // tried once more.
  const BATCH = 4;
  // everything already asked is passed along, so new questions are about other facts
  const avoid = [...have.map((q) => q.q.slice(0, 90)), ...avoidMore].slice(-55);
  const calls = Math.ceil(count / BATCH);
  const stamp = Date.now() % 1e6;
  let lastError = "";
  const results = await pool(Array.from({ length: calls }, (_, n) => async () => {
    const want = Math.min(BATCH, count - n * BATCH);
    const like = Array.from({ length: want }, (_, k) => have[(n * BATCH + k) % have.length])
      .map(({ q, choices, topic }) => ({ q, choices, topic }));
    const topics = [...new Set(like.map((q) => q.topic))].map((name) => ({ name }));
    for (let tries = 0; tries < 2; tries++) {
      // the second go drops the "in the style of" part, which is the plain way
      // questions were first made and is the likelier to come back
      const got = await post("/api/generate", { notes, mode: "questions", topics, ...(tries === 0 ? { like } : {}), avoid, ...(level ? { depth: level } : {}), count: want, batch: `${stamp}${n}${tries}` })
        .then((d) => d.questions || []).catch((e) => { lastError = e?.message || "the request failed"; return []; });
      if (got.length) return got;
    }
    return [];
  }), 3);
  const out = results.flat().map(tidyQuestion);
  out.error = out.length ? "" : lastError;
  return out;
}

// One batch of vocabulary words for a deck: a tier of difficulty and half of the
// alphabet, so batches written at the same time never repeat each other.
export const vocabWords = ({ tier, half, count, exam }) =>
  post("/api/generate", { mode: "vocab", tier, half, count, exam }).then((d) => d.words || []);

// A skill check: one topic, tested skill by skill. The writer works out the
// skills in the topic and decides how many questions it takes to cover them all,
// so nothing here says how many. Throws an error with something to show.
export async function skillCheck(made, topic) {
  let notes = notesText(made, [topic]).slice(0, 20000);
  const have = (made?.questions || []).filter((q) => q.topic === topic);
  if (notes.length < 220) {
    const facts = have.map((q) => `${q.q} The answer is ${q.choices?.[q.answer] ?? ""}. ${q.why || ""}`.trim()).join("\n");
    notes = `${notes}\n\nFacts already established about this topic:\n${facts}`.slice(0, 20000);
  }
  if (notes.length < 220) throw new Error("There are not enough notes on that topic to check it yet. Open it in Learn first.");
  const d = await post("/api/generate", { notes, mode: "skillcheck", topics: [{ name: topic }], batch: Date.now() % 1e6 });
  return { topic: d.topic || topic, skills: Array.isArray(d.skills) ? d.skills : [], questions: (d.questions || []).map(tidyQuestion) };
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

// A source too big for one go (twenty files, a whole textbook) is boiled down
// first, chunk by chunk and side by side, into a dense digest that keeps every
// fact, then everything is built from the digest in one go. That is quicker
// than working through it a part a minute, and nothing past page forty five
// is left out. onProgress(done, of) is told as chunks come back.
const CHUNK = 20000, DIGEST_CAP = 23000, MAX_CHUNKS = 48;
export async function condenseSource(text, { onProgress } = {}) {
  let current = String(text || "").trim();
  for (let round = 0; round < 3 && current.length > DIGEST_CAP; round++) {
    const parts = splitSource(current, CHUNK).slice(0, MAX_CHUNKS);
    let done = 0;
    const digests = await pool(parts.map((part, i) => async () => {
      let out = "";
      for (let tries = 0; tries < 3 && !out; tries++) {
        out = await post("/api/generate", { notes: part, mode: "condense" }, { retry: false }).then((d) => d.digest).catch(async (e) => {
          if (e?.limit) throw e;
          await new Promise((r) => setTimeout(r, 2500 * (tries + 1)));
          return "";
        });
      }
      onProgress?.(++done, parts.length, round);
      // a chunk that could not be summarised keeps its opening rather than vanishing
      return out || part.slice(0, 3500);
    }), 4);
    current = digests.join("\n\n");
  }
  return current.length > DIGEST_CAP + 1000 ? current.slice(0, DIGEST_CAP + 1000) : current;
}

// Full notes for topics that do not have them yet: material made before full
// notes existed, or a batch that failed the first time.
export async function writeNotes(text, topics, { onTopics } = {}) {
  return toNotes(await pool(notesTasks(text, topics, onTopics), AT_ONCE));
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
// Sent with the sign in token, so the server can check who it is from.
export async function notifyFeedback(payload) {
  const { supabase } = await import("./supabase.js");
  const token = supabase ? (await supabase.auth.getSession()).data?.session?.access_token : null;
  const r = await fetch(API + "/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  });
  return r.json().catch(() => ({}));
}

// A photograph or scan is transcribed on the server by a model that reads
// images, and the text then goes through generateFromNotes like anything else.
export const readImage = (image) => post("/api/read", { image });
// Mistakes on a notebook page: { errors: [{ wrong, fix, why, kind, box }], summary }.
export const checkPage = (image, typed) => post("/api/read", { image, typed, mode: "check" }).then((d) => ({
  ...d, errors: (d.errors || []).map((e) => ({ ...e, wrong: tidyMath(e.wrong), fix: tidyMath(e.fix), why: tidyMath(e.why) })),
}));

// One topic taught as a sequence of cards, with two checks at the end.
export const generateLesson = ({ topic, others, notes, syllabus, context }) =>
  post("/api/lesson", { topic, others, notes, syllabus, context }).then((d) => ({
    ...d,
    figures: Array.isArray(d.figures) ? d.figures : [],
    cards: (d.cards || []).map((c) => ({
      ...(c.figure ? { figure: c.figure } : {}),
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

// A lesson whose checks lean on a graph or numbers it never showed is put
// right from its own text: the numbers go into the questions, or a graph is
// added. Returns the repaired lesson, or null if nothing could be done.
export async function repairLesson(lesson, topic, isBroken) {
  const broken = (lesson.checks || []).map((c, n) => ({ ...c, n })).filter((c) => !c.figure && isBroken(c));
  if (!broken.length) return null;
  const d = await post("/api/lesson", { mode: "repair", topic, cards: lesson.cards, checks: broken, nextFigure: (lesson.figures || []).length + 1 }, { retry: false });
  if (!d?.fixes?.length) return null;
  const figures = [...(lesson.figures || []), ...(d.figures || [])];
  const checks = (lesson.checks || []).map((c, n) => {
    const fx = d.fixes.find((f) => f.n === n);
    return fx ? { ...c, q: tidyMath(fx.q), ...(fx.figure ? { figure: fx.figure } : {}), fixed: true } : c;
  });
  return { ...lesson, figures, checks };
}

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
      say: tidyMath(st.say || ""),
      rule: tidyMath(st.rule || ""),
      lines: (st.lines || []).map(tidyMath),
      work: tidyMath(st.work),
      why: tidyMath(st.why),
    })),
    similar: d.similar
      ? { q: tidyQuestion(d.similar.q), answer: tidyMath(d.similar.answer) }
      : null,
  }));
