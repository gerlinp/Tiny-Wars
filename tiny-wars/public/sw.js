// Navigation requests (loading the page) always go to the network so users
// see deployed updates immediately without clearing their cache.
// Hashed JS/CSS assets are unaffected — the browser caches them normally.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request))
  }
})
