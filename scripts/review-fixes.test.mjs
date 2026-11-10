// Run with: node --test --experimental-test-module-mocks scripts/review-fixes.test.mjs
// Regression tests for findings in the November 2026 code review.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { sameAnswer } from "../src/answers.js";
import { summarise } from "../src/insights.js";
import { merge } from "../src/supabase.js";

// C23: an answer in any script is marked on what was typed, not stripped to nothing.
test("the same answer typed in Greek, Russian, Thai or Chinese is marked right", () => {
  for (const word of ["φωτοσύνθεση", "фотосинтез", "การสังเคราะห์แสง", "光合作用"]) {
    assert.equal(sameAnswer(word, [word]), true, word);
  }
});

test("a different answer in another script is still wrong", () => {
  assert.equal(sameAnswer("φωτοσύνθεση", ["αναπνοή"]), false);
});

test("5 is not accepted for minus 5 written with the Unicode minus sign", () => {
  assert.equal(sameAnswer("5", ["−5"]), false);
  assert.equal(sameAnswer("-5", ["−5"]), true);
});

test("3x4 matches 3 times 4 written with the multiplication sign", () => {
  assert.equal(sameAnswer("3x4", ["3 × 4"]), true);
});

// C15: a study day is the day where the student is, whatever the UTC date is.
function localDays(tz) {
  const code = `
    const { localDay } = await import(${JSON.stringify(new URL("../src/store.js", import.meta.url).href)});
    const at = (y, m, d, h) => new Date(y, m, d, h, 0, 0);
    console.log(JSON.stringify([localDay(at(2026, 10, 9, 10)), localDay(at(2026, 10, 10, 17)), localDay(at(2026, 10, 10, 1))]));
  `;
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", code], { env: { ...process.env, TZ: tz } }).toString());
}

test("study days follow the local clock in every time zone", () => {
  for (const tz of ["America/Los_Angeles", "Asia/Bangkok", "Australia/Sydney", "Asia/Kolkata", "Europe/London"]) {
    assert.deepEqual(localDays(tz), ["2026-11-09", "2026-11-10", "2026-11-10"], tz);
  }
});

// C24: a topic called __proto__ or constructor is only a name.
test("summarise copes with topic names that are also object keys", () => {
  const log = ["__proto__", "constructor", "toString", "Cells"].map((topic, i) => ({ t: Date.UTC(2026, 10, 10, 8, i), ok: i % 2 === 0, topic }));
  const out = summarise(log, Date.UTC(2026, 10, 10, 9));
  assert.equal(out.total, 4);
  assert.equal({}.n, undefined);
  assert.equal({}.r, undefined);
});

test("merging stats with a __proto__ topic does not change Object.prototype", () => {
  const stats = JSON.parse('{"answered":2,"correct":1,"xp":10,"days":[],"byTopic":{"__proto__":{"right":1,"total":5}}}');
  merge({ "dwiddle-stats": stats }, { "dwiddle-stats": stats });
  assert.equal({}.total, undefined);
  assert.equal({}.right, undefined);
});
