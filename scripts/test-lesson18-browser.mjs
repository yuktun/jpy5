// Run with Playwright installed (NODE_PATH can point at the Codex bundled node_modules).
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd(),artifacts=resolve('tmp/lesson18-browser');await mkdir(artifacts,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json','.md':'text/plain'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.JPY5_BROWSER_CHANNEL?{channel:process.env.JPY5_BROWSER_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const go=async file=>{await page.goto(`${base}/${file}`);await page.waitForLoadState('domcontentloaded');};
const state=key=>page.evaluate(key=>JSON.parse(localStorage.getItem('jpy5.chapter18.'+key)),key);
const setState=(key,value)=>page.evaluate(({key,value})=>localStorage.setItem('jpy5.chapter18.'+key,JSON.stringify(value)),{key,value});
const mode=m=>page.locator(`[data-reading-mode="${m}"]`).click();
const visibleText=locator=>locator.evaluate(node=>{const copy=node.cloneNode(true);copy.querySelectorAll('rt').forEach(rt=>rt.remove());return copy.textContent});
try{
  await go('chapter-18-reading.html');await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));await page.waitForTimeout(750);await page.waitForLoadState('domcontentloaded');
  await page.evaluate(()=>localStorage.setItem('jpy5.chapter17.reading',JSON.stringify({sentinel:'unchanged'})));
  await setState('reading',{mode:'source',sourceNotes:{'source-1':'舊教材草稿'},sourceResponses:{},textbookDrafts:{},answered:{},wrong:[],examAnswers:{},attempts:[],questionResults:{},vocabIndex:0,vocabFlipped:false,font:1,furigana:true});await page.reload();
  assert.equal(await page.locator('[data-reading-mode="questions"]').evaluate(button=>button.classList.contains('active')),true,'old source mode did not migrate to Reading questions');
  assert.deepEqual(await page.locator('.ch14-textbook-section>header h2').evaluateAll(nodes=>nodes.map(node=>{const copy=node.cloneNode(true);copy.querySelectorAll('rt').forEach(rt=>rt.remove());return copy.textContent.trim()})),['1. 考えてみよう','3. 確かめよう','4. 考えよう・話そう','5. チャレンジしよう']);
  assert.equal(await page.locator('.ch14-official-answer:not([hidden])').count(),0);assert.equal(await page.locator('.ch14-model-answer:not([hidden])').count(),0);
  assert.equal(await page.locator('[data-official-toggle]').first().innerText(),'課本官方答案 / 課本解答');
  assert.equal(await page.locator('[data-source-note="source-1"]').inputValue(),'舊教材草稿');await page.locator('[data-source-note="source-1"]').fill('教材原題の下書き');
  await page.locator('[data-source-class="source-4"][data-source-index="0"][data-source-value="A"]').click();
  await page.locator('[data-source-choice="source-5"][value="0"]').check();
  await page.locator('[data-textbook-draft="think-collecting"]').fill('切手を集めています。');await page.locator('[data-textbook-draft="challenge-scenario"]').fill('僕：これ？');
  await page.locator('[data-official-toggle="source-1"]').click();assert.match(await visibleText(page.locator('[data-official-answer="source-1"]')),/古い鉛筆削りと新しい鉛筆削り/);assert.equal(await page.locator('[data-source-note="source-1"]').inputValue(),'教材原題の下書き');
  await page.locator('[data-official-toggle="source-4"]').click();assert.match(await visibleText(page.locator('[data-official-answer="source-4"]')),/① A.*② A.*③ B.*④ B.*⑤ B.*⑥ A.*⑦ B.*⑧ B/s);
  await page.locator('[data-official-toggle="source-5"]').click();assert.match(await visibleText(page.locator('[data-official-answer="source-5"]')),/b\. 彼にとっては価値を感じるものだったから/);assert(await page.locator('[data-source-choice="source-5"][value="0"]').isChecked(),'reveal overwrote learner selection');
  await page.locator('[data-model-toggle="think-collecting"]').click();assert.match(await page.locator('[data-model-answer="think-collecting"]').innerText(),/參考回答例（非課本官方答案）/);
  await page.locator('#furigana-toggle').click();assert.equal(await page.locator('[data-textbook-draft="think-collecting"]').inputValue(),'切手を集めています。');assert(await page.locator('[data-source-class="source-4"][data-source-index="0"][data-source-value="A"]').evaluate(button=>button.classList.contains('selected')));assert(await page.locator('[data-source-choice="source-5"][value="0"]').isChecked());
  await mode('practice');await mode('questions');assert.equal(await page.locator('[data-textbook-draft="challenge-scenario"]').inputValue(),'僕：これ？');await page.reload();assert.equal(await page.locator('[data-source-note="source-1"]').inputValue(),'教材原題の下書き');assert.equal(await page.locator('[data-textbook-draft="think-collecting"]').inputValue(),'切手を集めています。');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Reading questions overflow 1280px');
  assert.equal(Object.keys((await state('reading')).answered).length,0);
  await mode('exam');
  const qs=await page.evaluate(()=>window.JPY5_READING.questions);
  await page.locator(`input[name="${qs[0].id}"][value="${qs[0].answer}"]`).check();
  await page.locator(`input[name="${qs[1].id}"][value="${qs[1].answer}"]`).check();
  await mode('original');await mode('exam');assert(await page.locator(`input[name="${qs[0].id}"][value="${qs[0].answer}"]`).isChecked());
  await page.locator('#furigana-toggle').click();await page.locator('#font-up').click();
  await page.reload();assert(await page.locator(`input[name="${qs[1].id}"][value="${qs[1].answer}"]`).isChecked());
  assert.equal((await state('reading')).sourceNotes['source-1'],'教材原題の下書き');
  await page.locator('#submit-reading-exam').click();assert.equal((await state('reading')).attempts.length,0,'partial exam submitted');
  for(const [i,q] of qs.entries())await page.locator(`input[name="${q.id}"][value="${i===0?(q.answer+1)%4:q.answer}"]`).check();
  await page.locator('#submit-reading-exam').click();let progress=await state('reading');assert.equal(progress.attempts.at(-1).score,12);assert(progress.wrong.includes(qs[0].id));assert.equal(Object.keys(progress.examAnswers).length,0);
  await mode('mistakes');await page.locator('.mistake-list details summary').click();assert.deepEqual((await state('reading')).answered,progress.answered,'answer reveal changed mastery');
  await page.locator(`[data-review-question="${qs[0].id}"]`).click();await page.locator(`[data-q="${qs[0].id}"][data-option="${qs[0].answer}"]`).click();progress=await state('reading');assert(!progress.wrong.includes(qs[0].id));assert.equal(progress.answered[qs[0].id],qs[0].answer);
  // A later exam mistake replaces earlier mastery; later correct exam clears it.
  await mode('exam');for(const q of qs)await page.locator(`input[name="${q.id}"][value="${q.id===qs[0].id?(q.answer+1)%4:q.answer}"]`).check();await page.locator('#submit-reading-exam').click();progress=await state('reading');assert.equal(progress.answered[qs[0].id],(qs[0].answer+1)%4);assert(progress.wrong.includes(qs[0].id));
  await mode('original');await mode('exam');for(const q of qs)await page.locator(`input[name="${q.id}"][value="${q.answer}"]`).check();await page.locator('#submit-reading-exam').click();assert(!(await state('reading')).wrong.includes(qs[0].id));
  await mode('find');const finds=await page.evaluate(()=>window.JPY5_READING.find);for(const task of finds){await page.locator(`[data-find="${task.answer}"]`).click();assert.match(await page.locator('.find-feedback').innerText(),/搵啱/);await page.locator('.find-next').click();}
  await mode('vocab');await page.locator('[data-vocab-star]').click();await page.reload();assert((await state('reading')).wrong.includes('v0'));
  await setState('conversation',{mode:'prompts',furigana:true,drafts:{1:'舊空欄草稿'},promptNotes:{'listen-2':'舊內容筆記'},expressionNotes:{'0-1':'舊表現筆記'},activityNotes:{repeat:'舊版もう一度聞こう筆記',say:'舊版言ってみよう筆記',practice:'舊版練習しよう筆記',challenge:'舊版チャレンジ筆記','activity-1-2':'舊活動草稿'},listenCount:7});
  await go('chapter-18-textbook.html');assert.equal(await page.locator('[data-mode="comprehension"]').evaluate(button=>button.classList.contains('active')),true,'legacy prompts mode did not migrate');
  assert.equal(await page.locator('[data-prompt-note]').count(),5);assert.equal(await page.locator('[data-expression-note]').count(),5);assert.equal(await page.locator('.reference-answer:not([hidden])').count(),0);
  assert.equal(await page.locator('[data-prompt-note="listen-2"]').inputValue(),'舊內容筆記');assert.equal(await page.locator('[data-expression-note="0-1"]').inputValue(),'舊表現筆記');
  await page.locator('[data-prompt-note="listen-1"]').fill('聞いた証拠のメモ');await page.locator('[data-expression-note="0-0"]').fill('語気のメモ');await page.locator('[data-answer-toggle="listen-1"]').click();
  assert.match(await visibleText(page.locator('[data-answer-panel="listen-1"]')),/ワットさん.*食器が多すぎること/s);assert.equal(await page.locator('[data-prompt-note="listen-1"]').inputValue(),'聞いた証拠のメモ','answer reveal overwrote learner note');
  await page.locator('[data-mode="dialogue"]').click();assert.equal(await page.locator('.dialogue-row').count(),20);assert.equal(await page.locator('.verified-answer').count(),13);assert.equal(await page.locator('.dialogue-row-actions [data-listen-target]').count(),13);assert.equal(await page.locator('.dialogue-row p [data-listen-target]').count(),0,'replay button is inline in dialogue text');
  assert.equal(await page.locator('[data-answer-span="3"]').locator('xpath=ancestor::article[1]').locator('.dialogue-row-actions [data-listen-target]').count(),2);assert.equal(await page.locator('[data-answer-span="5"]').locator('xpath=ancestor::article[1]').locator('.dialogue-row-actions [data-listen-target]').count(),2);assert.equal(await page.locator('[data-answer-span="7"]').locator('xpath=ancestor::article[1]').locator('.dialogue-row-actions [data-listen-target]').count(),3);
  const targets=await page.evaluate(()=>window.JPY5_CONVERSATION.listeningTargets.map(({id,answer,start,end})=>({id,answer,start,end})));
  for(const target of targets)assert.equal((await visibleText(page.locator(`[data-answer-span="${target.id}"]`))).trim(),target.answer);
  await page.evaluate(()=>{const audio=document.querySelector('#lesson-audio');audio.dataset.pauses='0';audio.play=()=>Promise.resolve();audio.pause=()=>{audio.dataset.pauses=String(Number(audio.dataset.pauses)+1)}});
  await page.locator('[data-listen-target="1"]').first().click();assert(Math.abs((await page.locator('#lesson-audio').evaluate(audio=>audio.currentTime))-targets[0].start)<.03);
  await page.locator('[data-listen-target="2"]').first().click();await page.locator('#lesson-audio').evaluate((audio,time)=>{audio.currentTime=time;audio.dispatchEvent(new Event('timeupdate'))},targets[0].end);assert.equal(await page.locator('#lesson-audio').getAttribute('data-pauses'),'0','stale first replay stopped second target');
  await page.locator('#lesson-audio').evaluate((audio,time)=>{audio.currentTime=time+.1;audio.dispatchEvent(new Event('timeupdate'))},targets[1].end);assert.equal(await page.locator('#lesson-audio').getAttribute('data-pauses'),'1');
  await page.locator('[data-mode="blanks"]').click();assert.equal(await page.locator('[data-blank-draft]').count(),13);assert.equal(await page.locator('[data-blank-draft="1"]').inputValue(),'舊空欄草稿');assert.equal(await page.locator('[data-legacy-activity-note="repeat"]').inputValue(),'舊版もう一度聞こう筆記');await page.locator('[data-blank-draft="13"]').fill('私の答案');await page.locator('[data-answer-toggle="blank-13"]').click();assert.equal(await page.locator('[data-blank-draft="13"]').inputValue(),'私の答案');
  await page.locator('[data-mode="activities"]').click();assert.deepEqual(await page.locator('.textbook-activity-card>header h2').allTextContents(),['1. やってみよう','4. 言ってみよう','5. 練習しよう','6. チャレンジしよう']);assert.equal(await page.locator('[data-activity-note]').count(),12);assert.equal(await page.locator('[data-legacy-activity-note="say"]').inputValue(),'舊版言ってみよう筆記');assert.equal(await page.locator('[data-legacy-activity-note="practice"]').inputValue(),'舊版練習しよう筆記');assert.equal(await page.locator('[data-activity-note="activity-6"]').inputValue(),'舊版チャレンジ筆記');assert.equal(await page.locator('[data-activity-note="activity-1-2"]').inputValue(),'舊活動草稿');await page.locator('[data-activity-note="practice-1"]').fill('会話の練習メモ');assert.equal(await page.locator('.reference-answer:not([hidden])').count(),0);
  await page.locator('#furigana-toggle').click();assert.equal(await page.locator('[data-activity-note="practice-1"]').inputValue(),'会話の練習メモ');await page.reload();
  let listening=await state('conversation');assert.equal(listening.drafts['13'],'私の答案');assert.equal(listening.promptNotes['listen-1'],'聞いた証拠のメモ');assert.equal(listening.expressionNotes['0-0'],'語気のメモ');assert.equal(listening.activityNotes['practice-1'],'会話の練習メモ');assert.deepEqual([listening.activityNotes.repeat,listening.activityNotes.say,listening.activityNotes.practice,listening.activityNotes.challenge],['舊版もう一度聞こう筆記','舊版言ってみよう筆記','舊版練習しよう筆記','舊版チャレンジ筆記']);assert.equal(listening.activityNotes['activity-6'],'舊版チャレンジ筆記');assert.equal(listening.listenCount,7);
  await page.locator('[data-activity-note="activity-6"]').fill('新版チャレンジ筆記');await page.reload();assert.equal(await page.locator('[data-activity-note="activity-6"]').inputValue(),'新版チャレンジ筆記','legacy challenge overwrote a newer note');listening=await state('conversation');assert.equal(listening.activityNotes.challenge,'舊版チャレンジ筆記');assert.equal(listening.activityNotes['activity-6'],'新版チャレンジ筆記');
  page.once('dialog',d=>d.accept());await page.locator('#reset-conversation').click();assert.equal(await state('conversation'),null);assert.equal((await state('reading')).attempts.length,3);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jpy5.chapter17.reading')).sentinel),'unchanged');
  await go('chapter-18-quiz.html');const gqs=await page.evaluate(()=>window.JPY5_DATA.questions);
  await setState('quiz.lastWrong',[gqs[0].id,gqs[4].id]);await setState('quiz.starred',['nichigainai-1']);await page.reload();
  await page.locator('[data-pattern="all"]').click();await page.locator('[data-pattern="nichigainai"]').click();await page.locator('#start-quiz').click();assert.match(await page.locator('#quiz-star').innerText(),/已標記/);
  await page.locator('#quiz-star').click();assert(!(await state('quiz.starred')).includes(gqs[0].id));
  for(const [i,q] of gqs.slice(0,4).entries()){await page.locator(`[data-answer="${i===1?(q.answer+1)%4:q.answer}"]`).click();assert.match(await page.locator('#answer-explanation').innerText(),/答對|正確答案/);await page.locator('#next-question').click();}
  const wrong=await state('quiz.lastWrong');assert(!wrong.includes(gqs[0].id));assert(wrong.includes(gqs[1].id));assert(wrong.includes(gqs[4].id),'unattempted wrong question erased');
  await go('chapter-18-history.html');assert.equal(await page.locator('.history-card').count(),1);await page.locator('.history-card summary').click();assert.equal(await page.locator('.history-answer').count(),4);
  // Existing 16-question histories still resolve the old options, without content rewrites.
  await setState('quiz.history',[{id:'legacy',date:new Date().toISOString(),mode:'practice',score:1,total:1,results:[{questionId:'koso-1',selected:0,correct:true}]}]);await page.reload();await page.locator('.history-card summary').click();assert.match(await page.locator('.history-answer').innerText(),/こちらこそ/);
  await setState('quiz.history',[]);await page.reload();assert.equal(await page.locator('.empty-state a').getAttribute('href'),'chapter-18-quiz.html');
  await go('chapter-18-vocabulary.html');assert.match(await page.locator('#vocab-count').innerText(),/108/);await page.locator('#vocab-card').click();await page.locator('#vocab-right').click();assert.equal(Object.values((await state('vocabulary.cards.v2')).results).filter(v=>v==='right').length,1);
  await go('chapter-18-flashcards.html');await page.locator('#flashcard').click();await page.locator('#mark-wrong').click();assert.equal(Object.values((await state('flashcards')).results).filter(v=>v==='wrong').length,1);
  await go('chapter-18.html');assert.equal(await page.locator('[data-count="quiz"]').innerText(),'32');assert.equal(await page.locator('[data-count="reading"]').innerText(),'13');await page.locator('[data-progress="reading"]').filter({hasText:/13\/13 App題答對/}).waitFor();
  // Smoke every page at phone and iPad sizes, and inspect the densest modes.
  for(const viewport of [{width:390,height:844},{width:810,height:1080}]){
    await page.setViewportSize(viewport);
    for(const module of ['','vocabulary','notes','reading','textbook','flashcards','quiz','review','history']){
      await go(`chapter-18${module?'-'+module:''}.html`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${module} overflows ${viewport.width}px`);
      if(['','notes','vocabulary'].includes(module))await page.screenshot({path:`${artifacts}/${module||'hub'}-${viewport.width}.png`});
      if(module==='notes'){assert.equal(await page.locator('.grammar-card').count(),8);await page.locator('[data-extra-id="monoda"]').click();assert(await page.locator('dialog[open]').isVisible());await page.locator('[data-extra-close]').first().click();}
      if(module==='reading'){await mode('questions');await page.screenshot({path:`${artifacts}/reading-textbook-${viewport.width}.png`,fullPage:true});await mode('practice');await page.screenshot({path:`${artifacts}/reading-practice-${viewport.width}.png`,fullPage:true});await mode('exam');}
      if(module==='textbook'){await page.locator('[data-mode="blanks"]').click();await page.screenshot({path:`${artifacts}/listening-${viewport.width}.png`,fullPage:true});}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${module} mode overflows ${viewport.width}px`);
    }
  }
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload();
  assert(await page.evaluate(()=>Boolean(navigator.serviceWorker.controller)),'service worker did not take control');
  await context.setOffline(true);
  for(const module of ['','vocabulary','notes','reading','textbook','flashcards','quiz','review','history']){
    await go(`chapter-18${module?'-'+module:''}.html`);
    assert.match(await page.title(),/第\s*18\s*課/);
    if(module==='reading'){await mode('practice');assert.equal(await page.locator('[data-question]').count(),13);}
    if(module==='textbook'){await page.locator('[data-mode="blanks"]').click();assert.equal(await page.locator('[data-blank-draft]').count(),13);}
  }
  const audit=await page.evaluate(async()=>{const response=await fetch('LESSON18_SOURCE_AUDIT.md');return {ok:response.ok,text:await response.text()};});
  assert(audit.ok&&audit.text.includes('Lesson 18 source audit'),'source audit is unavailable offline');
  await context.setOffline(false);
  assert.deepEqual(errors,[],'browser JS errors');
  console.log('Lesson 18 browser checks passed: textbook 1/3/4/5, hidden official answers, safe reveals, source migration, saved drafts/selections, App exam/mastery preservation, responsive layouts and offline.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
