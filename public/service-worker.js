const CACHE_VERSION = "flowpay-v27"; // increment on each deploy
const CACHE_NAME = CACHE_VERSION;

// Files you actually want cached
const STATIC_ASSETS = [
  "/",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install
self.addEventListener("install", (event) => {
  self.skipWaiting(); // force update immediately

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim(); // take control immediately
});

// Fetch — cache ONLY true static assets.
// Dynamic pages always use the network normally.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Never cache external requests such as Supabase
  if (url.origin !== self.location.origin) {
    return;
  }

  // Only cache real static assets
  const isStaticAsset =
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf)$/i.test(
      url.pathname
    );

  // Booking pages, customer pages, dashboards, login pages,
  // API routes, etc. are NOT handled by the service worker.
  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) {
        return cached;
      }

      const response = await fetch(event.request);

      if (response && response.ok) {
        const responseToCache = response.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, responseToCache);
      }

      return response;
    })
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title || "FlowPayDR", {
      body: data.message || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [100, 50, 100],
      data,
    })
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(clients.openWindow(url));
});