#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import vm from "node:vm";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd();
const contextData = { window: {} };
vm.runInNewContext(await readFile(resolve(root, "assets/conversation-data.js"), "utf8"), contextData);
const data = contextData.window.JPY5_CONVERSATION;
assert.equal(data.items.length, 5, "the five existing focus/cloze items changed");
assert.deepEqual(Array.from(data.items, item => item.id), [1, 2, 3, 4, 5]);
assert.equal(data.comprehension.length, 7, "the existing seven comprehension questions changed");
assert.equal(data.dialogue.length, 21, "the complete dialogue changed");
assert.deepEqual(Array.from(data.textbook.activities, activity => activity.title), ["1. やってみよう", "5. 練習しよう", "6. チャレンジしよう"]);
assert.equal(data.textbook.listenQuestions.length, 7);
assert.deepEqual(Array.from(data.textbook.listenQuestions.slice(0, 3), q => q.answer), [
  "4つ",
  "人に親切にしたら、あとでいいことが自分に返ってくる。親切は人のためだけじゃない。",
  "「辛党」は「甘党」の反対だと思っていた。"
]);
assert.equal(data.textbook.listenQuestions[4].answer, "ことわざで思い出したけど、この前、太郎…");
assert.equal(data.textbook.listenQuestions[4].sourceNote, "※ 解答冊表記。會話本文／3. もう一度聞こうでは『ことわざで思い出したんだけど』。");

const types = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".png":"image/png", ".webmanifest":"application/manifest+json" };
const server = createServer(async (request, response) => {
  try {
    const path = resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
    if (!path.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
    response.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, ...(process.env.JPY5_BROWSER_CHANNEL ? { channel:process.env.JPY5_BROWSER_CHANNEL } : {}) });
const browserContext = await browser.newContext({ serviceWorkers:"block" });
const page = await browserContext.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  for (const [viewportIndex, viewport] of [{width:1280,height:900},{width:810,height:1080},{width:390,height:844}].entries()) {
    await page.setViewportSize(viewport);
    await page.goto(`${base}/chapter-13-textbook.html`);
    await page.waitForTimeout(100);
    if (viewportIndex === 0) assert.equal(await page.locator('[data-mode="dialogue"]').evaluate(button => button.classList.contains("active")), true, "complete dialogue is not the fresh default tab");
    else await page.locator('[data-mode="dialogue"]').click();
    assert.equal(await page.locator(".dialogue-row").count(), 21);
    await page.locator("[data-shadow-start]").click();
    assert.equal(await page.locator(".shadowing-panel").count(), 1);
    await page.locator('[data-shadow-nav="next"]').click();
    assert.match(await page.locator(".shadowing-head span").innerText(), /\d+\/21/);

    await page.locator('[data-mode="comprehension"]').click();
    assert.equal(await page.locator("[data-comprehension]").count(), 7);
    assert.equal(await page.locator(".textbook-answer-card").count(), 7);
    assert.equal(await page.locator(".reference-answer:not([hidden])").count(), 0, "official answers should start hidden");
    await page.locator('[data-reveal="tb-l1"]').click();
    assert.equal(await page.locator('[data-answer-panel="tb-l1"]').isVisible(), true);
    await page.locator('[data-reveal="tb-e2"]').click();
    assert.match(await page.locator('[data-answer-panel="tb-e2"]').innerText(), /解答冊表記。會話本文／3\. もう一度聞こう/);
    await page.locator('[data-draft="tb-l1"]').fill(`四つだと思います ${viewport.width}`);
    await page.locator('[data-mode="dialogue"]').click();
    await page.locator('[data-mode="comprehension"]').click();
    assert.equal(await page.locator('[data-draft="tb-l1"]').inputValue(), `四つだと思います ${viewport.width}`);

    await page.locator('[data-mode="activities"]').click();
    assert.equal(await page.locator(".textbook-activity-card").count(), 3);
    assert.equal(await page.locator(".textbook-task-card").count(), 10);
    assert.equal(await page.locator(".reference-answer:not([hidden])").count(), 0, "activity examples should start hidden");
    assert.equal(await page.locator("[data-reveal]").first().innerText(), "參考回答例を見る");
    await page.locator('[data-draft="try-1"]').fill(`ことわざの下書き ${viewport.width}`);
    await page.locator("#furigana-toggle").click();
    assert.equal(await page.locator('[data-draft="try-1"]').inputValue(), `ことわざの下書き ${viewport.width}`);
    await page.locator('[data-reveal="practice-1a"]').click();
    assert.match(await page.locator('[data-answer-panel="practice-1a"] b').innerText(), /課本解答例/);
    await page.locator('[data-reveal="challenge-1"]').click();
    assert.match(await page.locator('[data-answer-panel="challenge-1"] b').innerText(), /非課本官方答案/);

    await page.locator('[data-mode="cloze"]').click();
    assert.equal(await page.locator(".source-status-line").innerText(), "課本 3. もう一度聞こう");
    assert.equal(await page.locator("[data-cloze]").count(), 5);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `horizontal overflow at ${viewport.width}px`);
  }

  await page.goto(`${base}/chapter-13-textbook.html`);
  await page.locator('[data-mode="comprehension"]').click();
  await page.locator('[data-comprehension="c1"] [data-comprehension-answer="2"]').click();
  await page.reload();
  await page.locator('[data-mode="comprehension"]').click();
  assert.equal(await page.locator('[data-comprehension="c1"] button.correct').count(), 1, "existing comprehension progress did not persist");
  assert.deepEqual(errors, [], errors.join("\n"));
  console.log("Lesson 13 listening checks passed for data integrity, saved drafts, hidden answers, shadowing, and desktop/iPad/mobile layouts.");
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
