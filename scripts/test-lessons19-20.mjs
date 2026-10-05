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
  19: { vocab:176, sections:[43,56,77], grammar:["…を対象に…","ばかりでなく…も","にほかならない","を通して","にかけて","はともかく","ためには","決して…ない"], examples:36, reading:"ロボットコンテスト―ものづくりは人づくり―", dialogue:9, blanks:8, blankAnswers:["まず、部長の挨拶から。どうぞ","一言お願いします","ありきたりの自己紹介ではなく","こちらから時計回りに","ちょっと自慢話になりますが","経験を","生かせたらいいなと思います","いわゆるボール拾いです"] },
  20: { vocab:149, sections:[36,52,61], grammar:["のもとで","そう","ぞ","と同時に","しかなかった","末","て以来","くらい","をこめて","ば…だけ","たとたんに","からといって"], examples:48, reading:"尺八で日本文化を理解", dialogue:18, blanks:7, blankAnswers:["お忙しいところ、お時間をいただき、ありがとうございます","ご紹介させていただきたいと思って参りました","まず、伺いたいんですが","ああ、そうだったんですか","どんなに大変だったことかと思います","ご活躍を期待しています","今日は貴重なお時間と楽しいお話をありがとうございました"] }
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
  const blanks=lesson===19?conversation.listeningTargets:conversation.unverifiedBlanks;
  assert.equal(conversation.dialogue.length,e.dialogue); assert.equal(blanks.length,e.blanks);
  assert.deepEqual(JSON.parse(JSON.stringify(blanks.map(item=>item.answer))),e.blankAnswers);
  if(lesson===19)assert(blanks.every((item,index)=>item.id===index+1&&item.status==="verified_textbook_answerbook_audio"&&Number.isFinite(item.start)&&Number.isFinite(item.end)&&item.start<item.end));
  else assert(blanks.every((item,index)=>item.id===index+1&&item.status==="answerbook_verified_audio_timing_pending"&&item.answerStatus==="answerbook_verified"&&item.timingStatus==="audio_timing_pending"&&!Object.hasOwn(item,"start")&&!Object.hasOwn(item,"end")));
  assert.equal(conversation.items.length,0); assert.equal(conversation.comprehension.length,0);
  if (lesson === 19) {
    const separatedVerbForms=new Map([
      [18,"深まる （理解が～） ／ 深まります（理解が～）"],[19,"身につける ／ 身に付けます"],[20,"取り戻す ／ 取り戻します"],
      [38,"気が合う ／ 気が合います"],[41,"思い起こす ／ 思い起こします"],[51,"役立てる ／ 役立てます"],
      [58,"受け継ぐ ／ 受け継ぎます"],[71,"生かす ／ 生かします"],[82,"揃う ／ 揃います"],
      [83,"引き継ぐ ／ 引き継ぎます"],[84,"引き締める ／ 引き締めます"],[92,"手放す ／ 手放します"],
      [99,"防ぐ ／ 防ぎます"],[111,"取り組む ／ 取り組みます"],[122,"結びつく ／ 結びつきます"],
      [124,"努める ／ 努めます"],[133,"削る ／ 削ります"],[134,"欠ける ／ 欠けます"],
      [139,"養う ／ 養います"],[141,"身につく ／ 身につきます"],[153,"巻く ／ 巻きます"],
      [159,"仕上げる ／ 仕上げます"],[162,"入る （生命が～） ／ 入ります（生命が～）"],
      [167,"組む （チームを～） ／ 組みます（チームを～）"],[176,"広まる （世界中に～） ／ 広まります（世界中に～）"]
    ]);
    assert.equal(separatedVerbForms.size,25);
    for (const [id,written] of separatedVerbForms) assert.equal(vocab.find(item=>item.id===id).written,written);
    for (const id of [89,108,112,158]) assert.equal(vocab.find(item=>item.id===id).written,"-");
    assert.equal(conversation.sourcePrompts.length,4);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.sourcePrompts.map(item=>item.jp))),[
      "今日は何の会が行われますか。",
      "それは何の部ですか。",
      "先輩の古田さんは演劇と役者についてどんなことを言いましたか。",
      "新入部員は何人ですか。それぞれどんな経験を持っていますか。"
    ]);
    assert.equal(conversation.expressionExercises.length,1);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.expressionExercises[0].items.map(item=>item.q))),[
      "司会者が簡単なスピーチを古田さんに頼むとき",
      "司会者が新入生にどのようなことを話してほしいか言うとき",
      "マヨランさんが自分の経験を話し始めるとき",
      "マヨランさんが今までやってきたことを今後の部活動に役立てたいと言うとき",
      "松下さんが、野球部での自分の存在を一言で表現するとき"
    ]);
    assert(conversation.sourcePrompts.every(item=>item.answer));
    assert(conversation.expressionExercises[0].items.every(item=>item.answer));
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.textbookActivities.map(item=>item.label))),["1","4","5","6"]);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.source.conversationPdfPages)),[5,6,7,8]);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.source.conversationPrintedPages)),[89,90,91,92]);
    assert.deepEqual(JSON.parse(JSON.stringify(reading.sourceActivities.map(item=>item.section.split(".")[0]))),["3","4","5"]);
    assert.equal((reading.sourceActivities[0].items.join("").match(/[①②③④⑤⑥]/g)||[]).length,6);
    assert.deepEqual(JSON.parse(JSON.stringify(reading.textbookActivities.sections.map(item=>item.number))),["1","3","4","5"]);
    assert.equal(reading.sourceQuestions.length,4); assert(reading.sourceQuestions.every(item=>item.answerStatus==="answerbook_verified"&&item.answer));
    assert.deepEqual(JSON.parse(JSON.stringify(reading.sourceActivities[0].answer)),["独創力","達成感","満足感","資源活用","経費節約","精神的に成長"]);
    assert.equal(reading.sourceActivities[1].answerStatus,"answerbook_omitted"); assert.equal(reading.sourceActivities[2].answerStatus,"answerbook_omitted");
    assert(reading.furigana&&Object.keys(reading.furigana).length>0);
  } else {
    const separatedVerbForms=new Map([
      [6,"腹が立つ ／ 腹が立ちます"],[14,"悩む ／ 悩みます"],[16,"渡り歩く ／ 渡り歩きます"],
      [29,"湧き起こる ／ 湧き起こります"],[32,"持ち出す ／ 持ち出します"],[43,"終える ／ 終えます"],
      [57,"上がる （十両に～） ／ 上がります（十両に～）"],[62,"離れる（故郷を～） ／ 離れます（故郷を～）"],
      [74,"生まれ変わる ／ 生まれ変わります"],[76,"報いる ／ 報います"],[85,"頼る ／ 頼ります"],
      [86,"寄り添う ／ 寄り添います"],[88,"まとめる （内容を～） ／ まとめます（内容を～）"],
      [93,"取る （相撲を～） ／ 取ります（相撲を～）"],[103,"授かる ／ 授かります"],
      [119,"吹く ／ 吹きます"],[121,"出す （音を～） ／ 出します（音を～）"],
      [127,"持つ （疑問を～） ／ 持ちます （疑問を～）"],[138,"接する ／ 接します"],
      [145,"含める ／ 含めます"]
    ]);
    assert.equal(separatedVerbForms.size,20);
    for (const [id,written] of separatedVerbForms) assert.equal(vocab.find(item=>item.id===id).written,written);
    for (const id of [5,17,23,25,50,54,61,65,67,71,78,83,92,111,113,117,118,120,122,143,147,148]) assert.equal(vocab.find(item=>item.id===id).written,"-");
    assert.deepEqual(JSON.parse(JSON.stringify(reading.sourceQuestions.map(item=>item.options.length))),[3,3,3]);
    assert.deepEqual(JSON.parse(JSON.stringify(reading.textbookActivities.sections.map(item=>`${item.number}. ${item.title}`))),["1. 考えてみよう","3. 確かめよう","4. 考えよう・話そう","5. チャレンジしよう"]);
    assert.deepEqual(JSON.parse(JSON.stringify(reading.sourceActivities.map(item=>item.section))),["3. 確かめよう 2)","3. 確かめよう 3)","4. 考えよう・話そう","5. チャレンジしよう"]);
    assert.equal((reading.sourceActivities[0].items.join("").match(/[①②③④⑤]/g)||[]).length,5);
    assert.equal((reading.sourceActivities[1].items.join("").match(/[①②③④⑤⑥⑦⑧]/g)||[]).length,8);
    assert.equal(reading.sourceActivities[2].items.length,2);
    assert(reading.sourceQuestions.every(item=>item.answerStatus==="answerbook_verified"&&item.answer));
    assert.deepEqual(JSON.parse(JSON.stringify(reading.sourceActivities[0].answer)),["初演","尺八修業を始める","授かる","急速に増加する","受賞"]);
    assert.deepEqual(JSON.parse(JSON.stringify(reading.sourceActivities[1].answer)),["修業","戸惑わせられ","「内容」","「形」","従う","疑問","日本文化","理解"]);
    assert.equal(reading.sourceActivities[2].answerStatus,"answerbook_omitted");assert.equal(reading.sourceActivities[3].answerStatus,"answerbook_omitted");
    assert(reading.furigana&&Object.keys(reading.furigana).length>0);
    assert.equal(conversation.sourcePrompts.length,5);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.sourcePrompts.map(item=>item.jp))),[
      "臥牙丸さんはなぜ日本で相撲を取ろうと思ったのですか。",
      "十両優勝したとき、お母さんに電話して、声を聞いたとたん涙が出たのはどうしてですか。",
      "相撲部屋の生活でどのようなことに戸惑いましたか。",
      "後輩へどのようなアドバイスをしていますか。",
      "これからの抱負をどのように語っていますか。"
    ]);
    assert.equal(conversation.expressionExercises.length,1);
    assert.equal(conversation.expressionExercises[0].items.length,4);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.sourceFollowUps.map(item=>item.id))),["warmup","repeat","say","practice","challenge"]);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.sourceFollowUps.map(item=>item.section.split(".")[0]))),["1","3","4","5","6"]);
    assert(conversation.sourcePrompts.every(item=>item.answerStatus==="audio_confirmation_required"&&!Object.hasOwn(item,"answer")));
    assert(conversation.expressionExercises.every(item=>item.answerStatus==="audio_confirmation_required"&&!Object.hasOwn(item,"answer")));
    assert(conversation.sourceFollowUps.every(item=>item.content.length&&!Object.hasOwn(item,"answer")));
    assert.equal(conversation.sourceFollowUps.find(item=>item.id==="repeat").answerStatus,"answerbook_verified");
    assert.equal(conversation.sourceFollowUps.find(item=>item.id==="repeat").timingStatus,"audio_timing_pending");
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.source.conversationPdfPages)),[5,6,7,8]);
    assert.deepEqual(JSON.parse(JSON.stringify(conversation.source.conversationPrintedPages)),[103,104,105,106]);
    assert(conversation.furigana&&Object.keys(conversation.furigana).length>0);
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
const lesson20Files=[
  ...(await readdir(".")).filter(name=>/^chapter-20.*\.html$/.test(name)),
  ...(await readdir("assets")).filter(name=>/^ch20-/.test(name)).map(name=>`assets/${name}`)
];
for (const file of lesson20Files) assert(!/ワット|いずみ|第77頁/.test(await readFile(file,"utf8")),`${file} contains stale lesson content`);
const lesson19Controller=await readFile("assets/ch19-conversation.js","utf8"),lesson19Textbook=await readFile("chapter-19-textbook.html","utf8");
assert.match(lesson19Controller,/data-listen-target/); assert.match(lesson19Controller,/currentTime\s*=/);
assert(!lesson19Textbook.includes("Beta")); assert(lesson19Textbook.includes("印刷第89–92頁"));
const lesson20Controller=await readFile("assets/ch20-conversation.js","utf8"),lesson20Textbook=await readFile("chapter-20-textbook.html","utf8");
assert.doesNotMatch(lesson20Controller,/data-listen-target|currentTime\s*=/); assert.doesNotMatch(await readFile("assets/ch20-conversation-data.js","utf8"),/\b(?:start|end)\s*:/);
assert(lesson20Controller.includes("data.sourcePrompts.length")); assert(lesson20Controller.includes("expressionPromptCount"));
assert(lesson20Controller.includes("${activity.blankCount}")); assert(!lesson20Controller.includes("ruby(activity.instruction)"));
assert(!lesson20Textbook.includes("1個內容提示")); assert(lesson20Textbook.includes("印刷第 103–106 頁"));
const lesson19RubySource=await readFile("assets/ch19-grammar-ruby.js","utf8"),rubyContext={window:{}};
vm.createContext(rubyContext);
for (const file of ["assets/grammar-ruby.js","assets/ch19-data.js","assets/ch19-grammar-ruby.js"]) vm.runInContext(await readFile(file,"utf8"),rubyContext,{filename:file});
const lesson19Ruby=rubyContext.window.JPY5GrammarRuby,lesson19Grammar=rubyContext.window.JPY5_DATA.patterns;
const lesson19GrammarIds=["wotaishoni","bakaridenakumo","nihokanaranai","wotooshite","nikakete","hatomokaku","tameniwa","kesshitenai"];
assert.deepEqual(JSON.parse(JSON.stringify(lesson19Grammar.map(pattern=>pattern.id))),lesson19GrammarIds);
const targetBlock=lesson19RubySource.match(/const targets=\{([\s\S]*?)\n  \};/); assert(targetBlock);
assert.deepEqual([...targetBlock[1].matchAll(/^\s+([a-z0-9_]+):/gm)].map(match=>match[1]),lesson19GrammarIds);
for (const staleId of ["nichigainai","nikurabete","monoda","ta_discovery","datte","tatokorode","ndatte","koso"]) assert(!lesson19RubySource.includes(staleId));
const visibleText=html=>html.replace(/<rt>.*?<\/rt>/g,"").replace(/<[^>]+>/g,"");
for (const pattern of lesson19Grammar) for (const [japanese] of pattern.examples) {
  const rendered=lesson19Ruby.renderExample(japanese,pattern.id);
  assert(rendered.includes('<mark class="grammar-target">'),`${pattern.id} lacks target highlighting`);
  assert.equal(visibleText(rendered),japanese,`${pattern.id} ruby changed the source sentence`);
}
const fatherRuby=lesson19Ruby.renderExample(lesson19Grammar.find(pattern=>pattern.id==="nihokanaranai").examples[3][0],"nihokanaranai");
const todayRuby=lesson19Ruby.renderExample(lesson19Grammar.find(pattern=>pattern.id==="wotooshite").examples[1][0],"wotooshite");
assert(fatherRuby.includes("<ruby>父<rt>ちち</rt></ruby>")); assert(!fatherRuby.includes("<rt>とう</rt>"));
assert(todayRuby.includes("<ruby>今日<rt>こんにち</rt></ruby>では")); assert(!todayRuby.includes("<ruby>今日<rt>きょう</rt></ruby>"));
const lesson20RubySource=await readFile("assets/ch20-grammar-ruby.js","utf8"),lesson20RubyContext={window:{}};
vm.createContext(lesson20RubyContext);
for (const file of ["assets/grammar-ruby.js","assets/ch20-data.js","assets/ch20-grammar-ruby.js"]) vm.runInContext(await readFile(file,"utf8"),lesson20RubyContext,{filename:file});
const lesson20Ruby=lesson20RubyContext.window.JPY5GrammarRuby,lesson20Grammar=lesson20RubyContext.window.JPY5_DATA.patterns;
const lesson20GrammarIds=["nomotode","sou","zo","todoujini","shikanakatta","sue","teirai","kurai","wokomete","badake","tatotanni","karatoitte"];
assert.deepEqual(JSON.parse(JSON.stringify(lesson20Grammar.map(pattern=>pattern.id))),lesson20GrammarIds);
const lesson20TargetBlock=lesson20RubySource.match(/const targets=\{([\s\S]*?)\n  \};/); assert(lesson20TargetBlock);
assert.deepEqual([...lesson20TargetBlock[1].matchAll(/([a-z0-9_]+):\[/g)].map(match=>match[1]),lesson20GrammarIds);
for (const staleId of ["wotaishoni","bakaridenakumo","nihokanaranai","wotooshite","nikakete","hatomokaku","tameniwa","kesshitenai"]) assert(!lesson20RubySource.includes(staleId));
for (const pattern of lesson20Grammar) for (const [japanese] of pattern.examples) {
  const rendered=lesson20Ruby.renderExample(japanese,pattern.id);
  assert(rendered.includes('<mark class="grammar-target">'),`${pattern.id} lacks target highlighting`);
  assert.equal(visibleText(rendered),japanese,`${pattern.id} ruby changed the source sentence`);
}
const lesson19VocabularyController=await readFile("assets/ch19-vocabulary.js","utf8");
assert(lesson19VocabularyController.includes('清除全部 ${vocabulary.length} 詞的記憶卡進度、答題標記和收藏？'));
assert(!/清除全部 \d+ 詞/.test(lesson19VocabularyController));
assert(lesson19VocabularyController.includes("[item.kana,item.written,item.original,item.meaning,item.type,item.note,sectionLabel(item)]"));
assert(lesson19VocabularyController.includes('const visibleJapanese = item => item.original || (!/^[-－]$/.test(item.written) ? item.written : item.kana)'));
assert(lesson19VocabularyController.includes('state.direction === "normal" ? item.kana : visibleJapanese(item)'));
const lesson20VocabularyController=await readFile("assets/ch20-vocabulary.js","utf8");
assert(lesson20VocabularyController.includes('清除全部 ${vocabulary.length} 詞的記憶卡進度、答題標記和收藏？'));
assert(!/清除全部 \d+ 詞/.test(lesson20VocabularyController));
assert(lesson20VocabularyController.includes('const visibleJapanese = item => item.original || (!/^[-－]$/.test(item.written) ? item.written : item.kana)'));
assert(lesson20VocabularyController.includes('state.direction === "normal" ? item.kana : visibleJapanese(item)'));
for (const lesson of [19,20]) {
  const readingController=await readFile(`assets/ch${lesson}-reading.js`,"utf8");
  assert(readingController.includes("data.title")); assert(readingController.includes("data.textbookActivities.sections"));
  assert(readingController.includes("data.sourceActivities")); assert(readingController.includes("const ratio=score/data.questions.length"));
  assert(!/鉛筆削り|六組|score>=11|score>=8/.test(readingController));
}
const navigation=JSON.parse(await readFile("assets/lesson-navigation.json","utf8"));
assert.deepEqual(navigation.lessons,[13,14,15,16,17,18,19,20]);
console.log("Lessons 19–20 checks passed: 325 vocabulary entries, 20 grammar patterns / 84 examples, reading, listening, navigation and local assets.");
