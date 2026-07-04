const CACHE_NAME = "flowpay-cache-v1";

// Install event: cache basic assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/"]);
    })
  );
  console.log("Service worker installed");
});

// Activate event
self.addEventListener("activate", () => {
  console.log("Service worker activated");
});

// Fetch event: do NOT cache the service worker itself
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Skip caching for service worker files
  if (url.includes("service-worker.js") || url.includes("sw.js")) {
    return; // always fetch latest version
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// ⭐ PUSH NOTIFICATIONS (FIXED VERSION)
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

// Optional: handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
