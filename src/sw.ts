import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'תמב', {
      body: data.body ?? '',
      icon: '/tamab/icon-192.png',
      badge: '/tamab/icon-192.png',
      dir: 'rtl',
      lang: 'he',
      data: { url: data.url ?? '/tamab/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '/tamab/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins[0]
      if (win) return win.navigate(url).then((c) => (c ?? win).focus())
      return self.clients.openWindow(url)
    }),
  )
})
