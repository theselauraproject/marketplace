const CACHE_VERSION = "v5";
const STATIC_CACHE = `selaura-static-${CACHE_VERSION}`;
const PAGES_CACHE = `selaura-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const OFFLINE_FALLBACK_HTML =
  "<!doctype html><html><head><meta charset=\"utf-8\">" +
  "<title>You're offline</title></head>" +
  "<body style=\"font-family: sans-serif; padding: 2rem;\">" +
  "<h1>You're offline</h1>" +
  "<p>Please reconnect and try again.</p>" +
  "</body></html>";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);

      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          const response = await fetch(url, { cache: "reload" });
          if (response && response.ok) {
            await cache.put(url, response);
          }
        }),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== PAGES_CACHE)
          .map((key) => caches.delete(key)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "clear-pages") {
    event.waitUntil(
      (async () => {
        await caches.delete(PAGES_CACHE);

        const cache = await caches.open(PAGES_CACHE);
        const offline = await fetch(OFFLINE_URL, { cache: "reload" }).catch(
          () => null,
        );

        if (offline && offline.ok) {
          await cache.put(OFFLINE_URL, offline);
        }
      })(),
    );
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/favicon.ico"
  );
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request, { cache: "no-cache" });

    if (response && response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    throw new Error("Asset unavailable offline");
  }
}

async function handleNavigation(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    const response = await fetch(request);

    if (response && response.ok && !response.redirected) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    const offline = await cache.match(OFFLINE_URL);

    if (offline) {
      return offline;
    }

    return new Response(OFFLINE_FALLBACK_HTML, {
      status: 503,
      headers: { "Content-Type": "text/html" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
  }
});
