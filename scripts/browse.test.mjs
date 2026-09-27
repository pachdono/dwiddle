// The research browser's reader view and framing check, on sample pages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { reader, framable } from "../api/browse.js";

const page = `<!doctype html><html><head><title>Photosynthesis - Bitesize</title>
<meta property="og:image" content="/img/leaf.jpg"><script>var x = "<p>not this</p>";</script><style>p{}</style></head>
<body><header><nav><ul><li>Home</li><li>Menu</li></ul></nav></header>
<main><h1>Photosynthesis</h1><p>Photosynthesis is how plants make glucose from carbon dioxide and water using light energy.</p>
<img src="/img/chloroplast.png" alt="A chloroplast" width="400"><img src="/pixel.gif" width="1">
<h2>The equation</h2><p>Carbon dioxide + water &rarr; glucose + oxygen, in the chloroplasts of leaf cells.</p>
<ul><li>Needs light from the Sun</li><li>Needs chlorophyll to absorb it</li></ul></main>
<footer><p>Copyright notice and other footer text that is long enough.</p></footer></body></html>`;

test("the reader keeps the article and drops the page furniture", () => {
  const r = reader(page, new URL("https://www.bbc.co.uk/bitesize/photo"));
  assert.equal(r.title, "Photosynthesis - Bitesize");
  assert.equal(r.image, "https://www.bbc.co.uk/img/leaf.jpg");
  assert.deepEqual(r.blocks.map((b) => Object.keys(b)[0]), ["h", "p", "img", "h", "p", "li", "li"]);
  assert.equal(r.blocks[2].img, "https://www.bbc.co.uk/img/chloroplast.png");
  assert.ok(!JSON.stringify(r).includes("not this") && !JSON.stringify(r).includes("Copyright"));
});

test("pages that forbid framing open in the reader", () => {
  const h = (o) => ({ headers: new Headers(o) });
  assert.equal(framable(h({}), new URL("https://en.wikipedia.org/wiki/Leaf")), true);
  assert.equal(framable(h({ "x-frame-options": "SAMEORIGIN" }), new URL("https://example.com")), false);
  assert.equal(framable(h({ "content-security-policy": "frame-ancestors 'self'" }), new URL("https://example.com")), false);
  assert.equal(framable(h({ "content-security-policy": "frame-ancestors *" }), new URL("https://example.com")), true);
  assert.equal(framable(h({}), new URL("http://example.com")), false);
});
