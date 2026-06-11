// Cache versie — bij elke app update verhoogd zodat de browser ALTIJD refresht
const CACHE_VERSION = 'maurice-v2.1.0';

self.addEventListener('install', e => {
  // Nieuwe service worker wordt direct actief, wacht niet op sluiten oude tabs
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Verwijder ALLE oude caches bij activatie
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        if (k !== CACHE_VERSION) {
          console.log('SW: oude cache verwijderd:', k);
          return caches.delete(k);
        }
      }))
    ).then(() => self.clients.claim()) // Neem direct controle over alle open tabs
  );
});

self.addEventListener('fetch', e => {
  // API calls nooit cachen
  if (e.request.url.includes('api.anthropic.com') ||
      e.request.url.includes('supabase.co') ||
      e.request.url.includes('fonts.googleapis.com') ||
      e.request.url.includes('fonts.gstatic.com')) {
    return;
  }

  // Voor app bestanden: network-first strategie
  // Probeert altijd eerst het netwerk, valt terug op cache bij offline
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
  );
});
