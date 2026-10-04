#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import vm from "node:vm";

const { chromium } = createRequire(import.meta.url)("playwright");
const root=process.cwd(), contextData={window:{}};
vm.runInNewContext(await readFile(resolve(root,"assets/ch16-reading-data.js"),"utf8"),contextData);
const data=contextData.window.JPY5_READING;
assert.equal(data.questions.length,9,"the custom mock exam must retain nine questions");
assert.deepEqual(Array.from(data.questions,q=>q.id),Array.from({length:9},(_,index)=>`q${index+1}`));
assert.deepEqual(Array.from(data.questions,q=>q.answer),[2,1,2,1,1,1,1,2,0]);
assert.deepEqual(Array.from(data.textbookActivities.sections,section=>section.number),[1,3,4,5]);
const confirm=data.textbookActivities.sections.find(section=>section.number===3);
assert.deepEqual(Array.from(confirm.questions,item=>item.answer),[
  "氏名、カード番号、暗証番号、預金口座番号、住所、電話番号、性別、職業、生年月日の9項目",
  "まだはっきり分からない","会員に、知らない会社から請求書が送られてきた","会員カードの更新など"
]);
assert.deepEqual(Array.from(confirm.completion,item=>Array.from(item.answers)),[
  ["警察など"],["管理"],["身に覚えのない会社から未払い金の請求書が送られてきた"],["インターネット","銀行","既に口座は閉じられていた"]
]);

const html=await readFile(resolve(root,"chapter-16-reading.html"),"utf8");
assert.match(html,/課本 1・3・4・5 活動/);
assert.match(html,/9 題模擬考試/);
assert.match(html,/第16課『読む・書く』/);

const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=createServer(async(request,response)=>{try{const path=resolve(root,`.${decodeURIComponent(new URL(request.url,"http://localhost").pathname)}`);if(!path.startsWith(`${root}${sep}`))return response.writeHead(403).end();response.setHeader("Content-Type",types[extname(path)]||"application/octet-stream");response.end(await readFile(path));}catch{response.writeHead(404).end();}});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.JPY5_BROWSER_CHANNEL?{channel:process.env.JPY5_BROWSER_CHANNEL}:{})});
const browserContext=await browser.newContext({serviceWorkers:"block"}),page=await browserContext.newPage(),errors=[];
page.on("pageerror",error=>errors.push(error.message));

try{
  for(const [index,viewport] of [{width:1280,height:900},{width:810,height:1080},{width:390,height:844}].entries()){
    await page.setViewportSize(viewport);
    await page.goto(`${base}/chapter-16-reading.html`);
    if(index===0){
      assert.equal(await page.locator('[data-reading-mode="original"]').evaluate(button=>button.classList.contains("active")),true,"original reading is not the default");
      assert.equal(await page.locator("[data-paragraph]").count(),5);
    }
    await page.locator('[data-reading-mode="questions"]').click();
    assert.equal(await page.locator(".ch14-textbook-section").count(),4);
    assert.deepEqual(await page.locator(".ch14-textbook-section>header h2").evaluateAll(nodes=>nodes.map(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.textContent.replace(/\s+/g," ").trim()})),["1. 考えてみよう","3. 確かめよう","4. 考えよう・話そう","5. チャレンジしよう"]);
    assert.equal(await page.locator("[data-q]").count(),0,"custom mock questions leaked into textbook mode");
    assert.equal(await page.locator("[data-textbook-draft]").count(),22);
    assert.equal(await page.locator(".ch14-official-answer:not([hidden])").count(),0);
    assert.equal(await page.locator(".ch14-model-answer:not([hidden])").count(),0);
    await page.locator('[data-official-toggle="confirm-1"]').click();
    const firstOfficial=await page.locator('[data-official-answer="confirm-1"]').evaluate(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.innerText});
    assert.match(firstOfficial,/氏名、カード番号、暗証番号/);
    assert.equal(await page.locator('[data-textbook-draft="confirm-1"]').inputValue(),"","official reveal auto-filled a learner answer");
    await page.locator("[data-completion-reveal]").click();
    const completionText=await page.locator("[data-completion-answer]").evaluate(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.innerText});
    assert.match(completionText,/1 警察など/);
    assert.match(completionText,/4 インターネット ／ 銀行 ／ 既に口座は閉じられていた/);

    const draft=`カードの管理に気をつけます。${viewport.width}`;
    await page.locator('[data-textbook-draft="think-1"]').fill(draft);
    await page.locator('[data-textbook-draft="challenge-headline"]').fill(`学校ニュース ${viewport.width}`);
    if((await page.locator("#furigana-toggle").innerText()).includes("OFF"))await page.locator("#furigana-toggle").click();
    assert(await page.locator(".ch14-textbook-section ruby").count()>0,"furigana should appear on new material");
    await page.locator("#furigana-toggle").click();
    assert.equal(await page.locator(".ch14-textbook-section ruby").count(),0,"furigana OFF did not rerender new material");
    assert.equal(await page.locator('[data-textbook-draft="think-1"]').inputValue(),draft);
    await page.locator('[data-reading-mode="original"]').click();
    await page.locator('[data-reading-mode="questions"]').click();
    assert.equal(await page.locator('[data-textbook-draft="think-1"]').inputValue(),draft,"draft did not survive mode switch");
    await page.reload();
    assert.equal(await page.locator('[data-textbook-draft="think-1"]').inputValue(),draft,"draft did not survive reload");
    assert.equal(await page.locator('[data-textbook-draft="challenge-headline"]').inputValue(),`学校ニュース ${viewport.width}`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`horizontal overflow at ${viewport.width}px`);
  }

  await page.goto(`${base}/chapter-16-reading.html`);
  await page.locator('[data-reading-mode="exam"]').click();
  assert.equal(await page.locator(".exam-list article").count(),9);
  assert.deepEqual(await page.locator(".exam-list input").evaluateAll(inputs=>[...new Set(inputs.map(input=>input.name))]),Array.from({length:9},(_,index)=>`q${index+1}`));
  for(const [index,q] of data.questions.entries())await page.locator(`input[name="${q.id}"][value="${index===0?(q.answer+1)%q.options.length:q.answer}"]`).check();
  await page.locator("#submit-reading-exam").click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("jpy5.chapter16.reading")));
  assert.equal(saved.attempts.at(-1).score,8);
  assert(saved.wrong.includes("q1"));
  await page.locator('[data-reading-mode="mistakes"]').click();
  assert.equal(await page.locator('[data-clear-wrong="q1"]').count(),1,"exam mistake did not reach review");
  assert.deepEqual(errors,[],errors.join("\n"));
  console.log("Lesson 16 reading checks passed: exact textbook activities, hidden answers, saved drafts, furigana, preserved exam scoring, and responsive layouts.");
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
