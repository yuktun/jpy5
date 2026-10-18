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

const allowed = url => url.origin === self.location.origin && url.href.startsWith(SCOPE) && !/\.pdf$/i.test(decodeURIComponent(url.pathname));
const urls = MANIFEST.assets.map(path => new URL(path, SCOPE).href);
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
  const state = await readState();
  const ready = await complete(state);
  const partial = (await caches.keys()).some(key => key.startsWith(`${PREFIX}package-`) && key !== state?.cache);
  return { type: "JPY5_OFFLINE_STATUS", ready, version: ready ? state.version : null,
    availableVersion: MANIFEST.version, updateAvailable: ready && state.version !== MANIFEST.version,
    downloading: !!job, completed: job?.completed || 0, total: urls.length, bytes: MANIFEST.bytes,
    error: lastError || (!job && (partial || (state && !ready)) ? "incomplete" : null) };
}

async function tellClients() {
  const message = await status();
  const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
  windows.filter(client => client.url.startsWith(SCOPE)).forEach(client => client.postMessage(message));
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

async function download(current) {
  const candidate = `${PREFIX}package-${MANIFEST.version}-${Date.now()}`;
  let committed = false;
  try {
    const previous = await readState();
    for (const key of await caches.keys()) {
      if (key.startsWith(`${PREFIX}package-`) && key !== previous?.cache) await caches.delete(key);
    }
    const cache = await caches.open(candidate);
    await tellClients();
    for (let i = 0; i < urls.length; i++) {
      if (current.controller.signal.aborted) throw new Error("cancelled");
      const url = urls[i];
      if (!allowed(new URL(url))) throw new Error("invalid-asset");
      const timeout = setTimeout(() => current.controller.abort(), 30000);
      try {
        const response = await fetch(url, { cache: "no-store", redirect: "error", signal: current.controller.signal });
        if (!response.ok || response.type === "opaque" || /application\/pdf/i.test(response.headers.get("Content-Type") || "")) throw new Error("download");
        const content = /\.(?:html|js|mjs|css|json|webmanifest|md)$/i.test(new URL(url).pathname)
          ? new TextEncoder().encode((await response.clone().text()).replace(/\r\n/g, "\n"))
          : await response.clone().arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", content);
        const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
        if (hash !== MANIFEST.hashes[MANIFEST.assets[i]]) throw new Error("changed");
        await cache.put(url, response);
      } finally { clearTimeout(timeout); }
      current.completed++;
      await tellClients();
    }
    const state = { cache: candidate, version: MANIFEST.version, urls, teacherProtection: 2 };
    if (current.controller.signal.aborted || !await complete(state)) throw new Error("incomplete");
    // Commit one pointer only after every required response has been verified.
    await (await caches.open(META)).put(STATE, new Response(JSON.stringify(state)));
    committed = true;
    lastError = null;
    if (previous?.cache && previous.cache !== candidate) await caches.delete(previous.cache);
    await removeLegacy();
  } catch (error) {
    if (!committed) await caches.delete(candidate);
    lastError = error.name === "QuotaExceededError" ? "quota" : error.message === "changed" ? "changed" : "download";
  } finally {
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
    job = { controller: new AbortController(), completed: 0 };
    job.promise = download(job);
    event.waitUntil(job.promise);
  }
  if (type === "JPY5_REMOVE" && !removing) {
    removing = true;
    const running = job;
    running?.controller.abort();
    event.waitUntil((async () => {
      try {
        await running?.promise;
        for (const key of await caches.keys()) if (key.startsWith(PREFIX)) await caches.delete(key);
        await removeLegacy();
        lastError = null;
      } catch { lastError = "remove"; }
      finally { removing = false; await tellClients(); }
    })());
  }
});

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
    if (state?.cache?.startsWith(PREFIX) && state.urls?.includes(url.href) && (state.teacherProtection === 2 || !retiredTeacherPaths.has(url.href))) {
      const cached = await (await caches.open(state.cache)).match(url.href);
      if (cached) return cached;
    }
    // No runtime cache writes, PDF caching, or homepage fallback for other URLs.
    return fetch(request);
  })());
});
