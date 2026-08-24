/**
 * WonFlow HPBSP Service Worker
 * Caches application shell and static assets.
 * Clinical data and mutation outbox are stored exclusively in IndexedDB (C-09) and not in the HTTP cache.
 */

const CACHE_NAME = "wonflow-shell-v1";
const SHELL_ASSETS = [
  "/",
  "/favicon.ico",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API routes or dynamic data
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Network-first with cache fallback for shell assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && event.request.method === "GET") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      }),
  );
});
