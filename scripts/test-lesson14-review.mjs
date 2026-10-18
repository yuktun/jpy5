// Only synthetic protected text and identities are used in this browser test.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
import {firestoreFixture} from './teacher-test-fixtures.mjs';
const words=Array.from({length:6},(_,i)=>`<button type="button" data-word-meaning="SYNTHETIC MEANING ${i}" data-word-usage="SYNTHETIC USAGE ${i}">SYNTHETIC WORD ${i}</button>`).join('');
const exercise=`<div class="teacher-supplement-header"><div><span class="teacher-label">SYNTHETIC SOURCE</span><h2>SYNTHETIC EXERCISE</h2><p>SYNTHETIC INTRODUCTION</p><p class="teacher-source-note"><a href="https://drive.google.com/file/d/synthetic/view">SYNTHETIC PDF</a></p></div></div>${Array.from({length:3},(_,i)=>`<details class="teacher-exercise" ${i===0?'open':''}><summary><strong>SYNTHETIC SECTION ${i}</strong></summary><div class="teacher-exercise-body"><article class="worksheet-part"><p>SYNTHETIC QUESTION <ruby>例<rt>れい</rt></ruby></p>${i===0?`<div class="teacher-word-bank">${words}</div>`:''}<button class="teacher-answer-toggle" type="button" data-answer-toggle aria-controls="synthetic-review-answer-${i}" aria-expanded="false">顯示答案</button><div class="teacher-answer" id="synthetic-review-answer-${i}" hidden>SYNTHETIC ANSWER ${i}</div></article></div></details>`).join('')}`;
const fixture=structuredClone(firestoreFixture);fixture.fields.exercises.stringValue=exercise;
const root=process.cwd(),server=createServer(async(req,res)=>{
 const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+sep)||file.includes('private-migration')||file.includes('node_modules')||file.includes(`${sep}.git`))return res.writeHead(403).end();
 try{res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const errors=[];let reads=0;
async function context(options={}){
 const ctx=await browser.newContext({serviceWorkers:'block',...options});
 await ctx.route('https://**/*',route=>{
  const url=route.request().url();
  if(url.includes('firebase-app.js'))return route.fulfill({contentType:'text/javascript',body:'export const getApps=()=>[{}],getApp=()=>({}),initializeApp=()=>({});'});
  if(url.includes('firebase-auth.js'))return route.fulfill({contentType:'text/javascript',body:`const callbacks=[];window.testAccount=uid=>callbacks.forEach(fn=>fn(uid?{uid,getIdToken:async()=> 'synthetic'}:null));export const getAuth=()=>({});export const onIdTokenChanged=(a,f)=>{callbacks.push(f);f(null);return()=>{};};export const signInWithPopup=async()=>window.testAccount('approved');export class GoogleAuthProvider{setCustomParameters(){}};`});
  if(url.startsWith('https://firestore.googleapis.com/')){reads++;return route.fulfill({contentType:'application/json',body:JSON.stringify(fixture)});}
  return route.abort();
 });
 await ctx.route('**/assets/firebase-sync.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export const initialiseFirebaseSync=()=>{};'}));
 return ctx;
}
const state=(page,value)=>page.waitForFunction(value=>document.querySelector('[data-teacher-section]')?.dataset.accessState===value,value);
async function load(page){
 await page.goto(base+'chapter-14-review.html');await state(page,'signed-out');
 await page.waitForFunction(()=>document.querySelector('[data-teacher-gate] a .internet-required'));
 assert.equal((await page.locator('[data-teacher-gate] a').textContent()).split('需網絡').length-1,1,'source link must have exactly one network label');
 await page.locator('[data-teacher-login]').click();await state(page,'loaded');
}
async function fits(page){
 const box=await page.locator('.teacher-word-help-popover').boundingBox(),size=page.viewportSize();
 assert(box&&box.x>=0&&box.y>=0&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1,'word help must fit viewport outside clipped exercise');
 assert(await page.locator('.teacher-word-help-popover').evaluate(node=>node.parentNode===document.body&&getComputedStyle(node).position==='fixed'),'word help must render outside clipped exercise cards');
 assert(await page.evaluate(({x,y})=>Boolean(document.elementFromPoint(x,y)?.closest('.teacher-word-help-popover')),{x:box.x+box.width/2,y:box.y+box.height/2}),'word help must be visible above surrounding content');
}
try{
 const ctx=await context(),page=await ctx.newPage();page.on('pageerror',error=>errors.push(error.message));
 for(const width of [390,810,1280]){
  await page.setViewportSize({width,height:900});await load(page);
  const shell=page.locator('[data-teacher-section]'),buttons=shell.locator('.teacher-word-bank button'),help=page.locator('.teacher-word-help-popover');
  assert.equal(await shell.getAttribute('class'),'teacher-review-shell');assert.equal(await shell.locator('.teacher-note-panel,.teacher-supplement').count(),0);
  assert.equal(await shell.locator('.teacher-supplement-header:visible').count(),1);assert.equal(await shell.locator('a[href*="drive.google.com"]:visible').count(),1);
  assert.equal(await shell.locator('.teacher-exercise').count(),3);assert.equal(await buttons.count(),6);assert.equal(await shell.locator('.teacher-answer:visible').count(),0);
  assert.equal(await shell.locator('ruby rt').count(),3);
  if(width===390||width===1280){
   await mkdir('tmp/lesson14-review',{recursive:true});
   await page.evaluate(()=>document.documentElement.dataset.theme='light');
   await shell.scrollIntoViewIfNeeded();
   await page.screenshot({path:`tmp/lesson14-review/${width===390?'mobile':'desktop'}.png`});
  }
  const before=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}));
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   for(let i=0;i<6;i++){
    await buttons.nth(i).hover();await help.waitFor({state:'visible'});
    assert.equal(await help.locator('.teacher-word-meaning').textContent(),`SYNTHETIC MEANING ${i}`);assert.equal(await help.locator('.teacher-word-usage').textContent(),`SYNTHETIC USAGE ${i}`);
    assert.equal(await buttons.nth(i).getAttribute('aria-describedby'),await help.getAttribute('id'));await fits(page);
    await help.hover();assert(await help.isVisible());await page.mouse.move(1,1);await help.waitFor({state:'hidden'});
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  // Real Tab focus must show help before Enter/Space is pressed.
  await buttons.first().hover();await help.waitFor({state:'visible'});
  await page.emulateMedia({media:'print'});assert.equal(await help.isVisible(),false);assert.equal(await shell.locator('[data-teacher-content]').isVisible(),false);await page.emulateMedia({media:'screen'});
  await buttons.first().focus();await page.keyboard.press('Tab');await help.waitFor({state:'visible'});
  assert.equal(await help.locator('.teacher-word-meaning').textContent(),'SYNTHETIC MEANING 1');await page.keyboard.press('Escape');await help.waitFor({state:'hidden'});
  assert(await buttons.nth(1).evaluate(node=>node===document.activeElement));
  await page.keyboard.press('Enter');await help.waitFor({state:'visible'});await page.mouse.click(1,1);await help.waitFor({state:'hidden'});
  await buttons.first().hover();await shell.locator('.teacher-exercise').first().locator('summary').click();await help.waitFor({state:'hidden'});await shell.locator('.teacher-exercise').first().locator('summary').click();
  for(const answer of await shell.locator('[data-answer-toggle]').all()){
   await answer.evaluate(node=>node.closest('details').open=true);await answer.click();assert.equal(await answer.textContent(),'隱藏答案');assert.equal(await answer.getAttribute('aria-expanded'),'true');
   await answer.click();assert.equal(await answer.textContent(),'顯示答案');assert.equal(await answer.getAttribute('aria-expanded'),'false');
  }
  const readCount=reads;await page.evaluate(()=>{window.testAccount('approved');window.dispatchEvent(new Event('pageshow'));window.JPY5TeacherSupplements.mount(document.querySelector('[data-teacher-content]'));});assert.equal(reads,readCount);assert.equal(await help.count(),1);
  await buttons.first().hover();await page.evaluate(()=>window.testAccount(null));await state(page,'signed-out');assert.equal(await help.count(),0);assert.equal(await shell.locator('[data-teacher-content]').textContent(),'');
  assert(!await page.locator('body').textContent().then(text=>text.includes('SYNTHETIC MEANING')));
  await page.evaluate(()=>window.testAccount('approved-again'));await state(page,'loaded');assert.equal(await help.count(),1);await buttons.first().hover();await help.waitFor({state:'visible'});
  await ctx.setOffline(true);await state(page,'offline');assert.equal(await help.count(),0);await ctx.setOffline(false);await state(page,'loaded');assert.equal(await help.count(),1);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage})),before,'word help/answers/auth changes must not alter progress');
  await buttons.first().hover();await page.goto(base+'chapter-14-notes.html');assert.equal(await help.count(),0);await load(page);assert.equal(await help.count(),1);
 }
 await ctx.close();
 const touch=await context({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),pageTouch=await touch.newPage();pageTouch.on('pageerror',error=>errors.push(error.message));await load(pageTouch);
 const word=pageTouch.locator('.teacher-word-bank button').first(),help=pageTouch.locator('.teacher-word-help-popover');
 await word.tap();await help.waitFor({state:'visible'});await fits(pageTouch);await word.tap();await help.waitFor({state:'hidden'});
 await word.tap();await pageTouch.touchscreen.tap(1,1);await help.waitFor({state:'hidden'});await word.tap();await pageTouch.evaluate(()=>scrollBy(0,100));await help.waitFor({state:'hidden'});
 await word.tap();await pageTouch.evaluate(()=>window.testAccount(null));assert.equal(await help.count(),0);assert.equal(await pageTouch.locator('.teacher-answer:visible').count(),0);
 await touch.close();assert.deepEqual(errors,[]);
 console.log('Lesson 14 review passed: lesson-13 layout, 6 dynamic word controls, hover/focus/Escape/touch/outside/scroll/collapse, viewport clipping, answer labels, 3 widths/2 themes, repeated auth/navigation, logout/offline cleanup, unchanged progress and ruby.');
}finally{await browser.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
