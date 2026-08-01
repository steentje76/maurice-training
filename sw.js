// Trainingskompas — Service Worker v2.8
// Play Store ready — offline first

const CACHE_NAME = 'maurice-training-v3320';
const CACHE_STATIC = 'maurice-static-v271';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600;700&display=swap'
];

// URLs die nooit gecached worden
const NO_CACHE_PATTERNS = [
  'api.anthropic.com',
  'supabase.co',
  'youtube.com',
  'img.youtube.com',
  'googleapis.com/v1'
];

// ── INSTALL: cache static assets ──────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('SW install cache partial fail:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches ────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== CACHE_STATIC)
          .map(k => {
            console.log('SW: deleting old cache', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: offline-first strategy ─────────────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Laat API calls altijd door — nooit cachen
  if (NO_CACHE_PATTERNS.some(p => url.includes(p))) {
    return; // browser handelt zelf af
  }

  // Navigation requests (pagina laden) — app shell
  // Network-first: altijd de nieuwste versie als online, cache alleen als offline-fallback.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_STATIC).then(cache => cache.put('/index.html', clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Statische assets — cache first, dan netwerk
  e.respondWith(
    caches.match(e.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(e.request)
          .then(response => {
            // Cache succesvolle GET responses
            if (response && response.status === 200 && e.request.method === 'GET') {
              const clone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(e.request, clone));
            }
            return response;
          })
          .catch(() => {
            // Offline fallback
            if (e.request.destination === 'image') return;
            return caches.match('/index.html');
          });
      })
  );
});

// ── BACKGROUND SYNC: voor als Supabase offline was ────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-sessions') {
    console.log('SW: background sync sessions');
    // Toekomstig: sync pending sessions van IndexedDB
  }
});

// ── PUSH NOTIFICATIES: basis voor later ───────────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'Training Coach', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'training',
      data: data.url || '/'
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.openWindow(e.notification.data || '/')
  );
});
