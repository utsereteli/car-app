// Service Worker - No caching, just pass through to network
// Install event - skip waiting and activate immediately
self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  event.waitUntil(
    // Delete all existing caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch event - always use network, no caching
self.addEventListener('fetch', (event) => {
  // Simply fetch from network without caching
  event.respondWith(fetch(event.request));
});

// Activate event - clean up all caches
self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(
    Promise.all([
      // Delete all caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  );
});

