/* global self, caches, clients */
importScripts("assets/offline-assets.js");

const CACHE_NAME = `jpy5-precache-${self.JPY5_OFFLINE_MANIFEST.version}`;
const ASSETS = self.JPY5_OFFLINE_MANIFEST.assets.map(path => new URL(path, self.registration.scope).href);

async function tellClients(message) {
  const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
  windows.forEach(windowClient => windowClient.postMessage(message));
}

async function precache() {
  // A versioned candidate cache is not activated or used by the current app.
  // Any failed download leaves the active cache untouched.
  const cache = await caches.open(CACHE_NAME);
  try {
    for (const asset of ASSETS) {
      const response = await fetch(new Request(asset, { cache: "reload" }));
      if (!response.ok || response.type === "opaque") throw new Error(`Unable to cache ${asset}: ${response.status}`);
      await cache.put(asset, response);
    }
  } catch (error) {
    await caches.delete(CACHE_NAME);
    throw error;
  }
}

self.addEventListener("install", event => {
  event.waitUntil(precache());
  // Deliberately no skipWaiting(): an update remains waiting until the learner
  // explicitly chooses the update button in the page.
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith("jpy5-precache-") && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await clients.claim();
    await tellClients({ type: "JPY5_OFFLINE_READY", version: self.JPY5_OFFLINE_MANIFEST.version });
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "JPY5_SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "JPY5_CACHE_STATUS") {
    event.source?.postMessage({ type: "JPY5_OFFLINE_READY", version: self.JPY5_OFFLINE_MANIFEST.version });
  }
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    // Do not use caches.match() here: it searches every cache and could let an
    // active old worker serve files from a fully-downloaded waiting version.
    const activeVersion = await caches.open(CACHE_NAME);
    const cached = await activeVersion.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      return await fetch(request);
    } catch (error) {
      if (request.mode === "navigate") {
        return (await activeVersion.match(new URL("index.html", self.registration.scope))) ||
          new Response("此頁面尚未準備離線使用。", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
      throw error;
    }
  })());
});
