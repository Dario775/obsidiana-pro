const CACHE_NAME = 'obsidiana-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Allow caching to fail gracefully for files that might not be immediately available during dev
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Pre-caching warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Cache falling back to the network for static assets, network-first for other paths
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip caching for non-GET, API, Next.js internal, and external services like Supabase
  if (
    request.method !== 'GET' || 
    request.url.includes('/api/') || 
    request.url.includes('/_next/') || 
    request.url.includes('supabase.co') ||
    request.url.includes('cloudinary.com')
  ) {
    return;
  }
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // If response is good and matches static assets (fonts, images, icon), cache it dynamically
        if (response.status === 200 && (
          request.url.includes('/fonts/') || 
          request.url.match(/\.(png|jpg|jpeg|gif|svg|ico|woff2?|css)$/)
        )) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is down
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return Response.error();
        });
      })
  );
});
