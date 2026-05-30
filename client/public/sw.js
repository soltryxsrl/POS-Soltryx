/*
 * Service Worker — resiliencia offline ligera para T1ET POS.
 *
 * Objetivo: que un corte breve de red no deje la app en blanco y que el
 * catálogo recién consultado siga disponible. Las MUTACIONES (POST de ventas,
 * etc.) siempre van directo a la red — cobrar requiere el servidor (NCF/secuencia).
 *
 * No precachea: cachea on-fetch. La primera carga online llena el cache; a
 * partir de ahí, una recarga offline sirve el shell + las últimas lecturas GET.
 */
const CACHE = 't1et-pos-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      try {
        await cache.put(request, res.clone());
      } catch (_) {
        /* respuestas no cacheables (opacas, etc.) se ignoran */
      }
    }
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fetching = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => cached);
  return cached || fetching;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // mutaciones → red directa

  const url = new URL(request.url);

  // Navegaciones: network-first con fallback al shell cacheado.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Estáticos de Next y assets same-origin: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    if (
      url.pathname.startsWith('/_next/') ||
      /\.(css|js|woff2?|png|jpe?g|svg|ico|webmanifest)$/.test(url.pathname)
    ) {
      event.respondWith(staleWhileRevalidate(request));
      return;
    }
  }

  // Lecturas GET del API: network-first con fallback a cache (catálogo offline).
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(request));
  }
});
