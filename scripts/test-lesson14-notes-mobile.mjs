// Stable command name; the Lesson 14 pilot now covers all eight notes pages.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { chromium, webkit, devices } from 'playwright';

const root = process.cwd(), folder = resolve('tmp/grammar-notes-mobile');
const screenshots = process.env.JPY5_SCREENSHOTS === '1';
if (screenshots) await mkdir(folder, { recursive: true });
const expected = { 13: [8, 25], 14: [11, 46], 15: [9, 32], 16: [10, 40], 17: [10, 36], 18: [8, 39], 19: [8, 36], 20: [12, 48] };
const server = createServer(async (req, res) => {
  const file = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + sep) || /node_modules|private-migration|\.git/.test(file)) return res.writeHead(403).end();
  try {
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' })[extname(file)] || 'application/octet-stream');
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
const cards = () => page.locator('.grammar-grid[data-group] > .note-card');
const instant = async where => { await page.evaluate(where => {
  const root = document.documentElement, previous = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  scrollTo(0, where === 'bottom' ? root.scrollHeight : where);
  root.style.scrollBehavior = previous;
}, where); await page.evaluate(() => new Promise(requestAnimationFrame)); };
// Compare all extant main content, including ruby, translations, teacher panels,
// textbook exercises and L17's appendix, after removing only our enhancement.
const content = () => page.locator('main').evaluate(node => {
  const copy = node.cloneNode(true);
  copy.querySelectorAll('.ch14-examples-toggle').forEach(node => node.remove());
  copy.querySelectorAll('.ch14-examples-rest').forEach(node => node.replaceWith(...node.childNodes));
  copy.querySelectorAll('[data-grammar-id]').forEach(card => {
    card.removeAttribute('data-grammar-id');
    const heading = card.querySelector(':scope > h3');
    heading.removeAttribute('id'); heading.removeAttribute('tabindex');
  });
  return copy.innerHTML;
});
const geometry = () => cards().evaluateAll(nodes => nodes.map(node => ({ width: node.offsetWidth, height: node.offsetHeight })));
const tapVisible = async locator => {
  const box = await locator.boundingBox();
  assert(box && box.y >= 0 && box.y + box.height <= page.viewportSize().height + 1, `target visible before touch: ${locator} ${JSON.stringify(box)} at ${JSON.stringify(page.viewportSize())}`);
  assert(box.width >= 44 && box.height >= 44, '44px touch target');
  assert(await locator.evaluate(node => {
    const box = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  }), 'touch target unobstructed');
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
};
const screenshot = async name => {
  if (!screenshots) return;
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${folder}/${engine}-${name}.png`, scale: 'css' });
};
const noOverflow = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
const trigger = page.locator('.ch14-toc-trigger'), toc = page.locator('.ch14-toc-sheet');
const jump = async (lesson, pattern) => {
  await instant('bottom');
  await tapVisible(trigger);
  assert.equal(await toc.locator('[aria-current="location"]').getAttribute('href'), await toc.locator('a').last().getAttribute('href'));
  await tapVisible(toc.locator(`a[href="#ch${lesson}-grammar-${pattern.id}"]`));
  assert.equal(await toc.isVisible(), false);
  const heading = page.locator(`#ch${lesson}-grammar-${pattern.id}`), box = await heading.boundingBox();
  assert(box.y >= 15 && box.y < 20, `unobscured title after two taps: lesson ${lesson}/${pattern.id} at ${box.y}`);
  assert(await heading.evaluate(node => {
    const rect = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  }), 'landed heading unobstructed');
  assert.equal(await heading.evaluate(node => node === document.activeElement), true);
  assert.equal(await toc.locator('[aria-current="location"]').getAttribute('href'), `#ch${lesson}-grammar-${pattern.id}`);
};
const assetRoute = '**/assets/ch14-notes-mobile.js*';
try {
  for (const [lesson, [patternCount, exampleCount]] of Object.entries(expected)) {
    const url = `${base}chapter-${lesson}-notes.html`;
    let original;
    for (const width of [681, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.route(assetRoute, route => route.abort());
      await page.goto(url);
      await page.locator('.lesson-quick-switcher').waitFor();
      const baseline = await content(), desktopCards = await geometry();
      original ??= baseline;
      await page.unroute(assetRoute);
      await page.reload();
      await trigger.waitFor({ state: 'attached' });
      assert.equal(await content(), baseline, `lesson ${lesson}: full source content preserved at ${width}px`);
      assert.deepEqual(await geometry(), desktopCards, `lesson ${lesson}: desktop geometry preserved at ${width}px`);
      assert.equal(await cards().locator('.examples-list .example:visible').count(), exampleCount);
      assert.equal(await trigger.isVisible(), false);
    }
    const data = await page.evaluate(() => window.JPY5_DATA.patterns.map(pattern => ({ id: pattern.id, title: pattern.title, count: pattern.examples.length })));
    assert.equal(data.length, patternCount);
    assert.equal(data.reduce((sum, p) => sum + p.count, 0), exampleCount);
    assert.equal(await cards().count(), patternCount);
    assert.equal(await page.locator('.ch14-examples-toggle').count(), data.filter(p => p.count > 2).length);
    assert.deepEqual(await toc.locator('a').evaluateAll(links => links.map(link => ({ href: link.getAttribute('href'), title: link.querySelector('[lang="ja"]').textContent }))), data.map(p => ({ href: `#ch${lesson}-grammar-${p.id}`, title: p.title })));
    if (lesson === '17') {
      const appendix = page.locator('[data-textbook-unmatched-pattern="ue"]');
      assert.equal(await appendix.count(), 1);
      assert.equal(await appendix.locator('.ch14-examples-toggle, [data-grammar-id]').count(), 0);
      assert.equal(await toc.locator('a[href$="-ue"]').count(), 0);
    }
    for (const [width, height] of [[320, 568], [390, 844], [680, 900]]) {
      await page.setViewportSize({ width, height });
      await page.reload();
      await trigger.waitFor({ state: 'visible' });
      await page.locator('.lesson-quick-switcher').waitFor();
      await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
      await noOverflow();
      assert.equal(await cards().locator('.examples-list .example:visible').count(), data.reduce((sum, p) => sum + Math.min(2, p.count), 0));
      assert.equal(await content(), original);
      const buttonBox = await trigger.boundingBox();
      assert(await page.locator('main, footer').evaluateAll((nodes, x) => nodes.every(node => {
        if (node.tagName === 'MAIN') return [...node.children].every(child => child.getBoundingClientRect().right <= x - 7);
        const range = document.createRange(); range.selectNodeContents(node);
        return [...range.getClientRects()].every(rect => rect.right <= x - 7);
      }), buttonBox.x), 'dedicated gutter clears main and footer');
      await jump(lesson, data[0]);
      if (width === 390 && ['13', '20'].includes(lesson)) await screenshot(`lesson${lesson}-${width}-landed`);
      const representative = data.find(p => p.count > 2);
      await jump(lesson, representative);
      const card = page.locator(`[data-grammar-id="${representative.id}"]`), toggle = card.locator('.ch14-examples-toggle');
      await toggle.scrollIntoViewIfNeeded();
      const before = (await toggle.boundingBox()).y;
      await tapVisible(toggle);
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert(Math.abs((await toggle.boundingBox()).y - before) < 2, 'expand keeps toggle position');
      assert.equal(await card.locator('.example:visible').count(), representative.count);
      assert(await trigger.evaluate(node => {
        const box = node.getBoundingClientRect();
        return getComputedStyle(node).position === 'fixed' && box.bottom <= innerHeight && node === document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      }), 'fixed trigger receives touches after expansion');
      await tapVisible(toggle);
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert(Math.abs((await toggle.boundingBox()).y - before) < 2, 'collapse keeps toggle position');
      // Dispatch every real button handler without repeated auto-scroll animations.
      assert.deepEqual(await cards().evaluateAll(nodes => nodes.map(card => {
        const control = card.querySelector('.ch14-examples-toggle');
        const visible = () => [...card.querySelectorAll('.examples-list .example')].filter(node => getComputedStyle(node).display !== 'none' && node.getClientRects().length).length;
        const result = { count: visible(), label: control?.textContent ?? null };
        if (control) {
          control.click(); result.expanded = visible(); result.aria = control.getAttribute('aria-expanded');
          control.click(); result.collapsed = visible();
        }
        return result;
      })), data.map(p => ({ count: Math.min(2, p.count), label: p.count > 2 ? `顯示其餘 ${p.count - 2} 句` : null, ...(p.count > 2 ? { expanded: p.count, aria: 'true', collapsed: 2 } : {}) })));
      await instant('bottom');
      const saved = await page.evaluate(() => scrollY);
      await tapVisible(trigger);
      assert.equal(await toc.locator('a').count(), patternCount);
      assert.equal(await toc.locator('[aria-current="location"]').count(), 1);
      assert.equal(await toc.locator('.ch14-toc-list').evaluate(node => node.scrollTop), 0);
      await noOverflow();
      if (lesson === '20' && width === 320) {
        const list = toc.locator('.ch14-toc-list');
        assert(await list.evaluate(node => node.scrollHeight > node.clientHeight), '12-item short-phone sheet scrolls');
        const top = await page.locator('main').evaluate(node => node.getBoundingClientRect().top);
        await list.evaluate(node => { node.scrollTop = node.scrollHeight; });
        assert.equal(await page.locator('main').evaluate(node => node.getBoundingClientRect().top), top, 'sheet scroll leaves background fixed');
        await screenshot(`lesson20-${width}-sheet-last`);
        await tapVisible(toc.locator('a').last());
        const last = page.locator(`#ch20-grammar-${data.at(-1).id}`);
        assert.equal(await last.evaluate(node => node === document.activeElement), true);
        assert((await last.boundingBox()).y < height, 'last TOC target reached');
        await instant('bottom'); await tapVisible(trigger);
      }
      await page.keyboard.press('Escape');
      assert.equal(await toc.isVisible(), false);
      assert(Math.abs(await page.evaluate(() => scrollY) - saved) < 2, 'Escape restores document position');
      assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
      await tapVisible(trigger); await tapVisible(toc.locator('.ch14-toc-close'));
      assert.equal(await toc.isVisible(), false, 'close button');
      assert(Math.abs(await page.evaluate(() => scrollY) - saved) < 2);
      await tapVisible(trigger);
      const sheetBox = await toc.boundingBox();
      assert(sheetBox.y >= 10);
      await page.touchscreen.tap(10, sheetBox.y / 2);
      assert.equal(await toc.isVisible(), false, 'backdrop dismissal');
      assert(Math.abs(await page.evaluate(() => scrollY) - saved) < 2);
      await tapVisible(trigger); await page.setViewportSize({ width: 1280, height: 900 });
      await page.waitForFunction(() => !document.querySelector('.ch14-toc-sheet').open && !document.body.classList.contains('ch14-toc-open'));
      assert.equal(await toc.isVisible(), false, 'desktop resize closes sheet');
      assert.equal(await page.locator('body').evaluate(node => getComputedStyle(node).position), 'static');
      assert.equal(await cards().locator('.examples-list .example:visible').count(), exampleCount);
      await page.setViewportSize({ width, height });
      for (const selector of ['.textbook-practice', '[data-teacher-grammar]', '[data-oct17-grammar]']) {
        const details = cards().locator(`:scope > ${selector}`).first();
        if (!await details.count()) continue;
        const summary = details.locator(':scope > summary');
        await instant(await summary.evaluate(node => scrollY + node.getBoundingClientRect().top - 100));
        await tapVisible(summary);
        assert.equal(await details.getAttribute('open'), '');
        await noOverflow(); await tapVisible(summary);
      }
      const extra = page.locator('[data-extra-id]').first();
      if (await extra.count()) {
        await extra.click();
        assert.equal(await page.locator('#grammar-extra-dialog').isVisible(), true);
        assert.equal(await toc.isVisible(), false);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#grammar-extra-dialog').isVisible(), false);
      }
      await instant(0);
      assert.equal(await page.locator('.lesson-quick-sections a').count(), 8);
      assert.equal(await page.locator('.lesson-select').isVisible(), true);
    }
    console.log(`Lesson ${lesson}: ${patternCount} patterns/${exampleCount} examples; mobile 320/390/680, desktop 681/1280; content, geometry, touch, focus, modal and scroll passed (${engine}).`);
  }
  // Existing Oct17 summary IDs and automatic disclosure deep links still work.
  await page.goto(`${base}chapter-13-notes.html`);
  const teacherId = await page.locator('[id^="teacher-oct17-"]').first().getAttribute('id');
  await page.goto('about:blank');
  await page.goto(`${base}chapter-13-notes.html#${teacherId}`);
  await page.locator(`#${teacherId}`).waitFor({ state: 'visible' });
  assert((await page.locator(`#${teacherId}`).boundingBox()).y >= 0, 'existing teacher deep link scrolls to visible summary');
  assert.equal(await page.locator(`#${teacherId}`).evaluate(node => node.closest('details').open), false, 'teacher disclosure retains closed default');
  assert.equal(await trigger.count(), 1);
  // Cached pilot HTML with v1 references keeps the same Lesson 14 heading IDs.
  await page.route('**/chapter-14-notes.html', async route => route.fulfill({ contentType: 'text/html', body: (await readFile('chapter-14-notes.html', 'utf8')).replaceAll('notes-mobile.css?v=2', 'notes-mobile.css?v=1').replaceAll('notes-mobile.js?v=2', 'notes-mobile.js?v=1') }));
  await page.goto(`${base}chapter-14-notes.html`);
  await page.locator('#ch14-grammar-sai').waitFor();
  await page.unroute('**/chapter-14-notes.html');
  // Malformed source or DOM must leave the rendered grammar notes untouched.
  // Dictogloss manages its own form and audio notice independently.
  const script = await readFile('assets/ch14-notes-mobile.js', 'utf8');
  const snapshotNotes = () => {
    const main = document.querySelector('main').cloneNode(true);
    main.querySelector('#grammar-dictogloss')?.remove();
    return main.innerHTML;
  };
  for (const mutation of [
    'window.JPY5_DATA.patterns[1].id = window.JPY5_DATA.patterns[0].id;',
    'window.JPY5_DATA.patterns.reverse();',
    'document.querySelector(".examples-list > .example").remove();',
    'document.querySelector(".examples-list").append(document.createElement("span"));',
    'document.querySelector(".grammar-grid").dataset.group = "invalid";'
  ]) {
    await page.route(assetRoute, route => route.fulfill({ contentType: 'text/javascript', body: `${mutation} window.__beforeEnhancement = { main: (${snapshotNotes})(), bodyClass: document.body.className };\n${script}` }));
    await page.goto(`${base}chapter-14-notes.html`);
    assert.equal(await trigger.count(), 0, 'invalid shape does not enhance');
    assert.equal(await page.evaluate(snapshotNotes), await page.evaluate(() => window.__beforeEnhancement.main));
    assert.equal(await page.locator('#grammar-dictogloss input').count(),11);
    assert.equal(await page.locator('body').getAttribute('class') || '', await page.evaluate(() => window.__beforeEnhancement.bodyClass));
    assert.equal(await page.locator('.ch14-examples-rest, .ch14-examples-toggle, [data-grammar-id]').count(), 0);
    await page.unroute(assetRoute);
  }
  // The shared asset is scoped to notes; representative existing study pages stay intact.
  for (const route of ['chapter-13-textbook.html', 'chapter-14-review.html', 'chapter-20-vocabulary.html']) {
    await page.goto(base + route);
    await page.locator('.lesson-quick-switcher').waitFor();
    assert.equal(await trigger.count(), 0);
    assert.equal(await page.locator('.ch14-examples-toggle').count(), 0);
    await noOverflow();
  }
  assert.deepEqual(errors, []);
  console.log(`All eight mobile notes passed (${engine}): 76 patterns, 302 examples, preserved curriculum/desktop and graceful invalid-shape fallback.${screenshots ? ` Screenshots: ${folder}` : ''}`);
} finally { await browser.close(); await new Promise(done => server.close(done)); }
