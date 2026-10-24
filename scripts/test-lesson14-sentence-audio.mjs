#!/usr/bin/env node
// Uses the existing original recording locally; never adds audio to the site.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import vm from 'node:vm';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.cwd(), context={window:{}};
for (const file of ['ch14-reading-data.js','reading-paragraph-audio-data.js','reading-sentence-audio-14-data.js'])
  vm.runInNewContext(await readFile(`assets/${file}`,'utf8'),context);
const data=context.window.JPY5_READING, timing=context.window.JPY5_READING_SENTENCE_AUDIO;
const clips=JSON.parse(JSON.stringify(timing.sentences));
assert.equal(clips.length,19);
for (const paragraph of data.paragraphs) {
  const sentences=clips.filter(s=>s.paragraph===paragraph.id);
  assert.equal(sentences.map(s=>s.text).join(''),paragraph.jp);
  const range=context.window.JPY5_READING_PARAGRAPH_AUDIO[14].paragraphs[paragraph.id-1];
  sentences.forEach((s,i)=>{
    assert(s.start>=range.start && s.end<=range.end && s.end>s.start);
    if(i) assert(s.start>sentences[i-1].end);
  });
}
const bytes=await readFile(resolve(process.env.JPY5_READING_AUDIO_DIR || 'tmp/reading-audio','14.mp3'));
await mkdir('tmp/sentence14-pilot',{recursive:true});
const server=createServer(async(req,res)=>{
  try {
    const path=resolve(root,`.${decodeURIComponent(new URL(req.url,'http://localhost').pathname)}`);
    if(!path.startsWith(root+sep)) return res.writeHead(403).end();
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(path)]||'application/octet-stream');
    res.end(await readFile(path));
  } catch {res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL || 'msedge'});
const page=await browser.newPage({serviceWorkers:'block'});
const errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(10000);
const serveAudio=route=>{
  const match=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
  const start=match?Number(match[1]):0, end=match?.[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1;
  return route.fulfill({status:match?206:200,contentType:'audio/mpeg',body:bytes.subarray(start,end+1),headers:{'accept-ranges':'bytes',...(match?{'content-range':`bytes ${start}-${end}/${bytes.length}`}:{})}});
};
await page.route('**/'+timing.src,serveAudio);
const audio=page.locator('[data-reading-paragraph-audio]');
const sentence=id=>page.locator(`[data-reading-sentence="${id}"]`);
async function playing(start){
  await page.waitForFunction(start=>{const a=document.querySelector('[data-reading-paragraph-audio]');return !a.paused&&!a.seeking&&a.currentTime>=start&&a.currentTime<start+1.5},start).catch(async error=>{
    console.log('Playback failure',start,await audio.evaluate(a=>({currentTime:a.currentTime,paused:a.paused,seeking:a.seeking,error:a.error?.message,active:[...document.querySelectorAll('[aria-pressed="true"]')].map(el=>el.outerHTML),title:document.querySelector('[data-reading-sentence="1-1"]')?.title})));
    throw error;
  });
}
async function stopped(){await page.waitForFunction(()=>document.querySelector('[data-reading-paragraph-audio]').paused)}
const baseText=locator=>locator.evaluate(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('rt,rp').forEach(n=>n.remove());return copy.textContent});
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/chapter-14-reading.html`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-reading-mode="translation"]').click();
  assert.equal(await sentence('1-1').count(),1);
  assert.equal(await page.locator('[data-reading-sentence]').count(),19);
  assert.equal(await page.locator('.translation-list article').count(),5);
  assert.equal(await page.locator('[data-reading-sentence]').count(),19);
  for(const p of data.paragraphs) assert.equal(await baseText(page.locator(`[data-reading-paragraph="${p.id}"] .translation-original`)),p.jp);
  for(const p of data.paragraphs) assert.equal(await page.locator(`[data-reading-paragraph="${p.id}"] > p`).evaluate(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('.translation-original,[data-reading-play]').forEach(node=>node.remove());return copy.textContent}),p.zh);
  const rubyBefore=await page.locator('.translation-original ruby').allTextContents();
  for(const clip of clips){
    await sentence(clip.id).click(); await playing(clip.start);
    assert(Math.abs(await audio.evaluate(a=>a.duration)-176.914)<.15,'exact original recording duration');
    assert.equal(await page.locator('[data-reading-sentence][aria-pressed="true"]').count(),1);
    await audio.evaluate((a,end)=>{a.currentTime=end-.3},clip.end);
    await stopped();
    const end=await audio.evaluate(a=>a.currentTime);
    assert(Math.abs(end-clip.end)<.05,`${clip.id} boundary ${end}`);
    assert.equal(await sentence(clip.id).getAttribute('aria-pressed'),'false');
    results.push({id:clip.id,start:clip.start,end,passed:true});
  }
  console.log('PASS: 19 real-MP3 sentence seeks, end stops, and highlight resets');
  // Full natural playback through a short sentence, without advancing its clock.
  await sentence('3-3').click(); await playing(58.97); await stopped();
  assert(Math.abs(await audio.evaluate(a=>a.currentTime)-62.71)<.05);
  await sentence('1-1').click(); await playing(9.6);
  await audio.evaluate(a=>a.currentTime=11); await playing(11);
  await sentence('1-1').click(); await playing(9.6);
  await page.evaluate(()=>{
    const buttons=[...document.querySelectorAll('[data-reading-sentence]')];
    for(let i=0;i<60;i++) buttons[i%buttons.length].click();
    buttons[0].click();
  });
  await playing(9.6);
  assert.equal(await sentence('1-1').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('[data-reading-sentence][aria-pressed="true"]').count(),1);
  console.log('PASS: natural end, same-sentence replay, 60 rapid switches');
  await page.locator('[data-reading-play="2"]').click(); await playing(41.84);
  assert.equal(await sentence('1-1').getAttribute('aria-pressed'),'false');
  await sentence('5-1').click(); await playing(161.58);
  assert.equal(await page.locator('[data-reading-play="2"]').getAttribute('aria-pressed'),'false');
  await page.locator('[data-reading-mode="original"]').click(); await stopped();
  assert.equal(await page.locator('[data-reading-sentence]').count(),0);
  await page.locator('[data-reading-play="1"]').click(); await playing(9.6);
  await page.locator('[data-reading-play="1"]').click(); await stopped();
  await page.locator('[data-reading-mode="translation"]').click();
  assert.deepEqual(await page.locator('.translation-original ruby').allTextContents(),rubyBefore);
  await sentence('1-1').focus(); await page.keyboard.press('Enter'); await playing(9.6);
  await sentence('2-1').focus(); await page.keyboard.press('Space'); await playing(41.84);
  const size=()=>page.locator('.translation-original').first().evaluate(el=>getComputedStyle(el).fontSize);
  const initial=await size(); await page.locator('#font-up').click(); await stopped();
  assert.notEqual(await size(),initial);
  await page.locator('#furigana-toggle').click();
  await sentence('1-1').click(); await playing(9.6);
  await page.locator('[data-reading-mode="vocab"]').click(); await stopped();
  await page.locator('#reading-vocab-card').click();
  assert.equal(await page.locator('.reading-card-answer').count(),1);
  await page.locator('[data-vocab-nav="next"]').click();
  assert.match(await page.locator('#reading-vocab-card > span').innerText(),/^2\s*\//);
  await page.locator('[data-reading-mode="translation"]').click();
  assert.equal(await page.locator('.translation-original rt').count(),0);
  assert.equal(await page.locator('[data-reading-sentence]').count(),19);
  await page.locator('#furigana-toggle').click();
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
    assert.equal(await sentence('1-1').evaluate(el=>getComputedStyle(el).display),'inline');
    if(width===390) assert(await sentence('1-3').evaluate(el=>el.getClientRects().length>1),'long sentence must flow across multiple lines');
    await page.screenshot({path:`tmp/sentence14-pilot/${width}.png`,fullPage:true});
  }
  await sentence('1-1').click(); await playing(9.6);
  await sentence('1-1').scrollIntoViewIfNeeded();
  await page.screenshot({path:'tmp/sentence14-pilot/active.png'});
  await page.locator('.reading-audio-workspace audio[controls]').evaluate(a=>a.play()); await stopped();
  await sentence('1-1').click(); await playing(9.6);
  assert(await page.locator('.reading-audio-workspace audio[controls]').evaluate(a=>a.paused));
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide'))); await stopped();
  await sentence('1-1').click(); await playing(9.6);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden});
  await stopped();
  await sentence('1-1').click(); await playing(9.6);
  await page.goto(`http://127.0.0.1:${server.address().port}/chapter-14.html`,{waitUntil:'domcontentloaded'});
  assert.deepEqual(errors,[]);
  console.log('PASS: paragraph/sentence/full-track switching, view changes, keyboard, ruby, font controls, navigation, 320/390/768/1440px');
  // A failed media request must preserve sentence text and allow retry.
  await page.unroute('**/'+timing.src);
  await page.route('**/'+timing.src,route=>route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/chapter-14-reading.html`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-reading-mode="translation"]').click(); await sentence('1-1').click();
  await page.waitForFunction(()=>document.querySelector('[data-reading-sentence="1-1"]').title.includes('重試'));
  assert.equal(await baseText(sentence('1-1')),clips[0].text);
  assert.equal(await sentence('1-1').getAttribute('aria-pressed'),'false');
  console.log('PASS: audio-load error preserves sentence and clears highlight');
  await page.unroute('**/'+timing.src);
  await page.route('**/'+timing.src,serveAudio);
  await sentence('1-1').click(); await playing(9.6);
  console.log('PASS: retry after restored audio succeeds');
  await writeFile('tmp/sentence14-pilot/results.json',JSON.stringify({browser:'Microsoft Edge / Chromium',results,errors},null,2));
} finally {await browser.close(); await new Promise(done=>server.close(done))}
