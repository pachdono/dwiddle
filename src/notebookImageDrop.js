// A browser may supply the picture, its thumbnail and its Google result link.
// Keep every usable alternative so a blocked original does not lose the drop.
export function imageDropCandidates({ remote = "", images = [], links = "", text = "" }) {
  const candidates = [];
  const add = (raw) => {
    const value = String(raw || "").trim();
    if (!value || value.startsWith("#")) return;
    if (/^data:image\//i.test(value)) { candidates.push(value); return; }
    try {
      const url = new URL(value.startsWith("//") ? `https:${value}` : value);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return;
      if (/(^|\.)google\.[a-z.]+$/i.test(url.hostname)) {
        const original = url.searchParams.get("imgurl") || url.searchParams.get("mediaurl");
        if (original) {
          const image = new URL(original);
          if (["https:", "http:"].includes(image.protocol) && !image.username && !image.password) candidates.push(image.href);
          return;
        }
        // Search and sharing pages are HTML, never an image to import.
        if (/^\/(search|imgres|url|webhp)\/?$/.test(url.pathname)) return;
      }
      candidates.push(url.href);
    } catch { /* a title or inaccessible blob URL is not a picture address */ }
  };
  [remote, ...images, ...links.split(/\r?\n/), ...text.split(/\r?\n/)].forEach(add);
  return [...new Set(candidates)].slice(0, 5);
}

export async function readDroppedImage(candidates, read) {
  for (const url of candidates) {
    try { return await read(url); } catch { /* try the thumbnail or next source */ }
  }
  throw new Error(candidates.length
    ? "That site blocked the picture. Try Copy image, then paste it onto the page."
    : "The browser did not share a picture. Drag the image itself, or use Copy image and paste it onto the page.");
}

// A picture given as a data: address, as a Blob, without fetch(): the site's
// security policy does not let fetch() read data: addresses, and every web
// picture arrives as one (a Google thumbnail, or the server's copy of any other).
export function dataUrlBlob(url) {
  const m = String(url).match(/^data:([^;,]*)((?:;[^;,]*)*),(.*)$/s);
  if (!m) throw new Error("not a data address");
  const type = m[1] || "application/octet-stream";
  const body = /;base64/i.test(m[2]) ? atob(m[3].replace(/\s+/g, "")) : decodeURIComponent(m[3]);
  const bytes = new Uint8Array(body.length);
  for (let i = 0; i < body.length; i++) bytes[i] = body.charCodeAt(i) & 255;
  return new Blob([bytes], { type });
}

// Any picture address as a Blob: data: decoded here, anything else fetched.
export async function blobOf(src) {
  return /^data:/i.test(src) ? dataUrlBlob(src) : (await fetch(src)).blob();
}
