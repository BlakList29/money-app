/* Service worker: оффлайн-доступ к «Гаражу» */
var CACHE = 'garage-v3';

var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/bg.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/fonts/manrope-cyrillic.woff2',
  './assets/fonts/manrope-cyrillic-ext.woff2',
  './assets/fonts/manrope-latin.woff2'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(ASSETS.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  /* Всё внешнее (шрифты и т.п.) — только сеть, офлайн просто пропускаем */
  if (url.origin !== self.location.origin) return;

  /* Навигация: сначала сеть, офлайн — из кэша, всегда есть запасной index.html */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put('./index.html', copy); }).catch(function () {});
        return response;
      }).catch(function () {
        return caches.match('./index.html').then(function (hit) {
          return hit || caches.match('./');
        });
      })
    );
    return;
  }

  /* Остальное: из кэша сразу, обновление — в фоне */
  event.respondWith(
    caches.match(request).then(function (hit) {
      if (hit) {
        fetch(request).then(function (response) {
          if (response && response.ok) {
            caches.open(CACHE).then(function (cache) { cache.put(request, response); }).catch(function () {});
          }
        }).catch(function () {});
        return hit;
      }
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); }).catch(function () {});
        }
        return response;
      }).catch(function () {
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    })
  );
});