#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import vm from "node:vm";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd();
const selectedLessons = process.env.JPY5_READING_LESSONS?.split(",").map(Number);
const lessons = [
  { number: 13, data: "assets/reading-data.js" },
  ...[14, 15, 16, 17, 18, 19, 20].map(number => ({ number, data: `assets/ch${number}-reading-data.js` })),
].filter(lesson => !selectedLessons || selectedLessons.includes(lesson.number));

for (const lesson of lessons) {
  const context = { window: {} };
  vm.runInNewContext(await readFile(resolve(root, lesson.data), "utf8"), context);
  lesson.paragraphs = Array.from(context.window.JPY5_READING.paragraphs, paragraph => ({ jp: paragraph.jp, zh: paragraph.zh }));
  assert(lesson.paragraphs.every(paragraph => paragraph.jp && paragraph.zh), `Lesson ${lesson.number} bilingual source data`);
}
const timingContext = { window: {} };
vm.runInNewContext(await readFile(resolve(root, "assets/reading-paragraph-audio-data.js"), "utf8"), timingContext);
for (const lesson of lessons) {
  lesson.timing = JSON.parse(JSON.stringify(timingContext.window.JPY5_READING_PARAGRAPH_AUDIO[lesson.number]));
  assert.equal(lesson.timing.paragraphs.length, lesson.paragraphs.length);
  for (const [index, range] of lesson.timing.paragraphs.entries()) {
    assert.equal(range.id, index + 1);
    assert(lesson.paragraphs[index].jp.startsWith(range.startText) && lesson.paragraphs[index].jp.endsWith(range.endText), "Audio ranges match paragraph text");
    assert(range.start >= 0 && range.end > range.start && range.end <= lesson.timing.duration);
    if (index) assert(range.start >= lesson.timing.paragraphs[index - 1].end, "Paragraph audio ranges must not overlap");
  }
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
await page.addInitScript(() => {
  window.SpeechSynthesisUtterance = class { constructor() { throw new Error("Paragraph playback must use original audio"); } };
  const states = new WeakMap();
  const state = audio => {
    if (!states.has(audio)) states.set(audio, { time: 0, paused: true, plays: 0 });
    return states.get(audio);
  };
  Object.defineProperty(HTMLMediaElement.prototype, "currentTime", { get() { return state(this).time; }, set(value) { state(this).time = value; } });
  Object.defineProperty(HTMLMediaElement.prototype, "paused", { get() { return state(this).paused; } });
  HTMLMediaElement.prototype.play = function() {
    state(this).paused = false;
    state(this).plays++;
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  };
  HTMLMediaElement.prototype.pause = function() { state(this).paused = true; };
  HTMLMediaElement.prototype.load = function() {};
});
await page.route("https://ttrw.jp/static/sound/**", route => route.abort());

try {
  for (const lesson of lessons) {
    await page.goto(`${base}/chapter-${lesson.number}-reading.html`);
    await page.locator('[data-reading-mode="original"]').click();
    assert.equal(await page.locator(".reading-paper [data-reading-play]").count(), lesson.paragraphs.length);
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
    assert(await page.locator(".translation-original rt").count() > 0, `Lesson ${lesson.number} furigana shown`);
    await page.locator("#furigana-toggle").click();
    assert.equal(await page.locator(".translation-original rt").count(), 0);
    await page.locator("#furigana-toggle").click();
    const play = page.locator(".translation-list [data-reading-play]");
    assert.equal(await play.count(), lesson.paragraphs.length);
    await play.nth(0).click();
    assert.equal(await play.nth(0).getAttribute("aria-pressed"), "true");
    const clip = page.locator("audio[data-reading-paragraph-audio]");
    assert.equal(await clip.getAttribute("src"), lesson.timing.src);
    assert.equal(await clip.evaluate(audio => audio.currentTime), lesson.timing.paragraphs[0].start);
    await play.nth(1).click();
    assert.equal(await play.nth(0).getAttribute("aria-pressed"), "false");
    assert.equal(await play.nth(1).getAttribute("aria-pressed"), "true");
    assert.equal(await clip.evaluate(audio => audio.currentTime), lesson.timing.paragraphs[1].start);
    await play.nth(1).click();
    assert.equal(await play.nth(1).getAttribute("aria-pressed"), "false");
    assert.equal(await clip.evaluate(audio => audio.paused), true);
    for (const [index, range] of lesson.timing.paragraphs.entries()) {
      await play.nth(index).click();
      assert.equal(await clip.evaluate(audio => audio.currentTime), range.start);
      await clip.evaluate((audio, end) => {
        audio.currentTime = end - 0.2;
        audio.dispatchEvent(new Event("timeupdate"));
      }, range.end);
      assert.equal(await play.nth(index).getAttribute("aria-pressed"), "true");
      await clip.evaluate((audio, end) => {
        audio.currentTime = end + 0.1;
        audio.dispatchEvent(new Event("timeupdate"));
      }, range.end);
      assert.equal(await play.nth(index).getAttribute("aria-pressed"), "false");
      assert.equal(await clip.evaluate(audio => audio.paused), true);
      assert.equal(await clip.evaluate(audio => audio.currentTime), range.end);
    }
    await play.nth(0).click();
    await page.locator("#furigana-toggle").click();
    assert.equal(await clip.evaluate(audio => audio.paused), true, "Rerender stops paragraph playback");
    await play.nth(0).click();
    await page.evaluate(() => document.querySelector(".reading-audio-workspace audio").play());
    assert.equal(await play.nth(0).getAttribute("aria-pressed"), "false", "Full audio stops paragraph audio");
    assert.equal(await page.locator('[data-reading-play][aria-pressed="true"]').count(), 0);
    assert.equal(await clip.evaluate(audio => audio.paused), true);
    await page.locator("#furigana-toggle").click();
    await play.nth(0).click();
    await clip.evaluate(audio => audio.dispatchEvent(new Event("error")));
    assert.equal(await play.nth(0).innerText(), "↻ 重試播放");
    assert.equal(await clip.evaluate(audio => audio.paused), true, "Failed audio can be retried");
    await play.nth(0).click();
    await page.locator('[data-reading-mode="original"]').click();
    assert.equal(await clip.evaluate(audio => audio.paused), true, "Tab change stops paragraph playback");
    await page.locator('[data-reading-mode="translation"]').click();
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
  console.log(`Reading furigana and original-track paragraph playback passed for lessons ${lessons.map(lesson => lesson.number).join(", ")}.`);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
