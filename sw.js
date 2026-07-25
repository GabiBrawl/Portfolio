// ==========================================================================
// CONFIGURATION & FLAGS
// ==========================================================================
const IS_DEVELOPMENT = true; // ✦ SET TO TRUE FOR DEV, FALSE FOR PROD ✦
const CACHE_NAME = 'portfolio-v4.3'; // Increment this when pushing production updates
const HASHES_URL = '/hashes.txt';
const HASHES_STATE_KEY = '/__hashes_state__.json';

// URLs that prioritize cache loading (cache-first strategy)
// NOTE: '/sw.js' has been permanently removed from here to prevent cache-locking!
const cacheFirstUrls = [
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
  'https://fonts.googleapis.com/css2?family=Special+Gothic+Condensed+One&family=Special+Gothic+Expanded+One&display=swap'
];

// URLs that prioritize online loading (network-first strategy)
const networkFirstUrls = [
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
  '/assets/js/utils.js'
];

let currentHashes = {};
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

function getPrecacheUrls() {
  return [...new Set([...cacheFirstUrls, ...networkFirstUrls, HASHES_URL].filter(isSameOriginAsset))];
}

function normalizeManifestPath(path) {
  return path.replace(/^\.\//, '/');
}

async function loadHashes() {
  try {
    const response = await fetch(`${HASHES_URL}?sw-hash-check=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load hashes');
    const text = await response.text();
    const hashes = {};
    text.split('\n').forEach(line => {
      if (line.trim()) {
        const [hash, file] = line.trim().split(/\s{2,}/);
        if (hash && file) {
          hashes[normalizeManifestPath(file)] = hash;
        }
      }
    });
    return hashes;
  } catch (e) {
    console.warn('Could not load hashes file:', e);
    return null;
  }
}

async function readStoredHashes(cache) {
  const response = await cache.match(HASHES_STATE_KEY);
  if (!response) return {};
  try { return await response.json(); } catch { return {}; }
}

async function writeStoredHashes(cache, hashes) {
  await cache.put(
    HASHES_STATE_KEY,
    new Response(JSON.stringify(hashes), {
      headers: { 'Content-Type': 'application/json' }
    })
  );
}

async function invalidateCacheEntries(changedFiles) {
  const cache = await caches.open(CACHE_NAME);
  for (const file of changedFiles) {
    try { await cache.delete(file); } catch (e) { console.warn(`Failed to delete cache for ${file}:`, e); }
  }
}

async function invalidateChangedAssetsByHash() {
  const cache = await caches.open(CACHE_NAME);
  const previousHashes = await readStoredHashes(cache);
  const latestHashes = await loadHashes();

  if (latestHashes === null) {
    await broadcastDebug('Hash check skipped (manifest unavailable)');
    return;
  }

  const changedFiles = [];
  for (const [file, hash] of Object.entries(latestHashes)) {
    if (previousHashes[file] !== hash) changedFiles.push(file);
  }
  for (const file of Object.keys(previousHashes)) {
    if (!(file in latestHashes)) changedFiles.push(file);
  }

  if (changedFiles.length > 0) {
    await broadcastDebug('Invalidating changed cached files', { files: changedFiles });
    await invalidateCacheEntries(changedFiles);
  }

  await writeStoredHashes(cache, latestHashes);
  currentHashes = latestHashes;
}

function checkHashesOnceBeforeNavigation() {
  if (hashCheckInFlight) return hashCheckInFlight;
  hashCheckInFlight = invalidateChangedAssetsByHash()
    .catch(error => console.warn('Hash check failed:', error))
    .finally(() => { hashCheckInFlight = null; });
  return hashCheckInFlight;
}

// ==========================================================================
// SERVICE WORKER EVENTS
// ==========================================================================

self.addEventListener('install', event => {
  // SHORT-CIRCUIT FOR DEV MODE
  if (IS_DEVELOPMENT) {
    console.log('[SW] Dev mode active. Skipping precache asset allocation.');
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    (async () => {
      currentHashes = await loadHashes() ?? {};
      const cache = await caches.open(CACHE_NAME);
      const precacheUrls = getPrecacheUrls();
      const results = await Promise.allSettled(precacheUrls.map(url => cache.add(url)));

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn('[SW] Precache failed for', precacheUrls[index], result.reason);
        }
      });

      await writeStoredHashes(cache, currentHashes);
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

// Helper request pipeline strategy selector
function handleRequest(request) {
  const url = request.url;
  const isNetworkFirst = networkFirstUrls.some(u => url === u || url === location.origin + u) || url.match(/\/projects\/post\d+\.json$/);
  const isCacheFirst = cacheFirstUrls.some(u => url === u || url === location.origin + u) || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com');

  if (isNetworkFirst) {
    return fetch(request).then(response => {
      if (!response || response.status !== 200 || response.type !== 'basic') return caches.match(request);
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
      return response;
    }).catch(() => caches.match(request));
  }

  if (isCacheFirst) {
    return caches.match(request).then(response => {
      if (response) return response;
      return fetch(request).then(fetchResponse => {
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') return fetchResponse;
        const responseToCache = fetchResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        return fetchResponse;
      });
    });
  }

  return caches.match(request).then(response => {
    if (response) return response;
    return fetch(request).then(fetchResponse => {
      if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') return fetchResponse;
      const responseToCache = fetchResponse.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
      return fetchResponse;
    });
  });
}

self.addEventListener('fetch', event => {
  // SHORT-CIRCUIT FOR DEV MODE: Do absolutely nothing, fallback straight to network
  if (IS_DEVELOPMENT) {
    return; 
  }

  const requestUrl = new URL(event.request.url);
  if (!requestUrl.protocol.startsWith('http')) return;

  if (requestUrl.origin === location.origin && requestUrl.pathname === HASHES_URL) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(HASHES_URL, responseToCache));
          }
          return response;
        })
        .catch(() => caches.match(HASHES_URL))
    );
    return;
  }

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      (async () => {
        await checkHashesOnceBeforeNavigation();
        return handleRequest(event.request);
      })()
    );
    return;
  }

  event.respondWith(handleRequest(event.request));
});