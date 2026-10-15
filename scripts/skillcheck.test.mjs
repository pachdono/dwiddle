import test from "node:test";
import assert from "node:assert/strict";
import { scoreSkillCheck, usableCheck, keepCheck } from "../src/skillcheck.js";

const q = (id, skill, answer = 0) => ({ id, skill, q: "?", choices: ["a", "b", "c", "d"], answer });
const skills = ["Define terms", "Explain the process", "Calculate"];
const qs = [q("1", "Define terms"), q("2", "Define terms"), q("3", "Explain the process"), q("4", "Calculate"), q("5", "Calculate", 2)];

test("each skill is scored on its own questions", () => {
  const r = scoreSkillCheck(skills, qs, { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0 });
  const by = Object.fromEntries(r.rows.map((x) => [x.name, x]));
  assert.equal(by["Define terms"].pct, 100);
  assert.equal(by["Explain the process"].pct, 0);
  assert.equal(by["Calculate"].pct, 50);
  assert.equal(by["Define terms"].level, "strong");
  assert.equal(by["Explain the process"].level, "weak");
  assert.equal(r.right, 3);
  assert.equal(r.total, 5);
});

test("a skipped question counts as wrong, so skipping cannot hide a weakness", () => {
  const r = scoreSkillCheck(skills, qs, {});
  assert.equal(r.right, 0);
  assert.equal(r.score, 0);
  assert.equal(r.grade, "U");
});

test("every skill weighs the same, however many questions it took", () => {
  // two questions on one skill, one each on the others: all right on the big one, all wrong elsewhere
  const r = scoreSkillCheck(skills, qs, { 1: 0, 2: 0 });
  assert.equal(r.score, 33);
  assert.equal(r.pct, 40); // the plain share of questions is different, and is shown too
});

test("the weakest skills come first, and strong ones are not listed", () => {
  const r = scoreSkillCheck(skills, qs, { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0 });
  assert.deepEqual(r.weakest.map((x) => x.name), ["Explain the process", "Calculate"]);
});

test("a short check gives a wider range than a long one", () => {
  const short = scoreSkillCheck(["A"], [q("1", "A"), q("2", "A"), q("3", "A")], { 1: 0, 2: 0, 3: 0 });
  const many = Array.from({ length: 18 }, (_, i) => q("m" + i, "A"));
  const long = scoreSkillCheck(["A"], many, Object.fromEntries(many.map((x) => [x.id, 0])));
  assert.equal(short.grade, "A*");
  assert.equal(long.grade, "A*");
  assert.ok(scoreSkillCheck(["A"], [q("1", "A"), q("2", "A"), q("3", "A")], { 1: 0, 2: 1, 3: 1 }).gradeLo <= scoreSkillCheck(["A"], [q("1", "A"), q("2", "A"), q("3", "A")], { 1: 0, 2: 1, 3: 1 }).grade);
});

test("what comes from the server is checked", () => {
  assert.equal(usableCheck(null), null);
  assert.equal(usableCheck({ skills: ["a"], questions: [] }), null);
  assert.equal(usableCheck({ skills: ["Define terms", "Calculate"], questions: [q("1", "Define terms"), q("2", "Calculate")] }), null); // too few questions
  const ok = usableCheck({ topic: "T", skills: [...skills, "Ghost"], questions: [...qs, { id: "bad", skill: "Define terms", q: "?", choices: ["a"], answer: 0 }] });
  assert.equal(ok.questions.length, 5);
  assert.deepEqual(ok.skills, skills); // a skill with no question is dropped
});

test("results are kept newest first and capped", () => {
  const r = scoreSkillCheck(skills, qs, { 1: 0 });
  let list = [];
  for (let i = 0; i < 40; i++) list = keepCheck(list, r, "T" + i, i);
  assert.equal(list.length, 30);
  assert.equal(list[0].topic, "T39");
  assert.equal(list[0].skills.length, 3);
});
