const CACHE_NAME = "familj-dokument-v2";
const STATIC_CACHE = "familj-dokument-static-v2";
const DOCUMENTS_CACHE = "familj-dokument-docs-v2";

const STATIC_ASSETS = [
  "./",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.includes("familj-dokument-v2"))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: intelligent caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API requests: network-first with offline fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses for offline use
          if (response.ok && url.pathname.includes("/documents")) {
            const clone = response.clone();
            caches.open(DOCUMENTS_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Return cached version if available
          return caches.match(request).then((cached) => {
            if (cached) return cached;

            // Return offline page for document requests
            if (url.pathname.includes("/documents")) {
              return new Response(
                JSON.stringify({
                  error: "Offline",
                  message: "Du är offline. Dokument kommer att synkas när du är online igen."
                }),
                {
                  status: 503,
                  headers: { "Content-Type": "application/json" }
                }
              );
            }
          });
        })
    );
    return;
  }

  // WebSocket connections: skip
  if (url.protocol === "ws:" || url.protocol === "wss:") return;

  // Document files: cache-first with network update
  if (url.pathname.startsWith("/api/files/") || url.pathname.includes("document")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DOCUMENTS_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        if (response.ok && request.destination === "document") {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// Background sync for offline uploads
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync-documents") {
    event.waitUntil(syncPendingUploads());
  }
});

async function syncPendingUploads() {
  // This would sync any pending document uploads when back online
  // For now, just log that we're back online
  console.log("Back online - syncing pending uploads");
}
