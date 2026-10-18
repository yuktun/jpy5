// Compare the working tree to a previous published Git revision and exercise
// the actual service-worker update, learner-data retention, and offline pages.
// Defaults to the published revision preceding public lesson 14 adverbs.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd(), previousRef = process.env.JPY5_PREVIOUS_REF || "2cb386d9fe158d8ccc18b6d43c3f09d93afd8fee";
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
const browser = await chromium.launch({ headless: true, channel: process.env.JPY5_BROWSER_CHANNEL || 'msedge' });
const context = await browser.newContext();
await context.route('https://**/*',route=>route.abort());
const page = await context.newPage();
try {
  await page.goto(`${base}chapter-13-vocabulary.html`);
  await page.waitForFunction(() => navigator.serviceWorker.controller && document.querySelector('.pwa-status')?.dataset.state === 'online');
  await page.locator('.pwa-status').click();
  await page.locator('[data-offline-download]').click();
  await page.waitForFunction(() => document.querySelector('.pwa-status')?.dataset.state === 'ready', null, {timeout:90000});
  await page.locator('[data-offline-close]').click();
  const previousExercise = await page.evaluate(exerciseMarkup, oldFiles.get("chapter-13-vocabulary.html").toString());
  assert.equal(await page.evaluate(currentExercise), previousExercise, "Initial page must match the previous published revision.");
  await page.goto(`${base}chapter-14-vocabulary.html`);
  assert.equal(await page.locator('[data-teacher-content]').textContent(),'');
  assert.equal(await page.locator('.teacher-adverb-card').count(),0);
  await page.evaluate(() => {
    localStorage.setItem("jpy5.chapter14.teacherUpdateSentinel", JSON.stringify({ attempts: 3, starred: ["keep"] }));
    localStorage.setItem("jpy5.chapter20.teacherUpdateSentinel", "retained");
  });
  serveNew = true;
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.waitForFunction(() => document.querySelector('[data-offline-download]')?.hidden === false, null, {timeout:60000});
  // A detected version never replaces the installed package without consent.
  assert.equal(await page.locator('.teacher-adverb-card').count(),0);
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
    if(lesson===14){
      assert.equal(await page.locator('#teacher-adverbs').evaluate(node=>node.open),false);
      assert.equal(await page.locator('[data-teacher-content],[data-teacher-login]').count(),0);
      await page.locator('#teacher-adverbs > summary').click();
      assert.equal(await page.locator('.teacher-adverb-card').count(),4);
      assert.equal(await page.locator('.adverb-ja').count(),8);
      assert.equal(await page.locator('.teacher-question-list > li').count(),7);
    }
    assert.equal(await page.locator("#teacher-adverbs .adverb-lesson-nav a").count(), 8, `Lesson ${lesson} missing from updated offline cache`);
    const expected = await page.evaluate(exerciseMarkup, await readFile(resolve(root, `chapter-${lesson}-vocabulary.html`), "utf8"));
    if(lesson===14)await page.locator('#teacher-adverbs > summary').click();
    assert.equal(await page.evaluate(currentExercise), expected, `Lesson ${lesson}: offline content must match the corrected release`);
    if(lesson===14)await page.locator('#teacher-adverbs > summary').click();
    const first = page.locator("#teacher-adverbs [data-answer-toggle]").first();
    const answerId = await first.getAttribute("aria-controls");
    await first.click();
    assert.equal(await page.locator(`#${answerId}`).isVisible(), true, `Lesson ${lesson}: offline answer control`);
    await first.click();
  }
  const cold=await context.newPage();
  await cold.goto(`${base}chapter-14-vocabulary.html`);
  assert.equal(await cold.locator('#teacher-adverbs').evaluate(node=>node.open),false);
  await cold.locator('#teacher-adverbs > summary').click();
  await cold.locator('#teacher-adverbs [data-answer-toggle]').first().click();
  assert.equal(await cold.locator('#adverb-answer-1').isVisible(),true);
  await cold.goto(`${base}chapter-14-notes.html`);
  assert.equal(await cold.locator('[data-teacher-demo-content]').count(),11);
  assert((await cold.locator('[data-teacher-demo-content]').allTextContents()).every(text=>text===''));
  console.log(`Installed-app update passed: ${previousVersion} → ${nextVersion}; all eight adverb supplements work offline and learner records remain intact.`);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
