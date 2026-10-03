#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import vm from "node:vm";

const { chromium } = createRequire(import.meta.url)("playwright");
const root=process.cwd(), contextData={window:{}};
vm.runInNewContext(await readFile(resolve(root,"assets/ch15-reading-data.js"),"utf8"),contextData);
const data=contextData.window.JPY5_READING;
assert.equal(data.questions.length,7,"the custom mock exam must retain seven questions");
assert.deepEqual(Array.from(data.questions,q=>q.id),Array.from({length:7},(_,index)=>`q${index+1}`));
assert.deepEqual(Array.from(data.questions,q=>q.answer),[0,0,1,1,1,1,0]);
assert.deepEqual(Array.from(data.textbookActivities.sections,section=>section.number),[1,3,4,5]);
const confirm=data.textbookActivities.sections.find(section=>section.number===3);
assert.deepEqual(Array.from(confirm.truth,item=>item.answer),[false,true,true,false]);
assert.deepEqual(Array.from(confirm.completion,item=>Array.from(item.answers)),[
  ["エサを担いでいるわけではないらしい"],
  ["よく働くアリ","20"],
  ["なぜかまた働かないアリが出てくる"],
  ["魅力","脇役たち","その組織"]
]);
assert.deepEqual(Array.from(confirm.table.rows,row=>row.answer),["助さん、格さん","ネビル・ロングボトム"]);

const html=await readFile(resolve(root,"chapter-15-reading.html"),"utf8");
assert.match(html,/課本『1・3・4・5』活動/);
assert.match(html,/7 題模擬考試/);
assert.match(html,/本頁內容依據第15課『読む・書く』課本整理/);

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
    await page.goto(`${base}/chapter-15-reading.html`);
    await page.locator('[data-reading-mode="questions"]').click();
    assert.equal(await page.locator(".ch14-textbook-section").count(),4);
    assert.deepEqual(await page.locator(".ch14-textbook-section>header h2").evaluateAll(nodes=>nodes.map(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.textContent.replace(/\s+/g," ").trim()})),["1. 考えてみよう","3. 確かめよう","4. 考えよう・話そう","5. チャレンジしよう"]);
    assert.equal(await page.locator("[data-q]").count(),0,"custom mock questions leaked into textbook mode");
    assert.equal(await page.locator(".ch14-model-answer:not([hidden])").count(),0);
    assert.equal(await page.locator(".ch14-official-answer:not([hidden])").count(),0);
    assert.equal(await page.locator("[data-truth]").count(),8);
    assert.equal(await page.locator("[data-textbook-draft]").count(),15);
    await page.locator('[data-truth="truth-1"][data-value="false"]').click();
    assert.equal(await page.locator("[data-truth-official]").isHidden(),true);
    await page.locator("[data-truth-reveal]").click();
    assert.match(await page.locator("[data-truth-official]").innerText(),/1 ×　2 ○　3 ○　4 ×/);
    await page.locator("[data-confirm-reveal]").click();
    const completionText=await page.locator("[data-confirm-answer]").evaluate(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.innerText});
    assert.match(completionText,/エサを担いでいるわけではないらしい/);
    await page.locator("[data-table-reveal]").click();
    const tableText=await page.locator("[data-table-answer]").evaluate(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.innerText});
    assert.match(tableText,/① 助さん、格さん/);
    assert.match(tableText,/② ネビル・ロングボトム/);

    const draft=`組織について考えます。${viewport.width}`;
    await page.locator('[data-textbook-draft="think-1"]').fill(draft);
    const writing="アリと人間の社会には共通点があります。";
    await page.locator('[data-textbook-draft="challenge-writing"]').fill(writing);
    assert.equal(await page.locator('[data-char-count="challenge-writing"]').innerText(),String([...writing].length));
    if((await page.locator("#furigana-toggle").innerText()).includes("OFF"))await page.locator("#furigana-toggle").click();
    assert(await page.locator(".ch14-textbook-section ruby").count()>0,"furigana should appear on new material");
    await page.locator("#furigana-toggle").click();
    assert.equal(await page.locator(".ch14-textbook-section ruby").count(),0,"furigana OFF did not rerender new material");
    assert.equal(await page.locator('[data-textbook-draft="think-1"]').inputValue(),draft,"draft did not survive furigana rerender");
    await page.locator('[data-reading-mode="original"]').click();
    await page.locator('[data-reading-mode="questions"]').click();
    assert.equal(await page.locator('[data-textbook-draft="think-1"]').inputValue(),draft,"draft did not survive tab switch");
    await page.reload();
    assert.equal(await page.locator('[data-textbook-draft="think-1"]').inputValue(),draft,"draft did not survive reload");
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`horizontal overflow at ${viewport.width}px`);
  }

  await page.goto(`${base}/chapter-15-reading.html`);
  await page.locator('[data-reading-mode="exam"]').click();
  assert.equal(await page.locator(".exam-list article").count(),7);
  assert.deepEqual(await page.locator(".exam-list input").evaluateAll(inputs=>[...new Set(inputs.map(input=>input.name))]),Array.from({length:7},(_,index)=>`q${index+1}`));
  for(const [index,q] of data.questions.entries())await page.locator(`input[name="${q.id}"][value="${index===0?(q.answer+1)%q.options.length:q.answer}"]`).check();
  await page.locator("#submit-reading-exam").click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("jpy5.chapter15.reading")));
  assert.equal(saved.attempts.at(-1).score,6);
  assert(saved.wrong.includes("q1"));
  await page.locator('[data-reading-mode="mistakes"]').click();
  assert.equal(await page.locator('[data-clear-wrong="q1"]').count(),1,"exam mistake did not reach review");
  assert.deepEqual(errors,[],errors.join("\n"));
  console.log("Lesson 15 reading checks passed: ordered textbook activities, hidden answers, saved drafts, furigana, preserved exam scoring, and responsive layouts.");
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
