import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve, sep, extname} from 'node:path';
const {chromium} = createRequire(import.meta.url)('playwright');
const root=process.cwd(), artifacts=resolve('tmp/adverb-notes-browser');
await mkdir(artifacts,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  try {
    const path=resolve(root,`.${new URL(req.url,'http://localhost').pathname}`);
    if(!path.startsWith(root+sep)) return res.writeHead(403).end();
    res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
    res.end(await readFile(path));
  } catch {res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'}), page=await context.newPage(), errors=[];
page.on('pageerror',e=>errors.push(e.message));
// Independent inventory from the eight scanned pages: grouped rows, example
// blocks (a dialogue counts as one), and all numbered practice prompts.
const inventory={13:[4,8,7],14:[4,8,7],15:[4,9,7],16:[3,6,7],17:[5,14,5],18:[5,10,7],19:[3,6,6],20:[6,12,4]};
try {
  for(const width of [390,810,1280]) {
    await page.setViewportSize({width,height:900});
    for(const [n,[cards,examples,questions]] of Object.entries(inventory)) {
      await page.goto(`${base}/chapter-${n}-vocabulary.html`);
      const shell=page.locator('#teacher-adverbs');
      assert.equal(await shell.count(),1);
      assert.equal(await shell.getAttribute('data-source-page'),String(Number(n)-12));
      assert.equal(await shell.locator('.teacher-adverb-card').count(),cards);
      assert.equal(await shell.locator('.adverb-ja').count(),examples);
      assert.equal(await shell.locator('.adverb-translation').count(),examples);
      assert.equal(await shell.locator('.teacher-question-list>li').count(),questions);
      assert.equal(await shell.locator('.teacher-answer li').count(),questions);
      assert.equal(await shell.locator('.teacher-answer:not([hidden])').count(),0);
      assert.equal(await shell.locator('.adverb-lesson-nav a').count(),8);
      assert.equal(await shell.locator('.adverb-lesson-nav [aria-current]').getAttribute('href'),`chapter-${n}-vocabulary.html#teacher-adverbs`);
      const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(x=>x.id));
      assert.equal(new Set(ids).size,ids.length,`Lesson ${n}: duplicate IDs`);
      await page.evaluate(n=>localStorage.setItem(`jpy5.chapter${n}.adverbTestSentinel`,'keep'),n);
      const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
      await page.locator('.adverb-jump').click();
      for(const button of await shell.locator('[data-answer-toggle]').all()) {
        const answer=page.locator(`#${await button.getAttribute('aria-controls')}`);
        await button.focus(); await page.keyboard.press('Enter');
        assert.equal(await answer.isVisible(),true);
        assert.equal(await button.getAttribute('aria-expanded'),'true');
        await page.keyboard.press('Space');
        assert.equal(await answer.isVisible(),false);
        assert.equal(await button.getAttribute('aria-expanded'),'false');
      }
      for(const detail of await shell.locator('.adverb-original').all()) {
        await detail.locator('summary').click();
        assert.equal(await detail.evaluate(el=>el.open),true);
      }
      assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before,'Study controls changed progress');
      for(const theme of ['light','dark']) {
        await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`Lesson ${n} ${width} ${theme} overflows`);
        await shell.evaluate(el=>window.scrollTo(0,el.offsetTop-100));
        await page.screenshot({path:`${artifacts}/lesson-${n}-${width}-${theme}.png`});
      }
    }
  }
  await page.goto(`${base}/chapter-13-vocabulary.html`);
  assert.match(await page.locator('.vocab-summary').innerText(),/159/);
  await page.locator('#vocab-card').click();
  assert.equal(await page.locator('#vocab-card-back').isVisible(),true,'Existing vocabulary flip broke');
  await page.goto(`${base}/chapter-20-vocabulary.html#teacher-adverbs`);
  await page.locator('.adverb-lesson-nav a').first().click();
  assert.match(page.url(),/chapter-13-vocabulary.html#teacher-adverbs$/);
  await page.waitForFunction(()=>{const y=document.querySelector('#teacher-adverbs')?.getBoundingClientRect().y;return y>=0&&y<250;});
  const position=await page.locator('#teacher-adverbs').boundingBox();
  assert(position.y>=0&&position.y<250,'Cross-lesson link did not land at adverbs');
  assert.deepEqual(errors,[]);
  console.log('All eight adverb sections passed source inventory, 3 widths × 2 themes, keyboard, answer disclosure, navigation and progress checks.');
} finally {await browser.close();await new Promise(done=>server.close(done));}
