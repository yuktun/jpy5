// Real service workers, Cache Storage and a persistent profile; no real accounts.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, extname, sep, join } from "node:path";
import vm from "node:vm";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd();
const manifestSource = await readFile("assets/offline-assets.js", "utf8");
const sandbox = { self: {} }; vm.runInNewContext(manifestSource, sandbox);
const manifest = sandbox.self.JPY5_OFFLINE_MANIFEST;
const pages = manifest.assets.filter(path => path.endsWith(".html"));
const benchmarkRef = process.env.JPY5_OFFLINE_BASELINE_REF;
const baselineWorker = benchmarkRef && execFileSync("git", ["show", `${benchmarkRef}:sw.js`]);
const benchmarkOnly = !!baselineWorker || process.env.JPY5_OFFLINE_BENCHMARK_ONLY === "1";
const benchmarkDelay = Number(process.env.JPY5_OFFLINE_BENCHMARK_DELAY ?? 20);
const profile = await mkdtemp(join(tmpdir(), "jpy5-offline-test-"));
let release = manifest, changedFiles = new Map(), fail = null, corrupt = null, delay = false, disconnected = false;
let measurement = null;
const requests = [];
const changedFile = "assets/ch14-common.js";
const changedPage = "chapter-20-review.html";
const addedFile = "assets/offline-added-fixture.txt";
const deletedFile = "assets/app-icon.png";
const missingFile = "chapter-20.html";
const damagedFile = "assets/ch20-quiz.js";
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json", ".pdf": "application/pdf" };

async function publish(version, paths, { add = false, remove = false } = {}) {
  changedFiles = new Map();
  const hashes = { ...manifest.hashes };
  for (const file of paths) {
    const text = (await readFile(file, "utf8")).replace(/\r\n/g, "\n");
    const marker = file.endsWith(".html") ? `\n<!-- ${version} -->\n` : `\n// ${version}\n`;
    changedFiles.set(file, Buffer.from(text + marker));
  }
  if (add) changedFiles.set(addedFile, Buffer.from("new offline resource\n"));
  for (const [file, body] of changedFiles) hashes[file] = createHash("sha256").update(body).digest("hex");
  if (remove) delete hashes[deletedFile];
  release = { ...manifest, version, assets: Object.keys(hashes).sort(), hashes };
}

const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    requests.push(path);
    if (!path.startsWith("/jpy5/")) return response.writeHead(404).end();
    const file = path.slice(6) || "index.html";
    const meter = release.hashes[file] ? measurement : null;
    if (meter) {
      meter.files.push(file);
      meter.active++;
      meter.peak = Math.max(meter.active, meter.peak);
      response.once("close", () => { meter.active--; });
      if (meter.delay) await new Promise(done => setTimeout(done, meter.delay));
    }
    if (file === fail) return response.writeHead(503).end("injected failure");
    if (delay && file === changedFile) await new Promise(done => setTimeout(done, 1500));
    if (disconnected) { request.socket.destroy(); return; }
    if (file === deletedFile && !release.hashes[file]) return response.writeHead(404).end();
    const absolute = resolve(root, file);
    if (!absolute.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
    let body = changedFiles.get(file);
    if (file === "fixture.PDF") body = Buffer.from("%PDF-1.7 fixture");
    if (file === "sw.js" && baselineWorker) body = baselineWorker;
    if (file === "assets/offline-assets.js") body = Buffer.from(`self.JPY5_OFFLINE_MANIFEST = ${JSON.stringify(release)};`);
    body ||= await readFile(absolute);
    if (file === corrupt) body = Buffer.from("changed during deployment");
    response.writeHead(200, { "Content-Type": types[extname(file).toLowerCase()] || "text/plain", "Cache-Control": "no-store" });
    if (meter && !response.destroyed) meter.bytes += body.length;
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}/jpy5/`;
const options = { headless: true, channel: process.env.JPY5_BROWSER_CHANNEL || "msedge", viewport: { width: 390, height: 844 } };
let context;
const errors = [];
async function setOffline(value) { disconnected = value; await context.setOffline(value); }
async function launch() {
  context = await chromium.launchPersistentContext(profile, options);
  await context.route("**/*", route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
  return context.pages()[0] || await context.newPage();
}
async function waitState(page, condition) {
  await page.waitForFunction(condition, null, { timeout: 90000 });
}
async function getStatus(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { navigator.serviceWorker.removeEventListener("message", listener); reject(new Error("status timeout")); }, 10000);
    const listener = event => { if (event.data?.type === "JPY5_OFFLINE_STATUS") { clearTimeout(timeout); navigator.serviceWorker.removeEventListener("message", listener); resolve(event.data); } };
    navigator.serviceWorker.addEventListener("message", listener);
    navigator.serviceWorker.controller.postMessage({ type: "JPY5_CACHE_STATUS" });
  }));
}
async function open(page) {
  if (!await page.locator(".pwa-offline-dialog").evaluate(el => el.open)) await page.locator(".pwa-status").click();
}
async function ready(page) {
  await waitState(page, () => document.querySelector(".pwa-status")?.dataset.state === "ready");
  assert.equal((await getStatus(page)).ready, true);
}
async function checkUpdate(page, version) {
  const before = requests.length;
  await page.locator("[data-offline-check]").click();
  await waitState(page, () => document.querySelector(".pwa-status")?.textContent === "離線內容有更新");
  assert.equal((await getStatus(page)).availableVersion, version);
  assert(!requests.slice(before).some(path => release.hashes[path.slice(6)]), "update check must not fetch package assets");
}
async function measureDownload(page, expected, latency = 0) {
  await page.waitForFunction(() => {
    const button = document.querySelector("[data-offline-download]");
    return button && !button.disabled && !button.hidden;
  });
  const meter = measurement = { files: [], bytes: 0, peak: 0, active: 0, delay: latency };
  let outcome;
  try {
    outcome = await page.evaluate(version => new Promise((resolve, reject) => {
      const button = document.querySelector("[data-offline-download]");
      if (button.disabled || button.hidden) return reject(new Error(`Download unavailable: ${document.querySelector("[data-offline-status]").textContent}`));
      let started;
      let sawDownload = false;
      const timeout = setTimeout(() => {
        navigator.serviceWorker.removeEventListener("message", listener);
        reject(new Error(`Timed out waiting for package ${version}: ${document.querySelector("[data-offline-status]").textContent}`));
      }, 90000);
      function listener({ data }) {
        if (data?.type !== "JPY5_OFFLINE_STATUS" || data.availableVersion !== version) return;
        if (data.downloading) { sawDownload = true; return; }
        if (data.version !== version && !(sawDownload && data.error)) return;
        clearTimeout(timeout);
        navigator.serviceWorker.removeEventListener("message", listener);
        resolve({ ms: Math.round(performance.now() - started), status: data });
      }
      navigator.serviceWorker.addEventListener("message", listener);
      started = performance.now();
      button.click();
    }), release.version);
  } finally { measurement = null; }
  const { ms, status } = outcome;
  assert.equal(status.error, null);
  assert.equal(status.ready, true);
  assert.equal(status.version, release.version);
  assert.deepEqual(meter.files.sort(), [...expected].sort());
  return { requests: meter.files.length, bytes: meter.bytes, peak: meter.peak, ms, status };
}
async function seed(page) {
  await page.evaluate(async () => {
    localStorage.setItem("jpy5.chapter13.offlineTest", "keep-progress");
    localStorage.setItem("jpy5.chapter20.quiz.activeRun", "keep-draft");
    localStorage.setItem("unrelated", "keep-other-data");
    await (await caches.open("other-app-cache")).put("/other-app/keep", new Response("keep"));
    await (await caches.open("jpy5-precache-abcd1234")).put("/other-app/keep", new Response("keep-legacy-other-scope"));
    await (await caches.open("jpy5-precache-abcd1234")).put("/jpy5/legacy-fixture", new Response("old-package"));
  });
}
async function retained(page) {
  assert.deepEqual(await page.evaluate(async () => [localStorage.getItem("jpy5.chapter13.offlineTest"), localStorage.getItem("jpy5.chapter20.quiz.activeRun"), localStorage.getItem("unrelated"), await (await (await caches.open("other-app-cache")).match("/other-app/keep")).text(), await (await (await caches.open("jpy5-precache-abcd1234")).match("/other-app/keep")).text()]), ["keep-progress", "keep-draft", "keep-other-data", "keep", "keep-legacy-other-scope"]);
}
try {
  let page = await launch();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base);
  await waitState(page, () => !!navigator.serviceWorker.controller && document.querySelector(".pwa-status")?.dataset.state === "online");
  const first = await getStatus(page);
  assert.equal(first.ready, false);
  assert(!requests.includes("/jpy5/chapter-20-review.html"), "default must not fetch other lessons");
  assert.equal(await page.evaluate(async () => (await caches.keys()).filter(key => key.includes("package-")).length), 0);
  if (benchmarkOnly) {
    await open(page);
    await page.locator("[data-offline-download]").click(); await ready(page);
    for (let run = 1; run <= 3; run++) {
      const version = `benchmark-${run}`;
      await publish(version, [changedFile]);
      await checkUpdate(page, version);
      const { status, ...metrics } = await measureDownload(page, baselineWorker ? release.assets : [changedFile], benchmarkDelay);
      if (!baselineWorker) assert.equal(status.transfer.reused, release.assets.length - 1);
      console.log(JSON.stringify({ worker: benchmarkRef || "incremental", run, latency: benchmarkDelay, ...metrics }));
    }
  } else {
  await seed(page);
  await open(page);
  assert.equal(await page.locator(".pwa-offline-dialog").evaluate(el => el.scrollWidth <= el.clientWidth), true);
  await mkdir("../test-results", { recursive: true });
  await page.screenshot({ path: "../test-results/offline-settings-mobile.png" });
  console.log("PASS default online mode: no package or unvisited lesson download; mobile dialog fits");

  fail = "assets/ch14-common.js";
  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector(".pwa-status")?.dataset.state === "error");
  assert.equal((await getStatus(page)).ready, false);
  assert.equal(await page.evaluate(async () => (await caches.keys()).filter(key => key.includes("package-")).length), 0);
  fail = null;
  const worker = context.serviceWorkers()[0];
  await worker.evaluate(() => {
    self.testOriginalPut = Cache.prototype.put;
    Cache.prototype.put = () => Promise.reject(new DOMException("Injected full storage", "QuotaExceededError"));
  });
  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector(".pwa-status")?.dataset.state === "error");
  assert.equal((await getStatus(page)).error, "quota");
  await worker.evaluate(() => { Cache.prototype.put = self.testOriginalPut; delete self.testOriginalPut; });
  delay = true;
  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector("progress").value > 2);
  assert.equal((await getStatus(page)).ready, false, "progress is not readiness");
  // A second tab must join the same download and can cancel it safely.
  const second = await context.newPage(); await second.goto(base);
  await waitState(second, () => document.querySelector(".pwa-status")?.dataset.state === "pending");
  await open(second); await second.locator("[data-offline-cancel]").click();
  await waitState(second, () => document.querySelector(".pwa-status")?.dataset.state === "online");
  await second.close();
  assert.equal((await getStatus(page)).ready, false);
  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector("progress").value > 2);
  await setOffline(true);
  await waitState(page, () => document.querySelector(".pwa-status")?.dataset.state === "error");
  assert.equal((await getStatus(page)).ready, false);
  await setOffline(false);
  delay = false;
  await page.locator("[data-offline-download]").click();
  await ready(page); await retained(page);
  assert.equal((await getStatus(page)).total, manifest.assets.length);
  assert.equal(await page.evaluate(async () => !!(await (await caches.open("jpy5-precache-abcd1234")).match("/jpy5/legacy-fixture"))), false);
  console.log("PASS explicit download, progress, HTTP/quota/disconnection failure and retry, cross-tab cancellation, and progress retention");

  await context.close();
  page = await launch(); await setOffline(true);
  await page.goto(base); await ready(page);
  for (const file of pages) {
    const response = await page.goto(`${base}${file}?offline-test=1`);
    assert.equal(response.status(), 200, file);
    await page.waitForSelector(".pwa-status");
  }
  await page.goto(`${base}chapter-20-vocabulary.html`);
  await page.locator("#teacher-adverbs [data-answer-toggle]").first().click();
  await page.goto(`${base}chapter-13-quiz.html`);
  assert(await page.locator("main").innerText());
  await retained(page);
  console.log(`PASS persistent-profile offline cold start and all ${pages.length} pages, including exercises`);

  await setOffline(false);
  await page.goto(base); await open(page);
  await page.evaluate(() => {
    const holder = document.createElement("div");
    holder.id = "test-links";
    holder.innerHTML = '<a href="fixture.PDF?download=1">PDF</a><a href="https://example.com/">External</a>';
    document.querySelector(".pwa-offline-dialog").append(holder);
  });
  await page.waitForFunction(() => document.querySelectorAll("#test-links .internet-required").length === 2);
  assert.equal(await page.evaluate(async () => (await fetch("fixture.PDF")).headers.get("Content-Type")), "application/pdf");
  await setOffline(true);
  assert.equal(await page.evaluate(async () => { try { await fetch("fixture.PDF?fresh=2"); return true; } catch { return false; } }), false);
  assert.equal(await page.evaluate(async () => { try { await fetch("https://example.com/"); return true; } catch { return false; } }), false);
  assert.equal(await page.evaluate(async () => { for (const key of await caches.keys()) for (const req of await (await caches.open(key)).keys()) if (/\.pdf(?:\?|$)/i.test(req.url) || new URL(req.url).origin !== location.origin) return true; return false; }), false);
  console.log("PASS PDF/external labels, online PDF response, and no offline PDF or external caching");

  await setOffline(false);
  await publish("single-file-update", [changedFile]);
  await checkUpdate(page, release.version);
  async function oldVersionStillWorks() {
    const { ready, version } = await getStatus(page);
    assert.equal(ready, true);
    assert.equal(version, manifest.version);
    assert.equal(await page.evaluate(async () => (await caches.keys()).filter(key => key.includes("package-")).length), 1);
    await setOffline(true);
    const oldTab = await context.newPage();
    assert.equal((await oldTab.goto(`${base}${changedPage}`)).status(), 200);
    assert(!await oldTab.evaluate(async file => (await (await fetch(file)).text()).includes("single-file-update"), changedFile));
    await retained(oldTab);
    await oldTab.close();
    await setOffline(false);
  }

  corrupt = changedFile;
  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector(".pwa-status")?.dataset.state === "error");
  assert.equal((await getStatus(page)).error, "changed");
  await oldVersionStillWorks();
  corrupt = null;

  const updateWorker = context.serviceWorkers().at(-1);
  await updateWorker.evaluate(() => {
    self.testOriginalPut = Cache.prototype.put;
    Cache.prototype.put = function (request, response) {
      if (String(request).endsWith("/__offline_state__")) throw new DOMException("Injected full storage at publication", "QuotaExceededError");
      return self.testOriginalPut.call(this, request, response);
    };
  });
  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector(".pwa-status")?.dataset.state === "error");
  assert.equal((await getStatus(page)).error, "quota");
  await updateWorker.evaluate(() => { Cache.prototype.put = self.testOriginalPut; delete self.testOriginalPut; });
  await oldVersionStillWorks();

  delay = true;
  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector("[data-offline-status]")?.textContent.includes("下載中 0/1"));
  const assetCount = release.assets.length;
  assert.match(await page.locator("[data-offline-status]").textContent(), new RegExp(`已檢查 ${assetCount} 個，重用 ${assetCount - 1} 個，已下載 0 個`));
  await page.locator("[data-offline-cancel]").click();
  await waitState(page, () => document.querySelector("[data-offline-status]")?.textContent.includes("已取消下載"));
  await oldVersionStillWorks();

  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector("[data-offline-status]")?.textContent.includes("下載中 0/1"));
  await setOffline(true);
  await waitState(page, () => document.querySelector(".pwa-status")?.dataset.state === "error");
  assert.equal((await getStatus(page)).error, "download");
  await oldVersionStillWorks();
  delay = false;

  // Hold the final candidate key check so cancellation lands inside the await.
  await updateWorker.evaluate(() => {
    self.testOriginalKeys = Cache.prototype.keys;
    Cache.prototype.keys = async function (...args) {
      const keys = await self.testOriginalKeys.apply(this, args);
      if (!self.testReleaseKeys && job?.transfer.phase === "verifying") {
        await new Promise(resolve => { self.testReleaseKeys = resolve; });
      }
      return keys;
    };
  });
  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector(".pwa-status")?.textContent === "確認離線內容中");
  await page.locator("[data-offline-cancel]").click();
  await updateWorker.evaluate(() => {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + 5000;
      const timer = setInterval(() => {
        if (self.testReleaseKeys && job?.controller.signal.aborted) {
          clearInterval(timer);
          Cache.prototype.keys = self.testOriginalKeys;
          self.testReleaseKeys();
          delete self.testReleaseKeys;
          delete self.testOriginalKeys;
          resolve();
        } else if (Date.now() > deadline) {
          clearInterval(timer);
          reject(new Error("Cancellation did not reach the final check"));
        }
      }, 20);
    });
  });
  await waitState(page, () => document.querySelector("[data-offline-status]")?.textContent.includes("已取消下載"));
  await oldVersionStillWorks();
  const { status: singleStatus, ...singleMetrics } = await measureDownload(page, [changedFile]);
  assert.equal(singleStatus.transfer.reused, manifest.assets.length - 1);
  assert.equal(await page.locator("[data-offline-reload]").isVisible(), true);
  await retained(page);
  console.log("PASS single change, old hash-less metadata, network mismatch, quota at publication, cancellation during download/final check, and disconnection", singleMetrics);

  await publish("inventory-update", [changedPage], { add: true, remove: true });
  await checkUpdate(page, release.version);
  await page.evaluate(async ({ missingFile, damagedFile }) => {
    const key = (await caches.keys()).find(key => key.includes("package-"));
    const cache = await caches.open(key);
    await cache.delete(new URL(missingFile, location.href));
    await cache.put(new URL(damagedFile, location.href), new Response("corrupt cached JS"));
  }, { missingFile, damagedFile });
  const { status: inventoryStatus, ...inventoryMetrics } = await measureDownload(page, [changedFile, changedPage, addedFile, missingFile, damagedFile], 100);
  assert.equal(inventoryStatus.transfer.reused, release.assets.length - 5);
  assert.equal(inventoryMetrics.peak, 4);
  await setOffline(true);
  const verifiedTab = await context.newPage();
  const offlinePage = await verifiedTab.goto(`${base}${changedPage}?offline-inventory-test=1`);
  assert.equal(offlinePage.status(), 200);
  assert.equal(offlinePage.fromServiceWorker(), true);
  assert((await offlinePage.text()).includes("<!-- inventory-update -->"), "fresh offline navigation should serve the updated HTML bytes");
  const cachedBodies = await verifiedTab.evaluate(async () => {
    const [key] = (await caches.keys()).filter(key => key.includes("package-"));
    const cache = await caches.open(key);
    return Promise.all((await cache.keys()).map(async ({ url }) => {
      const file = new URL(url).pathname.slice(6);
      const response = await cache.match(url);
      const bytes = /\.(?:html|js|mjs|css|json|webmanifest|md)$/i.test(file)
        ? new TextEncoder().encode((await response.text()).replace(/\r\n/g, "\n")) : await response.arrayBuffer();
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
      return [file, hash];
    }));
  });
  assert.deepEqual(Object.fromEntries(cachedBodies), release.hashes, "active offline package must match every target hash and exclude removed resources");
  await verifiedTab.goto(`${base}chapter-20-vocabulary.html`);
  await verifiedTab.locator("#teacher-adverbs [data-answer-toggle]").first().click();
  await retained(verifiedTab);
  await verifiedTab.close();
  console.log("PASS addition, deletion, missing/corrupt cache repair, four concurrent requests, offline new page and teacher exercise, and every target hash", inventoryMetrics);

  await setOffline(true);
  await page.locator("[data-offline-remove]").click();
  await waitState(page, () => document.querySelector(".pwa-status")?.dataset.state === "online");
  await retained(page);
  assert.equal(await page.evaluate(async () => (await caches.keys()).filter(key => key.includes("package-")).length), 0);
  assert.equal(await page.evaluate(async () => { try { await fetch("chapter-20-review.html?removed=1"); return true; } catch { return false; } }), false);
  await setOffline(false);
  await page.reload(); await open(page);
  assert.equal((await getStatus(page)).ready, false);
  await page.locator("[data-offline-download]").click(); await ready(page);
  // Simulate partial storage eviction: a metadata flag alone must not imply ready.
  await page.evaluate(async () => { const key = (await caches.keys()).find(key => key.includes("package-")); await (await caches.open(key)).delete(new URL("chapter-20.html", location.href)); });
  await page.locator("[data-offline-check]").click();
  await waitState(page, () => document.querySelector(".pwa-status")?.dataset.state === "error");
  assert.equal((await getStatus(page)).ready, false);
  await page.locator("[data-offline-download]").click(); await ready(page);
  await retained(page);
  console.log("PASS removal/re-enable and missing-cache detection/recovery without clearing unrelated data");

  // An abrupt shutdown during an update must leave the previous pack active.
  const beforeShutdown = (await getStatus(page)).version;
  await publish("shutdown-update", [changedFile, changedPage], { add: true, remove: true });
  await checkUpdate(page, release.version);
  delay = true;
  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector("[data-offline-status]")?.textContent.includes("下載中"));
  await context.close(); delay = false;
  page = await launch(); await setOffline(true);
  const previousPage = await page.goto(`${base}${changedPage}?shutdown-check=1`);
  assert.equal(previousPage.fromServiceWorker(), true);
  assert((await previousPage.text()).includes("<!-- inventory-update -->"), "shutdown must keep serving the previously committed release");
  await waitState(page, () => !!navigator.serviceWorker.controller);
  const afterShutdown = await getStatus(page);
  assert.equal(afterShutdown.ready, true);
  assert.equal(afterShutdown.version, beforeShutdown);
  await retained(page);
  await setOffline(false); await open(page);
  await page.locator("[data-offline-download]").click(); await ready(page);
  assert.equal((await getStatus(page)).version, release.version);
  console.log("PASS abrupt browser shutdown mid-update, cold restart offline with prior release, and retry");

  assert.deepEqual(errors, [], "unexpected browser script errors");
  await writeFile("../test-results/offline-test-result.json", JSON.stringify({ pages: pages.length, resources: manifest.assets.length, version: manifest.version, browser: options.channel, passed: true }, null, 2));
  }
} finally {
  await context?.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
  assert(profile.startsWith(join(tmpdir(), "jpy5-offline-test-")));
  await rm(profile, { recursive: true, force: true });
}
