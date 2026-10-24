import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFile,readdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import vm from 'node:vm';

const base='http://127.0.0.1:8000/';
const recordings=[];
for(const kind of ['reading','listening']) {
  for(const name of await readdir(`assets/audio/${kind}`)) recordings.push(`assets/audio/${kind}/${name}`);
}
assert.equal(recordings.length,16);
const context={self:{}};
vm.runInNewContext(await readFile('assets/offline-assets.js','utf8'),context);
assert(context.self.JPY5_OFFLINE_MANIFEST.assets.every(path=>!path.endsWith('.mp3')));
const missing={13:['352660'],14:['353049'],15:['353323'],16:['353585','353636'],17:['353942'],18:['354323'],19:['354838','354982'],20:['355264']};
for(const [lesson,suffixes] of Object.entries(missing)) {
  const html=await readFile(`chapter-${lesson}.html`,'utf8');
  for(const suffix of suffixes) assert(html.includes(`href="https://ttrw.jp/static/sound/sound202406141718${suffix}.mp3"`));
}
for(const file of [...(await readdir('.')).filter(path=>path.endsWith('.html')),...(await readdir('assets')).filter(path=>path.endsWith('.js')).map(path=>`assets/${path}`)]) {
  const text=await readFile(file,'utf8');
  for(const path of recordings) assert(!text.includes(`https://ttrw.jp/static/sound/${path.split('/').at(-1)}`),`${file}: stale migrated URL`);
  for(const match of text.matchAll(/assets\/audio\/(?:reading|listening)\/[^"'\s<>]+\.mp3/g)) assert(recordings.includes(match[0]),`${file}: missing recording`);
}
const server=spawn(process.execPath,['scripts/serve-public.mjs'],{stdio:['ignore','pipe','pipe']});
let browser;
try {
  await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('Preview server exited before starting');})]);
  for(const path of recordings) {
    const expected=await readFile(path),response=await fetch(base+path);
    assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'audio/mpeg');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),expected);
    const range=await fetch(base+path,{headers:{Range:'bytes=100-199'}});
    assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),`bytes 100-199/${expected.length}`);
    assert.deepEqual(Buffer.from(await range.arrayBuffer()),expected.subarray(100,200));
    const suffix=await fetch(base+path,{headers:{Range:'bytes=-20'}});
    assert.equal(suffix.status,206);assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),expected.subarray(-20));
    const invalid=await fetch(base+path,{headers:{Range:`bytes=${expected.length}-`}});
    assert.equal(invalid.status,416);
    const head=await fetch(base+path,{method:'HEAD'});
    assert.equal(head.headers.get('content-length'),String(expected.length));assert.equal((await head.arrayBuffer()).byteLength,0);
  }
  for(const path of ['.git/config','private-migration/example.mp3','assets/audio/lesson13-quiz1-dictation.mp3']) assert.equal((await fetch(base+path)).status,404);
  browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
  const page=await browser.newPage({serviceWorkers:'block'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(let lesson=13;lesson<=20;lesson++) for(const module of ['reading','textbook']) {
    await page.goto(`${base}chapter-${lesson}-${module}.html`);
    const audio=page.locator('audio[controls]').first();
    assert((await audio.getAttribute('src')).startsWith(`assets/audio/${module==='reading'?'reading':'listening'}/`));
    await audio.evaluate(async element=>{
      if(element.readyState<1) await new Promise((resolve,reject)=>{element.addEventListener('loadedmetadata',resolve,{once:true});element.addEventListener('error',reject,{once:true});});
      element.currentTime=element.duration/2;await element.play();
    });
    await page.waitForFunction(()=>{const a=document.querySelector('audio[controls]');return !a.paused&&!a.seeking&&a.currentTime>a.duration/2+.1;});
    await audio.evaluate(element=>element.pause());
    assert.equal(await page.locator('.audio-internet-required').count(),1);
    if(module==='reading') {
      await page.locator('[data-reading-mode="translation"]').click();
      for(const selector of ['[data-reading-play]','[data-reading-sentence]']) {
        await page.locator(selector).first().click();
        await page.waitForFunction(()=>{const a=document.querySelector('[data-reading-paragraph-audio]');return a&&!a.paused&&!a.seeking&&a.readyState>=2&&a.currentTime>0;});
        await page.locator('[data-reading-paragraph-audio]').evaluate(element=>element.pause());
      }
    }
    console.log(`PASS lesson ${lesson} ${module}: published file, native playback and seeking`);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS 16 recordings, original missing links, offline exclusion, range responses and protected-file exclusion');
} finally {
  await browser?.close();server.kill();
}
