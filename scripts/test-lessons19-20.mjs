#!/usr/bin/env node
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile, readdir, stat } from "node:fs/promises";

const load = async (lesson, files) => {
  const context = { window: {} };
  vm.createContext(context);
  for (const file of files) vm.runInContext(await readFile(`assets/ch${lesson}-${file}.js`, "utf8"), context, { filename: file });
  return context.window;
};
const expected = {
  19: { vocab:176, sections:[43,56,77], grammar:["…を対象に…","ばかりでなく…も","にほかならない","を通して","にかけて","はともかく","ためには","決して…ない"], examples:36, reading:"ロボットコンテスト―ものづくりは人づくり―", dialogue:9, blanks:8 },
  20: { vocab:149, sections:[36,52,61], grammar:["のもとで","そう","ぞ","と同時に","しかなかった","末","て以来","くらい","をこめて","ば…だけ","たとたんに","からといって"], examples:48, reading:"尺八で日本文化を理解", dialogue:18, blanks:7 }
};

for (const lesson of [19,20]) {
  const data = await load(lesson,["data","grammar-extra-data","quiz-data","vocabulary-data","reading-data","conversation-data"]), e=expected[lesson];
  const vocab=data.JPY5_VOCABULARY.items, patterns=data.JPY5_DATA.patterns, reading=data.JPY5_READING, conversation=data.JPY5_CONVERSATION;
  assert.equal(vocab.length,e.vocab); assert.deepEqual(JSON.parse(JSON.stringify(vocab.map(x=>x.id))),Array.from({length:e.vocab},(_,i)=>i+1));
  assert.deepEqual(JSON.parse(JSON.stringify(["grammar","speaking","reading"].map(section=>vocab.filter(x=>x.section===section).length))),e.sections);
  assert(vocab.every(x=>x.kana&&x.written&&x.meaning&&x.type&&x.sourcePage));
  assert.deepEqual(JSON.parse(JSON.stringify(patterns.map(x=>x.title))),e.grammar); assert.equal(patterns.reduce((n,x)=>n+x.examples.length,0),e.examples);
  assert(patterns.every(x=>x.examples.every(example=>example.length===2&&example.every(Boolean))));
  assert.equal(data.JPY5_GRAMMAR_EXTRA.length,patterns.length);
  for (const card of data.JPY5_GRAMMAR_EXTRA) {
    assert.equal(card.grammarIds.length,1);
    const pattern=patterns.find(item=>item.id===card.grammarIds[0]); assert(pattern);
    assert(card.examples.every(example=>pattern.examples.some(source=>source[0]===example[0]&&source[1]===example[1])));
  }
  assert.equal(data.JPY5_DATA.questions.length,patterns.length*2); assert(data.JPY5_DATA.questions.every(q=>q.answer>=0&&q.answer<q.options.length));
  assert.equal(reading.title,e.reading); assert.equal(reading.paragraphs.length,5); assert(reading.paragraphs.every(p=>p.jp&&p.zh));
  assert.equal(conversation.dialogue.length,e.dialogue); assert.equal(conversation.unverifiedBlanks.length,e.blanks);
  assert.equal(conversation.items.length,0); assert.equal(conversation.comprehension.length,0);
  if (lesson === 19) {
    assert.equal(conversation.sourcePrompts.length,4);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.sourcePrompts.map(item=>item.jp))),[
      "今日は何の会が行われますか。",
      "それは何の部ですか。",
      "先輩の古田さんは演劇と役者についてどんなことを言いましたか。",
      "新入部員は何人ですか。それぞれどんな経験を持っていますか。"
    ]);
    assert.equal(conversation.expressionExercises.length,1);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.expressionExercises[0].items)),[
      "司会者が簡単なスピーチを古田さんに頼むとき",
      "司会者が新入生にどのようなことを話してほしいか言うとき",
      "マヨランさんが自分の経験を話し始めるとき",
      "マヨランさんが今までやってきたことを今後の部活動に役立てたいと言うとき",
      "松下さんが、野球部での自分の存在を一言で表現するとき"
    ]);
    assert(conversation.sourcePrompts.every(item=>item.answerStatus==="audio_confirmation_required"&&!Object.hasOwn(item,"answer")));
    assert(conversation.expressionExercises.every(item=>item.answerStatus==="audio_confirmation_required"&&!Object.hasOwn(item,"answer")));
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.sourceFollowUps.map(item=>item.id))),["warmup","repeat","say","practice","challenge"]);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.sourceFollowUps.map(item=>item.section.split(".")[0]))),["1","3","4","5","6"]);
    assert(conversation.sourceFollowUps.every(item=>item.content.length&&!Object.hasOwn(item,"answer")));
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.source.conversationPdfPages)),[5,6,7,8]);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.source.conversationPrintedPages)),[89,90,91,92]);
  }
  for (const module of ["vocabulary","notes","reading","textbook","review","flashcards","quiz","history"]) {
    const html=await readFile(`chapter-${lesson}-${module}.html`,"utf8");
    assert(html.includes(`第 ${lesson} 課`)||html.includes(`LESSON ${lesson}`));
    if (module === "vocabulary") for (const count of e.sections) assert(html.includes(`>${count === e.sections[0] ? "文法" : count === e.sections[1] ? "會話" : "閱讀"} ${count}<`));
    for (const match of html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)) if(!/^(?:https?:|data:)/.test(match[1])) await stat(match[1]);
  }
}
const lesson19Files=[
  "LESSON19_SOURCE_AUDIT.md",
  ...(await readdir(".")).filter(name=>/^chapter-19.*\.html$/.test(name)),
  ...(await readdir("assets")).filter(name=>/^ch19-/.test(name)).map(name=>`assets/${name}`)
];
for (const file of lesson19Files) assert(!/ワット|いずみ|第77頁/.test(await readFile(file,"utf8")),`${file} contains stale Lesson 18 content`);
const lesson19Controller=await readFile("assets/ch19-conversation.js","utf8"),lesson19Textbook=await readFile("chapter-19-textbook.html","utf8");
assert(lesson19Controller.includes("data.sourcePrompts.length")); assert(lesson19Controller.includes("expressionPromptCount"));
assert(!lesson19Textbook.includes("1個內容提示")); assert(lesson19Textbook.includes("印刷第 89–92 頁"));
const navigation=JSON.parse(await readFile("assets/lesson-navigation.json","utf8"));
assert.deepEqual(navigation.lessons,[13,14,15,16,17,18,19,20]);
console.log("Lessons 19–20 checks passed: 325 vocabulary entries, 20 grammar patterns / 84 examples, reading, listening, navigation and local assets.");
