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
  { number: 13, data: "assets/conversation-data.js" },
  ...[14, 15, 16, 17, 18, 19, 20].map(number => ({ number, data: `assets/ch${number}-conversation-data.js` })),
];

for (const lesson of lessons) {
  const context = { window: {} };
  vm.runInNewContext(await readFile(resolve(root, lesson.data), "utf8"), context);
  lesson.count = context.window.JPY5_CONVERSATION.dialogue.length;
  assert.equal(context.window.JPY5_CONVERSATION.translation.length, lesson.count, `Lesson ${lesson.number} translation count`);
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
    await page.goto(`${base}/chapter-${lesson.number}-textbook.html`);
    await page.locator('[data-mode="translation"]').click();
    assert.equal(await page.locator('[data-mode="translation"]').evaluate(node => node.classList.contains("active")), true, `Lesson ${lesson.number} tab active`);
    assert.equal(await page.locator(".translation-list .dialogue-row").count(), lesson.count, `Lesson ${lesson.number} rendered translation count`);
    assert.equal(await page.locator(".translation-list .translation-original").count(), lesson.count, `Lesson ${lesson.number} rendered original count`);
    const originals = await page.locator(".translation-list .translation-original").evaluateAll(nodes => nodes.map(node => node.textContent.trim()));
    assert(originals.every(text => text && !/[＿①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬]/.test(text)), `Lesson ${lesson.number} originals must be complete`);
    assert.match(await page.locator("#conversation-stage, #lesson-stage").first().innerText().catch(() => page.locator(".conversation-stage").innerText()), /全文中文翻譯/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Lesson ${lesson.number} mobile overflow`);
    if (lesson.number === 20) await page.screenshot({ path: resolve("tmp/listening-translation-20-mobile.png"), fullPage: true });
  }
  assert.deepEqual(errors, [], errors.join("\n"));
  console.log("Listening translation tabs passed for Lessons 13–20.");
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
