import test from "node:test";
import assert from "node:assert/strict";
import { retag, setMeta, cleanCode, originOf, preview } from "../api/_preview.js";
import { readFileSync } from "node:fs";

const INDEX = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const card = { title: "Join my notebook on Dwiddle", description: "Write together.", image: "https://x.vercel.app/og-collab.png", url: "https://x.vercel.app/notebook?live=AB12C" };

test("the app's own page gets new words and picture, and keeps everything else", () => {
  const out = retag(INDEX, card);
  assert.match(out, /<title>Join my notebook on Dwiddle<\/title>/);
  assert.match(out, /property="og:title" content="Join my notebook on Dwiddle"/);
  assert.match(out, /property="og:image" content="https:\/\/x\.vercel\.app\/og-collab\.png"/);
  assert.match(out, /name="twitter:image" content="https:\/\/x\.vercel\.app\/og-collab\.png"/);
  assert.match(out, /property="og:url" content="https:\/\/x\.vercel\.app\/notebook\?live=AB12C"/);
  assert.doesNotMatch(out, /content="Dwiddle: turn your notes into the real exam"/);
  assert.equal(out.match(/property="og:title"/g).length, 1);
  assert.ok(out.includes('<div id="root">') || out.includes("<script"), "the app itself is still in the page");
});

test("text that could break out of the page is escaped", () => {
  const out = retag(INDEX, { ...card, title: 'x"><script>alert(1)</script>' });
  assert.doesNotMatch(out, /<script>alert\(1\)<\/script>/);
  assert.match(out, /&lt;script&gt;/);
});

test("a tag the page lacks is added", () => {
  const out = setMeta("<html><head></head></html>", "property", "og:image", "https://a/b.png");
  assert.match(out, /<meta property="og:image" content="https:\/\/a\/b\.png" \/>/);
});

test("the code is cleaned, and only this deployment is ever fetched", () => {
  assert.equal(cleanCode("ab12c<script>"), "AB12C");
  assert.equal(originOf("dwiddle-git-main.vercel.app"), "https://dwiddle-git-main.vercel.app");
  assert.equal(originOf("evil.example.com"), "https://dwiddle.vercel.app");
  assert.equal(originOf("127.0.0.1:9000"), "https://dwiddle.vercel.app");
  assert.equal(originOf(undefined), "https://dwiddle.vercel.app");
});

const run = (query, host = "dwiddle.vercel.app") => { const out = { status: 0, body: "", headers: {} }; const res = { setHeader(k, v) { out.headers[k] = v; }, status(c) { out.status = c; return this; }, send(b) { out.body = b; return this; } };
  return preview({ query, headers: { host } }, res).then(() => out); };

test("a collaboration link serves the app with the collaboration preview", async () => {
  const seen = [];
  globalThis.fetch = async (url) => { seen.push(url); return { ok: true, text: async () => INDEX }; };
  const r = await run({ live: "ab12c" });
  assert.deepEqual(seen, ["https://dwiddle.vercel.app/index.html"]);
  assert.match(r.body, /Join my notebook on Dwiddle/);
  assert.match(r.body, /og-collab\.png/);
  assert.match(r.body, /live=AB12C/);
  assert.match(r.headers["Content-Type"], /text\/html/);
});

test("a bad code still opens the app, with its normal preview", async () => {
  globalThis.fetch = async () => ({ ok: true, text: async () => INDEX });
  const r = await run({ live: "x" });
  assert.equal(r.status, 200);
  assert.equal(r.body, INDEX);
});

test("if the app page cannot be read, something still comes back", async () => {
  globalThis.fetch = async () => { throw new Error("down"); };
  const r = await run({ live: "AB12C" });
  assert.equal(r.status, 200);
  assert.match(r.body, /Join my notebook on Dwiddle/);
  assert.match(r.body, /Open Dwiddle/);
});
