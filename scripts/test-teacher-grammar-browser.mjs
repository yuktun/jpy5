import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
import {firestoreFixture,questions} from './teacher-test-fixtures.mjs';
const root=process.cwd(),prefix='jpy5.chapter14.quiz.';
const server=createServer(async(req,res)=>{
  const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+sep)||file.includes('private-migration')||file.includes('node_modules')||file.includes(`${sep}.git`))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext({serviceWorkers:'block'});
let responseCode=200;
try{
  await context.route('https://**/*',route=>{
    const url=route.request().url();
    if(url.includes('firebase-app.js'))return route.fulfill({contentType:'text/javascript',body:'export const getApps=()=>[{}],getApp=()=>({}),initializeApp=()=>({});'});
    if(url.includes('firebase-auth.js'))return route.fulfill({contentType:'text/javascript',body:`const callbacks=[];const auth={};window.testAccount=uid=>{auth.currentUser=uid?{uid,getIdToken:async()=> 'synthetic'}:null;callbacks.forEach(f=>f(auth.currentUser));};export const getAuth=()=>auth;export const onIdTokenChanged=(a,f)=>{callbacks.push(f);f(a.currentUser||null);return()=>{};};export const signInWithPopup=async()=>window.testAccount('approved');export const signOut=async()=>window.testAccount(null);export class GoogleAuthProvider{setCustomParameters(){}};`});
    if(url.startsWith('https://firestore.googleapis.com/'))return route.fulfill({status:responseCode,contentType:'application/json',body:JSON.stringify(firestoreFixture)});
    return route.abort();
  });
  await context.route('**/assets/firebase-sync.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export const initialiseFirebaseSync=()=>{window.JPY5Sync={ready:true,localChanged(){},logout:async()=>window.testAccount(null)};};'}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=value=>page.waitForFunction(value=>document.querySelector('[data-teacher-section]')?.dataset.accessState===value,value);
  const load=async file=>{console.log('Checking',file);await page.goto(base+file);await state('signed-out');assert.equal(await page.locator('iframe').count(),0);await page.locator('[data-teacher-login]').click();await state('loaded');assert.equal(await page.locator('[data-teacher-load]').isHidden(),true);return page.frameLocator('.teacher-grammar-frame');};
  const noText=async()=>assert(!await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('SYNTHETIC QUESTION')||JSON.stringify({...localStorage,...sessionStorage}).includes('SYNTHETIC GRAMMAR')));
  for(const width of [390,810,1280]){
    await page.setViewportSize({width,height:900});
    let frame=await load('chapter-14-notes.html');
    await frame.locator('.note-card').first().waitFor();assert.equal(await frame.locator('.note-card').count(),2);
    for(const theme of ['light','dark']){
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      await page.waitForFunction(theme=>document.querySelector('iframe').contentDocument.documentElement.dataset.theme===theme,theme);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert(await frame.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      await frame.locator('[data-extra-id]').click();assert.equal(await frame.locator('dialog').isVisible(),true);
      const box=await frame.locator('dialog').boundingBox(),iframeBox=await page.locator('iframe').boundingBox();assert(box.height<=iframeBox.height+1,'dialog fits its viewport');
      assert(box.y>=0&&box.y+box.height<=900,'modal remains within the outer viewport');
      await frame.locator('[data-extra-close]').click();assert.equal(await frame.locator('dialog').isVisible(),false);
    }
    await frame.locator('[data-extra-id]').click();await page.evaluate(()=>window.testAccount('other'));assert.equal(await page.locator('iframe').count(),0,'account switch removes open dialogs and data');
    frame=await load('chapter-14-flashcards.html');await frame.locator('#flashcard').waitFor();await frame.locator('#flashcard').click();assert.match(await frame.locator('#flashcard').textContent(),/SYNTHETIC/);
    await noText();await page.locator('[data-teacher-logout]').click();assert.equal(await page.locator('iframe').count(),0);
    frame=await load('chapter-14-quiz.html');await frame.locator('#start-quiz').click();await frame.locator('[data-answer="0"]').click();await frame.locator('#next-question').click();await frame.locator('[data-answer="1"]').click();
    const before=await page.evaluate(prefix=>JSON.parse(localStorage.getItem(prefix+'activeRun')),prefix);assert.equal(before.index,1);assert(before.signatures.every(s=>/^sha256:[a-f0-9]{64}$/.test(s)));await noText();
    // Simulate an existing compatible draft from before protection. Only its
    // full-text signatures change; IDs, order, answers and revision survive.
    await page.evaluate(({prefix,questions})=>{const d=JSON.parse(localStorage.getItem(prefix+'activeRun'));d.signatures=d.questionIds.map(id=>{const q=questions.find(q=>q.id===id);return JSON.stringify([q.id,q.pattern,q.prompt,q.options,q.answer]);});localStorage.setItem(prefix+'activeRun',JSON.stringify(d));},{prefix,questions});
    frame=await load('chapter-14-quiz.html');await frame.locator('#continue-quiz').click();assert.deepEqual(await page.evaluate(prefix=>JSON.parse(localStorage.getItem(prefix+'activeRun')),prefix),before);await noText();
    await context.setOffline(true);await state('offline');assert.equal(await page.locator('iframe').count(),0);await context.setOffline(false);
    await state('loaded');frame=page.frameLocator('.teacher-grammar-frame');await frame.locator('#continue-quiz').click();
    for(let index=1;index<questions.length;index++){
      if(index!==1)await frame.locator('[data-answer="0"]').click();await frame.locator('#next-question').click();
    }
    await frame.locator('#quiz-result').waitFor({state:'visible'});assert.equal(await page.evaluate(prefix=>localStorage.getItem(prefix+'activeRun'),prefix),null);await noText();
    frame=await load('chapter-14-history.html');await frame.locator('.history-card').first().waitFor();await frame.locator('.history-card details summary').first().click();assert.match(await frame.locator('.history-answer').first().textContent(),/SYNTHETIC QUESTION/);
    responseCode=403;await page.evaluate(()=>window.testAccount('unapproved'));await state('denied');assert.equal(await page.locator('iframe').count(),0);responseCode=200;
    await page.evaluate(()=>localStorage.clear());
  }
  assert.deepEqual(errors,[]);console.log('Protected grammar browser checks passed: 4 original UIs, 3 widths, 2 themes, notes/dialogs, flashcards, quiz resume/completion/history, private draft migration, account switch/logout/offline/denied clearing and no persisted text.');
}finally{await context.close();await browser.close();await new Promise(done=>server.close(done));}
