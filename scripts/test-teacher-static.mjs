import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {lessons} from './adverb-notes-data.mjs';
assert.deepEqual(lessons[14],{protected:true});
for(const file of ['chapter-14-review.html','chapter-14-vocabulary.html']){
  const source=await readFile(file,'utf8');
  assert.match(source,/data-teacher-section=/);assert.match(source,/data-teacher-content><\/div>/);
  assert.doesNotMatch(source,/data-answer-toggle|class="teacher-adverb-card"|data-word-meaning/);
  assert.match(source,/https:\/\/drive\.google\.com\/file\//);
}
const tracked=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n');
assert(!tracked.some(file=>file.startsWith('private-migration/')));
const sandbox={self:{}};vm.runInNewContext(await readFile('assets/offline-assets.js','utf8'),sandbox);
assert(!sandbox.self.JPY5_OFFLINE_MANIFEST.assets.some(file=>/private-migration|teacher.*\.json|^scripts\//.test(file)));
// Lesson 13 and general lesson 14 content must remain byte-for-byte unchanged.
const base='8a4a519af833679e37d334a9aa20a7b86be7d27c';
for(const file of tracked.filter(file=>/^chapter-13|^assets\/(?:ch13|ch14|data\.js|grammar-extra-data\.js|firebase-sync\.mjs)/.test(file))){
  const original=execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'}).replace(/\r\n/g,'\n');
  assert.equal((await readFile(file,'utf8')).replace(/\r\n/g,'\n'),original,`${file}: unexpected public-content change`);
}
// Optional local check: no lesson-unique long fragment from the migration copy
// may survive in a tracked public file. Shared exercise directions/labels also
// occur in the unchanged lessons and are deliberately kept public there.
let payload;try{payload=JSON.parse(await readFile('private-migration/lesson14.json','utf8'));}catch{}
if(payload){
  const otherLessons=(await Promise.all(tracked.filter(file=>/^chapter-(?:13|15|16|17|18|19|20)-.*\.html$/.test(file)).map(file=>readFile(file,'utf8')))).join('\n');
  const fragments=[...new Set((payload.exercises+payload.adverbs).replace(/<rt>.*?<\/rt>/g,'').split(/<[^>]*>/).map(text=>text.trim()).filter(text=>text.length>=18&&!otherLessons.includes(text)))];
  for(const file of tracked.filter(file=>/\.(html|js|mjs|md|json)$/.test(file))){
    const source=await readFile(file,'utf8');
    assert(!fragments.some(text=>source.includes(text)),`${file}: protected fragment found (content withheld)`);
  }
  console.log(`Local migration check: ${fragments.length} lesson-unique long fragments absent from public files.`);
}
console.log('Static boundary, unchanged public lesson content, Drive link and offline inventory checks passed.');
