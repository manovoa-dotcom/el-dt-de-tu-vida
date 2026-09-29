// Service Worker de "El DT de tu vida"
// Solo para hacer la app instalable y manejar notificaciones push.

const CACHE_NAME = "eldt-v1";
const URLS_TO_CACHE = ["/inicio", "/icon.svg", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // No cacheamos llamadas a Supabase ni al API
  const url = new URL(event.request.url);
  if (
    url.hostname.includes("supabase") ||
    url.pathname.startsWith("/api") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Para el resto: red primero, caché como respaldo
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear HTML estático (no en query strings)
        if (
          response.ok &&
          url.origin === self.location.origin &&
          url.search === ""
        ) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Para futuras notificaciones push
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    vibrate: [100, 50, 100],
    data: data.url ? { url: data.url } : {},
  };
  event.waitUntil(self.registration.showNotification(data.title || "El DT", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/inicio";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const c of list) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});