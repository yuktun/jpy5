import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, readdir} from 'node:fs/promises';
import {extname} from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright';

const sandbox = {self: {}};
vm.runInNewContext(await readFile('assets/offline-assets.js', 'utf8'), sandbox);
const publicFiles = new Set([...sandbox.self.JPY5_OFFLINE_MANIFEST.assets, 'sw.js', 'assets/offline-assets.js']);
for (const folder of ['assets/audio/listening', 'assets/audio/reading']) {
  for (const file of await readdir(folder)) publicFiles.add(folder + '/' + file);
}
const types = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json', '.css':'text/css', '.mp3':'audio/mpeg'};
const server = createServer(async (req, res) => {
  const file = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!publicFiles.has(file)) return res.writeHead(404).end();
  try {
    const content = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream'}).end(content);
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const base = 'http://127.0.0.1:' + server.address().port + '/';
const browser = await chromium.launch({channel:process.env.JPY5_BROWSER_CHANNEL || 'msedge'});
try {
  const context = await browser.newContext({viewport:{width:390, height:844}, serviceWorkers:'block'});
  await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push([page.url(), error.message]));
  const fragmentLinks = new Set();
  const pages = [...publicFiles].filter(file => file.endsWith('.html'));
  for (const file of pages) {
    const response = await page.goto(base + file);
    assert.equal(response.status(), 200, file);
    assert(await page.locator('main h1').count(), file);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), file + ': mobile overflow');
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(a => a.href));
    for (const href of links.filter(url => url.startsWith(base))) {
      const url = new URL(href);
      assert(publicFiles.has(url.pathname.slice(1) || 'index.html'), file + ' links to ' + href);
      if (url.hash.length > 1) fragmentLinks.add(href);
    }
  }
  for (const href of fragmentLinks) {
    await page.goto(href);
    const id = decodeURIComponent(new URL(href).hash.slice(1));
    await page.waitForFunction(id => !!document.getElementById(id), id, {timeout:5000});
  }
  for (let lesson = 13; lesson <= 20; lesson++) {
    const reading = base + 'chapter-' + lesson + '-reading.html';
    await page.goto(reading);
    await page.locator('[data-reading-mode="exam"]').click();
    const questions = await page.evaluate(() => window.JPY5_READING.questions.map(q => ({id:q.id, answer:q.answer})));
    await page.locator('.exam-list input').first().check();
    await page.locator('#font-up').click();
    assert.equal(await page.locator('#exam-status').textContent(), '已答 1 / ' + questions.length);
    await page.reload();
    assert.equal(await page.locator('.exam-list input:checked').count(), 1);
    for (const q of questions) await page.locator(`input[name="${q.id}"][value="${q.answer}"]`).check();
    await page.locator('#submit-reading-exam').click();
    await page.reload();
    assert.equal(await page.locator('.reading-result strong').textContent(), questions.length + ' / ' + questions.length);
    assert.equal(await page.locator('.exam-list input:enabled').count(), 0);
    await page.goto(base + 'chapter-' + lesson + '.html');
    assert((await page.locator('[data-progress="reading"]').textContent()).startsWith(questions.length + '/' + questions.length + ' '));
    await page.goto(reading);
    await page.locator('#restart-reading-exam').click();
    assert.equal(await page.locator('.exam-list input:checked').count(), 0);
    assert.equal(await page.evaluate(() => JPY5.read('reading', {}).attempts.length), 1);
  }
  assert.deepEqual(errors, []);
  console.log(`Passed ${pages.length} mobile pages, ${fragmentLinks.size} fragment destinations and eight complete reading exam flows.`);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
