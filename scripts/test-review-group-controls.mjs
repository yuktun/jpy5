import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd(), artifacts=resolve('tmp/review-group-controls');
await mkdir(artifacts,{recursive:true});
const previous='2c802d554536cff0e4f6184354b83fb2bb0a9ae6';
for(let lesson=13;lesson<=20;lesson++){
 const file=`chapter-${lesson}-review.html`,html=await readFile(file,'utf8');
 const before=execFileSync('git',['show',`${previous}:${file}`],{encoding:'utf8'});
 assert.equal(html.replace(/\r\n/g,'\n'),before.replace(/\r\n/g,'\n').replace('<details class="teacher-exercise" open>','<details class="teacher-exercise">').replace('assets/teacher-supplements.js?v=3','assets/teacher-supplements.js?v=4').replace('assets/teacher-word-help.css?v=2','assets/teacher-word-help.css?v=3').replace('assets/ch13-quiz1.js?v=2','assets/ch13-quiz1.js?v=3'),'Only default and resource versions may change');
}
for(const file of ['assets/teacher-access.mjs','assets/teacher-access-core.mjs','assets/teacher-demo.mjs','assets/teacher-progress-privacy.mjs','assets/firebase-sync.mjs','firestore.rules']){
 assert.equal((await readFile(file,'utf8')).replace(/\r\n/g,'\n'),execFileSync('git',['show',`${previous}:${file}`],{encoding:'utf8'}).replace(/\r\n/g,'\n'),`${file}: protected behavior/content unchanged`);
}
const quizCurrent=await readFile('assets/ch13-quiz1.js','utf8');
assert.equal(quizCurrent.replace('  window.JPY5ReviewGroups?.init();\n','').replace(/\r\n/g,'\n'),execFileSync('git',['show',`${previous}:assets/ch13-quiz1.js`],{encoding:'utf8'}).replace(/\r\n/g,'\n'),'Only mount scoped controls after Quiz rendering; all quiz data remains exact');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=createServer(async(req,res)=>{try{const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+sep))return res.writeHead(403).end();res.setHeader('Content-Type',types[extname(p)]||'application/octet-stream');res.end(await readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const errors=[],summary={lessons:[],widths:[390,810,1280],errors};
const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const snapshot=p=>p.evaluate(()=>JSON.stringify({...localStorage}));
async function state(group,value){await group.locator('[data-review-group-toggle]').waitFor();await page.waitForFunction(({id,value})=>document.querySelector(`#${id} [data-review-group-toggle]`)?.dataset.state===value,{id:await group.getAttribute('id'),value});}
async function checkGroup(group,count){
 const button=group.locator('[data-review-group-toggle]'),sections=group.locator(':scope > details.teacher-exercise');
 assert.equal(await button.count(),1);assert.equal(await sections.count(),count);
 assert.equal(await sections.locator(':scope[open]').count(),0);
 assert.equal(await button.textContent(),'全部展開');assert.equal(await button.getAttribute('aria-expanded'),'false');
 assert.equal(await button.getAttribute('aria-controls'),await group.getAttribute('id'));
 await button.focus();await page.keyboard.press('Enter');await state(group,'expanded');
 assert.equal(await sections.locator(':scope[open]').count(),count);
 assert.equal(await button.textContent(),'全部收起');assert.equal(await button.getAttribute('aria-expanded'),'true');
 assert.equal(await group.locator('.teacher-answer:not([hidden]),.quiz13-answer[open]').count(),0,'Bulk must never reveal answers');
 await sections.first().locator(':scope > summary').click();await state(group,'mixed');
 assert.equal(await button.textContent(),'全部展開');assert.equal(await button.getAttribute('aria-expanded'),'false');
 await button.click();await state(group,'expanded');
 await button.focus();await page.keyboard.press('Space');await state(group,'collapsed');
 assert.equal(await sections.locator(':scope[open]').count(),0);
 // Individual toggles must produce an all-open state too.
 for(const section of await sections.all())await section.locator(':scope > summary').click();
 await state(group,'expanded');
 await page.evaluate(()=>{window.JPY5ReviewGroups.init();window.JPY5ReviewGroups.init();});
 assert.equal(await button.count(),1);await state(group,'expanded');
 // Repeated actual clicks should neither duplicate handlers nor accumulate state.
 for(let i=0;i<6;i++)await button.click();
 await state(group,'expanded');
 assert.equal(await group.locator('.teacher-answer:not([hidden]),.quiz13-answer[open]').count(),0);
 const box=await button.boundingBox();assert(box.height>=44&&box.width>=44);
 await button.click();await state(group,'collapsed');
}
try{
 for(const width of summary.widths){
  await page.setViewportSize({width,height:900});
  for(let lesson=13;lesson<=20;lesson++){
   await page.goto(`${base}/chapter-${lesson}-review.html`);
   await page.locator('#teacher-exercise [data-review-group-toggle]').waitFor();
   await page.evaluate(()=>localStorage.setItem('jpy5.chapter13.reviewControlSentinel','preserve-history'));
   const before=await snapshot(page);
   const exercise=page.locator('#teacher-exercise');await checkGroup(exercise,3);
   if(lesson===13){
    const quiz=page.locator('#lesson13-quiz1');await checkGroup(quiz,9);
    await exercise.locator('[data-review-group-toggle]').click();
    assert.equal(await quiz.locator(':scope > details[open]').count(),0,'Exercise must not expand Quiz');
    await quiz.locator('[data-review-group-toggle]').click();
    await exercise.locator('[data-review-group-toggle]').click();
    assert.equal(await quiz.locator(':scope > details[open]').count(),9,'Exercise must not collapse Quiz');
    assert.equal(await quiz.locator('.quiz13-answer[open]').count(),0);
    await quiz.locator('[data-review-group-toggle]').click();
   }
   assert.equal(await snapshot(page),before,'Bulk/individual controls must not change saved history/settings');
   for(const theme of ['light','dark']){
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   }
   if(width===390&&lesson===13){await exercise.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(artifacts,'lesson13-collapsed-phone.png')});}
   if(width===390)summary.lessons.push({lesson,exerciseSections:3,quizSections:lesson===13?9:0});
  }
  console.log(`PASS controls: lessons 13–20 at ${width}px, keyboard, mixed state, individual/repeated toggles, answer secrecy, group isolation and unchanged storage.`);
 }
 await page.goto(`${base}/chapter-13-review.html`);
 await page.locator('#lesson13-quiz1 [data-review-group-toggle]').click();
 await page.locator('#quiz13-I-1-0').fill('保存済みの草稿');
 await page.locator('[name="quiz13-IV-1"][value="1"]').check();
 const saved=await snapshot(page);
 const answer=page.locator('.quiz13-answer').first();await answer.locator('summary').click();
 for(let i=0;i<4;i++)await page.locator('#lesson13-quiz1 [data-review-group-toggle]').click();
 assert.equal(await snapshot(page),saved);assert.equal(await answer.getAttribute('open'),'','Explicitly revealed answer state is preserved');
 await page.reload();assert.equal(await page.locator('#quiz13-I-1-0').inputValue(),'保存済みの草稿');assert(await page.locator('[name="quiz13-IV-1"][value="1"]').isChecked());
 assert.equal(await page.locator('#teacher-exercise details[open],.quiz13-section[open],.quiz13-answer[open]').count(),0,'Fresh load collapses questions and hides answers');
 await page.goto(`${base}/chapter-14-review.html`);await page.goto(`${base}/chapter-13-review.html#quiz13-IX`);await state(page.locator('#lesson13-quiz1'),'mixed');
 assert.equal(await page.locator('#quiz13-IX').getAttribute('open'),'');assert.equal(await page.locator('.quiz13-answer[open]').count(),0);
 summary.draftsAndExplicitRevealPreserved=true;summary.deepLinkPreserved=true;
 const touch=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),tp=await touch.newPage();
 await tp.goto(`${base}/chapter-14-review.html`);const tb=tp.locator('[data-review-group-toggle]');await tb.tap();assert.equal(await tp.locator('#teacher-exercise > details[open]').count(),3);await tb.tap();assert.equal(await tp.locator('#teacher-exercise > details[open]').count(),0);await touch.close();summary.touchEmulation=true;
 const denied=await browser.newContext({serviceWorkers:'block'});await denied.addInitScript(()=>{Storage.prototype.getItem=Storage.prototype.setItem=()=>{throw Error('Storage denied');};});const dp=await denied.newPage();await dp.goto(`${base}/chapter-13-review.html`);await dp.locator('#lesson13-quiz1 [data-review-group-toggle]').click();assert.equal(await dp.locator('.quiz13-section[open]').count(),9);assert.equal(await dp.locator('.quiz13-answer[open]').count(),0);await denied.close();summary.deniedStorage=true;
 // The existing scored quiz has no section containers; keep its flow untouched.
 for(let lesson=13;lesson<=20;lesson++){
  await page.goto(`${base}/chapter-${lesson}-quiz.html`);await page.locator('#start-quiz').waitFor();assert.equal(await page.locator('[data-review-group-toggle]').count(),0);assert(await page.locator('#start-quiz').isVisible());
 }
 const offline=await browser.newContext({viewport:{width:390,height:844}}),op=await offline.newPage();op.on('pageerror',e=>errors.push(e.message));
 await op.goto(`${base}/chapter-13-review.html`);await op.waitForFunction(()=>!!navigator.serviceWorker.controller&&document.querySelector('.pwa-status')?.dataset.state==='online');
 await op.locator('.pwa-status').click();await op.locator('[data-offline-download]').click();await op.waitForFunction(()=>document.querySelector('.pwa-status')?.dataset.state==='ready',null,{timeout:90000});await op.locator('[data-offline-close]').click();
 await op.locator('#lesson13-quiz1 [data-review-group-toggle]').click();await op.locator('#quiz13-I-1-0').fill('離線草稿');await offline.setOffline(true);
 for(let lesson=13;lesson<=20;lesson++){
  await op.goto(`${base}/chapter-${lesson}-review.html`);const eb=op.locator('#teacher-exercise [data-review-group-toggle]');await eb.waitFor();assert.equal(await op.locator('#teacher-exercise > details[open]').count(),0);await eb.click();assert.equal(await op.locator('#teacher-exercise > details[open]').count(),3);assert.equal(await op.locator('.teacher-answer:not([hidden])').count(),0);await eb.click();
  if(lesson===13){const qb=op.locator('#lesson13-quiz1 [data-review-group-toggle]');await qb.click();assert.equal(await op.locator('.quiz13-section[open]').count(),9);assert.equal(await op.locator('.quiz13-answer[open]').count(),0);assert.equal(await op.locator('#quiz13-I-1-0').inputValue(),'離線草稿');await qb.click();}
 }
 await offline.close();summary.offlineAllEightLessonsPassed=true;
 assert.deepEqual(errors,[]);summary.limits=['No physical iPhone/iPad Safari test','No upstream audio playback in this UI-only change'];await writeFile(resolve(artifacts,'results.json'),JSON.stringify(summary,null,2)+'\n');console.log('PASS: drafts, explicit reveal state, deep links, denied storage, mobile touch emulation, scored quiz entry points, real offline controls for all eight lessons; protected scripts and all question/answer data unchanged.');
}catch(error){await page.screenshot({path:resolve(artifacts,'failure.png')}).catch(()=>{});await writeFile(resolve(artifacts,'failure.json'),JSON.stringify({message:error.message,url:page.url(),errors,controls:await page.locator('[data-review-group-toggle]').count(),quizInitialized:await page.locator('#lesson13-quiz1').getAttribute('data-initialized')},null,2));throw error;}finally{await browser.close();await new Promise(r=>server.close(r));}
