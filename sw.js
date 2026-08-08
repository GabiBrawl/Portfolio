// ==========================================================================
// CONFIGURATION & FLAGS
// ==========================================================================
const IS_DEVELOPMENT = false; // // ✦ SET TO TRUE FOR DEV, FALSE FOR PROD ✦
const CACHE_NAME = 'portfolio-v6.0'; // Increment on deploys that should invalidate old caches
const POSTS_COUNT = 6;
const HASHES_URL = '/hashes.txt';
const HASHES_STATE_KEY = '/__hashes_state__.json';

// Single list of everything the SW manages — no more cache-first/network-first split.
// Also the source of truth for the hash-generator workflow (it parses this array directly).
const MANAGED_URLS = [
  '/',
  '/index.html',
  '/404.html',
  '/favicon.png',
  '/assets/cursors/handgrabbing.svg',
  '/assets/cursors/handopen.svg',
  '/assets/cursors/handpointing.svg',
  '/assets/images/embed.png',
  '/assets/images/pc.jpeg',
  '/assets/images/pfp400x400.jpg',
  '/discord/',
  '/assets/css/base.css',
  '/assets/css/components.css',
  '/assets/css/effects.css',
  '/assets/css/gallery.css',
  '/assets/css/layout.css',
  '/assets/css/project-detail.css',
  '/assets/js/app.js',
  '/assets/js/config.js',
  '/assets/js/effects.js',
  '/assets/js/features.js',
  '/assets/js/gallery.js',
  '/assets/js/interactions.js',
  '/assets/js/main.js',
  '/assets/js/utils.js',
  '/assets/music.json',
  '/posts/index.json'
];

// External URLs can't be sha256'd by the hash workflow (no local file to hash),
// so they're cached on install but not tracked for change-invalidation.
const EXTERNAL_CACHE_URLS = [
  'https://fonts.googleapis.com/css2?family=Special+Gothic+Condensed+One&family=Special+Gothic+Expanded+One&display=swap'
];

let hashCheckInFlight = null;

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================
async function broadcastDebug(message, data) {
  if (IS_DEVELOPMENT) console.log(`[SW Debug] ${message}`, data || '');
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach(client => {
    client.postMessage({
      source: 'service-worker',
      type: 'debug',
      message,
      data
    });
  });
}

function isSameOriginAsset(url) {
  return url.startsWith('/');
}

// Individual post files should always prefer a live network fetch —
// these are the files most likely to get edited after publishing, so
// stale-while-revalidate's "serve old, refresh in background" behavior
// would show readers outdated content for one extra visit.
function isPostContent(url) {
  return /\/posts\/post\d+\.json$/.test(url);
}

function isCacheableResponse(response) {
  return !!response && response.ok && (response.type === 'basic' || response.type === 'cors');
}

// ==========================================================================
// CACHING STRATEGY — single stale-while-revalidate path for everything
// ==========================================================================
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(response => {
      if (isCacheableResponse(response)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || network;
}

async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    await cache.put(request, response.clone());
  }
  return response;
}

// Used by install + the manual "$ cache" flow, where we want a guaranteed
// fresh network copy rather than "cached if present."
async function forceCacheUrl(url, cache) {
  try {
    return await fetchAndCache(new Request(url, { cache: 'reload' }), cache);
  } catch {
    return null;
  }
}

// ==========================================================================
// HASH-BASED INVALIDATION — scoped to MANAGED_URLS, navigation-only
// ==========================================================================
async function loadHashes() {
  try {
    const res = await fetch(`${HASHES_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    const hashes = {};
    text.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const [hash, file] = trimmed.split(/\s{2,}/);
      if (hash && file) hashes[file] = hash;
    });
    return hashes;
  } catch {
    return null;
  }
}

async function invalidateChangedAssets() {
  const cache = await caches.open(CACHE_NAME);
  const prevRes = await cache.match(HASHES_STATE_KEY);
  const previous = prevRes ? await prevRes.json() : {};

  const latest = await loadHashes();
  if (!latest) return; // manifest unreachable this cycle — leave existing cache alone

  const changedFiles = [...new Set([...Object.keys(previous), ...Object.keys(latest)])]
    .filter(file => previous[file] !== latest[file]);

  await Promise.all(
    changedFiles.map(file => cache.delete(new Request(self.location.origin + file)))
  );

  await cache.put(HASHES_STATE_KEY, new Response(JSON.stringify(latest)));

  if (changedFiles.length) {
    await broadcastDebug('hashes-invalidated', { changedFiles });
  }
}

function checkHashesOnceBeforeNavigation() {
  if (hashCheckInFlight) return hashCheckInFlight;

  hashCheckInFlight = invalidateChangedAssets()
    .catch(err => console.warn('[SW] Hash check failed:', err))
    .finally(() => {
      hashCheckInFlight = null;
    });

  return hashCheckInFlight;
}

// ==========================================================================
// SERVICE WORKER EVENTS
// ==========================================================================
self.addEventListener('install', event => {
  if (IS_DEVELOPMENT) {
    console.log('[SW] Dev mode active. Skipping precache asset allocation.');
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const urls = [...MANAGED_URLS, ...EXTERNAL_CACHE_URLS];

      const results = await Promise.allSettled(
        urls.map(url => forceCacheUrl(url, cache))
      );

      results.forEach((result, index) => {
        if (result.status === 'rejected' || result.value === null) {
          console.warn('[SW] Precache failed for', urls[index]);
        }
      });
    })()
  );

  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })()
  );

  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (IS_DEVELOPMENT) {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (!requestUrl.protocol.startsWith('http')) return;

  // '/sw.js' is intentionally excluded from all caching to avoid
  // service-worker cache locking.
  if (requestUrl.pathname === '/sw.js') return;

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      (async () => {
        await checkHashesOnceBeforeNavigation();
        return staleWhileRevalidate(event.request);
      })()
    );
    return;
  }

  if (isPostContent(event.request.url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          return await fetchAndCache(event.request, cache);
        } catch {
          const fallback = await cache.match(event.request);
          if (fallback) return fallback;
          throw new Error(`Post content fetch failed and cache missed: ${event.request.url}`);
        }
      })()
    );
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'CACHE_ALL_ASSETS') {
    event.waitUntil(cacheAllAssetsInSW());
    return;
  }

  if (event.data?.type === 'GET_SW_MODE') {
    event.source?.postMessage({
      source: 'service-worker',
      type: 'sw-mode',
      requestId: event.data.requestId,
      isDevelopment: IS_DEVELOPMENT
    });
  }
});

async function cacheAllAssetsInSW() {
  await broadcastDebug('cache-start', {});

  const assetsToCache = [
    ...Array.from({ length: POSTS_COUNT }, (_, i) => `/posts/post${i}.json`),
    ...MANAGED_URLS,
    ...EXTERNAL_CACHE_URLS,
    '/assets/star.svg',
    '/assets/starW.svg',
    '/assets/music.json',
    '/assets/button88x31.png',
    '/assets/flag-orpheus-top.svg'
  ];

  const uniqueAssets = [...new Set(assetsToCache)];
  const cache = await caches.open(CACHE_NAME);

  let completed = 0;
  for (const url of uniqueAssets) {
    await forceCacheUrl(url, cache);

    completed++;
    await broadcastDebug('cache-progress', { completed, total: uniqueAssets.length, url });
  }

  await broadcastDebug('cache-complete', { total: uniqueAssets.length });
}