// Force unregister and clear all caches — the old SW cached pages with
// broken CSP headers that block JavaScript on LAN devices.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.matchAll()).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: "SW_CLEARED" });
      }
      return self.registration.unregister();
    })
  );
});
