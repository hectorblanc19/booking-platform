const CACHE_VERSION = "flowpay-v26"; // increment on each deploy
const CACHE_NAME = CACHE_VERSION;

// Files you actually want cached (NOT login or API)
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

// Fetch — NETWORK FIRST for login + API + SUPABASE
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // ⭐ NEVER cache Supabase REST or Realtime
  if (url.includes("supabase.co")) {
    return; // let browser handle normally
  }

  // ⭐ NEVER cache API routes
  if (url.includes("/api/")) {
    return;
  }

  // ⭐ NEVER cache login pages
  if (
    url.includes("/barber/login") ||
    url.includes("/nail/login")
  ) {
    return;
  }

  // ⭐ Only cache STATIC assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Only cache GET requests for static files
        if (event.request.method === "GET") {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      });
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
