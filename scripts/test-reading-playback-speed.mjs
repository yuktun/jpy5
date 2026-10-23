import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd(),key='jpy5.reading.playbackRate',rates=[.25,.5,.75,1,1.25,1.5,1.75,2];
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+sep)||path.includes(sep+'.git'+sep))return res.writeHead(403).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'}),results=[];
async function setup(mode){
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}});page.setDefaultTimeout(30000);
 await page.addInitScript(({key,mode})=>{
  const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
  if(mode==='blocked') {Storage.prototype.getItem=function(k){if(k===key)throw Error('blocked');return get.call(this,k)};Storage.prototype.setItem=function(k,v){if(k===key)throw Error('blocked');return set.call(this,k,v)}}
  if(mode==='invalid')set.call(localStorage,key,'0.9');
  window.rawPauses=[];const pause=HTMLMediaElement.prototype.pause;HTMLMediaElement.prototype.pause=function(){if(this.hasAttribute('data-reading-paragraph-audio'))window.rawPauses.push(this.currentTime);return pause.call(this)};
 },{key,mode});
 await page.route('**/*.mp3',async route=>{const lesson=Number(new URL(route.request().url()).pathname.match(/(?:^|\D)(1[3-9]|20)(?:\D|$)/)?.[1]);
  // Use the current page's exact original recording, without distributing it.
  const n=Number(new URL(page.url()).pathname.match(/chapter-(\d+)/)?.[1])||lesson;
  const bytes=await readFile(resolve(`tmp/reading-audio/${n}.mp3`)),m=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/),start=m?+m[1]:0,end=m?.[2]?Math.min(+m[2],bytes.length-1):bytes.length-1;
  await route.fulfill({status:m?206:200,contentType:'audio/mpeg',body:bytes.subarray(start,end+1),headers:{'accept-ranges':'bytes',...(m?{'content-range':`bytes ${start}-${end}/${bytes.length}`}:{})}});
 });return page;
}
async function open(page,n){await page.goto(base+`chapter-${n}-reading.html`);await page.locator('[data-reading-mode="translation"]').click();}
const lessons=(process.env.JPY5_SPEED_LESSONS||'13,14,15,16,17,18,19,20').split(',').map(Number);
const selector='[data-reading-playback-speed]',audio='[data-reading-paragraph-audio]';
async function playing(page){await page.waitForFunction(()=>{const a=document.querySelector('[data-reading-paragraph-audio]');return !a.paused&&!a.seeking&&a.readyState>=2})}
async function stopAt(page,c){await page.waitForFunction(()=>document.querySelector('[data-reading-paragraph-audio]').paused);const raw=await page.evaluate(()=>window.rawPauses.at(-1));assert(raw>=c.end-.01&&raw<c.end+.1,`${c.id} stop ${raw} / ${c.end}`);assert(Math.abs(await page.locator(audio).evaluate(a=>a.currentTime)-c.end)<.05);assert.equal(await page.locator('[data-reading-sentence][aria-pressed="true"]').count(),0);return raw-c.end;}
try{
 const page=await setup();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const n of lessons){
  await open(page,n);
  assert.equal(await page.locator(selector).inputValue(),n===lessons[0]?'1':'1.75');
  assert.deepEqual(await page.locator(selector+' option').evaluateAll(opts=>opts.map(o=>+o.value)),rates);
  assert.equal(await page.getByLabel('播放速度').count(),1);
  const clips=await page.evaluate(()=>window.JPY5_READING_SENTENCE_AUDIO.sentences),c=[...clips].sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0];
  for(const rate of rates){
   await page.locator(selector).selectOption(String(rate));
   await page.locator(`[data-reading-sentence="${c.id}"]`).click();await playing(page);
   const state=await page.locator(audio).evaluate(a=>({rate:a.playbackRate,pitch:a.preservesPitch}));assert.equal(state.rate,rate);assert.equal(state.pitch,true);
   assert.equal(await page.locator('.reading-audio-workspace audio[controls]').evaluate(a=>a.playbackRate),rate);
   // Every lesson/rate uses native decoding; full natural runs at both extremes below.
   await page.locator(audio).evaluate((a,end)=>a.currentTime=end-.15,c.end);
   results.push({lesson:n,rate,overshoot:await stopAt(page,c)});
  }
  if(n===20){
   for(const rate of rates){await page.locator(selector).selectOption(String(rate));await page.locator(`[data-reading-sentence="${c.id}"]`).click();await playing(page);results.push({natural:true,lesson:n,rate,overshoot:await stopAt(page,c)});}
   const long=clips.find(c=>c.end-c.start>7);
   for(const [from,to] of [[.25,2],[2,.25]]){
    await page.locator(selector).selectOption(String(from));await page.locator(`[data-reading-sentence="${long.id}"]`).click();await playing(page);
    await page.locator(audio).evaluate((a,end)=>a.currentTime=end-.65,long.end);
    await page.locator(selector).selectOption(String(to));results.push({change:[from,to],overshoot:await stopAt(page,long)});
   }
  }
  await page.locator('.reading-audio-workspace audio[controls]').evaluate(a=>a.playbackRate=1.25);
  await page.waitForFunction(()=>document.querySelector('[data-reading-playback-speed]').value==='1.25');
  assert.equal(await page.locator(audio).evaluate(a=>a.playbackRate),1.25);
  await page.locator(selector).selectOption('1.75');
  await page.evaluate(()=>{const buttons=[...document.querySelectorAll('[data-reading-sentence]')];for(let i=0;i<60;i++)buttons[i%buttons.length].click();buttons[0].click()});await playing(page);
  assert.equal(await page.locator(audio).evaluate(a=>a.playbackRate),1.75);assert.equal(await page.locator('[data-reading-sentence][aria-pressed="true"]').count(),1);
  await page.locator('[data-reading-sentence]').first().click();await playing(page);
  await page.locator('[data-reading-play="1"]').click();await playing(page);assert.equal(await page.locator(audio).evaluate(a=>a.playbackRate),1.75);
  await page.locator('.reading-audio-workspace audio[controls]').evaluate(a=>a.play());await page.waitForFunction(()=>document.querySelector('[data-reading-paragraph-audio]').paused);
  assert.equal(await page.locator('.reading-audio-workspace audio[controls]').evaluate(a=>a.playbackRate),1.75);
  await page.locator(selector).selectOption('.5'.replace(/^\./,'0.'));assert.equal(await page.locator('.reading-audio-workspace audio[controls]').evaluate(a=>a.paused),false);
  await page.locator('.reading-audio-workspace audio[controls]').evaluate(a=>a.pause());
  await page.locator(selector).selectOption('1.75');await page.reload();assert.equal(await page.locator(selector).inputValue(),'1.75');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return r.height>=44&&r.left>=0&&r.right<=innerWidth}));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  if(n===20){
   const abort=route=>route.abort('failed');
   await page.route('**/*.mp3',abort);await open(page,n);
   await page.locator(selector).selectOption('2');
   await page.locator('[data-reading-sentence]').first().click();
   await page.waitForFunction(()=>Boolean(document.querySelector('[data-reading-paragraph-audio]').error));
   await page.waitForFunction(()=>!document.querySelector('[data-reading-sentence][aria-pressed="true"]'));
   await page.unroute('**/*.mp3',abort);
   await page.locator('[data-reading-sentence]').first().click();await playing(page);
   assert.equal(await page.locator(audio).evaluate(a=>a.playbackRate),2);
   assert.equal(await page.locator(selector).inputValue(),'2');
   await page.locator('[data-reading-mode="original"]').click();
   console.log('PASS failed audio at 2x: highlight clears, retry recovers and keeps selected speed');
  }
  console.log(`PASS lesson ${n}: eight rates, stops, repeat/switch, paragraph/full-track, reload and responsive control`);
 }
 assert.deepEqual(errors,[]);await mkdir('tmp/reading-speed',{recursive:true});await page.locator('.reading-audio-workspace').scrollIntoViewIfNeeded();await page.screenshot({path:'tmp/reading-speed/desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tmp/reading-speed/phone.png'});await page.close();
 for(const mode of ['invalid','blocked']){const p=await setup(mode);await open(p,13);assert.equal(await p.locator(selector).inputValue(),'1');await p.locator(selector).selectOption('2');await p.locator('[data-reading-sentence]').first().click();await playing(p);assert.equal(await p.locator(audio).evaluate(a=>a.playbackRate),2);await p.close();console.log(`PASS ${mode} storage: safe default and working playback`)}
 await writeFile(process.env.JPY5_SPEED_LESSONS?'tmp/reading-speed/extra-results.json':'tmp/reading-speed/results.json',JSON.stringify(results,null,2));console.log(`PASS ${results.length} native end-boundary checks; max overshoot ${Math.max(...results.map(r=>r.overshoot)).toFixed(4)}s`);
}finally{await browser.close();server.close()}
