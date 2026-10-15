// What a link looks like when it is pasted into a chat.
//
// A collaboration link (/notebook?live=CODE) opens the same app as every other
// address, so its preview used to be the front page's. Link previews are read
// by chat apps that run no scripts, so the words and picture have to be in the
// page they download. This serves the app's own index.html with just the
// title, description and picture changed, so a person who opens the link still
// gets the app. It rides on api/models.js, since the plan allows twelve
// functions and all twelve are taken.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Replaces the content of one meta tag, or adds the tag if the page has none.
export function setMeta(html, attr, name, content) {
  const re = new RegExp(`<meta\\s+${attr}="${name.replace(/[.:]/g, "\\$&")}"\\s+content="[^"]*"\\s*/?>`, "i");
  const tag = `<meta ${attr}="${name}" content="${esc(content)}" />`;
  return re.test(html) ? html.replace(re, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

export function retag(html, { title, description, image, url, alt }) {
  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`);
  out = setMeta(out, "name", "description", description);
  out = setMeta(out, "property", "og:title", title);
  out = setMeta(out, "property", "og:description", description);
  out = setMeta(out, "property", "og:image", image);
  out = setMeta(out, "property", "og:image:alt", alt || title);
  out = setMeta(out, "property", "og:url", url);
  out = setMeta(out, "name", "twitter:title", title);
  out = setMeta(out, "name", "twitter:description", description);
  out = setMeta(out, "name", "twitter:image", image);
  return out;
}

export const cleanCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);

// Only this deployment's own address is ever fetched, whatever the request says.
export const originOf = (host) => (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i.test(String(host || "")) ? `https://${host}` : "https://dwiddle.vercel.app");

export async function preview(req, res) {
  const code = cleanCode(req.query?.live);
  const origin = originOf(req.headers?.["x-forwarded-host"] || req.headers?.host);
  let html = "";
  try {
    const r = await fetch(`${origin}/index.html`, { signal: AbortSignal.timeout(5000) });
    if (r.ok) html = await r.text();
  } catch { /* falls back below */ }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
  if (!html) {
    // the app page could not be read: a small page that still carries the preview and leads to the app
    html = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Dwiddle</title></head><body><p><a href="/">Open Dwiddle</a></p></body></html>`;
  }
  if (code.length !== 5) return res.status(200).send(html);
  const title = "Join my notebook on Dwiddle";
  const description = "Write, draw and add things in the same notebook at the same time. Open the link to join live.";
  return res.status(200).send(retag(html, {
    title, description,
    image: `${origin}/og-collab.png`,
    url: `${origin}/notebook?live=${code}`,
    alt: "Dwiddle: write in a notebook together, live",
  }));
}
