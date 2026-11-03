// Offline support for the parent's screens. Saves the home screen, "Check something", "Type or
// paste" and the Golden Rules, with the files they need, so the call buttons (numbers come from
// the copy kept on the phone), the Golden Rules and the quick rules-only check still work without
// internet. Never stores API requests or anything personal.

const CACHE = "second-look-v1";
const PAGES = ["/p", "/p/check", "/p/check/text", "/p/rules"];

function isParentPage(pathname) {
  return pathname === "/p" || pathname.startsWith("/p/");
}

// The page's own scripts, styles and fonts, as listed in its HTML.
function assetsIn(html) {
  return [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
}

async function savePage(cache, page) {
  const response = await fetch(page, { cache: "no-store" });
  if (!response.ok) return;
  const html = await response.clone().text();
  await cache.put(page, response);
  await Promise.all(assetsIn(html).map((asset) => cache.add(asset).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const page of PAGES) await savePage(cache, page).catch(() => {});
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("second-look-") && n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Built files have a unique name per version, so a saved copy is always right.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const saved = await cache.match(request);
        if (saved) return saved;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  // Parent screens: always try the network first, so the newest version is used when online.
  if (request.mode === "navigate" && isParentPage(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(request);
          if (response.ok && PAGES.includes(url.pathname)) cache.put(url.pathname, response.clone());
          return response;
        } catch {
          return (
            (await cache.match(url.pathname)) ||
            (await cache.match("/p")) ||
            new Response("You are offline. Please try again when you have internet.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
  }
});
