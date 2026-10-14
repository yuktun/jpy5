import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");
const root = process.cwd();
const smoke = process.env.JPY5_TEACHER_SMOKE === "1";
const artifacts = resolve("tmp/lessons14-20-teacher-browser");
await mkdir(artifacts, { recursive: true });
const lessons = process.env.JPY5_TEACHER_LESSONS ? process.env.JPY5_TEACHER_LESSONS.split(",").map(Number) : [14, 15, 16, 17, 18, 19, 20];
assert(lessons.length > 0 && lessons.every(lesson => Number.isInteger(lesson) && lesson >= 14 && lesson <= 20), "Invalid lesson selection");
const pagesInSource = { 14: 6, 15: 6, 16: 5, 17: 6, 18: 6, 19: 6, 20: 6 };
// Reconciled against each PDF, including separate checks of nested blanks and
// subquestions recorded in LESSONS14_20_EXERCISE_AUDIT.md.
const promptInventory = { 14: 45, 15: 37, 16: 31, 17: 44, 18: 38, 19: 63, 20: 59 };
const sourceIds = {
  14: "1S6fJRP1c0NIT5wtkQtxU0weSVxGaZifk", 15: "1jUrKiCQxhXOrfXK4DNLozXE1DRX3q9qL",
  16: "1Kd2LzsJ7KmJWAEFyR4sz2SMzInYiAf4I", 17: "125QqxLD7rXefPpe2zygGa0yDo-WBC5KT",
  18: "18-y1eCHud8DWT97HvTIRBzzG0DzucPCG", 19: "1sSchnxQUX7fTcnAr-U8Iak1FlHxsqPuy",
  20: "1mvxWuJRPYQ5Voavcjo1IEHQnhlQXefWp"
};
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer(async (request, response) => {
  try {
    const path = resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
    if (!path.startsWith(`${root}${sep}`)) return response.writeHead(403).end();
    response.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = process.env.JPY5_TEACHER_BASE_URL || `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, ...(process.env.JPY5_BROWSER_CHANNEL ? { channel: process.env.JPY5_BROWSER_CHANNEL } : {}) });
const context = await browser.newContext({ serviceWorkers: "block" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const urlFor = lesson => new URL(`chapter-${lesson}-review.html`, base).href;
const progressSnapshot = target => target.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([key]) => /^jpy5\.chapter\d+\./.test(key)))));
const assertFits = async (target, label) => assert.equal(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${label}: horizontal page overflow`);

try {
  for (const viewport of (smoke ? [{ width: 390, height: 844 }] : [{ width: 1280, height: 900 }, { width: 810, height: 1080 }, { width: 390, height: 844 }])) {
    await page.setViewportSize(viewport);
    for (const lesson of lessons) {
      const label = `Lesson ${lesson} at ${viewport.width}px`;
      await page.goto(urlFor(lesson));
      await page.waitForLoadState("domcontentloaded");
      await page.locator(".lesson-quick-switcher").waitFor({ state: "visible" });
      const shell = page.locator("#teacher-exercise");
      assert.equal(await shell.count(), 1, `${label}: missing teacher exercise`);
      assert.equal(await page.locator('.review-path > a[href="#teacher-exercise"]').count(), 1);
      assert.equal(await page.locator(".review-path > a").count(), 7);
      assert.equal(await shell.locator("details.teacher-exercise").count(), 3);
      assert.equal(await shell.locator("details.teacher-exercise").first().getAttribute("open"), "");
      assert.equal(await shell.locator("details.teacher-exercise[open]").count(), 1);
      assert.equal(await shell.locator(".teacher-answer:not([hidden])").count(), 0, `${label}: answers exposed initially`);
      assert(await shell.locator(`a[href*="${sourceIds[lesson]}"]`).count() > 0, `${label}: missing source PDF link`);
      const ids = await page.locator("[id]").evaluateAll(nodes => nodes.map(node => node.id));
      assert.equal(new Set(ids).size, ids.length, `${label}: duplicate DOM IDs`);
      const covered = await shell.locator("[data-source-page]").evaluateAll(nodes => [...new Set(nodes.flatMap(node => node.dataset.sourcePage.split(/\s+/).map(Number)))].sort((a, b) => a - b));
      assert.deepEqual(covered, Array.from({ length: pagesInSource[lesson] }, (_, i) => i + 1), `${label}: incomplete source-page coverage`);
      const counts = await shell.locator("[data-question-count]").evaluateAll(nodes => nodes.map(node => Number(node.dataset.questionCount)));
      assert(counts.length >= 3 && counts.every(count => Number.isInteger(count) && count > 0), `${label}: invalid question inventory`);
      assert.equal(counts.reduce((a, b) => a + b, 0), promptInventory[lesson], `${label}: source prompt inventory changed`);
      for (const extract of await shell.locator("[data-extract-length]").all()) {
        assert.equal(Array.from((await extract.textContent()).trim()).length, Number(await extract.getAttribute("data-extract-length")), `${label}: quotation character count`);
      }
      await page.evaluate(lessonNumber => {
        localStorage.setItem(`jpy5.chapter${lessonNumber}.teacherTestSentinel`, JSON.stringify({ attempts: 2, bookmarked: ["keep-me"] }));
      }, lesson);
      const before = await progressSnapshot(page);
      await shell.locator("details.teacher-exercise").evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
      for (const theme of ["light", "dark"]) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        await assertFits(page, `${label} ${theme}`);
        await shell.evaluate(node => window.scrollTo(0, node.getBoundingClientRect().top + scrollY - 160));
        await page.screenshot({ path: `${artifacts}/lesson-${lesson}-${viewport.width}-${theme}.png` });
      }
      const toggles = shell.locator("[data-answer-toggle]");
      assert(await toggles.count() > 0);
      assert.equal(await toggles.count(), await shell.locator(".teacher-answer").count(), `${label}: orphan answer or toggle`);
      const answerButtons = await toggles.all();
      for (const button of (smoke ? answerButtons.slice(0, 1) : answerButtons)) {
        const id = await button.getAttribute("aria-controls");
        assert(id, `${label}: no answer target`);
        const answer = page.locator(`#${id}`);
        assert.equal(await answer.count(), 1);
        assert((await answer.textContent()).trim(), `${label}: empty answer`);
        assert.equal(await button.getAttribute("aria-expanded"), "false");
        await button.click();
        assert.equal(await answer.isVisible(), true, `${label}: answer did not reveal`);
        assert.equal(await button.getAttribute("aria-expanded"), "true");
        await assertFits(page, `${label} revealed answer ${id}`);
        await button.click();
        assert.equal(await answer.isVisible(), false, `${label}: answer did not hide`);
      }
      const words = shell.locator(".teacher-word-bank button");
      assert(await words.count() > 0, `${label}: missing contextual word help`);
      const help = page.locator(".teacher-word-help-popover");
      const wordButtons = await words.all();
      for (const word of (smoke ? wordButtons.slice(0, 1) : wordButtons)) {
        assert((await word.getAttribute("data-word-meaning"))?.trim(), `${label}: empty Chinese meaning`);
        assert((await word.getAttribute("data-word-usage"))?.trim(), `${label}: empty contextual usage`);
        await word.hover();
        assert.equal(await help.isVisible(), true);
        assert.equal(await help.locator("h2").textContent(), await word.textContent());
        assert.equal(await help.locator(".teacher-word-meaning").textContent(), await word.getAttribute("data-word-meaning"));
        assert.equal(await help.locator(".teacher-word-usage").textContent(), await word.getAttribute("data-word-usage"));
        assert.equal(await shell.locator(".teacher-answer:not([hidden])").count(), 0, `${label}: word help exposed answers`);
        const box = await help.boundingBox();
        assert(box.x >= 0 && box.x + box.width <= viewport.width + 1 && box.y >= 0 && box.y + box.height <= viewport.height + 1, `${label}: word help outside viewport`);
        await page.mouse.move(2, 2);
        await help.waitFor({ state: "hidden" });
      }
      // Focus without starting the page's smooth scroll, then finish the
      // scroll-dismiss events before testing keyboard activation.
      await words.first().evaluate(node => {
        node.focus({ preventScroll: true });
        node.scrollIntoView({ behavior: "instant", block: "center" });
      });
      await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
      await page.keyboard.press("Enter");
      await help.waitFor({ state: "visible" });
      await page.keyboard.press("Escape");
      await help.waitFor({ state: "hidden" });
      assert.equal(await words.first().evaluate(node => node === document.activeElement), true);
      assert.equal(await progressSnapshot(page), before, `${label}: help/disclosures changed progress`);
      console.log(`${label}: ${counts.reduce((a, b) => a + b, 0)} prompts inventoried; ${await toggles.count()} answer controls; ${await words.count()} word explanations.`);
    }
  }

  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const touchPage = await touch.newPage();
  touchPage.on("pageerror", error => errors.push(error.message));
  for (const lesson of lessons) {
    await touchPage.goto(urlFor(lesson));
    await touchPage.locator(".lesson-quick-switcher").waitFor({ state: "visible" });
    const word = touchPage.locator("#teacher-exercise .teacher-word-bank button").first();
    const help = touchPage.locator(".teacher-word-help-popover");
    // Do not let tap's automatic scroll race dismissal or a late navigation
    // layout shift on the live site.
    await word.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
    await touchPage.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    await word.tap();
    assert.equal(await help.isVisible(), true, `Lesson ${lesson}: tap did not open help`);
    await word.tap();
    await help.waitFor({ state: "hidden" });
    await word.tap();
    await touchPage.touchscreen.tap(2, 2);
    await help.waitFor({ state: "hidden" });
    await word.tap();
    await touchPage.evaluate(() => window.scrollBy(0, 100));
    await help.waitFor({ state: "hidden" });
    assert.equal(await touchPage.locator(".teacher-answer:not([hidden])").count(), 0);
    await assertFits(touchPage, `Lesson ${lesson} touch`);
    console.log(`Lesson ${lesson}: touch word help passed.`);
  }
  await touch.close();
  assert.deepEqual(errors, [], errors.join("\n"));
  console.log(`Lessons ${lessons.join(", ")} teacher exercise ${smoke ? "smoke " : ""}browser checks passed.`);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
