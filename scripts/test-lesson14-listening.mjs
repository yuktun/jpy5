#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import vm from "node:vm";

const { chromium } = createRequire(import.meta.url)("playwright");
const root=process.cwd(), contextData={window:{}};
vm.runInNewContext(await readFile(resolve(root,"assets/ch14-conversation-data.js"),"utf8"),contextData);
const data=contextData.window.JPY5_CONVERSATION;
assert.equal(data.items.length,8);
assert.deepEqual(Array.from(data.items,item=>item.id),[1,2,3,4,5,6,7,8]);
assert.deepEqual(Array.from(data.items,item=>item.jp),["主人公は／っていう少年","宇宙の旅に出るっていう話","犠牲になったってわけ","恐ろしい話だね","例えば、どんな？","かわいそう、それで","やがて","で、どうなるの、結局"]);
assert(data.items.every(item=>Number.isFinite(item.start)&&Number.isFinite(item.end)&&item.end>item.start));
assert.equal(data.comprehension.length,6,"the six existing app questions changed");
assert.deepEqual(Array.from(data.comprehension,item=>item.id),["c1","c2","c3","c4","c5","c6"]);
assert.equal(data.textbookQuestions.length,7);
assert.deepEqual(Array.from(data.textbookQuestions,item=>item.answer),[
  "何気なくテレビをつけたときに放映していて、それを見たこと",
  "アンドロメダへ死なない体をもらいに行った",
  "「血の通った体になりたい」",
  "本当に幸せなのかどうか、疑問に思うようになった",
  "主人公は星野鉄郎っていう少年。彼が謎の美女メーテルと宇宙の旅に出るっていう話。",
  "それで。",
  "で、どうなるの、結局。"
]);
assert.deepEqual([...new Set(Array.from(data.textbookActivities,item=>item.section))],["1. やってみよう","5. 練習しよう","6. チャレンジしよう"]);

const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=createServer(async(request,response)=>{try{const path=resolve(root,`.${decodeURIComponent(new URL(request.url,"http://localhost").pathname)}`);if(!path.startsWith(`${root}${sep}`))return response.writeHead(403).end();response.setHeader("Content-Type",types[extname(path)]||"application/octet-stream");response.end(await readFile(path));}catch{response.writeHead(404).end();}});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.JPY5_BROWSER_CHANNEL?{channel:process.env.JPY5_BROWSER_CHANNEL}:{})});
const browserContext=await browser.newContext({serviceWorkers:"block"});
await browserContext.addInitScript(()=>{
  HTMLMediaElement.prototype.play=function(){this.dataset.played="true";return Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(){this.dataset.paused="true";};
});
const page=await browserContext.newPage(),errors=[];
page.on("pageerror",error=>errors.push(error.message));

try{
  for(const [index,viewport] of [{width:1280,height:900},{width:810,height:1080},{width:390,height:844}].entries()){
    await page.setViewportSize(viewport);
    await page.goto(`${base}/chapter-14-textbook.html`);
    if(index===0)assert.equal(await page.locator('[data-mode="dialogue"]').evaluate(button=>button.classList.contains("active")),true,"complete dialogue is not the default");
    else await page.locator('[data-mode="dialogue"]').click();
    assert.equal(await page.locator(".dialogue-row").count(),22);
    assert.equal(await page.locator(".focus-line").count(),9,"item 1 intentionally has two highlighted answer segments");
    assert.equal(await page.locator(".focus-fixed").first().evaluate(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.textContent;}),"星野鉄郎");
    assert.equal(await page.locator("button.focus-fixed").count(),0,"fixed textbook text became an answer button");
    assert.equal(await page.locator('.dialogue-row [data-listen]').count(),8);
    await page.locator('[data-listen="1"]').click();
    assert(Math.abs((await page.locator("#lesson-audio").evaluate(audio=>audio.currentTime))-data.items[0].start)<.05);
    await page.locator(".focus-line").first().click();
    assert.equal(await page.locator("[data-dialog-listen]").isVisible(),true);
    await page.locator("[data-dialog-close]").first().click();

    await page.locator('[data-mode="comprehension"]').click();
    assert.equal(await page.locator("[data-comprehension]").count(),6);
    assert.equal(await page.locator(".textbook-answer-card").count(),7);
    assert.equal(await page.locator(".reference-answer:not([hidden])").count(),0);
    const draft=`留学のきっかけ ${viewport.width}`;
    await page.locator('[data-draft="tb-c1"]').fill(draft);
    await page.locator('[data-reference-toggle="tb-c1"]').click();
    assert.match(await page.locator('[data-reference="tb-c1"] b').innerText(),/官方答案 \/ 課本解答/);

    await page.locator('[data-mode="activities"]').click();
    assert.deepEqual(await page.locator(".textbook-activity-card>header h2").allTextContents(),["1. やってみよう","5. 練習しよう","6. チャレンジしよう"]);
    assert.equal(await page.locator(".textbook-task-card").count(),7);
    assert.equal(await page.locator(".reference-answer:not([hidden])").count(),0);
    assert.equal(await page.locator('[data-reference-toggle="practice-1-1"]').innerText(),"參考回答例を見る");
    await page.locator('[data-reference-toggle="practice-1-1"]').click();
    assert.equal(await page.locator('[data-reference="practice-1-1"] b').innerText(),"課本解答例");
    await page.locator('[data-draft="activity-1"]').fill(`昔話 ${viewport.width}`);
    await page.locator("#furigana-toggle").click();
    assert.equal(await page.locator('[data-draft="activity-1"]').inputValue(),`昔話 ${viewport.width}`);

    if(index===0){
      await page.locator('[data-mode="focus"]').click(); assert.equal(await page.locator(".focus-card").count(),8);
      await page.locator('[data-mode="cards"]').click(); assert.equal(await page.locator("#conversation-card").count(),1);
      await page.locator('[data-mode="choice"]').click(); assert.equal(await page.locator(".conversation-options button").count(),4);
      await page.locator('[data-mode="order"]').click(); assert((await page.locator(".word-bank button").count())>0);
      await page.locator('[data-mode="dictation"]').click(); assert.equal(await page.locator("#dictation-answer").count(),1);
      await page.locator('[data-mode="mistakes"]').click(); assert.equal(await page.locator(".stage-heading").count(),1);
    }

    await page.locator('[data-mode="cloze"]').click();
    assert.match(await page.locator(".stage-heading .kicker").innerText(),/課本 3\. もう一度聞こう/);
    assert.equal(await page.locator("[data-cloze]").count(),9);
    assert.equal(await page.locator("#cloze-official-answers").isHidden(),true);
    await page.locator("#reveal-cloze").click();
    assert.equal(await page.locator("#cloze-official-answers").isVisible(),true);
    for(const item of data.items){
      const answers=(item.segments||[{type:"answer",text:item.jp}]).filter(part=>part.type==="answer");
      const inputs=page.locator(`[data-cloze="${item.id}"]`);
      for(let answerIndex=0;answerIndex<answers.length;answerIndex++)await inputs.nth(answerIndex).fill(answers[answerIndex].text);
    }
    await page.locator("#check-cloze").click();
    assert.equal(await page.locator(".cloze-blank input.correct").count(),9,"existing cloze scoring changed");
    assert.match(await page.locator(".answer-message").innerText(),/八項全部正確/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`horizontal overflow at ${viewport.width}px`);

    await page.locator('[data-mode="comprehension"]').click();
    assert.equal(await page.locator('[data-draft="tb-c1"]').inputValue(),draft);
  }
  await page.reload();
  assert.deepEqual(errors,[],errors.join("\n"));
  console.log("Lesson 14 listening checks passed: source answers, verified replay ranges, hidden references, saved drafts, furigana, and desktop/iPad/mobile layouts.");
} finally {
  await browser.close();
  await new Promise(done=>server.close(done));
}
