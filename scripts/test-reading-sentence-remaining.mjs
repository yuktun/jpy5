#!/usr/bin/env node
// Real existing MP3s are served locally for reproducibility; no audio is shipped.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import vm from 'node:vm';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd(),out=resolve('tmp/sentence-remaining');await mkdir(out,{recursive:true});
const selected=(process.env.JPY5_SENTENCE_LESSONS||'15,16,17,18,19,20').split(',').map(Number);
const counts={15:16,16:12,17:26,18:21,19:22,20:23},paragraphCounts={15:6,16:5,17:6,18:8,19:5,20:5};
const server=createServer(async(req,res)=>{
  try{
    const path=resolve(root,`.${decodeURIComponent(new URL(req.url,'http://localhost').pathname)}`);
    if(!path.startsWith(root+sep)||path.includes(`${sep}.git${sep}`)||path.includes(`${sep}private-migration${sep}`))return res.writeHead(403).end();
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[extname(path)]||'application/octet-stream');
    res.end(await readFile(path));
  }catch{res.writeHead(404).end()}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const base=`http://127.0.0.1:${server.address().port}/`;
try{
 for(const lesson of selected){
  const ctx={window:{}};
  for(const file of [`ch${lesson}-reading-data.js`,'reading-paragraph-audio-data.js',`reading-sentence-audio-${lesson}-data.js`])vm.runInNewContext(await readFile(`assets/${file}`,'utf8'),ctx);
  const data=ctx.window.JPY5_READING,timing=ctx.window.JPY5_READING_SENTENCE_AUDIO;
  const clips=JSON.parse(JSON.stringify(timing.sentences)),playable=clips.filter(c=>!c.unavailableReason),pending=clips.filter(c=>c.unavailableReason);
  assert.equal(clips.length,counts[lesson]);assert.equal(data.paragraphs.length,paragraphCounts[lesson]);
  assert.deepEqual(pending,[]);
  if(lesson===15){assert.equal(clips.find(c=>c.id==='4-1').text,'ご存じの方も多いと思うが、この観察研究はビジネスの世界でも注目されている。');assert.equal(clips.find(c=>c.id==='4-1').start,104.66);assert.equal(clips.find(c=>c.id==='4-1').end,111.59);assert(data.paragraphs[3].zh.startsWith('相信不少人都知道，這項觀察研究在商界也受到關注。'));}
  for(const p of data.paragraphs)assert.equal(clips.filter(c=>c.paragraph===p.id).map(c=>c.text).join(''),p.jp);
  for(const [i,c] of clips.entries()){
    if(c.unavailableReason){assert(!('start'in c)&&!('end'in c));continue}
    assert(c.start>=0&&c.end>c.start&&c.end<=ctx.window.JPY5_READING_PARAGRAPH_AUDIO[lesson].duration);
    if(i&&clips[i-1].end)assert(c.start>=clips[i-1].end);
  }
  const bytes=await readFile(resolve(process.env.JPY5_READING_AUDIO_DIR||'tmp/reading-audio',`${lesson}.mp3`));
  const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}}),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.stack));page.setDefaultTimeout(12000);
  await page.addInitScript(()=>{window.clipPauses=[];const pause=HTMLMediaElement.prototype.pause;HTMLMediaElement.prototype.pause=function(){if(this.hasAttribute('data-reading-paragraph-audio'))window.clipPauses.push(this.currentTime);return pause.call(this)}});
  const serve=route=>{
    const m=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/),start=m?Number(m[1]):0,end=m?.[2]?Math.min(Number(m[2]),bytes.length-1):bytes.length-1;
    return route.fulfill({status:m?206:200,contentType:'audio/mpeg',body:bytes.subarray(start,end+1),headers:{'accept-ranges':'bytes',...(m?{'content-range':`bytes ${start}-${end}/${bytes.length}`}:{})}});
  };
  await page.route(timing.src,serve);
  const audio=page.locator('[data-reading-paragraph-audio]'),sentence=id=>page.locator(`[data-reading-sentence="${id}"]`);
  const playing=start=>page.waitForFunction(start=>{const a=document.querySelector('[data-reading-paragraph-audio]');return !a.paused&&!a.seeking&&a.currentTime>=start-.001&&a.currentTime<start+1.5},start);
  const stopped=()=>page.waitForFunction(()=>document.querySelector('[data-reading-paragraph-audio]').paused);
  const baseText=locator=>locator.evaluate(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('rt,rp').forEach(n=>n.remove());return copy.textContent});
  try{
    await page.goto(`${base}chapter-${lesson}-reading.html`,{waitUntil:'domcontentloaded'});
    await page.locator('[data-reading-mode="translation"]').click();
    assert.equal(await page.locator('[data-reading-sentence]').count(),counts[lesson]);
    assert.equal(await page.locator('.translation-list article').count(),paragraphCounts[lesson]);
    for(const p of data.paragraphs){
      assert.equal(await baseText(page.locator(`[data-reading-paragraph="${p.id}"] .translation-original`)),p.jp);
      assert.equal(await page.locator(`[data-reading-paragraph="${p.id}"] > p`).evaluate(el=>{const clone=el.cloneNode(true);clone.querySelectorAll('.translation-original,[data-reading-play]').forEach(n=>n.remove());return clone.textContent}),p.zh);
    }
    const rubies=await page.locator('.translation-original ruby').allTextContents();
    if(lesson===15){const corrected=sentence('4-1');assert.equal(await corrected.getAttribute('aria-disabled'),null);assert.equal(await corrected.getAttribute('tabindex'),'0');const readings=await corrected.locator('rt').allTextContents();for(const kana of ['ぞん','かた','おお','おも'])assert(readings.includes(kana),`missing correct ruby ${kana}`);}
    for(const c of playable){
      await sentence(c.id).click();await playing(c.start);
      assert(Math.abs(await audio.evaluate(a=>a.duration)-ctx.window.JPY5_READING_PARAGRAPH_AUDIO[lesson].duration)<.15);
      assert.equal(await page.locator('[data-reading-sentence][aria-pressed="true"]').count(),1);
      await audio.evaluate((a,end)=>a.currentTime=end-.3,c.end);await stopped();
      const raw=await page.evaluate(()=>window.clipPauses.at(-1));
      assert(raw>=c.end-.01&&raw<=c.end+.15,`${lesson}/${c.id}: actual pause ${raw} beyond ${c.end}`);
      assert(Math.abs(await audio.evaluate(a=>a.currentTime)-c.end)<.05);
      assert.equal(await sentence(c.id).getAttribute('aria-pressed'),'false');
      results.push({id:c.id,start:c.start,end:c.end,rawPause:raw,overshoot:raw-c.end});
    }
    console.log(`PASS lesson ${lesson}: ${playable.length} real-MP3 sentence ranges seek/stop; ${pending.length} withheld`);
    if(lesson===15){
      await sentence('4-1').click();await playing(104.66);
      await sentence('4-1').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,'15-book-correction-active.png')});
      // No clock jump: play the full corrected book sentence from the recording.
      await stopped();assert(Math.abs(await audio.evaluate(a=>a.currentTime)-111.59)<.05);
      const raw=await page.evaluate(()=>window.clipPauses.at(-1));assert(raw>=111.59&&raw<=111.74);
      console.log('PASS lesson 15 book correction: full natural 104.66–111.59 playback, exact ご存じ text/translation and ruby');
    }

    const natural=playable.filter(c=>c.end-c.start>2).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0];
    await sentence(natural.id).click();await playing(natural.start);await stopped();
    const first=playable[0],other=playable.at(-1);
    await sentence(first.id).click();await playing(first.start);
    await sentence(first.id).click();await playing(first.start);
    await page.evaluate(()=>{const buttons=[...document.querySelectorAll('[data-reading-sentence]:not([aria-disabled="true"])')];for(let i=0;i<60;i++)buttons[i%buttons.length].click();buttons[0].click()});
    await playing(first.start);assert.equal(await page.locator('[data-reading-sentence][aria-pressed="true"]').count(),1);
    for(const c of pending){
      assert.equal(await sentence(c.id).getAttribute('aria-disabled'),'true');
      assert.equal(await sentence(c.id).getAttribute('tabindex'),'-1');
      await sentence(c.id).click({force:true});
      assert.equal(await sentence(first.id).getAttribute('aria-pressed'),'true');
      assert.equal(await sentence(c.id).getAttribute('aria-pressed'),'false');
      assert((await page.locator('.reading-stage-head').innerText()).includes('待核對'));
    }
    await page.locator('[data-reading-play="2"]').click();await playing(ctx.window.JPY5_READING_PARAGRAPH_AUDIO[lesson].paragraphs[1].start);
    assert.equal(await sentence(first.id).getAttribute('aria-pressed'),'false');
    await sentence(other.id).click();await playing(other.start);
    assert.equal(await page.locator('[data-reading-play="2"]').getAttribute('aria-pressed'),'false');
    await page.locator('[data-reading-mode="original"]').click();await stopped();
    assert.equal(await page.locator('[data-reading-sentence]').count(),0);
    await page.locator('[data-reading-play="1"]').click();await playing(ctx.window.JPY5_READING_PARAGRAPH_AUDIO[lesson].paragraphs[0].start);
    await page.locator('[data-reading-play="1"]').click();await stopped();
    await page.locator('[data-reading-mode="translation"]').click();assert.deepEqual(await page.locator('.translation-original ruby').allTextContents(),rubies);
    await sentence(first.id).focus();await page.keyboard.press('Enter');await playing(first.start);
    await sentence(other.id).focus();await page.keyboard.press('Space');await playing(other.start);
    const size=()=>page.locator('.translation-original').first().evaluate(el=>getComputedStyle(el).fontSize);
    const oldSize=await size();await page.locator('#font-up').click();await stopped();assert.notEqual(await size(),oldSize);
    await page.locator('#furigana-toggle').click();assert.equal(await page.locator('.translation-original rt').count(),0);
    await page.locator('#furigana-toggle').click();
    await sentence(first.id).click();await playing(first.start);
    await page.locator('[data-reading-mode="vocab"]').click();await stopped();
    await page.locator('#reading-vocab-card').click();assert.equal(await page.locator('.reading-card-answer').count(),1);
    await page.locator('[data-vocab-nav="next"]').click();assert.match(await page.locator('#reading-vocab-card > span').innerText(),/^2\s*\//);
    await page.locator('[data-reading-mode="translation"]').click();
    const longest=playable.reduce((a,b)=>a.text.length>b.text.length?a:b);
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:900});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${lesson}: overflow at ${width}`);
      assert.equal(await sentence(longest.id).evaluate(el=>getComputedStyle(el).display),'inline');
      if(width===390)assert(await sentence(longest.id).evaluate(el=>el.getClientRects().length>1));
      await sentence(first.id).scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`${lesson}-${width}.png`)});
    }
    await page.locator('[data-theme-select]').selectOption('dark');await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await sentence(first.id).click();await playing(first.start);await sentence(first.id).scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`${lesson}-dark-active.png`)});
    await page.locator('.reading-audio-workspace audio[controls]').evaluate(a=>a.play());await stopped();
    await sentence(first.id).click();await playing(first.start);assert(await page.locator('.reading-audio-workspace audio[controls]').evaluate(a=>a.paused));
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));await stopped();
    await sentence(first.id).click();await playing(first.start);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden});await stopped();
    await sentence(first.id).click();await playing(first.start);await page.goto(`${base}index.html`,{waitUntil:'domcontentloaded'});
    await page.unroute(timing.src);await page.route(timing.src,r=>r.abort());
    await page.goto(`${base}chapter-${lesson}-reading.html`,{waitUntil:'domcontentloaded'});await page.locator('[data-reading-mode="translation"]').click();await sentence(first.id).click();
    await page.waitForFunction(id=>document.querySelector(`[data-reading-sentence="${id}"]`).title.includes('重試'),first.id);
    assert.equal(await baseText(sentence(first.id)),first.text);assert.equal(await sentence(first.id).getAttribute('aria-pressed'),'false');
    await page.unroute(timing.src);await page.route(timing.src,serve);await sentence(first.id).click();await playing(first.start);
    assert.deepEqual(errors,[]);
    await writeFile(resolve(out,`${lesson}-results.json`),JSON.stringify({lesson,sentences:clips.length,playable:playable.length,paragraphs:data.paragraphs.length,pending,results,maxOvershoot:Math.max(...results.map(r=>r.overshoot)),errors},null,2));
    console.log(`PASS lesson ${lesson}: natural end, replay, 60 switches, paragraph/full-track, keyboard/ruby/font/vocab, 4 widths/dark, navigation/background and failed-audio recovery`);
  }finally{await page.close()}
 }
}finally{await browser.close();await new Promise(done=>server.close(done))}
