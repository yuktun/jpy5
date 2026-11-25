// Compare the working tree to a previous published Git revision and exercise
// the actual service-worker update, learner-data retention, and offline pages.
// Start with the last automatic-precache release to exercise migration to opt-in downloads.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, resolve, sep } from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd(), previousRef = process.env.JPY5_PREVIOUS_REF || "3f4a34d";
const previousRoot = await mkdtemp(resolve(tmpdir(), "jpy5-teacher-update-"));
const archive = execFileSync("git", ["archive", "--format=tar", previousRef], { maxBuffer: 64 * 1024 * 1024 });
execFileSync("tar", ["-xf", "-", "-C", previousRoot], { input: archive });
const previousVersion = (await readFile(resolve(previousRoot, "assets/offline-assets.js"), "utf8")).match(/version: "([^"]+)"/)[1];
const previousOptIn = (await readFile(resolve(previousRoot, "assets/pwa.js"), "utf8")).includes("data-offline-download");
const nextVersion = (await readFile(resolve(root, "assets/offline-assets.js"), "utf8")).match(/version: "([^"]+)"/)[1];
assert.notEqual(previousVersion, nextVersion, "Regenerate the offline manifest; choose a revision preceding this release.");
const exerciseMarkup = html => new DOMParser().parseFromString(html, "text/html").querySelector("#teacher-exercise")?.outerHTML ?? null;
const currentExercise = () => { const node = document.querySelector("#teacher-exercise")?.cloneNode(true); if (!node) return null; node.querySelectorAll(".internet-required, .review-group-controls").forEach(note => note.remove()); return node.outerHTML; };
let serveNew = false;
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer(async (request, response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (!requested.startsWith("/jpy5/")) return response.writeHead(404).end();
    const file = requested.slice("/jpy5/".length) || "index.html";
    const path = resolve(root, file);
    if (!path.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
    response.end(await readFile(serveNew ? path : resolve(previousRoot, file)));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}/jpy5/`;
const browser = await chromium.launch({ headless: true, channel: process.env.JPY5_BROWSER_CHANNEL || "msedge" });
const context = await browser.newContext();
await context.route("https://**/*", route => route.abort());
const page = await context.newPage();
try {
  await page.goto(`${base}chapter-14-review.html`);
  if (previousOptIn) {
    await page.waitForFunction(() => navigator.serviceWorker.controller && document.querySelector(".pwa-status")?.dataset.state === "online");
    await page.locator(".pwa-status").click();
    await page.locator("[data-offline-download]").click();
    await page.waitForFunction(() => document.querySelector(".pwa-status")?.dataset.state === "ready", null, { timeout: 90000 });
    await page.locator("[data-offline-close]").click();
  } else {
    // The legacy worker precaches during install and reloads on controllerchange.
    await page.waitForFunction(() => performance.getEntriesByType("navigation")[0]?.type === "reload" && navigator.serviceWorker.controller && document.querySelector(".pwa-status")?.dataset.state === "ready", null, { timeout: 90000 });
  }
  const previousExercise = await page.evaluate(exerciseMarkup, await readFile(resolve(previousRoot, "chapter-14-review.html"), "utf8"));
  assert.equal(await page.evaluate(currentExercise), previousExercise, "Initial page must match the previous published revision.");
  await page.evaluate(() => {
    localStorage.setItem("jpy5.chapter14.teacherUpdateSentinel", JSON.stringify({ attempts: 3, starred: ["keep"] }));
    localStorage.setItem("jpy5.chapter20.teacherUpdateSentinel", "retained");
  });
  serveNew = true;
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  if (!previousOptIn) {
    await page.waitForFunction(() => document.querySelector(".pwa-offline-dialog") || document.querySelector(".pwa-update"), null, { timeout: 60000 });
    if (await page.locator(".pwa-update").count()) await page.locator(".pwa-update button").first().click();
  }
  await page.waitForFunction(() => document.querySelector("[data-offline-download]")?.hidden === false, null, { timeout: 60000 });
  await page.locator(".pwa-status").click();
  await page.locator("[data-offline-download]").click();
  await page.waitForFunction(async version => {
    const metadata = await caches.match(new URL("__offline_state__", location.href));
    return (await metadata?.json())?.version === version;
  }, nextVersion, { timeout: 90000 });
  await page.waitForFunction(() => document.querySelector(".pwa-status")?.dataset.state === "ready", null, { timeout: 60000 });
  await page.locator("[data-offline-close]").click();
  await page.reload();
  await page.locator("#teacher-exercise").waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("jpy5.chapter14.teacherUpdateSentinel")), '{"attempts":3,"starred":["keep"]}');
  assert.equal(await page.evaluate(() => localStorage.getItem("jpy5.chapter20.teacherUpdateSentinel")), "retained");
  await context.setOffline(true);
  for (let lesson = 14; lesson <= 20; lesson++) {
    await page.goto(`${base}chapter-${lesson}-review.html`);
    assert.equal(await page.locator("#teacher-exercise details.teacher-exercise").count(), 3, `Lesson ${lesson} missing from updated offline cache`);
    const expected = await page.evaluate(exerciseMarkup, await readFile(resolve(root, `chapter-${lesson}-review.html`), "utf8"));
    assert.equal(await page.evaluate(currentExercise), expected, `Lesson ${lesson}: offline content must match the corrected release`);
    await page.locator("#teacher-exercise details.teacher-exercise > summary").first().click();
    const first = page.locator("#teacher-exercise [data-answer-toggle]").first();
    const answerId = await first.getAttribute("aria-controls");
    await first.click();
    assert.equal(await page.locator(`#${answerId}`).isVisible(), true, `Lesson ${lesson}: offline answer control`);
    await first.click();
  }
  console.log(`Installed-app update passed: ${previousVersion} → ${nextVersion}; all seven worksheets work offline and learner records remain intact.`);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
  await rm(previousRoot, { recursive: true, force: true });
}
