import test from "node:test";
import assert from "node:assert/strict";

// Every prompt constant a mode uses must exist: a missing one only fails when
// that mode is called, which a build does not catch.
test("every system prompt used in generate.js is defined", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../api/generate.js", import.meta.url), "utf8");
  const used = [...src.matchAll(/system: ([A-Z_]+)\b/g)].map((m) => m[1]);
  assert.ok(used.includes("CONDENSE") && used.includes("LONG_QUESTIONS"));
  for (const name of new Set(used)) assert.match(src, new RegExp(`const ${name} ?=`), name + " is not defined");
});
