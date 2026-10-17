const CACHE_NAME = 'geethikal-shell-v2';

const APP_FILES = [
  './',
  './index.html',
  './admin.html',
  './style.css',
  './app.js',
  './admin.js',
  './geethika.json',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await cache.addAll(
      APP_FILES.map(path =>
        new URL(path, self.registration.scope).href
      )
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith('geethikal-shell-') &&
          key !== CACHE_NAME
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Always check the latest HTML from the server first.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request, {
          cache: 'no-cache'
        });

        if (response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch {
        const cached = await cache.match(request);

        if (cached) return cached;

        const page = url.pathname.endsWith('/admin.html')
          ? './admin.html'
          : './index.html';

        return (
          await cache.match(
            new URL(page, self.registration.scope).href
          )
        ) || Response.error();
      }
    })());

    return;
  }

  // Always fetch the latest JavaScript and CSS when online.
  if (
    url.pathname.endsWith('/app.js') ||
    url.pathname.endsWith('/admin.js') ||
    url.pathname.endsWith('/style.css')
  ) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request, {
          cache: 'no-cache'
        });

        if (response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch {
        return (
          await cache.match(request)
        ) || Response.error();
      }
    })());

    return;
  }

  // Keep the song data available offline.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (url.pathname.endsWith('/geethika.json')) {
      try {
        const response = await fetch(request, {
          cache: 'no-cache'
        });

        if (response.ok) {
          await cache.put(request, response.clone());
        }

        return response;
      } catch {
        return (
          await cache.match(request)
        ) || Response.error();
      }
    }

    const cached = await cache.match(request);

    if (cached) return cached;

    try {
      const response = await fetch(request);

      if (response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    } catch {
      return Response.error();
    }
  })());
});