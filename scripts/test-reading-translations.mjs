#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import vm from "node:vm";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd();
const lessons = [
  { number: 13, data: "assets/reading-data.js" },
  ...[14, 15, 16, 17, 18, 19, 20].map(number => ({ number, data: `assets/ch${number}-reading-data.js` })),
];

for (const lesson of lessons) {
  const context = { window: {} };
  vm.runInNewContext(await readFile(resolve(root, lesson.data), "utf8"), context);
  lesson.paragraphs = Array.from(context.window.JPY5_READING.paragraphs, paragraph => ({ jp: paragraph.jp, zh: paragraph.zh }));
  assert(lesson.paragraphs.every(paragraph => paragraph.jp && paragraph.zh), `Lesson ${lesson.number} bilingual source data`);
}

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
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.JPY5_BROWSER_CHANNEL ? { channel: process.env.JPY5_BROWSER_CHANNEL } : {}) });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  for (const lesson of lessons) {
    await page.goto(`${base}/chapter-${lesson.number}-reading.html`);
    await page.locator('[data-reading-mode="translation"]').click();
    assert.equal(await page.locator('[data-reading-mode="translation"]').evaluate(node => node.classList.contains("active")), true, `Lesson ${lesson.number} tab active`);
    assert.equal(await page.locator(".translation-list article").count(), lesson.paragraphs.length, `Lesson ${lesson.number} translation count`);
    assert.equal(await page.locator(".translation-list .translation-original").count(), lesson.paragraphs.length, `Lesson ${lesson.number} original count`);
    const originals = await page.locator(".translation-list .translation-original").evaluateAll(nodes => nodes.map(node => {
      const copy = node.cloneNode(true);
      copy.querySelectorAll("rt").forEach(rt => rt.remove());
      return copy.textContent.trim();
    }));
    assert.deepEqual(originals, lesson.paragraphs.map(paragraph => paragraph.jp), `Lesson ${lesson.number} original text`);
    assert.match(await page.locator("#reading-stage").innerText(), /完整日文原文/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 ? [] : Array.from(document.querySelectorAll("body *")).filter(node => {
      if (node.closest(".mode-tabs, .lesson-pills")) return false;
      const rect = node.getBoundingClientRect();
      return rect.right > innerWidth + 1 || rect.left < -1;
    }).map(node => `${node.tagName.toLowerCase()}.${node.className || ""}:${Math.round(node.getBoundingClientRect().right)}`).slice(0, 12));
    assert.deepEqual(overflow, [], `Lesson ${lesson.number} mobile overflow: ${overflow.join(", ")}`);
    if (lesson.number === 20) await page.screenshot({ path: resolve("tmp/reading-translation-20-mobile.png"), fullPage: true });
  }
  assert.deepEqual(errors, [], errors.join("\n"));
  console.log("Reading translation originals passed for Lessons 13–20.");
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
