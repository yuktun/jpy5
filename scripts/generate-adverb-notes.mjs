import {readFile, writeFile} from 'node:fs/promises';
import {lessons, source} from './adverb-notes-data.mjs';

const esc = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const start = '<!-- BEGIN SHARED ADVERB NOTES -->';
const end = '<!-- END SHARED ADVERB NOTES -->';
const render = (lesson, data) => `${start}
    <section class="teacher-supplement adverb-notes" id="teacher-adverbs" aria-labelledby="teacher-adverbs-title" data-source-page="${lesson-12}">
      <header class="teacher-supplement-header"><div><span class="teacher-label">老師補充 · 第 ${lesson} 課</span><h2 id="teacher-adverbs-title" lang="ja">${esc(data.title)}</h2><p>${esc(data.summary)}</p><a class="adverb-source" href="${source}#page=${lesson-12}" target="_blank" rel="noopener">老師原講義 · PDF 第 ${lesson-12} 頁 ↗</a></div></header>
      <p class="teacher-source-note">老師例句與練習按原講義整理。中文翻譯、語感及參考答案為學習補充，非老師原文或官方解答；不計入詞彙數目或學習進度。</p>
      <nav class="adverb-lesson-nav" aria-label="各課副詞補充">${Object.keys(lessons).map(n=>`<a href="chapter-${n}-vocabulary.html#teacher-adverbs"${Number(n)===lesson?' aria-current="page"':''}>第 ${n} 課</a>`).join('')}</nav>
      <div class="teacher-adverb-grid">
${data.cards.map(c=>`        <article class="teacher-adverb-card">
          <h3 lang="ja">${c.word.split('・').map(word=>`<span class="adverb-word">${esc(word)}</span>`).join('・<wbr>')}</h3><span class="teacher-adverb-category" lang="ja">${esc(c.category)}</span>
          <p class="adverb-meaning">${esc(c.meaning)}</p>
          <div class="adverb-help"><span class="learning-label">中文語感 · 學習補充</span><p>${esc(c.nuance)}</p></div>
          <h4 class="adverb-example-heading">老師例句 · 中文為學習補充</h4>
          <ul class="teacher-example-list">${c.examples.map(([ja,zh])=>`<li><span class="adverb-ja" lang="ja">${esc(ja)}</span><span class="adverb-translation">${esc(zh)}</span></li>`).join('')}</ul>
          <details class="adverb-original"><summary>老師原說明</summary><p${c.teacher?' lang="ja"':''}>${esc(c.teacher||'講義此欄未另列說明，請參照原例句。')}</p></details>
        </article>`).join('\n')}
      </div>
      <aside class="adverb-memory-guide"><div><span class="learning-label">學習補充（非老師原文）</span><h3>語感比較・快速記法</h3><ul>${data.memory.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></div></aside>
${data.practices.map((p,i)=>`      <article class="teacher-practice" data-question-count="${p.questions.length}">
        <h3 lang="ja">問題${data.practices.length>1?i+1:''}．${esc(p.instruction)}</h3>
        <ol class="teacher-question-list" lang="ja">${p.questions.map(q=>`<li>${esc(q)}</li>`).join('')}</ol>
        <button class="teacher-answer-toggle" type="button" data-answer-toggle aria-controls="adverb-answer-${i+1}" aria-expanded="false">${p.open?'顯示建議答案':'顯示答案'}</button>
        <div class="teacher-answer" id="adverb-answer-${i+1}" hidden><span class="suggested-note">${p.open?'建議答案：其他自然、符合副詞用法的答案也可以。':'參考答案與解說（學習補充，非官方解答）'}</span><ol>${p.answers.map(a=>`<li>${esc(a)}</li>`).join('')}</ol>${p.note?`<p class="adverb-answer-note">${esc(p.note)}</p>`:''}</div>
      </article>`).join('\n')}
    </section>
    ${end}`;

const check = process.argv.includes('--check');
for (const [n, data] of Object.entries(lessons)) {
  const lesson = Number(n), file = `chapter-${n}-vocabulary.html`;
  const before = await readFile(file, 'utf8');
  let html = before;
  const block = render(lesson,data);
  if (html.includes(start)) html = html.replace(/<!-- BEGIN SHARED ADVERB NOTES -->[\s\S]*?<!-- END SHARED ADVERB NOTES -->/, block);
  else if (lesson === 13) {
    const from = html.indexOf('<section class="teacher-supplement" id="teacher-adverbs"');
    const to = html.indexOf('  </main>', from);
    if(from<0||to<0) throw new Error('Cannot locate original Lesson 13 adverbs');
    html = html.slice(0,from) + block + '\n' + html.slice(to);
  } else html = html.replace('  </main>', `    ${block}\n  </main>`);
  if (!html.includes('assets/adverb-notes.css')) html = html.replace('  <link rel="icon"', '  <link rel="stylesheet" href="assets/adverb-notes.css?v=1">\n  <link rel="icon"');
  if (!html.includes('assets/teacher-supplements.js')) html = html.replace('  </head>', '    <script src="assets/teacher-supplements.js?v=1" defer></script>\n  </head>');
  if (!html.includes('class="adverb-jump"')) html = html.replace(/(<div class="vocab-summary">[\s\S]*?<\/div>)/, '$1\n      <a class="adverb-jump" href="#teacher-adverbs">老師副詞 · 例句・語感・練習 ↓</a>');
  if(check && html!==before) throw new Error(`${file} is stale; run node scripts/generate-adverb-notes.mjs`);
  if(!check) await writeFile(file,html);
}
console.log(check?'All eight adverb sections match their source data.':'Generated shared adverb sections for Lessons 13–20.');
