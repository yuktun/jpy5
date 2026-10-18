// Synthetic renderer fixture only: no textbook transcription or live services.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const script = await readFile('assets/textbook-exercises.js','utf8');
const fixture = {
  lesson:14, source:'https://example.invalid/book.pdf',
  readings:{'学校':'がっこう','学':'がく','生':'せい','a+b':'あ'},
  groups:{synthetic:[{
    title:'合成測試 <test>',page:3,printedPage:'42',
    instruction:'中文說明：学校',
    model:'{学生|がくせい}です。\n学校です。',bank:['学校','{学生|がくせい}'],
    answerSource:{url:'https://example.invalid/key.pdf',page:2},
    items:[
      {id:'official',prompt:'学校ですか。',options:['学校','{学生|がくせい}'],answer:'学校です。',answerKind:'official'},
      {id:'suggested',prompt:'{学生|がくせい}ですか。',answer:'はい。',answerKind:'suggested',explanation:'中文学校 <script> &'},
      {id:'personal',prompt:'{学生|がくせい}ですか。',answer:'いいえ。',answerKind:'personal',answerSource:{url:'https://example.invalid/other.pdf',page:7}},
      {id:'missing',prompt:'学校ですか。',answerKind:'missing'},
      {id:'unknown',prompt:'学校ですか。',answer:'学校です。'}
    ]
  },{
    title:'日本語の指示',page:4,instruction:'学校',japaneseInstruction:true,
    items:[{id:'second',prompt:'学校',answer:'学校',answerKind:'suggested'}]
  }]}
};
const window={JPY5_TEXTBOOK_EXERCISE_DATA:fixture};
vm.runInNewContext(script,{window});
const renderer=window.JPY5_TEXTBOOK_EXERCISES;
assert.equal(renderer.render('absent'),'');
assert.equal(renderer.render('constructor'),'');
assert.equal(renderer.jp('{学生|がくせい}と学校'),'<ruby>学生<rt>がくせい</rt></ruby>と<ruby>学校<rt>がっこう</rt></ruby>');
assert.equal(renderer.jp('a+b'),'<ruby>a+b<rt>あ</rt></ruby>');
assert.equal(renderer.jp('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');
assert.equal(renderer.jp('{<b>|あ}'),'<ruby>&lt;b&gt;<rt>あ</rt></ruby>');
const html=renderer.render('synthetic');
assert.ok(html.includes('參考示例（非唯一答案）'));
assert.ok(html.includes('此為開放題參考示例，並非唯一答案；請參閱所附答案來源。'));
assert.ok(!html.includes('非官方'));
assert.ok(html.includes('book.pdf#page=3'));
assert.ok(html.includes('印刷頁 42'));
assert.ok(html.includes('other.pdf#page=7'));
assert.ok(html.includes('中文說明：学校</p>'),'Chinese instruction must remain plain');
assert.ok(html.includes('中文学校 &lt;script&gt; &amp;'));
assert.ok(html.includes('合成測試 &lt;test&gt;'));
assert.ok(!html.includes(' open'));
const noData={window:{}};vm.runInNewContext(script,noData);
assert.equal(noData.window.JPY5_TEXTBOOK_EXERCISES.render('x'),'');
const unsafe=structuredClone(fixture);unsafe.source='javascript:alert(1)';
unsafe.groups.synthetic[0].answerSource={url:'data:text/html,hi',page:1};
const unsafeContext={window:{JPY5_TEXTBOOK_EXERCISE_DATA:unsafe}};
vm.runInNewContext(script,unsafeContext);
assert.doesNotMatch(unsafeContext.window.JPY5_TEXTBOOK_EXERCISES.render('synthetic'),/href="(?:javascript|data):/);
assert.ok(html.includes('此題未提供固定答案；不以推測答案取代原稿。'));
const withAnswerNote=structuredClone(fixture);
withAnswerNote.groups.synthetic[0].items[3].answerNote='原稿標記：省略 <key>';
const answerNoteContext={window:{JPY5_TEXTBOOK_EXERCISE_DATA:withAnswerNote}};
vm.runInNewContext(script,answerNoteContext);
assert.ok(answerNoteContext.window.JPY5_TEXTBOOK_EXERCISES.render('synthetic').includes('原稿標記：省略 &lt;key&gt;'));
for(const blank of ['',undefined]){
  const omitted=structuredClone(fixture);omitted.groups.synthetic[0].items[2].answer=blank;
  const omittedContext={window:{JPY5_TEXTBOOK_EXERCISE_DATA:omitted}};vm.runInNewContext(script,omittedContext);
  const omittedHtml=omittedContext.window.JPY5_TEXTBOOK_EXERCISES.render('synthetic');
  assert.ok(omittedHtml.includes('自行作答（答案冊省略）'));
  assert.ok(omittedHtml.includes('other.pdf#page=7'));
  assert.doesNotMatch(omittedHtml,/<p lang="ja"><\/p>/);
}
let onReady;
const loadingContext={window:{document:{readyState:'loading',addEventListener:(event,callback,options)=>{
  assert.equal(event,'DOMContentLoaded');assert.equal(options.once,true);onReady=callback;
},querySelector:()=>null}}};
vm.runInNewContext(script,loadingContext);
assert.equal(typeof onReady,'function');onReady();

const browser=await chromium.launch({headless:true,channel:process.env.JPY5_BROWSER_CHANNEL||'msedge'});
try {
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main style="max-width:900px;margin:auto"></main></body></html>'}));
  for (const width of [390,810,1280]) {
    await page.setViewportSize({width,height:1000});
    await page.goto('http://renderer.test/');
    for (const path of ['assets/styles.css','assets/ch13-teacher-additions.css','assets/ch13-textbook-exercises.css']) await page.addStyleTag({path});
    await page.evaluate(data=>{window.JPY5_TEXTBOOK_EXERCISE_DATA=data;localStorage.setItem('jpy5.chapter14.bookmarks','["preserve"]');},fixture);
    await page.addScriptTag({content:script});
    await page.evaluate(()=>{document.querySelector('main').innerHTML=window.JPY5_TEXTBOOK_EXERCISES.render('synthetic');});
    const before=await page.evaluate(()=>JSON.stringify({...localStorage}));
    assert.equal(await page.locator('details[open]').count(),0);
    assert.equal(await page.locator('.textbook-answer-body:visible').count(),0);
    await page.locator('.textbook-practice > summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.textbook-question-list > li:visible').count(),6);
    assert.equal(await page.locator('.textbook-answer-body:visible').count(),0);
    const firstTwo=page.locator('.textbook-answer').filter({has:page.locator('summary')});
    await firstTwo.nth(0).locator('summary').click();
    await firstTwo.nth(1).locator('summary').click();
    assert.equal(await page.locator('.textbook-answer[open]').count(),2,'answers must disclose independently');
    await firstTwo.nth(0).locator('summary').click();
    assert.equal(await firstTwo.nth(1).evaluate(node=>node.open),true);
    await firstTwo.nth(1).locator('summary').click();
    for (const answer of await page.locator('.textbook-answer').all()) {
      await answer.locator('summary').focus();await page.keyboard.press('Space');
      assert.equal(await page.locator('.textbook-answer[open]').count(),1);
      assert.equal(await answer.locator('.textbook-answer-body').isVisible(),true);
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.textbook-answer[open]').count(),0);
    }
    assert.match(await page.locator('[data-answer-kind="missing"]').innerText(),/答案未提供/);
    assert.equal(await page.locator('[data-answer-kind="missing"] [lang="ja"]').count(),0);
    assert.equal(await page.locator('[data-textbook-question="unknown"] [data-answer-kind="suggested"]').count(),1);
    const japanese=await page.locator('[lang="ja"]').evaluateAll(nodes=>nodes.map(node=>{
      const clone=node.cloneNode(true);clone.querySelectorAll('ruby').forEach(ruby=>ruby.remove());return clone.textContent;
    }));
    assert.ok(japanese.every(text=>!/[\p{Script=Han}]/u.test(text)),'synthetic Han must all have ruby');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
    await page.evaluate(()=>{document.querySelector('main').innerHTML=window.JPY5_TEXTBOOK_EXERCISES.render('synthetic');});
    assert.equal(await page.locator('details[open]').count(),0);
    assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
  }
  // An intentional appendix remains separate from ordinary scored grammar cards.
  await page.goto('http://renderer.test/');
  const appendixFixture=structuredClone(fixture);
  appendixFixture.orphanTitles={synthetic:'学校',appendix:'～{上|じょう}'};
  appendixFixture.groups.appendix=structuredClone(fixture.groups.synthetic);
  appendixFixture.groups.typo=structuredClone(fixture.groups.synthetic);
  const patterns=[{id:'synthetic',title:'existing pattern'}];
  await page.evaluate(({data,patterns})=>{
    window.JPY5_TEXTBOOK_EXERCISE_DATA=data;window.JPY5_DATA={patterns};
    document.querySelector('main').innerHTML='<div data-matching></div><section data-textbook-unmatched hidden></section>';
    localStorage.setItem('jpy5.chapter17.bookmarks','["synthetic"]');
  },{data:appendixFixture,patterns});
  const beforeAppendix=await page.evaluate(()=>JSON.stringify({...localStorage}));
  await page.addScriptTag({content:script});
  await page.evaluate(()=>{
    document.querySelector('[data-matching]').innerHTML=window.JPY5_TEXTBOOK_EXERCISES.render('synthetic');
    window.JPY5_TEXTBOOK_EXERCISES.renderUnmatched();
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });
  assert.equal(await page.locator('[data-textbook-unmatched]').evaluate(node=>node.hidden),false);
  assert.equal(await page.locator('[data-textbook-unmatched-pattern]').count(),1);
  assert.equal(await page.locator('[data-textbook-unmatched] [data-textbook-pattern="appendix"]').count(),1);
  assert.equal(await page.locator('[data-textbook-unmatched] [data-textbook-pattern="synthetic"]').count(),0);
  assert.equal(await page.locator('[data-textbook-unmatched] [data-textbook-pattern="typo"]').count(),0);
  assert.equal(await page.locator('[data-matching] [data-textbook-pattern="synthetic"]').count(),1);
  assert.equal(await page.locator('[data-textbook-unmatched-pattern] > h3 ruby').innerHTML(),'上<rt>じょう</rt>');
  assert.equal(await page.locator('details[open]').count(),0);
  assert.deepEqual(await page.evaluate(()=>window.JPY5_DATA.patterns),patterns);
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),beforeAppendix);
  await page.evaluate(()=>{
    window.JPY5_DATA.patterns.push({id:'appendix'});
    window.JPY5_TEXTBOOK_EXERCISES.renderUnmatched();
  });
  assert.equal(await page.locator('[data-textbook-unmatched]').evaluate(node=>node.hidden),true);
  assert.equal(await page.locator('[data-textbook-unmatched]').innerHTML(),'');
  assert.deepEqual(errors,[]);
  await context.close();
} finally {await browser.close();}
console.log('Shared textbook renderer: synthetic unit and Edge browser checks passed (390/810/1280px).');
