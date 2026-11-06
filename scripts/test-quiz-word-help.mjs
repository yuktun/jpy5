import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, sep, extname} from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const {chromium} = createRequire(resolve('package.json'))('playwright');
const root = process.cwd();
const parse = s => JSON.parse(s.match(/const data = ([\s\S]*?);\n  const host/)[1]);
assert.deepEqual(parse(await readFile('assets/ch13-quiz1.js','utf8')), parse(execFileSync('git',['show','HEAD:assets/ch13-quiz1.js'],{encoding:'utf8'})), 'Existing lesson data must be identical');
const server = createServer(async(req,res) => {
  const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+sep)||file.includes(`${sep}.git`)||file.includes(`${sep}node_modules${sep}`)||file.includes('private-migration')) return res.writeHead(403).end();
  try {res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));} catch {res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,channel:'msedge'});
const errors=[];
const context=await browser.newContext({serviceWorkers:'block'});
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
const page=await context.newPage();
const url=base+'/chapter-13-review.html#quiz13-III';
try {
  await page.goto(url);
  const words=page.locator('#lesson13-quiz1 .teacher-word-bank button');
  const help=page.locator('#teacher-word-help');
  assert.equal(await words.count(),12);
  assert.equal(await page.locator('#quiz13-III .teacher-word-bank button').count(),8);
  assert.equal(await page.locator('#quiz13-IX .teacher-word-bank button').count(),4);
  assert.equal(await help.count(),1);
  await page.evaluate(()=>document.querySelectorAll('.quiz13-section').forEach(d=>d.open=true));
  for(const word of await words.all()) {
    await word.hover();
    await help.waitFor({state:'visible'});
    assert.equal(await help.locator('h2').textContent(),await word.textContent());
    assert.equal(await help.locator('.teacher-word-meaning').textContent(),await word.getAttribute('data-word-meaning'));
    assert((await help.locator('.teacher-word-usage').textContent()).length>15);
    assert.equal(await word.getAttribute('aria-describedby'),'teacher-word-help');
    assert.equal(await help.getAttribute('role'),'tooltip');
    await page.keyboard.press('Escape');
    await help.waitFor({state:'hidden'});
    assert.equal(await word.getAttribute('aria-describedby'),null);
  }
  assert.equal(await page.locator('.quiz13-answer[open]').count(),0,'Word help must not open answers');
  const first=words.first();
  await first.hover();await help.hover();await page.waitForTimeout(180);assert(await help.isVisible());
  await page.mouse.move(0,0);await help.waitFor({state:'hidden'});
  await first.focus();await page.keyboard.press('Tab');await help.waitFor({state:'visible'});
  assert.equal(await help.locator('h2').textContent(),await words.nth(1).textContent());
  await page.keyboard.press('Escape');await help.waitFor({state:'hidden'});
  await page.locator('#quiz13-III-1-0').fill('草稿を保存');
  await first.click();await page.locator('#quiz13-III-1-0').click();await help.waitFor({state:'hidden'});
  await page.reload();
  assert.equal(await page.locator('#quiz13-III-1-0').inputValue(),'草稿を保存');
  assert.equal(await page.locator('.quiz13-answer[open]').count(),0);
  for (const width of [390,810,1280]) {
    await page.setViewportSize({width,height:844});
    for(const theme of ['light','dark']) {
      await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
      await page.mouse.move(0,0);await words.nth(7).hover();await help.waitFor({state:'visible'});
      const b=await help.boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=845,`${width} ${theme} tooltip bounds`);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.keyboard.press('Escape');
    }
  }
  // Same initializer can be called repeatedly, including after a dynamic rerender.
  await page.evaluate(()=>{window.JPY5WordHelp.init();window.JPY5WordHelp.init();});
  await page.evaluate(()=>delete document.getElementById('lesson13-quiz1').dataset.initialized);
  await page.addScriptTag({url:base+'/assets/ch13-quiz1.js'});
  assert.equal(await words.count(),12);assert.equal(await help.count(),1);
  await page.locator('#quiz13-III').evaluate(d=>d.open=true);
  await first.hover();await help.waitFor({state:'visible'});await page.keyboard.press('Escape');
  // Practice still shares exactly the same controller and definitions.
  const practice=page.locator('#teacher-exercise .teacher-word-bank button').first();
  await practice.evaluate(b=>{for(let d=b.parentElement;d;d=d.parentElement)if(d.tagName==='DETAILS')d.open=true;});
  await practice.hover();await help.waitFor({state:'visible'});
  assert.equal(await help.locator('.teacher-word-meaning').textContent(),await practice.getAttribute('data-word-meaning'));
  assert.equal(await page.locator('#teacher-exercise .teacher-answer:visible').count(),0);
  await page.keyboard.press('Escape');
  console.log('PASS desktop: all 12 hints, hover/focus/click/Escape/outside dismissal, 3 widths x 2 themes, repeated initialization and dynamic rendering, practice regression, hidden answers and draft persistence; original lesson data unchanged.');
  const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
  const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto(url);
  const touchWord=phone.locator('#quiz13-III .teacher-word-bank button').first(),touchHelp=phone.locator('#teacher-word-help');
  await phone.evaluate(()=>{window.JPY5WordHelp.init();window.JPY5WordHelp.init();});
  await touchWord.tap();await touchHelp.waitFor({state:'visible'});
  await touchWord.tap();await touchHelp.waitFor({state:'hidden'});
  await touchWord.tap();await touchHelp.waitFor({state:'visible'});
  await phone.locator('#quiz13-III-1-0').tap();await touchHelp.waitFor({state:'hidden'});
  await touchWord.tap();await touchHelp.waitFor({state:'visible'});
  await phone.screenshot({path:resolve('tmp/quiz-word-help-phone.png')});
  await mobile.close();
  console.log('PASS touch: tap opens, second tap closes after repeated initialization, outside tap dismisses.');
  const offline=await browser.newContext();const op=await offline.newPage();op.on('pageerror',e=>errors.push(e.message));
  await op.goto(url);
  await op.waitForFunction(()=>!!navigator.serviceWorker.controller&&document.querySelector('.pwa-status')?.dataset.state==='online');
  await op.locator('.pwa-status').click();await op.locator('[data-offline-download]').click();
  await op.waitForFunction(()=>document.querySelector('.pwa-status')?.dataset.state==='ready',null,{timeout:90000});
  await offline.setOffline(true);await op.reload();
  await op.locator('#quiz13-III .teacher-word-bank button').first().hover();
  await op.locator('#teacher-word-help').waitFor({state:'visible'});
  assert.match(await op.locator('#teacher-word-help .teacher-word-meaning').textContent(),/吞下/);
  assert.equal(await op.locator('.quiz13-answer[open]').count(),0);
  await offline.close();
  console.log('PASS explicit offline package: quiz word hints available after offline reload.');
  assert.deepEqual(errors,[]);
} finally {await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
