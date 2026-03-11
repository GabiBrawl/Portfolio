const CACHE_NAME = 'portfolio-v2';

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

async function loadHashes() {
  try {
    const response = await fetch('/hashes.txt');
    if (!response.ok) throw new Error('Failed to load hashes');
    const text = await response.text();
    const hashes = {};
    text.split('\n').forEach(line => {
      if (line.trim()) {
        const [hash, file] = line.split('  ');
        hashes[file] = hash;
      }
    });
    return hashes;
  } catch (e) {
    console.warn('Could not load hashes file:', e);
    return {};
  }
}

async function checkForUpdates() {
  const newHashes = await loadHashes();
  const changedFiles = [];
  for (const [file, newHash] of Object.entries(newHashes)) {
    if (currentHashes[file] !== newHash) {
      changedFiles.push(file);
    }
  }
  return changedFiles;
}

async function updateCache(changedFiles) {
  const cache = await caches.open(CACHE_NAME);
  for (const file of changedFiles) {
    try {
      const response = await fetch(file);
      if (response.ok) {
        await cache.put(file, response);
      }
    } catch (e) {
      console.warn(`Failed to update cache for ${file}:`, e);
    }
  }
  currentHashes = await loadHashes();
}

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      currentHashes = await loadHashes();
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll([...cacheFirstUrls, ...networkFirstUrls]);
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
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