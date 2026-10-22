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

import { tidyMath } from "../src/mathText.js";
test("latex a model writes is shown as printed maths", () => {
  const raw = "\\(\n\\lim_{x \\to c} f(x)=L\n\\)\nreads the limit. \\[ \\lim_{x\\to c} f(x)=L \\iff \\forall\\,\\varepsilon>0\\,\\exists\\,\\delta>0 \\]";
  const out = tidyMath(raw);
  assert.ok(!/\\\(|\\\)|\\\[|\\\]|\\lim|\\forall|\\varepsilon/.test(out), out);
  assert.match(out, /lim\(x → c\) f\(x\)=L/);
  assert.match(out, /∀/);
  assert.match(out, /ε/);
  assert.equal(tidyMath("\\frac{a}{b} and \\frac{x+1}{y}"), "a ÷ b and (x+1) ÷ y");
});

import { answerable as ans2 } from "../src/mathText.js";
test("units read as m/s squared, and a calculation with no numbers in it is unanswerable", () => {
  assert.equal(tidyMath("4.2 m s^-2"), "4.2 m/s²");
  assert.equal(tidyMath("12 m s^-1"), "12 m/s");
  assert.equal(tidyMath("1000 kg m^-3"), "1000 kg/m³");
  assert.equal(tidyMath("3.0 x 10^-2"), "3.0 x 10⁻²");
  const missing = { q: "What is the acceleration of the aeroplane during takeoff?", choices: ["0.4 m/s²", "4.2 m/s²", "2.8 m/s²", "1.5 m/s²"], answer: 1, topic: "Motion" };
  assert.equal(ans2(missing), false);
  assert.equal(ans2({ ...missing, q: "A plane reaches 84 m/s from rest in 20 s. What is its acceleration?" }), true);
  assert.equal(ans2({ q: "Which is a unit of force?", choices: ["newton", "joule", "watt"], answer: 0 }), true);
});

import { unseenVisual } from "../src/mathText.js";
test("a check that leans on a graph the student never sees is spotted", () => {
  assert.equal(unseenVisual({ q: "Match each part of the graph to its shape and calculation." }), true);
  assert.equal(unseenVisual({ q: "Using the diagram below, name the organelle." }), true);
  assert.equal(unseenVisual({ q: "What does the area under a velocity-time graph represent?" }), false);
  assert.equal(unseenVisual({ q: "Distance is found from the area under the graph." }), false);
  assert.equal(unseenVisual({ q: "What distance does the car travel in the first 4 s according to the graph?" }), true);
  assert.equal(unseenVisual({ q: "The graph shows the car slowing." }), true);
  assert.equal(unseenVisual({ q: "What does the gradient of a distance-time graph show?" }), false);
});


import { sameAnswer as same } from "../src/answers.js";
test("a typed answer that means the same is accepted, one that does not is not", () => {
  const a = ["Newton's second law"];
  assert.equal(same("2nd law", a), true);
  assert.equal(same("second law", a), true);
  assert.equal(same("newtons 2nd law", a), true);
  assert.equal(same("Newton's second law of motion", a), true);
  assert.equal(same("law", a), false);
  assert.equal(same("first law", a), false);
  assert.equal(same("third law", a), false);
  assert.equal(same("Newton's 1st law", a), false);
  assert.equal(same("five", ["5"]), true);
  assert.equal(same("mitochondria", ["mitochondrion"]), true);
  assert.equal(same("nucleus", ["mitochondria"]), false);
  assert.equal(same("potential", ["kinetic"]), false);
});

import { missingData as md } from "../src/mathText.js";
test("a number to fill in with no numbers in the sentence is missing its data", () => {
  assert.equal(md({ type: "blank", q: "The total distance travelled by the sledge is ___ m.", answer: "36.6" }), true);
  assert.equal(md({ type: "blank", q: "A sledge moves at 4 m/s for 9 s, so it travels ___ m.", answer: "36" }), false);
  assert.equal(md({ type: "blank", q: "The equation F = ma is known as ___.", answer: "Newton's second law" }), false);
  assert.equal(md({ type: "written", q: "Calculate the distance travelled.", answer: "36.6 m" }), true);
  assert.equal(md({ type: "written", q: "Calculate the distance travelled at 4 m/s for 9 s.", answer: "36 m" }), false);
});
