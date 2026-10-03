// A picture from Wikipedia for something in the notes: the lead image of the
// best matching article, but only when the article's title shares a real word
// with what was asked for. A wrong picture is worse than none.

const STOP = new Set(["the", "and", "of", "in", "a", "an", "to", "for", "on", "with", "its", "their", "how", "what", "why", "introduction", "basics", "overview", "part", "chapter", "unit", "topic", "diagram"]);
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

// Things a photo from an encyclopaedia cannot show: a graph of this topic,
// a chart, a calculation. Wikipedia has articles that share the words but
// not the meaning ("distance-time graph" finds "Unit distance graph").
const NOT_A_PICTURE = /\b(graphs?|charts?|axis|axes|gradient|plot|plotting|equation|formula|calculation|sketch|curve)\b/i;
// The title says what was asked and nothing more specific: every word of one
// is in the other. "Unit distance graph" is a different thing from "distance
// time graph", and "Animal cell" is not "Cell".
const same = (a, b) => a.every((w) => b.some((g) => g.startsWith(w.slice(0, 5)) || w.startsWith(g.slice(0, 5))));
const sameThing = (title, want) => { const t = words(title.replace(/\(.*?\)/g, " ")); return t.length > 0 && same(t, want) && same(want, t); };

const CACHE = "dwiddle-pics-v2";
const cached = () => { try { return JSON.parse(localStorage.getItem(CACHE) || "{}"); } catch { return {}; } };
function remember(query, pic) {
  try {
    const all = cached();
    all[query.toLowerCase()] = pic;
    const keys = Object.keys(all);
    if (keys.length > 200) keys.slice(0, keys.length - 200).forEach((k) => delete all[k]);
    localStorage.setItem(CACHE, JSON.stringify(all));
  } catch { /* storage full or blocked: look it up again next time */ }
}

// { src, w, h, title, page } or null. src is a thumbnail address on Wikimedia.
export async function findPicture(query) {
  const key = String(query || "").trim();
  const want = words(key);
  if (!want.length || NOT_A_PICTURE.test(key)) return null;
  const known = cached()[key.toLowerCase()];
  if (known !== undefined) return known;
  let pic = null;
  try {
    const q = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(key)}&srlimit=3&format=json&origin=*`).then((r) => r.json());
    for (const hit of q?.query?.search || []) {
      if (!sameThing(hit.title, want)) continue;
      const s = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title.replace(/ /g, "_"))}`).then((r) => r.json());
      if (s?.type === "disambiguation" || !s?.thumbnail?.source) continue;
      const big = s.originalimage?.width > 900;
      pic = {
        src: big ? s.thumbnail.source.replace(/\/\d+px-/, "/640px-") : (s.originalimage?.source || s.thumbnail.source),
        w: big ? 640 : (s.originalimage?.width || s.thumbnail.width),
        h: big ? Math.round(640 * (s.originalimage.height / s.originalimage.width)) : (s.originalimage?.height || s.thumbnail.height),
        title: s.title,
        page: s.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, "_"))}`,
      };
      break;
    }
  } catch {
    return null; // offline: try again another time rather than remembering "none"
  }
  remember(key, pic);
  return pic;
}

// A plain drawn diagram of something, for the videos: an illustration from
// Wikimedia Commons (a drawing, not a photo or a micrograph) whose name
// matches, rendered small. Falls back to the article's own picture.
export async function findDiagram(query) {
  const key = String(query || "").trim();
  const want = words(key);
  if (!want.length) return null;
  const cacheKey = "diagram:" + key.toLowerCase();
  const known = cached()[cacheKey];
  if (known !== undefined) return known;
  let pic = null;
  try {
    const q = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=8&format=json&origin=*&srsearch=${encodeURIComponent(`${key} diagram filetype:drawing`)}`).then((r) => r.json());
    const hits = (q?.query?.search || []).map((h) => h.title)
      // Every real word of what was asked for is in the file's name, so
      // "Plant cell" never picks an animal cell.
      .filter((t) => { const got = words(t.replace(/^File:/, "").replace(/\.[a-z]+$/i, "")); return want.every((w) => got.some((g) => g.startsWith(w.slice(0, 5)))); });
    if (hits.length) {
      const info = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|size&iiurlwidth=640&format=json&origin=*&titles=${encodeURIComponent(hits[0])}`).then((r) => r.json());
      const page = Object.values(info?.query?.pages || {})[0];
      const ii = page?.imageinfo?.[0];
      if (ii?.thumburl) {
        pic = { src: ii.thumburl, w: ii.thumbwidth, h: ii.thumbheight, title: hits[0].replace(/^File:/, "").replace(/\.[a-z]+$/i, "").replace(/_/g, " ").replace(/[- ](en|eng|english)$/i, ""), page: ii.descriptionurl };
      }
    }
  } catch {
    return findPicture(key); // offline or blocked: the article picture, if that works
  }
  if (!pic) pic = await findPicture(key);
  remember(cacheKey, pic);
  return pic;
}
