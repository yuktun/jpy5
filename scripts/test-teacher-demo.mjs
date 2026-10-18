// Synthetic identities and a schema-only mock response; no real credentials.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),server=createServer(async(req,res)=>{
 if(req.url==='/demo.html')return res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><html><head><link rel="icon" href="data:,"></head><body><article id="general">SYNTHETIC PUBLIC GRAMMAR</article></body></html>');
 const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(resolve(root,'assets')+sep))return res.writeHead(404).end();
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'}),context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
let reads=0,status=200,held=false,release,onHeld;
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await context.route('https://**/*',async route=>{
 const url=new URL(route.request().url());
 assert.equal(url.hostname,'firestore.googleapis.com');assert.equal(url.searchParams.get('mask.fieldPaths'),'schemaVersion');assert.equal([...url.searchParams].length,1);
 reads++;const code=status;
 if(held)await new Promise(done=>{release=done;onHeld?.();onHeld=null;});
 await route.fulfill({status:code,contentType:'application/json',body:JSON.stringify({fields:{schemaVersion:{integerValue:'2'}}})}).catch(()=>{});
});
const state=value=>page.waitForFunction(value=>[...document.querySelectorAll('[data-teacher-demo]')].every(root=>root.dataset.accessState===value),value);
const text=()=>page.locator('[data-teacher-demo-content]').allTextContents();
async function mount(uid){
 await page.goto(`http://127.0.0.1:${server.address().port}/demo.html`);
 await page.evaluate(async uid=>{
  const {mountTeacherDemos}=await import('/assets/teacher-demo.mjs');
  const panels=Array.from({length:11},()=>{const root=document.createElement('details');root.dataset.teacherDemo='';root.innerHTML='<summary>Teacher notes demo</summary><p data-teacher-demo-status></p><button data-teacher-demo-login hidden>Login</button><button data-teacher-demo-retry hidden>Retry</button><div data-teacher-demo-content></div>';document.body.append(root);return root;});
  let notify;const user=uid=>uid?{uid,getIdToken:async()=> 'synthetic-demo-token'}:null;
  window.account=uid=>notify(user(uid));
  window.demoController=await mountTeacherDemos(panels,async()=>({subscribe:callback=>{notify=callback;callback(user(uid));callback(user(uid));},login:async()=>window.account('approved'),logout:async()=>window.account(null)}));
 },uid);
}
try{
 await mount(null);await state('signed-out');assert.equal(reads,0);assert((await text()).every(value=>value===''));
 await page.locator('[data-teacher-demo] summary').first().click();assert.equal(await page.locator('[data-teacher-demo-login]').first().isVisible(),true);
 held=true;const waiting=new Promise(done=>onHeld=done);await page.locator('[data-teacher-demo-login]').first().click();await waiting;await state('loading');
 assert((await text()).every(value=>value===''),'sign-in alone never reveals demo text');
 await page.evaluate(()=>{window.account('approved');window.dispatchEvent(new Event('pageshow'));});assert.equal(reads,1,'all eleven panels share one request');
 held=false;release();await state('loaded');assert((await text()).every(value=>value==="Teacher's notes here"));
 const approvedReads=reads;await page.evaluate(()=>window.account('approved'));assert.equal(reads,approvedReads);
 status=403;await page.evaluate(()=>window.demoController.read({refresh:true}));await state('denied');assert((await text()).every(value=>value===''),'failed server revalidation clears the demo');
 await page.evaluate(()=>window.account('unapproved'));await state('denied');assert((await text()).every(value=>value===''));
 status=200;await page.evaluate(()=>window.account('approved-again'));await state('loaded');
 await context.setOffline(true);await state('offline');assert((await text()).every(value=>value===''));
 await context.setOffline(false);await state('loaded');
 await page.evaluate(()=>window.account(null));await state('signed-out');assert((await text()).every(value=>value===''));
 held=true;const staleWaiting=new Promise(done=>onHeld=done);await page.evaluate(()=>window.account('slow'));await staleWaiting;await state('loading');
 await page.evaluate(()=>window.account(null));held=false;release();await state('signed-out');
 await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));assert((await text()).every(value=>value===''));
 assert.equal(await page.locator('#general').textContent(),'SYNTHETIC PUBLIC GRAMMAR');
 assert(!await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes("Teacher's notes here")));
 assert.deepEqual(errors,[]);console.log('Teacher demo passed: signed-out, sign-in pending, authorized, signed-in denied, masked/deduplicated read for 11 panels, refresh denial, logout/offline/stale clearing, no persistent demo body, independent public grammar.');
}finally{await context.close();await browser.close();await new Promise(done=>server.close(done));}
