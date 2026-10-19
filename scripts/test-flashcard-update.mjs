// Exercise the actual opt-in package update from the last published release.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import vm from 'node:vm';
import {chromium} from 'playwright';
const root=process.cwd(),previous='00325d1c5e17ae0c411c9397ec09ff48afe6474c';
const decode=source=>{const context={self:{}};vm.runInNewContext(source,context);return context.self.JPY5_OFFLINE_MANIFEST;};
const oldManifest=decode(execFileSync('git',['show',`${previous}:assets/offline-assets.js`],{encoding:'utf8'}));
const currentManifest=decode(await readFile('assets/offline-assets.js','utf8'));
const changed=['assets/offline-assets.js',...oldManifest.assets.filter(file=>oldManifest.hashes[file]!==currentManifest.hashes[file])];
const oldFiles=new Map(changed.map(file=>[file,execFileSync('git',['show',`${previous}:${file}`])]));
let serveNew=false;
const server=createServer(async(req,res)=>{
 const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html',path=resolve(root,file);
 if(!path.startsWith(root+sep)||file.includes('private-migration')||file.includes('node_modules')||file.startsWith('.git'))return res.writeHead(403).end();
 try{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.webmanifest':'application/manifest+json'})[extname(path)]||'application/octet-stream');res.end(!serveNew&&oldFiles.has(file)?oldFiles.get(file):await readFile(path));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/`,browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext({viewport:{width:390,height:900},hasTouch:true}),page=await context.newPage();
await context.route('https://**/*',route=>route.abort());
async function ready(){await page.waitForFunction(()=>document.querySelector('.pwa-status')?.dataset.state==='ready',null,{timeout:90000});}
try{
 await page.goto(base+'chapter-14-flashcards.html');
 await page.waitForFunction(()=>navigator.serviceWorker.controller&&document.querySelector('.pwa-status')?.dataset.state==='online');
 await page.locator('.pwa-status').click();await page.locator('[data-offline-download]').click();await ready();await page.locator('[data-offline-close]').click();
 await page.locator('[data-direction="zh"]').click();
 assert(!/^\d+\/\d+$/.test(await page.locator('#card-kicker').textContent()),'Old package reproduces answer leakage');
 assert.equal(await page.locator('.module-lesson-switcher').count(),0);
 await page.evaluate(()=>localStorage.setItem('jpy5.chapter14.updateSentinel','keep'));
 const saved=await page.evaluate(()=>localStorage.getItem('jpy5.chapter14.flashcards'));
 serveNew=true;
 await page.locator('.pwa-status').click();await page.locator('[data-offline-check]').click();
 await page.waitForFunction(()=>document.querySelector('[data-offline-download]')?.hidden===false);
 assert.equal(await page.locator('.module-lesson-switcher').count(),0,'Detecting an update does not replace the old page');
 await page.locator('[data-offline-download]').click();await ready();await page.locator('[data-offline-close]').click();
 await context.setOffline(true);
 const cold=await context.newPage();await cold.goto(base+'chapter-14-flashcards.html');
 assert.match(await cold.locator('#card-kicker').textContent(),/^\d+\/\d+$/);
 assert.equal(await cold.locator('#card-back').innerHTML(),'');
 assert.equal(await cold.locator('.module-lesson-switcher a').count(),6);
 assert.equal(await cold.evaluate(()=>localStorage.getItem('jpy5.chapter14.flashcards')),saved);
 assert.equal(await cold.evaluate(()=>localStorage.getItem('jpy5.chapter14.updateSentinel')),'keep');
 await cold.locator('#flashcard').tap();assert.equal(await cold.locator('#card-back').isVisible(),true);
 await cold.locator('#next-card').tap();assert.equal(await cold.locator('#card-back').innerHTML(),'');
 for(const module of ['quiz','history']){await cold.goto(base+`chapter-14-${module}.html`);assert.equal(await cold.locator('.module-lesson-switcher a').count(),6);}
 await cold.goto(base+'chapter-14-notes.html');
 assert.equal(await cold.locator('[data-teacher-demo]').count(),11);
 assert((await cold.locator('[data-teacher-demo-content]').allTextContents()).every(text=>text===''));
 await cold.goto(base+'chapter-14-vocabulary.html');assert.equal(await cold.locator('#teacher-adverbs .teacher-adverb-card').count(),4);
 console.log('Microsoft Edge package upgrade passed: old leakage reproduced, explicit update required, fresh offline reverse front/flip/reset and three lesson bars fixed, saved progress retained, grammar gates empty, public adverbs retained.');
}finally{await context.close();await browser.close();await new Promise(done=>server.close(done));}
