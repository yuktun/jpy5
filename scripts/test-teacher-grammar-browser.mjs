import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),server=createServer(async(req,res)=>{
 const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+sep)||file.includes('private-migration')||file.includes('node_modules')||file.includes(`${sep}.git`))return res.writeHead(403).end();
 try{res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];let protectedReads=0;
await context.route('https://**/*',route=>{if(route.request().url().includes('jpy5TeacherNotes'))protectedReads++;return route.abort();});
await context.route('**/assets/firebase-sync.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export const initialiseFirebaseSync=()=>{};'}));
page.on('pageerror',error=>errors.push(error.message));
try{
 for(const width of [390,810,1280]){
  await page.setViewportSize({width,height:900});await page.goto(base+'chapter-14-notes.html');await page.locator('.note-card').first().waitFor();
  assert.equal(await page.locator('.note-card').count(),11);assert.equal(await page.locator('.note-card .example').count(),46);
  await page.locator('.lesson-quick-switcher').waitFor();
  if(width===390||width===1280){
   await mkdir('tmp/lesson14-layout',{recursive:true});
   await page.evaluate(()=>{document.documentElement.dataset.theme='light';window.scrollTo({top:0,left:0,behavior:'instant'});});
   await page.waitForFunction(()=>scrollY===0);
   await page.screenshot({path:`tmp/lesson14-layout/${width===390?'mobile':'desktop'}.png`,fullPage:false});
  }
  assert.equal(await page.locator('[data-teacher-demo]').count(),11);
  assert.equal(await page.locator('[data-teacher-demo][open]').count(),0);
  await page.locator('[data-teacher-demo] summary').first().click();
  assert.equal((await page.locator('[data-teacher-demo-content]').allTextContents()).join(''),'');
  assert.equal(await page.locator('iframe,[data-teacher-status],[data-teacher-logout],[data-teacher-section="grammar"]').count(),0);
  await page.locator('.lesson-quick-switcher').waitFor();assert.equal(await page.locator('.lesson-quick-switcher').count(),1);assert.equal(await page.locator('.module-lesson-switcher').count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),'ordinary document scrolling');
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.locator('[data-extra-id]').first().click();assert.equal(await page.locator('#grammar-extra-dialog').isVisible(),true);
   const box=await page.locator('#grammar-extra-dialog').boundingBox();assert(box.y>=0&&box.y+box.height<=901,'modal stays inside the page viewport');
   await page.locator('[data-extra-close]').click();assert.equal(await page.locator('#grammar-extra-dialog').isVisible(),false);
  }
  await page.goto(base+'chapter-14-flashcards.html');await page.locator('#flashcard').waitFor();await page.locator('#flashcard').click();assert.equal(await page.locator('#card-back').isVisible(),true);
  await page.goto(base+'chapter-14-quiz.html');await page.locator('#start-quiz').click();await page.locator('[data-answer="0"]').click();await page.locator('#next-question').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jpy5.chapter14.quiz.activeRun')));assert.equal(saved.index,1);assert(saved.signatures.every(value=>/^sha256:[a-f0-9]{64}$/.test(value)));
  await page.evaluate(()=>{const key='jpy5.chapter14.quiz.activeRun',draft=JSON.parse(localStorage.getItem(key));draft.signatures=draft.questionIds.map(id=>{const q=window.JPY5_DATA.questions.find(q=>q.id===id);return JSON.stringify([q.id,q.pattern,q.prompt,q.options,q.answer]);});localStorage.setItem(key,JSON.stringify(draft));});
  await page.reload();await page.locator('#continue-quiz').click();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('jpy5.chapter14.quiz.activeRun'))),saved);
  await page.goto(base+'chapter-14-history.html');assert.equal(await page.locator('#history-list').count(),1);
  assert.equal(await page.locator('iframe,[data-teacher-section="grammar"]').count(),0);
  await page.evaluate(()=>localStorage.clear());
 }
 assert.equal(protectedReads,0,'general grammar and placeholders never request teacher data');assert.deepEqual(errors,[]);
  console.log('Public lesson 14 layout passed: 11 patterns/46 examples, 11 closed access-gated demos, one navigation, no frame/access banner, 3 widths/2 themes, dialogs, flashcards, hash-compatible quiz resume/history and zero protected requests when auth is unavailable.');
}finally{await context.close();await browser.close();await new Promise(done=>server.close(done));}
