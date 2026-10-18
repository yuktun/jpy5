// The explicitly approved review content is public. No real account is used.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const root=process.cwd(),source=await readFile('chapter-14-review.html','utf8');
const original=execFileSync('git',['show','8a4a519af833679e37d334a9aa20a7b86be7d27c:chapter-14-review.html'],{encoding:'utf8'});
const section=html=>html.match(/<section class="teacher-review-shell"[\s\S]*?<\/section>/)?.[0].replace(/\r\n/g,'\n');
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(hash(section(source)),hash(section(original)),'Public wording, ruby, definitions, answers and source markup must match the original');
assert.doesNotMatch(source,/data-teacher-section|teacher-access\.mjs/);
const server=createServer(async(req,res)=>{
 const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+sep)||file.includes('private-migration')||file.includes('node_modules')||file.includes(`${sep}.git`))return res.writeHead(403).end();
 try{res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'}),context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
let protectedReads=0;const errors=[];page.on('pageerror',error=>errors.push(error.message));
await context.route('https://**/*',route=>{if(route.request().url().includes('/jpy5TeacherNotes/'))protectedReads++;return route.abort();});
await context.route('**/assets/firebase-sync.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export const initialiseFirebaseSync=()=>{};'}));
const url=`http://127.0.0.1:${server.address().port}/chapter-14-review.html`;
try{
 for(const width of [390,810,1280]){
  await page.setViewportSize({width,height:900});await page.goto(url);
  const shell=page.locator('#teacher-exercise'),help=page.locator('.teacher-word-help-popover');
  assert.equal(await shell.getAttribute('class'),'teacher-review-shell');assert.equal(await shell.locator('.teacher-supplement-header').count(),1);
  assert.equal(await shell.locator('.teacher-word-bank button').count(),33);assert.equal(await shell.locator('.teacher-word-bank').first().locator('button').count(),6);assert.equal(await shell.locator('[data-answer-toggle]').count(),13);
  await page.waitForFunction(()=>document.querySelector('#teacher-exercise a .internet-required'));
  assert.equal((await shell.locator('a[href*="drive.google.com"]').textContent()).split('需網絡').length-1,1);
  assert.equal(await page.locator('[data-teacher-login],[data-teacher-section]').count(),0);
  const button=shell.locator('.teacher-word-bank button').first();await button.hover();await help.waitFor({state:'visible'});
  assert(await help.evaluate(node=>node.parentNode===document.body&&getComputedStyle(node).position==='fixed'));
  await page.keyboard.press('Escape');await help.waitFor({state:'hidden'});
  await button.focus();await page.keyboard.press('Tab');await help.waitFor({state:'visible'});await page.keyboard.press('Escape');
  await context.setOffline(true);assert.equal(await shell.locator('[data-answer-toggle]').count(),13);await context.setOffline(false);
  await page.reload();assert.equal(await help.count(),1);assert.equal(await shell.locator('.teacher-answer:visible').count(),0);
 }
 assert.equal(protectedReads,0);assert.deepEqual(errors,[]);
 console.log('Public review passed: original wording/ruby/definitions/answers/source parity, 3 widths, signed-out without Firebase, 6 top/33 total words, 13 answer panels, focus/hover, one source/network label, navigation, offline retention, zero protected reads.');
}finally{await browser.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
