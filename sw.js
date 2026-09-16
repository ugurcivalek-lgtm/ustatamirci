const CACHE_NAME = 'ustatamirci-cache-v14';

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith('http') ||
    event.request.url.indexOf('firebaseio.com') !== -1 ||
    event.request.url.indexOf('googleapis.com') !== -1
  ) {
    return;
  }
  event.respondWith(fetch(event.request));
});