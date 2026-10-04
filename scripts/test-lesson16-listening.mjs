#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import vm from "node:vm";

const { chromium }=createRequire(import.meta.url)("playwright"),root=process.cwd(),contextData={window:{}};
vm.runInNewContext(await readFile(resolve(root,"assets/ch16-conversation-data.js"),"utf8"),contextData);
const data=contextData.window.JPY5_CONVERSATION;
assert.equal(data.items.length,10);
assert.deepEqual(Array.from(data.items,item=>item.jp),["人身事故","危うく","大したことない","泣きたい気分","不幸中の幸い","頭痛い","済めば、安い","ものは考えよう","行っとけばよかった","くよくよしないで"]);
assert.deepEqual(Array.from(data.items,item=>[item.start,item.end]),[[32.68,33.32],[34.76,35.68],[52.02,52.69],[59.86,60.69],[64.33,65.43],[84.02,84.86],[87.98,88.75],[90.40,91.67],[96.92,97.57],[98.10,99.68]]);
assert(data.items.every(item=>Number.isFinite(item.start)&&Number.isFinite(item.end)&&item.end>item.start));
assert.equal(data.comprehension.length,7,"the seven app comprehension questions changed");
assert.deepEqual(Array.from(data.comprehension,item=>item.id),["c1","c2","c3","c4","c5","c6","c7"]);
assert.equal(data.textbookQuestions.length,8);
assert.deepEqual([...new Set(Array.from(data.textbookActivities,item=>item.section))],["1. やってみよう","4. 言ってみよう","5. 練習しよう","6. チャレンジしよう"]);

const html=await readFile(resolve(root,"chapter-16-textbook.html"),"utf8");
assert.match(html,/不幸中の幸いだよ/);assert.match(html,/10 個重點表現/);assert.match(html,/第16課「話す・聞く」/);
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=createServer(async(request,response)=>{try{const path=resolve(root,`.${decodeURIComponent(new URL(request.url,"http://localhost").pathname)}`);if(!path.startsWith(`${root}${sep}`))return response.writeHead(403).end();response.setHeader("Content-Type",types[extname(path)]||"application/octet-stream");response.end(await readFile(path));}catch{response.writeHead(404).end();}});
await new Promise(done=>server.listen(0,"127.0.0.1",done));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.JPY5_BROWSER_CHANNEL?{channel:process.env.JPY5_BROWSER_CHANNEL}:{})});
const browserContext=await browser.newContext({serviceWorkers:"block"});
await browserContext.addInitScript(()=>{
  if(!localStorage.getItem("jpy5.chapter16.conversation"))localStorage.setItem("jpy5.chapter16.conversation",JSON.stringify({mode:"dialogue",card:0,marks:{1:"correct",8:"wrong"},mistakes:{1:2,8:3},stars:{1:true,8:true},attempts:5,comprehensionAnswers:{c1:0},comprehensionMistakes:{},drafts:{}}));
  HTMLMediaElement.prototype.play=function(){this.dataset.playCount=String(Number(this.dataset.playCount||0)+1);return Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(){this.dataset.pauseCount=String(Number(this.dataset.pauseCount||0)+1);};
});
const page=await browserContext.newPage(),errors=[];page.on("pageerror",error=>errors.push(error.message));
try{
 for(const [index,viewport] of [{width:1280,height:900},{width:810,height:1080},{width:390,height:844}].entries()){
  await page.setViewportSize(viewport);await page.goto(`${base}/chapter-16-textbook.html`);
  if(index===0){
   assert.equal(await page.locator('[data-mode="dialogue"]').evaluate(button=>button.classList.contains("active")),true);
   assert.deepEqual(await page.locator(".mode-tabs [data-mode]").evaluateAll(nodes=>nodes.map(node=>node.dataset.mode)),["dialogue","comprehension","activities","focus","cards","choice","order","cloze","dictation","mistakes"]);
   const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem("jpy5.chapter16.conversation")));
   assert.equal(migrated.itemSetVersion,2);assert.deepEqual(migrated.marks,{3:"correct",10:"wrong"});assert.deepEqual(migrated.mistakes,{3:2,10:3});assert.deepEqual(migrated.stars,{3:true,10:true});assert.equal(migrated.card,2);
  }else await page.locator('[data-mode="dialogue"]').click();
  assert.equal(await page.locator(".focus-line").count(),10);assert.equal(await page.locator('.dialogue-row [data-listen]').count(),10);
  await page.locator('[data-listen="1"]').click();assert(Math.abs(await page.locator("#lesson-audio").evaluate(audio=>audio.currentTime)-32.68)<.05);
  await page.locator('[data-listen="2"]').click();await page.locator("#lesson-audio").evaluate(audio=>{audio.currentTime=33.5;audio.dispatchEvent(new Event("timeupdate"));});
  assert.equal(await page.locator("#lesson-audio").getAttribute("data-pause-count"),null,"stale replay listener paused a newer clip");
  await page.locator("#lesson-audio").evaluate(audio=>{audio.currentTime=35.8;audio.dispatchEvent(new Event("timeupdate"));});assert.equal(await page.locator("#lesson-audio").getAttribute("data-pause-count"),"1");
  await page.locator(".focus-line").first().click();assert.equal(await page.locator("[data-dialog-listen]").isVisible(),true);await page.locator("[data-dialog-close]").first().click();

  await page.locator('[data-mode="comprehension"]').click();assert.equal(await page.locator("[data-comprehension]").count(),7);assert.equal(await page.locator(".textbook-answer-card").count(),8);assert.equal(await page.locator(".reference-answer:not([hidden])").count(),0);
  const draft=`ハンドル ${viewport.width}`;await page.locator('[data-draft="tb-c1"]').fill(draft);await page.locator('[data-reference-toggle="tb-c1"]').click();assert.match(await page.locator('[data-reference="tb-c1"] b').innerText(),/官方答案/);

  await page.locator('[data-mode="activities"]').click();assert.deepEqual(await page.locator(".textbook-activity-card>header h2").evaluateAll(nodes=>nodes.map(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.textContent})),["1. やってみよう","4. 言ってみよう","5. 練習しよう","6. チャレンジしよう"]);assert.equal(await page.locator(".pronunciation-number-grid article").count(),4);assert.equal(await page.locator(".textbook-task-card").count(),9);assert.equal(await page.locator(".reference-answer:not([hidden])").count(),0);
  await page.locator('[data-draft="activity-1"]').fill(`階段 ${viewport.width}`);await page.locator("#furigana-toggle").click();assert.equal(await page.locator('[data-draft="activity-1"]').inputValue(),`階段 ${viewport.width}`);assert.equal(await page.locator(".textbook-activity-card ruby").count(),0);await page.locator("#furigana-toggle").click();assert(await page.locator(".textbook-activity-card ruby").count()>0);

  await page.locator('[data-mode="cloze"]').click();assert.equal(await page.locator("[data-cloze]").count(),10);assert.equal(await page.locator("#cloze-official-answers").isHidden(),true);await page.locator("#reveal-cloze").click();assert.equal(await page.locator("#cloze-official-answers").isVisible(),true);assert.equal(await page.locator('[data-cloze="1"]').inputValue(),"");for(const item of data.items)await page.locator(`[data-cloze="${item.id}"]`).fill(item.jp);await page.locator("#check-cloze").click();assert.equal(await page.locator(".cloze-blank input.correct").count(),10);assert.match(await page.locator(".answer-message").innerText(),/全部句子正確/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`horizontal overflow at ${viewport.width}px`);
  await page.locator('[data-mode="comprehension"]').click();assert.equal(await page.locator('[data-draft="tb-c1"]').inputValue(),draft);await page.reload();assert.equal(await page.locator('[data-draft="tb-c1"]').inputValue(),draft);await page.locator('[data-mode="activities"]').click();assert.equal(await page.locator('[data-draft="activity-1"]').inputValue(),`階段 ${viewport.width}`);
 }
 assert.deepEqual(errors,[],errors.join("\n"));console.log("Lesson 16 listening checks passed: 10 verified targets, safe migration, replay cancellation, textbook questions/activities, saved drafts, furigana, cloze scoring, and responsive layouts.");
}finally{await browser.close();await new Promise(done=>server.close(done));}
