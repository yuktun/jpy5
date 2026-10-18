import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {lessons} from './adverb-notes-data.mjs';
assert.deepEqual(lessons[14],{protected:true});
for(const file of ['chapter-14-vocabulary.html']){
  const source=await readFile(file,'utf8');
  assert.match(source,/data-teacher-section=/);assert.match(source,/data-teacher-content><\/div>/);
  assert.doesNotMatch(source,/data-answer-toggle|class="teacher-adverb-card"|data-word-meaning/);
  assert.match(source,/https:\/\/drive\.google\.com\/file\//);
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
for(const file of tracked.filter(file=>/^chapter-13|^assets\/(?:ch13|ch14|data\.js|grammar-extra-data\.js|firebase-sync\.mjs)/.test(file)&&!['assets/ch14-data.js','assets/ch14-grammar-extra-data.js','assets/ch14-teacher-placeholders.js','assets/ch14-textbook-exercises-data.js'].includes(file))){
  const original=execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'}).replace(/\r\n/g,'\n');
  assert.equal((await readFile(file,'utf8')).replace(/\r\n/g,'\n'),original,`${file}: unexpected public-content change`);
}
for(const page of ['notes','flashcards','quiz','history']){
  const source=await readFile(`chapter-14-${page}.html`,'utf8');
  assert.match(source,/<script[^>]*src="assets\/ch14-data\.js/);
  assert.doesNotMatch(source,/data-teacher-section="grammar"|data-grammar-template|teacher-grammar-frame|module-lesson-switcher/);
}
const placeholder=await readFile('assets/ch14-teacher-placeholders.js','utf8');
assert.match(placeholder,/data-teacher-demo-content><\/div>/);
assert.doesNotMatch(placeholder,/Teacher\\'s notes here/);
assert.match(await readFile('assets/teacher-demo.mjs','utf8'),/verifyTeacherAccess/);
// Optional local check: no lesson-unique long fragment from the migration copy
// may survive in a tracked public file. Shared exercise directions/labels also
// occur in the unchanged lessons and are deliberately kept public there.
let payload;try{payload=JSON.parse(await readFile('private-migration/lesson14.json','utf8'));}catch{}
if(payload){
  const otherLessons=(await Promise.all(tracked.filter(file=>/^chapter-(?:13|15|16|17|18|19|20)-.*\.html$/.test(file)).map(file=>readFile(file,'utf8')))).join('\n');
  const general=JSON.parse(payload.grammarJson),generalStrings=[];
  function strings(value){if(typeof value==='string')generalStrings.push(value);else if(value&&typeof value==='object')Object.values(value).forEach(strings);}
  strings(general.data);strings(general.extras);
  const fragments=[...new Set(payload.adverbs.replace(/<rt>.*?<\/rt>/g,'').split(/<[^>]*>/).map(text=>text.trim()).filter(text=>text.length>=18&&!otherLessons.includes(text)&&!publicReview.includes(text)&&!generalStrings.some(value=>value.includes(text))))];
  for(const file of tracked.filter(file=>/\.(html|js|mjs|md|json)$/.test(file))){
    const source=await readFile(file,'utf8');
    assert(!fragments.some(text=>source.includes(text)),`${file}: protected fragment found (content withheld)`);
  }
  console.log(`Local migration check: ${fragments.length} lesson-unique long fragments absent from public files.`);
  console.log('General grammar and the approved public review are parity-checked separately; teacher-only adverb text remains excluded.');
}
console.log('Static boundary, unchanged public lesson content, Drive link and offline inventory checks passed.');
