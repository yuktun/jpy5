#!/usr/bin/env node
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname,resolve,sep} from "node:path";
import vm from "node:vm";

const {chromium}=createRequire(import.meta.url)("playwright");
const root=process.cwd(),contextData={window:{}};
for(const file of ["assets/ch17-reading-data.js","assets/ch17-reading-audit.js","assets/ch17-reading-textbook-data.js"]){
  vm.runInNewContext(await readFile(resolve(root,file),"utf8"),contextData,{filename:file});
}
const data=contextData.window.JPY5_READING;
assert.equal(data.questions.length,13,"the custom mock exam must retain 13 questions");
assert.deepEqual(Array.from(data.questions,q=>q.id),Array.from({length:13},(_,index)=>`q${index+1}`));
assert.equal(createHash("sha256").update(JSON.stringify(data.questions)).digest("hex"),"dbc620868b6dfe7d4c4dbc9a1e7503b90ae0893cdce60fe0356b20961b2bf78d","the existing q1-q13 bank changed");
assert.deepEqual(Array.from(data.textbookActivities.sections,section=>section.number),[1,3,4,5]);
const confirm=data.textbookActivities.sections.find(section=>section.number===3);
assert.deepEqual(Array.from(confirm.calendarTable.answers),["太陰太陽暦","明治6年（1873年）","中国","1月、2月、3月","長月","立春前後"]);
assert.match(confirm.calendarTable.answerNote,/出版社正誤表.*明治6年（1873年）.*明治5年（1872年）/);
assert.deepEqual(Array.from(confirm.reasons.answers),["気持ちや考え","西洋先進国","外交","閏年の調整の問題","財政的","人件費","12月","2か月"]);

const html=await readFile(resolve(root,"chapter-17-reading.html"),"utf8");
assert.match(html,/課本 1・3・4・5 活動/);
assert.match(html,/13 題模擬考試/);
assert.match(html,/參照課本解答冊及出版社正誤表/);
assert.match(html,/13題模擬考試為應用程式學習輔助，並非課本印刷問題/);

const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=createServer(async(request,response)=>{try{const path=resolve(root,`.${decodeURIComponent(new URL(request.url,"http://localhost").pathname)}`);if(!path.startsWith(`${root}${sep}`))return response.writeHead(403).end();response.setHeader("Content-Type",types[extname(path)]||"application/octet-stream");response.end(await readFile(path));}catch{response.writeHead(404).end();}});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.JPY5_BROWSER_CHANNEL?{channel:process.env.JPY5_BROWSER_CHANNEL}:{})});
const browserContext=await browser.newContext({serviceWorkers:"block"}),page=await browserContext.newPage(),errors=[];
page.on("pageerror",error=>errors.push(error.message));

try{
  for(const viewport of [{width:1280,height:900},{width:810,height:1080},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    await page.goto(`${base}/chapter-17-reading.html`);
    await page.evaluate(()=>localStorage.clear());
    await page.reload();
    assert.equal(await page.locator('[data-reading-mode="original"]').evaluate(button=>button.classList.contains("active")),true,"original reading is not the default");
    assert.equal(await page.locator("[data-paragraph]").count(),6);
    await page.locator('[data-reading-mode="questions"]').click();
    assert.equal(await page.locator(".ch14-textbook-section").count(),4);
    assert.deepEqual(await page.locator(".ch14-textbook-section>header h2").evaluateAll(nodes=>nodes.map(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.textContent.replace(/\s+/g," ").trim()})),["1. 考えてみよう","3. 確かめよう","4. 考えよう・話そう","5. チャレンジしよう"]);
    assert.equal(await page.locator("[data-q]").count(),0,"custom mock questions leaked into textbook mode");
    assert.equal(await page.locator(".ch14-official-answer:not([hidden])").count(),0);
    assert.equal(await page.locator(".ch14-model-answer:not([hidden])").count(),0);
    assert.equal(await page.locator('[data-textbook-draft="think-calendar"]').count(),1,"1. 考えてみよう is missing");
    await page.locator('[data-textbook-draft="confirm-1"]').fill("自分の答え");
    await page.locator('[data-official-toggle="confirm-1"]').click();
    const firstAnswer=await page.locator('[data-official-answer="confirm-1"]').evaluate(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.innerText});
    assert.match(firstAnswer,/古代ローマの暦は1年が10か月/);
    assert.equal(await page.locator('[data-textbook-draft="confirm-1"]').inputValue(),"自分の答え","answer reveal overwrote learner input");
    await page.locator('[data-official-toggle="calendar-table"]').click();
    const tableAnswers=await page.locator('[data-official-answer="calendar-table"]').evaluate(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.innerText});
    assert.match(tableAnswers,/明治6年（1873年）/);
    assert.match(tableAnswers,/出版社正誤表/);
    assert.doesNotMatch(tableAnswers,/^2 明治5年（1872年）$/m);
    const draft=`私の地域の暦について調べます。${viewport.width}`;
    await page.locator('[data-textbook-draft="think-calendar"]').fill(draft);
    if((await page.locator("#furigana-toggle").innerText()).includes("OFF"))await page.locator("#furigana-toggle").click();
    assert(await page.locator(".ch14-textbook-section ruby").count()>0,"furigana should appear on new textbook content");
    await page.locator("#furigana-toggle").click();
    assert.equal(await page.locator(".ch14-textbook-section ruby").count(),0,"furigana OFF did not rerender textbook content");
    assert.equal(await page.locator('[data-textbook-draft="think-calendar"]').inputValue(),draft,"draft did not survive furigana rerender");
    await page.locator('[data-reading-mode="original"]').click();
    await page.locator('[data-reading-mode="questions"]').click();
    assert.equal(await page.locator('[data-textbook-draft="think-calendar"]').inputValue(),draft,"draft did not survive mode switch");
    await page.reload();
    assert.equal(await page.locator('[data-textbook-draft="think-calendar"]').inputValue(),draft,"draft did not survive reload");
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`horizontal overflow at ${viewport.width}px`);
  }

  await page.goto(`${base}/chapter-17-reading.html`);
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await page.locator('[data-reading-mode="find"]').click();
  assert.equal(await page.locator("[data-find]").count(),6,"find mode changed");
  await page.locator('[data-find="2"]').click();
  assert.equal(await page.locator(".find-feedback").innerText(),"搵啱了，呢段包含完整答案。");
  await page.locator('[data-reading-mode="vocab"]').click();
  assert.equal(await page.locator("#reading-vocab-card").count(),1,"vocab mode changed");

  await page.locator('[data-reading-mode="exam"]').click();
  assert.equal(await page.locator(".exam-list article").count(),13);
  assert.deepEqual(await page.locator(".exam-list input").evaluateAll(inputs=>[...new Set(inputs.map(input=>input.name))]),Array.from({length:13},(_,index)=>`q${index+1}`));
  for(const [index,q] of data.questions.entries())await page.locator(`input[name="${q.id}"][value="${index===0?(q.answer+1)%q.options.length:q.answer}"]`).check();
  await page.locator("#submit-reading-exam").click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("jpy5.chapter17.reading")));
  assert.equal(saved.attempts.at(-1).score,12);
  assert(saved.wrong.includes("q1"));
  await page.locator('[data-reading-mode="mistakes"]').click();
  assert.equal(await page.locator('[data-clear-wrong="q1"]').count(),1,"exam mistake did not reach review");
  assert.deepEqual(errors,[],errors.join("\n"));
  console.log("Lesson 17 reading checks passed: exact textbook order and answers, errata, hidden reveals, saved drafts, furigana, responsive layouts, and preserved q1-q13 exam.");
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
