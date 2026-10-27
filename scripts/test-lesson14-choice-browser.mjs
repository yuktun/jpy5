import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {extname,resolve} from 'node:path';
import vm from 'node:vm';
const {chromium}=createRequire(import.meta.url)('playwright');
const old={window:{},localStorage:{getItem:()=>null}};
vm.runInNewContext(execFileSync('git',['show','666d5e9ebe0f27f99e7071804d1e31cb55100ab7:assets/ch14-data.js'],{encoding:'utf8'}),old);
const original=JSON.parse(JSON.stringify(old.window.JPY5_DATA));
const manifest={self:{}};vm.runInNewContext(await readFile('assets/offline-assets.js','utf8'),manifest);
const allowed=new Set([...manifest.self.JPY5_OFFLINE_MANIFEST.assets,'sw.js','assets/offline-assets.js']);
const server=createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname.slice(1);if(!allowed.has(path))return res.writeHead(404).end();try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[extname(path)]||'application/octet-stream');res.end(await readFile(resolve(path)));}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${server.address().port}`,prefix='jpy5.chapter14.quiz.';
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const results=[];let checks=0;
const setup=async()=>{const ctx=await browser.newContext({serviceWorkers:'block'});await ctx.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());const page=await ctx.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));return {ctx,page,errors};};
const order=page=>page.locator('#quiz-options button').evaluateAll(es=>es.map(e=>e.dataset.optionId));
try{
  for(const mode of ['practice','exam']){
    const {ctx,page,errors}=await setup();await page.goto(base+'/chapter-14-quiz.html');
    await page.locator(`[data-mode="${mode}"]`).click();await page.locator('#random-order').check();await page.locator('#start-quiz').click();
    const firstOrder=await order(page);await page.locator('[data-answer="0"]').click();
    const selectedBefore=await page.locator('#quiz-options button.selected,#quiz-options button.correct').getAttribute('data-option-id');
    await page.reload();await page.locator('#continue-quiz').click();assert.deepEqual(await order(page),firstOrder);checks++;
    assert.equal(await page.locator('#quiz-options button.selected,#quiz-options button.correct').getAttribute('data-option-id'),selectedBefore);checks++;
    if(mode==='exam'){assert.equal(await page.locator('#answer-explanation').innerText(),'');assert.equal(await page.locator('[data-answer="0"]').isEnabled(),true);}
    await page.locator('#next-question').click();const secondOrder=await order(page);
    // Fixture-level backward/forward index replay checks the same renderer used by resume.
    await page.evaluate(()=>{run.index=0;renderQuestion()});assert.deepEqual(await order(page),firstOrder);
    await page.evaluate(()=>{run.index=1;renderQuestion()});assert.deepEqual(await order(page),secondOrder);checks+=2;
    await page.goto(base+'/chapter-13-quiz.html');await page.goBack();await page.locator('#continue-quiz').click();assert.deepEqual(await order(page),secondOrder);checks++;
    // All correct canonical identities must grade correctly regardless of display position.
    for(let i=1;i<33;i++){await page.locator('[data-answer="0"]').click();await page.locator('#next-question').click();}
    await page.locator('#quiz-result').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#result-score').textContent==='33 / 33');
    assert.equal(await page.locator('#result-score').innerText(),'33 / 33');assert.match(await page.locator('#result-message').innerText(),/不代表整課已完全掌握/);checks+=2;
    await page.goto(base+'/chapter-14-history.html');await page.locator('.history-card details summary').first().click();assert.equal(await page.locator('.history-answer.is-correct').count(),33);checks++;
    assert.deepEqual(errors,[]);results.push({mode,allCorrect:'33/33',reload:true,backForward:true,history:true});await ctx.close();
  }
  {
    const {ctx,page,errors}=await setup();await page.goto(base+'/chapter-14-quiz.html');await page.locator('[data-mode="exam"]').click();await page.locator('#random-order').check();await page.locator('#start-quiz').click();
    for(let i=0;i<33;i++){await page.locator('#quiz-options button').first().click();await page.locator('#next-question').click();}
    await page.waitForFunction(()=>document.querySelector('#result-score').textContent.includes('/'));
    const score=Number((await page.locator('#result-score').innerText()).split('/')[0]);assert(score===8||score===9);checks++;
    results.push({firstDisplayedStrategy:score+'/33'});assert.deepEqual(errors,[]);await ctx.close();
  }
  {
    const {ctx,page,errors}=await setup();const first=original.questions[0];
    const record={id:'old-history',date:'2020-01-01',mode:'exam',score:0,total:1,results:[{questionId:first.id,selected:1,correct:false}]};
    const draft={version:1,id:'legacy-browser-fixture',mode:'exam',questionIds:original.questions.slice(0,3).map(q=>q.id),signatures:original.questions.slice(0,3).map(q=>JSON.stringify([q.id,q.pattern,q.prompt,q.options,q.answer])),index:0,answers:{[first.id]:1},startedAt:'2026-10-20',revision:2};
    await page.addInitScript(({prefix,draft,record})=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(prefix+'activeRun',JSON.stringify(draft));localStorage.setItem(prefix+'history',JSON.stringify([record]));sessionStorage.setItem('seeded','1');}},{prefix,draft,record});
    await page.goto(base+'/chapter-14-quiz.html');await page.locator('[data-mode="practice"]').click();await page.locator('#continue-quiz').click();
    assert.equal(await page.locator('#answer-explanation').innerText(),'','saved exam mode wins over setup toggle');
    assert.equal(await page.locator('[data-answer="1"]').innerText(),first.options[1]);assert.equal(await page.locator('[data-answer="1"]').getAttribute('class'),'selected');checks+=3;
    const oldOrder=await order(page);await page.reload();await page.locator('#continue-quiz').click();assert.deepEqual(await order(page),oldOrder);checks++;
    await page.goto(base+'/chapter-14-history.html');await page.locator('.history-card summary').click();assert((await page.locator('.history-answer').innerText()).includes(first.options[1]));
    assert.deepEqual(await page.evaluate(prefix=>JSON.parse(localStorage.getItem(prefix+'history')),prefix),[record]);checks+=2;
    assert.deepEqual(errors,[]);results.push({legacyDraft:true,legacyHistoryUnchanged:true,legacyOptionText:true});await ctx.close();
  }
  await mkdir('work/audit-2026-10-27',{recursive:true});await writeFile('work/audit-2026-10-27/quiz-choice-browser-results.json',JSON.stringify({checks,results},null,2));
  console.log(`PASS ${checks} isolated Edge DOM/grading assertions: canonical correct answers, first-position regression, new/legacy drafts/history, reload, index back/forward, browser navigation and mode isolation.`);
}finally{await browser.close();await new Promise(done=>server.close(done));}
