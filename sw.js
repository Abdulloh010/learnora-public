/* Learnora Service Worker — v3.0 */
// Bump CACHE_NAME whenever the app shell changes so every client picks up the new version
const CACHE_NAME = 'learnora-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/learnora.css',
  '/js/learnora-app.js',
  '/js/courses.js',
  '/manifest.json',
  '/logo-dr.png',
  '/logo-lg.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

/* ── Install: pre-cache static shell ── */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
           .catch(() => {}) // don't block install on external CDN failures
    )
  );
});

/* ── Activate: clear old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch strategy ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls — always go network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ success: false, error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Navigation requests — network-first, fall back to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      // cache:'no-cache' revalidates with the server so a stale HTTP-cached index.html is never used
      fetch(request, { cache: 'no-cache' })
        .then(res => {
          // Update cache with fresh version
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // JS and CSS — network-first so users always get fresh code; fall back to cache offline
  if (url.pathname.startsWith('/css/') || url.pathname.startsWith('/js/')) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' }).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      // Offline: fall back to any cached copy, even one saved under a different ?v=
      }).catch(() => caches.match(request).then(hit => hit || caches.match(request, { ignoreSearch: true })))
    );
    return;
  }

  // Images and fonts — stale-while-revalidate (rarely change)
  if (
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/) ||
    url.hostname !== location.hostname
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

/* ── Handle skip-waiting message from page ── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
