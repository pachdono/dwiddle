// Run with: node --test --experimental-test-module-mocks scripts/browse-images.test.mjs
// Pictures for the notebook browser: Bing's results, then Commons as a fallback.
import { test, mock } from "node:test";
import assert from "node:assert/strict";

mock.module("node:dns/promises", { namedExports: { lookup: async () => [{ address: "93.184.216.34" }] } });
const { images } = await import("../api/browse.js");

const q = (o) => JSON.stringify(o).replace(/"/g, "&quot;");
const bing = `<html><a class="iusc" m="${q({ murl: "https://a.example/cell.jpg", turl: "https://tse1.mm.bing.net/th?id=1", t: "Animal &lt;b&gt;cell&lt;/b&gt;", purl: "https://a.example/page" })}"></a>
<a m="${q({ murl: "https://a.example/cell.jpg", turl: "https://tse1.mm.bing.net/th?id=1" })}"></a>
<a m="${q({ murl: "https://a.example/logo.svg" })}"></a>
<a m="${q({ murl: "http://insecure.example/x.jpg" })}"></a>
<a m="broken"></a>
${Array.from({ length: 6 }, (_, i) => `<a m="${q({ murl: `https://b.example/${i}.png`, turl: `https://tse2.mm.bing.net/th?id=${i}` })}"></a>`).join("\n")}</html>`;

function stub(routes) {
  const seen = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    seen.push(u);
    const hit = Object.entries(routes).find(([k]) => u.includes(k));
    if (!hit) throw new Error("offline");
    const body = typeof hit[1] === "string" ? hit[1] : JSON.stringify(hit[1]);
    return new Response(body, { status: 200, headers: { "content-type": typeof hit[1] === "string" ? "text/html" : "application/json" } });
  };
  return seen;
}

test("Bing's pictures come back once each, full size with thumbnails, no SVGs or plain http", async () => {
  const seen = stub({ "bing.com/images": bing });
  const list = await images("animal cell");
  assert.equal(list[0].url, "https://a.example/cell.jpg");
  assert.equal(list[0].thumb, "https://tse1.mm.bing.net/th?id=1");
  assert.equal(list[0].title, "Animal cell");
  assert.equal(list.length, 7);
  assert.ok(list.every((p) => p.url.startsWith("https://") && !p.url.endsWith(".svg")));
  assert.ok(!seen.some((u) => u.includes("wikimedia")), "Commons is not asked when Bing has enough");
});

test("Wikimedia Commons fills in when Bing gives nothing", async () => {
  stub({ "commons.wikimedia.org": { query: { pages: {
    2: { index: 2, title: "File:Leaf cross section.png", imageinfo: [{ url: "https://upload.wikimedia.org/leaf.png", thumburl: "https://upload.wikimedia.org/320px-leaf.png", mime: "image/png", descriptionurl: "https://commons.wikimedia.org/wiki/File:Leaf" }] },
    1: { index: 1, title: "File:Chloroplast.jpg", imageinfo: [{ url: "https://upload.wikimedia.org/c.jpg", thumburl: "https://upload.wikimedia.org/320px-c.jpg", mime: "image/jpeg" }] },
    3: { index: 3, title: "File:Diagram.svg", imageinfo: [{ url: "https://upload.wikimedia.org/d.svg", mime: "image/svg+xml" }] },
  } } } });
  const list = await images("leaf");
  assert.deepEqual(list.map((p) => p.title), ["Chloroplast", "Leaf cross section"]);
  assert.equal(list[1].thumb, "https://upload.wikimedia.org/320px-leaf.png");
});

test("nothing anywhere gives an empty list, not an error", async () => {
  stub({});
  assert.deepEqual(await images("zzz"), []);
});
