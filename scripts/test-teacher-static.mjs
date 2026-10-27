import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {lessons} from './adverb-notes-data.mjs';
// Approved 2026-10-27 content corrections start from this checkout. Keep the
// historical authorization snapshot below; only named study-content regions vary.
const studyAuditBase='666d5e9ebe0f27f99e7071804d1e31cb55100ab7';
assert.equal(lessons[14].cards.length,4);
assert.equal(lessons[14].practices.reduce((n,p)=>n+p.questions.length,0),7);
for(const file of ['chapter-14-vocabulary.html']){
  const source=await readFile(file,'utf8');
  assert.doesNotMatch(source,/data-teacher-section|data-teacher-content|teacher-access\.mjs/);
  assert.equal((source.match(/class="teacher-adverb-card"/g)||[]).length,4);
  assert.equal((source.match(/data-answer-toggle/g)||[]).length,2);
  assert.match(source,/<details[^>]+id="teacher-adverbs"[^>]*>\s*<summary>老師副詞筆記<\/summary>/);
  assert.match(source,/https:\/\/drive\.google\.com\/file\//);
  const published=execFileSync('git',['show',`2cb386d9fe158d8ccc18b6d43c3f09d93afd8fee:${file}`],{encoding:'utf8'});
  const outsidePanel=html=>html.replace(/\r\n/g,'\n').replace(/<!-- BEGIN SHARED ADVERB NOTES -->[\s\S]*?<!-- END SHARED ADVERB NOTES -->/,'').replace('<script type="module" src="assets/teacher-access.mjs"></script>','');
  const initial=execFileSync('git',['show',`${studyAuditBase}:${file}`],{encoding:'utf8'});
  const panel=html=>html.replace(/\r\n/g,'\n').match(/<!-- BEGIN SHARED ADVERB NOTES -->[\s\S]*?<!-- END SHARED ADVERB NOTES -->/)?.[0];
  assert.ok(panel(initial),'Initial adverb panel exists');
  assert.equal(panel(source),panel(initial),'Approved vocabulary corrections must not change the adverb panel');
  assert.equal(outsidePanel(initial),outsidePanel(published),'Initial vocabulary page differs from historical public boundary');
  const vocabularyCorrections=html=>outsidePanel(html)
    .replace(/assets\/ch14-vocabulary-data\.js\?v=\d+/g,'assets/ch14-vocabulary-data.js')
    .replace(/assets\/ch14-vocabulary\.js\?v=\d+/g,'assets/ch14-vocabulary.js')
    .replace(/<p>第 14 課(?:全|共) [\s\S]*?<\/p>/,'<p>VOCABULARY_COVERAGE</p>')
    .replace(/<strong>\d+<\/strong> 全部詞彙/,'<strong>COUNT</strong> 全部詞彙')
    .replace(/(<button data-vocab-section="all">)全部 \d+(<\/button>)/,'$1全部 COUNT$2')
    .replace(/\s*<button data-vocab-section="sourceExtra">教科書補充 \d+<\/button>/,'')
    .replace(/<h2>\d+ 詞詞彙表<\/h2>/,'<h2>COUNT 詞詞彙表</h2>')
    .replace('<option value="sourceExtra">教科書補充</option>','')
    .replace(/\s*<aside class="source-note"><div><p class="kicker">VOCABULARY SOURCE COVERAGE<\/p>[\s\S]*?<\/aside>/,'')
    .replace(/<footer>[\s\S]*?<\/footer>/,'<footer>VOCABULARY_SOURCE</footer>');
  assert.equal(vocabularyCorrections(source),vocabularyCorrections(initial),'Vocabulary changes exceed approved counts, source-extra controls, provenance and resource versions');
  const vocabulary={window:{}};vm.runInNewContext(await readFile('assets/ch14-vocabulary-data.js','utf8'),vocabulary);
  assert.equal(vocabulary.window.JPY5_VOCABULARY.items.length,227);
  assert.equal(vocabulary.window.JPY5_VOCABULARY.items.filter(item=>item.section==='sourceExtra').length,19);
  assert.match(source,/data-vocab-section="sourceExtra"/);
}
for(const file of ['firestore.rules','assets/teacher-access.mjs','assets/teacher-access-core.mjs','assets/teacher-demo.mjs','assets/teacher-progress-privacy.mjs','assets/firebase-sync.mjs']){
  const published=execFileSync('git',['show',`2cb386d9fe158d8ccc18b6d43c3f09d93afd8fee:${file}`],{encoding:'utf8'});
  assert.equal((await readFile(file,'utf8')).replace(/\r\n/g,'\n'),published.replace(/\r\n/g,'\n'),`${file}: authorization/progress changed outside approved scope`);
}
const publicReview=await readFile('chapter-14-review.html','utf8');
assert.doesNotMatch(publicReview,/data-teacher-section|teacher-access\.mjs/);
assert.match(publicReview,/class="teacher-review-shell"/);
assert.equal((publicReview.match(/data-answer-toggle/g)||[]).length,13);
const tracked=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n').filter(file=>existsSync(file));
assert(!tracked.some(file=>file.startsWith('private-migration/')));
const sandbox={self:{}};vm.runInNewContext(await readFile('assets/offline-assets.js','utf8'),sandbox);
assert(!sandbox.self.JPY5_OFFLINE_MANIFEST.assets.some(file=>/private-migration|teacher.*\.json|^scripts\//.test(file)));
// Public content outside the explicitly approved additions/corrections remains
// byte-for-byte unchanged. Authorization/progress parity above has no exceptions.
// The newly authorized public textbook dataset did not exist at this base.
// Its seven-lesson integration is checked by test-textbook-exercises-14-20.mjs.
const base='8a4a519af833679e37d334a9aa20a7b86be7d27c';
const approvedStudyCorrections=new Set([
  'assets/ch13-grammar-extra-data.js','assets/ch13-reading-teacher-notes.js',
  'assets/ch14-conversation-data.js','assets/ch14-hub.js','assets/ch14-quiz.js',
  'assets/ch14-vocabulary-data.js','assets/ch14-vocabulary.js',
  'chapter-13.html','chapter-13-review.html','chapter-13-vocabulary.html'
]);
const priorPublicAdditions=new Set(['assets/ch13-quiz1.js','assets/ch13-quiz1.css','assets/ch13-quiz-audio.mjs','assets/ch13-textbook-exercises.js','assets/ch13-teacher-oct17.js','assets/ch14-data.js','assets/ch14-grammar-extra-data.js','assets/ch14-teacher-placeholders.js','assets/ch14-textbook-exercises-data.js']);
for(const file of tracked.filter(file=>/^chapter-13|^assets\/(?:ch13|ch14|data\.js|grammar-extra-data\.js|firebase-sync\.mjs)/.test(file)&&!priorPublicAdditions.has(file)&&!approvedStudyCorrections.has(file))){
  const original=execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'}).replace(/\r\n/g,'\n');
  let current=await readFile(file,'utf8');
  // Cache busts for these reviewed corrections do not alter the historical page body.
  if(file==='chapter-13-notes.html') current=current.replace('ch13-grammar-extra-data.js?v=2','ch13-grammar-extra-data.js?v=1').replace('notes.js?v=9','notes.js?v=8');
  if(file==='chapter-13-reading.html') current=current.replace('reading-data.js?v=10','reading-data.js?v=9').replace('ch13-reading-teacher-notes.js?v=3','ch13-reading-teacher-notes.js?v=2').replace('reading.js?v=16','reading.js?v=15');
  if(file==='chapter-13-textbook.html') current=current.replace('conversation-data.js?v=9','conversation-data.js?v=8');
  // Supplied Lesson 13 Quiz 1 is public exercise content; all historical content remains exact.
  if(file==='chapter-13-review.html') current=current.replace(/<!-- BEGIN LESSON 13 QUIZ1 (?:RESOURCES|LINK|EXERCISE) -->[\s\S]*?<!-- END LESSON 13 QUIZ1 (?:RESOURCES|LINK|EXERCISE) -->/g,'');
  // Approved review UX changes only defaults and the shared controls' resource versions.
  if(file==='chapter-13-review.html') current=current.replace('<details class="teacher-exercise">','<details class="teacher-exercise" open>').replace('assets/teacher-supplements.js?v=4','assets/teacher-supplements.js?v=3').replace('assets/teacher-word-help.css?v=3','assets/teacher-word-help.css?v=2');
  // The approved notice correction versions only the PWA resource on lesson 13;
  // its original source attribution elsewhere on the page remains unchanged.
  if(/^chapter-13-(reading|textbook)\.html$/.test(file)) current=current.replace('assets/pwa.js?v=2','assets/pwa.js');
  // Shared speed resources change controls only, never protected lesson content.
  if(/^chapter-13-(reading|textbook)\.html$/.test(file)) current=current.replace(/  <link rel="stylesheet" href="assets\/audio-playback-speed\.css\?v=1">\r?\n/,'').replace(/  <script src="assets\/audio-playback-speed\.js\?v=1" defer><\/script>\r?\n/,'').replace('assets/audio-segment-player.js?v=2','assets/audio-segment-player.js?v=1');
  // The later authorized sentence pilot adds only these resources/version bumps
  // to lesson 13's reading page. Keep the rest of this historical parity check.
  if(file==='chapter-13-reading.html') current=current.replace(/  <link rel="stylesheet" href="assets\/reading-sentence-audio\.css\?v=3">\r?\n/,'').replace(/  <script src="assets\/reading-sentence-audio-data\.js\?v=1" defer><\/script>\r?\n/,'').replace('assets/reading.js?v=15','assets/reading.js?v=14').replace('assets/reading-paragraph-audio.js?v=5','assets/reading-paragraph-audio.js?v=2');
  // The lesson 14 sentence pilot changes only translation guidance/font size.
  if(file==='assets/ch14-reading.js') current=current.replace('每段中文下方附有完整日文原文。點按日文句子，只播放該句原聲；再按可重播。','每段中文下方附有完整日文原文。').replace('<div class="translation-list" style="--reading-size:${[.98,1.1,1.24][state.font]}rem">','<div class="translation-list">');
  // The already-published local audio copy changes this URL only; keep every
  // reading paragraph, question, answer and source field under historical parity.
  if(file==='assets/ch14-reading-data.js') current=current.replace('audio:"assets/audio/reading/sound202406141718352903.mp3"','audio:"https://ttrw.jp/static/sound/sound202406141718352903.mp3"');
  if(file==='chapter-13-reading.html') current=current.replace('src="assets/audio/reading/sound202406141718352260.mp3"','src="https://ttrw.jp/static/sound/sound202406141718352260.mp3"').replace('音訊來源為該網站，由本站 GitHub Pages 提供播放。','音訊亦由該網站提供。');
  if(file==='chapter-13-textbook.html') current=current.replace('src="assets/audio/listening/sound202406141718352565.mp3"','src="https://ttrw.jp/static/sound/sound202406141718352565.mp3"').replace('音訊來源為該網站，由本站 GitHub Pages 提供播放。','音訊亦由該網站提供。');
  assert.equal(current.replace(/\r\n/g,'\n').replace(/flashcards\.js\?v=\d+/,'flashcards.js').replace('<script src="assets/ch13-teacher-oct17.js?v=1" defer></script>','').replace('assets/ch13-textbook-exercises.js?v=3','assets/ch13-textbook-exercises.js?v=2').replace('assets/vocabulary.js?v=12','assets/vocabulary.js?v=11').replace(/<aside class="source-note" data-oct17-index>[\s\S]*?<\/aside>/,''),original.replace(/flashcards\.js\?v=\d+/,'flashcards.js'),`${file}: unexpected public-content change`);
}
for(const page of ['notes','flashcards','quiz','history']){
  const source=await readFile(`chapter-14-${page}.html`,'utf8');
  assert.match(source,/<script[^>]*src="assets\/ch14-data\.js/);
  assert.equal((source.match(/class="lesson-pills module-lesson-switcher"/g)||[]).length,page==='notes'?0:1);
  assert.doesNotMatch(source,/data-teacher-section="grammar"|data-grammar-template|teacher-grammar-frame/);
}
const placeholder=await readFile('assets/ch14-teacher-placeholders.js','utf8');
assert.match(placeholder,/data-teacher-demo-content><\/div>/);
assert.doesNotMatch(placeholder,/Teacher\\'s notes here/);
assert.match(await readFile('assets/teacher-demo.mjs','utf8'),/verifyTeacherAccess/);
// The approved public adverbs must match the ignored migration source exactly.
let payload;try{payload=JSON.parse(await readFile('private-migration/lesson14.json','utf8'));}catch{}
if(payload){
  const html=await readFile('chapter-14-vocabulary.html','utf8');
  const inner=html.match(/<div class="teacher-note-panel-body">([\s\S]*?)<\/div>\s*<\/details>\s*<!-- END SHARED ADVERB NOTES -->/)[1];
  const normalize=s=>s.replace(/\r\n/g,'\n').trim();
  assert.equal(normalize(inner),normalize(payload.adverbs),'Approved public adverbs differ from the migration source');
  console.log('Public adverb migration parity passed; remaining grammar authorization is unchanged.');
}else console.warn('Optional private-migration/lesson14.json fixture unavailable: migration-payload parity not checked; adverb panel parity against the initial checkout passed.');
console.log('Static authorization boundary, scoped study corrections, Drive link and offline inventory checks passed.');
