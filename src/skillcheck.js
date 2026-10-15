// Scoring a skill check: one topic tested skill by skill. Kept apart from the
// screen so it can be tested.

import { gradeFor } from "./insights.js";

export const SKILL_LEVEL = { strong: "Strong", secure: "Secure", shaky: "Shaky", weak: "Needs work" };
const levelOf = (pct) => (pct >= 80 ? "strong" : pct >= 60 ? "secure" : pct >= 40 ? "shaky" : "weak");

// answers: { [questionId]: chosen option index }. Questions not answered count
// as wrong, so skipping cannot hide a weak skill.
export function scoreSkillCheck(skills, questions, answers) {
  const rows = skills.map((name) => {
    const qs = questions.filter((q) => q.skill === name);
    const right = qs.filter((q) => answers[q.id] === q.answer).length;
    const pct = qs.length ? Math.round((right / qs.length) * 100) : null;
    return { name, right, total: qs.length, pct, level: pct == null ? null : levelOf(pct) };
  }).filter((r) => r.total > 0);
  const total = questions.length;
  const right = questions.filter((q) => answers[q.id] === q.answer).length;
  const pct = total ? Math.round((right / total) * 100) : 0;
  // every skill counts the same however many questions it took, so a big skill
  // with two questions cannot drown out a small one
  const score = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;
  const margin = Math.round(22 / Math.sqrt(1 + total / 3)); // a shorter check says less
  const lo = Math.max(0, score - margin), hi = Math.min(100, score + margin);
  return {
    rows, total, right, pct, score,
    grade: gradeFor(score), gradeLo: gradeFor(lo), gradeHi: gradeFor(hi),
    weakest: [...rows].sort((a, b) => a.pct - b.pct || b.total - a.total).filter((r) => r.pct < 80).slice(0, 3),
  };
}

// Whatever came back from the server is checked before it is used.
export function usableCheck(d) {
  if (!d || !Array.isArray(d.skills) || !Array.isArray(d.questions)) return null;
  const qs = d.questions.filter((q) => q && typeof q.id === "string" && typeof q.q === "string" && Array.isArray(q.choices) && q.choices.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length && typeof q.skill === "string");
  const skills = d.skills.filter((s) => typeof s === "string" && qs.some((q) => q.skill === s));
  return qs.length >= 3 && skills.length >= 2 ? { topic: String(d.topic || ""), skills, questions: qs } : null;
}

// The last few results, kept on this device so the report can show them.
export const CHECKS_KEY = "dwiddle-skillchecks";
export const keepCheck = (list, result, topic, now = Date.now()) =>
  [{ t: now, topic, score: result.score, grade: result.grade, gradeLo: result.gradeLo, gradeHi: result.gradeHi, total: result.total, right: result.right, skills: result.rows.map((r) => ({ name: r.name, pct: r.pct, level: r.level })) }, ...(Array.isArray(list) ? list : [])].slice(0, 30);
