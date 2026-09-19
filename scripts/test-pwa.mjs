#!/usr/bin/env node
import assert from "node:assert/strict";
import vm from "node:vm";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const pages = (await readdir(root)).filter(name => name.endsWith(".html")).sort();
const manifestSource = await readFile(join(root, "assets", "offline-assets.js"), "utf8");
const assetMatches = [...manifestSource.matchAll(/^  "([^"]+)"/gm)].map(match => match[1]);
const manifest = JSON.parse(await readFile(join(root, "manifest.webmanifest"), "utf8"));
const serviceWorker = await readFile(join(root, "sw.js"), "utf8");
const pwa = await readFile(join(root, "assets", "pwa.js"), "utf8");
const styles = await readFile(join(root, "assets", "styles.css"), "utf8");
const analytics = await readFile(join(root, "assets", "analytics.js"), "utf8");
const navigation = JSON.parse(await readFile(join(root, "assets", "lesson-navigation.json"), "utf8"));
const quickSwitcher = await readFile(join(root, "assets", "lesson-quick-switcher.js"), "utf8");
const home = await readFile(join(root, "index.html"), "utf8");
const learningGuide = await readFile(join(root, "assets", "learning-guide.js"), "utf8");

assert.equal(new Set(assetMatches).size, assetMatches.length, "offline inventory has duplicate entries");
for (const asset of assetMatches) await stat(join(root, asset));
for (const page of pages) {
  const html = await readFile(join(root, page), "utf8");
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/, `${page} has no app manifest`);
  assert.match(html, /<script src="assets\/pwa\.js" defer><\/script>/, `${page} does not register the PWA`);
  assert.match(html, /<script src="assets\/analytics\.js" defer><\/script>/, `${page} does not load production analytics`);
  assert(assetMatches.includes(page), `${page} is missing from the offline inventory`);
}
assert.equal(pages.length, 55, "unexpected page count; review the offline inventory");
assert.equal(manifest.scope, "/jpy5/");
assert.equal(manifest.start_url, "/jpy5/");
assert.match(serviceWorker, /importScripts\("assets\/offline-assets\.js"\)/);
assert.match(serviceWorker, /await caches\.delete\(CACHE_NAME\)/, "failed candidates must be removed");
assert.doesNotMatch(serviceWorker, /skipWaiting\(\);\s*\/\//, "service worker must not auto-activate");
assert.match(serviceWorker, /JPY5_SKIP_WAITING/, "activation must require an explicit page message");
assert.doesNotMatch(serviceWorker, /localStorage|indexedDB/, "service worker must not touch learner data stores");
assert.match(serviceWorker, /const activeVersion = await caches\.open\(CACHE_NAME\)/);
assert.match(serviceWorker, /activeVersion\.match\(request, \{ ignoreSearch: true \}\)/, "an active worker must read only its own versioned cache");
assert.match(pwa, /visibilitychange/);
assert.match(pwa, /addEventListener\("online"/);
assert.match(pwa, /立即更新/);
assert.match(pwa, /稍後/);
assert.match(pwa, /brand\.insertAdjacentElement\("afterend", status\)/, "status must be placed after the header brand");
assert.match(pwa, /label: "已下載"/);
assert.match(pwa, /label: "離線可用"/);
assert.match(pwa, /label: "下載中"/);
assert.match(pwa, /label: "下載未完成"/);
assert.match(styles, /\.pwa-status\{display:inline-flex/);
assert.match(styles, /\.pwa-status\{grid-column:1\/-1;grid-row:2/, "narrow headers need a second status row");
assert.match(styles, /@media\(max-width:1200px\)\{\.vocab-complete-layout\{grid-template-columns:minmax\(0,1fr\)/, "iPad vocabulary panels must stack");
assert.match(styles, /\.vocab-row em\{display:block;grid-column:2\/-1\}/, "mobile rows must retain the word type");
assert.deepEqual(navigation.lessons, [13, 14, 15, 16, 17, 18], "lesson navigation must be generated from the available lesson pages");
for (const lesson of navigation.lessons) {
  for (const module of ["vocabulary", "notes", "reading", "textbook", "review"]) {
    assert.equal(navigation.routes[lesson][module], `chapter-${lesson}-${module}.html`, `lesson ${lesson} is missing ${module} navigation`);
  }
}
const mainModulePages = pages.filter(page => /^chapter-\d+-(vocabulary|notes|reading|textbook|review)\.html$/.test(page));
for (const page of mainModulePages) {
  const html = await readFile(join(root, page), "utf8");
  assert.match(html, /assets\/lesson-quick-switcher\.js\?v=2/, `${page} must load the consolidated navigation`);
}
assert.equal(mainModulePages.length, 30, "all five modules must have one consolidated navigation entry per lesson");
assert.match(quickSwitcher, /\["textbook", "聆聽"\]/, "Listening must remain in module navigation");
assert.match(quickSwitcher, /\["review", "複習"\]/, "Review must remain in module navigation");
assert.match(quickSwitcher, /document\.querySelectorAll\("\.module-lesson-switcher,.reading-controls \.lesson-pills"\)\.forEach\(nav => nav\.remove\(\)\)/, "legacy duplicate lesson navigation must be removed");
assert.doesNotMatch(quickSwitcher, /const lessons\s*=\s*\[/, "available lessons must not be hardcoded in the browser navigation");
assert.match(home, /class="header-guide-button learning-guide-open"/, "homepage header must retain the learning guide trigger");
assert.doesNotMatch(home, /learning-guide-preview|learning-guide-card/, "homepage must not render a learning guide content section");
assert(home.indexOf("header-guide-button") < home.indexOf("<main>"), "learning guide access must stay outside homepage content");
assert.match(learningGuide, /document\.documentElement\.classList\.add\("learning-guide-open"\)/, "guide opening must lock root scrolling");
assert.match(learningGuide, /document\.documentElement\.classList\.remove\("learning-guide-open"\)/, "guide closing must restore root scrolling");
assert.match(learningGuide, /window\.scrollTo\(0, savedScrollY\)/, "guide closing must restore the prior scroll position");
assert.match(styles, /\.learning-guide-dialog\[open\]\{position:fixed;inset:0\}/, "guide dialog must be centred independently of page scroll");
assert.match(styles, /html\.learning-guide-open\{overflow:hidden\}/, "guide modal must prevent background scrolling");
assert.match(styles, /\.grammar-extra-body\{flex:1 1 auto;min-height:0;max-height:none;overflow-x:hidden;overflow-y:auto\}/, "only the modal body may scroll");
assert.match(styles, /\.grammar-extra-dialog:not\(\[open\]\)\{display:none\}/, "closed grammar dialogs must not enter the page layout");
assert.match(styles, /\.grammar-extra-dialog\[open\]\{display:flex;flex-direction:column\}/, "grammar dialogs must use the flex frame only while open");
assert.match(await readFile(join(root, "assets", "notes.js"), "utf8"), /dialog\.replaceChildren\(\)/, "closed grammar dialogs must discard their generated content");
assert.match(analytics, /location\.origin !== "https:\/\/sasukimm\.github\.io"/);
assert.match(analytics, /location\.pathname\.startsWith\("\/jpy5\/"\)/);
assert.match(analytics, /https:\/\/sasukimm-jp5y\.goatcounter\.com\/count/);
assert.match(analytics, /https:\/\/gc\.zgo\.at\/count\.js/);
assert.match(analytics, /__JPY5_GOATCOUNTER_LOADED/);
assert.doesNotMatch(analytics, /sasukimm\.goatcounter\.com/);

function analyticsLoads(origin, pathname) {
  const appended = [];
  const context = {
    location: { origin, pathname },
    window: {},
    document: {
      querySelector: () => null,
      createElement: () => ({ dataset: {} }),
      head: { append: script => appended.push(script) }
    }
  };
  vm.runInNewContext(analytics, context);
  return appended;
}
const publicScripts = analyticsLoads("https://sasukimm.github.io", "/jpy5/");
assert.equal(publicScripts.length, 1, "public GitHub Pages deployment must load GoatCounter");
assert.equal(publicScripts[0].dataset.goatcounter, "https://sasukimm-jp5y.goatcounter.com/count");
assert.equal(analyticsLoads("https://yuktun.github.io", "/jpy5/").length, 0, "development GitHub Pages must not load GoatCounter");
assert.equal(analyticsLoads("http://localhost:8765", "/jpy5/").length, 0, "localhost must not load GoatCounter");
assert.equal(analyticsLoads("https://sasukimm.github.io", "/other/").length, 0, "unrelated public paths must not load GoatCounter");

console.log(`PWA checks passed: ${pages.length} pages and ${assetMatches.length} cached resources.`);


