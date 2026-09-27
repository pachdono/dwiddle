// Offline support, and the fetch handler a browser requires before it will
// offer to install the app.
//
// Two strategies, chosen by what the file is:
//
//   navigation  network first, falling back to the cached shell when offline.
//               Never cache first, or a stale index.html would keep pointing
//               at asset filenames that no longer exist after a deploy.
//   /assets/*   cache first. Vite puts a content hash in every asset name, so
//               a given URL can never change meaning and is safe to keep.

const VERSION = "v2";
const SHELL = `dwiddle-shell-${VERSION}`;
const ASSETS = `dwiddle-assets-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(["/", "/favicon.svg", "/icon-192.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the API. A stale set of questions would be worse than an error.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((reply) => {
          const copy = reply.clone();
          caches.open(SHELL).then((c) => c.put("/", copy));
          return reply;
        })
        .catch(() => caches.match("/").then((hit) => hit || Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit || fetch(request).then((reply) => {
          // Only real files: a missing chunk must not be kept as a page.
          if (reply.ok && !(reply.headers.get("content-type") || "").includes("text/html")) {
            const copy = reply.clone();
            caches.open(ASSETS).then((c) => c.put(request, copy));
          }
          return reply;
        }),
      ),
    );
  }
});
