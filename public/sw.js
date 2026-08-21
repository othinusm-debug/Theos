// THEOS — Service worker local. Los registros viven en IndexedDB y este
// worker conserva el cascarón de la aplicación (App Shell) para que arranque
// sin conexión, incluso en rutas que el usuario todavía no visitó online.

const CACHE_NAME = 'theos-shell-v5';
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const withBase = (path) => `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
const SHELL_URL = withBase('/');

// Se completa en `install`: intenta leer precache-manifest.json (generado
// por scripts/generate-sw-manifest.mjs después de "npm run build", con la
// lista real de archivos que Vite produjo, hashes incluidos) y precachea
// todo — HTML, manifest, íconos y los .js/.css con hash de /assets/. Así la
// app entera queda disponible offline desde la primera visita, no solo lo
// que el usuario alcanzó a visitar mientras tenía conexión.
async function precachearAppShell(cache) {
  const urlsAPrecachear = new Set([SHELL_URL, withBase('/manifest.json')]);

  try {
    const manifestResponse = await fetch(withBase('/precache-manifest.json'), { cache: 'no-store' });
    if (manifestResponse.ok) {
      const archivos = await manifestResponse.json();
      for (const archivo of archivos) urlsAPrecachear.add(withBase(archivo));
    }
  } catch (err) {
    // Sin precache-manifest.json (ej. "npm run dev", que no corre el build)
    // seguimos con el shell mínimo de arriba — no rompe el arranque.
  }

  await Promise.allSettled(
    Array.from(urlsAPrecachear).map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (response && response.ok) await cache.put(url, response);
      } catch (err) {
        // Un archivo individual que falla no debe tumbar todo el precache.
      }
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => precachearAppShell(cache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Los archivos bajo /assets/ que genera Vite son inmutables: el nombre
  // cambia si el contenido cambia (hash en el nombre). Para esos, cache-first
  // es correcto y más rápido — no hace falta ir a la red si ya los tenemos.
  const esAssetInmutable = url.pathname.startsWith(withBase('/assets/'));

  if (esAssetInmutable) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response && response.status === 200) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Navegaciones (abrir/recargar la app en cualquier ruta, ej. /animales/42):
  // network-first, y si la red falla O responde con error (ej. 404 de un
  // host sin rewrite de SPA configurado), se sirve siempre el mismo cascarón
  // cacheado — es una SPA, wouter resuelve la ruta del lado del cliente con
  // la URL que quedó en la barra de direcciones.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            cache.put(SHELL_URL, response.clone());
            return response;
          }
          throw new Error(`Respuesta no válida: ${response.status}`);
        } catch (err) {
          const shell = await cache.match(SHELL_URL);
          if (shell) return shell;
          throw err;
        }
      })()
    );
    return;
  }

  // Resto de peticiones GET del mismo origen (manifest, íconos, css/js sin
  // hash si los hubiera): network-first con fallback a caché.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw err;
      }
    })
  );
});
