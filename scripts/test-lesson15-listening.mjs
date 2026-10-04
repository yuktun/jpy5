#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import vm from "node:vm";

const { chromium } = createRequire(import.meta.url)("playwright");
const root=process.cwd(), contextData={window:{}};
vm.runInNewContext(await readFile(resolve(root,"assets/ch15-conversation-data.js"),"utf8"),contextData);
const data=contextData.window.JPY5_CONVERSATION;
assert.equal(data.items.length,8);
assert.deepEqual(Array.from(data.items,item=>item.id),[1,2,3,4,5,6,7,8]);
assert.deepEqual(Array.from(data.items,item=>item.jp),[
  "お名前は中村から伺っております","老舗といえるほどのものじゃありません","右に出る人はいない","そんな大したものではありません",
  "いえ、それほどでも","自分で言うのもなんですが","お言葉に甘えて","話の途中ですが、ちょっと失礼いたします"
]);
assert.deepEqual(Array.from(data.items,item=>[item.start,item.end]),[[31.00,33.44],[48.82,50.92],[68.76,69.94],[71.70,74.14],[116.34,118.30],[119.36,121.02],[141.40,142.98],[149.30,152.54]]);
assert.equal(data.comprehension.length,6,"the six existing app questions changed");
assert.deepEqual(Array.from(data.comprehension,item=>item.id),["c1","c2","c3","c4","c5","c6"]);
assert.equal(data.textbookQuestions.length,8);
assert.deepEqual(Array.from(data.textbookQuestions,item=>item.answer),[
  "「オスマン絨毯」というトルコの老舗の織物会社","絨毯に関する知識が豊富で、優秀な営業マン","太鼓の演奏","いえ、老舗といえるほどのものじゃありません。",
  "イスタンブール本社きっての営業マンでいらっしゃるんですよ。何しろ絨毯に関する知識ではイルワンさんの右に出る人はいないということですから。",
  "いやいや、そんな大したものではありません。来日して3か月になりますが、なかなか思うような成果はあげられていません。","地元の人、顔負けなんですって。","自分で言うのもなんですが、"
]);
assert.deepEqual([...new Set(Array.from(data.textbookActivities,item=>item.section))],["1. やってみよう","4. 言ってみよう","5. 練習しよう","6. チャレンジしよう"]);
assert(data.dialogue.some(row=>row[0]==="ミラー"&&row[2]===7),"conversation-script speaker correction is missing");

const html=await readFile(resolve(root,"chapter-15-textbook.html"),"utf8");
assert.match(html,/🎧 話す・聞く/);
assert.match(html,/自訂理解練習為應用程式學習輔助/);

const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=createServer(async(request,response)=>{try{const path=resolve(root,`.${decodeURIComponent(new URL(request.url,"http://localhost").pathname)}`);if(!path.startsWith(`${root}${sep}`))return response.writeHead(403).end();response.setHeader("Content-Type",types[extname(path)]||"application/octet-stream");response.end(await readFile(path));}catch{response.writeHead(404).end();}});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.JPY5_BROWSER_CHANNEL?{channel:process.env.JPY5_BROWSER_CHANNEL}:{})});
const browserContext=await browser.newContext({serviceWorkers:"block"});
await browserContext.addInitScript(()=>{
  HTMLMediaElement.prototype.play=function(){this.dataset.playCount=String(Number(this.dataset.playCount||0)+1);return Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(){this.dataset.pauseCount=String(Number(this.dataset.pauseCount||0)+1);};
});
const page=await browserContext.newPage(),errors=[];
page.on("pageerror",error=>errors.push(error.message));

try{
  for(const [index,viewport] of [{width:1280,height:900},{width:810,height:1080},{width:390,height:844}].entries()){
    await page.setViewportSize(viewport);
    await page.goto(`${base}/chapter-15-textbook.html`);
    if(index===0){
      assert.equal(await page.locator('[data-mode="dialogue"]').evaluate(button=>button.classList.contains("active")),true,"complete dialogue is not the default");
      assert.deepEqual(await page.locator(".mode-tabs [data-mode]").evaluateAll(nodes=>nodes.map(node=>node.dataset.mode)),["dialogue","comprehension","activities","focus","cards","choice","order","cloze","dictation","mistakes"]);
    }else await page.locator('[data-mode="dialogue"]').click();
    assert.equal(await page.locator(".focus-line").count(),8);
    assert.equal(await page.locator('.dialogue-row [data-listen]').count(),8);
    await page.locator('[data-listen="1"]').click();
    assert(Math.abs((await page.locator("#lesson-audio").evaluate(audio=>audio.currentTime))-31.00)<.05);
    await page.locator('[data-listen="2"]').click();
    await page.locator("#lesson-audio").evaluate(audio=>{audio.currentTime=34;audio.dispatchEvent(new Event("timeupdate"));});
    assert.equal(await page.locator("#lesson-audio").getAttribute("data-pause-count"),null,"stale replay listener paused a newer sentence");
    await page.locator("#lesson-audio").evaluate(audio=>{audio.currentTime=51;audio.dispatchEvent(new Event("timeupdate"));});
    assert.equal(await page.locator("#lesson-audio").getAttribute("data-pause-count"),"1","active sentence did not stop at its verified end");
    await page.locator(".focus-line").first().click();
    assert.equal(await page.locator("[data-dialog-listen]").isVisible(),true);
    await page.locator("[data-dialog-close]").first().click();

    await page.locator('[data-mode="comprehension"]').click();
    assert.equal(await page.locator("[data-comprehension]").count(),6);
    assert.equal(await page.locator(".textbook-answer-card").count(),8);
    assert.equal(await page.locator(".reference-answer:not([hidden])").count(),0);
    const draft=`会社について ${viewport.width}`;
    await page.locator('[data-draft="tb-c1"]').fill(draft);
    await page.locator('[data-reference-toggle="tb-c1"]').click();
    assert.match(await page.locator('[data-reference="tb-c1"] b').innerText(),/官方答案 \/ 課本解答/);

    await page.locator('[data-mode="activities"]').click();
    assert.deepEqual(await page.locator(".textbook-activity-card>header h2").evaluateAll(nodes=>nodes.map(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.textContent})),["1. やってみよう","4. 言ってみよう","5. 練習しよう","6. チャレンジしよう"]);
    assert.equal(await page.locator(".pronunciation-number-grid article").count(),4);
    assert.equal(await page.locator(".textbook-task-card").count(),7);
    assert.equal(await page.locator(".reference-answer:not([hidden])").count(),0);
    await page.locator('[data-reference-toggle="practice-5-1-1"]').click();
    assert.equal(await page.locator('[data-reference="practice-5-1-1"] b').innerText(),"課本解答例");
    await page.locator('[data-draft="activity-1"]').fill(`お見合い ${viewport.width}`);
    await page.locator("#furigana-toggle").click();
    assert.equal(await page.locator('[data-draft="activity-1"]').inputValue(),`お見合い ${viewport.width}`);
    assert(await page.locator(".textbook-activity-card ruby").count()===0,"furigana OFF did not rerender new activities");
    await page.locator("#furigana-toggle").click();
    assert(await page.locator(".textbook-activity-card ruby").count()>0,"furigana ON did not affect new activities");

    await page.locator('[data-mode="cloze"]').click();
    assert.match(await page.locator(".stage-heading .kicker").innerText(),/課本 3\. もう一度聞こう/);
    assert.equal(await page.locator("[data-cloze]").count(),8);
    assert.equal(await page.locator("#cloze-official-answers").isHidden(),true);
    await page.locator("#reveal-cloze").click();
    assert.equal(await page.locator("#cloze-official-answers").isVisible(),true);
    assert.equal(await page.locator('[data-cloze="1"]').inputValue(),"","official reveal auto-filled a learner input");
    for(const item of data.items)await page.locator(`[data-cloze="${item.id}"]`).fill(item.jp);
    await page.locator("#check-cloze").click();
    assert.equal(await page.locator(".cloze-blank input.correct").count(),8,"existing cloze scoring changed");
    assert.match(await page.locator(".answer-message").innerText(),/全部句子正確/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`horizontal overflow at ${viewport.width}px`);

    await page.locator('[data-mode="comprehension"]').click();
    assert.equal(await page.locator('[data-draft="tb-c1"]').inputValue(),draft);
    await page.reload();
    assert.equal(await page.locator('[data-draft="tb-c1"]').inputValue(),draft);
    await page.locator('[data-mode="activities"]').click();
    assert.equal(await page.locator('[data-draft="activity-1"]').inputValue(),`お見合い ${viewport.width}`);
    if(index===0){
      await page.locator('[data-mode="focus"]').click(); assert.equal(await page.locator(".focus-card").count(),8);
      await page.locator('[data-mode="cards"]').click(); assert.equal(await page.locator("#conversation-card").count(),1);
      await page.locator('[data-mode="choice"]').click(); assert.equal(await page.locator(".conversation-options button").count(),4);
      await page.locator('[data-mode="order"]').click(); assert((await page.locator(".word-bank button").count())>0);
      await page.locator('[data-mode="dictation"]').click(); assert.equal(await page.locator("#dictation-answer").count(),1);
      await page.locator('[data-mode="mistakes"]').click(); assert.equal(await page.locator(".stage-heading").count(),1);
    }
  }
  assert.deepEqual(errors,[],errors.join("\n"));
  console.log("Lesson 15 listening checks passed: source activities, verified replay cancellation, hidden answers, saved drafts, furigana, cloze scoring, and responsive layouts.");
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
