// The research browser beside the notebook.
//
// A website cannot show most other sites inside itself: they forbid being
// framed. So this does the parts a browser needs a server for. It searches,
// it says whether a page may be shown live, and for pages that may not it
// fetches them and returns a clean reader view (the title, headings, text and
// pictures), the way Safari's Reader does. It also fetches a picture so it
// can be put on a notebook page.
//
// It fetches addresses a student gives it, so it only ever fetches public
// web addresses: never a private, local or internal one, checked again at
// every redirect, with time and size limits.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { userError, fail } from "./_llm.js";
import { allow } from "./_guard.js";

export const config = { maxDuration: 20 };

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const MAX_PAGE = 2_500_000;
const MAX_IMAGE = 4_000_000;

function privateAddress(ip) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? privateAddress(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function safeUrl(raw) {
  let url;
  try { url = new URL(String(raw)); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
  if (url.port && !["80", "443"].includes(url.port)) return null;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return null;
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => privateAddress(a.address))) return null;
  return url;
}

// Fetches a public address, following up to four redirects, each one checked.
async function get(raw, { accept = "text/html", limit = MAX_PAGE } = {}) {
  let url = await safeUrl(raw);
  for (let hop = 0; url && hop < 5; hop++) {
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(9000), headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "en-GB,en;q=0.9" } });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      url = await safeUrl(new URL(r.headers.get("location"), url));
      continue;
    }
    const length = Number(r.headers.get("content-length") || 0);
    if (length > limit) throw Object.assign(new Error("That page is too large to open here."), { status: 413 });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > limit) throw Object.assign(new Error("That page is too large to open here."), { status: 413 });
    return { url, res: r, buf };
  }
  throw Object.assign(new Error("That address cannot be opened here."), { status: 400 });
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", copy: "©", deg: "°", rarr: "→", larr: "←", harr: "↔", times: "×", divide: "÷", plusmn: "±", minus: "−", le: "≤", ge: "≥", ne: "≠", pi: "π", micro: "µ", sup2: "²", sup3: "³" };
const decode = (s) => String(s).replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m);
const strip = (s) => decode(String(s).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")); return m ? decode(m[2] ?? m[3] ?? m[4] ?? "") : ""; };

// May this page be shown inside another site?
export function framable(res, url) {
  if (url.protocol !== "https:") return false;
  if (res.headers.get("x-frame-options")) return false;
  const csp = res.headers.get("content-security-policy") || "";
  const fa = csp.match(/frame-ancestors([^;]*)/i);
  return !fa || /\*(\s|$)/.test(fa[1]);
}

// The readable part of a page: headings, paragraphs, list items, pictures.
export function reader(html, base) {
  const title = strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const ogImage = attr((html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i) || [""])[0], "content");
  let body = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg|nav|footer|header|aside|form|iframe|button|select)\b[\s\S]*?<\/\1>/gi, "");
  const main = body.match(/<article\b[\s\S]*<\/article>/i) || body.match(/<main\b[\s\S]*<\/main>/i) || body.match(/<body\b[\s\S]*<\/body>/i);
  if (main) body = main[0];
  const blocks = [];
  const abs = (u) => { try { const x = new URL(u, base); return x.protocol === "https:" || x.protocol === "http:" ? x.href : ""; } catch { return ""; } };
  const re = /<(h[1-4]|p|li|img|figcaption|blockquote)\b([^>]*)>([\s\S]*?)(?=<\/\1>|<(?:h[1-4]|p|li|figcaption|blockquote)\b)|<img\b[^>]*>/gi;
  for (const m of body.matchAll(re)) {
    if (blocks.length > 220) break;
    const tag = (m[1] || "img").toLowerCase();
    if (tag === "img") {
      const src = abs(attr(m[0], "src") || attr(m[0], "data-src"));
      const w = Number(attr(m[0], "width") || 0);
      if (src && !/\.svg(\?|$)|pixel|spacer|logo|icon|avatar/i.test(src) && (!w || w >= 120)) blocks.push({ img: src, alt: attr(m[0], "alt").slice(0, 200) });
      continue;
    }
    const text = strip(m[3]);
    if (!text) continue;
    if (tag.startsWith("h")) blocks.push({ h: text.slice(0, 200) });
    else if (tag === "li") { if (text.length > 2) blocks.push({ li: text.slice(0, 600) }); }
    else if (text.length > 30 || tag === "figcaption") blocks.push({ p: text.slice(0, 3000), small: tag === "figcaption" });
  }
  // Drop runs of short menu-like list items that slipped through.
  const clean = blocks.filter((b, i) => !(b.li && b.li.length < 25 && blocks[i + 1]?.li && blocks[i + 1].li.length < 25));
  return { title, image: ogImage ? abs(ogImage) : "", blocks: clean.slice(0, 200) };
}

async function search(q) {
  const results = [];
  try {
    const { buf } = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=uk-en`);
    const html = buf.toString("utf8");
    for (const m of html.matchAll(/<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/gi)) {
      let href = decode(m[1]);
      const u = href.match(/[?&]uddg=([^&]+)/);
      if (u) href = decodeURIComponent(u[1]);
      if (href.startsWith("//")) href = "https:" + href;
      if (!/^https?:\/\//.test(href) || /duckduckgo\.com\/y\.js/.test(href)) continue;
      results.push({ title: strip(m[2]), url: href, snippet: strip(m[3] || ""), site: new URL(href).hostname.replace(/^www\./, "") });
      if (results.length >= 12) break;
    }
  } catch { /* try Wikipedia instead */ }
  if (!results.length) {
    const r = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=10&format=json`, { headers: { "User-Agent": "Dwiddle/1.0 (study app)" }, signal: AbortSignal.timeout(8000) }).then((x) => x.json()).catch(() => null);
    for (const s of r?.query?.search || []) {
      results.push({ title: s.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, "_"))}`, snippet: strip(s.snippet), site: "en.wikipedia.org" });
    }
  }
  return results;
}

// Pictures for a search, for the notebook browser's own picture panel.
// Pictures inside Google's page cannot be dragged out (Google Lens takes the
// drag), so Dwiddle lists them itself: Bing's image results first, then
// Wikimedia Commons, which always answers.
export async function images(q) {
  const out = [], seen = new Set();
  const add = (full, thumb, title, page) => {
    if (!/^https:\/\//.test(full || "") || seen.has(full) || /\.svg(\?|$)/i.test(full)) return;
    seen.add(full);
    out.push({ url: full, thumb: /^https:\/\//.test(thumb || "") ? thumb : full, title: strip(title || "").slice(0, 120), page: page || "" });
  };
  try {
    const { buf } = await get(`https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1&safeSearch=Strict`);
    for (const m of buf.toString("utf8").matchAll(/\bm="(\{[^"]*?\})"/g)) {
      try { const j = JSON.parse(decode(m[1])); add(j.murl, j.turl, j.t, j.purl); } catch { /* skip a malformed one */ }
      if (out.length >= 30) break;
    }
  } catch { /* try Commons instead */ }
  if (out.length < 6) {
    const r = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q)}&gsrlimit=30&prop=imageinfo&iiprop=url|mime&iiurlwidth=320&format=json`,
      { headers: { "User-Agent": "Dwiddle/1.0 (study app)" }, signal: AbortSignal.timeout(8000) }).then((x) => x.json()).catch(() => null);
    const pages = Object.values(r?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    for (const pg of pages) {
      const i = pg.imageinfo?.[0];
      if (i && /^image\/(png|jpe?g|gif|webp)$/.test(i.mime)) add(i.url, i.thumburl, pg.title.replace(/^File:|\.\w+$/g, ""), i.descriptionurl);
    }
  }
  return out.slice(0, 30);
}

export default async function handler(req, res) {
  if (!allow(req, res, { limit: 40 })) return;
  const { action, q, url } = req.body || {};
  try {
    if (action === "search") {
      const query = String(q || "").trim().slice(0, 200);
      if (!query) return userError(res, 400, "Type something to search for.");
      return res.status(200).json({ results: await search(query) });
    }
    if (action === "images") {
      const query = String(q || "").trim().slice(0, 200);
      if (!query) return userError(res, 400, "Type something to find pictures of.");
      return res.status(200).json({ images: await images(query) });
    }
    if (action === "open") {
      const { url: final, res: r, buf } = await get(url);
      const type = r.headers.get("content-type") || "";
      if (!/text\/html|application\/xhtml/i.test(type)) return userError(res, 415, "That is not a web page. Open it in your own browser instead.");
      const page = reader(buf.toString("utf8"), final);
      return res.status(200).json({ url: final.href, framable: framable(r, final) && r.ok, ...page });
    }
    if (action === "image") {
      const { res: r, buf } = await get(url, { accept: "image/*", limit: MAX_IMAGE });
      const type = (r.headers.get("content-type") || "").split(";")[0];
      if (!/^image\/(png|jpe?g|gif|webp)$/i.test(type)) return userError(res, 415, "That is not a picture that can be added.");
      return res.status(200).json({ data: `data:${type};base64,${buf.toString("base64")}` });
    }
    return userError(res, 400, "Unknown action.");
  } catch (err) {
    if (err.status) return userError(res, err.status, err.message);
    if (err.name === "TimeoutError") return userError(res, 504, "That page took too long to answer.");
    fail(res, err);
  }
}
