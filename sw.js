self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open('historia-v2').then(cache => cache.addAll([
    '/', '/index.html', '/manifest.webmanifest',
    '/assets/icon-192.png','/assets/icon-512.png',
    '/webapp.v2.0.13.js'
  ])));
});
self.addEventListener('activate', e => { self.clients.claim(); });
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});