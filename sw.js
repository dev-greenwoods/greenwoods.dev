const CACHE_NAME = 'greenwoods-static-v2';
const APP_SHELL = [
  '/',
  '/css/index.css',
  '/js/theme.js',
  '/manifest.webmanifest',
  '/assets/greenwoods-icon.svg',
  '/assets/vendor/marked.min.js',
  '/assets/vendor/js-yaml.min.js',
  '/assets/vendor/qrcode.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('greenwoods-static-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_URLS' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => Promise.all(event.data.urls.map(async path => {
      const url = new URL(path, self.location.origin);
      if (url.origin !== self.location.origin || url.search || url.hash) return;
      const response = await fetch(url.href);
      if (response.ok && response.type === 'basic') await cache.put(url.href, response);
    })))
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic' && !url.search) {
          const cacheWrite = caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          event.waitUntil(cacheWrite.catch(error => {
            console.error('Greenwoods could not cache an offline resource.', error);
          }));
        }
        return response;
      }).catch(error => {
        if (request.mode === 'navigate') {
          return caches.match('/').then(fallback => {
            if (fallback) return fallback;
            throw error;
          });
        }
        throw error;
      });
    })
  );
});
