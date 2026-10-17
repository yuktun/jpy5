// Optional private parity check. No protected text is printed or embedded here.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const base='8a4a519af833679e37d334a9aa20a7b86be7d27c';
const original=file=>execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'});
const payload=JSON.parse(await readFile('private-migration/lesson14.json','utf8')),grammar=JSON.parse(payload.grammarJson);
const source={window:{}};vm.runInNewContext(original('assets/ch14-data.js'),source);vm.runInNewContext(original('assets/ch14-grammar-extra-data.js'),source);
assert.equal(hash(source.window.JPY5_DATA),hash(grammar.data),'Grammar data parity hash');
assert.equal(hash(source.window.JPY5_GRAMMAR_EXTRA),hash(grammar.extras),'Grammar extras parity hash');
const before={window:{}},after={window:{JPY5_GRAMMAR_RUBY_EXTRA:grammar.ruby}};
vm.runInNewContext(original('assets/grammar-ruby.js'),before);vm.runInNewContext(await readFile('assets/grammar-ruby.js','utf8'),after);
const strings=[];function walk(v){if(typeof v==='string')strings.push(v);else if(v&&typeof v==='object')Object.values(v).forEach(walk);}walk(grammar.data);walk(grammar.extras);
assert.equal(hash(strings.map(v=>before.window.JPY5GrammarRuby.render(v))),hash(strings.map(v=>after.window.JPY5GrammarRuby.render(v))),'Authorized ruby parity hash');
for(const p of grammar.data.patterns)for(const [example] of p.examples)assert.equal(hash(before.window.JPY5GrammarRuby.renderExample(example,p.id)),hash(after.window.JPY5GrammarRuby.renderExample(example,p.id)),'Grammar highlight parity hash');
for(const page of ['notes','flashcards','quiz','history']){
 const oldMain=original(`chapter-14-${page}.html`).match(/<main\b[\s\S]*?<\/main>/)[0];
 const template=(await readFile(`chapter-14-${page}.html`,'utf8')).match(/<template data-grammar-template>([\s\S]*?)<\/template>/)[1];
 assert.equal(hash(oldMain.replace(/\r\n/g,'\n')),hash(template.replace(/\r\n/g,'\n')),'Original tool layout parity hash');
}
const lesson13={window:{}};vm.runInNewContext(original('assets/data.js'),lesson13);const publicRuby={window:{}};vm.runInNewContext(await readFile('assets/grammar-ruby.js','utf8'),publicRuby);
for(const p of lesson13.window.JPY5_DATA.patterns)for(const [example] of p.examples)assert.equal(hash(before.window.JPY5GrammarRuby.renderExample(example,p.id)),hash(publicRuby.window.JPY5GrammarRuby.renderExample(example,p.id)),'Lesson 13 public ruby parity hash');
for(const q of grammar.data.questions)assert.equal(grammar.questionSignatures[q.id],'sha256:'+hash([q.id,q.pattern,q.prompt,q.options,q.answer]));
console.log(`Private parity passed: ${grammar.data.patterns.length} patterns, 46 examples, ${grammar.data.questions.length} questions, ${grammar.extras.length} extras, ${grammar.ruby.length} ruby entries, four original tool layouts, stable IDs/fingerprints, and public lesson 13 readings.`);
