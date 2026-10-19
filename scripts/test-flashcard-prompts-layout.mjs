// Real Edge, local public files and synthetic progress only. No live accounts.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),server=createServer(async(req,res)=>{
 const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+sep)||file.includes('private-migration')||file.includes('node_modules')||file.includes(`${sep}.git`))return res.writeHead(403).end();
 try{res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext({serviceWorkers:'block',hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
let protectedReads=0;
await context.route('https://**/*',route=>{if(route.request().url().includes('jpy5TeacherNotes'))protectedReads++;return route.abort();});
page.on('pageerror',error=>errors.push(error.message));
const cdp=await context.newCDPSession(page);
async function accessibleCard(){
 const {root}=await cdp.send('DOM.getDocument');
 const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#flashcard'});
 const {nodes}=await cdp.send('Accessibility.getPartialAXTree',{nodeId,fetchRelatives:false});
 return nodes[0];
}
async function frontCheck(accessible=false){
 const card=await page.evaluate(()=>activeDeck()[currentIndex()]);
 assert(card);
 assert.equal(await page.locator('#card-front').isVisible(),true);
 assert.equal(await page.locator('#card-front h2').textContent(),card.zh);
 assert.match(await page.locator('#card-kicker').textContent(),/^\d+\/\d+$/);
 assert.equal(await page.locator('#card-back').innerHTML(),'','Answer is absent from the question DOM');
 assert.equal(await page.locator('#flashcard').getAttribute('aria-expanded'),'false');
 assert.equal(await page.locator('#flashcard [lang="ja"],#flashcard [title],#flashcard [data-tooltip]').count(),0);
 if(accessible){
  const ax=await accessibleCard();
  assert(ax.description.value.includes(card.zh));
  assert(!`${ax.name.value} ${ax.description.value}`.includes(card.label),'Accessible name/description revealed the Japanese pattern');
 }
 return card;
}
async function flipCheck(){
 const card=await frontCheck(true);
 await page.locator('#flashcard').focus();await page.keyboard.press('Space');
 assert.equal(await page.locator('#card-back').isVisible(),true);
 assert.equal(await page.locator('#flashcard').getAttribute('aria-expanded'),'true');
 assert((await page.locator('#card-kicker').textContent()).includes(card.label));
 assert((await accessibleCard()).description.value.includes(card.label));
 await page.keyboard.press('Enter');await frontCheck(true);
}
try{
 let cards=0;
 for(let lesson=13;lesson<=20;lesson++){
  await page.goto(`${base}chapter-${lesson}-flashcards.html`);
  await page.locator('[data-direction="zh"]').click();
  for(const deck of ['summary','examples']){
   await page.locator(`[data-deck="${deck}"]`).click();
   const total=await page.evaluate(()=>activeDeck().length);
   for(let i=0;i<total;i++){
    await frontCheck(i===0);
    await page.locator('#next-card').evaluate(button=>button.click());cards++;
   }
   await flipCheck();
   await page.locator('[data-direction="jp"]').click();
   const card=await page.evaluate(()=>activeDeck()[currentIndex()]);
   const prompt=await page.locator('#card-front h2').evaluate(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('rt').forEach(rt=>rt.remove());return copy.textContent;});
   assert.equal(prompt,card.jp,'Japanese question was preserved');
   assert((await page.locator('#card-kicker').textContent()).includes(card.label));
   await page.locator('[data-direction="zh"]').click();
  }
 }
 // Seed existing progress without changing its shape or clearing other modules.
 await page.goto(base+'chapter-14-flashcards.html');
 await page.evaluate(()=>{
  localStorage.setItem('jpy5.chapter14.flashcards',JSON.stringify({deck:'summary',direction:'zh',shuffled:false,filter:'all',positions:{summary:10,examples:0},order:{},results:{'summary-ge':'wrong'},starred:['summary-ge']}));
  localStorage.setItem('jpy5.chapter14.quiz.sentinel','keep');
 });
 await page.reload();await frontCheck(true);
 assert.equal(await page.locator('#card-kicker').textContent(),'11/11');
 const saved=await page.evaluate(()=>localStorage.getItem('jpy5.chapter14.flashcards'));
 await flipCheck();
 assert.equal(await page.evaluate(()=>localStorage.getItem('jpy5.chapter14.flashcards')),saved,'Flip changed progress');
 for(const selector of ['#next-card','#prev-card','#shuffle-toggle','[data-filter="wrong"]','[data-filter="starred"]','[data-filter="all"]']){
  await page.locator('#flashcard').click();
  await page.locator(selector).focus();await page.keyboard.press('Space');
  await frontCheck(true);
 }
 await page.locator('#flashcard').click();await page.reload();await frontCheck(true);
 await page.locator('#flashcard').click();await page.locator('[data-filter="right"]').click();
 assert.equal(await page.locator('#flashcard').isDisabled(),true);
 assert.equal(await page.locator('#card-front').isVisible(),true,'Empty filtered message is visible after a flipped card');
 assert.equal(await page.locator('#card-back').innerHTML(),'');
 await page.locator('[data-filter="all"]').click();await frontCheck();
 await page.locator('#flashcard').tap();assert.equal(await page.locator('#card-back').isVisible(),true);
 await page.locator('#flashcard').tap();await frontCheck();
 assert.equal(await page.evaluate(()=>localStorage.getItem('jpy5.chapter14.quiz.sentinel')),'keep');
 await mkdir('tmp/flashcard-layout',{recursive:true});
 const modules=['vocabulary','notes','flashcards','quiz','history','reading','textbook','review'];
 const audit=[];
 for(const width of [390,810,1280])for(const module of ['hub',...modules]){
  await page.setViewportSize({width,height:900});
  await page.goto(base+(module==='hub'?'chapter-14.html':`chapter-14-${module}.html`));
  assert.equal(await page.locator('main').count(),1);
  assert.equal(await page.locator('iframe').count(),0,'No nested protected frames');
  if(['flashcards','quiz','history'].includes(module)){
   const nav=page.locator('.module-lesson-switcher');await nav.waitFor();
   assert.equal(await nav.count(),1);assert.equal(await page.locator('.lesson-quick-switcher').count(),0);
   assert.equal(await nav.locator('a').count(),6);
   assert.equal(await nav.locator('[aria-current="page"]').getAttribute('href'),`chapter-14-${module}.html`);
   const hero=await page.locator('.compact-hero').boundingBox(),bar=await nav.boundingBox();
   assert(bar.y>=hero.y+hero.height-1,'Lesson bar belongs below the hero');
   if(module==='flashcards'){
    await page.locator('[data-direction="zh"]').click();await frontCheck();
    await nav.locator('a[href="chapter-18-flashcards.html"]').click();
    assert.match(page.url(),/chapter-18-flashcards.html$/);
    await page.goto(base+'chapter-14-flashcards.html');
   }
  }else if(module!=='hub'){
   await page.locator('.lesson-quick-switcher').waitFor();
   assert.equal(await page.locator('.lesson-quick-switcher').count(),1);
   assert.equal(await page.locator('.module-lesson-switcher,.reading-controls .lesson-pills').count(),0);
   assert.equal(await page.locator('.lesson-select').inputValue(),'14');
  }else assert.equal(await page.locator('.tool-grid .tool-card').count(),5);
  for(const theme of ['light','dark']){
   await page.evaluate(theme=>window.JPY5.setTheme(theme),theme);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${module} ${width} ${theme}: horizontal overflow`);
   if(module==='flashcards'&&width!==810)await page.screenshot({path:`tmp/flashcard-layout/${width}-${theme}.png`});
  }
  if(module==='notes'){
   assert.equal(await page.locator('.note-card').count(),11);
   assert.equal(await page.locator('[data-teacher-demo]').count(),11);
   assert((await page.locator('[data-teacher-demo-content]').allTextContents()).every(text=>text===''));
  }
  if(module==='vocabulary')assert.equal(await page.locator('#teacher-adverbs .teacher-adverb-card').count(),4);
  if(module==='review')assert.equal(await page.locator('[data-answer-toggle]').count(),13);
  if(width===390)audit.push(`${module}: ${['flashcards','quiz','history'].includes(module)?'six-lesson bar':module==='hub'?'five module cards + grammar subtools':'one compact lesson/module selector'}`);
 }
 assert.equal(protectedReads,0);assert.deepEqual(errors,[]);
 console.log(`Microsoft Edge: ${cards} reverse fronts across lessons 13–20, summary/example flips and accessibility, preserved Japanese prompts, state resets/progress and touch/keyboard passed.`);
 console.log('Lesson 14 layout audit (3 widths × 2 themes): '+audit.join('; '));
}finally{await context.close();await browser.close();await new Promise(done=>server.close(done));}
