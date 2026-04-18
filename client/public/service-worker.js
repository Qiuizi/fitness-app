/* IRON PWA service worker
   Strategy:
   - Precache app shell on install.
   - API calls (/api/*) → network-only with graceful offline JSON.
   - Static build assets (/static/*) → cache-first, long-lived.
   - Navigation requests → network-first falling back to cached index.
*/

const VERSION = 'v1';
const SHELL_CACHE = `iron-shell-${VERSION}`;
const ASSET_CACHE = `iron-assets-${VERSION}`;
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Skip cross-origin API calls entirely — let the app's own error handling run.
  if (url.origin !== self.location.origin && /\/api\//.test(url.pathname)) return;
  if (url.pathname.startsWith('/api/')) return;

  // Build assets (hashed) — cache first.
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Navigation — network-first, fall back to cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Default: try cache, then network.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && url.origin === self.location.origin) {
        const copy = res.clone();
        caches.open(ASSET_CACHE).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
