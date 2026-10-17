import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const root=process.cwd(), contextData={window:{}};
vm.runInNewContext(await readFile('assets/ch13-teacher-additions.js','utf8'),contextData);
vm.runInNewContext(await readFile('assets/ch13-textbook-exercises.js','utf8'),contextData);
const groups=contextData.window.JPY5_TEXTBOOK_EXERCISES.groups;
const counts={tate:1,tatoe:1,tarishinai:1,hodo:6,ndatte:1,nagara:6,tsumari:3,yone:2};
const questions=Object.values(groups).flatMap(parts=>parts.flatMap(part=>part.items));
assert.equal(questions.length,21);
assert.equal(new Set(questions.map(q=>q.id)).size,21);
assert.equal(questions.filter(q=>q.personal).length,2);
for(const [id,count] of Object.entries(counts)) assert.equal(groups[id].flatMap(part=>part.items).length,count,id);
for(const part of Object.values(groups).flat()) assert.ok([9,10,11,12].includes(part.page));
assert.equal(groups.yone[0].items[0].answer,'a．そうですよ。');
assert.equal(groups.nagara[0].items[0].answer,'いい車を持ってい');
const jp=contextData.window.JPY5_TEXTBOOK_EXERCISES.jp;
const japaneseFields=Object.values(groups).flatMap(parts=>parts.flatMap(part=>[
  ...(part.japaneseInstruction?[part.instruction]:[]),...(part.model?[part.model]:[]),...part.bank||[],
  ...part.items.flatMap(q=>[q.prompt,q.answer,...q.options||[]])
]));
for(const text of japaneseFields) {
  const html=jp(text);
  assert.equal(html.replace(/<rt>.*?<\/rt>/g,'').replace(/<br>/g,'\n').replace(/<[^>]*>/g,''),text,'ruby changed original wording');
  assert.doesNotMatch(html.replace(/<ruby>.*?<\/ruby>/g,''),/[\p{Script=Han}々]/u,`missing reading: ${text}`);
  for(const [,reading] of html.matchAll(/<rt>(.*?)<\/rt>/g)) assert.match(reading,/^[ぁ-ゖー]+$/u);
}
for(const [text,expected] of [['人気','にんき'],['二人','ふたり'],['双子','ふたご'],['１回','いっかい'],['月','つき'],['来','こ'],['話し','はな'],['話','はなし'],['出し','だ'],['出','で']]) assert.ok(jp(text).includes(`<rt>${expected}</rt>`),text);
const {chromium}=createRequire(import.meta.url)('playwright');
const out=resolve('tmp/lesson13-textbook-exercises');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
  try {
    const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(root+sep))return res.writeHead(403).end();
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  }catch {res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
try {
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('https://**/*',route=>route.abort());
  const page=await context.newPage(),errors=[],pdfRequests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',req=>{if(/\.pdf(?:$|[?#])/.test(req.url()))pdfRequests.push(req.url());});
  const base=process.env.JPY5_LIVE_URL||`http://127.0.0.1:${server.address().port}/`;
  if(process.env.JPY5_LIVE_URL) await context.unroute('https://**/*');
  for(const width of [390,810,1280]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(base+'chapter-13-notes.html');
    await page.waitForSelector('[data-textbook-pattern]');
    await page.evaluate(()=>{
      localStorage.setItem('jpy5.chapter13.bookmarks','["tate"]');
      localStorage.setItem('jpy5.chapter13.quiz.activeRun','{"test":"preserve-draft"}');
    });
    const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
    assert.equal(await page.locator('.textbook-answer').count(),21);
    assert.equal(await page.locator('.textbook-answer[open]').count(),0);
    assert.equal(await page.locator('.textbook-practice[open]').count(),0);
    assert.equal(await page.locator('[data-textbook-question]:visible').count(),0);
    await page.locator('.grammar-card').first().screenshot({path:resolve(out,`collapsed-${width}.png`),style:'.lesson-quick-switcher,.site-header{visibility:hidden}'});
    for(const [id,count] of Object.entries(counts)) {
      const practice=page.locator(`[data-textbook-pattern="${id}"]`);
      assert.equal(await practice.locator('[data-textbook-question]').count(),count);
      assert.equal(await practice.evaluate(el=>el.previousElementSibling.classList.contains('examples-list')),true);
      assert.equal(await practice.locator('.textbook-answer-body:visible').count(),0);
      const toggle=practice.locator(':scope > summary');
      await toggle.focus();await page.keyboard.press('Enter');
      assert.equal(await practice.locator('[data-textbook-question]:visible').count(),count);
      assert.equal(await practice.locator('.textbook-answer-body:visible').count(),0,'opening group exposed an answer');
      await page.keyboard.press('Space');
      assert.equal(await practice.locator('[data-textbook-question]:visible').count(),0);
      await toggle.click();
    }
    const missingRuby=await page.locator('.textbook-practice [lang="ja"]').evaluateAll(nodes=>nodes.flatMap(node=>{
      const clone=node.cloneNode(true);clone.querySelectorAll('ruby').forEach(r=>r.remove());return /[\p{Script=Han}々]/u.test(clone.textContent)?[clone.textContent]:[];
    }));
    assert.deepEqual(missingRuby,[],'Japanese exercise text lacks furigana');
    for(const details of await page.locator('.textbook-answer').all()) {
      const summary=details.locator('summary'),body=details.locator('.textbook-answer-body');
      await summary.focus();await page.keyboard.press('Enter');
      assert.equal(await body.isVisible(),true);
      assert.equal(await page.locator('.textbook-answer[open]').count(),1);
      assert.ok(await body.locator('ruby rt').count()>0||!(await body.locator('p[lang="ja"]').innerText()).match(/[\p{Script=Han}々]/u));
      const questionId=await details.evaluate(el=>el.parentElement.dataset.textbookQuestion);
      if(width===390&&['nagara-3-1','tsumari-1-1','tsumari-2-1'].includes(questionId)) await body.screenshot({path:resolve(out,`answer-${questionId}.png`),style:'.lesson-quick-switcher,.site-header{visibility:hidden}'});
      await page.keyboard.press('Space');assert.equal(await body.isVisible(),false);
    }
    const first=page.locator('.textbook-answer').first();
    await first.locator('summary').click();assert.equal(await first.locator('.textbook-answer-body').isVisible(),true);
    await first.locator('summary').click();
    for(const theme of ['light','dark']) {
      await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      for(const id of ['tate','hodo','nagara','yone']) {
        // Keep the sticky site navigation out of tall element captures only.
        await page.locator(`[data-textbook-pattern="${id}"]`).screenshot({path:resolve(out,`${id}-${width}-${theme}.png`),style:'.lesson-quick-switcher,.site-header{visibility:hidden}'});
      }
    }
    assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
    await page.reload();await page.waitForSelector('.textbook-practice');
    assert.equal(await page.locator('.textbook-answer[open]').count(),0);
    assert.equal(await page.locator('.textbook-practice[open]').count(),0);
    assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
    await page.goto(base+'chapter-14-notes.html');
    assert.equal(await page.locator('.textbook-practice').count(),0,'Lesson 13 content leaked to another lesson');
  }
  assert.deepEqual(pdfRequests,[]);assert.deepEqual(errors,[]);
  if(!process.env.JPY5_LIVE_URL) {
    const offlineContext=await browser.newContext();
    const offlinePage=await offlineContext.newPage();
    await offlinePage.goto(base+'chapter-13-notes.html');
    await offlinePage.waitForFunction(()=>!!navigator.serviceWorker.controller&&document.querySelector('.pwa-status')?.dataset.state==='online');
    await offlinePage.locator('.pwa-status').click();
    await offlinePage.locator('[data-offline-download]').click();
    await offlinePage.waitForFunction(()=>document.querySelector('.pwa-status')?.dataset.state==='ready',null,{timeout:90000});
    await offlineContext.setOffline(true);
    await offlinePage.reload();
    await offlinePage.waitForSelector('.textbook-practice');
    assert.equal(await offlinePage.locator('.textbook-answer').count(),21);
    assert.equal(await offlinePage.locator('.textbook-answer[open]').count(),0);
    assert.equal(await offlinePage.locator('.textbook-practice[open]').count(),0);
    for(const summary of await offlinePage.locator('.textbook-practice > summary').all()) await summary.click();
    assert.ok(await offlinePage.locator('.textbook-practice ruby rt').count()>0);
    for(const answer of await offlinePage.locator('.textbook-answer').all()) {
      await answer.locator('summary').click();
      assert.equal(await answer.locator('.textbook-answer-body').isVisible(),true);
      await answer.locator('summary').click();
    }
    await offlineContext.close();
    console.log('PASS all 21 new answer disclosures after explicit package download and offline reload.');
  }
  console.log('PASS Lesson 13 textbook: 8 mapped grammar cards / 21 items; individual mouse/keyboard disclosure; 390/810/1280 light/dark; retained progress/drafts; no PDF downloads; no cross-lesson leakage.');
} finally {await browser.close();await new Promise(r=>server.close(r));}
