// Bold, italics and code in question text are set, not shown as typed.
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = join(process.cwd(), "node_modules", ".cache", "mathtext-test"); // inside the project, so react resolves
const out = join(dir, "mt.mjs");
await build({
  configFile: false, logLevel: "silent", plugins: [react()],
  build: { lib: { entry: "src/MathText.jsx", formats: ["es"], fileName: () => "mt.mjs" }, outDir: dir, emptyOutDir: false, minify: false,
    rollupOptions: { external: ["react", "react/jsx-runtime"] } },
});
const { M } = await import(pathToFileURL(out).href);
const html = (t) => renderToStaticMarkup(createElement(M, { t }));

test("bold is set in bold with no asterisks left", () => {
  const h = html("Our **cells** (the basic unit of life) use oxygen");
  assert.match(h, /<strong>cells<\/strong>/);
  assert.ok(!h.includes("*"));
});
test("italics and code", () => {
  assert.match(html("an *italic* word"), /<em>italic<\/em>/);
  assert.match(html("run `ls -l` now"), /<code[^>]*>ls -l<\/code>/);
});
test("multiplication is not italics", () => {
  const h = html("2*3*4 and 5 * 6");
  assert.ok(!h.includes("<em>"));
});
test("a stray pair of stars is dropped, and maths still works", () => {
  assert.ok(!html("half **open").includes("*"));
  assert.match(html("**x^2** and H_2O"), /<strong>/);
  assert.equal(html("plain text"), "plain text");
});
