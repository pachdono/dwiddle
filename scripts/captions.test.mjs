import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { decode } from "../api/youtube.js";
const desktop = createRequire(import.meta.url)("../electron/youtube.cjs").decode;

for (const [name, fn] of [["the web decoder", decode], ["the desktop decoder", desktop]]) {
  test(name + " keeps maths signs and decodes each entity once", () => {
    assert.equal(fn("if x &lt; 5 and y &gt; 2"), "if x < 5 and y > 2");
    assert.equal(fn("&amp;lt;"), "&lt;");
    assert.equal(fn("Tom &amp; Jerry"), "Tom & Jerry");
    assert.equal(fn("it&#39;s &#x27;fine&#x27; &apos;ok&apos;"), "it's 'fine' 'ok'");
    assert.equal(fn("a&nbsp;b"), "a b");
    assert.equal(fn("smile &#128512;"), "smile \u{1F600}");
    assert.equal(fn("<s t=\"1\">hello</s> world"), "hello world");
    assert.equal(fn("&#99999999; stays"), "&#99999999; stays");
  });
}
test("both decoders agree", () => { const s = "x &lt; y &amp;&amp; z &#8217; &#128512;"; assert.equal(decode(s), desktop(s)); });
