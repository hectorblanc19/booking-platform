const CACHE_NAME = "flowpay-cache-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(["/"]);
    })
  );
  console.log("Service worker installed");
});

self.addEventListener("activate", () => {
  console.log("Service worker activated");
});

// IMPORTANT: Do NOT cache the service worker file itself
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Skip caching for service worker and push-related files
  if (url.includes("service-worker.js") || url.includes("sw.js")) {
    return; // allow browser to fetch latest version
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  self.registration.showNotification(data.title || "FlowPayDR", {
    body: data.message || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  });
});
