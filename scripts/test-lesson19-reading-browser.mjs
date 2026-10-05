// Run with Playwright installed (NODE_PATH may point at the bundled node_modules).
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {createServer} from "node:http";
import {readFile,mkdir} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
const {chromium}=createRequire(import.meta.url)("playwright");
const root=process.cwd(),artifacts=resolve("tmp/lesson19-reading-browser");await mkdir(artifacts,{recursive:true});const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=createServer(async(req,res)=>{try{const path=resolve(root,"."+decodeURIComponent(new URL(req.url,"http://localhost").pathname));if(!path.startsWith(root+sep)){res.writeHead(403).end();return}res.setHeader("Content-Type",types[extname(path)]||"application/octet-stream");res.end(await readFile(path))}catch{res.writeHead(404).end()}});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.JPY5_BROWSER_CHANNEL?{channel:process.env.JPY5_BROWSER_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];page.on("pageerror",error=>errors.push(error.message));
const key="jpy5.chapter19.reading",readState=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),mode=value=>page.locator(`[data-reading-mode="${value}"]`).click();
const visibleText=locator=>locator.evaluate(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(item=>item.remove());return copy.textContent});
try{
  await page.goto(`${base}/chapter-19-reading.html`);await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({mode:"questions",font:1,furigana:true,answered:{"app-1":0},wrong:[],vocabIndex:2,vocabFlipped:false,attempts:[{date:"2026-01-01",score:2,total:2,results:[]}],examAnswers:{"app-2":1},sourceNotes:{"source-1":"舊問題草稿","source-4":"舊第四題","source-chart":"舊圖表答案","source-discussion":"舊討論筆記","source-challenge":"舊400字文章"},textbookDrafts:{},questionResults:{"app-1":{selected:0,correct:true}}})),key);await page.reload();
  assert(await page.locator('[data-reading-mode="source"]').evaluate(node=>node.classList.contains("active")));
  assert.deepEqual(await page.locator(".ch14-textbook-section>header h2").evaluateAll(nodes=>nodes.map(node=>{const copy=node.cloneNode(true);copy.querySelectorAll("rt").forEach(rt=>rt.remove());return copy.textContent.trim()})),["1. 考えてみよう","3. 確かめよう","4. 考えよう・話そう","5. チャレンジしよう"]);
  assert.match(await visibleText(page.locator(".ch14-textbook-section").first()),/あなたは夢中で何かに取り組んだことがありますか。.*友達と一緒に何かをやり上げて.*産業用ロボット.*無人探査ロボット.*ペットロボット.*介護ロボット/s);
  assert.equal(await page.locator(".ch14-official-answer:not([hidden])").count(),0);assert.equal(await page.locator("[data-official-toggle]").count(),5);
  for(const [id,value] of Object.entries({"source-1":"舊問題草稿","source-4":"舊第四題","source-chart":"舊圖表答案","source-discussion":"舊討論筆記","source-challenge":"舊400字文章"}))assert.equal(await page.locator(`[data-source-note="${id}"]`).inputValue(),value);
  await page.locator('[data-textbook-draft="think-experience"]').fill("友達と文化祭を準備しました。");await page.locator('[data-textbook-draft="think-robots"]').fill("介護ロボットを見たことがあります。");
  await page.locator('[data-official-toggle="source-1"]').click();assert.match(await visibleText(page.locator('[data-official-answer="source-1"]')),/与えられた課題を達成するロボット/);assert.equal(await page.locator('[data-source-note="source-1"]').inputValue(),"舊問題草稿");
  await page.locator('[data-official-toggle="source-chart"]').click();assert.match(await visibleText(page.locator('[data-official-answer="source-chart"]')),/① 独創力.*⑥ 精神的に成長/s);assert.equal(await page.locator('[data-source-note="source-chart"]').inputValue(),"舊圖表答案");
  await page.locator('[data-source-note="source-challenge"]').fill("四百字の下書き");assert.equal(await page.locator('[data-character-output="source-challenge"]').innerText(),"7");
  await page.locator("#furigana-toggle").click();assert.equal(await page.locator('[data-textbook-draft="think-experience"]').inputValue(),"友達と文化祭を準備しました。");await mode("practice");await mode("source");await page.reload();
  assert.equal(await page.locator('[data-source-note="source-challenge"]').inputValue(),"四百字の下書き");assert.equal(await page.locator('[data-textbook-draft="think-robots"]').inputValue(),"介護ロボットを見たことがあります。");
  let saved=await readState();assert.equal(saved.answered["app-1"],0);assert.equal(saved.attempts.length,1);assert.equal(saved.examAnswers["app-2"],1);assert.equal(saved.vocabIndex,2);
  await mode("practice");assert.equal(await page.locator("[data-question]").count(),2);await mode("exam");assert(await page.locator('input[name="app-2"][value="1"]').isChecked());
  for(const viewport of [{width:1280,height:900},{width:810,height:1080},{width:390,height:844}]){await page.setViewportSize(viewport);await mode("source");assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`textbook overflows ${viewport.width}px`);await page.screenshot({path:`${artifacts}/textbook-${viewport.width}.png`,fullPage:true});await mode("practice");assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`practice overflows ${viewport.width}px`)}
  assert.deepEqual(errors,[]);
  console.log("Lesson 19 Reading browser checks passed: hidden safe reveals, state preservation, furigana rerender, App isolation and 1280/810/390 layouts.");
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
