#!/usr/bin/env node
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const pages = (await readdir(root)).filter(name => name.endsWith(".html")).sort();
const manifestSource = await readFile(join(root, "assets", "offline-assets.js"), "utf8");
const assetMatches = [...manifestSource.matchAll(/^  "([^"]+)"/gm)].map(match => match[1]);
const manifest = JSON.parse(await readFile(join(root, "manifest.webmanifest"), "utf8"));
const serviceWorker = await readFile(join(root, "sw.js"), "utf8");
const pwa = await readFile(join(root, "assets", "pwa.js"), "utf8");
const styles = await readFile(join(root, "assets", "styles.css"), "utf8");

assert.equal(new Set(assetMatches).size, assetMatches.length, "offline inventory has duplicate entries");
for (const asset of assetMatches) await stat(join(root, asset));
for (const page of pages) {
  const html = await readFile(join(root, page), "utf8");
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/, `${page} has no app manifest`);
  assert.match(html, /<script src="assets\/pwa\.js" defer><\/script>/, `${page} does not register the PWA`);
  assert(assetMatches.includes(page), `${page} is missing from the offline inventory`);
}
assert.equal(pages.length, 37, "unexpected page count; review the offline inventory");
assert.equal(manifest.scope, "/jpy5/");
assert.equal(manifest.start_url, "/jpy5/");
assert.match(serviceWorker, /importScripts\("assets\/offline-assets\.js"\)/);
assert.match(serviceWorker, /await caches\.delete\(CACHE_NAME\)/, "failed candidates must be removed");
assert.doesNotMatch(serviceWorker, /skipWaiting\(\);\s*\/\//, "service worker must not auto-activate");
assert.match(serviceWorker, /JPY5_SKIP_WAITING/, "activation must require an explicit page message");
assert.doesNotMatch(serviceWorker, /localStorage|indexedDB/, "service worker must not touch learner data stores");
assert.match(serviceWorker, /const activeVersion = await caches\.open\(CACHE_NAME\)/);
assert.match(serviceWorker, /activeVersion\.match\(request, \{ ignoreSearch: true \}\)/, "an active worker must read only its own versioned cache");
assert.match(pwa, /visibilitychange/);
assert.match(pwa, /addEventListener\("online"/);
assert.match(pwa, /立即更新/);
assert.match(pwa, /稍後/);
assert.match(pwa, /brand\.insertAdjacentElement\("afterend", status\)/, "status must be placed after the header brand");
assert.match(pwa, /label: "已下載"/);
assert.match(pwa, /label: "離線可用"/);
assert.match(pwa, /label: "下載中"/);
assert.match(pwa, /label: "下載未完成"/);
assert.match(styles, /\.pwa-status\{display:inline-flex/);
assert.match(styles, /\.pwa-status\{grid-column:1\/-1;grid-row:2/, "narrow headers need a second status row");

console.log(`PWA checks passed: ${pages.length} pages and ${assetMatches.length} cached resources.`);
