import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import vm from "node:vm";
const root=process.cwd();
const source=file=>readFile(`${root}/${file}`,"utf8");
const runFiles=async files=>{const context={window:{}};vm.createContext(context);for(const file of files)vm.runInContext(await source(file),context,{filename:file});return context.window;};

const modules=["vocabulary","notes","reading","textbook","flashcards","quiz","review","history"];
const rootFiles=await readdir(root);
for(const lesson of [13,14,15,16,17,18])for(const module of modules)assert(rootFiles.includes(`chapter-${lesson}-${module}.html`),`missing chapter-${lesson}-${module}.html`);

const vocabWindow=await runFiles(["assets/ch17-vocabulary-data.js","assets/ch17-vocabulary-audit.js"]),vocab=vocabWindow.JPY5_VOCABULARY.items;
assert.equal(vocab.length,152);
assert.deepEqual(Object.fromEntries(["grammar","speaking","reading"].map(section=>[section,vocab.filter(item=>item.section===section).length])),{grammar:44,speaking:34,reading:74});
assert.equal(new Set(vocab.map(item=>item.id)).size,152,"duplicate vocabulary IDs");
assert(vocab.every((item,index)=>item.id===index+1&&item.kana&&item.written&&item.meaning&&item.type),"incomplete or unordered vocabulary record");
assert.match(vocab.find(item=>item.id===23).note,/來源標示：他動詞.*教學補充/);
assert.match(vocab.find(item=>item.id===78).note,/來源標示：名詞.*教學補充/);
assert.equal(vocab.find(item=>item.id===3).original,"cookie");
assert.equal(vocab.find(item=>item.id===73).original,"Pokémon");

const grammar=(await runFiles(["assets/ch17-data.js"])).JPY5_DATA;
assert.equal(grammar.patterns.length,10);
assert.equal(grammar.patterns.reduce((sum,pattern)=>sum+pattern.examples.length,0),36);
assert.equal(grammar.questions.length,40);
assert.equal(new Set(grammar.questions.map(question=>question.id)).size,40,"duplicate grammar question IDs");
assert(grammar.questions.every(question=>question.source==="app_practice"&&question.options.length===4&&Number.isInteger(question.answer)&&question.answer>=0&&question.answer<4&&question.explanation));
assert.deepEqual(Object.fromEntries(grammar.patterns.map(pattern=>[pattern.id,grammar.questions.filter(question=>question.pattern===pattern.id).length])),Object.fromEntries(grammar.patterns.map(pattern=>[pattern.id,4])));
assert.doesNotMatch(JSON.stringify(grammar.questions),/ただの暗記|これは昨日|五人をなる|ことからには|にからには|だったらには|によってには|ったったら|るからなる/,"weak or malformed grammar distractor remains in runtime data");
assert(!grammar.patterns.some(pattern=>pattern.title.includes("～上")),"unexpected eleventh source pattern");

const extraWindow=await runFiles(["assets/ch17-grammar-extra-data.js","assets/ch17-grammar-audit.js"]);
assert(extraWindow.JPY5_GRAMMAR_EXTRA.every(extra=>!extra.exercises),"placeholder modal quiz remains");

const reading=(await runFiles(["assets/ch17-reading-data.js","assets/ch17-reading-audit.js"])).JPY5_READING;
assert.equal(reading.paragraphs.length,6);
assert.equal(reading.questions.length,13);
assert.equal(new Set(reading.questions.map(question=>question.id)).size,13,"duplicate reading question IDs");
assert(reading.questions.every(question=>question.source==="app_practice"&&reading.paragraphs.some(paragraph=>paragraph.id===question.paragraph)&&question.answer>=0&&question.answer<question.options.length));
assert.equal(reading.find.length,5);
assert(reading.find.every(task=>reading.paragraphs.some(paragraph=>paragraph.id===task.answer)));

const conversation=(await runFiles(["assets/ch17-conversation-data.js"])).JPY5_CONVERSATION;
assert.equal(conversation.dialogue.length,29);
assert.equal(conversation.unverifiedBlanks.length,9);
assert.equal(conversation.sourcePrompts.length,4);
assert.equal(conversation.expressionExercises.length,2);
assert.equal(conversation.items.length,0);
assert.equal(conversation.comprehension.length,0);
assert(conversation.unverifiedBlanks.every(blank=>blank.status==="audio_confirmation_required"));
assert(conversation.sourcePrompts.every(prompt=>prompt.answerStatus==="audio_confirmation_required"));
assert(conversation.expressionExercises.every(exercise=>exercise.answerStatus==="audio_confirmation_required"));
const conversationSource=await source("assets/ch17-conversation-data.js");
assert.equal((conversationSource.match(/[①②③④⑤⑥⑦⑧⑨]/g)||[]).length,9);
assert.doesNotMatch(conversationSource,/\banswer\s*:/,"unverified listening answer added");

const hub=await source("assets/ch17-hub.js");
assert.match(hub,/finiteRatio\(vocabDone,152\)/);assert.match(hub,/finiteRatio\(readingDone,13\)/);assert.doesNotMatch(hub,/listeningDone\/0/);assert.match(hub,/不評分/);
const readingJs=await source("assets/ch17-reading.js");
assert.match(readingJs,/examAnswers:\{\}/);assert.match(readingJs,/state\.examAnswers\[input\.name\]/);assert.match(readingJs,/state\.examAnswers=\{\}/);
const quizJs=await source("assets/ch17-quiz.js");
assert.match(quizJs,/previous\.filter\(id=>!attempted\.has\(id\)\)/,"unattempted wrong-review state not preserved");

const lesson17Files=rootFiles.filter(file=>/^chapter-17(?:-[a-z]+)?\.html$/.test(file));
for(const file of lesson17Files){
  const html=await source(file);
  assert.doesNotMatch(html,/進度只儲存在|均儲存在本機|裝置內自動保存|裝置內儲存進度/,`${file}: stale persistence wording`);
  for(const match of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)/g))assert((await readdir(`${root}/assets`)).includes(match[1].slice(7)),`${file}: missing ${match[1]}`);
}
for(const file of ["chapter-17-notes.html","chapter-17-vocabulary.html","chapter-17-reading.html","chapter-17-textbook.html","chapter-17-review.html"])assert.match(await source(file),/chapter-16-/,`${file}: Lesson 16 missing from fallback navigation`);

for(const common of ["assets/common.js","assets/ch14-common.js","assets/ch15-common.js","assets/ch16-common.js","assets/ch17-common.js"]){const text=await source(common);assert.match(text,/hour>=18\|\|hour<6/);assert.match(text,/\[13,14,15,16,17,18\]/);}
console.log("Lesson 17 counts, source labels, question integrity, persistence, navigation, and unverified-listening safeguards passed.");
