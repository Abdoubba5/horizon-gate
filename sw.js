/**
 * Horizon Gate — Service Worker (PWA Offline Support)
 * Abdelilah Sidiali © 2026
 */

const CACHE_NAME    = "horizon-gate-v4";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./opportunities.html",
  "./saved.html",
  "./opportunity-detail.html",
  "./css/style.css",
  "./js/horizon-db.js",
  "./js/app-advanced.js",
  "./manifest.json"
];

// Install — cache static assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

