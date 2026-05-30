// ═══════════════════════════════════════════════════════
//  METEO RIPOSTO — Service Worker
//  fotolapissable.it
//  ⚠ Aggiorna APP_VERSION ad ogni deploy per forzare
//    il refresh automatico su tutti i dispositivi.
// ═══════════════════════════════════════════════════════

const APP_VERSION = 'v3';
const CACHE_NAME  = `meteo-riposto-${APP_VERSION}`;

// Risorse statiche da cachare all'installazione
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];

// ── INSTALL ─────────────────────────────────────────────
// Ogni volta che APP_VERSION cambia, il browser scarica
// un nuovo SW, installa la cache fresca e butta via quella vecchia.
self.addEventListener('install', event => {
  console.log(`[SW] Installazione ${CACHE_NAME}`);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Alcune risorse non cachate:', err);
      });
    })
  );
  // Attiva subito senza aspettare che le vecchie schede vengano chiuse
  self.skipWaiting();
});

// ── ACTIVATE ────────────────────────────────────────────
// Elimina tutte le cache precedenti (versioni vecchie)
self.addEventListener('activate', event => {
  console.log(`[SW] Attivazione ${CACHE_NAME} — pulizia cache vecchie`);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('meteo-riposto-') && k !== CACHE_NAME)
          .map(k => {
            console.log(`[SW] Elimino cache obsoleta: ${k}`);
            return caches.delete(k);
          })
      )
    )
  );
  // Prende controllo di tutte le schede aperte immediatamente
  self.clients.claim();
});

// ── FETCH ────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API meteo e radar: sempre network-first (dati in tempo reale)
  const isLiveApi =
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('rainviewer.com') ||
    url.hostname.includes('blitzortung.org') ||
    url.hostname.includes('tilecache.rainviewer.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isLiveApi) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // index.html: network-first così gli aggiornamenti arrivano subito
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Altre risorse statiche: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── MESSAGGIO DAL CLIENT ─────────────────────────────────
// L'app può mandare {action:'skipWaiting'} per forzare update
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
