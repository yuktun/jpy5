// Compare the working tree to a previous published Git revision and exercise
// the actual service-worker update, learner-data retention, and offline pages.
// Before committing, set JPY5_PREVIOUS_REF=HEAD; after committing, use HEAD^.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd(), previousRef = process.env.JPY5_PREVIOUS_REF || "HEAD^";
const changed = ["sw.js", "assets/pwa.js", "assets/offline-assets.js", "assets/teacher-supplements.js", ...Array.from({ length: 8 }, (_, i) => `chapter-${13 + i}-vocabulary.html`)];
const oldFiles = new Map(changed.map(file => [file, execFileSync("git", ["show", `${previousRef}:${file}`], { cwd: root })]));
const previousVersion = oldFiles.get("assets/offline-assets.js").toString().match(/version: "([^"]+)"/)[1];
const nextVersion = (await readFile(resolve(root, "assets/offline-assets.js"), "utf8")).match(/version: "([^"]+)"/)[1];
assert.notEqual(previousVersion, nextVersion, "Regenerate the offline manifest; choose a revision preceding this release.");
const exerciseMarkup = html => new DOMParser().parseFromString(html, "text/html").querySelector("#teacher-adverbs")?.outerHTML ?? null;
const currentExercise = () => { const node = document.querySelector("#teacher-adverbs").cloneNode(true); node.querySelectorAll(".internet-required").forEach(note => note.remove()); return node.outerHTML; };
let serveNew = false;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer(async (request, response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (!requested.startsWith("/jpy5/")) return response.writeHead(404).end();
    const file = requested.slice("/jpy5/".length) || "index.html";
    const path = resolve(root, file);
    if (!path.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
    response.end(!serveNew && oldFiles.has(file) ? oldFiles.get(file) : await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}/jpy5/`;
const browser = await chromium.launch({ headless: true, ...(process.env.JPY5_BROWSER_CHANNEL ? { channel: process.env.JPY5_BROWSER_CHANNEL } : {}) });
const context = await browser.newContext();
const page = await context.newPage();
try {
  await page.goto(`${base}chapter-13-vocabulary.html`);
  // pwa.js reloads on controllerchange after the initial activation. Wait for
  // that transition rather than racing it with a second explicit reload.
  await page.waitForFunction(() => performance.getEntriesByType("navigation")[0]?.type === "reload" && navigator.serviceWorker.controller && document.querySelector(".pwa-status")?.dataset.state === "ready", null, { timeout: 60000 });
  const previousExercise = await page.evaluate(exerciseMarkup, oldFiles.get("chapter-13-vocabulary.html").toString());
  assert.equal(await page.evaluate(currentExercise), previousExercise, "Initial page must match the previous published revision.");
  await page.evaluate(() => {
    localStorage.setItem("jpy5.chapter14.teacherUpdateSentinel", JSON.stringify({ attempts: 3, starred: ["keep"] }));
    localStorage.setItem("jpy5.chapter20.teacherUpdateSentinel", "retained");
  });
  serveNew = true;
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.waitForFunction(() => document.querySelector(".pwa-offline-dialog") || document.querySelector(".pwa-update"), null, { timeout: 60000 });
  if (await page.locator(".pwa-update").count()) await page.locator(".pwa-update button").first().click();
  await page.waitForFunction(() => document.querySelector(".pwa-status")?.dataset.state === "online", null, { timeout: 60000 });
  await page.locator(".pwa-status").click();
  await page.locator("[data-offline-download]").click();
  await page.waitForFunction(() => document.querySelector(".pwa-status")?.dataset.state === "ready", null, { timeout: 60000 });
  await page.locator("[data-offline-close]").click();
  await page.locator("#teacher-adverbs").waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("jpy5.chapter14.teacherUpdateSentinel")), '{"attempts":3,"starred":["keep"]}');
  assert.equal(await page.evaluate(() => localStorage.getItem("jpy5.chapter20.teacherUpdateSentinel")), "retained");
  await context.setOffline(true);
  for (let lesson = 13; lesson <= 20; lesson++) {
    await page.goto(`${base}chapter-${lesson}-vocabulary.html`);
    assert.equal(await page.locator("#teacher-adverbs .adverb-lesson-nav a").count(), 8, `Lesson ${lesson} missing from updated offline cache`);
    const expected = await page.evaluate(exerciseMarkup, await readFile(resolve(root, `chapter-${lesson}-vocabulary.html`), "utf8"));
    assert.equal(await page.evaluate(currentExercise), expected, `Lesson ${lesson}: offline content must match the corrected release`);
    const first = page.locator("#teacher-adverbs [data-answer-toggle]").first();
    const answerId = await first.getAttribute("aria-controls");
    await first.click();
    assert.equal(await page.locator(`#${answerId}`).isVisible(), true, `Lesson ${lesson}: offline answer control`);
    await first.click();
  }
  console.log(`Installed-app update passed: ${previousVersion} → ${nextVersion}; all eight adverb supplements work offline and learner records remain intact.`);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
