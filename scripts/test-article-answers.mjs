// Historical source is read independently of the new data attributes so a wrong
// annotation cannot make its own test pass. Future posts use the generic checks.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { extname, resolve, sep, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";

const root = process.cwd();
const baselineRef = process.env.JPY5_ARTICLE_BASELINE_REF || "35b33d9";
const articles = (await readdir(root)).filter(file => /^article-.*\.html$/.test(file));
const manifestText = await readFile("assets/offline-assets.js", "utf8");
const oldManifest = execFileSync("git", ["show", `${baselineRef}:assets/offline-assets.js`], { encoding: "utf8" });
const oldFiles = [...JSON.parse(oldManifest.match(/assets: Object\.freeze\((\[[\s\S]*?\])\)/)[1]), "sw.js", "assets/offline-assets.js"];
// Read the previous package once so Git process startup cannot time out the install.
const archive = execFileSync("git", ["cat-file", "--batch"], {
  input: oldFiles.map(file => `${baselineRef}:${file}\n`).join(""), maxBuffer: 32 * 1024 * 1024
});
const oldBodies = new Map();
let offset = 0;
for (const file of oldFiles) {
  const headerEnd = archive.indexOf(10, offset);
  const header = archive.toString("ascii", offset, headerEnd);
  assert.match(header, /^\w+ blob \d+$/, file);
  const end = headerEnd + 1 + Number(header.split(" ")[2]);
  oldBodies.set(file, archive.subarray(headerEnd + 1, end));
  offset = end + 1;
}
const historical = new Map(oldFiles.filter(file => /^article-(?:foundation-|lesson-).*\.html$/.test(file))
  .map(file => [file, oldBodies.get(file).toString("utf8")]));
let previousRelease = false;
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (!path.startsWith("/jpy5/")) return response.writeHead(404).end();
    const file = path.slice(6) || "index.html", absolute = resolve(root, file);
    if (!absolute.startsWith(root + sep)) return response.writeHead(403).end();
    if (previousRelease && !oldBodies.has(file)) return response.writeHead(404).end();
    const body = previousRelease ? oldBodies.get(file) : await readFile(absolute);
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }).end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}/jpy5/`;
const browser = await chromium.launch({ channel: process.env.JPY5_BROWSER_CHANNEL || "msedge", headless: true });
const errors = [];
async function context(options = {}) {
  const result = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 }, ...options });
  await result.route("**/*", route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  result.on("page", page => page.on("pageerror", error => errors.push(error.message)));
  return result;
}
const participating = [], totals = { questions: 0, controls: 0, blanks: 0, multi: 0, appendedRationales: 0 };
const screenshots = process.env.JPY5_ARTICLE_SCREENSHOTS || join(tmpdir(), "jpy5-article-answers");
await mkdir(screenshots, { recursive: true });
try {
  const ctx = await context(), page = await ctx.newPage();
  for (const file of articles) {
    if (historical.has(file)) {
      const original = historical.get(file);
      let source = (await readFile(file, "utf8")).replace(/\r\n/g, "\n");
      source = source.replace('    <link rel="stylesheet" href="assets/article-answers.css?v=1">\n', "").replace('    <script src="assets/article-answers.js?v=1" defer></script>\n', "");
      // Remove only the deliberate exercise edits. Everything else must still
      // be byte-identical to the pristine article after portable line endings.
      const oldLists = [...original.matchAll(/<ol\b[^>]*>[\s\S]*?<\/ol>/g)];
      const oldGroups = file.includes("foundation-00") ? [oldLists.slice(0, 7), oldLists.slice(7)] : file.includes("foundation-") ? [[oldLists[0], oldLists[2]], [oldLists[1], oldLists[3]]] : [[oldLists.at(-2)], [oldLists.at(-1)]];
      const originalItems = oldGroups.map(group => group.flatMap(list => [...list[0].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(item => item[0])));
      source = source.replace(/<li data-article-question="(\d+)" data-answer-id="article-answer-\d+">[\s\S]*?<\/li>/g, (_, number) => originalItems[0][Number(number) - 1]);
      source = source.replace(/<li id="article-answer-(\d+)" data-article-answer>[\s\S]*?<\/li>/g, (_, number) => originalItems[1][Number(number) - 1]);
      assert.equal(source.replace(/\r\n/g, "\n"), original.replace(/\r\n/g, "\n"), `${file}: unrelated content preserved`);
    }
    await page.goto(base + file);
    const expected = historical.has(file) ? await page.evaluate(({ html, file }) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const reader = doc.querySelector(".reader-article");
      const lists = [...reader.querySelectorAll("ol")];
      const groups = file.includes("foundation-00") ? [lists.slice(0, 7), lists.slice(7)] : file.includes("foundation-") ? [[lists[0], lists[2]], [lists[1], lists[3]]] : [[lists.at(-2)], [lists.at(-1)]];
      return {
        groups: groups.map(group => group.flatMap(list => [...list.children].map(item => ({ html: item.innerHTML, text: item.textContent })))),
        lists: lists.map(list => ({ start: list.getAttribute("start"), count: list.children.length })),
        details: [...reader.querySelectorAll("details")].map(node => node.open)
      };
    }, { html: historical.get(file), file }) : null;
    const questions = page.locator("[data-article-question]");
    const count = await questions.count();
    if (!count) {
      assert(!expected, `${file}: historical exercises lost`);
      assert.equal(await page.locator('script[src*="article-answers"], link[href*="article-answers"]').count(), 0);
      continue;
    }
    participating.push(file);
    assert.equal(await page.locator('script[src="assets/article-answers.js?v=1"], link[href="assets/article-answers.css?v=1"]').count(), 2);
    assert.equal(await page.locator(".article-answer-dialog").count(), 0, "dialog is lazy");
    if (expected) {
      assert.equal(count, expected.groups[0].length, file);
      assert.equal(await page.locator("[data-article-answer]").count(), expected.groups[1].length);
      assert.deepEqual(await page.locator(".reader-article ol").evaluateAll(nodes => nodes.map(list => ({ start: list.getAttribute("start"), count: list.children.length }))), expected.lists);
    }
    const detailState = await page.locator(".reader-article details").evaluateAll(nodes => nodes.map(node => node.open));
    if (expected) assert.deepEqual(detailState, expected.details);
    for (let index = 0; index < count; index++) {
      const question = questions.nth(index), number = String(index + 1);
      assert.equal(await question.getAttribute("data-article-question"), number);
      const answerId = await question.getAttribute("data-answer-id");
      assert.equal(await page.locator(`[id="${answerId}"]`).count(), 1, `${file} Q${number}`);
      const answer = page.locator(`[id="${answerId}"]`);
      const blankCount = await question.locator("[data-answer-blank]").count();
      if (expected) assert.equal(blankCount, (expected.groups[0][index].text.match(/＿+|　{2,}/g) || []).length, `${file} Q${number}: every literal blank is wrapped`);
      const buttons = question.locator("button[aria-haspopup=dialog]");
      assert.equal(await buttons.count(), Math.max(1, blankCount));
      const preserved = await question.evaluate(node => {
        const clone = node.cloneNode(true);
        clone.querySelectorAll(".article-answer-button").forEach(button => button.remove());
        clone.querySelectorAll("[data-answer-blank]").forEach(blank => blank.replaceWith(document.createTextNode(blank.textContent)));
        return clone.innerHTML.trim();
      });
      if (expected) {
        assert.equal(preserved, expected.groups[0][index].html, `${file} Q${number}: preserve original markup and Japanese`);
        const html = await answer.innerHTML();
        // Q3 asks what might have happened at the end, given an observed increase in discussion.
        const old = file === "article-lesson-14-reading-evidence-and-inference.html" && number === "3"
          ? '<strong>參考答案</strong> <span lang="ja">ネットでこの作品（さくひん）についての議論（ぎろん）が増（ふ）えている。最後（さいご）に謎（なぞ）が残（のこ）されたのではないだろうか。</span> 網上關於這部作品的討論增加了。會不會是片尾留下了謎團呢？'
          : expected.groups[1][index].html;
        assert(html.startsWith(old), `${file} Q${number}: only append rationale to original answer`);
        if (html !== old) {
          totals.appendedRationales++;
          assert(await page.evaluate(added => {
            const node = document.createElement("div"); node.innerHTML = added;
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) if (/[ぁ-んァ-ン]/.test(walker.currentNode.textContent) && !walker.currentNode.parentElement.closest('[lang="ja"]')) return false;
            return true;
          }, html.slice(old.length)), `${file} Q${number}: added Japanese has language metadata`);
        }
      }
      assert(await answer.evaluate(node => node.closest(".reader-article") && node.hasAttribute("data-article-answer")));
      for (let blank = 0; blank < await buttons.count(); blank++) {
        const control = buttons.nth(blank);
        assert.match(await control.getAttribute("aria-label"), new RegExp(`第 ${number} 題`));
        if (blankCount > 1) assert.match(await control.getAttribute("aria-label"), new RegExp(`第 ${blank + 1} 個空格`));
        assert.equal(await control.getAttribute("lang"), "zh-Hant");
        await control.scrollIntoViewIfNeeded();
        if (index === 0 || blank > 0) { await control.evaluate(node => node.focus({ preventScroll: true })); await control.press(blank ? "Space" : "Enter"); }
        else await control.click();
        const dialog = page.locator(".article-answer-dialog");
        assert.equal(await dialog.count(), 1);
        assert.equal(await dialog.getAttribute("open"), "");
        assert.equal(await dialog.locator("h2").textContent(), `第 ${number} 題答案與解釋`);
        assert.equal(await dialog.locator(".article-answer-content").innerHTML(), await answer.innerHTML(), `${file} Q${number}: exact single answer, no neighbours or stale content`);
        assert.equal(await dialog.locator("[data-article-answer], [id]:not(h2)").count(), 0);
        assert(await dialog.locator(".article-answer-close").evaluate(node => document.activeElement === node));
        const scroll = await page.evaluate(() => window.scrollY);
        if (index % 2) await dialog.locator(".article-answer-close").click();
        else await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        await page.waitForFunction(() => !document.querySelector(".article-answer-content").hasChildNodes());
        assert(await control.evaluate(node => document.activeElement === node), "restore exact opener");
        assert.equal(await page.evaluate(() => window.scrollY), scroll, "close must not jump");
        assert.equal(await dialog.locator(".article-answer-content").textContent(), "");
        totals.controls++;
      }
      totals.questions++;
      totals.blanks += blankCount;
      if (blankCount > 1) totals.multi++;
    }
    assert.deepEqual(await page.locator(".reader-article details").evaluateAll(nodes => nodes.map(node => node.open)), detailState, "popups do not change disclosure state");
  }
  console.log(`PASS ${participating.length} articles, ${totals.questions} questions, ${totals.controls} controls, ${totals.blanks} blanks, ${totals.multi} double blanks, ${totals.appendedRationales} appended rationales; original questions, answers and list numbering preserved`);

  // No JS, blocked feature script, and absent native dialog retain source answers.
  for (const mode of ["no-js", "blocked", "unsupported"]) {
    const fallback = await context({ javaScriptEnabled: mode !== "no-js" });
    if (mode === "blocked") await fallback.route("**/article-answers.js?*", route => route.abort());
    if (mode === "unsupported") await fallback.addInitScript(() => { HTMLDialogElement.prototype.showModal = undefined; });
    const tab = await fallback.newPage();
    for (const file of participating) {
      await tab.goto(base + file);
      assert.equal(await tab.locator(".article-answer-blank, .article-answer-button, .article-answer-dialog").count(), 0);
      for (const detail of await tab.locator(".reader-article details").all()) await detail.locator("summary").click();
      for (const answer of await tab.locator("[data-article-answer]").all()) assert(await answer.isVisible());
    }
    await fallback.close();
  }
  console.log("PASS every article with no JavaScript, blocked script and unsupported native dialog");

  await page.goto(base + "article-foundation-01-particles.html");
  await page.locator(".article-examples > summary").first().click();
  await page.locator('[data-article-question="1"] button').click();
  await page.keyboard.press("Escape");
  assert(await page.locator("details.article-examples").first().evaluate(node => node.open), "previously opened source disclosure stays open");

  // Invalid targets do not create a misleading or unusable control.
  await page.goto(base + participating[0]);
  await page.evaluate(() => {
    document.querySelector(".reader-article").innerHTML = '<ol><li data-article-question="1" data-answer-id="missing">missing <span data-answer-blank>＿＿</span></li><li data-article-question="2" data-answer-id="duplicate">duplicate</li><li data-article-question="3" data-answer-id="outside">outside reader</li><li data-article-question="4" data-answer-id="not-answer">unmarked</li></ol><p id="duplicate" data-article-answer>A</p><p id="duplicate" data-article-answer>B</p><p id="not-answer">C</p>';
    document.body.insertAdjacentHTML("beforeend", '<p id="outside" data-article-answer>D</p>');
  });
  await page.addScriptTag({ path: "assets/article-answers.js" });
  assert.equal(await page.locator(".reader-article button").count(), 0);

  // Source cloning keeps ruby, emphasis and links but never duplicates IDs.
  await page.evaluate(() => {
    document.querySelector(".reader-article").innerHTML = '<ol><li data-article-question="1" data-answer-id="fixture-answer">fixture</li></ol><ol><li id="fixture-answer" data-article-answer><strong>參考答案</strong> <span lang="ja"><ruby id="ruby-fixture">字<rt>じ</rt></ruby></span> <a id="link-fixture" href="#fixture-answer">連結</a></li></ol>';
  });
  await page.addScriptTag({ path: "assets/article-answers.js" });
  await page.locator(".article-answer-button").click();
  assert.equal(await page.locator(".article-answer-content ruby rt").textContent(), "じ");
  assert.equal(await page.locator(".article-answer-content [lang=ja]").count(), 1);
  assert.equal(await page.locator(".article-answer-content a").getAttribute("href"), "#fixture-answer");
  assert.equal(await page.locator(".article-answer-content [id]").count(), 0);
  await page.keyboard.press("Escape");

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 640 });
    for (const theme of ["light", "dark"]) {
      await page.goto(base + "article-foundation-01-particles.html");
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await page.locator('[data-article-question="2"] button').nth(1).click();
      const dialog = page.locator(".article-answer-dialog");
      assert(await dialog.evaluate(node => { const rect = node.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight; }));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: join(screenshots, `blank-${width}-${theme}.png`) });
      await page.keyboard.press("Escape");
      await page.goto(base + "article-lesson-13-writing-a-timeline.html");
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      await page.locator('[data-article-question="5"] button').click();
      assert(await page.locator(".article-answer-close").isVisible());
      await page.screenshot({ path: join(screenshots, `long-${width}-${theme}.png`) });
      // Stress a long answer without changing the authored content.
      await page.setViewportSize({ width, height: 320 });
      await page.locator(".article-answer-content").evaluate(node => { node.append(document.createTextNode(node.textContent.repeat(12))); });
      assert(await page.locator(".article-answer-content").evaluate(node => node.scrollHeight > node.clientHeight && getComputedStyle(node).overflowY === "auto"));
      assert(await page.locator(".article-answer-close").evaluate(node => { const rect = node.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; }));
      await page.keyboard.press("Tab");
      assert(await page.locator(".article-answer-content").evaluate(node => document.activeElement === node));
      await page.keyboard.press("PageDown");
      await page.waitForFunction(() => document.querySelector(".article-answer-content").scrollTop > 0);
      await page.locator(".article-answer-close").click();
      await page.setViewportSize({ width, height: 640 });
    }
  }
  for (const file of ["chapter-13-notes.html", "chapter-14-reading.html", "articles.html", "index.html"]) {
    await page.goto(base + file);
    assert.equal(await page.locator('script[src*="article-answers"], link[href*="article-answers"], .article-answer-dialog').count(), 0);
  }
  console.log(`PASS invalid mappings, ruby/links/ID cloning, mobile 320/390, light/dark, scrolling and non-article regression; screenshots ${screenshots}`);
  await ctx.close();

  async function ready(tab, state = "ready") {
    await tab.waitForFunction(state => navigator.serviceWorker.controller && document.querySelector(".pwa-status")?.dataset.state === state, state, { timeout: 90000 });
  }
  async function download(tab) {
    if (!await tab.locator(".site-utilities").evaluate(node => node.open)) await tab.locator(".site-utilities > summary").click();
    await tab.locator(".pwa-status").click();
    await tab.locator("[data-offline-download]").click();
    await ready(tab);
    await tab.locator("[data-offline-close]").click();
  }
  async function offlineAnswers(offlineContext) {
    await offlineContext.setOffline(true);
    const tab = await offlineContext.newPage();
    let controls = 0;
    for (const file of participating) {
      await tab.goto(base + file);
      const buttons = tab.locator(".article-answer-button, .article-answer-blank");
      for (const button of await buttons.all()) {
        await button.click();
        assert(await tab.locator(".article-answer-dialog[open]").isVisible());
        const expected = await button.evaluate(node => document.getElementById(node.closest("[data-answer-id]").dataset.answerId).innerHTML);
        assert.equal(await tab.locator(".article-answer-content").innerHTML(), expected);
        await tab.keyboard.press("Escape");
        controls++;
      }
    }
    assert.equal(controls, totals.controls);
    assert.equal(await tab.evaluate(() => localStorage.getItem("jpy5.chapter13.articleAnswerSentinel")), "retained");
    await tab.close();
  }
  const fresh = await context({ serviceWorkers: "allow" }), installed = await fresh.newPage();
  await installed.goto(base + participating[0]);
  await ready(installed, "online");
  await installed.evaluate(() => localStorage.setItem("jpy5.chapter13.articleAnswerSentinel", "retained"));
  await download(installed);
  await offlineAnswers(fresh);
  await fresh.close();
  console.log(`PASS fresh optional offline package: all ${totals.controls} controls in new offline tabs and progress retained`);

  // The previous manifest and articles are served unchanged until the package
  // has been installed. The service worker's normal update flow installs next.
  assert.notEqual(oldManifest.match(/version: "([^"]+)"/)[1], manifestText.match(/version: "([^"]+)"/)[1], "regenerate offline manifest");
  previousRelease = true;
  const updating = await context({ serviceWorkers: "allow" }), old = await updating.newPage();
  await old.goto(base + participating[0]);
  await ready(old, "online");
  assert.equal(await old.locator("[data-article-question]").count(), 0);
  await old.evaluate(() => localStorage.setItem("jpy5.chapter13.articleAnswerSentinel", "retained"));
  await download(old);
  previousRelease = false;
  await old.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  if (!await old.locator(".site-utilities").evaluate(node => node.open)) await old.locator(".site-utilities > summary").click();
  await old.locator(".pwa-status").click();
  await old.locator("[data-offline-check]").click();
  await old.waitForFunction(() => document.querySelector(".pwa-status-label")?.textContent === "離線內容有更新", null, { timeout: 90000 });
  await old.locator("[data-offline-download]").click();
  await ready(old);
  await old.locator("[data-offline-close]").click();
  await offlineAnswers(updating);
  await updating.close();
  console.log(`PASS installed package update from ${baselineRef}: all ${totals.controls} controls offline, progress retained`);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
