import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright';
const c={window:{}};
for(const name of ['data','vocabulary-data','conversation-data','reading-data','teacher-additions','teacher-grammar'])vm.runInNewContext(await readFile(`assets/ch14-${name}.js`,'utf8'),c);
const t=c.window.JPY5_L14_TEACHER,ids=Array.from(c.window.JPY5_DATA.patterns,p=>p.id);
assert.equal(Object.keys(t.vocabulary).length,118);
assert.equal(t.responsePractice.length,7);
for(const id of Object.keys(t.vocabulary))assert(c.window.JPY5_VOCABULARY.items.some(v=>v.id==id));
const {grammar,block}=c.window.JPY5_TEACHER;
assert.deepEqual(Object.keys(grammar),ids);
assert.equal(Object.values(grammar).flatMap(note=>note.examples).length,75);
// Canonical digest of the previously live notes, including every title, example and source.
assert.equal(createHash('sha256').update(JSON.stringify({version:1,notes:grammar})).digest('hex'),
  'fb39b7ee4d5b0a1b63d1782e42f9a2a8b3a0b8e906c37a4a6041af260c3e5e6c');
const hostile='<img src=x onerror=alert(1)>';
assert(!block({title:hostile,text:hostile,source:hostile,pages:hostile,examples:[['{<|&}',hostile]]}).includes(hostile));
const manifest={self:{}};vm.runInNewContext(await readFile('assets/offline-assets.js','utf8'),manifest);
const allowed=new Set([...manifest.self.JPY5_OFFLINE_MANIFEST.assets,'assets/offline-assets.js','sw.js']);
assert(![...allowed].some(path=>/private-migration|\.pdf$/.test(path)));
assert(allowed.has('assets/ch14-teacher-grammar.js'));
assert(!allowed.has('assets/ch14-teacher-placeholders.js'));
assert(!allowed.has('assets/teacher-grammar-notes.mjs'));
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
const protectedRequests=[];
page.on('request',request=>{
  if(/jpy5TeacherNotes|jpy5TeacherAccess/.test(request.url()))protectedRequests.push(request.url());
});
await context.route('https://**/*',route=>route.abort());
const reviewPage=await readFile('chapter-14-review.html','utf8');
assert.match(reviewPage,/chapter-14-reading\.html\?mode=teacher/);
assert.match(reviewPage,/7 NOV 會話框架與老師示例/);
assert.match(reviewPage,/24 OCT–14 NOV 2026/);
assert.match(reviewPage,/<a href="chapter-14-notes.html">老師文法筆記<\/a>/);
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
  const panels=page.locator('.note-card > details[data-teacher-grammar]');
  assert.equal(await panels.count(),11);
  assert.equal(await page.locator('[data-teacher-grammar][open]').count(),0);
  assert.equal(await panels.locator(':scope > summary').filter({hasText:'24 OCT–14 NOV'}).count(),11);
  assert.equal(await page.locator('[data-teacher-demo],[data-teacher-demo-login],[data-teacher-demo-retry]').count(),0);
  for(const [index,id] of ids.entries()){
    const note=grammar[id],panel=panels.nth(index),content=panel.locator('.teacher-addition-body');
    assert.equal(await panel.locator(':scope > summary').textContent(),'老師補充 · 24 OCT–14 NOV '+note.title);
    assert.deepEqual(await content.locator(':scope > p').allTextContents(),note.text.split(/\r?\n\s*\r?\n/));
    assert.deepEqual(await content.locator('p[lang="zh-Hant"]').allTextContents(),Array.from(note.examples,([,zh])=>zh));
    assert.deepEqual(await content.locator('p[lang="ja"]').allTextContents(),Array.from(note.examples,([ja])=>ja.replace(/\{([^{}|]+)\|([^{}|]+)\}/g,'$1$2')));
    assert.deepEqual(await content.locator('rt').allTextContents(),Array.from(note.examples).flatMap(([ja])=>Array.from(ja.matchAll(/\{[^{}|]+\|([^{}|]+)\}/g),match=>match[1])));
    assert.equal(await content.locator('.teacher-source').textContent(),'來源 · '+note.source+' · 頁碼／段落 '+note.pages);
  }
  assert.equal(await panels.locator('img').count(),0);
  assert.deepEqual(protectedRequests,[]);
  assert.deepEqual(errors,[]);
  console.log('Lesson 14 teacher notes: source mapping, 118 vocabulary notes, 7 reading notes, 8 dialogue notes, 7 hidden exercises, drafts, 3 widths, and 11 public grammar notes and 75 example pairs passed.');
}finally{await context.close();await browser.close();await new Promise(done=>server.close(done));}
