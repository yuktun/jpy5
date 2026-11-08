import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const {chromium} = createRequire(import.meta.url)('playwright');
const root = process.cwd();
const expected = [[3,4],[4,3],[3,5],[3,5],[4,6],[5,5],[4,5],[5,4]];
const widths = process.env.JPY5_LISTENING_VIEWPORTS?.split(',').map(Number) || [320,390,768,1440];
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg','.webmanifest':'application/manifest+json'};
const server = createServer(async (request,response) => {
  try {
    const path = resolve(root, `.${decodeURIComponent(new URL(request.url,'http://localhost').pathname)}`);
    if (!path.startsWith(root + sep)) return response.writeHead(403).end();
    response.setHeader('Content-Type',types[extname(path)] || 'application/octet-stream');
    response.end(await readFile(path));
  } catch {response.writeHead(404).end();}
});
await new Promise(done => server.listen(0,'127.0.0.1',done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true,...(process.env.JPY5_BROWSER_CHANNEL ? {channel:process.env.JPY5_BROWSER_CHANNEL} : {})});
const context = await browser.newContext({serviceWorkers:'block'});
const page = await context.newPage();
const errors = [];
page.on('pageerror',error => errors.push(error.message));
await mkdir('tmp/listening-part-two',{recursive:true});

try {
  // Hold the asynchronous navigation fetch until after the user jumps.
  for (const lesson of [19,20]) for (const width of widths) {
    await page.setViewportSize({width,height:900});
    let release;
    const navigationReady = new Promise(done => { release = done; });
    const delayNavigation = async route => { await navigationReady; await route.continue(); };
    await page.route('**/assets/lesson-navigation.json',delayNavigation);
    await page.goto(`${base}/chapter-${lesson}-textbook.html`,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'聆聽第二部分',exact:true}).click();
    assert.equal(await page.locator('.lesson-quick-switcher').count(),0);
    await page.locator('.listening-part-nav a').first().click();
    release();
    await page.locator('.lesson-quick-switcher').waitFor();
    await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
    const heading = await page.locator('#listening-part-1-title').boundingBox();
    const navigation = await page.locator('.lesson-quick-switcher').boundingBox();
    assert(heading.y >= navigation.y + navigation.height,`Delayed navigation obscures L${lesson} at ${width}px`);
    assert(heading.y < 300);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'listening-part-1-title');
    await page.unroute('**/assets/lesson-navigation.json',delayNavigation);
  }
  console.log('Delayed navigation regression passed for Lessons 19/20 at all viewport widths.');
  for (let lesson=13; lesson<=20; lesson++) {
    const sandbox = {window:{}};
    const stem = lesson === 13 ? 'conversation' : `ch${lesson}-conversation`;
    vm.runInNewContext(await readFile(`assets/${stem}-data.js`,'utf8'),sandbox);
    const data = sandbox.window.JPY5_CONVERSATION;
    const flat = data.textbookQuestions || data.textbook?.listenQuestions;
    const sourceGroups = flat ? [flat.filter(q=>!q.id.startsWith('tb-e')), flat.filter(q=>q.id.startsWith('tb-e'))] : [data.sourcePrompts,data.expressionExercises.flatMap(group=>group.items)];
    assert.deepEqual(sourceGroups.map(group=>group.length),expected[lesson-13]);
    if (lesson === 19) assert.match(sourceGroups[0][3].answer,/アンヌは高校で落語/);
    for (const width of widths) {
      await page.setViewportSize({width,height:900});
      await page.goto(`${base}/chapter-${lesson}-textbook.html`);
      if (width === widths[0]) {
        await page.evaluate(({lesson,firstContent,firstExpression}) => {
          const old = JPY5.read('conversation',{});
          const seed = lesson<=16 ? {attempts:11,marks:{1:'correct'},stars:{3:true},[lesson===13?'textbookDrafts':'drafts']:{[firstContent]:'之前的內容答案',[firstExpression]:'之前的表現答案'}} : {listenCount:11,promptNotes:{[firstContent]:'之前的內容答案'},expressionNotes:{'0-0':'之前的表現答案'},drafts:{1:'之前的填空答案'}};
          JPY5.write('conversation',{...old,...seed,mode:'comprehension'});
        },{lesson,firstContent:sourceGroups[0][0].id,firstExpression:sourceGroups[1][0].id});
        await page.reload();
        assert.equal(await page.locator('#listening-part-1 textarea').first().inputValue(),'之前的內容答案');
        assert.equal(await page.locator('#listening-part-2 textarea').first().inputValue(),'之前的表現答案');
      }
      const entry = page.getByRole('button',{name:'聆聽第二部分',exact:true});
      await entry.click();
      assert.equal(await entry.evaluate(button=>button.classList.contains('active')),true);
      assert.match(await page.locator('.listening-part-two-heading h2').innerText(),/2\. 聞いてみよう/);
      assert.equal(await page.locator('.listening-part-nav a').count(),2);
      assert.equal(await page.locator('.reference-answer:not([hidden])').count(),0);
      for (let part=1; part<=2; part++) {
        const group = page.locator(`#listening-part-${part}`);
        const cards = group.locator('.textbook-answer-card');
        assert.equal(await cards.count(),expected[lesson-13][part-1]);
        await page.locator('.listening-part-nav a').nth(part-1).click();
        assert.equal(await page.evaluate(()=>document.activeElement.id),`listening-part-${part}-title`);
        await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
        const position = await group.boundingBox();
        const switcher = await page.locator('.lesson-quick-switcher').boundingBox();
        assert(position.y >= switcher.y + switcher.height, `L${lesson} part ${part} hidden by sticky navigation`);
        assert(position.y < 300, `L${lesson} part ${part} jump did not reach the group`);
        for (let index=0; index<sourceGroups[part-1].length; index++) {
          const card = cards.nth(index);
          const answer = card.locator('.reference-answer');
          await card.getByRole('button').click();
          assert.equal(await answer.isVisible(),true);
          const text = await answer.locator('p').evaluate(node=>{const copy=node.cloneNode(true);copy.querySelectorAll('rt').forEach(rt=>rt.remove());return copy.textContent;});
          assert.equal(text,sourceGroups[part-1][index].answer);
          await card.getByRole('button').click();
          assert.equal(await answer.isHidden(),true);
        }
        await cards.first().locator('textarea').fill(`答案 L${lesson} ${part} ${width}`);
      }
      if (lesson<=16) {
        assert.equal(await page.locator('.listening-supplement [data-comprehension]').count(),data.comprehension.length);
        assert.equal(await page.evaluate(()=>Boolean(document.querySelector('#listening-part-2').compareDocumentPosition(document.querySelector('.listening-supplement')) & Node.DOCUMENT_POSITION_FOLLOWING)),true);
        if (width === widths[0]) {
          const question = page.locator('.listening-supplement [data-comprehension]').first();
          await question.locator('[data-comprehension-answer]').nth(data.comprehension[0].answer).click();
          assert.equal(await question.locator('[data-comprehension-answer].correct').count(),1);
          assert.equal(await page.evaluate(()=>JPY5.read('conversation',{}).attempts),12);
          assert.equal(await page.evaluate(()=>JPY5.read('conversation',{}).marks[1]),'correct');
          assert.equal(await page.evaluate(()=>JPY5.read('conversation',{}).stars[3]),true);
        }
      } else if (width === widths[0]) {
        assert.equal(await page.evaluate(()=>JPY5.read('conversation',{}).listenCount),11);
        assert.equal(await page.evaluate(()=>JPY5.read('conversation',{}).drafts[1]),'之前的填空答案');
      }
      if (lesson===17) assert.equal(await page.locator('#listening-part-2 .activity-group').count(),2);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`L${lesson} ${width}px overflow`);
      await page.locator('#furigana-toggle').click();
      for (let part=1;part<=2;part++) assert.equal(await page.locator(`#listening-part-${part} textarea`).first().inputValue(),`答案 L${lesson} ${part} ${width}`);
      await page.locator('[data-mode="dialogue"]').click();
      await entry.click();
      await page.reload();
      for (let part=1;part<=2;part++) assert.equal(await page.locator(`#listening-part-${part} textarea`).first().inputValue(),`答案 L${lesson} ${part} ${width}`);
      assert.equal(await page.locator('.reference-answer:not([hidden])').count(),0);
      if (lesson===14 && [390,1440].includes(width)) {
        await page.locator('.listening-part-two-heading').scrollIntoViewIfNeeded();
        await page.screenshot({path:`tmp/listening-part-two/lesson14-${width}.png`});
        await page.locator('.listening-part-nav a').nth(1).click();
        await page.screenshot({path:`tmp/listening-part-two/lesson14-expressions-${width}.png`});
      }
    }
    console.log(`Lesson ${lesson}: ${expected[lesson-13][0]} content + ${expected[lesson-13][1]} expression questions passed at ${widths.join('/')}px.`);
  }
  assert.deepEqual(errors,[]);
  console.log('All 68 official questions passed: direct entry, both groups, answer toggles, saved drafts, ruby, keyboard focus, responsive layout and unchanged source answers.');
} finally {
  await browser.close();
  await new Promise(done=>server.close(done));
}
