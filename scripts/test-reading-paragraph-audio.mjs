#!/usr/bin/env node
// Native media smoke test. JPY5_READING_AUDIO_DIR can supply downloaded official
// tracks named 13.mp3 ... 20.mp3; otherwise this uses the original remote URLs.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import vm from "node:vm";
const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd();
const context = { window: {} };
vm.runInNewContext(await readFile("assets/reading-paragraph-audio-data.js", "utf8"), context);
const timings = context.window.JPY5_READING_PARAGRAPH_AUDIO;
const selectedLessons = process.env.JPY5_READING_LESSONS?.split(",");
const server = createServer(async (request, response) => {
  try {
    const path = resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
    if (!path.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
    response.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" })[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const browser = await chromium.launch({ headless: true, channel: process.env.JPY5_BROWSER_CHANNEL || "chrome" });
const page = await browser.newPage({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
try {
  for (const [lesson, timing] of Object.entries(timings)) {
    if (selectedLessons && !selectedLessons.includes(lesson)) continue;
    if (process.env.JPY5_READING_AUDIO_DIR) {
      const bytes = await readFile(resolve(process.env.JPY5_READING_AUDIO_DIR, `${lesson}.mp3`));
      await page.route(timing.src, route => {
        const range = route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
        const start = range ? Number(range[1]) : 0;
        const end = range?.[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
        return route.fulfill({ status: range ? 206 : 200, contentType: "audio/mpeg", body: bytes.subarray(start, end + 1), headers: {
          "accept-ranges": "bytes", "content-length": String(end - start + 1),
          ...(range ? { "content-range": `bytes ${start}-${end}/${bytes.length}` } : {}),
        } });
      });
    }
    await page.goto(`http://127.0.0.1:${server.address().port}/chapter-${lesson}-reading.html`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-reading-mode="translation"]').click();
    const clip = page.locator("[data-reading-paragraph-audio]");
    await page.locator(`[data-reading-play="${timing.paragraphs[0].id}"]`).click();
    await page.waitForFunction(() => document.querySelector("[data-reading-paragraph-audio]")?.readyState >= 1).catch(async error => {
      console.log(await page.locator("audio").evaluateAll(nodes => nodes.map(audio => ({ src: audio.src, readyState: audio.readyState, networkState: audio.networkState, error: audio.error?.message }))));
      throw error;
    });
    assert(Math.abs(await clip.evaluate(audio => audio.duration) - timing.duration) < 0.15, `Lesson ${lesson}: original track duration`);
    for (const [index, range] of timing.paragraphs.entries()) {
      const button = page.locator(`[data-reading-play="${range.id}"]`);
      if (index) await button.click();
      await page.waitForFunction(start => {
        const audio = document.querySelector("[data-reading-paragraph-audio]");
        return !audio.paused && !audio.seeking && audio.currentTime >= start && audio.currentTime < start + 2;
      }, range.start).catch(async error => {
        console.log({ lesson, range, button: await button.innerText(), title: await button.getAttribute("title"), audio: await clip.evaluate(audio => ({ currentTime: audio.currentTime, paused: audio.paused, seeking: audio.seeking, readyState: audio.readyState, error: audio.error?.message, hidden: document.hidden })) });
        throw error;
      });
      assert.equal(await button.getAttribute("aria-pressed"), "true");
      await clip.evaluate((audio, end) => { audio.currentTime = end - 0.15; }, range.end);
      await page.waitForFunction(() => document.querySelector("[data-reading-paragraph-audio]").paused);
      assert.equal(await button.getAttribute("aria-pressed"), "false");
      assert(Math.abs(await clip.evaluate(audio => audio.currentTime) - range.end) < 0.05, `Lesson ${lesson} paragraph ${range.id}: stops at end`);
    }
    console.log(`Lesson ${lesson}: ${timing.paragraphs.length} paragraphs seek and stop on original audio.`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
