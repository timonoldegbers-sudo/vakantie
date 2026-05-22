// Service Worker — Vakantie Oldegbers
// Ontvangt push-meldingen en toont ze, ook als de app dicht is.

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const titel   = data.titel   || 'Vakantie Oldegbers 🌊';
  const bericht = data.bericht || 'Er is iets nieuws!';
  const url     = data.url     || '/';

  event.waitUntil(
    self.registration.showNotification(titel, {
      body: bericht,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      data: { url },
      vibrate: [200, 100, 200],
      tag: 'vakantie-update',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lijst => {
      const open = lijst.find(c => c.url.includes(url));
      if (open) return open.focus();
      return clients.openWindow(url);
    })
  );
});
