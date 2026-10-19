import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,sep,extname} from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright';
const root=process.cwd(),data={window:{}};
for(const file of ['data','vocabulary-data','ch13-teacher-additions','ch13-textbook-exercises'])vm.runInNewContext(await readFile(`assets/${file}.js`,'utf8'),data);
const original=JSON.stringify({grammar:data.window.JPY5_TEACHER.grammar,vocabulary:data.window.JPY5_TEACHER.vocabulary,groups:data.window.JPY5_TEXTBOOK_EXERCISES.groups});
vm.runInNewContext(await readFile('assets/ch13-teacher-oct17.js','utf8'),data);
const update=data.window.JPY5_TEACHER.oct17;
assert.equal(JSON.stringify({grammar:data.window.JPY5_TEACHER.grammar,vocabulary:data.window.JPY5_TEACHER.vocabulary,groups:data.window.JPY5_TEXTBOOK_EXERCISES.groups}),original,'Original notes/questions/answers changed');
assert.deepEqual(Object.keys(update.grammar),['hodo','ndatte','nagara','tsumari','yone']);
assert.equal(Object.keys(update.vocabulary).length,26);assert.equal(Object.keys(update.answers).length,11);assert.equal(Object.keys(update.sections).length,2);
assert.equal(data.window.JPY5_VOCABULARY.items.length,159);
for(const word of Object.keys(update.vocabulary))assert(data.window.JPY5_VOCABULARY.items.some(item=>item.written===word),`${word}: new scored vocabulary was introduced`);
for(const id of Object.keys(update.answers))assert(Object.values(data.window.JPY5_TEXTBOOK_EXERCISES.groups).flatMap(groups=>groups.flatMap(group=>group.items)).some(item=>item.id===id),id);
for(const file of ['assets/data.js','assets/vocabulary-data.js','assets/ch13-teacher-additions.js','assets/conversation-data.js','assets/reading-data.js','assets/teacher-demo.mjs','firestore.rules'])assert.equal((await readFile(file,'utf8')).replace(/\r\n/g,'\n'),execFileSync('git',['show',`00325d1:${file}`],{encoding:'utf8'}).replace(/\r\n/g,'\n'),file+' changed outside source additions');
const server=createServer(async(req,res)=>{
 const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+sep)||file.includes('private-migration')||file.includes('node_modules')||file.includes(`${sep}.git`))return res.writeHead(403).end();
 try{res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext({serviceWorkers:'block',hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
await context.route('https://**/*',route=>route.abort());page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(base+'chapter-13-vocabulary.html');
 await page.goto(base+'chapter-13-notes.html');await page.evaluate(()=>localStorage.setItem('jpy5.chapter13.oct17Sentinel','keep'));
 const progressSnapshot=()=>JSON.stringify(Object.entries({...localStorage}).filter(([key])=>!key.endsWith('.theme')).sort(([a],[b])=>a.localeCompare(b)));
 const saved=await page.evaluate(progressSnapshot);
 for(const width of [390,810,1280]){
  await page.setViewportSize({width,height:900});await page.goto(base+'chapter-13-notes.html');
  assert.equal(await page.locator('.note-card').count(),8);
  assert.equal(await page.locator('.textbook-question-list > li').count(),21);
  assert.equal(await page.locator('[data-oct17-grammar]').count(),5);
  assert.equal(await page.locator('[data-oct17-answer]').count(),11);
  assert.equal(await page.locator('[data-oct17-instruction]').count(),2);
  assert.equal(await page.locator('[data-oct17-grammar][open],.textbook-answer[open]').count(),0);
  assert((await page.locator('[data-oct17-answer]').all()).length===11);
  for(const element of await page.locator('[data-oct17-answer]').all())assert.equal(await element.isVisible(),false,'Teacher answer leaked before disclosure');
  for(const note of await page.locator('[data-oct17-grammar]').all()){
   const summary=note.locator(':scope > summary');await summary.focus();await page.keyboard.press('Enter');assert(await note.evaluate(el=>el.open));
   assert.match(await note.locator('a.teacher-source').getAttribute('href'),/14UOoHb84_CQpz0YOTrXNuTLKXvatn5vS\/view#page=\d+$/);
   for(const text of await note.locator('[lang="ja"]').evaluateAll(nodes=>nodes.map(node=>{const clone=node.cloneNode(true);clone.querySelectorAll('ruby').forEach(ruby=>ruby.remove());return clone.textContent;})))assert.doesNotMatch(text,/[\p{Script=Han}々]/u,'Unannotated Japanese source text');
   await page.keyboard.press('Space');assert.equal(await note.evaluate(el=>el.open),false);
  }
  for(const annotation of await page.locator('[data-oct17-answer]').all()){
   const question=annotation.locator('xpath=ancestor::li[@data-textbook-question][1]');
   const group=annotation.locator('xpath=ancestor::details[@data-textbook-pattern][1]');
   await group.evaluate(el=>el.open=true);
   const answer=question.locator('details.textbook-answer'),summary=answer.locator(':scope > summary');
   await summary.focus();await page.keyboard.press('Enter');assert(await annotation.isVisible());
   assert.match(await annotation.locator('a').getAttribute('href'),/view#page=\d+$/);
   await page.keyboard.press('Space');assert.equal(await annotation.isVisible(),false);
  }
  for(const theme of ['light','dark']){await page.evaluate(theme=>window.JPY5.setTheme(theme),theme);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`notes ${width} ${theme} overflow`);}
  await page.goto(base+'chapter-13-vocabulary.html');
  assert.equal(await page.locator('.vocab-row').count(),159);assert.equal(await page.locator('[data-oct17-vocabulary]').count(),26);
  assert.equal(await page.locator('[data-oct17-vocabulary][open]').count(),0);
  for(const disclosure of await page.locator('[data-oct17-vocabulary]').all()){
   await disclosure.locator('summary').tap();assert(await disclosure.evaluate(el=>el.open));
  }
  for(const theme of ['light','dark']){await page.evaluate(theme=>window.JPY5.setTheme(theme),theme);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`vocabulary ${width} ${theme} overflow`);}
  await page.locator('#vocab-search').fill('Mighty Atom');assert.equal(await page.locator('.vocab-row').count(),1,'New teacher gloss is searchable');
  await page.locator('#vocab-search').fill('loose');assert.equal(await page.locator('[data-oct17-vocabulary="ルーズ"]').count(),1);
  assert.equal(await page.locator('.teacher-addition').count(),2,'Old loose note retained beside new source gloss');
  await page.goto(base+'chapter-13-review.html');await page.locator('.lesson-quick-switcher').waitFor();
  assert.equal(await page.locator('[data-oct17-index] a[href*="chapter-13-notes"]').count(),5);
  await page.locator('[data-oct17-index] a[href$="teacher-oct17-yone"]').click();
  await page.locator('#teacher-oct17-yone').waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>localStorage.getItem('jpy5.chapter13.oct17Sentinel')),'keep');
 }
 assert.equal(await page.evaluate(progressSnapshot),saved,'Source notes changed progress');
 assert.deepEqual(errors,[]);
 console.log('Microsoft Edge source integration passed: old notes/data/21 questions preserved, 5 grammar notes, 26 vocabulary glosses, 11 hidden teacher annotations, 2 open-answer instructions, source pages/ruby, 3 widths/2 themes, keyboard/touch, search/navigation and progress.');
}finally{await context.close();}
const offline=await browser.newContext({hasTouch:true,viewport:{width:390,height:900}}),coldPage=await offline.newPage();
await offline.route('https://**/*',route=>route.abort());
try{
 await coldPage.goto(base+'chapter-13-notes.html');await coldPage.waitForFunction(()=>navigator.serviceWorker.controller&&document.querySelector('.pwa-status')?.dataset.state==='online');
 await coldPage.locator('.pwa-status').click();await coldPage.locator('[data-offline-download]').click();
 await coldPage.waitForFunction(()=>document.querySelector('.pwa-status')?.dataset.state==='ready',null,{timeout:90000});
 await offline.setOffline(true);
 const cold=await offline.newPage();await cold.goto(base+'chapter-13-notes.html');
 assert.equal(await cold.locator('[data-oct17-grammar]').count(),5);assert.equal(await cold.locator('[data-oct17-answer]').count(),11);
 assert.equal(await cold.locator('[data-oct17-grammar][open],.textbook-answer[open]').count(),0);
 await cold.locator('[data-textbook-pattern="yone"] > summary').tap();
 await cold.locator('[data-textbook-question="yone-1"] details > summary').tap();
 assert(await cold.locator('[data-oct17-answer="yone-1"]').isVisible());
 await cold.goto(base+'chapter-13-vocabulary.html');assert.equal(await cold.locator('[data-oct17-vocabulary]').count(),26);
 await cold.goto(base+'chapter-13-review.html');assert.equal(await cold.locator('[data-oct17-index]').count(),1);
 await cold.goto(base+'chapter-14-notes.html');assert.equal(await cold.locator('[data-teacher-demo]').count(),11);assert((await cold.locator('[data-teacher-demo-content]').allTextContents()).every(text=>text===''));
 console.log('Microsoft Edge opt-in offline passed: new public source notes, vocabulary, hidden/working teacher answers and review links in fresh tabs; lesson 14 grammar gates remain empty.');
}finally{await offline.close();await browser.close();await new Promise(done=>server.close(done));}
