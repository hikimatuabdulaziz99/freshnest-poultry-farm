/**
 * FreshNest Poultry Farm - Service Worker
 * Module 15: Offline / PWA Architecture
 * 
 * Core Capabilities:
 * - Offline Application Shell precaching
 * - Network-First navigation with offline fallback
 * - Stale-While-Revalidate caching for static scripts, styles, and assets
 * - Safe cache versioning and automatic removal of outdated caches
 * - Bypasses non-GET requests and sensitive authentication queries
 * - Graceful skipWaiting and update notification protocol
 */

const CACHE_VERSION = 'v15.0.0';
const STATIC_CACHE_NAME = `freshnest-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `freshnest-runtime-${CACHE_VERSION}`;

// Precache essential application shell assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
];

// 1. Install Event: Precache Application Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      // Use catch for individual assets so missing dev files don't abort entire install
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[ServiceWorker] Could not precache ${url}:`, err.message);
          })
        )
      );
    })
  );
});

// 2. Activate Event: Safe cleanup of outdated caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE_NAME, RUNTIME_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('freshnest-') && !currentCaches.includes(cacheName)) {
            console.log(`[ServiceWorker] Deleting outdated cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
      // Claim clients immediately so updated SW controls current pages
      return self.clients.claim();
    })
  );
});

// 3. Message Event: Graceful update handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. Fetch Event: Safe Offline & Caching Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Safety Rule 1: Never intercept or cache non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Safety Rule 2: Ignore non-http schemes (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Safety Rule 3: Never cache sensitive authentication API requests or session calls
  if (url.pathname.includes('/api/auth') || url.pathname.includes('/session') || url.searchParams.has('token')) {
    return;
  }

  // Strategy A: Navigation Requests (HTML pages)
  // Network-First with Cache Fallback to ensure latest app online, working offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline Fallback: Return cached index.html or root
          const cachedResponse = await caches.match('/index.html') || await caches.match('/');
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"><title>FreshNest - Offline</title><style>body{font-family:sans-serif;background:#F8FAF8;color:#1B4332;text-align:center;padding:40px;}</style></head>
            <body>
              <h2>FreshNest is Offline</h2>
              <p>Your local farm records remain safe in IndexedDB. Please reload when the connection is restored.</p>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Strategy B: Static assets (JS, CSS, SVGs, PNGs, Fonts)
  // Stale-While-Revalidate or Cache-First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed, nothing to do if already handled by cache
        });

      // Return cached version immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
