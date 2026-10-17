// Test the real loader with synthetic service callbacks and data only.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {chromium} from 'playwright';
import {firestoreFixture} from './teacher-test-fixtures.mjs';
const root=process.cwd(),server=createServer(async(req,res)=>{
  if(req.url==='/test.html')return res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><html><head><link rel="icon" href="data:,"></head><body></body></html>');
  const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+sep)||!file.startsWith(resolve(root,'assets')+sep))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
let reads=0,release,delay=false,responseCode=200;
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await context.route('https://**/*',async route=>{
  if(!route.request().url().startsWith('https://firestore.googleapis.com/'))return route.abort();
  reads++;const status=responseCode;
  if(delay)await new Promise(done=>release=done);
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(firestoreFixture)}).catch(()=>{});
});
const state=value=>page.waitForFunction(value=>document.querySelector('[data-teacher-section]')?.dataset.accessState===value,value);
async function mount(uid){await page.goto(base+'/test.html');await page.evaluate(async uid=>{
  const {mountTeacherAccess}=await import('/assets/teacher-access.mjs');
  const root=document.createElement('section');root.dataset.teacherSection='exercises';
  root.innerHTML='<p data-teacher-status></p><button data-teacher-login hidden>Login</button><button data-teacher-load hidden>Retry</button><button data-teacher-logout hidden>Logout</button><div data-teacher-content></div>';document.body.append(root);
  let notify;
  const user=uid=>uid?{uid,getIdToken:async()=> 'synthetic'}:null;
  window.account=uid=>notify(user(uid));
  window.control=await mountTeacherAccess(root,async()=>({subscribe:callback=>{notify=callback;callback(user(uid));callback(user(uid));},login:async()=>window.account('approved'),logout:async()=>window.account(null)}));
},uid);}
try{
  // Existing sign-in autoloads once even if auth emits the same user twice.
  delay=true;const before=reads;await mount('approved');await state('loading');await page.waitForFunction(()=>Boolean(window.control));
  await page.evaluate(()=>{window.account('approved');window.dispatchEvent(new Event('pageshow'));window.dispatchEvent(new Event('online'));});
  assert.equal(reads,before+1);delay=false;release();await state('loaded');
  assert.equal(await page.locator('[data-teacher-load]').isHidden(),true);
  const count=reads;await page.evaluate(()=>{window.account('approved');window.dispatchEvent(new Event('pageshow'));});assert.equal(reads,count);
  // Revalidation renews the lease without replacing the learner's current DOM.
  await page.evaluate(()=>document.querySelector('[data-teacher-content]').dataset.originalView='kept');
  await page.evaluate(()=>window.control.read({refresh:true}));assert.equal(await page.locator('[data-teacher-content]').getAttribute('data-original-view'),'kept');
  await page.locator('[data-teacher-logout]').click();await state('signed-out');assert.equal(await page.locator('[data-teacher-content]').textContent(),'');
  // New sign-in uses the same automatic path.
  await page.locator('[data-teacher-login]').click();await state('loaded');
  responseCode=403;await page.evaluate(()=>window.account('unapproved'));await state('denied');assert.equal(await page.locator('[data-teacher-content]').textContent(),'');
  responseCode=200;delay=true;await page.evaluate(()=>window.account('slow'));await state('loading');
  await page.evaluate(()=>window.account(null));await state('signed-out');delay=false;release();
  await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));assert.equal(await page.locator('[data-teacher-content]').textContent(),'');
  await mount(null);await state('signed-out');const guestReads=reads;await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));assert.equal(reads,guestReads);
  assert.deepEqual(errors,[]);console.log('Autoload passed: persisted/new sign-in, server denial, deduplicated auth/lifecycle requests, retained view on refresh, logout and stale-response clearing.');
}finally{await context.close();await browser.close();await new Promise(done=>server.close(done));}
