import test from "node:test";
import assert from "node:assert/strict";
import handler, { videoId } from "../api/youtube.js";

const id = "dQw4w9WgXcQ";
let request = 0;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

async function call(t, fetcher, { key = "test-secret", url = `https://youtu.be/${id}`, lang = "th", method = "POST" } = {}) {
  const original = process.env.SUPADATA_API_KEY;
  if (key) process.env.SUPADATA_API_KEY = key;
  else delete process.env.SUPADATA_API_KEY;
  t.after(() => {
    if (original === undefined) delete process.env.SUPADATA_API_KEY;
    else process.env.SUPADATA_API_KEY = original;
  });
  t.mock.method(globalThis, "fetch", fetcher);
  const res = {
    setHeader() {},
    status(value) { this.code = value; return this; },
    json(value) { this.body = value; return this; },
  };
  await handler({ method, headers: { "x-forwarded-for": `test-${++request}` }, body: { url, lang } }, res);
  return res;
}

test("recognises supported YouTube links and rejects lookalike hosts and malformed IDs", () => {
  for (const url of [id, `https://youtu.be/${id}?t=4`, `https://www.youtube.com/watch?list=abc&v=${id}`,
    `youtube.com/shorts/${id}`, `https://m.youtube.com/live/${id}`, `https://www.youtube-nocookie.com/embed/${id}`]) {
    assert.equal(videoId(url), id, url);
  }
  for (const url of [`https://evilyoutube.com/watch?v=${id}`, `https://youtube.com.evil.test/watch?v=${id}`,
    `https://example.com/youtube.com/watch?v=${id}`, `https://youtu.be/${id}extra`, `https://youtube.com/watch?v=${id}x`, "garbage"]) {
    assert.equal(videoId(url), null, url);
  }
});

test("provider import keeps the API key server-side and accepts a short real transcript", async (t) => {
  const res = await call(t, async (address, options) => {
    const url = new URL(address);
    if (url.hostname === "www.youtube.com") {
      assert.equal(options.headers, undefined);
      return json({ title: "A short lesson", author_name: "Teacher" });
    }
    assert.equal(url.origin + url.pathname, "https://api.supadata.ai/v1/transcript");
    assert.equal(url.searchParams.get("url"), `https://www.youtube.com/watch?v=${id}`);
    assert.equal(url.searchParams.get("mode"), "native");
    assert.equal(url.searchParams.get("lang"), "th");
    assert.equal(options.headers["x-api-key"], "test-secret");
    assert.ok(options.signal);
    return json({ content: "[Music] A short but usable lesson.", lang: "en" });
  });
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { title: "A short lesson", channel: "Teacher", minutes: 0, lang: "en", transcript: "A short lesson\n\nA short but usable lesson." });
  assert.ok(!JSON.stringify(res.body).includes("test-secret"));
});

test("a metadata failure does not lose captions; segment responses are supported", async (t) => {
  const res = await call(t, async (address) => {
    if (String(address).includes("/oembed")) throw new Error("blocked");
    return json({ content: [{ text: "First sentence." }, { text: "Second sentence." }], lang: "en" });
  });
  assert.equal(res.code, 200);
  assert.equal(res.body.transcript, "YouTube video\n\nFirst sentence. Second sentence.");
});

for (const [status, body, expected] of [
  [401, { error: "unauthorized", message: "secret details" }, 503],
  [402, { error: "upgrade-required" }, 503],
  [429, { error: "limit-exceeded" }, 503],
  [404, { error: "not-found" }, 422],
  [403, { error: "forbidden" }, 422],
  [206, { error: "transcript-unavailable" }, 422],
  [200, { content: [] }, 422],
  [200, { content: "[Music]" }, 422],
  [500, { message: "secret details" }, 502],
]) {
  test(`provider ${status} ${JSON.stringify(body)} returns an actionable error without retrying`, async (t) => {
    let reads = 0;
    const res = await call(t, async (address) => {
      if (String(address).includes("/oembed")) return json({}, 404);
      reads++;
      return json(body, status);
    });
    assert.equal(res.code, expected);
    assert.equal(reads, 1);
    assert.match(res.body.error, /paste|notes|captions/i);
    assert.ok(!res.body.error.includes("secret"));
  });
}

test("asynchronous results poll the same job without creating another transcript", async (t) => {
  let starts = 0;
  const res = await call(t, async (address) => {
    const url = new URL(address);
    if (url.pathname === "/oembed") return json({ title: "Lecture" });
    if (url.pathname === "/v1/transcript/job-1") return json({ status: "completed", result: { content: "The lesson text.", lang: "en" } });
    starts++;
    return json({ jobId: "job-1" }, 202);
  });
  assert.equal(res.code, 200);
  assert.equal(starts, 1);
  assert.equal(res.body.transcript, "Lecture\n\nThe lesson text.");
});

test("timeouts return a readable error", async (t) => {
  const res = await call(t, async () => { throw new DOMException("Timed out", "TimeoutError"); });
  assert.equal(res.code, 502);
  assert.match(res.body.error, /could not be read/);
});

test("network failures without a provider are not misreported as no captions", async (t) => {
  const res = await call(t, async () => { throw new Error("offline"); }, { key: "" });
  assert.equal(res.code, 502);
  assert.match(res.body.error, /could not be reached/);
});

test("a blocked direct reader gives a transcript fallback", async (t) => {
  const res = await call(t, async () => json({ playabilityStatus: { status: "LOGIN_REQUIRED" } }), { key: "" });
  assert.equal(res.code, 422);
  assert.match(res.body.error, /YouTube blocked/);
});

test("direct imports still work without a provider key", async (t) => {
  const res = await call(t, async (address) => {
    if (String(address).includes("/player")) return json({
      playabilityStatus: { status: "OK" }, videoDetails: { title: "Lesson", author: "Teacher", lengthSeconds: "120" },
      captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: "en", baseUrl: "https://www.youtube.com/api/timedtext?v=test" }] } },
    });
    return json({ events: [{ segs: [{ utf8: "Real captions for a short video." }] }] });
  }, { key: "" });
  assert.equal(res.code, 200);
  assert.equal(res.body.minutes, 2);
  assert.equal(res.body.transcript, "Lesson\n\nReal captions for a short video.");
});

test("long transcripts are capped at the existing size limit", async (t) => {
  const res = await call(t, async (address) => String(address).includes("/oembed") ? json({}) : json({ content: "a".repeat(160000) }));
  assert.equal(res.code, 200);
  assert.equal(res.body.transcript.length, 150000);
});

test("invalid links never call a provider", async (t) => {
  const res = await call(t, () => { assert.fail("must not fetch"); }, { url: "https://example.com" });
  assert.equal(res.code, 400);
});

test("non-POST requests never call a provider", async (t) => {
  const res = await call(t, () => { assert.fail("must not fetch"); }, { method: "GET" });
  assert.equal(res.code, 405);
});

test("the browser does not automatically retry a billable YouTube request", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return json({ error: "Video importing is busy." }, 503); });
  const { readYouTube } = await import("../src/ai.js");
  await assert.rejects(readYouTube(`https://youtu.be/${id}`), /Video importing is busy/);
  assert.equal(calls, 1);
});
