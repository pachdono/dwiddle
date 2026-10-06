// What Dwiddle can do for the student, beyond answering.
//
// The chat model proposes actions ({ type: "notes", ... }); nothing it says is
// trusted. Each action is checked here and only the known kinds run, through
// handlers the App registers. Every action reports back what happened, so the
// chat can say what was done and what was not.

import { cleanSketch, cleanSvg } from "./sketch.js";
import { THEMES } from "./themes.js";
import { blockPlain } from "./marks.js";
import { askAgent } from "./ai.js";
import { load, save } from "./store.js";

let handlers = null;
export const setAgentHandlers = (h) => { handlers = h; };

const PAGES = ["home", "topics", "quiz", "chat", "sheet", "learn", "videos", "courses", "notebook", "upload", "library", "settings", "decks"];
const str = (v, n) => (typeof v === "string" ? v.replace(/[–—]/g, "-").trim().slice(0, n) : "");

// One notes block, checked and trimmed, or null.
export function cleanBlock(b) {
  if (!b || typeof b !== "object") return null;
  for (const k of ["h", "p", "eg", "watch"]) if (str(b[k], 1500)) return { [k]: str(b[k], 1500) };
  if (str(b.term, 100)) return { term: str(b.term, 100), def: str(b.def, 600) };
  if (Array.isArray(b.list)) { const list = b.list.map((x) => str(x, 400)).filter(Boolean).slice(0, 12); return list.length ? { list } : null; }
  if (b.table && Array.isArray(b.table.head) && Array.isArray(b.table.rows)) {
    const head = b.table.head.map((x) => str(x, 60)).slice(0, 5);
    const rows = b.table.rows.slice(0, 10).map((r) => (Array.isArray(r) ? head.map((_, i) => str(r[i], 120)) : null)).filter(Boolean);
    return rows.length && head.length > 1 ? { table: { head, rows } } : null;
  }
  if (b.flow && Array.isArray(b.flow.steps)) {
    const steps = b.flow.steps.map((x) => str(x, 160)).filter(Boolean).slice(0, 8);
    return steps.length >= 2 ? { flow: { title: str(b.flow.title, 100), steps, cycle: b.flow.cycle === true } } : null;
  }
  if (str(b.pic, 80)) return { pic: str(b.pic, 80) };
  if (b.sketch) { const s = cleanSketch(b.sketch); return s ? { sketch: s } : null; }
  return null;
}

// What the model is told about the app: where the student is, their notes with
// each block numbered so it can be changed, and the looks that exist.
// What Dwiddle has learned from earlier chats on this device: short lessons
// recorded when something went wrong and was put right, or when the student
// corrected it. They are given back to the model every time, so the same
// mistake is not made twice.
const MEMORY_KEY = "dwiddle-agent-memory";
const lessons = () => { const m = load(MEMORY_KEY, []); return Array.isArray(m) ? m : []; };
export function learn(note) {
  const text = str(note, 220);
  if (!text) return;
  const all = lessons().filter((l) => l.note !== text);
  save(MEMORY_KEY, [{ note: text, at: Date.now() }, ...all].slice(0, 20));
}

export function appState() {
  const st = handlers?.state?.() || {};
  const out = [`Page: ${st.page || "unknown"}.`, `Colour mode: ${st.theme || "system"}. Looks: ${THEMES.map((t) => t.id).join(", ")}. Current look: ${st.look || "classic"}.`];
  const made = st.made;
  if (made?.topics?.length) {
    out.push(`Study material: "${made.title || "untitled"}".`);
    for (const t of made.topics) {
      const blocks = made.notes?.[t.name] || [];
      out.push(`\n## ${t.name}${blocks.length ? "" : " (no notes yet)"}`);
      blocks.forEach((b, i) => { const text = blockPlain(b).replace(/\{(?:key|def|exam|word)\|([^}|]*)[^}]*\}/g, "$1").replace(/\s+/g, " ").slice(0, 160); if (text) out.push(`[${i}] ${text}`); });
    }
  } else out.push("No study material yet.");
  const memory = lessons().slice(0, 12).map((l) => "- " + l.note);
  const body = out.join("\n").slice(0, 7800);
  return memory.length ? `${body}\n\nLessons learned from earlier chats with this student (follow them):\n${memory.join("\n")}` : body;
}

// Runs one action. Returns { ok, text, art? } where art is something to show
// in the chat: { sketch } | { svg, caption } | { query } for a picture.
async function run(a, opts = {}) {
  const h = handlers;
  if (!h) return { ok: false, text: "Not ready yet" };
  switch (a.type) {
    case "go": {
      if (!PAGES.includes(a.page)) return { ok: false, text: "Unknown page" };
      h.go(a.page);
      return { ok: true, text: `Opened ${a.page === "quiz" ? "Practice" : a.page === "sheet" ? "Notes" : a.page === "upload" ? "Add material" : a.page}` };
    }
    case "theme": {
      if (!["light", "dark", "system"].includes(a.mode)) return { ok: false, text: "Unknown colour mode" };
      h.setTheme(a.mode);
      return { ok: true, text: `Switched to ${a.mode} mode` };
    }
    case "look": {
      const t = THEMES.find((x) => x.id === a.id);
      if (!t) return { ok: false, text: "Unknown look" };
      h.setLook(t.id);
      return { ok: true, text: `Changed the look to ${t.name}` };
    }
    case "make": {
      const text = str(a.text, 4000);
      if (!text) return { ok: false, text: "Nothing to make" };
      h.prefill(text);
      return { ok: true, text: "Filled in Add material" };
    }
    case "sketch": {
      const sketch = cleanSketch(a.sketch);
      if (!sketch) return { ok: false, text: "Could not draw that graph" };
      const art = { sketch };
      if (!a.topic && !opts.wantNotes) return { ok: true, text: "Drew a graph", art };
      const topic = h.bestTopic(String(a.topic || ""), `${sketch.title} ${sketch.x} ${sketch.y} ${opts.userText || ""}`);
      const put = topic && h.editNotes({ op: "insert", topic, at: 9999, block: { sketch } });
      const done = put?.name;
      return done ? { ok: true, notes: true, where: put, text: `Drew a graph and added it to ${done}`, art } : { ok: false, text: "Drew the graph but could not find where it goes in your notes", art };
    }
    case "draw": {
      const svg = cleanSvg(a.svg);
      if (!svg) {
        // A drawing that would not parse is replaced by a real picture rather than an apology.
        const query = str(a.query, 80);
        if (query) return { ok: true, text: "Found a picture", art: { query } };
        return { ok: false, text: "Could not draw that" };
      }
      return { ok: true, text: "Drew a picture", art: { svg, caption: str(a.caption, 80) } };
    }
    case "paint": {
      const prompt = str(a.prompt, 400);
      if (!prompt) return { ok: false, text: "Nothing to paint" };
      return { ok: true, text: "Made a picture", art: { paint: prompt, query: str(a.query, 80) } };
    }
    case "picture": {
      const query = str(a.query, 80);
      if (!query) return { ok: false, text: "No picture" };
      if (!opts.wantNotes) return { ok: true, text: "Found a picture", art: { query } };
      const topic = h.bestTopic(String(a.topic || ""), `${query} ${opts.userText || ""}`);
      const put = topic && h.editNotes({ op: "insert", topic, at: 9999, block: { pic: query } });
      const done = put?.name;
      return done ? { ok: true, notes: true, where: put, text: `Added a picture to ${done}`, art: { query } } : { ok: false, text: "Found a picture but could not find where it goes in your notes", art: { query } };
    }
    case "notes": {
      const op = a.op;
      if (!["insert", "replace", "remove"].includes(op)) return { ok: false, text: "Unknown change" };
      const block = op === "remove" ? null : cleanBlock(a.block);
      if (op !== "remove" && !block) return { ok: false, text: "That note block was not valid" };
      const at = Number.isInteger(a.at) ? a.at : parseInt(a.at, 10);
      if (!Number.isInteger(at) || at < 0) return { ok: false, text: "No place given" };
      const put = h.editNotes({ op, topic: h.bestTopic(String(a.topic || ""), "") || String(a.topic || ""), at, block });
      const done = put?.name;
      return done ? { ok: true, notes: true, where: op === "remove" ? null : put, text: `${op === "remove" ? "Removed a block from" : op === "replace" ? "Rewrote a block in" : "Added to"} ${done}` } : { ok: false, text: "Could not find that topic" };
    }
    default:
      return { ok: false, text: "Not something I can do yet" };
  }
}

export async function runActions(actions, opts = {}) {
  const results = [];
  for (const a of (Array.isArray(actions) ? actions : []).slice(0, 4)) {
    try { results.push(await run(a, opts)); } catch { results.push({ ok: false, text: "That did not work" }); }
  }
  return results;
}

// One turn of the conversation: ask, do, and check that what was said matches
// what happened. The model writes its reply before anything runs, so a reply
// like "I added it to your notes" is only believed if the notes really changed.
// When it did not, the model is told what happened and tries again, up to
// twice; if it still cannot, the student gets an honest, kind answer.
const IMAGE_ASK = /\b(image|picture|illustration|diagram|drawing|poster|photo)\b/i;
const IMAGE_FILLER = /\b(can|could|would|will)? ?you\b|\b(please|pls|generate|make|create|draw|show|give|get|me|an?|of|image|picture|illustration|diagram|drawing|poster|photo|i (want|need)|for)\b/gi;
export async function agentTurn(context, history) {
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content || "";
  const wantNotes = /\bnotes?\b/i.test(lastUser) && /\b(add|put|place|insert|save|include|show|in|on|to)\b/i.test(lastUser);
  const frustrated = /\b(didn'?t|did not|not (in|on|there)|wrong|again|still|doesn'?t|isn'?t)\b/i.test(lastUser);
  const kept = [];      // everything that worked, across tries
  let failed = [];      // what is still failing after the latest try
  let msgs = history;
  let reply = "";
  let fixedFrom = "";
  for (let round = 0; round < 3; round++) {
    const got = await askAgent(context, appState(), msgs);
    reply = got.reply;
    // Asked for a picture and the model did not choose to make one: make one.
    if (round === 0 && IMAGE_ASK.test(lastUser) && !got.actions.some((a) => ["paint", "draw", "picture", "sketch"].includes(a.type))) {
      const subject = lastUser.replace(IMAGE_FILLER, " ").replace(/\s+/g, " ").trim().slice(0, 300) || lastUser;
      got.actions = [...got.actions, { type: "paint", prompt: subject, query: subject.slice(0, 80) }];
    }
    const did = await runActions(got.actions, { wantNotes, userText: lastUser });
    kept.push(...did.filter((d) => d.ok || d.art));
    failed = did.filter((d) => !d.ok);
    const notesDone = kept.some((d) => d.notes);
    const claimed = /\bnotes?\b/i.test(reply) && /\b(added|put|inserted|updated|removed|fixed|changed|placed)\b/i.test(reply);
    const problems = [
      ...failed.map((d) => d.text),
      ...(wantNotes && !notesDone ? ["The student asked for it to be in their notes and nothing in the notes changed."] : []),
      ...(claimed && !notesDone ? ["Your reply says the notes changed but they did not."] : []),
    ];
    if (!problems.length) {
      if (fixedFrom) learn(`When asked to put something in the notes, use "notes" or a sketch with "topic" set to a topic name exactly as listed (for example "${fixedFrom}").`);
      if (frustrated) learn("Check that the app really did something before saying it did. If it did not, say sorry kindly and try a simpler way.");
      return { reply, did: dedupe(kept) };
    }
    const names = (appState().match(/^## .*/gm) || []).join(", ").replace(/## /g, "");
    msgs = [...msgs, { role: "assistant", content: reply }, { role: "user", content: `[App report, not written by the student] That did not work: ${problems.join(" ")} The topics in their notes are: ${names || "none yet"}. Try once more with the right action, using a topic name exactly as listed. If you truly cannot, say sorry the way a kind teacher would, say plainly what did not happen, and suggest a simpler way to do it. Never say it is done unless an action did it.` }];
    fixedFrom = names.split(", ")[0] || "";
  }
  learn("A change to the notes failed even after retrying; ask the student which topic they mean instead of guessing.");
  const sorry = failed.length || /\bnotes?\b/i.test(lastUser)
    ? "Sorry, I couldn't get that into your notes just now. Let's try a simpler way: tell me which topic it belongs in, for example the topic's exact name, and I'll put it straight there. The graph is above if you want to look at it in the meantime."
    : "Sorry, that didn't work. Let's try a simpler way: tell me in one short sentence what you'd like and I'll do just that.";
  return { reply: sorry, did: dedupe(kept) };
}
const dedupe = (list) => list.filter((d, i) => list.findIndex((x) => x.text === d.text) === i);
