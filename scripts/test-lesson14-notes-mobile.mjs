import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { chromium, webkit, devices } from 'playwright';

const root = process.cwd(), folder = resolve('tmp/lesson14-grammar-mobile');
await mkdir(folder, { recursive: true });
const server = createServer(async (req, res) => {
  const file = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + sep) || /node_modules|private-migration|\.git/.test(file)) return res.writeHead(403).end();
  try {
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' })[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}/`;
const engine = process.env.JPY5_BROWSER_ENGINE || 'chromium';
const browser = await (engine === 'webkit' ? webkit : chromium).launch({ headless: true, ...(engine === 'chromium' ? { channel: process.env.JPY5_BROWSER_CHANNEL || 'msedge' } : {}) });
const context = await browser.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
await context.route('https://**/*', route => route.abort());
const page = await context.newPage(), errors = [];
page.on('pageerror', error => errors.push(error.message));
const instant = async where => page.evaluate(where => {
  document.documentElement.style.scrollBehavior = 'auto';
  scrollTo(0, where === 'bottom' ? document.documentElement.scrollHeight : where);
  document.documentElement.style.scrollBehavior = '';
}, where);
const content = () => page.locator('.note-card').evaluateAll(cards => cards.map(card => ({
  examples: [...card.querySelectorAll('.example')].map(example => example.outerHTML),
  heading: card.querySelector('h3').innerHTML,
  meaning: card.querySelector('.meaning').innerHTML,
  formation: card.querySelector('.formation').innerHTML,
  usage: card.querySelector('.usage-note').innerHTML,
  contrast: card.querySelector('.contrast-note').innerHTML,
  teacher: card.querySelector('[data-teacher-grammar]')?.outerHTML,
  textbook: card.querySelector('.textbook-practice')?.outerHTML
})));
const tapVisible = async locator => {
  const box = await locator.boundingBox();
  assert(box && box.y >= 0 && box.y + box.height <= page.viewportSize().height + 1, 'tap target already visible without auto-scroll');
  assert(box.width >= 44 && box.height >= 44, 'touch target at least 44px');
  assert(await locator.evaluate(node => {
    const box = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  }), 'touch target receives the hit without obstruction');
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
};
const screenshot = async name => {
  // Let the browser's transient touch feedback fade before recording its colors.
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${folder}/${engine}-${name}.png`, scale: 'css' });
};
const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
const toc = page.locator('#ch14-grammar-toc'), trigger = page.locator('.ch14-toc-trigger');
const jump = async id => {
  await instant('bottom');
  await tapVisible(trigger);
  assert.equal(await toc.locator('[aria-current="location"]').getAttribute('href'), await toc.locator('a').last().getAttribute('href'));
  await tapVisible(toc.locator(`a[href="#ch14-grammar-${id}"]`));
  assert.equal(await toc.isVisible(), false);
  const heading = page.locator(`#ch14-grammar-${id}`), box = await heading.boundingBox();
  assert(box.y >= 15 && box.y < 20, `unobscured title after two taps: ${id} at ${box.y}`);
  assert(await heading.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  }), 'landed title receives the hit without header or overlay obstruction');
  assert.equal(await heading.evaluate(node => node === document.activeElement), true);
  assert.equal(await toc.locator('[aria-current="location"]').getAttribute('href'), `#ch14-grammar-${id}`);
};
try {
  // Capture actual shared renderer output before enhancement; compare all source content.
  await page.route('**/assets/ch14-notes-mobile.js*', route => route.abort());
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(base + 'chapter-14-notes.html');
  await page.locator('.lesson-quick-switcher').waitFor();
  const original = await content();
  const desktopCards = await page.locator('.note-card').evaluateAll(nodes => nodes.map(node => ({ width: node.offsetWidth, height: node.offsetHeight })));
  await page.unroute('**/assets/ch14-notes-mobile.js*');
  await page.reload();
  await trigger.waitFor({ state: 'attached' });
  assert.deepEqual(await content(), original, 'Japanese, ruby, Chinese, explanations and teacher/textbook DOM preserved');
  assert.deepEqual(await page.locator('.note-card').evaluateAll(nodes => nodes.map(node => ({ width: node.offsetWidth, height: node.offsetHeight }))), desktopCards, 'desktop card dimensions unchanged');
  assert.equal(await page.locator('.examples-list .example:visible').count(), 46);
  assert.equal(await trigger.isVisible(), false);
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await screenshot('desktop');
  const data = await page.evaluate(() => window.JPY5_DATA.patterns.map(pattern => ({ id: pattern.id, title: pattern.title, count: pattern.examples.length })));
  assert.equal(data.length, 11);
  assert.equal(await page.locator('.ch14-examples-toggle').count(), 9);
  assert.deepEqual(await toc.locator('a').evaluateAll(links => links.map(link => link.querySelector('[lang="ja"]').textContent)), data.map(pattern => pattern.title));
  assert.equal(await page.locator('audio').count(), 0, 'grammar page has no original media control to change');

  for (const [width, height] of [[320, 568], [390, 844], [680, 900]]) {
    await page.setViewportSize({ width, height });
    await page.reload();
    await trigger.waitFor({ state: 'visible' });
    await page.locator('.lesson-quick-switcher').waitFor();
    await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
    await noOverflow();
    assert.equal(await page.locator('.examples-list .example:visible').count(), 22);
    assert.deepEqual(await content(), original);
    const buttonBox = await trigger.boundingBox();
    const clear = await page.locator('main, footer').evaluateAll((nodes, x) => nodes.every(node => {
      if (node.tagName === 'MAIN') return [...node.children].every(child => child.getBoundingClientRect().right <= x - 7);
      const range = document.createRange(); range.selectNodeContents(node);
      return [...range.getClientRects()].every(rect => rect.right <= x - 7);
    }), buttonBox.x);
    assert(clear, 'dedicated gutter clears reading surfaces and footer');
    await jump('sai');
    await screenshot(`${width}-landed-sai`);
    await jump('uchini');
    const toggle = page.locator('[data-grammar-id="uchini"] .ch14-examples-toggle');
    assert.equal(await toggle.textContent(), '顯示其餘 8 句');
    await toggle.scrollIntoViewIfNeeded();
    const before = (await toggle.boundingBox()).y;
    await tapVisible(toggle);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert(Math.abs((await toggle.boundingBox()).y - before) < 2, 'expand keeps toggle position');
    assert.equal(await page.locator('[data-grammar-id="uchini"] .example:visible').count(), 10);
    assert(await trigger.evaluate(node => {
      const box = node.getBoundingClientRect();
      return getComputedStyle(node).position === 'fixed' && box.bottom <= innerHeight &&
        node === document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    }), 'fixed TOC stays visible and receives touches after expansion');
    await screenshot(`${width}-expanded`);
    await tapVisible(toggle);
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert(Math.abs((await toggle.boundingBox()).y - before) < 2, 'collapse keeps toggle position');
    assert(await page.evaluate(() => scrollY > 1000), 'collapse does not return to page top');
    for (const pattern of data) {
      const card = page.locator(`[data-grammar-id="${pattern.id}"]`), control = card.locator('.ch14-examples-toggle');
      if (pattern.count > 2) {
        assert.equal(await control.textContent(), `顯示其餘 ${pattern.count - 2} 句`);
        await control.click();
        assert.equal(await card.locator('.example:visible').count(), pattern.count);
        await control.click();
      } else assert.equal(await control.count(), 0);
    }
    await instant('bottom');
    const saved = await page.evaluate(() => scrollY);
    await tapVisible(trigger);
    await screenshot(`${width}-sheet`);
    assert.equal(await toc.locator('a').count(), 11);
    assert.equal(await toc.locator('[aria-current="location"]').count(), 1);
    await noOverflow();
    if (width === 320 || width === 390) {
      const last = await toc.locator('a').last().boundingBox();
      assert(last.y + last.height <= height, 'all 11 normal-sized targets fit phone sheet');
    }
    await page.keyboard.press('Escape');
    assert.equal(await toc.isVisible(), false);
    assert(Math.abs(await page.evaluate(() => scrollY) - saved) < 2, 'Escape restores document position');
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    await tapVisible(trigger);
    await tapVisible(toc.locator('.ch14-toc-close'));
    assert.equal(await toc.isVisible(), false, 'close button dismissal');
    assert(Math.abs(await page.evaluate(() => scrollY) - saved) < 2);
    await tapVisible(trigger);
    const sheetBox = await toc.boundingBox();
    assert(sheetBox.y >= 10);
    await page.touchscreen.tap(10, sheetBox.y / 2);
    assert.equal(await toc.isVisible(), false, 'backdrop dismissal');
    assert(Math.abs(await page.evaluate(() => scrollY) - saved) < 2);
    await tapVisible(trigger);
    await page.setViewportSize({ width: 1280, height: 900 });
    assert.equal(await toc.isVisible(), false, 'desktop resize closes sheet');
    assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).position), 'static');
    assert.equal(await page.locator('.examples-list .example:visible').count(), 46);
    await page.setViewportSize({ width, height });
    for (const selector of ['.textbook-practice', '[data-teacher-grammar]']) {
      const details = page.locator(`.note-card > ${selector}`).first();
      const summary = details.locator(':scope > summary');
      await instant(await summary.evaluate(node => scrollY + node.getBoundingClientRect().top - 100));
      await tapVisible(summary);
      assert.equal(await details.getAttribute('open'), '');
      await noOverflow();
      await tapVisible(summary);
    }
    await page.locator('[data-extra-id="sai"]').click();
    assert.equal(await page.locator('#grammar-extra-dialog').isVisible(), true);
    assert.equal(await toc.isVisible(), false);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#grammar-extra-dialog').isVisible(), false);
    await instant(0);
    assert.equal(await page.locator('.lesson-quick-sections a').count(), 8);
    assert.equal(await page.locator('.lesson-select').isVisible(), true);
  }
  await page.setViewportSize({ width: 681, height: 900 });
  assert.equal(await trigger.isVisible(), false, '680px boundary');
  assert.equal(await page.locator('.examples-list .example:visible').count(), 46);
  for (const lesson of [13, 15]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}chapter-${lesson}-notes.html`);
    assert.equal(await page.locator('.ch14-toc-trigger, .ch14-examples-toggle').count(), 0);
    assert.equal(await page.locator('.examples-list .example:visible').count(), await page.locator('.examples-list .example').count());
    await noOverflow();
  }
  assert.deepEqual(errors, []);
  console.log(`Lesson 14 mobile notes passed (${engine}): 320/390/680 touch, 681/1280 desktop, 11 patterns/46 preserved examples, modal/focus/scroll/geometry and neighboring lessons. Screenshots: ${folder}`);
} finally { await browser.close(); await new Promise(done => server.close(done)); }
