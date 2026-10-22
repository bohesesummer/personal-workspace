// Offline cache for this app only. Repository-path-scoped key avoids other Pages apps.
const SCOPE_KEY = self.registration.scope.replace(/[^a-z0-9]/gi, '_');
const CACHE_PREFIX = 'personalworkspace-m1-v2-';
const CACHE_NAME = CACHE_PREFIX + SCOPE_KEY;
const ASSETS = ['./', './index.html', './assets/styles.css', './assets/app.js', './assets/favicon.svg', './manifest.webmanifest'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key.endsWith(SCOPE_KEY) && key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
      }
      return response;
    }).catch(() => caches.match(event.request).then(cached => {
      if (cached) return cached;
      if (event.request.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    }))
  );
});
