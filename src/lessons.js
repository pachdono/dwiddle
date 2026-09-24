// Where a lesson is taught from.
//
// A lesson is written from the notes its topic came from. Those notes are kept
// here, on this device only: a chapter is tens of kilobytes, the material that
// syncs to an account has a size limit, and twelve chapters would reach it.
// The finished lessons are small and do sync, so a lesson written once is
// there on every device afterwards.
//
// On a device without the notes, a topic that has not been taught yet still
// gets a lesson, written from the questions and summary that did sync.

import { load, save, KEYS } from "./store.js";
import { generateLesson } from "./ai.js";

const KEEP = 12; // sets of notes held at once

export function rememberSource(material, source) {
  if (!material?.topics?.length || !source) return;
  const store = load(KEYS.sources, { list: [], topics: {} });
  const id = `s${Date.now().toString(36)}`;
  const list = [...store.list, { id, ...source }].slice(-KEEP);
  const alive = new Set(list.map((s) => s.id));
  const topics = Object.fromEntries(
    Object.entries(store.topics).filter(([, sid]) => alive.has(sid)),
  );
  material.topics.forEach((t) => { topics[t.name] = id; });
  save(KEYS.sources, { list, topics });
}

function sourceFor(topicName) {
  const store = load(KEYS.sources, { list: [], topics: {} });
  const id = store.topics[topicName];
  return store.list.find((s) => s.id === id) || null;
}

// A sheet line is a string, or an array of marked segments, or occasionally a
// single segment. All three flatten to the words.
const flat = (x) => Array.isArray(x) ? x.map(flat).join("")
  : typeof x === "string" ? x
  : x && typeof x === "object" ? String(x.t ?? "") : "";

function sheetText(sheet) {
  const big = (sheet.big || []).map(flat).filter(Boolean);
  const terms = (sheet.terms || []).filter((t) => t && t.t).map((t) => `${t.t}: ${flat(t.d)}`);
  const watch = (sheet.watch || []).map(flat).filter(Boolean);
  return [...big, ...terms, ...watch].join("\n");
}

// What the questions and the sheet say, as plain text, for a topic whose notes
// are not on this device.
function contextFor(made, topicName) {
  // Full notes for the topic are the best stand in for the original, since they
  // carry everything it said. Failing those, the questions and the old sheet.
  const blocks = made?.notes?.[topicName];
  if (blocks?.length) {
    return blocks.map((b) => b.term ? `${b.term}: ${b.def}` : b.list ? b.list.join("\n") : Object.values(b)[0])
      .join("\n").replace(/\{(?:def|key|exam)\|([^{}]*)\}/g, "$1");
  }
  const qs = (made?.questions || []).filter((q) => q.topic === topicName);
  const lines = qs.map((q) =>
    `Q: ${q.q}\nA: ${q.choices?.[q.answer] ?? ""}\nWhy: ${q.why || ""}`);
  const sheet = made?.sheet ? sheetText(made.sheet) : "";
  return [lines.join("\n\n"), sheet].filter(Boolean).join("\n\nSummary sheet:\n");
}

export async function writeLesson(made, topicName) {
  const others = (made?.topics || []).map((t) => t.name).filter((n) => n !== topicName);
  const source = sourceFor(topicName);
  if (source?.notes) return generateLesson({ topic: topicName, others, notes: source.notes });
  if (source?.syllabus) return generateLesson({ topic: topicName, others, syllabus: source.syllabus });
  return generateLesson({ topic: topicName, others, context: contextFor(made, topicName) });
}

// The original notes for a set of topics, grouped by the notes they came from,
// so topics that lost their full notes can have them written again. Only
// pasted and uploaded material qualifies: a syllabus topic has no source text
// to be complete about.
export function sourcesFor(topicNames) {
  const store = load(KEYS.sources, { list: [], topics: {} });
  const groups = new Map();
  topicNames.forEach((name) => {
    const src = store.list.find((s) => s.id === store.topics[name]);
    if (!src?.notes) return;
    if (!groups.has(src.id)) groups.set(src.id, { notes: src.notes, topics: [] });
    groups.get(src.id).topics.push(name);
  });
  return [...groups.values()];
}
