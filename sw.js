// Trainingskompas — Service Worker
// Play Store ready — offline first

// F3.9-fix: CACHE_NAME (dynamische runtime-cache) wordt nu MEE-gebumpt bij een core/static-wijziging.
// Reden: de static-fetch is cache-first over ALLE caches; een oude core-entry in de niet-gebumpte
// dynamische cache kon de nieuwe precache overschaduwen (stale serve na deploy). Door CACHE_NAME mee te
// bumpen ruimt de activate-handler de oude dynamische cache op. REGEL: core wijzigt -> bump CACHE_NAME + CACHE_STATIC.
const CACHE_NAME = 'trainingskompas-v42470';
const CACHE_STATIC = 'trainingskompas-static-v42470';
// F1.9 SW-GUARD: hash (CRLF-agnostisch) van core/calculation.js + core/decision.js.
// core/sw-guard.test.js faalt als de core wijzigt zonder dat deze CORE_SIG + CACHE_STATIC gebumpt zijn.
// Bij een core-wijziging: draai `node core/sw-guard.test.js` -> die print de nieuwe CORE_SIG; werk hem
// hier bij ÉN bump CACHE_STATIC, zodat bestaande browsers de nieuwe core daadwerkelijk laden.
const CORE_SIG = '4e0b7ada4b8a72df';
// Video-cache: STABIEL en LOSGEKOPPELD van de app-versie. App-updates verwijderen video's NIET.
const CACHE_VIDEOS = 'tk-videos-v1';
const VIDEO_LIMIT_BYTES = 250 * 1024 * 1024; // 250 MB LRU-plafond
const VIDEO_META_KEY = '/__tkvideometa__';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/core/calculation.js',
  '/core/decision.js',
  '/core/cardio.js',
  '/core/progression.js',
  '/core/coaching.js',
  '/core/movement.js',
  '/core/onboarding.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-wordmark.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap'
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

// ── ACTIVATE: clean old caches (video-cache NOOIT verwijderen) ────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== CACHE_STATIC && k !== CACHE_VIDEOS)
          .map(k => {
            console.log('SW: deleting old cache', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── VIDEO CACHE: Cache-First + on-demand + LRU (250 MB) + netwerk-fallback ──
function isVideoRequest(url) {
  return /\/videos\/[^?#]+\.(mp4|webm|mov)$/i.test(url);
}
async function videoMeta(cache) {
  try { const r = await cache.match(VIDEO_META_KEY); return r ? await r.json() : {}; }
  catch (e) { return {}; }
}
async function saveVideoMeta(cache, meta) {
  try { await cache.put(VIDEO_META_KEY, new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } })); }
  catch (e) {}
}
async function trimVideoCache(cache) {
  // LRU: verwijder minst-recent gebruikte video's tot onder het plafond.
  const meta = await videoMeta(cache);
  const keys = (await cache.keys()).filter(req => req.url.indexOf(VIDEO_META_KEY) < 0);
  let total = 0;
  const items = [];
  for (const req of keys) {
    let size = meta[req.url] && meta[req.url].bytes;
    if (!size) {
      const r = await cache.match(req);
      size = Number(r && r.headers.get('content-length')) || 0;
      if (!size && r) { try { size = (await r.clone().blob()).size; } catch (e) { size = 0; } }
    }
    const ts = (meta[req.url] && meta[req.url].ts) || 0;
    items.push({ req, url: req.url, size, ts });
    total += size;
  }
  if (total <= VIDEO_LIMIT_BYTES) return;
  items.sort((a, b) => a.ts - b.ts); // oudst gebruikt eerst
  for (const it of items) {
    if (total <= VIDEO_LIMIT_BYTES) break;
    await cache.delete(it.req);
    delete meta[it.url];
    total -= it.size;
  }
  await saveVideoMeta(cache, meta);
}
async function handleVideo(request) {
  const key = new URL(request.url).pathname; // canoniek → 1 entry per video, negeert Range/query
  const cache = await caches.open(CACHE_VIDEOS);
  const hit = await cache.match(key);
  if (hit) {
    // markeer als recent gebruikt (LRU)
    const meta = await videoMeta(cache);
    const size = (meta[key] && meta[key].bytes) || Number(hit.headers.get('content-length')) || 0;
    meta[key] = { bytes: size, ts: Date.now() };
    saveVideoMeta(cache, meta);
    return hit;
  }
  try {
    // Volledige respons ophalen (geen Range) zodat de video offline compleet beschikbaar is.
    const resp = await fetch(key, { cache: 'no-store' });
    if (resp && resp.status === 200) {
      await cache.put(key, resp.clone());
      const meta = await videoMeta(cache);
      let size = Number(resp.headers.get('content-length')) || 0;
      if (!size) { try { size = (await resp.clone().blob()).size; } catch (e) { size = 0; } }
      meta[key] = { bytes: size, ts: Date.now() };
      await saveVideoMeta(cache, meta);
      trimVideoCache(cache).catch(() => {});
    }
    return resp;
  } catch (err) {
    const again = await cache.match(key);
    if (again) return again;
    // Offline én niet gecachet → nette fout; de UI toont een melding.
    return new Response('', { status: 504, statusText: 'video-offline-not-cached' });
  }
}

// ── FETCH: offline-first strategy ─────────────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Laat API calls altijd door — nooit cachen
  if (NO_CACHE_PATTERNS.some(p => url.includes(p))) {
    return; // browser handelt zelf af
  }

  // Video's: eigen Cache-First + LRU strategie (los van de app-cache)
  if (e.request.method === 'GET' && isVideoRequest(url)) {
    e.respondWith(handleVideo(e.request));
    return;
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
    self.registration.showNotification(data.title || 'Trainingskompas', {
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
