// Validate the source datasets and their integration without live auth or PDFs.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import {chromium} from 'playwright';

const lessons=[14,15,16,17,18,19,20];
const auditedCounts={14:[11,18,31],15:[9,12,25],16:[10,16,25],17:[11,15,29],18:[8,14,29],19:[8,15,25],20:[12,20,35]};
const rendererScript=await readFile('assets/textbook-exercises.js','utf8');
const checks=new Map();
const draftFixtures=new Map();
const decode=text=>text.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
const baseText=text=>String(text).replace(/\{([^{}|]+)\|([^{}|]+)\}/gu,'$1');
const validSource=(source,label)=>{
  assert.equal(typeof source?.url,'string',label+' URL');
  assert.match(source.url,/^https:\/\//,label+' HTTPS URL');
  assert.ok(Number.isInteger(source.page)&&source.page>0,label+' PDF index');
};
for(const lesson of lessons){
  const window={};
  vm.runInNewContext(await readFile(`assets/ch${lesson}-data.js`,'utf8'),{window});
  if(lesson>=18)vm.runInNewContext(await readFile(`assets/ch${lesson}-quiz-data.js`,'utf8'),{window});
  const draftQuestion=window.JPY5_DATA.questions[0];
  draftFixtures.set(lesson,{version:1,id:'textbook-preserve',mode:'practice',questionIds:[draftQuestion.id],signatures:[lesson===14 ? window.JPY5QuestionSignatures[draftQuestion.id] : JSON.stringify([draftQuestion.id,draftQuestion.pattern,draftQuestion.prompt,draftQuestion.options,draftQuestion.answer])],index:0,answers:{},startedAt:'2026-10-18T00:00:00.000Z',revision:1});
  vm.runInNewContext(await readFile(`assets/ch${lesson}-textbook-exercises-data.js`,'utf8'),{window});
  vm.runInNewContext(rendererScript,{window});
  const data=window.JPY5_TEXTBOOK_EXERCISE_DATA,renderer=window.JPY5_TEXTBOOK_EXERCISES;
  assert.equal(data.lesson,lesson);assert.match(data.source,/^https:\/\//);
  const ids=new Set(window.JPY5_DATA.patterns.map(pattern=>pattern.id)),questionIds=new Set();
  const fields=[],groups=Object.entries(data.groups),kinds={},pages=new Set();let count=0,sectionCount=0;
  assert.ok(groups.length>0,`lesson ${lesson} has no groups`);
  for(const [id,sections] of groups){
    assert.ok(ids.has(id)||Object.hasOwn(data.orphanTitles||{},id),`lesson ${lesson}: undeclared pattern ${id}`);
    assert.ok(sections.length>0,`empty ${id}`);
    for(const section of sections){
      sectionCount++;assert.ok(Number.isInteger(section.page)&&section.page>=9&&section.page<=12,`lesson ${lesson}: source PDF page ${section.page}`);pages.add(section.page);
      assert.ok(section.title);assert.ok(section.printedPage!=null,`lesson ${lesson}/${id} missing printed page`);
      assert.ok(section.items.length>0,`empty section ${id}`);
      if(section.japaneseInstruction)fields.push([`${id}/instruction`,section.instruction]);
      if(section.model)fields.push([`${id}/model`,section.model]);
      for(const word of section.bank||[])fields.push([`${id}/bank`,word]);
      for(const item of section.items){
        count++;assert.ok(item.id&&!questionIds.has(item.id),`lesson ${lesson}: missing/duplicate item ID ${item.id}`);questionIds.add(item.id);
        assert.ok(['official','suggested','personal','missing'].includes(item.answerKind),`lesson ${lesson}/${item.id}: explicit answerKind required`);
        kinds[item.answerKind]=(kinds[item.answerKind]||0)+1;
        validSource(item.answerSource||section.answerSource,`lesson ${lesson}/${item.id} answer source`);
        assert.equal(typeof item.prompt,'string');fields.push([`${item.id}/prompt`,item.prompt]);
        for(const option of item.options||[])fields.push([`${item.id}/option`,option]);
        if(item.answerKind==='missing')assert.ok(!item.answer,`${item.id}: missing key must not contain an invented answer`);
        else{assert.equal(typeof item.answer,'string',`${item.id} answer`);fields.push([`${item.id}/answer`,item.answer]);}
      }
    }
    assert.ok(renderer.render(id).includes(`data-textbook-pattern="${id}"`));
  }
  for(const [id,title] of Object.entries(data.orphanTitles||{})){assert.ok(Object.hasOwn(data.groups,id),`orphan title without group ${id}`);fields.push([`${id}/title`,title]);}
  for(const [label,text] of fields){
    const html=renderer.jp(text);
    assert.equal(decode(html.replace(/<rt>.*?<\/rt>/gs,'').replace(/<br>/g,'\n').replace(/<[^>]*>/g,'')),baseText(text),`lesson ${lesson}/${label}: ruby changed wording`);
    assert.doesNotMatch(html.replace(/<ruby>.*?<\/ruby>/gs,''),/[\p{Script=Han}々〆]/u,`lesson ${lesson}/${label}: unannotated Japanese ${text}`);
    for(const [,reading] of html.matchAll(/<rt>(.*?)<\/rt>/gs))assert.match(decode(reading),/^[\p{Script=Hiragana}ー]+$/u,`lesson ${lesson}/${label}: non-hiragana reading`);
    assert.doesNotMatch(baseText(text),/[{}|]/,`lesson ${lesson}/${label}: malformed annotation`);
  }
  assert.deepEqual([...pages].sort((a,b)=>a-b),[9,10,11,12],`lesson ${lesson}: exercise PDF page coverage`);
  assert.deepEqual([groups.length,sectionCount,count],auditedCounts[lesson],`lesson ${lesson}: independently audited groups/sections/items`);
  const page=await readFile(`chapter-${lesson}-notes.html`,'utf8');
  for(const name of ['ch13-teacher-additions.css','ch13-textbook-exercises.css',`ch${lesson}-textbook-exercises-data.js`,'textbook-exercises.js'])assert.ok(page.includes(`assets/${name}`),`${lesson}: missing ${name}`);
  assert.ok(page.indexOf(`assets/ch${lesson}-textbook-exercises-data.js`)<page.indexOf('assets/textbook-exercises.js'));
  assert.ok(page.indexOf('assets/textbook-exercises.js')<page.indexOf('assets/notes.js'));
  checks.set(lesson,{groups:groups.length,sections:sectionCount,count,kinds,patterns:ids.size});
}
console.log('Source dataset validation:',JSON.stringify(Object.fromEntries(checks)));

// Serve only known public inventory plus these new integration files.
const inventory={self:{}};vm.runInNewContext(await readFile('assets/offline-assets.js','utf8'),inventory);
const allowed=new Set([...inventory.self.JPY5_OFFLINE_MANIFEST.assets,'assets/textbook-exercises.js',...lessons.map(n=>`assets/ch${n}-textbook-exercises-data.js`)]);
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname.slice(1);
  if(req.method!=='GET'||!allowed.has(path))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
  browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
  const context=await browser.newContext({serviceWorkers:'block',hasTouch:true});
  let protectedRequests=0,pdfRequests=0;const errors=[];
  context.on('request',request=>{if(request.url().includes('jpy5TeacherNotes'))protectedRequests++;if(/\.pdf(?:[?#]|$)/i.test(request.url()))pdfRequests++;});
  await context.route('https://**/*',route=>route.abort());
  await context.route('**/assets/firebase-sync.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export const initialiseFirebaseSync=()=>{};'}));
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  const base=`http://127.0.0.1:${server.address().port}/`;
  for(const lesson of lessons){
    const expected=checks.get(lesson);
    for(const width of [390,810,1280]){
      await page.setViewportSize({width,height:1000});await page.goto(`${base}chapter-${lesson}-notes.html`);
      await page.locator('[data-textbook-pattern]').first().waitFor();
      assert.equal(await page.locator('[data-textbook-pattern]').count(),expected.groups);
      assert.equal(await page.locator('[data-textbook-question]').count(),expected.count);
      assert.equal(await page.locator('.grammar-grid > .note-card').count(),expected.patterns);
      assert.equal(await page.locator('.textbook-practice[open],.textbook-answer[open]').count(),0);
      assert.equal(await page.locator('.textbook-answer-body:visible').count(),0);
      await page.evaluate(({n,draft})=>{
        localStorage.setItem(`jpy5.chapter${n}.bookmarks`,'["textbook-preserve"]');
        localStorage.setItem(`jpy5.chapter${n}.quiz.activeRun`,JSON.stringify(draft));
      },{n:lesson,draft:draftFixtures.get(lesson)});
      const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
      for(const group of await page.locator('.textbook-practice').all()){
        const summary=group.locator(':scope > summary');await summary.focus();await page.keyboard.press('Enter');
        assert.equal(await group.evaluate(node=>node.open),true);
        assert.equal(await group.locator('.textbook-answer-body:visible').count(),0);
        // Every item gets an independent keyboard-accessible disclosure.
        for(const answer of await group.locator('.textbook-answer').all()){
          await answer.locator(':scope > summary').focus();await page.keyboard.press('Space');
          assert.equal(await answer.locator('.textbook-answer-body').isVisible(),true);
          assert.equal(await page.locator('.textbook-answer[open]').count(),1);
          await page.keyboard.press('Enter');assert.equal(await answer.evaluate(node=>node.open),false);
        }
        for(const theme of ['light','dark']){
          await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`lesson ${lesson} ${width}px ${theme}`);
        }
        await summary.focus();await page.keyboard.press('Space');assert.equal(await group.evaluate(node=>node.open),false);
      }
      const first=page.locator('.textbook-practice').first();await first.locator(':scope > summary').tap();
      const answers=first.locator('.textbook-answer');await answers.first().locator('summary').tap();
      if(await answers.count()>1){await answers.nth(1).locator('summary').tap();assert.equal(await page.locator('.textbook-answer[open]').count(),2);}
      assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
      await page.reload();await page.locator('[data-textbook-pattern]').first().waitFor();
      assert.equal(await page.locator('.textbook-practice[open],.textbook-answer[open]').count(),0);
      assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
      if(lesson===17){assert.equal(await page.locator('[data-textbook-unmatched-pattern="ue"]').count(),1);assert.equal(await page.locator('[data-textbook-unmatched-pattern="ue"] > h3 rt').innerText(),'じょう');}
    }
    console.log(`Lesson ${lesson}: browser disclosures/progress passed at all3widths and both themes.`);
  }
  assert.equal(protectedRequests,0,'no teacher content requests when auth is unavailable');
  assert.equal(pdfRequests,0,'no PDF preloads');assert.deepEqual(errors,[]);
  await context.close();console.log('Lessons 14–20 textbook integration passed: 3 widths, 2 themes, keyboard/touch disclosures, reload defaults, progress preservation, no protected/PDF requests.');
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done));}
