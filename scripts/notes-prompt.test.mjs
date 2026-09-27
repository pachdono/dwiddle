// What the notes writer is told, for testers and for everyone else.
import { test } from "node:test";
import assert from "node:assert/strict";
import { notesPrompt } from "../api/generate.js";

test("testers get note form, hard words, tables and pictures", () => {
  const p = notesPrompt(true);
  assert.match(p, /\{word\|/);
  assert.match(p, /revision notes, not a textbook/);
  assert.match(p, /"table"/);
  assert.match(p, /Stay strictly on topic/);
  assert.doesNotMatch(p, /__[A-Z_]+__/);
});

test("everyone else gets the notes as before, kept on topic", () => {
  const p = notesPrompt(false);
  assert.doesNotMatch(p, /\{word\|/);
  assert.doesNotMatch(p, /"table"|"pic"/);
  assert.match(p, /Do not summarise or shorten/);
  assert.match(p, /Stay strictly on topic/);
  assert.doesNotMatch(p, /__[A-Z_]+__/);
});
