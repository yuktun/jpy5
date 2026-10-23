import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {lessons} from './adverb-notes-data.mjs';
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
  assert.equal(outsidePanel(source),outsidePanel(published),'Unrelated vocabulary page content changed');
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
// Lesson 13 and general lesson 14 content must remain byte-for-byte unchanged.
// The newly authorized public textbook dataset did not exist at this base.
// Its seven-lesson integration is checked by test-textbook-exercises-14-20.mjs.
const base='8a4a519af833679e37d334a9aa20a7b86be7d27c';
for(const file of tracked.filter(file=>/^chapter-13|^assets\/(?:ch13|ch14|data\.js|grammar-extra-data\.js|firebase-sync\.mjs)/.test(file)&&!['assets/ch13-textbook-exercises.js','assets/ch13-teacher-oct17.js','assets/ch14-data.js','assets/ch14-grammar-extra-data.js','assets/ch14-teacher-placeholders.js','assets/ch14-textbook-exercises-data.js'].includes(file))){
  const original=execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'}).replace(/\r\n/g,'\n');
  let current=await readFile(file,'utf8');
  // The later authorized sentence pilot adds only these resources/version bumps
  // to lesson 13's reading page. Keep the rest of this historical parity check.
  if(file==='chapter-13-reading.html') current=current.replace(/  <link rel="stylesheet" href="assets\/reading-sentence-audio\.css\?v=1">\r?\n/,'').replace(/  <script src="assets\/reading-sentence-audio-data\.js\?v=1" defer><\/script>\r?\n/,'').replace('assets/reading.js?v=15','assets/reading.js?v=14').replace('assets/reading-paragraph-audio.js?v=3','assets/reading-paragraph-audio.js?v=2');
  // The lesson 14 sentence pilot changes only translation guidance/font size.
  if(file==='assets/ch14-reading.js') current=current.replace('每段中文下方附有完整日文原文。點按日文句子，只播放該句原聲；再按可重播。','每段中文下方附有完整日文原文。').replace('<div class="translation-list" style="--reading-size:${[.98,1.1,1.24][state.font]}rem">','<div class="translation-list">');
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
}
console.log('Static boundary, unchanged public lesson content, Drive link and offline inventory checks passed.');
