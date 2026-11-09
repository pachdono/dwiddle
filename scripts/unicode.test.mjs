import test from "node:test";
import assert from "node:assert/strict";
import { sameAnswer } from "../src/answers.js";
import { makeIcs } from "../src/insights.js";

test("a typographic minus and times sign match the plain ones", () => {
  assert.ok(sameAnswer("−5", ["-5"]));
  assert.ok(sameAnswer("3×4", ["3*4"]));
});
test("calendar text cannot inject lines", () => {
  const ics = makeIcs([{ start: 0, end: 3600000, topic: "A\r\nBEGIN:VEVENT", reason: "x\u0001y" }]);
  assert.ok(!/\r\nBEGIN:VEVENT\r\nBEGIN:VEVENT/.test(ics));
  assert.ok(!ics.includes("\u0001"));
});
