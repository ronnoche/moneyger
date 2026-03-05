const STATIC_CACHE = 'moneyger-static-v1';
const API_CACHE = 'moneyger-api-v1';
const STATIC_ASSETS = ['/', '/manifest.json'];
const API_PREFIXES = ['/api/budgets', '/api/bucket-lists', '/api/accounts', '/api/transactions', '/api/cashflow', '/api/payees'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => ![STATIC_CACHE, API_CACHE].includes(key)).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

const shouldCacheApi = (url) => API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (shouldCacheApi(url)) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise || new Response(JSON.stringify({ error: 'Offline and not cached' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons') || url.pathname.endsWith('.png')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }

        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
      }),
    );
  }
});

