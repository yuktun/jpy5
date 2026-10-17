// Real service workers, Cache Storage and a persistent profile; no real accounts.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
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
const profile = await mkdtemp(join(tmpdir(), "jpy5-offline-test-"));
let version = null, fail = null, corrupt = null, delay = false, disconnected = false;
const requests = [];
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json", ".pdf": "application/pdf" };
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    requests.push(path);
    if (!path.startsWith("/jpy5/")) return response.writeHead(404).end();
    const file = path.slice(6) || "index.html";
    if (file === fail) return response.writeHead(503).end("injected failure");
    if (delay && file === "assets/ch14-common.js") await new Promise(done => setTimeout(done, 1500));
    if (disconnected) { request.socket.destroy(); return; }
    const absolute = resolve(root, file);
    if (!absolute.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
    let body = file === "fixture.PDF" ? Buffer.from("%PDF-1.7 fixture") : await readFile(absolute);
    if (file === "assets/offline-assets.js" && version) body = Buffer.from(body.toString().replace(manifest.version, version));
    if (file === corrupt) body = Buffer.from("changed during deployment");
    response.writeHead(200, { "Content-Type": types[extname(file).toLowerCase()] || "text/plain", "Cache-Control": "no-store" });
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
  await open(second); await second.locator("[data-offline-remove]").click();
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
  version = "test-update-version";
  const before = requests.length;
  await page.locator("[data-offline-check]").click();
  try { await waitState(page, () => document.querySelector(".pwa-status")?.textContent === "離線內容有更新"); }
  catch (error) { console.log("Update debug", await getStatus(page), requests.slice(before), await page.locator("[data-offline-status]").innerText(), await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { installing: r.installing?.state, waiting: r.waiting?.state, active: r.active?.state }; }), await Promise.all(context.serviceWorkers().map(worker => worker.evaluate(() => self.JPY5_OFFLINE_MANIFEST?.version).catch(error => error.message)))); throw error; }
  assert(!requests.slice(before).includes("/jpy5/chapter-20-review.html"), "update detection must not download pack");
  corrupt = "assets/ch14-common.js";
  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector(".pwa-status")?.dataset.state === "error");
  let result = await getStatus(page);
  assert.equal(result.error, "changed"); assert.equal(result.ready, true); assert.equal(result.version, manifest.version);
  corrupt = null;
  await page.locator("[data-offline-download]").click(); await ready(page);
  assert.equal((await getStatus(page)).version, version);
  assert.equal(await page.locator("[data-offline-reload]").isVisible(), true);
  await retained(page);
  console.log("PASS update detection without download, integrity failure preserves old pack, explicit update succeeds");

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

  // An abrupt browser shutdown may leave a staging cache; it must never be ready.
  await page.locator("[data-offline-remove]").click();
  await waitState(page, () => document.querySelector(".pwa-status")?.dataset.state === "online");
  delay = true;
  await page.locator("[data-offline-download]").click();
  await waitState(page, () => document.querySelector("progress").value > 2);
  await context.close(); delay = false;
  page = await launch(); await page.goto(base); await open(page);
  result = await getStatus(page); assert.equal(result.ready, false);
  await page.locator("[data-offline-download]").click(); await ready(page);
  console.log("PASS browser shutdown mid-download and retry");

  assert.deepEqual(errors, [], "unexpected browser script errors");
  await writeFile("../test-results/offline-test-result.json", JSON.stringify({ pages: pages.length, resources: manifest.assets.length, version: manifest.version, browser: options.channel, passed: true }, null, 2));
} finally {
  await context?.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
  assert(profile.startsWith(join(tmpdir(), "jpy5-offline-test-")));
  await rm(profile, { recursive: true, force: true });
}
