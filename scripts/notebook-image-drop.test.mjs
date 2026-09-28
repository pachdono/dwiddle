import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageDropCandidates, readDroppedImage } from '../src/notebookImageDrop.js';

test('Google thumbnail remains available when the original is blocked', async () => {
  const thumbnail = 'data:image/png;base64,dGh1bWI=';
  const candidates = imageDropCandidates({ images: ['https://example.com/blocked.jpg', thumbnail], links: 'https://www.google.com/imgres?imgurl=https%3A%2F%2Fexample.com%2Fblocked.jpg' });
  const calls = [];
  const picture = await readDroppedImage(candidates, async (url) => {
    calls.push(url);
    if (url === thumbnail) return 'decoded picture';
    throw new Error('Forbidden');
  });
  assert.equal(picture, 'decoded picture');
  assert.deepEqual(calls, ['https://example.com/blocked.jpg', thumbnail]);
});
test('accepts plain URL drops, Google originals and commented URI lists', () => {
  assert.deepEqual(imageDropCandidates({ text: 'https://example.com/pic.jpg' }), ['https://example.com/pic.jpg']);
  assert.deepEqual(imageDropCandidates({ links: '# image\r\nhttps://www.google.com/imgres?imgurl=https%3A%2F%2Fexample.com%2Fpic.jpg' }), ['https://example.com/pic.jpg']);
});
test('ignores Google pages and inaccessible schemes instead of importing HTML', () => {
  assert.deepEqual(imageDropCandidates({ images: ['blob:https://google.com/123', 'file:///etc/passwd', 'javascript:alert(1)'], links: 'https://www.google.com/search?q=cars', text: 'A picture of a car' }), []);
});
test('empty and blocked drops produce actionable errors', async () => {
  await assert.rejects(readDroppedImage([], async () => { throw new Error('must not run'); }), /browser did not share/);
  await assert.rejects(readDroppedImage(['https://example.com/blocked.jpg'], async () => { throw new Error('403'); }), /Copy image/);
});

test("a data: picture becomes a Blob without fetch, which the site's policy forbids", async () => {
  const { dataUrlBlob, blobOf } = await import("../src/notebookImageDrop.js");
  const png = "data:image/png;base64,iVBORw0KGgo=";
  const blob = dataUrlBlob(png);
  assert.equal(blob.type, "image/png");
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())].slice(0, 4), [0x89, 0x50, 0x4e, 0x47]);
  const saved = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("fetch must not be used for data:"); };
  try { assert.equal((await blobOf(png)).type, "image/png"); } finally { globalThis.fetch = saved; }
  assert.equal(dataUrlBlob("data:image/svg+xml,%3Csvg%2F%3E").type, "image/svg+xml");
});
