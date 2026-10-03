// Run with: node --test --experimental-test-module-mocks scripts/agent.test.mjs
// Dwiddle's helper: a reply is only believed when the app really did it.
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const store = {};
mock.module("../src/store.js", { namedExports: { load: (k, f) => store[k] ?? f, save: (k, v) => { store[k] = v; }, loadSession: (k, f) => f, saveSession: () => {} } });
const replies = [];
mock.module("../src/ai.js", { namedExports: { askAgent: async () => replies.shift() } });
const { agentTurn, setAgentHandlers, cleanBlock } = await import("../src/agent.js");

const sketch = { title: "Production Possibility Frontier", x: "Good Y", y: "Good X", lines: [{ pts: [[0, 10], [5, 8], [9, 0]], smooth: true }] };
function app(notes = {}) {
  const made = { title: "Economics", topics: [{ name: "Production Possibility Curve Basics" }, { name: "Opportunity cost" }], notes: { "Production Possibility Curve Basics": [{ p: "A PPC shows what an economy can make." }], ...notes } };
  setAgentHandlers({
    state: () => ({ page: "sheet", made }),
    go() {}, setTheme() {}, setLook() {}, prefill() {},
    bestTopic: (given, about) => made.topics.find((t) => t.name.toLowerCase() === String(given).toLowerCase())?.name || (/ppc|ppf|possib/i.test(`${given} ${about}`) ? made.topics[0].name : null),
    editNotes: ({ topic, block }) => { const t = made.topics.find((x) => x.name === topic); if (!t) return null; made.notes[topic] = [...(made.notes[topic] || []), block]; return topic; },
  });
  return made;
}

test("a graph asked for in the notes goes into the notes even when the topic name was guessed", async () => {
  const made = app();
  replies.push({ reply: "I added a PPF diagram to your notes.", actions: [{ type: "sketch", topic: "PPF diagram", sketch }] });
  const out = await agentTurn("", [{ role: "user", content: "add a ppc graph to my notes" }]);
  assert.equal(made.notes["Production Possibility Curve Basics"].at(-1).sketch.title, "Production Possibility Frontier");
  assert.ok(out.did.some((d) => d.notes));
});

test("a reply that claims the notes changed when nothing did is sent back, then corrected", async () => {
  const made = app();
  replies.push({ reply: "I added it to your notes.", actions: [{ type: "sketch", sketch }] }); // no notes request, so chat only
  replies.push({ reply: "Done, it is in your notes now.", actions: [{ type: "notes", op: "insert", topic: "Production Possibility Curve Basics", at: 9, block: { sketch } }] });
  const out = await agentTurn("", [{ role: "user", content: "make me a ppc graph" }]);
  assert.equal(replies.length, 0);
  assert.equal(made.notes["Production Possibility Curve Basics"].length, 2);
  assert.match(out.reply, /notes/);
});

test("when it cannot be done the student gets a kind sorry, not a false claim", async () => {
  app();
  for (let i = 0; i < 3; i++) replies.push({ reply: "I added it to your notes.", actions: [{ type: "notes", op: "insert", topic: "Nope", at: 0, block: { p: "x" } }] });
  const out = await agentTurn("", [{ role: "user", content: "put the thing in my notes" }]);
  assert.match(out.reply, /^Sorry/);
  assert.ok(Object.values(store).some((v) => Array.isArray(v) && v.length), "a lesson was remembered");
});

test("blocks are checked", () => {
  assert.equal(cleanBlock({ script: "x" }), null);
  assert.deepEqual(cleanBlock({ p: "hi" }), { p: "hi" });
});
