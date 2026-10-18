import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
import {firestoreFixture} from './teacher-test-fixtures.mjs';
const root=process.cwd();
const server=createServer(async(req,res)=>{
  if(req.url==='/protected-test.html')return res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="assets/teacher-access.css"><script type="module" src="assets/teacher-access.mjs"></script></head><body><details data-teacher-section="adverbs"><summary>Synthetic protected notes</summary><p data-teacher-status></p><button data-teacher-login hidden>Login</button><button data-teacher-load hidden>Retry</button><div data-teacher-content></div></details></body></html>');
  const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+sep)||file.includes('private-migration')||file.includes('node_modules')||file.includes(`${sep}.git`))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext();
let responseCode=200, reads=0;
try {
  await context.route('https://**/*',async route=>{
    const url=route.request().url();
    if(url.includes('firebase-app.js'))return route.fulfill({contentType:'text/javascript',body:'export const getApps=()=>[{}],getApp=()=>({}),initializeApp=()=>({});'});
    if(url.includes('firebase-auth.js'))return route.fulfill({contentType:'text/javascript',body:`const callbacks=[];const auth={};window.testAccount=uid=>{auth.currentUser=uid?{uid,getIdToken:async()=> 'synthetic'}:null;callbacks.forEach(f=>f(auth.currentUser));};export const getAuth=()=>auth;export const onIdTokenChanged=(a,f)=>{callbacks.push(f);f(a.currentUser||null);return()=>{};};export const signInWithPopup=async()=>window.testAccount('approved');export const signOut=async()=>window.testAccount(null);export class GoogleAuthProvider{setCustomParameters(){}};`});
    if(url.startsWith('https://firestore.googleapis.com/')){
      reads++; assert.equal(route.request().headers().authorization,'Bearer synthetic');
      return route.fulfill({status:responseCode,contentType:'application/json',body:JSON.stringify(firestoreFixture)});
    }
    return route.abort();
  });
  await context.route('**/assets/firebase-sync.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export const initialiseFirebaseSync=()=>{window.JPY5Sync={ready:true,logout:async()=>window.testAccount(null)};};'}));
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const width of [390,810,1280])for(const file of ['protected-test.html']){
    await page.setViewportSize({width,height:900});await page.goto(base+file);
    const shell=page.locator('[data-teacher-section]');await page.waitForFunction(()=>document.querySelector('[data-teacher-section]')?.dataset.accessState==='signed-out');
    assert.equal(await shell.evaluate(node=>node.tagName),file.includes('review')?'SECTION':'DETAILS');
    assert.equal(await shell.locator('[data-teacher-logout]').count(),0);
    if(file==='protected-test.html'){
      assert.equal(await shell.evaluate(node=>node.open),false);
      await shell.locator(':scope > summary').click();
    }
    const before=reads;assert.equal(await shell.locator('[data-teacher-content]').textContent(),'');assert.equal(reads,before);
    responseCode=403;await shell.locator('[data-teacher-login]').click();await page.waitForFunction(()=>document.querySelector('[data-teacher-section]').dataset.accessState==='denied');
    assert.equal(await shell.locator('[data-teacher-content]').textContent(),'');
    assert.equal(await shell.locator('[data-teacher-load]').isHidden(),true);
    responseCode=200;await page.evaluate(()=>window.testAccount('approved-second'));await page.waitForFunction(()=>document.querySelector('[data-teacher-section]').dataset.accessState==='loaded');
    assert.match(await shell.textContent(),/SYNTHETIC PROTECTED TEXT/);assert.equal(await page.evaluate(()=>window.BAD),undefined);
    assert.equal(await shell.locator('script,img,[href^="javascript:"]').count(),0);
    await shell.locator('[data-answer-toggle]').click();assert.equal(await shell.locator('#synthetic-answer').isVisible(),true);
    for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
    const loadedReads=reads;
    await page.evaluate(()=>{window.testAccount('approved-second');window.dispatchEvent(new Event('pageshow'));window.dispatchEvent(new Event('online'));});
    assert.equal(reads,loadedReads,'duplicate identity/lifecycle notifications do not reload loaded content');
    responseCode=500;await page.evaluate(()=>window.testAccount('other'));await page.waitForFunction(()=>document.querySelector('[data-teacher-section]').dataset.accessState==='error');
    assert.equal(await shell.locator('[data-teacher-content]').textContent(),'');
    responseCode=200;await shell.locator('[data-teacher-load]').click();await page.waitForFunction(()=>document.querySelector('[data-teacher-section]').dataset.accessState==='loaded');
    await context.setOffline(true);await page.waitForFunction(()=>document.querySelector('[data-teacher-section]').dataset.accessState==='offline');
    assert.equal(await shell.locator('[data-teacher-content]').textContent(),'');await context.setOffline(false);
    await page.waitForFunction(()=>document.querySelector('[data-teacher-section]').dataset.accessState==='loaded');
    await page.evaluate(()=>window.testAccount(null));assert.equal(await shell.locator('[data-teacher-content]').textContent(),'');
    assert(!await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('SYNTHETIC PROTECTED TEXT')));
  }
  // Exercise security retirement using synthetic cached plaintext only.
  const migrationContext=await browser.newContext();
  await migrationContext.route('**/assets/pwa.js',route=>route.fulfill({contentType:'text/javascript',body:''}));
  await migrationContext.route('https://**/*',route=>route.abort());
  const migrationPage=await migrationContext.newPage();
  await migrationPage.goto(base+'chapter-14-review.html');
  await migrationPage.evaluate(async()=>{
    const scope=new URL('./',location.href).href,prefix=`jpy5-offline-${encodeURIComponent(scope)}-`,cache=prefix+'package-old';
    const old=await caches.open(cache);await old.put(new URL('chapter-14-vocabulary.html',scope),new Response('PUBLIC ADVERBS RETAINED'));await old.put(new URL('chapter-14-notes.html',scope),new Response('SYNTHETIC OLD SECRET'));await old.put(new URL('chapter-14-review.html',scope),new Response('PUBLIC REVIEW RETAINED'));await old.put(new URL('chapter-13-notes.html',scope),new Response('PUBLIC RETAINED'));
    await old.put(new URL('assets/grammar-ruby.js',scope),new Response('SYNTHETIC OLD SECRET'));
    await old.put(new URL('assets/ch14-data.js',scope),new Response('SYNTHETIC OLD SECRET'));
    await (await caches.open(prefix+'metadata')).put(new URL('__offline_state__',scope),new Response(JSON.stringify({cache,version:'old',urls:[new URL('chapter-14-vocabulary.html',scope).href,new URL('chapter-14-review.html',scope).href,new URL('chapter-13-notes.html',scope).href]})));
    await navigator.serviceWorker.register('sw.js');
  });
  await migrationPage.waitForFunction(async()=>{const scope=new URL('./',location.href).href,old=await caches.open(`jpy5-offline-${encodeURIComponent(scope)}-package-old`);return !await old.match(new URL('chapter-14-notes.html',scope));});
  assert.equal(await migrationPage.evaluate(async()=>{const scope=new URL('./',location.href).href;return(await(await caches.open(`jpy5-offline-${encodeURIComponent(scope)}-package-old`)).match(new URL('chapter-14-review.html',scope))).text();}),'PUBLIC REVIEW RETAINED');
  assert.equal(await migrationPage.evaluate(async()=>{const scope=new URL('./',location.href).href;return(await(await caches.open(`jpy5-offline-${encodeURIComponent(scope)}-package-old`)).match(new URL('chapter-13-notes.html',scope))).text();}),'PUBLIC RETAINED');
  await migrationPage.waitForFunction(async()=>{const scope=new URL('./',location.href).href,cache=await caches.open(`jpy5-offline-${encodeURIComponent(scope)}-package-old`),ruby=await cache.match(new URL('assets/grammar-ruby.js',scope));return ruby&&!(await ruby.text()).includes('SYNTHETIC OLD SECRET')&&!await cache.match(new URL('assets/ch14-data.js',scope));});
  assert.equal(await migrationPage.evaluate(async()=>{const scope=new URL('./',location.href).href;return(await(await caches.open(`jpy5-offline-${encodeURIComponent(scope)}-package-old`)).match(new URL('chapter-14-vocabulary.html',scope))).text();}),'PUBLIC ADVERBS RETAINED');
  await migrationContext.close();
  await page.goto(base+'chapter-14-vocabulary.html');await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;r.active.postMessage({type:'JPY5_DOWNLOAD'});});
  await page.waitForFunction(async()=>{const scope=new URL('./',location.href).href,response=await(await caches.open(`jpy5-offline-${encodeURIComponent(scope)}-metadata`)).match(new URL('__offline_state__',scope));return response&&(await response.json()).teacherProtection===2;},{},{timeout:90000});
  assert.equal(await page.evaluate(async()=>{for(const name of await caches.keys())for(const req of await(await caches.open(name)).keys()){const text=await(await(await caches.open(name)).match(req)).text();if(text.includes('SYNTHETIC PROTECTED TEXT'))return true;}return false;}),false);
  await context.setOffline(true);
  for(const file of ['chapter-14-review.html','chapter-14-vocabulary.html','chapter-14-notes.html','chapter-14-flashcards.html','chapter-14-quiz.html','chapter-14-history.html','chapter-13-notes.html','chapter-13-vocabulary.html']){
    await page.goto(base+file);assert(!await page.locator('body').textContent().then(text=>text.includes('SYNTHETIC PROTECTED TEXT')));
    if(file==='chapter-14-vocabulary.html')assert.equal(await page.locator('.teacher-adverb-card').count(),4);
    else if(file==='chapter-14-review.html')assert.equal(await page.locator('[data-answer-toggle]').count(),13);
    else if(file.includes('14'))assert.equal(await page.locator('main').count(),1);
    else { assert.equal(await page.locator('main').count(),1,`${file}: public page should remain available; retained sentinel=${(await page.locator('body').textContent()).includes('PUBLIC RETAINED')}; url=${page.url()}`); assert(await page.locator('main').textContent()); }
  }
  assert.deepEqual(errors,[]);
  console.log('Teacher browser checks passed: synthetic protected content at 3 widths/2 themes, sign-in/denied/authorized/account switch/logout/offline, sanitizer, private cache retirement, approved public review/adverb cache retention and offline pages.');
} finally {await browser.close();await new Promise(done=>server.close(done));}
