// Selaura Marketplace service worker.
//
// Strategy:
//   - Navigations (HTML pages): network-first. We always try the network
//     first so people see the current deployed site; the cached copy is
//     only used as an offline fallback when the network request fails
//     (or times out). This is what used to be stale-while-revalidate, but
//     that strategy meant a stale cached page was served instantly on
//     every visit — including right after restarting the browser — while
//     the fresh copy silently loaded in the background for "next time",
//     which never felt like it arrived. Network-first fixes that at the
//     cost of a cache-only fallback rather than an instant paint.
//   - Static build assets (/_next/static/*, icons): cache-first, since
//     Next.js fingerprints these filenames and they never change contents
//     once built.
//   - Everything else (API calls, cross-origin requests, non-GET
//     requests) is left completely alone and goes straight to the
//     network, so auth/session cookies and live data are never served
//     stale.
//
// Bump CACHE_VERSION whenever the caching strategy or precache list
// changes, so old caches get cleaned up on activate.
const CACHE_VERSION = "v3";
const NAVIGATION_TIMEOUT_MS = 4000;
const STATIC_CACHE = `selaura-static-${CACHE_VERSION}`;
const PAGES_CACHE = `selaura-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  "/",
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

      // Precache each URL independently — one missing/failed route
      // shouldn't stop the rest of the app shell from being cached.
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          const response = await fetch(url);
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

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/favicon.ico"
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const fallback = await cache.match(request);
    if (fallback) {
      return fallback;
    }
    throw new Error("Asset unavailable offline");
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function handleNavigation(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    // Always prefer the network so people get the current site, not a
    // cached snapshot from a previous visit or a previous browser
    // session. A short timeout keeps a slow connection from hanging the
    // navigation forever before we fall back to cache.
    const response = await withTimeout(fetch(request), NAVIGATION_TIMEOUT_MS);
    if (response && response.ok) {
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

  // Never intercept cross-origin requests (the API server, GitHub, etc.) —
  // only manage caching for the web app's own origin.
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});
