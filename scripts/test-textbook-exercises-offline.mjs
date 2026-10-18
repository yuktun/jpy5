// Real opt-in package download followed by cold offline lesson navigations.
// Fresh disposable Edge profile; only public inventory is served, no live auth.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright';

const expected={14:[11,31],15:[9,25],16:[10,25],17:[11,29],18:[8,29],19:[8,25],20:[12,35]};
const inventory={self:{}};vm.runInNewContext(await readFile('assets/offline-assets.js','utf8'),inventory);
const manifest=inventory.self.JPY5_OFFLINE_MANIFEST;
const allowed=new Set([...manifest.assets,'sw.js','assets/offline-assets.js']);
const seeded={};
for(const lesson of Object.keys(expected).map(Number)){
  const window={};vm.runInNewContext(await readFile(`assets/ch${lesson}-data.js`,'utf8'),{window});
  if(lesson>=18)vm.runInNewContext(await readFile(`assets/ch${lesson}-quiz-data.js`,'utf8'),{window});
  const q=window.JPY5_DATA.questions[0];
  seeded[`jpy5.chapter${lesson}.bookmarks`]=JSON.stringify([window.JPY5_DATA.patterns[0].id]);
  seeded[`jpy5.chapter${lesson}.quiz.activeRun`]=JSON.stringify({version:1,id:`offline-textbook-${lesson}`,mode:'practice',questionIds:[q.id],signatures:[lesson===14 ? window.JPY5QuestionSignatures[q.id] : JSON.stringify([q.id,q.pattern,q.prompt,q.options,q.answer])],index:0,answers:{},startedAt:'2026-10-18T00:00:00.000Z',revision:1});
}
let disconnected=false;
const requests=[];
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';requests.push(path);
  if(disconnected){req.socket.destroy();return;}
  if(req.method!=='GET'||!allowed.has(path))return res.writeHead(404).end();
  try{res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'})[extname(path)]||'text/plain','Cache-Control':'no-store'});res.end(await readFile(path));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`;
let browser;
const status=page=>page.evaluate(()=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{navigator.serviceWorker.removeEventListener('message',listener);reject(new Error('offline status timeout'));},10000);
  const listener=event=>{if(event.data?.type==='JPY5_OFFLINE_STATUS'){clearTimeout(timer);navigator.serviceWorker.removeEventListener('message',listener);resolve(event.data);}};
  navigator.serviceWorker.addEventListener('message',listener);navigator.serviceWorker.controller.postMessage({type:'JPY5_CACHE_STATUS'});
}));
async function retained(page){assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(seeded)),seeded);}
try{
  browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
  const context=await browser.newContext({viewport:{width:390,height:1000},serviceWorkers:'allow'});
  const errors=[];let protectedRequests=0,sourceRequests=0;
  context.on('request',req=>{const url=req.url();if(url.includes('jpy5TeacherNotes'))protectedRequests++;if(/\.pdf(?:[?#]|$)/i.test(url)||/^https:\/\/drive\.google\.com\/file\//.test(url))sourceRequests++;});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin ? route.continue() : route.abort());
  let page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'index.html');
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller&&document.querySelector('.pwa-status')?.dataset.state==='online');
  assert.equal((await status(page)).ready,false,'new profile must start without an offline package');
  assert.equal(await page.evaluate(async()=>(await caches.keys()).filter(key=>key.includes('package-')).length),0);
  await page.evaluate(values=>{for(const [key,value]of Object.entries(values))localStorage.setItem(key,value);},seeded);
  await page.locator('.pwa-status').click();await page.locator('[data-offline-download]').click();
  await page.waitForFunction(()=>document.querySelector('.pwa-status')?.dataset.state==='ready',null,{timeout:90000});
  const downloaded=await status(page);assert.equal(downloaded.ready,true);assert.equal(downloaded.total,manifest.assets.length);
  await retained(page);
  const cached=await page.evaluate(async()=>{
    const result=[];for(const key of await caches.keys())for(const request of await(await caches.open(key)).keys())result.push({cache:key,url:request.url});return result;
  });
  const packageEntries=cached.filter(entry=>entry.cache.includes('package-'));
  assert.equal(packageEntries.length,manifest.assets.length,'actual complete package inventory');
  assert.deepEqual(packageEntries.map(entry=>new URL(entry.url).pathname.slice(1)).sort(),[...manifest.assets].sort());
  for(const entry of cached){
    const url=new URL(entry.url);assert.equal(url.origin,new URL(base).origin,'no external cached response');
    assert.ok(allowed.has(url.pathname.slice(1))||url.pathname==='/__offline_state__',`unexpected cached runtime/private asset ${url.pathname}`);
    assert.doesNotMatch(url.pathname,/\.pdf$|private-migration|jpy5TeacherNotes/i);
  }
  assert.equal(sourceRequests,0);assert.ok(!requests.some(path=>/\.pdf$/i.test(path)));
  console.log(`Downloaded actual opt-in package: ${manifest.assets.length} verified public resources; no PDFs, source scans, or private runtime cache.`);
  await context.setOffline(true);disconnected=true;await page.close();
  for(const [lesson,[groups,items]]of Object.entries(expected)){
    // New tabs have no lesson DOM/module state from an online visit.
    page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    const response=await page.goto(`${base}chapter-${lesson}-notes.html?cold-textbook-offline=1`);
    assert.equal(response.status(),200);assert.equal(response.fromServiceWorker(),true);
    await page.locator('[data-textbook-pattern]').first().waitFor();
    assert.equal(await page.locator('.textbook-practice').count(),groups,`lesson ${lesson} groups`);
    assert.equal(await page.locator('[data-textbook-question]').count(),items,`lesson ${lesson} items`);
    assert.equal(await page.locator('.textbook-answer').count(),items);
    assert.equal(await page.locator('.textbook-practice[open],.textbook-answer[open]').count(),0);
    assert.ok(await page.locator('.textbook-practice ruby rt').count()>0);
    assert.equal(await page.locator('.textbook-answer-body:visible').count(),0);
    const first=page.locator('.textbook-practice').first(),last=page.locator('.textbook-practice').last();
    await first.locator(':scope > summary').click();
    const firstAnswer=first.locator('.textbook-answer').first();
    await firstAnswer.locator('summary').focus();await page.keyboard.press('Enter');
    assert.equal(await firstAnswer.locator('.textbook-answer-body').isVisible(),true);
    await page.keyboard.press('Space');assert.equal(await firstAnswer.evaluate(node=>node.open),false);
    await first.locator(':scope > summary').click();
    await last.locator(':scope > summary').focus();await page.keyboard.press('Enter');
    const lastAnswer=last.locator('.textbook-answer').last();
    await lastAnswer.locator('summary').click();assert.equal(await lastAnswer.locator('.textbook-answer-body').isVisible(),true);
    await lastAnswer.locator('summary').click();assert.equal(await lastAnswer.evaluate(node=>node.open),false);
    await last.locator(':scope > summary').click();
    assert.equal(await page.locator('.textbook-practice[open],.textbook-answer[open]').count(),0);
    assert.ok(await page.locator('.textbook-practice a[href*="#page="] .internet-required').count()>0);
    if(lesson==='17')assert.equal(await page.locator('[data-textbook-unmatched-pattern="ue"]').count(),1);
    if(lesson==='14'){
      assert.equal(await page.locator('[data-teacher-demo-content]').count(),11);
      assert.equal((await page.locator('[data-teacher-demo-content]').allTextContents()).join(''),'');
    }
    await retained(page);await page.close();console.log(`Lesson ${lesson}: ${groups} groups/${items} items rendered from package on cold offline navigation; first/last answers and saved progress passed.`);
  }
  assert.equal(protectedRequests,0);assert.equal(sourceRequests,0);assert.deepEqual(errors,[]);
  await context.close();console.log('PASS actual-package cold offline exercises: all199items, closed defaults, ruby, independent native disclosures, progress retained, empty protected teacher bodies and zero source/private requests.');
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done));}
