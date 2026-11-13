/* global self, caches, clients */
importScripts("assets/offline-assets.js");

const MANIFEST = self.JPY5_OFFLINE_MANIFEST;
const SCOPE = self.registration.scope;
const PREFIX = `jpy5-offline-${encodeURIComponent(SCOPE)}-`;
const META = `${PREFIX}metadata`;
const STATE = new URL("__offline_state__", SCOPE).href;
const SECURITY = `${PREFIX}teacher-security-${MANIFEST.version}`;
const securityAssets = new Set(['assets/grammar-ruby.js','assets/quiz-progress.js','assets/pwa.js','assets/teacher-progress-privacy.mjs'].map(path=>new URL(path,SCOPE).href));
let job = null;
let removing = false;
let lastError = null;
let lastTransfer = null;

const allowed = url => url.origin === self.location.origin && url.href.startsWith(SCOPE) && !/\.(?:pdf|mp3)$/i.test(decodeURIComponent(url.pathname));
const urls = MANIFEST.assets.map(path => new URL(path, SCOPE).href);
const packagePrefix = `${PREFIX}package-`;
const downloadConcurrency = 4;
const retiredTeacherPaths = new Set(['chapter-14-notes.html', 'chapter-14-flashcards.html', 'chapter-14-quiz.html', 'chapter-14-history.html', 'assets/ch14-data.js', 'assets/ch14-grammar-extra-data.js', 'assets/grammar-ruby.js', 'assets/quiz-progress.js', 'ADVERB_SOURCE_AUDIT.md', 'LESSONS14_20_EXERCISE_AUDIT.md'].map(path => new URL(path, SCOPE).href));

async function retirePublicTeacherCopies() {
  const state = await readState();
  if (state?.teacherProtection === 2) return;
  for (const key of await caches.keys()) {
    if (!key.startsWith(`${PREFIX}package-`) && !/^jpy5-precache-[a-f0-9]+$/.test(key)) continue;
    const cache = await caches.open(key);
    for (const request of await cache.keys()) {
      const url = new URL(request.url); url.search = ''; url.hash = '';
      if (retiredTeacherPaths.has(url.href)) {
        await cache.delete(request);
        // Shared furigana is needed by public lessons too. Replace its old
        // plaintext-bearing copy with the verified public-only module.
        if(securityAssets.has(url.href)) {
          const clean=await(await caches.open(SECURITY)).match(url.href);
          if(!clean)throw new Error('Missing security upgrade');
          await cache.put(request,clean);
        }
      }
    }
  }
  // Missing retired files mark an old package incomplete until an explicit update.
  // All its other public resources remain usable. Learner storage is untouched.
}

async function prepareTeacherUpgrade() {
  const state=await readState(),keys=await caches.keys();
  if(state?.teacherProtection===2 || !keys.some(key=>key.startsWith(`${PREFIX}package-`)||/^jpy5-precache-[a-f0-9]+$/.test(key)))return;
  const cache=await caches.open(SECURITY);
  for(const url of securityAssets){
    const response=await fetch(url,{cache:'no-store',redirect:'error'});
    if(!response.ok)throw new Error('Security upgrade unavailable');
    const text=(await response.clone().text()).replace(/\r\n/g,'\n');
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==MANIFEST.hashes[url.slice(SCOPE.length)])throw new Error('Security upgrade changed');
    await cache.put(url,response);
  }
}

async function readState() {
  if (!await caches.has(META)) return null;
  const response = await (await caches.open(META)).match(STATE);
  return response ? response.json() : null;
}

async function complete(state) {
  if (!state?.cache?.startsWith(PREFIX) || !Array.isArray(state.urls) || !state.urls.length) return false;
  if (!(await caches.keys()).includes(state.cache)) return false;
  const keys = new Set((await (await caches.open(state.cache)).keys()).map(request => request.url));
  return state.urls.every(url => allowed(new URL(url)) && keys.has(url));
}

async function status() {
  const current = job;
  const { state, ready } = await (current ? current.snapshot : packageStatus());
  const partial = !current && (await caches.keys()).some(key => key.startsWith(packagePrefix) && key !== state?.cache);
  if (current !== job) return status();
  const transfer = current?.transfer || lastTransfer;
  return { type: "JPY5_OFFLINE_STATUS", ready, version: ready ? state.version : null,
    availableVersion: MANIFEST.version, updateAvailable: ready && state.version !== MANIFEST.version,
    downloading: !!current, canCancel: !!current && !current.publishing && !current.controller.signal.aborted,
    completed: transfer ? transfer.reused + transfer.downloaded : 0,
    total: urls.length, bytes: MANIFEST.bytes, transfer,
    error: lastError || (!current && (partial || (state && !ready)) ? "incomplete" : null) };
}

async function packageStatus() {
  const state = await readState();
  return { state, ready: await complete(state) };
}

async function tellClients(current = job) {
  const message = await status();
  const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
  if (current !== job) return;
  windows.filter(client => client.url.startsWith(SCOPE)).forEach(client => client.postMessage(message));
}

async function reportProgress(current, force = false) {
  const now = Date.now();
  if (!force && now - current.lastReport < 200) return;
  current.lastReport = now;
  await tellClients(current);
}

// Legacy releases used an origin-wide name. Delete only this registration's
// entries; other apps, caches and learner data are never cleared.
async function removeLegacy() {
  for (const key of await caches.keys()) {
    if (!/^jpy5-precache-[a-f0-9]+$/.test(key)) continue;
    const cache = await caches.open(key);
    for (const request of await cache.keys()) {
      if (request.url.startsWith(SCOPE)) await cache.delete(request);
    }
    if (!(await cache.keys()).length) await caches.delete(key);
  }
}

function usableResponse(response) {
  return response?.ok && !response.redirected && response.type !== "opaque" &&
    !/application\/pdf/i.test(response.headers.get("Content-Type") || "");
}

async function matchesHash(response, path) {
  const copy = response.clone();
  const content = /\.(?:html|js|mjs|css|json|webmanifest|md)$/i.test(path)
    ? new TextEncoder().encode((await copy.text()).replace(/\r\n/g, "\n"))
    : await copy.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", content);
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return hash === MANIFEST.hashes[path];
}

async function reusableResponse(cache, url, path) {
  try {
    const response = await cache.match(url);
    if (usableResponse(response) && await matchesHash(response, path)) return response;
  } catch { /* A cache read or verification failure requires a fresh download. */ }
}

async function downloadMissing(current, cache, missing) {
  const { controller, transfer } = current;
  const { signal } = controller;
  let next = 0;
  let failure;
  async function downloadFiles() {
    try {
      while (!signal.aborted && next < missing.length) {
        const { url, path } = missing[next++];
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
          const response = await fetch(url, { cache: "no-store", redirect: "error", signal });
          if (!usableResponse(response)) throw new Error("download");
          if (!await matchesHash(response, path)) throw new Error("changed");
          if (signal.aborted) return;
          await cache.put(url, response);
          transfer.downloaded++;
        } finally { clearTimeout(timeout); }
        await reportProgress(current);
      }
    } catch (error) {
      failure ||= error;
      controller.abort();
    }
  }
  // A failed request aborts its peers. Wait for all pending writes before cleanup.
  await Promise.all(Array.from({ length: Math.min(downloadConcurrency, missing.length) }, downloadFiles));
  if (failure) throw failure;
}

async function download(current) {
  const candidate = `${packagePrefix}${MANIFEST.version}-${Date.now()}`;
  const { signal } = current.controller;
  const { transfer } = current;
  let committed = false;
  try {
    const { state: previous } = await current.snapshot;
    await reportProgress(current, true);
    for (const key of await caches.keys()) {
      if (key.startsWith(packagePrefix) && key !== previous?.cache) await caches.delete(key);
    }
    const oldCache = previous?.cache?.startsWith(packagePrefix) && await caches.has(previous.cache)
      ? await caches.open(previous.cache) : null;
    const oldUrls = new Set(previous?.urls);
    const cache = await caches.open(candidate);
    const missing = [];
    for (const [i, path] of MANIFEST.assets.entries()) {
      if (signal.aborted) throw new Error("download");
      const url = urls[i];
      if (!allowed(new URL(url))) throw new Error("invalid-asset");
      // Older metadata has no per-file hashes. Verify the actual body against
      // the new manifest so missing, corrupt and changed entries are repaired.
      const response = oldCache && oldUrls.has(url) ? await reusableResponse(oldCache, url, path) : null;
      if (signal.aborted) throw new Error("download");
      if (response) {
        await cache.put(url, response);
        transfer.reused++;
      } else {
        missing.push({ url, path });
      }
      if (oldCache) {
        transfer.checked++;
        await reportProgress(current);
      }
    }
    transfer.needed = missing.length;
    if (missing.length) {
      transfer.phase = "downloading";
      await reportProgress(current, true);
      await downloadMissing(current, cache, missing);
    }
    transfer.phase = "verifying";
    await reportProgress(current, true);
    const state = { cache: candidate, version: MANIFEST.version, urls, teacherProtection: 2 };
    if (!await complete(state)) throw new Error("incomplete");
    const metadata = await caches.open(META);
    if (signal.aborted) throw new Error("download");
    // This write is the publication boundary. All candidate bodies were hashed
    // before being saved and cancellation is accepted up to this write.
    current.publishing = true;
    await metadata.put(STATE, new Response(JSON.stringify(state)));
    committed = true;
    transfer.phase = "done";
    if (previous?.cache?.startsWith(packagePrefix)) await caches.delete(previous.cache);
    await removeLegacy();
  } catch (error) {
    if (!committed) {
      transfer.phase = current.cancelled ? "cancelled" : "failed";
      lastError = current.cancelled ? null : error.name === "QuotaExceededError" ? "quota" : error.message === "changed" ? "changed" : "download";
      await caches.delete(candidate).catch(() => {});
    }
  } finally {
    lastTransfer = transfer;
    job = null;
    await tellClients();
  }
}

// Installation does not download a full pack. Old installations receive four
// verified public security modules so public lessons survive text retirement.
// A complete new pack still requires an explicit download.
self.addEventListener("install", event => event.waitUntil(prepareTeacherUpgrade().then(()=>self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(retirePublicTeacherCopies().then(() => clients.claim())));
self.addEventListener("message", event => {
  if (!event.source?.url?.startsWith(SCOPE)) return;
  const type = event.data?.type;
  if (type === "JPY5_ACTIVATE" || type === "JPY5_SKIP_WAITING") event.waitUntil(self.skipWaiting());
  if (type === "JPY5_CACHE_STATUS") event.waitUntil(status().then(message => event.source.postMessage(message)).catch(() => event.source.postMessage({ type: "JPY5_OFFLINE_UNAVAILABLE" })));
  if (type === "JPY5_DOWNLOAD" && !job && !removing) {
    lastError = null;
    job = { controller: new AbortController(), snapshot: packageStatus(), lastReport: 0,
      transfer: { phase: "checking", checked: 0, reused: 0, downloaded: 0, needed: null } };
    job.promise = download(job);
    event.waitUntil(job.promise);
  }
  // Older pages send REMOVE from their only cancellation button during a job.
  if ((type === "JPY5_CANCEL" || type === "JPY5_REMOVE") && job) {
    if (!job.publishing) {
      job.cancelled = true;
      job.controller.abort();
    }
    event.waitUntil(job.promise);
    return;
  }
  if (type === "JPY5_REMOVE" && !removing) {
    removing = true;
    event.waitUntil((async () => {
      try {
        for (const key of await caches.keys()) if (key.startsWith(PREFIX)) await caches.delete(key);
        await removeLegacy();
        lastError = null;
        lastTransfer = null;
      } catch { lastError = "remove"; }
      finally { removing = false; await tellClients(); }
    })());
  }
});

function matchPackage(state, url) {
  if (state?.cache?.startsWith(packagePrefix) && state.urls?.includes(url) &&
      (state.teacherProtection === 2 || !retiredTeacherPaths.has(url))) {
    return caches.match(url, { cacheName: state.cache });
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || !allowed(url)) return;
  url.search = "";
  url.hash = "";
  if (url.href === SCOPE) url.pathname += "index.html";
  event.respondWith((async () => {
    const state = await readState().catch(() => null);
    if(state?.cache?.startsWith(PREFIX) && state.teacherProtection!==2 && securityAssets.has(url.href)){
      const clean=await(await caches.open(SECURITY)).match(url.href);
      if(clean)return clean;
    }
    const cached = await matchPackage(state, url.href);
    if (cached) return cached;
    if (state) {
      // Publication can replace the cache between reading its pointer and matching.
      const latest = await readState().catch(() => null);
      if (latest?.cache !== state.cache) {
        const replacement = await matchPackage(latest, url.href);
        if (replacement) return replacement;
      }
    }
    // No runtime cache writes, PDF caching, or homepage fallback for other URLs.
    return fetch(request);
  })());
});
