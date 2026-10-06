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
import { allow, allowFrame } from "./_guard.js";
import { randomBytes } from "node:crypto";

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

// A page shown live in the notebook browser, for sites that refuse to be
// framed. It is fetched here and served from this site, so it is locked down
// hard: none of the site's own scripts run, and it is sandboxed into an
// origin of its own, so nothing on it can reach a Dwiddle account or storage.
// One small script of ours tells the notebook where a click leads, so every
// link and search form opens the next page the same way.
const HOP = `
(function () {
  var send = function (m) { parent.postMessage(Object.assign({ dw: "browse" }, m), "*"); };
  var here = document.querySelector("base").href;
  document.addEventListener("DOMContentLoaded", function () {
    var text = (document.body && document.body.innerText) || "";
    send({ type: "loaded", url: here, title: document.title, words: text.split(/\\s+/).length,
      needsScript: /enable javascript|javascript is (disabled|required|turned off)|requires javascript/i.test(text.slice(0, 3000)) });
  });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented) return;
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#") return;
    var u; try { u = new URL(href, here); } catch (x) { return; }
    if (u.protocol !== "http:" && u.protocol !== "https:") return;
    e.preventDefault();
    if (u.href.split("#")[0] === here.split("#")[0] && u.hash) { location.hash = u.hash; return; }
    send({ type: "open", url: u.href });
  }, true);
  document.addEventListener("submit", function (e) {
    var f = e.target; e.preventDefault();
    if ((f.method || "get").toLowerCase() !== "get") return;
    var u; try { u = new URL(f.getAttribute("action") || here, here); } catch (x) { return; }
    new FormData(f).forEach(function (v, k) { if (typeof v === "string") u.searchParams.set(k, v); });
    send({ type: "open", url: u.href });
  }, true);
})();`;

function liveView(html, base, nonce) {
  let out = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "")
    .replace(/<\/?noscript\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?(refresh|content-security-policy|x-frame-options)[^>]*>/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    // Pictures that only appear once a script swaps them in.
    .replace(/<img\b([^>]*?)\sdata-src\s*=\s*("[^"]*"|'[^']*')([^>]*)>/gi, (m, a, src, b) => {
      if (/\ssrc\s*=/.test(a + b) && !/\ssrc\s*=\s*["']data:/.test(a + b)) return m;
      const drop = (x) => x.replace(/\ssrc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      return `<img${drop(a)} src=${src}${drop(b)}>`;
    })
    .replace(/\sloading\s*=\s*["']?lazy["']?/gi, "");
  const head = `<base href="${base.href.replace(/"/g, "&quot;")}" target="_self"><meta name="referrer" content="no-referrer"><script nonce="${nonce}">${HOP}</script>`;
  if (/<head\b[^>]*>/i.test(out)) out = out.replace(/<head\b[^>]*>/i, (m) => m + head);
  else out = head + out;
  return out;
}

function decodePage(buf, type) {
  const named = (type.match(/charset=([\w-]+)/i) || [])[1] || (buf.subarray(0, 2048).toString("latin1").match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1] || "utf-8";
  try { return new TextDecoder(named.toLowerCase()).decode(buf); } catch { return buf.toString("utf8"); }
}

async function frame(req, res) {
  if (!allowFrame(req, res)) return;
  const page = (status, text) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self' file:");
    res.status(status).send(`<!doctype html><meta charset="utf-8"><body style="font:15px -apple-system,system-ui,sans-serif;color:#555;display:grid;place-items:center;height:90vh;text-align:center;padding:20px"><div><b style="color:#222">That page could not be opened here</b><p>${text}</p></div>`);
  };
  try {
    const { url: final, res: r, buf } = await get(String(req.query?.view || ""));
    const type = r.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(type)) return page(415, "It is not a web page. Open it in your own browser instead.");
    const nonce = randomBytes(16).toString("base64");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", [
      "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox",
      "default-src 'none'",
      `script-src 'nonce-${nonce}'`,
      "style-src * data: 'unsafe-inline'",
      "img-src * data: blob:",
      "font-src * data:",
      "media-src *",
      "frame-src https:",
      "form-action 'none'",
      "frame-ancestors 'self' file:",
    ].join("; "));
    return res.status(r.ok ? 200 : r.status).send(liveView(decodePage(buf, type), final, nonce));
  } catch (err) {
    return page(err.status && err.status < 500 ? err.status : 502, err.name === "TimeoutError" ? "It took too long to answer." : err.message || "Try another page.");
  }
}

// Pictures made from a description. Every free source is tried in turn, best
// first, so one being busy or out of its daily allowance just moves on to the
// next. Keys are optional: with none set, only the keyless one is used.
const STYLE = "Clean flat educational illustration for a school student, simple shapes, bold clear colours, plain light background, few labels with large readable spelling, no watermark. Subject: ";
const grab = async (url, init, ms = 25000) => {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r;
};
const PAINTERS = [
  ["gemini", async (p) => {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) return null;
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    const r = await grab(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: STYLE + p }] }], generationConfig: { responseModalities: ["IMAGE"] } }),
    }, 40000);
    const part = ((await r.json()).candidates?.[0]?.content?.parts || []).find((x) => x.inlineData?.data);
    return part ? `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}` : null;
  }],
  ["cloudflare", async (p) => {
    const id = process.env.CF_ACCOUNT_ID, token = process.env.CF_API_TOKEN;
    if (!id || !token) return null;
    const r = await grab(`https://api.cloudflare.com/client/v4/accounts/${id}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prompt: STYLE + p, steps: 6 }),
    });
    const b64 = (await r.json()).result?.image;
    return b64 ? `data:image/jpeg;base64,${b64}` : null;
  }],
  ["huggingface", async (p) => {
    const token = process.env.HF_TOKEN;
    if (!token) return null;
    const r = await grab("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Accept: "image/png" },
      body: JSON.stringify({ inputs: STYLE + p }),
    }, 40000);
    const type = r.headers.get("content-type") || "";
    return /^image\//.test(type) ? `data:${type.split(";")[0]};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}` : null;
  }],
  ["pollinations", async (p) => {
    const r = await grab(`https://image.pollinations.ai/prompt/${encodeURIComponent(STYLE + p)}?width=768&height=576&nologo=true&model=flux&seed=${Math.floor(Math.random() * 1e6)}`, {}, 45000);
    const type = r.headers.get("content-type") || "";
    if (!/^image\/(png|jpe?g|webp)/.test(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length > MAX_IMAGE ? null : `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
  }],
];
async function paint(prompt) {
  const tried = [];
  for (const [name, run] of PAINTERS) {
    try {
      const data = await run(prompt);
      if (data) return { data, by: name };
      tried.push(`${name}: no key or no picture`);
    } catch (e) { tried.push(`${name}: ${e.name === "TimeoutError" ? "too slow" : e.message}`); }
  }
  return { tried };
}

export default async function handler(req, res) {
  if (req.method === "GET" && req.query?.view) return frame(req, res);
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
    if (action === "paint") {
      const prompt = String(q || "").trim().slice(0, 400);
      if (!prompt) return userError(res, 400, "Say what to draw.");
      const made = await paint(prompt);
      if (!made.data) return userError(res, 502, `No picture could be made just now (${made.tried.join("; ")}).`);
      return res.status(200).json(made);
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
