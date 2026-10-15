/* Violin Audio Workstation service worker (generated at build time). */
const VERSION = "1.2.0-mv9l80lm";
const PRECACHE = ["./","assets/index-PkiR1-64.css","assets/index-DOVdQ-Dv.js","assets/web-dDffqe3m.js","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png"];
const CACHE = `vaw-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE.map((f) => new Request(new URL(f, self.registration.scope), { cache: 'reload' })))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('vaw-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// The page asks the waiting worker to take over when the player taps "Reload".
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // e.g. The Session API: always live

  if (req.mode === 'navigate') {
    // Network-first so an online launch always gets the latest page
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(new URL('./', self.registration.scope), fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(new URL('./', self.registration.scope))) || Response.error();
      }
    })());
    return;
  }

  // Assets: cache-first (hashed file names never change)
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  })());
});
