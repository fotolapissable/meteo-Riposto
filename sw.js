// ═══════════════════════════════════════════════════════
//  METEO RIPOSTO — Service Worker
//  fotolapissable.it
//  ⚠ Aggiorna APP_VERSION ad ogni deploy per forzare
//    il refresh automatico su tutti i dispositivi.
// ═══════════════════════════════════════════════════════

const APP_VERSION = 'v4';
const CACHE_NAME  = `meteo-riposto-${APP_VERSION}`;
const TILE_CACHE_NAME = `meteo-riposto-tiles-${APP_VERSION}`;
const TILE_CACHE_MAX  = 300; // limite entry per non far crescere la cache all'infinito

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
          .filter(k => (k.startsWith('meteo-riposto-') ) && k !== CACHE_NAME && k !== TILE_CACHE_NAME)
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

  // Tile mappa (radar/satellite RainViewer + basemap CartoDB):
  // network-first ma SEMPRE salvate in cache, così offline la mappa
  // mostra l'ultimo dato scaricato invece di restare vuota.
  const isMapTile =
    url.hostname.includes('tilecache.rainviewer.com') ||
    url.hostname.includes('basemaps.cartocdn.com');

  if (isMapTile) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(TILE_CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
              trimCache(TILE_CACHE_NAME, TILE_CACHE_MAX);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request, { cacheName: TILE_CACHE_NAME }))
    );
    return;
  }

  // API dati in tempo reale (meteo, metadata radar, fulmini): sempre
  // network-first, mai salvate qui — l'app gestisce già un fallback
  // lato client (localStorage) per l'ultimo dato meteo valido.
  const isLiveApi =
    url.hostname.includes('open-meteo.com') ||
    url.hostname === 'api.rainviewer.com' ||
    url.hostname.includes('blitzortung.org');

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

  // Altre risorse statiche (font, leaflet, icone, manifest): cache-first
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

// ── TRIM CACHE TILE ───────────────────────────────────────
// Evita che la cache delle tile cresca all'infinito: quando supera
// il limite, elimina le entry più vecchie (le prime inserite).
function trimCache(cacheName, maxEntries){
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > maxEntries) {
        const toDelete = keys.length - maxEntries;
        for (let i = 0; i < toDelete; i++) {
          cache.delete(keys[i]);
        }
      }
    });
  });
}

// ── MESSAGGIO DAL CLIENT ─────────────────────────────────
// L'app può mandare {action:'skipWaiting'} per forzare update
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
