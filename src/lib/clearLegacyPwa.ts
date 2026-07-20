const refreshMarker = 'study-command-centre-legacy-pwa-cleared'

export async function clearLegacyPwa() {
  if (!('serviceWorker' in navigator)) return

  const hadController = Boolean(navigator.serviceWorker.controller)
  const registrations = await navigator.serviceWorker.getRegistrations()

  await Promise.all(registrations.map((registration) => registration.unregister()))

  if ('caches' in window) {
    const cacheNames = await window.caches.keys()
    await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)))
  }

  if (hadController && sessionStorage.getItem(refreshMarker) !== 'true') {
    sessionStorage.setItem(refreshMarker, 'true')
    window.location.reload()
  }
}
