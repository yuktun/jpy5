import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import vm from 'node:vm';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd(),types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+sep))return res.writeHead(403).end();res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
let checks=0;
try{
  for(let lesson=13;lesson<=20;lesson++){
    const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];
    await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
    page.on('pageerror',error=>errors.push(error.message));
    const url=base+`/chapter-${lesson}-quiz.html`,prefix=`jpy5.chapter${lesson}.quiz.`;
    await page.goto(url);
    const bank=await page.evaluate(()=>window.JPY5_DATA.questions),ids=bank.slice(0,4).map(q=>q.id);
    await page.evaluate(({prefix,ids})=>{
      localStorage.setItem(prefix+'lastWrong',JSON.stringify(ids));
      localStorage.setItem(prefix+'starred',JSON.stringify([ids[0]]));
      localStorage.setItem(prefix+'history',JSON.stringify([{id:'old-attempt',date:'2020-01-01',mode:'practice',score:0,total:1,results:[]}]));
      localStorage.setItem(prefix+'settings',JSON.stringify({mode:'practice',selected:window.JPY5_DATA.patterns.map(p=>p.id),starredOnly:true}));
    },{prefix,ids});
    await page.reload();await page.locator('#start-quiz').click();await page.locator(`[data-answer="${bank[0].answer}"]`).click();await page.locator('#next-question').click();await page.locator('#quiz-result').waitFor({state:'visible'});
    assert.deepEqual(await page.evaluate(prefix=>JSON.parse(localStorage.getItem(prefix+'lastWrong')),prefix),ids.slice(1),'filtered correct run preserves unattempted old mistakes');checks++;
    await page.evaluate(async()=>{await Promise.all([finish(),finish()]);});
    assert.equal(await page.evaluate(prefix=>JSON.parse(localStorage.getItem(prefix+'history')).length,prefix),2,'repeated finish records once');checks++;
    assert.equal(await page.evaluate(prefix=>localStorage.getItem(prefix+'activeRun'),prefix),null);
    await page.evaluate(({prefix,id})=>localStorage.setItem(prefix+'starred',JSON.stringify([id])),{prefix,id:ids[1]});
    await page.reload();await page.locator('#start-quiz').click();await page.locator(`[data-answer="${bank[1].answer}"]`).click();await page.locator('#next-question').click();await page.locator('#quiz-result').waitFor({state:'visible'});
    assert.deepEqual(await page.evaluate(prefix=>JSON.parse(localStorage.getItem(prefix+'lastWrong')),prefix),ids.slice(2),'correct retry removes only its own wrong state');checks++;
    for(const mode of lesson>=18?['practice','exam','challenge']:['practice','exam']){
      await page.evaluate(({prefix,mode})=>localStorage.setItem(prefix+'settings',JSON.stringify({mode,selected:window.JPY5_DATA.patterns.map(p=>p.id),random:true})),{prefix,mode});
      await page.reload();await page.locator('#start-quiz').click();
      const saved=()=>page.evaluate(prefix=>JSON.parse(localStorage.getItem(prefix+'activeRun')),prefix);
      const initial=await saved();assert.equal(initial.mode,mode);
      await page.locator('[data-answer="0"]').click();
      const answered=await saved();assert.equal(answered.answers[initial.questionIds[0]],0,'answer persisted before navigation');checks++;
      await page.reload();await page.locator('#continue-quiz').click();
      assert.equal(await page.locator('[data-answer="0"]').evaluate(node=>node.classList.contains('selected')||node.classList.contains('correct')||node.classList.contains('wrong')),true);
      if(mode==='exam'){
        assert.equal(await page.locator('#answer-explanation').innerText(),'','resuming exam never reveals answer');
        assert.equal(await page.locator('[data-answer="0"]').isEnabled(),true,'resumed exam answers remain editable');checks++;
      }
      await page.locator('#next-question').click();await page.locator('[data-answer="1"]').click();
      const before=await saved();assert.equal(before.index,1);
      await page.locator('#quit-quiz').click();assert.equal(await page.locator('#continue-quiz').isVisible(),true);
      await page.locator('[data-mode="'+(mode==='practice'?'exam':'practice')+'"]').click();
      await page.goto(base+`/chapter-${lesson}-history.html`);await page.goto(url);await page.locator('#continue-quiz').click();
      assert.deepEqual(await saved(),before,'leave/reload preserves exact order, answers, position and original mode');checks++;
      // Offline answers stay on this device and survive the next reload.
      await context.setOffline(true);await page.locator('#next-question').click();await page.locator('[data-answer="2"]').click();
      const offline=await saved();assert.equal(offline.index,2);await context.setOffline(false);await page.reload();await page.locator('#continue-quiz').click();assert.deepEqual(await saved(),offline);checks++;
      const second=await context.newPage();await second.goto(url);await second.locator('#continue-quiz').click();await second.locator('#next-question').click();
      const newer=await saved();await page.locator('#next-question').click();assert.deepEqual(await saved(),newer,'stale tab cannot overwrite newer position');checks++;
      assert.equal(await page.locator('#quiz-setup').isVisible(),true);
      await second.close();await page.locator('#continue-quiz').click();
      const activeBank=await page.evaluate(mode=>mode==='challenge'?window.JPY5_DATA.noHintQuestions:window.JPY5_DATA.questions,mode),byId=new Map(activeBank.map(q=>[q.id,q]));
      let current=await saved();
      while(current){
        const id=current.questionIds[current.index];
        if(current.answers[id]===undefined)await page.locator(`[data-answer="${byId.get(id).answer}"]`).click();
        await page.locator('#next-question').click();
        if(current.index===current.questionIds.length-1){await page.locator('#quiz-result').waitFor({state:'visible'});break;}
        current=await saved();
      }
      const histories=await page.evaluate(prefix=>JSON.parse(localStorage.getItem(prefix+'history')),prefix);
      assert.equal(histories.filter(h=>h.id===before.id).length,1);assert.equal(histories.find(h=>h.id===before.id).mode,mode);assert(histories.some(h=>h.id==='old-attempt'));checks++;
    }
    // Corrupt storage must not break startup or clear existing completed data.
    await page.evaluate(prefix=>{localStorage.setItem(prefix+'activeRun','{"version":999}');localStorage.setItem(prefix+'settings','{"selected":"bad"}');},prefix);
    await page.reload();assert.equal(await page.locator('#continue-quiz').isHidden(),true);assert.match(await page.locator('#resume-message').innerText(),/格式/);await page.locator('#start-quiz').click();checks++;
    assert.deepEqual(errors,[],`Lesson ${lesson} browser errors`);await context.close();
    console.log(`Lesson ${lesson}: wrong preservation, retries, resume, mode isolation, offline writes, stale tabs, completion and malformed storage passed.`);
  }
  // A real service worker precache must support reload and continue without network.
  const offlineContext=await browser.newContext({serviceWorkers:'allow'}),offlinePage=await offlineContext.newPage();
  await offlinePage.setViewportSize({width:390,height:844});
  await offlineContext.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await offlinePage.goto(base+'/chapter-20-quiz.html');
  await offlinePage.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),{timeout:30000});
  await offlinePage.locator('#start-quiz').click();await offlinePage.locator('[data-answer="0"]').click();await offlinePage.locator('#next-question').click();
  const offlineDraft=await offlinePage.evaluate(()=>JSON.parse(localStorage.getItem('jpy5.chapter20.quiz.activeRun')));
  await offlineContext.setOffline(true);await offlinePage.reload();
  if(process.env.JPY5_SCREENSHOT_PATH)await offlinePage.screenshot({path:process.env.JPY5_SCREENSHOT_PATH,fullPage:true});
  assert(await offlinePage.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),'resume setup fits narrow mobile viewport');checks++;
  await offlinePage.locator('#continue-quiz').click();
  assert.deepEqual(await offlinePage.evaluate(()=>JSON.parse(localStorage.getItem('jpy5.chapter20.quiz.activeRun'))),offlineDraft,'precache offline reload resumes exact run');checks++;
  assert.equal(await offlinePage.locator('[data-answer]').count(),4);await offlineContext.close();
  // Pure helper tests cover question-bank compatibility and invalid answer records.
  const values=new Map(),context={window:{addEventListener(){}},document:{querySelector(){return null;}},navigator:{},JPY5:{read:(key,fallback)=>values.has(key)?JSON.parse(values.get(key)):fallback,write:(key,value)=>values.set(key,JSON.stringify(value)),remove:key=>values.delete(key)}};
  vm.runInNewContext(await readFile('assets/quiz-progress.js','utf8'),context);
  const helper=context.window.JPY5QuizProgress,q={id:'q',pattern:'p',prompt:'prompt',options:['a','b'],answer:0},run=helper.create([q],'exam');helper.save(run,{replace:true});
  assert(helper.restore([q,{...q,id:'new'}],['exam']),'unrelated additions do not invalidate draft');
  assert.equal(helper.restore([] ,['exam']),null,'missing question cannot silently change run');
  assert.equal(helper.restore([{...q,options:['b','a']}],['exam']),null,'changed bank cannot silently misgrade saved answer');
  const legacy=JSON.parse(values.get('quiz.activeRun'));legacy.version=0;values.set('quiz.activeRun',JSON.stringify(legacy));assert(helper.restore([q],['exam']),'compatible v0 draft migrates on next save');
  legacy.answers={q:99};values.set('quiz.activeRun',JSON.stringify(legacy));assert.equal(helper.restore([q],['exam']),null);checks+=5;
  console.log(`${checks} reliability assertions passed across Lessons 13–20.`);
}finally{await browser.close();server.close();}
