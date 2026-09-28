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
