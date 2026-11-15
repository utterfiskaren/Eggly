/* Eggly 1 hade en service worker på den här adressen. Eggly 2 behöver ingen.
   Den här filen ersätter den gamla: den tömmer det gamla spelets sparade filer,
   avregistrerar sig och laddar om öppna flikar, så att alla får nya Eggly. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
  await self.registration.unregister();
  const tabs = await self.clients.matchAll({ type: 'window' });
  tabs.forEach((c) => c.navigate(c.url));
})()));
