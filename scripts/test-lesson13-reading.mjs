#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import vm from "node:vm";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd();
const artifacts = resolve("tmp/lesson13-reading-browser");
await mkdir(artifacts, { recursive: true });

const dataContext = { window: {} };
vm.runInNewContext(await readFile(resolve(root, "assets/reading-data.js"), "utf8"), dataContext);
const data = dataContext.window.JPY5_READING;
assert.equal(data.questions.length, 13, "the mock exam must retain all 13 questions");
assert.deepEqual(Array.from(data.questions, question => question.id), Array.from({ length: 13 }, (_, index) => `q${index + 1}`), "mock-exam question IDs changed");
assert.equal(data.textbookExercises.sections.length, 4);
assert.deepEqual(Array.from(data.textbookExercises.sections[0].items, item => item.answer), ["4", "3", "1", "2", "5"]);
assert.deepEqual(Array.from(data.textbookExercises.sections[1].items, item => Array.from(item.answers)), [
  ["時間がかかる"],
  ["辞書", "駐車場（パーキング）"],
  ["見つからなかった（出ていなかった）"],
  ["月決め", "目に入った"],
  ["ゲッキョクとは読まない"]
]);
assert.equal(data.textbookActivities.length, 2);
assert.deepEqual(Array.from(data.textbookActivities, activity => `${activity.number}. ${activity.title}`), ["4. 考えよう・話そう", "5. チャレンジしよう"]);
assert.equal(data.textbookActivities[0].items[0].prompt, "あなたにとって日本語を勉強していて、\nいちばん難しいと思うことは何ですか。");
assert.equal(data.textbookActivities[0].items[1].readings.length, 11);
assert.match(data.textbookActivities[0].items[1].note, /正解一覧ではなく学習用の代表例/);
assert.equal(data.textbookActivities[1].items[0].modelAnswers.length, 3);

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
const context = await browser.newContext({ serviceWorkers: "block" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));

try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 810, height: 1080 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto(`${base}/chapter-13-reading.html`);
    await page.locator('[data-reading-mode="questions"]').click();
    assert.equal(await page.locator(".reading-stage-head h2").innerText(), "課本「読む・書く」原題");
    assert.equal(await page.locator(".textbook-activity-group").count(), 3);
    assert.equal(await page.locator(".textbook-exercise").count(), 4);
    assert.equal(await page.locator(".textbook-activity-card").count(), 3);
    assert.equal(await page.locator(".textbook-answer:not([hidden])").count(), 0, "answers must start hidden");
    assert.equal(await page.locator(".textbook-model-answer:not([hidden])").count(), 0, "reference examples must start hidden");
    assert.equal(await page.locator("[data-q]").count(), 0, "legacy scored questions leaked into textbook mode");
    assert.equal(await page.locator(".textbook-completion-list input").count(), 7);
    assert.equal(await page.locator("textarea[data-textbook-draft]").count(), 6);
    assert.equal(await page.locator("[data-textbook-model-toggle]").count(), 3);
    assert.equal(await page.getByText("課本第 3 頁的原題", { exact: false }).count(), 0);
    assert.equal(await page.locator(".textbook-model-answer>span").evaluateAll(labels => labels.every(label => label.textContent === "參考回答例")), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `reading exercises overflow at ${viewport.width}px`);

    const toggles = page.locator("[data-textbook-answer-toggle]");
    for (let index = 0; index < await toggles.count(); index += 1) {
      const toggle = toggles.nth(index);
      const answer = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
      await toggle.click();
      assert.equal(await answer.isVisible(), true);
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      await toggle.click();
      assert.equal(await answer.isHidden(), true);
    }
    const modelToggles = page.locator("[data-textbook-model-toggle]");
    for (let index = 0; index < await modelToggles.count(); index += 1) {
      const toggle = modelToggles.nth(index);
      const answer = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
      assert.equal(await toggle.innerText(), "參考回答例を見る");
      await toggle.click();
      assert.equal(await answer.isVisible(), true);
      await toggle.click();
      assert.equal(await answer.isHidden(), true);
    }

    const rubyCount = await page.locator(".textbook-exercise ruby").count();
    assert(rubyCount > 0, "furigana should be available in textbook exercises");
    const savedDraft = `漢字の読み方が難しいです。${viewport.width}`;
    const activityDraft = page.locator('[data-textbook-draft="activity-japanese-difficulty"]');
    await activityDraft.fill(savedDraft);
    await page.locator("#furigana-toggle").click();
    assert.equal(await page.locator(".textbook-exercise ruby").count(), 0, "furigana OFF did not update textbook exercises");
    assert.equal(await page.locator('[data-textbook-draft="activity-japanese-difficulty"]').inputValue(), savedDraft, "learner draft did not survive rerender");
    await page.locator("#furigana-toggle").click();

    await page.screenshot({ path: `${artifacts}/questions-${viewport.width}.png`, fullPage: true });
    if (viewport.width === 810) {
      await modelToggles.nth(1).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "open research reference overflows at iPad width");
      await page.locator('[data-textbook-model-toggle="textbook-model-think-speak-sei-research"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${artifacts}/research-reference-810.png`, fullPage: true });
    }
    if (viewport.width === 390) {
      await modelToggles.nth(2).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "open challenge references overflow at mobile width");
      await page.locator('[data-textbook-model-toggle="textbook-model-challenge-unusual-reading"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${artifacts}/challenge-reference-390.png`, fullPage: true });
    }
  }

  await page.goto(`${base}/chapter-13-reading.html`);
  await page.locator('[data-reading-mode="exam"]').click();
  assert.equal(await page.locator(".exam-list article").count(), 13, "mock exam question count changed");
  assert.deepEqual(await page.locator(".exam-list input").evaluateAll(inputs => [...new Set(inputs.map(input => input.name))]), Array.from({ length: 13 }, (_, index) => `q${index + 1}`), "mock exam question IDs changed");
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("Lesson 13 textbook reading checks passed for desktop, iPad, and mobile layouts.");
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
