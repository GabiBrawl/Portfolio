const CACHE_NAME = 'portfolio-v2';
const HASHES_URL = '/hashes.txt';
const HASHES_STATE_KEY = '/__hashes_state__.json';

// URLs that prioritize cache loading (cache-first strategy)
const cacheFirstUrls = [
  '/',
  '/index.html',
  '/404.html',
  '/sw.js',
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

function normalizeManifestPath(path) {
  return path.replace(/^\.\//, '/');
}

async function loadHashes() {
  try {
    const response = await fetch(HASHES_URL, { cache: 'no-store' });
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
    return {};
  }
}

async function readStoredHashes(cache) {
  const response = await cache.match(HASHES_STATE_KEY);
  if (!response) {
    return {};
  }
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function writeStoredHashes(cache, hashes) {
  await cache.put(
    HASHES_STATE_KEY,
    new Response(JSON.stringify(hashes), {
      headers: { 'Content-Type': 'application/json' }
    })
  );
}

async function updateCache(changedFiles) {
  const cache = await caches.open(CACHE_NAME);
  for (const file of changedFiles) {
    try {
      const response = await fetch(file, { cache: 'no-store' });
      if (response.ok) {
        await cache.put(file, response);
      }
    } catch (e) {
      console.warn(`Failed to update cache for ${file}:`, e);
    }
  }
}

async function refreshChangedAssets() {
  const cache = await caches.open(CACHE_NAME);
  const previousHashes = await readStoredHashes(cache);
  const latestHashes = await loadHashes();
  const changedFiles = [];

  for (const [file, hash] of Object.entries(latestHashes)) {
    if (previousHashes[file] !== hash) {
      changedFiles.push(file);
    }
  }

  if (changedFiles.length > 0) {
    await updateCache(changedFiles);
  }

  await writeStoredHashes(cache, latestHashes);
  currentHashes = latestHashes;
}

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      currentHashes = await loadHashes();
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll([...cacheFirstUrls, ...networkFirstUrls, HASHES_URL]);
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
      await refreshChangedAssets();
    })()
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  const isNetworkFirst = networkFirstUrls.some(u => url === u || url === location.origin + u) || url.match(/\/projects\/post\d+\.json$/);

  const isCacheFirst = cacheFirstUrls.some(u => url === u || url === location.origin + u) || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com');

  if (isNetworkFirst) {
    // Network first strategy
    event.respondWith(
      fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return caches.match(event.request);
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
  } else if (isCacheFirst) {
    // Cache first strategy
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
        })
    );
  } else {
    // Default to cache first for any other requests
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
        })
    );
  }
});