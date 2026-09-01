const MEDIA_CACHE_NAME = 'media-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function isVideoMediaPath(pathname) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(pathname);
}

function isMediaRequest(request) {
  if (request.method !== 'GET') return false;

  const { pathname } = new URL(request.url);
  if (isVideoMediaPath(pathname)) return false;
  if (pathname === '/api/video-poster' || pathname === '/tt/api/video-poster') return true;

  return (
    pathname.startsWith('/api/files/') ||
    pathname.startsWith('/tt/api/files/')
  );
}

self.addEventListener('fetch', (event) => {
  if (!isMediaRequest(event.request)) return;

  event.respondWith(
    caches.open(MEDIA_CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;

      const response = await fetch(event.request);
      if (response.ok) {
        event.waitUntil(cache.put(event.request, response.clone()).catch(() => {}));
      }

      return response;
    })
  );
});
