/**
 * WonFlow service worker.
 *
 * This exists so the installed app has an icon, a splash and something to show
 * when the network drops. It caches build output and brand artwork and nothing
 * else.
 *
 * It used to be network-first over every non-API GET, which meant it wrote
 * fully rendered, signed-in HTML into a cache shared by every account on the
 * device. On a ward workstation the next person to open WonFlow offline could
 * be served the previous clinician's screen, patient names and all. Documents
 * are never cached now - if the network is down the offline page is shown
 * instead, and a signed-in page is only ever reachable by asking the server,
 * which is the only thing that can check who is asking.
 *
 * Clinical data and the mutation outbox live in IndexedDB (C-09), not here.
 */

const CACHE_NAME = "wonflow-shell-v2";

const PRECACHE = [
  "/offline.html",
  "/brand/wonflow-icon-192.png",
  "/brand/wonflow-icon-512.png",
];

/** Build output and brand artwork: immutable, public, safe to keep. */
function isCacheableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/apple-icon.png" ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // One missing file must not fail the whole install, or the worker never
      // activates and the app is not installable at all.
      .then((cache) =>
        Promise.all(
          PRECACHE.map((asset) => cache.add(asset).catch(() => undefined)),
        ),
      ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Another origin's caching is its own business.
  if (url.origin !== self.location.origin) return;

  // Never cache or intercept anything on localhost during development
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return;

  // Never touch the API. Every response there is account-scoped.
  if (url.pathname.startsWith("/api/")) return;

  // Pages are never cached. Offline, say so rather than replaying whatever
  // the last person on this device was looking at.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match("/offline.html")
          .then(
            (cached) =>
              cached ??
              new Response("WonFlow is offline.", {
                status: 503,
                headers: { "Content-Type": "text/plain" },
              }),
          ),
      ),
    );
    return;
  }

  if (!isCacheableAsset(url)) return;

  // Cache-first: these paths are content-hashed or versioned by deploy.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
