import test from "node:test";
import assert from "node:assert/strict";
import { spreadAnswers } from "../src/mathText.js";

test("the right answer is no longer always first, and still right", () => {
  const spots = [0, 0, 0, 0];
  for (let n = 0; n < 200; n++) {
    const q = { id: "q" + n, q: "Q?", choices: ["right", "a", "b", "c"], answer: 0 };
    const r = spreadAnswers(q);
    assert.equal(r.choices[r.answer], "right");
    assert.deepEqual([...r.choices].sort(), ["a", "b", "c", "right"]);
    spots[r.answer]++;
  }
  assert.ok(spots.every((c) => c > 20), String(spots));
  const q = { id: "x", q: "Q?", choices: ["a", "b", "c", "d"], answer: 2 };
  assert.deepEqual(spreadAnswers(q), spreadAnswers(q));
});

test("all of the above stays put", () => {
  const q = { id: "y", q: "Q?", choices: ["a", "b", "All of the above"], answer: 2 };
  assert.equal(spreadAnswers(q), q);
});

import { answerable, uniqueQuestions } from "../src/mathText.js";

test("questions about unseen notes or pictures are dropped", () => {
  assert.equal(answerable({ q: "Which of the following is listed as a cell structure in the notes?" }), false);
  assert.equal(answerable({ q: "Which part of the diagram above makes protein?" }), true); // a picture is made for it
  assert.equal(answerable({ q: "Which part of the diagram makes protein?", figure: "x" }), true);
  assert.equal(answerable({ q: "What makes protein in a cell?" }), true);
});

test("the same question is kept once", () => {
  const list = [{ q: "What is meant by the term starch test?" }, { q: "what is meant by the term  Starch test" }, { q: "Something else?" }];
  assert.equal(uniqueQuestions(list).length, 2);
});

test("questions about a labelled thing that is not shown are dropped", () => {
  assert.equal(answerable({ q: "Explain the effect of very high temperature on the shape of molecule Z." }), false);
  assert.equal(answerable({ q: "What does Figure 2 show?" }), false);
  assert.equal(answerable({ q: "Explain the effect of high temperature on a protein." }), true);
  assert.equal(answerable({ q: "What does vitamin C prevent?" }), true);
});

import { practiceBank } from "../src/mathText.js";
test("a topic is never emptied by the filters", () => {
  const all = Array.from({ length: 4 }, (_, i) => ({ id: "p" + i, topic: "Atoms", q: `What does the note in your notes say about element ${i}?` }));
  assert.equal(practiceBank(all).length, 4);
  const mixed = [...all, ...Array.from({ length: 3 }, (_, i) => ({ id: "m" + i, topic: "Other", q: `Plain question ${i}?` })), { id: "m9", topic: "Other", q: "As listed in the notes, which part?" }];
  assert.equal(practiceBank(mixed).length, 7);
});

import { needsVisual, visualPrompt } from "../src/mathText.js";
test("a question that points at a diagram gets a picture prompt that hides the answer", () => {
  const q = { q: "Which element is found in all three biological molecules shown in the diagram?", choices: ["Carbon", "Sulfur"], answer: 0, topic: "Biological molecules" };
  assert.equal(needsVisual(q), true);
  assert.equal(needsVisual({ q: "What is the charge of a proton?" }), false);
  assert.match(visualPrompt(q), /do not mark or label which one is right/);
});
