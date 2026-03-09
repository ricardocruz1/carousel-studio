/**
 * Carousel Studio — Service Worker
 *
 * Strategy:
 *   - Static assets (JS, CSS, HTML, icons): cache-first
 *   - Navigation requests: network-first with cache fallback
 *   - Cross-origin (Google Fonts, AdSense, analytics): network-only (never cached)
 *
 * Bump CACHE_VERSION to bust the cache after a deploy.
 */

const CACHE_VERSION = 'cs-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/site.webmanifest',
  '/favicon.svg',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

// ─── Install: pre-cache shell ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ─── Activate: clean up old caches ─────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Claim all open tabs so the SW takes effect immediately
  self.clients.claim();
});

// ─── Fetch: routing logic ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests entirely (AdSense, Google Fonts CDN, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Navigation requests: network-first (so fresh deploys show instantly)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh HTML for offline use
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});
