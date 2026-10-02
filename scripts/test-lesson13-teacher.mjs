import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd();
const artifacts = resolve("tmp/lesson13-teacher-browser");
await mkdir(artifacts, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer(async (request, response) => {
  try {
    const path = resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
    if (!path.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
    response.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolveListen => server.listen(0, "127.0.0.1", resolveListen));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.JPY5_BROWSER_CHANNEL ? { channel: process.env.JPY5_BROWSER_CHANNEL } : {}) });
const context = await browser.newContext({ serviceWorkers: "block" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 810, height: 1080 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const file of ["chapter-13-vocabulary.html", "chapter-13-review.html"]) {
      await page.goto(`${base}/${file}`);
      await page.waitForLoadState("domcontentloaded");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${file} overflows at ${viewport.width}px`);
      for (const theme of ["light", "dark"]) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${file} ${theme} theme overflows at ${viewport.width}px`);
      }
      assert.equal(await page.locator(".teacher-answer:not([hidden])").count(), 0, `${file} exposes an answer initially`);
      await page.locator("details.teacher-exercise").evaluateAll(details => details.forEach(detail => { detail.open = true; }));
      const buttons = page.locator("[data-answer-toggle]");
      for (let i = 0; i < await buttons.count(); i += 1) {
        const button = buttons.nth(i);
        const target = page.locator(`#${await button.getAttribute("aria-controls")}`);
        await button.click({ force: true });
        assert.equal(await target.getAttribute("hidden"), null, "answer did not reveal");
        await button.click({ force: true });
        assert.notEqual(await target.getAttribute("hidden"), null, "answer did not hide again");
      }
      await page.screenshot({ path: `${artifacts}/${file.replace(".html", "")}-${viewport.width}.png`, fullPage: true });
    }
  }

  await page.goto(`${base}/chapter-13-vocabulary.html`);
  assert.match(await page.locator(".vocab-summary").innerText(), /159/);
  assert.equal(await page.locator("#teacher-adverbs .teacher-adverb-card").count(), 4);
  assert.equal(await page.locator("#teacher-adverbs [data-answer-toggle]").count(), 2);

  await page.goto(`${base}/chapter-13-review.html`);
  assert.equal(await page.locator("#teacher-exercise details.teacher-exercise").count(), 3);
  assert.equal(await page.locator("#teacher-exercise [data-answer-toggle]").count(), 11);
  assert.equal(Array.from("月ごとの約束、あるいは計算で契約すること").length, 20);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("Lesson 13 teacher supplement browser checks passed.");
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
