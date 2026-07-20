// One-time retirement worker for the former Fitness Desk PWA.
// It replaces the old Workbox worker, clears its offline caches, refreshes open
// pages from the network, and then unregisters itself.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))

      await self.clients.claim()
      await self.registration.unregister()

      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      await Promise.all(
        windows.map((windowClient) => windowClient.navigate(windowClient.url)),
      )
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
