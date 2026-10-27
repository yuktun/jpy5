import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';

const oldCode=execFileSync('git',['show','666d5e9ebe0f27f99e7071804d1e31cb55100ab7:assets/ch14-data.js'],{encoding:'utf8'});
const code=await readFile('assets/ch14-data.js','utf8');
function context(seed={}) {
  const values=new Map(Object.entries(seed)), nodes=new Map();
  const node=key=>{if(!nodes.has(key))nodes.set(key,{hidden:false,textContent:'',onclick:null});return nodes.get(key)};
  const ctx=vm.createContext({window:{addEventListener(){}},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},document:{querySelector:node},navigator:{},console});
  ctx.JPY5={read:(key,fallback)=>values.has('jpy5.chapter14.'+key)?JSON.parse(values.get('jpy5.chapter14.'+key)):fallback,write:(key,value)=>values.set('jpy5.chapter14.'+key,JSON.stringify(value)),remove:key=>values.delete('jpy5.chapter14.'+key)};
  return {ctx,values,nodes};
}
const baseline=context();vm.runInContext(oldCode,baseline.ctx);const original=baseline.ctx.window.JPY5_DATA;
const prefix='jpy5.chapter14.',ids=Array.from(original.questions.slice(0,5),q=>q.id);
const legacy={version:1,id:'old-compatible-draft',mode:'exam',questionIds:ids,signatures:original.questions.slice(0,5).map(q=>JSON.stringify([q.id,q.pattern,q.prompt,q.options,q.answer])),index:1,answers:{[ids[0]]:1,[ids[1]]:0},startedAt:'2026-10-20T00:00:00Z',revision:4};
const sentinel=[{id:'completed-before-fix',score:1,total:2,results:[]}];
const fixture=context({[prefix+'quiz.activeRun']:JSON.stringify(legacy),[prefix+'quiz.history']:JSON.stringify(sentinel),[prefix+'quiz.starred']:JSON.stringify([ids[0]])});
vm.runInContext(code,fixture.ctx);
vm.runInContext(await readFile('assets/ch14-quiz-choices.js','utf8'),fixture.ctx);
vm.runInContext(await readFile('assets/quiz-progress.js','utf8'),fixture.ctx);
const {JPY5_DATA:data,JPY5QuizChoices:choices,JPY5QuizProgress:progress}=fixture.ctx.window;
assert.equal(data.patterns.length,11);assert.equal(data.questions.length,33);
assert.deepEqual(Array.from(data.questions,q=>q.id),Array.from(original.questions,q=>q.id));
assert.deepEqual(Array.from(data.questions,q=>q.options[q.answer]),Array.from(original.questions,q=>q.options[q.answer]),'correct canonical answer meanings remain unchanged');
for(const q of data.questions.filter(q=>q.kind==='meaning')) {
  assert.equal(new Set(q.options).size,4);
  assert(q.options.every(text=>!/[ぁ-ゖァ-ヺ]/.test(text)),'meaning options must all be Chinese');
}
const restored=progress.restore(data.questions,['practice','exam']);assert(restored);
assert.equal(restored.index,legacy.index);assert.deepEqual(JSON.parse(JSON.stringify(restored.answers)),legacy.answers);
assert.deepEqual(Array.from(restored.questionIds),ids);
assert.equal(restored.optionBankVersion,undefined,'old runs retain the original option bank');
for(const q of restored.questions)assert.deepEqual(Array.from(choices.question(restored,q).options),Array.from(original.questions.find(x=>x.id===q.id).options));
assert(progress.save(restored));
assert.deepEqual(JSON.parse(fixture.values.get(prefix+'quiz.history')),sentinel);
assert.deepEqual(JSON.parse(fixture.values.get(prefix+'quiz.starred')),[ids[0]]);

for(const mode of ['practice','exam'])for(const seed of ['run-a','run-b','run-c']) {
  // Use a reversed question sequence too: option balance is independent of question randomization.
  const bank=seed==='run-c'?[...data.questions].reverse():data.questions;
  const run=progress.create(bank,mode);run.id=seed+'-'+mode;run.optionBankVersion=2;
  const orders=new Map();let firstCorrect=0;const positions=[0,0,0,0];
  for(const q of run.questions){const order=Array.from(choices.order(run,q));assert.deepEqual([...order].sort(),[0,1,2,3]);orders.set(q.id,order);const pos=order.indexOf(q.answer);positions[pos]++;if(order[0]===q.answer)firstCorrect++;run.answers[q.id]=order[0];}
  assert(firstCorrect>=8&&firstCorrect<=9,'first-option-only strategy cannot earn a perfect full-bank score');
  assert(Math.max(...positions)-Math.min(...positions)<=1,'correct displayed positions are balanced');
  run.index=3;assert(progress.save(run,{replace:true}));
  const resumed=progress.restore(data.questions,['practice','exam']);assert(resumed);assert.equal(resumed.optionBankVersion,2);
  for(const index of [3,2,3,4,3]){resumed.index=index;const q=resumed.questions[index];assert.deepEqual(Array.from(choices.order(resumed,q)),orders.get(q.id),'reload/back/next must preserve option identities and display order');}
  for(const q of resumed.questions){assert.deepEqual(Array.from(choices.question(resumed,q).options),Array.from(q.options));assert.equal(choices.identity(q,q.answer),q.id+':choice:'+q.answer);}
}
const ui=await readFile('assets/ch14-quiz.js','utf8');
assert(ui.includes('Number(b.dataset.answer)'),'feedback must use canonical identity, not DOM index');
assert(ui.includes('quizChoices.order(run,q)'));
assert(!ui.includes('第 14 課掌握得很好'));
const history=await readFile('assets/history.js','utf8');assert(history.includes('JPY5QuizChoices.question(a,current)'),'old history must use legacy option text');
console.log('PASS: old plaintext/hash draft migration, untouched history/stars, 33 stable IDs/keys, Chinese distractors, balanced choices, practice/exam reload/back/next and first-option exploit regression.');
