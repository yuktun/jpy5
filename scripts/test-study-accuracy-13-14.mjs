import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
const baseline='65182e5';
async function load(file,old=false){const c={window:{}};vm.runInNewContext(old?execFileSync('git',['show',`${baseline}:assets/${file}.js`],{encoding:'utf8'}):await readFile(`assets/${file}.js`,'utf8'),c);return c.window;}
for(const lesson of [13,14]){
 const prefix=lesson===13?'':`ch${lesson}-`;
 const now=(await load(prefix+'data')).JPY5_DATA,before=(await load(prefix+'data',true)).JPY5_DATA;
 assert.equal(now.patterns.length,lesson===13?8:11);
 assert.deepEqual(JSON.parse(JSON.stringify(now.questions.map(q=>[q.id,q.pattern,q.answer]))),JSON.parse(JSON.stringify(before.questions.map(q=>[q.id,q.pattern,q.answer]))),'Scored question identities and correct answers must not change');
 const v=(await load(prefix+'vocabulary-data')).JPY5_VOCABULARY.items,old=(await load(prefix+'vocabulary-data',true)).JPY5_VOCABULARY.items;
 assert.equal(v.length,lesson===13?191:227);
 assert.deepEqual(JSON.parse(JSON.stringify(v.map(x=>[x.id,x.kana,x.written,x.type]))),JSON.parse(JSON.stringify(old.map(x=>[x.id,x.kana,x.written,x.type]))),'No vocabulary identity, pronunciation or word class changes');
 for(const name of ['reading-data','conversation-data']){
  const a=(await load(prefix+name))[name==='reading-data'?'JPY5_READING':'JPY5_CONVERSATION'];
  const b=(await load(prefix+name,true))[name==='reading-data'?'JPY5_READING':'JPY5_CONVERSATION'];
  if(name==='reading-data'){
   assert.deepEqual(Array.from(a.paragraphs,p=>p.jp),Array.from(b.paragraphs,p=>p.jp));
   assert.deepEqual(JSON.parse(JSON.stringify(a.questions)),JSON.parse(JSON.stringify(b.questions)));
  }else assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
 }
 if(lesson===13){assert.match(now.patterns.find(p=>p.id==='ndatte').note,/だったんだって/);assert.match((await load('reading-data')).JPY5_READING.paragraphs[2].zh,/第一部上市/);}
 else {assert.match(now.patterns.find(p=>p.id==='ge').formation,/部分 V/);assert.match(now.patterns.find(p=>p.id==='ge').note,/不能任意/);assert.match(v.find(x=>x.id===16).meaning,/漏掉/);assert.match(v.find(x=>x.id===53).meaning,/最高氣溫25/);assert.match(v.find(x=>x.id===82).meaning,/被留下/);}
 console.log(`Lesson ${lesson}: content corrections, all scored answer IDs, original passages, listening banks and vocabulary identities verified.`);
}
console.log('Study accuracy regressions passed.');
