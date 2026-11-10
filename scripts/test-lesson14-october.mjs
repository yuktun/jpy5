import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright';
const c={window:{}};
for(const name of ['data','vocabulary-data','conversation-data','reading-data','teacher-additions'])vm.runInNewContext(await readFile(`assets/ch14-${name}.js`,'utf8'),c);
const t=c.window.JPY5_L14_TEACHER,ids=Array.from(c.window.JPY5_DATA.patterns,p=>p.id);
assert.equal(Object.keys(t.vocabulary).length,118);
assert.equal(t.responsePractice.length,7);
for(const id of Object.keys(t.vocabulary))assert(c.window.JPY5_VOCABULARY.items.some(v=>v.id==id));
const synthetic={version:1,notes:Object.fromEntries(ids.map(id=>[id,{title:`PRIVATE ${id}`,text:`UNIQUE_PRIVATE_${id} <img src=x onerror=alert(1)>`,source:'synthetic.pdf',pages:'1',examples:[['{確認|かくにん}する。','測試。']]}]))};
let payload=synthetic;
if(process.env.JPY5_TEST_PRIVATE==='1')payload=JSON.parse(await readFile('private-migration/lesson14-oct2026/grammar.json','utf8'));
// Invalid/missing payloads must never be accepted by the protected loader.
const {fetchTeacherGrammar}=await import('../assets/teacher-grammar-notes.mjs');
const fetchRecord=fields=>fetchTeacherGrammar({user:{getIdToken:async()=>'synthetic'},signal:new AbortController().signal,fetchImpl:async()=>({ok:true,json:async()=>({fields})})});
await assert.rejects(fetchRecord({schemaVersion:{integerValue:'2'}}));
await assert.rejects(fetchRecord({schemaVersion:{integerValue:'2'},teacherGrammarOct2026Json:{stringValue:'invalid JSON'}}));
await assert.rejects(fetchRecord({schemaVersion:{integerValue:'2'},teacherGrammarOct2026Json:{stringValue:JSON.stringify({version:1,notes:{}})}}));
await assert.rejects(fetchRecord({schemaVersion:{integerValue:'9'},teacherGrammarOct2026Json:{stringValue:JSON.stringify(payload)}}));
assert.equal(Object.keys((await fetchRecord({schemaVersion:{integerValue:'2'},teacherGrammarOct2026Json:{stringValue:JSON.stringify(payload)}})).notes).length,11);
const manifest={self:{}};vm.runInNewContext(await readFile('assets/offline-assets.js','utf8'),manifest);
const allowed=new Set([...manifest.self.JPY5_OFFLINE_MANIFEST.assets,'assets/offline-assets.js','sw.js']);
assert(![...allowed].some(path=>/private-migration|\.pdf$/.test(path)));
for(const file of allowed){
  if(!/\.(?:js|mjs|html|json|md)$/.test(file))continue;
  const content=await readFile(file,'utf8');
  for(const note of Object.values(payload.notes))assert(!content.includes(note.text),`private body leaked: ${file}`);
}
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname.slice(1);
  if(!allowed.has(path))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`,folder=resolve('tmp/lesson14-october-check');await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
let reads=0,status=200;
await context.route('**/assets/teacher-access.mjs',route=>route.fulfill({contentType:'text/javascript',body:`export async function createAuthService(){return {subscribe(cb){window.testAccount=uid=>cb(uid?{uid,getIdToken:async()=>'synthetic-token'}:null);window.testAccount(null);},login:async()=>window.testAccount('approved')};}`}));
await context.route('https://**/*',route=>{
  if(new URL(route.request().url()).hostname!=='firestore.googleapis.com')return route.abort();
  const url=new URL(route.request().url());assert.deepEqual(url.searchParams.getAll('mask.fieldPaths'),['schemaVersion','teacherGrammarOct2026Json']);
  reads++;
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify({fields:{schemaVersion:{integerValue:'2'},teacherGrammarOct2026Json:{stringValue:JSON.stringify(payload)}}})});
});
const reviewPage=await readFile('chapter-14-review.html','utf8');
assert.match(reviewPage,/chapter-14-reading\.html\?mode=teacher/);
assert.match(reviewPage,/7 NOV 會話框架與老師示例/);
const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
try{
  for(const width of [390,810,1280]){
    await page.setViewportSize({width,height:900});
    await page.goto(`${base}/chapter-14-reading.html?mode=original`);
    assert.equal(await page.locator('.reading-paper [data-paragraph]').count(),5);
    assert.equal(await page.locator('.reading-paper .l14-teacher-note').count(),0);
    const originalText=await page.locator('.reading-paper [data-paragraph]').evaluateAll(nodes=>nodes.map(node=>{const copy=node.cloneNode(true);copy.querySelectorAll('button').forEach(button=>button.remove());return copy.textContent;}));
    await page.getByRole('button',{name:'老師筆記',exact:true}).click();
    assert.equal(await page.locator('[data-teacher-paragraph]').count(),5);
    assert.deepEqual(await page.locator('[data-teacher-paragraph] > p').allTextContents(),originalText);
    await page.goto(`${base}/chapter-14-reading.html`);
    assert.equal(await page.locator('[data-reading-mode="teacher"].active').count(),1);
    assert.equal(await page.locator('.reading-paper .l14-teacher-note').count(),7);
    assert.equal(await page.locator('.l14-teacher-note[open]').count(),0);
    await page.locator('.l14-teacher-note').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
    await page.screenshot({path:resolve(folder,`reading-${width}.png`),fullPage:true});
    if((await page.locator('#furigana-toggle').innerText()).includes('ON'))await page.locator('#furigana-toggle').click();assert.equal(await page.locator('.l14-teacher-note ruby').count(),0);
    await page.getByRole('button',{name:'原文',exact:true}).click();
    assert.equal(await page.locator('.reading-paper .l14-teacher-note').count(),0);
    await page.locator('[data-reading-mode="questions"]').click();
    assert.equal(await page.locator('[data-truth-official]').isVisible(),false);
    await page.locator('[data-truth-reveal]').click();assert.equal(await page.locator('[data-truth-official] .l14-teacher-note').count(),1);
    await page.locator('[data-confirm-reveal]').click();assert.equal(await page.locator('[data-confirm-answer] .l14-teacher-note').count(),3);
    await page.locator('[data-textbook-draft="challenge-essay"]').fill('下書きを保存する。');await page.reload();
    await page.locator('[data-reading-mode="questions"]').click();assert.equal(await page.locator('[data-textbook-draft="challenge-essay"]').inputValue(),'下書きを保存する。');
    await page.goto(`${base}/chapter-14-textbook.html?mode=activities`);
    assert.equal(await page.locator('.l14-teacher-note').filter({hasText:'六步介紹作品'}).count(),1);
    assert.equal(await page.locator('.l14-teacher-note').filter({hasText:'徐倫、Harry Potter'}).count(),1);
    assert.equal(await page.locator('.l14-teacher-note').filter({hasText:'珍聞會話的七步結構'}).count(),1);
    assert.equal(await page.locator('.l14-teacher-note').filter({hasText:'留在叢林的士兵'}).count(),1);
    assert.equal(await page.locator('.l14-teacher-note').filter({hasText:'用故事框架整理口說'}).count(),1);
    assert.equal(await page.locator('.l14-teacher-note[open]').count(),0);
    await page.locator('.l14-teacher-note').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
    await page.locator('.l14-teacher-note').filter({hasText:'六步介紹作品'}).screenshot({path:resolve(folder,`november-practice-${width}.png`)});
    await page.goto(`${base}/chapter-14-textbook.html?mode=dialogue`);
    assert.equal(await page.locator('.dialogue-row').count(),22);assert.equal(await page.locator('.dialogue-row .l14-teacher-note').count(),8);
    await page.locator('.l14-teacher-note').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
    await page.goto(`${base}/chapter-14-textbook.html?mode=activities#teacher-response-practice`);
    assert.equal(await page.locator('.l14-response-task').count(),7);
    assert.equal(await page.locator('.l14-teacher-answer[open]').count(),0);
    const answer=page.locator('.l14-teacher-answer').first();await answer.locator('summary').focus();await page.keyboard.press('Enter');assert(await answer.getAttribute('open')!==null);
    await page.locator('.l14-teacher-answer').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
    await page.locator('#teacher-response-practice').screenshot({path:resolve(folder,`practice-${width}.png`)});
    await page.reload();assert.equal(await page.locator('.l14-teacher-answer[open]').count(),0);
    await page.goto(`${base}/chapter-14-vocabulary.html`);assert.equal(await page.locator('#vocab-list .l14-teacher-note').count(),118);
    await page.locator('#vocab-search').fill('減らない');assert.equal(await page.locator('#vocab-list .vocab-row').count(),1);
    await page.locator('#vocab-list summary').click();assert.match(await page.locator('#vocab-list').innerText(),/経ます/);await noOverflow();
    await page.locator('#vocab-list').screenshot({path:resolve(folder,`vocab-${width}.png`)});
  }
  await page.goto(`${base}/chapter-14-notes.html`);
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-teacher-grammar-id]')].every(n=>n.dataset.accessState==='signed-out'));
  assert.equal(await page.locator('[data-teacher-grammar-id]').count(),11);assert.equal(reads,0);
  assert((await page.locator('[data-teacher-demo-content]').allTextContents()).every(text=>text===''));
  await page.evaluate(()=>window.testAccount('approved'));
  await page.waitForFunction(()=>document.querySelector('[data-teacher-grammar-id]').dataset.accessState==='loaded');assert.equal(reads,1);
  for(const id of ids)assert.match(await page.locator(`[data-teacher-grammar-id="${id}"] [data-teacher-demo-content]`).textContent(),new RegExp(payload.notes[id].title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.equal(await page.locator('[data-teacher-demo-content] img').count(),0);
  await page.locator('[data-teacher-grammar-id]').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));await noOverflow();
  for(const width of [390,810,1280]){
    await page.setViewportSize({width,height:900});
    for(const theme of ['light','dark']){
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await noOverflow();
      await page.locator('.note-card').first().screenshot({path:resolve(folder,`protected-grammar-${width}-${theme}.png`)});
    }
  }
  assert(!await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('UNIQUE_PRIVATE')));
  await context.setOffline(true);await page.waitForFunction(()=>document.querySelector('[data-teacher-grammar-id]').dataset.accessState==='offline');
  assert((await page.locator('[data-teacher-demo-content]').allTextContents()).every(text=>text===''));
  status=403;await context.setOffline(false);await page.waitForFunction(()=>document.querySelector('[data-teacher-grammar-id]').dataset.accessState==='denied');
  assert((await page.locator('[data-teacher-demo-content]').allTextContents()).every(text=>text===''));
  status=200;await page.evaluate(()=>window.testAccount('approved-again'));await page.waitForFunction(()=>document.querySelector('[data-teacher-grammar-id]').dataset.accessState==='loaded');
  await page.evaluate(()=>window.testAccount(null));assert((await page.locator('[data-teacher-demo-content]').allTextContents()).every(text=>text===''));
  assert.deepEqual(errors,[]);
  console.log('Lesson 14 October: source mapping, 118 vocabulary notes, 7 reading notes, 8 dialogue notes, 7 hidden exercises, drafts, 3 widths, and 11 protected grammar notes passed.');
}finally{await context.close();await browser.close();await new Promise(done=>server.close(done));}
