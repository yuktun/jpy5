import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import vm from "node:vm";
import { chromium } from "playwright";
import { applySnapshot, mergeSnapshots, snapshotFromStorage, syncableKey } from "../assets/firebase-sync.mjs";

const visitKey = "jpy5-navigation-last-visit-v1";
const visit = { version: 1, lesson: 19, module: "reading", visitedAt: "2026-11-15T04:00:00.000Z" };
const savedVisit = JSON.stringify(visit);
const progressKey = "jpy5.chapter19.reading";
const localData = new Map([[visitKey, savedVisit], [progressKey, '{"score":1}']]);
const storage = {
  get length() { return localData.size; },
  key: index => [...localData.keys()][index],
  getItem: key => localData.get(key) ?? null,
  setItem: (key, value) => localData.set(key, value)
};
assert.equal(syncableKey(visitKey), false);
assert.deepEqual(snapshotFromStorage(storage), { [progressKey]: '{"score":1}' });
assert.deepEqual(mergeSnapshots({ [visitKey]: savedVisit }, { [visitKey]: "incoming" }), {});
applySnapshot({ [visitKey]: "incoming", [progressKey]: '{"score":2}' }, storage);
assert.equal(storage.getItem(visitKey), savedVisit);
assert.equal(storage.getItem(progressKey), '{"score":2}');

const readJson = async file => JSON.parse(await readFile(file, "utf8"));
const navigation = await readJson("assets/lesson-navigation.json");
const posts = await readJson("assets/posts.json");
const slugs = posts.map(post => post.slug);
const readerPath = post => `article-${post.slug}.html`;
const sortedPosts = [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug, "en"));
const modules = [
  ["vocabulary", "詞彙"], ["notes", "文法"], ["reading", "閱讀"], ["textbook", "聆聽"],
  ["review", "複習"], ["flashcards", "文法記憶卡"], ["quiz", "文法測驗"], ["history", "測驗紀錄"]
];
assert.equal(slugs.length, new Set(slugs).size);
assert(posts.length >= 3);
for (const post of posts) {
  assert.match(post.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.match(post.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(post.publishedAt).toISOString().slice(0, 10), post.publishedAt);
  if (post.updatedAt) {
    assert.equal(new Date(post.updatedAt).toISOString().slice(0, 10), post.updatedAt);
    assert(post.updatedAt >= post.publishedAt);
  }
  assert(post.title && post.category && post.summary && Number.isInteger(post.readingMinutes));
  await stat(readerPath(post));
}

const sandbox = { self: {} };
vm.runInNewContext(await readFile("assets/offline-assets.js", "utf8"), sandbox);
const files = new Set([...sandbox.self.JPY5_OFFLINE_MANIFEST.assets, "assets/offline-assets.js", "sw.js"]);
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const file = pathname === "/jpy5/" ? "index.html" : pathname.slice("/jpy5/".length);
  if (!pathname.startsWith("/jpy5/") || !files.has(file)) return response.writeHead(404).end();
  try {
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": types[extname(file)] || "text/plain", "Cache-Control": "no-store" }).end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const base = `${origin}/jpy5/`;
const browser = await chromium.launch({ channel: process.env.JPY5_BROWSER_CHANNEL || "msedge", headless: true });
const screenshots = process.env.JPY5_NAV_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });

async function isolatedContext(options = {}) {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 }, ...options });
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  return context;
}
async function goto(page, file) {
  assert.equal((await page.goto(base + file)).status(), 200, file);
}
async function home(page) {
  await goto(page, "index.html");
  await page.waitForFunction(() => !document.querySelector("[data-home-lesson-picker] select").disabled);
}
async function links(locator) {
  return locator.evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
}
async function storedVisit(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), visitKey);
}
async function setVisit(page, value) {
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: visitKey, value });
}
async function selectTheme(page, theme) {
  const summary = page.locator(".site-utilities:not([open]) > summary");
  if (await summary.count()) await summary.click();
  await page.locator("[data-theme-select]").selectOption(theme);
  assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
  if (await page.locator(".site-utilities[open]").count()) await page.keyboard.press("Escape");
}

try {
  const context = await isolatedContext();
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const picker = page.locator("[data-home-lesson-picker] select");
  const resume = page.locator("[data-last-visit-link]");
  const chapterLinks = page.locator(".home-module-nav a");
  const currentActivity = page.locator(".lesson-quick-sections a[aria-current=page]");
  const siteLinks = page.locator(".site-header .site-nav a");
  const expectedSiteLinks = ["index.html", "index.html#lessons", "articles.html"];
  const quickLinks = page.locator(".lesson-quick-sections a");
  const switcher = page.locator(".lesson-quick-switcher");
  const classHint = page.locator("[data-home-lesson-hint]");

  async function assertClassChoice() {
    await page.waitForFunction(() => !document.querySelector("[data-home-lesson-picker] select").disabled);
    assert.equal(await picker.inputValue(), "14");
    assert.equal(await classHint.innerText(), "課堂進度・第 14 課");
    assert.deepEqual(await links(chapterLinks), modules.map(([module]) => navigation.routes[14][module]));
    assert.equal(await page.locator("[data-selected-hub]").getAttribute("href"), navigation.hubs[14]);
  }

  await home(page);
  await assertClassChoice();
  assert.equal(await resume.getAttribute("href"), "chapter-14.html");
  assert.match(await resume.innerText(), /開始學習/);
  assert.match(await page.locator("[data-last-visit-description]").innerText(), /跟隨課堂進度/);
  assert.deepEqual(await links(siteLinks), expectedSiteLinks);
  assert.deepEqual(await links(page.locator("#lessons li a")), Object.values(navigation.hubs));
  assert.equal(await storedVisit(page), null);

  for (const lesson of navigation.lessons) {
    await picker.selectOption(String(lesson));
    assert.equal(page.url(), base + "index.html");
    assert.equal(await classHint.isVisible(), lesson === 14);
    assert.deepEqual(await links(chapterLinks), modules.map(([module]) => navigation.routes[lesson][module]));
    assert.deepEqual(await chapterLinks.evaluateAll(nodes => nodes.map(node => node.lastChild.textContent.trim())), modules.map(([, label]) => label));
    assert.equal(await page.locator("[data-selected-hub]").getAttribute("href"), navigation.hubs[lesson]);
  }
  assert.equal(await storedVisit(page), null, "changing the lesson picker must not create a visit");
  await chapterLinks.filter({ hasText: "測驗紀錄" }).click();
  await page.waitForURL(base + "chapter-20-history.html");
  await switcher.waitFor();
  const first = await storedVisit(page);
  assert.deepEqual(first, { version: 1, lesson: 20, module: "history", visitedAt: new Date(first.visitedAt).toISOString() });
  await switcher.locator("select").selectOption("17");
  await page.waitForURL(base + "chapter-17-history.html");
  await currentActivity.waitFor();
  assert.equal(await currentActivity.innerText(), "測驗紀錄");
  await siteLinks.first().click();
  await resume.filter({ hasText: "繼續上次開啟的頁面" }).waitFor();
  await assertClassChoice();
  assert.equal(await resume.getAttribute("href"), "chapter-17-history.html");
  const beforeArticles = await storedVisit(page);
  await picker.selectOption("19");
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
  await assertClassChoice();
  assert.equal(await resume.getAttribute("href"), "chapter-17-history.html");
  await picker.selectOption("20");
  await siteLinks.last().click();
  await page.locator("[data-posts-ready]").waitFor();
  assert.deepEqual(await storedVisit(page), beforeArticles);
  await page.goBack();
  await assertClassChoice();
  assert.equal(await resume.getAttribute("href"), "chapter-17-history.html");
  await page.goForward();
  await page.locator("[data-posts-ready]").waitFor();
  await page.locator(".post-card a").first().click();
  assert.deepEqual(await storedVisit(page), beforeArticles);
  await page.locator(".reader-returns a").last().click();
  await resume.filter({ hasText: "繼續上次開啟的頁面" }).waitFor();
  await assertClassChoice();
  assert.deepEqual(await storedVisit(page), beforeArticles);

  for (const lesson of navigation.lessons) {
    const expected = modules.map(([module]) => navigation.routes[lesson][module]);
    for (const [module, label] of modules) {
      await goto(page, navigation.routes[lesson][module]);
      await currentActivity.waitFor();
      assert.deepEqual(await links(siteLinks), expectedSiteLinks);
      assert.deepEqual(await links(quickLinks), expected);
      assert.equal(await currentActivity.getAttribute("href"), navigation.routes[lesson][module]);
      assert.equal(await currentActivity.innerText(), label);
      assert.deepEqual(await links(page.locator(".lesson-quick-sections .active")), [navigation.routes[lesson][module]]);
      assert.equal(await page.locator(".site-header .back-link").getAttribute("href"), navigation.hubs[lesson]);
    }
    await goto(page, navigation.hubs[lesson]);
    await switcher.waitFor();
    assert.deepEqual(await links(quickLinks), expected);
    assert.equal(await currentActivity.count(), 0);
    const hubVisit = await storedVisit(page);
    assert.equal(hubVisit.module, null);
    assert.equal(hubVisit.lesson, lesson);
  }
  await home(page);
  await assertClassChoice();
  assert.equal(await resume.getAttribute("href"), "chapter-20.html");
  await resume.click();
  await switcher.locator("select").selectOption("13");
  await page.waitForURL(base + "chapter-13.html");
  await switcher.waitFor();
  console.log("PASS class lesson on load and history return, separate resume, all 64 module routes, all eight hubs, and same-module switching");

  for (const invalid of ["{", "null", JSON.stringify({ ...visit, version: 2 }), JSON.stringify({ ...visit, lesson: 99 }), JSON.stringify({ ...visit, module: "../index" }), JSON.stringify({ ...visit, visitedAt: "invalid" })]) {
    await setVisit(page, invalid);
    await home(page);
    assert.equal(await picker.inputValue(), "14");
    assert.equal(await resume.getAttribute("href"), "chapter-14.html");
  }
  await setVisit(page, JSON.stringify({ ...visit, url: "https://example.invalid/escape", route: "javascript:throw 1" }));
  await home(page);
  assert.equal(await resume.getAttribute("href"), "chapter-19-reading.html");
  const stale = structuredClone(navigation);
  delete stale.routes[19].reading;
  const staleRoute = route => route.fulfill({ json: stale });
  await page.route("**/assets/lesson-navigation.json", staleRoute);
  await home(page);
  assert.equal(await resume.getAttribute("href"), "chapter-14.html");
  await goto(page, "chapter-14-reading.html");
  await switcher.locator("select").selectOption("19");
  await page.waitForURL(base + "chapter-19.html");
  await page.unroute("**/assets/lesson-navigation.json", staleRoute);
  await page.route("**/chapter-15-reading.html", async route => {
    const origin = await route.fetch();
    const html = (await origin.text()).replace('class="site-header"', 'class="header-fixture"');
    await route.fulfill({ response: origin, body: html });
  });
  await goto(page, "chapter-15-reading.html");
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).lesson === 15, visitKey);
  assert.equal(await switcher.count(), 0, "visit can be recorded without rendering the switcher");
  await page.unroute("**/chapter-15-reading.html");
  const denied = await isolatedContext();
  await denied.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } }));
  const deniedPage = await denied.newPage();
  await goto(deniedPage, "chapter-15-history.html");
  await deniedPage.locator(".lesson-quick-switcher").waitFor();
  await home(deniedPage);
  assert.equal(await deniedPage.locator("[data-last-visit-link]").getAttribute("href"), "chapter-14.html");
  await denied.close();
  console.log("PASS device-only resume, malformed or missing routes, and disabled storage");

  async function assertCards(target, expected) {
    const cards = target.locator(".post-card");
    assert.deepEqual(await links(cards.locator("a")), expected.map(readerPath));
    for (const [index, post] of expected.entries()) {
      const card = cards.nth(index);
      assert.equal(await card.locator("h2,h3").innerText(), post.title);
      assert.equal(await card.locator("time").getAttribute("datetime"), post.publishedAt);
      assert.equal(await card.locator("p:not(.post-meta)").innerText(), post.summary);
      assert.match(await card.locator(".post-meta").innerText(), new RegExp(post.category));
    }
  }
  async function assertReader(target, post) {
    assert.equal(await target.locator("h1").innerText(), post.title);
    assert.equal(await target.locator('meta[name="description"]').getAttribute("content"), post.summary);
    assert.equal(await target.locator(".reader-heading time").first().getAttribute("datetime"), post.publishedAt);
    if (post.updatedAt) assert.equal(await target.locator(".reader-heading time").last().getAttribute("datetime"), post.updatedAt);
    assert.match(await target.locator(".reader-heading").innerText(), new RegExp(post.category));
    assert.equal(await target.locator("footer .source-credit").count(), 0);
    const related = await links(target.locator(".reader-practice a"));
    assert(related.length >= 1 && related.every(file => Object.values(navigation.routes).some(routes => Object.values(routes).includes(file))));
    assert.deepEqual(await links(target.locator(".reader-returns a")), ["articles.html", "index.html"]);
  }
  for (const file of ["index.html", "articles.html"]) {
    await goto(page, file);
    await page.locator("[data-posts-ready]").waitFor();
    await assertCards(page, file === "index.html" ? sortedPosts.slice(0, 3) : sortedPosts);
  }
  for (const post of posts) {
    await goto(page, readerPath(post));
    await assertReader(page, post);
  }
  await goto(page, "chapter-13-reading.html");
  assert.equal(await page.locator("footer .source-credit").getAttribute("href"), "https://ttrw.jp/");

  const firstPost = sortedPosts[0];
  const artificialPosts = [
    ...sortedPosts.slice(1),
    { ...firstPost, publishedAt: "2026-11-14", updatedAt: "2026-11-20" },
    { ...firstPost, slug: "fixture-newest", publishedAt: "2026-11-16" }
  ];
  const artificialOrder = [...artificialPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug, "en"));
  const fixturePosts = route => route.fulfill({ json: artificialPosts });
  await page.route("**/assets/posts.json", fixturePosts);
  for (const [file, expected] of [["index.html", artificialOrder.slice(0, 3)], ["articles.html", artificialOrder]]) {
    await goto(page, file);
    await page.locator("[data-posts-ready]").waitFor();
    await assertCards(page, expected);
  }
  await page.unroute("**/assets/posts.json", fixturePosts);
  for (const bad of [
    [...posts, { ...firstPost, slug: "../unsafe" }],
    [...posts, { ...firstPost, slug: "bad-date", publishedAt: "2026-02-30" }],
    [...posts, firstPost]
  ]) {
    const invalidPosts = route => route.fulfill({ json: bad });
    await page.route("**/assets/posts.json", invalidPosts);
    await goto(page, "articles.html");
    await assertCards(page, sortedPosts);
    assert.equal(await page.locator("[data-posts-ready]").count(), 0);
    await page.unroute("**/assets/posts.json", invalidPosts);
  }
  const failedFetch = route => route.fulfill({ status: 503 });
  await page.route("**/assets/posts.json", failedFetch);
  await page.route("**/assets/lesson-navigation.json", failedFetch);
  await goto(page, "index.html");
  assert.equal(await picker.isDisabled(), true);
  assert.deepEqual(await links(chapterLinks), modules.map(([module]) => navigation.routes[14][module]));
  await assertCards(page, sortedPosts.slice(0, 3));
  await goto(page, "articles.html");
  await assertCards(page, sortedPosts);
  await page.unroute("**/assets/posts.json", failedFetch);
  await page.unroute("**/assets/lesson-navigation.json", failedFetch);
  const noScript = await isolatedContext({ javaScriptEnabled: false });
  const staticPage = await noScript.newPage();
  await goto(staticPage, "index.html");
  await assertCards(staticPage, sortedPosts.slice(0, 3));
  await staticPage.locator(".post-card a").first().click();
  await assertReader(staticPage, firstPost);
  await staticPage.locator(".reader-returns a").first().click();
  await assertCards(staticPage, sortedPosts);
  await noScript.close();
  console.log("PASS article metadata, publication sorting, links, attribution, and static fallbacks");

  await home(page);
  const summary = page.locator(".site-utilities > summary");
  for (const [trigger, modal] of [
    [".learning-guide-open", ".learning-guide-dialog"],
    ["[data-install-app]", ".install-app-dialog"],
    [".pwa-status", ".pwa-offline-dialog"]
  ]) {
    await summary.focus();
    await page.keyboard.press("Enter");
    const button = page.locator(`.site-utility-panel ${trigger}`);
    await button.focus();
    await page.keyboard.press("Enter");
    const openDialog = page.locator(`${modal}[open]`);
    await openDialog.waitFor();
    assert.equal(await page.locator(".site-utilities").getAttribute("open"), "");
    await page.keyboard.press("Escape");
    await openDialog.waitFor({ state: "hidden" });
    await page.waitForFunction(selector => document.activeElement.matches(selector), `.site-utility-panel ${trigger}`);
    assert.equal(await button.isVisible(), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".site-utilities").getAttribute("open"), null);
    assert.equal(await summary.evaluate(node => node === document.activeElement), true);
  }
  console.log("PASS keyboard opening, dialog Escape, visible trigger focus, and disclosure Escape");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await summary.click();
  await page.locator(".home-page h1").click();
  assert.equal(await page.locator(".site-utilities").getAttribute("open"), null);
  await summary.click();
  await siteLinks.last().click();
  await page.waitForURL(base + "articles.html");

  const touchContext = await isolatedContext({ hasTouch: true, isMobile: true });
  try {
    const touchPage = await touchContext.newPage();
    await home(touchPage);
    const menu = touchPage.locator(".site-utilities");
    await menu.locator("summary").tap();
    await menu.locator(".site-utility-panel").tap({ position: { x: 4, y: 4 } });
    assert.equal(await menu.getAttribute("open"), "");
    await menu.locator(".pwa-status").tap();
    await touchPage.locator(".pwa-offline-dialog[open] [data-offline-close]").tap();
    assert.equal(await menu.getAttribute("open"), "", "closing the dialog must preserve its menu");
    await touchPage.waitForFunction(() => document.activeElement.matches(".site-utility-panel .pwa-status"));
    const blank = { x: 6, y: 125 };
    assert(await touchPage.evaluate(({ x, y }) => {
      const target = document.elementFromPoint(x, y);
      return target && !target.closest(".site-utilities, a, button, summary, label, input");
    }, blank), "dismissal must work on non-interactive space");
    await touchPage.touchscreen.tap(blank.x, blank.y);
    assert.equal(await menu.getAttribute("open"), null);
    assert.equal(touchPage.url(), base + "index.html");
  } finally { await touchContext.close(); }
  console.log("PASS outside-click navigation and touch dismissal with dialog focus restoration");

  async function pendingBadge() {
    const trigger = page.locator(".site-utilities > summary");
    const before = await trigger.boundingBox();
    const accessibleBefore = await trigger.ariaSnapshot();
    await trigger.evaluate(node => {
      node.setAttribute("aria-describedby", "existing-tools-description");
      const note = document.createElement("span");
      note.id = "existing-tools-description";
      note.hidden = true;
      note.textContent = "工具選單";
      node.closest("details").after(note);
    });
    await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent("message", { data: { type: "JPY5_OFFLINE_STATUS", ready: true, updateAvailable: true } })));
    const badge = trigger.locator(".pwa-update-badge");
    const status = page.locator(".site-utility-panel .pwa-status");
    const inlineBadge = status.locator(".pwa-update-badge");
    assert.equal(await badge.count(), 1);
    assert.equal(await badge.isVisible(), true);
    assert.equal(await badge.getAttribute("aria-hidden"), "true");
    assert.equal(await inlineBadge.count(), 1);
    assert.equal(await inlineBadge.isVisible(), false, "inline badge stays inside the closed menu");
    assert.equal(await trigger.getAttribute("aria-describedby"), "existing-tools-description offline-update-notice");
    assert.match(accessibleBefore, /工具/);
    assert.equal(await trigger.ariaSnapshot(), accessibleBefore, "badge must preserve the summary's accessible name");
    assert.equal(await page.locator("#offline-update-notice").getAttribute("role"), "status");
    assert.equal(await page.locator("#offline-update-notice").getAttribute("aria-live"), "polite");
    assert.equal(await page.locator(".site-utilities #offline-update-notice").count(), 0);
    assert.equal(await page.locator(".site-utilities").getAttribute("open"), null);
    assert.deepEqual(await trigger.boundingBox(), before, "badge must not move or resize the tools control");
    const bounds = await badge.boundingBox();
    assert(bounds.x >= before.x + before.width / 2 && bounds.y < before.y, "badge belongs on the upper-right corner");
    assert(bounds.x + bounds.width <= await page.evaluate(() => innerWidth), "badge must fit the viewport");
    const colors = await badge.evaluate(node => {
      const style = getComputedStyle(node);
      return { color: style.color, background: style.backgroundColor, pointerEvents: style.pointerEvents };
    });
    assert.deepEqual(colors, { color: "rgb(255, 255, 255)", background: "rgb(197, 34, 51)", pointerEvents: "none" });
    await trigger.click();
    assert.equal(await inlineBadge.isVisible(), true);
    assert.equal(await inlineBadge.textContent(), "1");
    assert.equal(await page.getByRole("button", { name: "離線內容有更新", exact: true }).count(), 1);
    const labelBounds = await status.locator(".pwa-status-label").boundingBox();
    const inlineBounds = await inlineBadge.boundingBox();
    assert(inlineBounds.x >= labelBounds.x + labelBounds.width && inlineBounds.x - labelBounds.x - labelBounds.width <= 10,
      "inline badge sits immediately after the label");
    await page.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent("message", { data: { type: "JPY5_OFFLINE_STATUS", ready: true, updateAvailable: false } })));
    assert.equal(await badge.isVisible(), false);
    assert.equal(await inlineBadge.isVisible(), false);
    assert.equal(await trigger.getAttribute("aria-describedby"), "existing-tools-description");
    assert.equal(await page.locator("#offline-update-notice").textContent(), "");
    await page.keyboard.press("Escape");
  }

  async function noOverflow(width, selector) {
    const sizing = await page.evaluate(selector => ({
      document: document.documentElement.scrollWidth, viewport: innerWidth,
      linkBounds: Array.from(document.querySelectorAll(selector), node => {
        const bounds = node.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, bottom: bounds.bottom };
      })
    }), selector);
    assert(sizing.document <= sizing.viewport + 1, `${page.url()} overflows at ${width}px`);
    assert(sizing.linkBounds.every(({ left, right }) => left >= 0 && right <= width), `navigation clips at ${width}px`);
    return sizing.linkBounds;
  }
  const surfaces = [
    ["home", "index.html", ".home-module-nav a"],
    ["article", readerPath(firstPost), ".reader-practice a"],
    ["archive", "articles.html", ".post-card a"],
    ["study", "chapter-18-history.html", ".lesson-quick-sections a"]
  ];
  for (const [layout, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844], ["narrow", 320, 780], ["tablet", 768, 1024]]) {
    await page.setViewportSize({ width, height });
    for (const theme of ["light", "dark"]) {
      await setVisit(page, "null");
      await home(page);
      await selectTheme(page, theme);
      for (const [name, file, selector] of surfaces) {
        if (name !== "home") await goto(page, file);
        await page.locator(selector).first().waitFor();
        if (name === "study") await selectTheme(page, theme);
        assert.equal(await page.locator("html").getAttribute("data-theme"), theme, file);
        const bounds = await noOverflow(width, selector);
        if (name === "home" && width === 390) assert(bounds.every(({ bottom }) => bottom < height), "all eight shortcuts must fit in the initial mobile viewport");
        if (name !== "study") {
          await pendingBadge();
          await summary.click();
          await noOverflow(width, ".site-utility-panel button,.site-utility-panel a");
          await page.keyboard.press("Escape");
          await page.locator(".home-page h1,.reader-heading h1,.archive-page h1").click();
        } else {
          assert.equal(await page.locator(".pwa-update-badge,#offline-update-notice").count(), 0);
          assert.equal(await page.locator(".site-header > .pwa-status").isVisible(), true);
        }
        if (screenshots && (layout === "desktop" || layout === "mobile") && name !== "archive") {
          await page.screenshot({ path: join(screenshots, `${name}-${layout}-${theme}.png`) });
        }
      }
    }
  }
  await context.close();
  console.log("PASS light and dark at 320, 390, 768 and 1440 px, including all shortcuts above the fold at 390×844");

  const offline = await isolatedContext({ serviceWorkers: "allow" });
  const onlinePage = await offline.newPage();
  await home(onlinePage);
  await onlinePage.waitForFunction(() => navigator.serviceWorker.controller && document.querySelector(".pwa-status")?.dataset.state === "online");
  await onlinePage.locator(".site-utilities > summary").click();
  await onlinePage.locator(".pwa-status").click();
  await onlinePage.locator("[data-offline-download]").click();
  await onlinePage.waitForFunction(() => document.querySelector(".pwa-status")?.dataset.state === "ready", null, { timeout: 90000 });
  await onlinePage.close();
  await offline.setOffline(true);
  const freshHome = await offline.newPage();
  await home(freshHome);
  await freshHome.locator("[data-posts-ready]").waitFor();
  await assertCards(freshHome, sortedPosts.slice(0, 3));
  const freshArchive = await offline.newPage();
  await goto(freshArchive, "articles.html");
  await freshArchive.locator("[data-posts-ready]").waitFor();
  await assertCards(freshArchive, sortedPosts);
  for (const post of posts) {
    const freshReader = await offline.newPage();
    await goto(freshReader, readerPath(post));
    await assertReader(freshReader, post);
    await freshReader.locator(".reader-practice a").first().click();
    await freshReader.locator(".lesson-quick-sections [aria-current=page]").waitFor();
    await freshReader.close();
  }
  await offline.close();
  console.log("PASS fresh tabs offline after explicit download: home, archive, every reader and related study links");
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
