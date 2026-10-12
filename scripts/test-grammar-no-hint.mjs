#!/usr/bin/env node
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {createServer} from "node:http";
import {mkdir,readFile} from "node:fs/promises";
import {extname,join,resolve,sep} from "node:path";
import vm from "node:vm";

const {chromium}=createRequire(import.meta.url)("playwright");
const root=process.cwd();
const expectedCounts={18:4,19:6,20:8};
const expectedCoverage={
  18:["nichigainai","tatokorode","datte","koso"],
  19:["wotaishoni","bakaridenakumo","wotooshite","nikakete","tameniwa","kesshitenai"],
  20:["nomotode","todoujini","sue","teirai","wokomete","badake","tatotanni","karatoitte"]
};
const lessonData={};

for(const lesson of [18,19,20]){
  const context={window:{}};
  vm.runInNewContext(await readFile(resolve(root,`assets/ch${lesson}-data.js`),"utf8"),context);
  vm.runInNewContext(await readFile(resolve(root,`assets/ch${lesson}-quiz-data.js`),"utf8"),context);
  const data=context.window.JPY5_DATA,bank=data.noHintQuestions;
  lessonData[lesson]=data;
  assert.equal(bank.length,expectedCounts[lesson],`Lesson ${lesson} no-hint count`);
  assert.deepEqual(Array.from(bank,question=>question.pattern),expectedCoverage[lesson],`Lesson ${lesson} contextual coverage`);
  assert.equal(new Set(bank.map(question=>question.id)).size,bank.length,`Lesson ${lesson} duplicate challenge ID`);
  for(const question of bank){
    const pattern=data.patterns.find(item=>item.id===question.pattern);
    assert(pattern,`${lesson}/${question.id} references a missing pattern`);
    assert.equal(question.source,"app_extension");
    assert.equal(question.label,"App 延伸練習");
    assert.equal(question.kind,"challenge");
    assert.equal(question.options.length,4);
    assert.equal(new Set(question.options).size,4);
    assert(Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4);
    assert.equal(question.choiceFeedback.length,4);
    assert(question.choiceFeedback.every(note=>note.length>=18),`${lesson}/${question.id} needs useful choice-specific nuance`);
    assert(question.explanation.length>=18,`${lesson}/${question.id} needs a clear explanation`);
    const bareTitle=pattern.title.replace(/[～…・／（）()\s]/g,"");
    assert(!bareTitle||!question.prompt.replace(/[～…・／（）()\s]/g,"").includes(bareTitle),`${lesson}/${question.id} leaks the target pattern in its prompt`);
  }
  const html=await readFile(resolve(root,`chapter-${lesson}-quiz.html`),"utf8");
  assert.match(html,/data-mode="challenge"/);
  assert.match(html,/App 延伸練習/);
  assert.match(html,/assets\/grammar-quiz\.js\?v=2/);
}

const shared=await readFile(resolve(root,"assets/grammar-quiz.js"),"utf8");
assert.match(shared,/無提示情境辨析/);
assert.match(shared,/choiceFeedback/);
assert.match(shared,/你所選項目的語氣/);
assert.match(shared,/settings\.mode!=="exam"/);

const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=createServer(async(request,response)=>{
  try{
    const path=resolve(root,`.${decodeURIComponent(new URL(request.url,"http://localhost").pathname)}`);
    if(!path.startsWith(`${root}${sep}`))return response.writeHead(403).end();
    response.setHeader("Content-Type",types[extname(path)]||"application/octet-stream");
    response.end(await readFile(path));
  }catch{response.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.JPY5_BROWSER_CHANNEL?{channel:process.env.JPY5_BROWSER_CHANNEL}:{})});
const browserContext=await browser.newContext({serviceWorkers:"block"});
const screenshotDirectory=process.env.JPY5_SCREENSHOT_DIR;
if(screenshotDirectory)await mkdir(screenshotDirectory,{recursive:true});

try{
  for(const lesson of [18,19,20]){
    const page=await browserContext.newPage(),errors=[];
    await page.setViewportSize({width:390,height:844});
    const plainText=locator=>locator.evaluate(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.textContent;});
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(`${base}/chapter-${lesson}-quiz.html`);
    await page.evaluate(()=>localStorage.clear());
    await page.reload();

    assert.equal(await page.locator("[data-mode]").count(),3);
    assert.equal(await page.locator('[data-mode="practice"]').evaluate(button=>button.classList.contains("active")),true);
    assert.equal(await page.locator("#guided-question-setup").isVisible(),true);
    await page.locator("#start-quiz").click();
    const firstGuidedPattern=lessonData[lesson].patterns.find(pattern=>pattern.id===lessonData[lesson].questions[0].pattern);
    assert.match(await plainText(page.locator("#quiz-progress-text")),new RegExp(firstGuidedPattern.title.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
    assert.match(await page.locator("#question-kind").innerText(),/應用程式文法練習/);
    await page.locator("#quit-quiz").click();

    await page.locator('[data-mode="challenge"]').click();
    assert.equal(await page.locator("#guided-question-setup").isHidden(),true);
    assert.equal(await page.locator("#challenge-mode-note").isVisible(),true);
    assert.match(await page.locator("#start-quiz").innerText(),new RegExp(`${expectedCounts[lesson]} 題`));
    await page.locator("#start-quiz").click();

    const bank=lessonData[lesson].noHintQuestions,first=bank[0],firstPattern=lessonData[lesson].patterns.find(pattern=>pattern.id===first.pattern);
    const firstPrompt=await plainText(page.locator("#question-prompt"));
    assert(!firstPrompt.includes(firstPattern.title),`Lesson ${lesson} revealed the target before answering`);
    assert(!(await plainText(page.locator("#quiz-progress-text"))).includes(firstPattern.title),`Lesson ${lesson} progress revealed the target`);
    assert.match(await page.locator("#question-kind").innerText(),/APP 延伸練習 · 無提示情境辨析/i);
    const wrong=(first.answer+1)%first.options.length;
    await page.locator(`[data-answer="${wrong}"]`).click();
    const feedback=await plainText(page.locator("#answer-explanation"));
    assert.match(feedback,/你所選項目的語氣/);
    assert.match(feedback,/這題重點/);
    assert(feedback.includes(firstPattern.title));
    assert.match(await page.locator("#next-question").innerText(),/下一個情境|完成辨析/);
    if(lesson===20&&screenshotDirectory)await page.screenshot({path:join(screenshotDirectory,"lesson20-no-hint-feedback-mobile.png"),fullPage:true});

    for(let index=1;index<bank.length;index++){
      await page.locator("#next-question").evaluate(button=>button.click());
      assert.notEqual(await plainText(page.locator("#question-prompt")),firstPrompt);
      assert.equal(await page.locator("[data-answer]").count(),4,`Lesson ${lesson} question ${index+1} did not render; ${errors.join(" | ")}`);
      await page.locator(`[data-answer="${bank[index].answer}"]`).click();
    }
    await page.locator("#next-question").evaluate(button=>button.click());
    await page.locator("#quiz-result").waitFor({state:"visible"});
    assert.equal(await page.locator("#quiz-result").isVisible(),true);
    assert.equal(await page.locator("#retry-wrong").isVisible(),true);
    await page.locator("#retry-wrong").click();
    assert.match(await page.locator("#quiz-progress-text").innerText(),/1 \/ 1 · 無提示情境辨析/);
    await page.locator(`[data-answer="${first.answer}"]`).click();
    await page.locator("#next-question").evaluate(button=>button.click());
    await page.locator("#quiz-result").waitFor({state:"visible"});
    assert.equal(await page.locator("#quiz-result").isVisible(),true,`Lesson ${lesson} retry did not finish`);
    await page.locator("#new-quiz").evaluate(button=>button.click());
    assert.equal(await page.locator("#quiz-setup").isVisible(),true);
    assert.equal(await page.locator('[data-mode="challenge"]').evaluate(button=>button.classList.contains("active")),true);

    await page.goto(`${base}/chapter-${lesson}-history.html`);
    assert.match(await page.locator("#history-list").innerText(),/無提示辨析/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,`Lesson ${lesson} mobile page overflows horizontally`);
    assert.deepEqual(errors,[],`Lesson ${lesson} browser errors`);
    await page.close();
  }
}finally{
  await browserContext.close();
  await browser.close();
  server.close();
}

console.log("No-hint grammar checks passed: 4/6/8 App-extension situations, preserved guided mode, hidden targets, choice-specific feedback, next-situation flow, retry/history persistence and mobile layout.");
