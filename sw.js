// Service Worker de SICO Cotizador
// Sirve para dos cosas: (1) que el navegador ofrezca "Instalar app", y
// (2) que la app ya abra aunque no haya internet en ese momento (la
// sincronización con la nube de productos/cotizaciones sigue necesitando
// conexión, esto solo cachea el "cascarón" de la app: el HTML/CSS/JS).

const CACHE_NAME = 'sico-cotizador-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Los pedidos al Worker de Cloudflare (API de la nube) siempre van directo
  // a internet, nunca se sirven desde el cache, para no mostrar datos viejos.
  if (event.request.url.includes('/api/state')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        // guarda una copia fresca en cache para la proxima vez
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});
