#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import vm from "node:vm";
const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd();
const native = process.env.JPY5_NATIVE_LISTENING_AUDIO === "1";
const selected = process.env.JPY5_LISTENING_LESSONS?.split(",").map(Number);
const lessons = [];
for (let number = 13; number <= 20; number++) {
  if (selected && !selected.includes(number)) continue;
  const context = { window: {} };
  vm.runInNewContext(await readFile(`assets/${number === 13 ? "" : `ch${number}-`}conversation-data.js`, "utf8"), context);
  const data = context.window.JPY5_CONVERSATION;
  const targets = Array.from(data.listeningTargets || data.items, t => ({ id: t.id, start: t.start, end: t.end }));
  assert(targets.every(t => Number.isFinite(t.start) && Number.isFinite(t.end) && t.start >= 0 && t.end > t.start));
  lessons.push({ number, targets });
}
const server = createServer(async (request, response) => {
  try {
    const path = resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
    if (!path.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
    response.setHeader("Content-Type", ({ ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json" })[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const browser = await chromium.launch({ headless: true, channel: process.env.JPY5_BROWSER_CHANNEL || "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
if (!native) {
  await page.route("https://ttrw.jp/static/sound/**", route => route.abort());
  await page.addInitScript(() => {
    const states = new WeakMap();
    const state = audio => {
      if (!states.has(audio)) states.set(audio, { time: 0, paused: true });
      return states.get(audio);
    };
    Object.defineProperty(HTMLMediaElement.prototype, "currentTime", { get() { return state(this).time; }, set(value) { state(this).time = value; } });
    Object.defineProperty(HTMLMediaElement.prototype, "paused", { get() { return state(this).paused; } });
    HTMLMediaElement.prototype.load = function() {};
    HTMLMediaElement.prototype.pause = function() {
      state(this).paused = true;
      setTimeout(() => this.dispatchEvent(new Event("pause")), 0);
    };
    HTMLMediaElement.prototype.play = function() {
      state(this).paused = false;
      this.dispatchEvent(new Event("play"));
      if (window.deferNextPlay) {
        window.deferNextPlay = false;
        return new Promise((resolve, reject) => { window.rejectOldPlay = reject; });
      }
      return Promise.resolve();
    };
  });
}
try {
  for (const lesson of lessons) {
    await page.goto(`http://127.0.0.1:${server.address().port}/chapter-${lesson.number}-textbook.html`, { waitUntil: native ? "domcontentloaded" : "load" });
    await page.locator('[data-mode="focus"]').click();
    const audio = page.locator("#lesson-audio");
    const button = id => page.locator(`#conversation-stage [data-listen="${id}"], #conversation-stage [data-listen-target="${id}"]`).first();
    for (const range of lesson.targets) {
      await button(range.id).click();
      if (native) {
        await page.waitForFunction(start => {
          const audio = document.querySelector("#lesson-audio");
          return audio.readyState >= 2 && Number.isFinite(audio.duration) && !audio.paused && !audio.seeking && audio.currentTime >= start && audio.currentTime < start + 0.5;
        }, range.start);
        assert(range.end <= await audio.evaluate(node => node.duration));
        await audio.evaluate((node, end) => { node.currentTime = end - Math.min(0.08, (end - node.currentTime) / 2); }, range.end);
        await page.waitForFunction(() => document.querySelector("#lesson-audio").paused);
        assert(Math.abs(await audio.evaluate(node => node.currentTime) - range.end) < 0.06, `L${lesson.number} #${range.id} native stop`);
      } else {
        assert.equal(await audio.evaluate(node => node.currentTime), range.start);
        await audio.evaluate((node, end) => { node.currentTime = end - 0.01; node.dispatchEvent(new Event("timeupdate")); }, range.end);
        assert.equal(await audio.evaluate(node => node.paused), false);
        await audio.evaluate((node, end) => { node.currentTime = end + 0.1; node.dispatchEvent(new Event("timeupdate")); }, range.end);
        assert.equal(await audio.evaluate(node => node.paused), true);
        assert.equal(await audio.evaluate(node => node.currentTime), range.end);
      }
    }
    // A later sentence must survive both the old stop condition and a late
    // rejection from the earlier play request.
    if (!native) await page.evaluate(() => { window.deferNextPlay = true; });
    await button(lesson.targets[0].id).click();
    const last = lesson.targets.at(-1);
    await button(last.id).click();
    if (!native) await page.evaluate(() => window.rejectOldPlay(new Error("Canceled earlier request")));
    await page.waitForFunction(start => {
      const audio = document.querySelector("#lesson-audio");
      return !audio.paused && audio.currentTime >= start;
    }, last.start);
    await audio.evaluate(node => node.dispatchEvent(new Event("timeupdate")));
    assert.equal(await audio.evaluate(node => node.paused), false, "Earlier stop must not stop a later sentence");
    await audio.dispatchEvent("pointerdown");
    await audio.evaluate((node, end) => { node.currentTime = end + 0.5; node.dispatchEvent(new Event("timeupdate")); }, last.end);
    assert.equal(await audio.evaluate(node => node.paused), false, "Native controls leave sentence replay mode");
    await audio.evaluate(node => node.pause());
    console.log(`Lesson ${lesson.number}: ${lesson.targets.length} sentence ranges and replay switching passed (${native ? "original MP3" : "controlled media"}).`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
