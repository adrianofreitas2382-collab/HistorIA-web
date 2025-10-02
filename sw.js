
// sw.js – cache apenas estático; não toca em IndexedDB/localStorage
const CACHE = 'historiaia-static-v2.0.15';
const ASSETS = [
  './',
  './index.html',
  './webapp.v2.0.15.js',
  './manifest.webmanifest',
  './assets/icon-192.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>{
    if (k !== CACHE && k.startsWith('historiaia-static-')) return caches.delete(k);
  }))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const {request} = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then(res => res || fetch(request))
  );
});
