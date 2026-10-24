import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd();
const source=await readFile('assets/ch13-quiz1.js','utf8');
const data=JSON.parse(source.match(/const data = ([\s\S]*?);\n  const host/)[1]);
assert.deepEqual(data.sections.map(s=>[s.id,s.items.length]),[['I',2],['II',9],['III',8],['IV',4],['V',4],['VI',4],['VII',3],['VIII',2],['IX',2]]);
assert.equal(data.sections.flatMap(s=>s.items).filter(i=>i.answer).length,38);
assert.deepEqual(data.sections[0].items.map(i=>i.answer),['ゆうべはシャワーを浴びずに寝てしまうほど疲れていました。','たとえお金をたくさんもらっても、危ない仕事はしたくないです。']);
assert(data.sections[0].items.every(i=>!i.unavailable&&i.reading&&/機器轉寫/.test(i.provenance)&&/未經真人聽校/.test(i.provenance)&&/非官方/.test(i.provenance)));
assert.match(data.sections[0].items[0].reading,/あびずにねてしまうほどつかれて/);
assert.match(data.sections[0].items[1].reading,/おかね.*あぶないしごと/);
assert.doesNotMatch(source,/soul2\.hkuspace|resource\/view\.php|\.mp3|faster-whisper|file_00000000/);
assert.deepEqual(data.sections[1].items.map(i=>i.answer),['あまとう','はじ','a）いっしゅん　b）きぎょう','かんちがい','しこうさくご','はんい','横断','直訳','看板']);
assert.deepEqual(data.sections[3].items.map(i=>i.answer.slice(0,1)),['b','a','a','b']);
assert.equal(data.sections[7].items[0].answer,'② → ③ → ① → ⑤ → ④');
assert.equal(data.sections[7].items[1].answer,'①');
assert(data.sections[5].items.every(i=>i.open&&i.explanation));

// The context audit must never rewrite source questions, choices, answer keys or open models.
const publishedSource=execFileSync('git',['show','b29bd388:assets/ch13-quiz1.js'],{encoding:'utf8'});
const publishedData=JSON.parse(publishedSource.match(/const data = ([\s\S]*?);\n  const host/)[1]);
const withoutAudit=value=>JSON.parse(JSON.stringify(value,(key,value)=>['lessonContext','explanation'].includes(key)?undefined:value));
assert.deepEqual(withoutAudit(data.sections.slice(1)),withoutAudit(publishedData.sections.slice(1)));
assert.deepEqual(data.sections[0].items.map(i=>i.prompt),publishedData.sections[0].items.map(i=>i.prompt));
assert.equal(data.sections[0].instruction,publishedData.sections[0].instruction);
const audited=data.sections.slice(1).flatMap(s=>s.items).filter(i=>i.answer);
assert.equal(audited.filter(i=>i.lessonContext).length,36);
assert(audited.every(i=>i.lessonContext.label&&i.lessonContext.note.length>15));
assert(data.sections[0].items.every(i=>i.lessonContext.href==='chapter-13-notes.html'));
assert.match(data.sections[6].items[2].explanation,/すでに.*並非文法上不可能/);
assert.match(data.sections[2].items[0].explanation,/が／使い分けられない/);
assert.match(data.sections[5].items[2].explanation,/まじめな／約束を破っ/);
// Verify the precise supporting lesson material still contains the audited anchors.
for(const [file,anchors] of [
 ['assets/reading-data.js',['どう使い分けたら','国語辞典が忍ばせてあった','月日を要した','思い込んだまま','頭にまっすぐ浮かぶ']],
 ['assets/conversation-data.js',['確かにあわてて間違えちゃうことってよくあるよね','ところで、さっきの話だけど','誰でも失敗することはある','何でも一生懸命続けたら']],
 ['chapter-13-vocabulary.html',['すでに」並非文法上不可能','宿題なんかとっくにやったよ']]
]){const text=await readFile(file,'utf8');for(const anchor of anchors)assert(text.includes(anchor),file+': missing source anchor '+anchor);}

assert.equal(data.sections[2].items[5].answer,'に／出くわし');
const html=await readFile('chapter-13-review.html','utf8');
const baseline=execFileSync('git',['show','33bfbd8:chapter-13-review.html'],{encoding:'utf8'});
assert.equal(html.replace(/<!-- BEGIN LESSON 13 QUIZ1 (?:RESOURCES|LINK|EXERCISE) -->[\s\S]*?<!-- END LESSON 13 QUIZ1 (?:RESOURCES|LINK|EXERCISE) -->/g,'').replace(/\r\n/g,'\n'),baseline.replace(/\r\n/g,'\n').replace('<details class="teacher-exercise" open>','<details class="teacher-exercise">').replace('assets/teacher-supplements.js?v=3','assets/teacher-supplements.js?v=4').replace('assets/teacher-word-help.css?v=2','assets/teacher-word-help.css?v=3'),'Existing review content changed');
const server=createServer(async(req,res)=>{try {const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+sep))return res.writeHead(403).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'})[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const ctx=await browser.newContext({serviceWorkers:'block'});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const key='jpy5.lesson13.quiz1.26a.drafts.v1';
try{
 await page.goto(base+'/chapter-13-review.html');
 await page.waitForSelector('[data-quiz13-question]',{state:'attached'});
 assert.equal(await page.locator('[data-quiz13-question]').count(),38);
 assert.equal(await page.locator('.quiz13-answer').count(),38);
 assert.equal(await page.locator('#lesson13-quiz1 textarea,#lesson13-quiz1 fieldset').count(),40);
 await page.addScriptTag({url:base+'/assets/ch13-quiz1.js'});
 assert.equal(await page.locator('[data-quiz13-question]').count(),38,'Reinitialization duplicated questions');
 assert.equal(await page.locator('.quiz13-answer[open]').count(),0);
 assert.equal(await page.locator('.quiz13-context-source').count(),38);
 assert.equal(await page.locator('.quiz13-context-source:visible').count(),0);
 assert.equal(await page.locator('.quiz13-question-list u').count(),10);
 assert.equal(await page.locator('#quiz13-II rt').count(),0,'Kanji readings must not reveal exercise answers');
 await page.evaluate(()=>document.querySelectorAll('.quiz13-section').forEach(d=>d.open=true));
 for(let i=0;i<38;i++){
  const answer=page.locator('.quiz13-answer').nth(i);const summary=answer.locator('summary');
  assert.equal(await answer.locator(':scope > div').isVisible(),false);
  await summary.focus();await page.keyboard.press('Enter');assert.equal(await answer.locator(':scope > div').isVisible(),true);assert(await answer.locator('.quiz13-context-source').isVisible());
  await page.keyboard.press('Enter');assert.equal(await answer.locator(':scope > div').isVisible(),false);
 }
 // Independent text/radio drafts survive navigation and reload without touching other progress.
 await page.evaluate(()=>{localStorage.setItem('jpy5.quiz13-regression-sentinel','preserved');});
 await page.locator('#quiz13-I-1-0').fill('以前的聽寫草稿');
 await page.locator('#quiz13-II-1-0').fill('あまとう');
 await page.locator('[name="quiz13-IV-1"][value="1"]').check();
 await page.goto(base+'/chapter-13-reading.html');await page.goto(base+'/chapter-13-review.html');
 assert.equal(await page.locator('#quiz13-I-1-0').inputValue(),'以前的聽寫草稿');
 assert.equal(await page.locator('#quiz13-II-1-0').inputValue(),'あまとう');
 assert(await page.locator('[name="quiz13-IV-1"][value="1"]').isChecked());
 assert.equal(await page.locator('.quiz13-answer[open]').count(),0);
 assert.equal(await page.evaluate(()=>localStorage.getItem('jpy5.quiz13-regression-sentinel')),'preserved');
 // Drafts are text, never inserted as HTML.
 await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({'quiz13-II-1-0':'<img src=x onerror=alert(1)>'})),key);await page.reload();
 assert.equal(await page.locator('#lesson13-quiz1 img').count(),0);
 assert.equal(await page.locator('#quiz13-II-1-0').inputValue(),'<img src=x onerror=alert(1)>');
 for(const width of [390,810,1280]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>document.querySelectorAll('.quiz13-section,.quiz13-answer').forEach(d=>d.open=true));
  for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} ${theme} overflow`);}
 }
 await page.locator('#quiz13-II-1-0').fill('あまとう');
 await page.setViewportSize({width:390,height:844});await page.locator('#lesson13-quiz1').evaluate(el=>el.scrollIntoView({block:'start'}));await mkdir('tmp/lesson13-quiz1-browser',{recursive:true});await page.screenshot({path:'tmp/lesson13-quiz1-browser/phone.png'});await page.locator('#quiz13-II').screenshot({path:'tmp/lesson13-quiz1-browser/kanji-phone.png'});
 await page.goto(base+'/chapter-13-review.html#quiz13-IX');assert.equal(await page.locator('#quiz13-IX').getAttribute('open'),'');
 await page.evaluate(k=>localStorage.setItem(k,'invalid-json'),key);await page.reload();assert.equal(await page.locator('#quiz13-II-1-0').inputValue(),'');
 const denied=await browser.newContext({serviceWorkers:'block'});await denied.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Unavailable','SecurityError');};Storage.prototype.setItem=()=>{throw new DOMException('Unavailable','QuotaExceededError');};});
 const deniedPage=await denied.newPage();await deniedPage.goto(base+'/chapter-13-review.html#quiz13-II');await deniedPage.locator('#quiz13-II-1-0').fill('あまとう');assert.match(await deniedPage.locator('.quiz13-save-status').textContent(),/暫不可用/);await deniedPage.locator('#quiz13-II .quiz13-answer summary').first().click();assert(await deniedPage.locator('#quiz13-II .quiz13-answer').first().locator(':scope > div').isVisible());await denied.close();
 const offlineContext=await browser.newContext();
 const offlinePage=await offlineContext.newPage();
 await offlinePage.goto(base+'/chapter-13-review.html');
 await offlinePage.waitForFunction(()=>!!navigator.serviceWorker.controller&&document.querySelector('.pwa-status')?.dataset.state==='online');
 await offlinePage.locator('.pwa-status').click();await offlinePage.locator('[data-offline-download]').click();
 await offlinePage.waitForFunction(()=>document.querySelector('.pwa-status')?.dataset.state==='ready',null,{timeout:90000});
 await offlineContext.setOffline(true);await offlinePage.reload();
 await offlinePage.waitForSelector('[data-quiz13-question]',{state:'attached'});
 assert.equal(await offlinePage.locator('.quiz13-answer[open]').count(),0);
 await offlinePage.evaluate(()=>document.querySelectorAll('.quiz13-section').forEach(d=>d.open=true));
 await offlinePage.locator('#quiz13-II-1-0').fill('あまとう');
 assert.equal(await offlinePage.locator('.quiz13-answer').count(),38);
 for(const answer of await offlinePage.locator('.quiz13-answer').all()){
  await answer.locator('summary').click();assert(await answer.locator(':scope > div').isVisible());assert(await answer.locator('.quiz13-context-source').isVisible());await answer.locator('summary').click();
 }
 await offlinePage.reload();assert.equal(await offlinePage.locator('#quiz13-II-1-0').inputValue(),'あまとう');
 assert.equal(await offlinePage.locator('.quiz13-answer[open]').count(),0);
 await offlineContext.close();console.log('PASS 36 existing context notes and 2 machine-transcribed dictations remain hidden and work offline; original prompts/choices/other keys/models unchanged; dictation draft key retained.');
 console.log('PASS explicit offline package: all 38 reference answers reveal/hide, 38 prompts, typed draft retained after offline reload.');
 assert.deepEqual(errors,[]);
 console.log('PASS: 9 parts, 38 prompts/40 response fields, 38 hidden suggested answers, 2 with explicit machine-transcription provenance and kana readings; all keyboard reveal/hide, saved text/radio drafts, invalid/denied storage, safe draft rendering, anchors, 390/810/1280 light/dark; original review unchanged.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
