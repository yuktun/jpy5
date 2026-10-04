#!/usr/bin/env node
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname,resolve,sep} from "node:path";
import vm from "node:vm";

const {chromium}=createRequire(import.meta.url)("playwright"),root=process.cwd(),contextData={window:{}};
vm.runInNewContext(await readFile(resolve(root,"assets/ch17-conversation-data.js"),"utf8"),contextData);
const data=contextData.window.JPY5_CONVERSATION;
const answers=["ご無沙汰しています","お口に合うかどうか分かりませんが","お休みのところ","何のおかまいもできません","お父さんのお友達","お兄ちゃん","あのね","お父さんが鬼なの","おじさん"];
const timings=[[12.30,13.42],[17.40,19.60],[31.02,31.90],[34.18,35.78],[43.68,45.05],[55.46,56.02],[108.38,109.08],[114.18,116.17],[131.54,132.16]];
assert.equal(data.dialogue.length,29);assert.deepEqual(Array.from(data.listeningTargets,item=>item.answer),answers);assert.deepEqual(Array.from(data.listeningTargets,item=>[item.start,item.end]),timings);assert(data.listeningTargets.every(item=>Number.isFinite(item.start)&&Number.isFinite(item.end)&&item.start<item.end));
assert.deepEqual(Array.from(data.sourcePrompts,item=>item.number),["①","②","③","④"]);assert(data.sourcePrompts.every(item=>item.answer));
assert.equal(data.expressionExercises.length,2);assert.deepEqual(Array.from(data.expressionExercises,group=>group.items.length),[3,3]);assert(data.expressionExercises.every(group=>group.items.every(item=>item.answer)));
assert.deepEqual(Array.from(data.textbookActivities,item=>item.section),["1. やってみよう","4. 言ってみよう","5. 練習しよう","6. チャレンジしよう"]);
assert.equal(data.textbookActivities[2].groups.flatMap(group=>group.tasks).length,6);assert(data.textbookActivities[2].groups.flatMap(group=>group.tasks).every(task=>task.modelLabel==="課本解答例"));
const html=await readFile(resolve(root,"chapter-17-textbook.html"),"utf8");assert.doesNotMatch(html,/Beta|待音訊核實|仍待官方音訊核實|未核實內容/);assert.match(html,/九個聆聽答案與重播片段均已核實/);

const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=createServer(async(request,response)=>{try{const path=resolve(root,`.${decodeURIComponent(new URL(request.url,"http://localhost").pathname)}`);if(!path.startsWith(`${root}${sep}`))return response.writeHead(403).end();response.setHeader("Content-Type",types[extname(path)]||"application/octet-stream");response.end(await readFile(path));}catch{response.writeHead(404).end();}});
await new Promise(done=>server.listen(0,"127.0.0.1",done));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.JPY5_BROWSER_CHANNEL?{channel:process.env.JPY5_BROWSER_CHANNEL}:{})});
const context=await browser.newContext({serviceWorkers:"block"});
await context.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){this.dataset.playCount=String(Number(this.dataset.playCount||0)+1);this.dispatchEvent(new Event("play"));return Promise.resolve()};HTMLMediaElement.prototype.pause=function(){this.dataset.pauseCount=String(Number(this.dataset.pauseCount||0)+1)}});
const page=await context.newPage(),errors=[];page.on("pageerror",error=>errors.push(error.message));
try{
  for(const viewport of [{width:1280,height:900},{width:810,height:1080},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.goto(`${base}/chapter-17-textbook.html`);await page.evaluate(()=>localStorage.clear());await page.reload();
    assert.equal(await page.locator('[data-mode="dialogue"]').evaluate(button=>button.classList.contains("active")),true,"complete conversation is not the default");
    assert.deepEqual(await page.locator(".mode-tabs [data-mode]").evaluateAll(nodes=>nodes.map(node=>node.dataset.mode)),["dialogue","comprehension","activities","focus","blanks","guide"]);
    assert.equal(await page.locator(".dialogue-row").count(),29);assert.equal(await page.locator("[data-answer-span]").count(),9);assert.equal(await page.locator('.dialogue-row [data-listen-target]').count(),9);assert.equal(await page.locator('.dialogue-row>p [data-listen-target]').count(),0,"replay button must not be inside dialogue text");assert.equal(await page.locator('.dialogue-row>button.listen-button[data-listen-target]').count(),9,"replay controls must use the established row-level action pattern");
    assert.deepEqual(await page.locator("[data-answer-span]").evaluateAll(nodes=>nodes.map(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.textContent})),answers,"a highlighted span is wider or narrower than its official answer");
    await page.locator('[data-listen-target="1"]').first().click();assert(Math.abs(await page.locator("#lesson-audio").evaluate(audio=>audio.currentTime)-12.30)<.05);
    await page.locator('[data-listen-target="2"]').first().click();await page.locator("#lesson-audio").evaluate(audio=>{Object.defineProperty(audio,"currentTime",{configurable:true,writable:true,value:13.7});audio.dispatchEvent(new Event("timeupdate"))});assert.equal(await page.locator("#lesson-audio").getAttribute("data-pause-count"),null,"stale replay stopped a newer target");
    await page.locator("#lesson-audio").evaluate(audio=>{audio.currentTime=19.61;audio.dispatchEvent(new Event("timeupdate"))});assert.equal(await page.locator("#lesson-audio").getAttribute("data-pause-count"),"1");assert.equal(await page.locator("#lesson-audio").getAttribute("src"),data.audio);

    await page.locator('[data-mode="comprehension"]').click();assert.equal(await page.locator(".textbook-answer-card").count(),10);assert.equal(await page.locator(".reference-answer:not([hidden])").count(),0);
    const note=`鬼のお面 ${viewport.width}`;await page.locator('[data-prompt-note="listen-1"]').fill(note);await page.locator('[data-answer-toggle="listen-1"]').click();assert.equal(await page.locator('[data-prompt-note="listen-1"]').inputValue(),note);assert.match(await page.locator('[data-answer-panel="listen-1"]').evaluate(panel=>{const copy=panel.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.textContent}),/節分の鬼のお面/);
    const expression=`丁寧 ${viewport.width}`;await page.locator('[data-expression-note="0-0"]').fill(expression);

    await page.locator('[data-mode="activities"]').click();assert.deepEqual(await page.locator(".textbook-activity-card>header h2").evaluateAll(nodes=>nodes.map(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.textContent})),["1. やってみよう","4. 言ってみよう","5. 練習しよう","6. チャレンジしよう"]);assert.equal(await page.locator(".textbook-task-card").count(),11);assert.equal(await page.locator(".reference-answer:not([hidden])").count(),0);assert.equal(await page.locator(".ch17-picture-note").count(),2);
    const activityDraft=`話し方 ${viewport.width}`;await page.locator('[data-activity-draft="activity-1-1"]').fill(activityDraft);await page.locator("#furigana-toggle").click();assert.equal(await page.locator('[data-activity-draft="activity-1-1"]').inputValue(),activityDraft);assert.equal(await page.locator(".textbook-activity-card ruby").count(),0);await page.locator("#furigana-toggle").click();assert(await page.locator(".textbook-activity-card ruby").count()>0);

    await page.locator('[data-mode="blanks"]').click();assert.equal(await page.locator("[data-blank-draft]").count(),9);assert.equal(await page.locator(".reference-answer:not([hidden])").count(),0);const blank=`ごぶさたしています`;await page.locator('[data-blank-draft="1"]').fill(blank);await page.locator('[data-check-blank="1"]').click();assert.match(await page.locator('[data-blank-feedback="1"]').innerText(),/一致/);await page.locator('[data-answer-toggle="blank-1"]').click();assert.equal(await page.locator('[data-blank-draft="1"]').inputValue(),blank);
    await page.locator('[data-mode="dialogue"]').click();await page.locator('[data-mode="comprehension"]').click();assert.equal(await page.locator('[data-prompt-note="listen-1"]').inputValue(),note);assert.equal(await page.locator('[data-expression-note="0-0"]').inputValue(),expression);await page.reload();assert.equal(await page.locator('[data-prompt-note="listen-1"]').inputValue(),note);assert.equal(await page.locator('[data-expression-note="0-0"]').inputValue(),expression);await page.locator('[data-mode="activities"]').click();assert.equal(await page.locator('[data-activity-draft="activity-1-1"]').inputValue(),activityDraft);await page.locator('[data-mode="blanks"]').click();assert.equal(await page.locator('[data-blank-draft="1"]').inputValue(),blank);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`horizontal overflow at ${viewport.width}px`);
  }

  await page.goto(`${base}/chapter-17-textbook.html`);await page.evaluate(()=>localStorage.setItem("jpy5.chapter17.conversation",JSON.stringify({mode:"prompts",furigana:false,drafts:{2:"舊空欄"},promptNotes:{"listen-2":"舊內容筆記"},expressionNotes:{"0-1":"舊表現筆記"},listenCount:7})));await page.reload();
  const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem("jpy5.chapter17.conversation")));assert.equal(migrated.stateVersion,2);assert.equal(migrated.mode,"comprehension");assert.equal(migrated.drafts[2],"舊空欄");assert.equal(migrated.promptNotes["listen-2"],"舊內容筆記");assert.equal(migrated.expressionNotes["0-1"],"舊表現筆記");assert(migrated.listenCount>=7);
  assert.deepEqual(errors,[],errors.join("\n"));console.log("Lesson 17 listening checks passed: audited dialogue, nine verified replay targets, safe replay cancellation, official textbook answers/activities, state migration, furigana, saved drafts, and responsive layouts.");
}finally{await browser.close();await new Promise(done=>server.close(done));}
