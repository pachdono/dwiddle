// A picture from Wikipedia for something in the notes: the lead image of the
// best matching article, but only when the article's title shares a real word
// with what was asked for. A wrong picture is worse than none.

const STOP = new Set(["the", "and", "of", "in", "a", "an", "to", "for", "on", "with", "its", "their", "how", "what", "why", "introduction", "basics", "overview", "part", "chapter", "unit", "topic", "diagram"]);
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

const CACHE = "dwiddle-pics";
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
  if (!want.length) return null;
  const known = cached()[key.toLowerCase()];
  if (known !== undefined) return known;
  let pic = null;
  try {
    const q = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(key)}&srlimit=3&format=json&origin=*`).then((r) => r.json());
    for (const hit of q?.query?.search || []) {
      if (!words(hit.title).some((w) => want.includes(w))) continue;
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
