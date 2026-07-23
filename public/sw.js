/* DataGrid PWA cache.
 *
 * Documents are network-first so a stale deployment can never trap the Next.js
 * client in a reload loop. Only stable public assets use stale-while-revalidate.
 */
const CACHE_PREFIX = "datagrid-";
const STATIC_CACHE = `${CACHE_PREFIX}static-v2`;
const PAGE_CACHE = `${CACHE_PREFIX}pages-v2`;
const PRECACHE = [
  "/manifest.webmanifest",
  "/media/scroll/poster.jpg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                name.startsWith(CACHE_PREFIX) &&
                name !== STATIC_CACHE &&
                name !== PAGE_CACHE
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API/RSC responses and hashed Next.js assets manage their own caching.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname === "/sw.js"
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (isStablePublicAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    return new Response(
      "<!doctype html><title>DataGrid offline</title><meta name='viewport' content='width=device-width'><style>body{font-family:system-ui;background:#f5f3ec;color:#0e211a;padding:3rem}a{color:#168653}</style><h1>You are offline.</h1><p>Reconnect and try DataGrid again.</p><a href='/'>Retry</a>",
      {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const update = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || update;
}

function isStablePublicAsset(pathname) {
  return (
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/media/") ||
    /\.(?:avif|gif|ico|jpe?g|png|svg|webm|webp)$/i.test(pathname)
  );
}
