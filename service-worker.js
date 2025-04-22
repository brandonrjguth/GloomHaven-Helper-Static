const CACHE_NAME = 'gloomhaven-decks-v1';
const BASE_PATH = '/GloomHaven-Helper-Static';
const ASSETS_TO_CACHE = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/Public/main.css`,
  `${BASE_PATH}/Public/js/main.js`,
  `${BASE_PATH}/Public/imgs/card-back.png`,
  `${BASE_PATH}/Public/imgs/icons/Shuffle.png`,
  `${BASE_PATH}/manifest.json`
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname.startsWith(BASE_PATH)) {
      event.respondWith(
        caches.match(event.request)
          .then((response) => response || fetch(event.request))
      );
      return;
    }
  }
  event.respondWith(fetch(event.request));
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});