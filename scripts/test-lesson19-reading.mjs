#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import vm from "node:vm";
import {readFile,readdir} from "node:fs/promises";

const context={window:{}};vm.createContext(context);
vm.runInContext(await readFile("assets/ch19-reading-data.js","utf8"),context,{filename:"ch19-reading-data.js"});
const data=context.window.JPY5_READING;

assert.equal(data.sourceStatus,"textbook_pages_1_to_4_and_answerbook_page_9_visually_verified");assert.deepEqual(JSON.parse(JSON.stringify(data.source.readingPdfPages)),[1,2,3,4]);assert.equal(data.source.answerBookPdfPage,9);
assert.equal(data.paragraphs.length,5);
assert.equal(crypto.createHash("sha256").update(JSON.stringify(data.paragraphs.map(item=>item.jp))).digest("hex"),"641d267c8eb5182a97ee112664335fd06c14906237d2d00f640d4126e7427b3d","five verified Japanese paragraphs changed");
assert.deepEqual(JSON.parse(JSON.stringify(data.questions)),[
  {id:"app-1",q:"ロボコン授業の第一の効果は何ですか。",options:["創造的な技術力の向上","宿題を減らすこと","部品を買うこと","個人競技にすること"],answer:0,why:"第2段。",paragraph:2},
  {id:"app-2",q:"第三の効果は何ですか。",options:["チームワークの大切さを学ぶ","英語だけを学ぶ","一人で働く","勝敗を無視する"],answer:0,why:"第4段。",paragraph:4}
]);
assert.equal(data.find.length,1);assert.equal(data.vocab.length,5);
assert.deepEqual(JSON.parse(JSON.stringify(data.textbookActivities.sections.map(item=>`${item.number}. ${item.title}`))),["1. 考えてみよう","3. 確かめよう","4. 考えよう・話そう","5. チャレンジしよう"]);
assert.equal(data.textbookActivities.sections[0].items[0].prompt,"あなたは夢中で何かに取り組んだことがありますか。それはどんなことですか。\n友達と一緒に何かをやり上げて、友達とその喜びを分かち合ったことがありますか。それはどんなことですか。");
assert.deepEqual(JSON.parse(JSON.stringify(data.textbookActivities.sections[0].items[1].examples)),["産業用ロボット","無人探査ロボット","ペットロボット","介護ロボット"]);
assert.deepEqual(JSON.parse(JSON.stringify(data.sourceQuestions.map(item=>item.answer))),[
  "与えられた課題を達成するロボットを設計し、製作し、競技を行うというもの",
  "大きな教育的効果があるから",
  "創造的な技術力の向上、物と人間とのよい関係が身につく、チームワークの大切さを学ぶ",
  "ロボコンが生徒たちを、「学校がつまらない。嫌いだ。行きたくない」ではなく、「楽しい。まだ帰りたくない」という気持ちに変えるという意味"
]);
assert(data.sourceQuestions.every(item=>item.answerStatus==="answerbook_verified"&&item.scored===false));
const chart=data.sourceActivities.find(item=>item.id==="source-chart");
assert.deepEqual(JSON.parse(JSON.stringify(chart.answer)),["独創力","達成感","満足感","資源活用","経費節約","精神的に成長"]);assert.equal(chart.rows.length,4);
assert.equal(data.sourceActivities.find(item=>item.id==="source-discussion").answerStatus,"answerbook_omitted");
assert.equal(data.sourceActivities.find(item=>item.id==="source-challenge").answerStatus,"answerbook_omitted");
const controller=await readFile("assets/ch19-reading.js","utf8"),page=await readFile("chapter-19-reading.html","utf8"),audit=await readFile("LESSON19_SOURCE_AUDIT.md","utf8");
assert.match(controller,/data-official-answer/);assert.match(controller,/hidden/);assert.match(controller,/data-source-note/);assert.match(controller,/data-textbook-draft/);assert.match(controller,/data-character-count/);
assert.doesNotMatch(page,/未核實答案鍵|教材未附答案鍵/);assert.match(page,/PDF 第 9 頁/);assert.match(audit,/Sections 1, 4 and 5 `省略`/);
const offline=await readFile("assets/offline-assets.js","utf8");for(const file of (await readdir("assets")).filter(name=>name.startsWith("ch19-")))assert(offline.includes(`assets/${file}`));assert(offline.includes("LESSON19_SOURCE_AUDIT.md"));
console.log("Lesson 19 Reading data checks passed: unchanged source/App banks, textbook 1/3/4/5, verified answers, saved drafts and offline references.");
