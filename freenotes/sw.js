/**
 * Service worker: keeps the app usable without a network connection.
 *
 * Only the app's own files are cached. PDF.js and Tesseract come from a CDN
 * and stay uncached on purpose — they are opt-in features, and a stale copy of
 * a library is worse than a clear "offline" message.
 */

const CACHE = 'andi-notes-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-maskable.svg',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/db.js',
  './js/ink.js',
  './js/pens.js',
  './js/templates.js',
  './js/ai.js',
  './js/ocr.js',
  './js/pdfview.js',
  './js/export.js',
  './js/pip.js',
  './js/audio.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(hit => {
      // Serve from cache, then refresh it in the background.
      const network = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
