import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const {chromium}=createRequire(import.meta.url)('playwright'),root=process.cwd();
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root+sep)||path.includes(sep+'.git'+sep))return res.writeHead(403).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end()}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'}),page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}}),base=`http://127.0.0.1:${server.address().port}/`,results=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));await page.route('**/*.mp3',route=>route.abort());
const card=()=>page.locator('.reading-audio-workspace,.audio-workspace');
async function one(){await page.waitForFunction(()=>document.querySelectorAll('.reading-audio-workspace .audio-internet-required,.audio-workspace .audio-internet-required').length===1);assert.equal(await card().locator('.audio-internet-required').innerText(),'音訊需網絡，不包括在離線內容內。');assert.equal(await card().locator('.audio-internet-required').isVisible(),true);assert.equal(await card().locator('audio[controls] + .audio-internet-required').count(),1);assert.equal(await card().locator('audio[hidden] + .audio-internet-required').count(),0);}
try{
 for(let lesson=13;lesson<=20;lesson++)for(const module of ['reading','textbook']){
  await page.goto(base+`chapter-${lesson}-${module}.html`);await one();
  const src=await card().locator('audio[controls]').getAttribute('src');assert(src.startsWith('https://ttrw.jp/static/sound/'));
  if(lesson>13){assert((await card().innerText()).includes('音訊由 ttrw.jp 提供。'));assert(!(await card().innerText()).includes('離線模式不保證'));}
  assert.equal(await card().locator('audio').count(),module==='reading'?2:1);
  for(let i=0;i<3;i++){
   for(const mode of module==='reading'?['translation','original']:['translation','dialogue','focus'])await page.locator(`[data-${module==='reading'?'reading-mode':'mode'}="${mode}"]`).click();
   await page.evaluate(()=>{const a=document.querySelector('.reading-audio-workspace audio[controls],#lesson-audio');window.JPY5PlaybackSpeed.attach(a.closest('.reading-audio-workspace')?[a,document.querySelector('[data-reading-paragraph-audio]')]:[a]);});await one();
  }
  // Existing duplicate labels and reparented notices are normalized, rather
  // than adding another label when a renderer mutates the audio workspace.
  await card().evaluate(card=>{const note=card.querySelector('.audio-internet-required');card.append(note.cloneNode(true),note.cloneNode(true));card.append(note);});await one();
  await card().evaluate(card=>{const hidden=document.createElement('audio');hidden.hidden=true;hidden.src=card.querySelector('audio').src;card.append(hidden);});await one();
  assert.equal(await card().locator('[data-playback-speed]').count(),1);
  for(const attr of ['hidden','controls']){
   await card().locator('audio[controls]').evaluate((audio,attr)=>{if(attr==='hidden')audio.hidden=true;else audio.controls=false},attr);
   await page.waitForFunction(()=>document.querySelectorAll('.reading-audio-workspace .audio-internet-required,.audio-workspace .audio-internet-required').length===0);
   await card().locator('audio').first().evaluate((audio,attr)=>{if(attr==='hidden')audio.hidden=false;else audio.controls=true},attr);await one();
  }

  await page.reload();await one();
  if(lesson===14&&module==='reading'){await card().scrollIntoViewIfNeeded();await mkdir('tmp/audio-online-notices',{recursive:true});await page.screenshot({path:'tmp/audio-online-notices/lesson14-reading-phone.png'});}
  results.push({lesson,module,count:1});console.log(`PASS lesson ${lesson} ${module}: one notice, source retained, modes/reinitialization/duplicates/hidden audio/reload`);
 }
 await page.evaluate(()=>{const helper=document.createElement('audio');helper.hidden=true;helper.src='https://example.invalid/helper.mp3';document.body.append(helper)});await one();
 // A hidden-only helper or same-origin audio needs no internet label. Multiple
 // external source formats in one visible player still need only one label.
 await page.evaluate(()=>{for(const [id,hidden,src] of [['hidden-only',true,'https://example.invalid/audio.mp3'],['local-only',false,location.origin+'/local.mp3'],['source-formats',false,null]]){const c=document.createElement('section');c.className='audio-workspace';c.id=id;const a=document.createElement('audio');a.controls=true;a.hidden=hidden;if(src)a.src=src;else for(const type of ['mpeg','ogg']){const s=document.createElement('source');s.src='https://example.invalid/audio.'+type;a.append(s)}c.append(a);document.body.append(c)}});
 await page.waitForFunction(()=>document.querySelectorAll('#source-formats .audio-internet-required').length===1);
 assert.equal(await page.locator('#hidden-only .audio-internet-required,#local-only .audio-internet-required').count(),0);
 assert.deepEqual(errors,[]);await writeFile('tmp/audio-online-notices/results.json',JSON.stringify(results,null,2));
 console.log('PASS hidden-only/local players excluded; multiple source formats deduplicated; no script errors');
}finally{await browser.close();server.close()}
