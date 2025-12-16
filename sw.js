const CACHE = 'continuity-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './ui.js',
  './manifest.webmanifest',
  './assets/icon.svg',
  './promptpacks/core.json' // optional local
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE) ? null : caches.delete(k)));
    self.clients.claim();
  })());
});

// Network-first for prompt packs; cache-first for static assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isPromptPack = url.pathname.includes('/promptpacks/');
  if (isPromptPack) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(e.request, {cache:'no-store'});
        const cache = await caches.open(CACHE);
        cache.put(e.request, fresh.clone());
        return fresh;
      } catch (_) {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(e.request);
        if (hit) return hit;
        // final fallback to embedded in index.html handled by ui.js
        throw _;
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(e.request);
    if (hit) return hit;
    try {
      const net = await fetch(e.request);
      if (net.ok && e.request.method === 'GET' && net.type !== 'opaque') {
        cache.put(e.request, net.clone());
      }
      return net;
    } catch (_) {
      // Offline fallback: return index for navigation requests
      if (e.request.mode === 'navigate') return cache.match('./index.html');
      throw _;
    }
  })());
});

