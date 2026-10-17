import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTeacherController, fetchTeacherNote} from '../assets/teacher-access-core.mjs';
import {migrateTeacherDraft} from '../assets/teacher-progress-privacy.mjs';
import {webcrypto} from 'node:crypto';

test('REST uses only authorized non-cached reads; rejects errors and malformed records', async () => {
  const signal = new AbortController().signal;
  const user = {getIdToken: async () => 'synthetic-test-token'};
  let request;
  const load = fetchImpl => fetchTeacherNote({user, signal, projectId: 'demo-jpy5-teacher', fetchImpl});
  assert.deepEqual(await load(async (url, options) => {
    request = {url, ...options};
    return {ok:true,json:async()=>({fields:{schemaVersion:{integerValue:'2'},exercises:{stringValue:'synthetic exercises'},adverbs:{stringValue:'synthetic adverbs'},grammarJson:{stringValue:'{}'}}})};
  }), {exercises:'synthetic exercises', adverbs:'synthetic adverbs',grammar:{}});
  assert.equal(request.cache, 'no-store'); assert.equal(request.credentials,'omit'); assert.equal(request.redirect,'error');
  assert.equal(request.headers.Authorization,'Bearer synthetic-test-token');
  assert.match(request.url,/\/jpy5TeacherNotes\/lesson14$/);
  for (const [status,code] of [[403,'denied'],[404,'missing'],[401,'error'],[500,'error']]) await assert.rejects(load(async()=>({ok:false,status})), error=>error.code===code);
  await assert.rejects(load(async()=>({ok:true,json:async()=>({fields:{}})})));
});

test('background revalidation retains context; failed authorization clears it', async()=>{
  let states=[],allowed=true;
  const control=createTeacherController({online:()=>true,visible:()=>true,render:value=>states.push(value),load:async()=>{if(!allowed)throw Object.assign(Error(),{code:'denied'});return {synthetic:true};}});
  control.account({uid:'synthetic'});await control.read();await control.read({refresh:true});
  assert.equal(states.at(-1).preserve,true);assert.equal(states.at(-1).data,undefined);
  allowed=false;await control.read({refresh:true});assert.equal(states.at(-1).state,'denied');assert.equal(states.at(-1).preserve,undefined);
});

test('duplicate requests and same-account notifications preserve the current study view',async()=>{
  let calls=0,resolve,states=[];
  const control=createTeacherController({online:()=>true,visible:()=>true,render:value=>states.push(value),load:()=>{calls++;return new Promise(done=>resolve=done);}});
  assert.equal(control.account({uid:'approved'}),true);
  const first=control.read(),second=control.read();
  assert.equal(first,second);assert.equal(calls,1);
  assert.equal(control.account({uid:'approved'}),false);
  resolve({synthetic:true});await first;
  const count=states.length;await control.read();
  assert.equal(calls,1);assert.equal(states.length,count,'a resume or auth refresh does not rebuild loaded content');
  assert.equal(control.account({uid:'other'}),true);assert.equal(states.at(-1).data,undefined);
  const stale=control.read();assert.equal(calls,2);
  control.account(null);resolve({synthetic:true});await stale;
  assert.equal(states.at(-1).state,'signed-out');assert.equal(states.at(-1).data,undefined);
});

test('legacy question signatures become hashes without losing progress',async()=>{
  const draft={version:1,id:'synthetic-run',mode:'exam',questionIds:['synthetic-q'],signatures:['SYNTHETIC SECRET'],index:0,answers:{'synthetic-q':1},startedAt:'synthetic',revision:3};
  let value=JSON.stringify(draft);const storage={getItem:()=>value,setItem:(_,next)=>value=next,removeItem:()=>value=null};
  const migrating=migrateTeacherDraft(storage,webcrypto);assert(!value.includes('SYNTHETIC SECRET'));await migrating;
  const migrated=JSON.parse(value);assert.match(migrated.signatures[0],/^sha256:[a-f0-9]{64}$/);
  for(const field of ['id','questionIds','index','answers','revision'])assert.deepEqual(migrated[field],draft[field]);
  const first=value;await migrateTeacherDraft(storage,webcrypto);assert.equal(value,first);
});

test('signed-out/offline reads do not fetch; account changes discard in-flight results', async () => {
  let calls=0, resolve, online=true, state;
  const control=createTeacherController({online:()=>online,visible:()=>true,render:value=>state=value,load:()=>{calls++;return new Promise(done=>resolve=done);}});
  control.account(null); await control.read(); assert.equal(calls,0); assert.equal(state.state,'signed-out');
  control.account({uid:'approved'}); const pending=control.read(); assert.equal(state.state,'loading');
  control.account({uid:'other'}); resolve({exercises:'synthetic'}); await pending;
  assert.equal(state.state,'ready'); assert.equal(state.data,undefined);
  online=false; await control.read(); assert.equal(calls,1); assert.equal(state.state,'offline');
  control.account(null); assert.equal(state.data,undefined);
});

test('approved loads, permission errors, timeout, logout, hidden pages and lease fail closed', async () => {
  let state, reject=false, visible=true;
  const control=createTeacherController({online:()=>true,visible:()=>visible,leaseMs:10,render:value=>state=value,load:async()=>{
    if(reject)throw Object.assign(Error(),{code:'denied'});return {exercises:'synthetic'};
  }});
  control.account({uid:'approved'}); await control.read(); assert.equal(state.state,'loaded');
  await new Promise(done=>setTimeout(done,20)); assert.equal(state.state,'expired'); assert.equal(state.data,undefined);
  reject=true; await control.read(); assert.equal(state.state,'denied'); assert.equal(state.data,undefined);
  reject=false; await control.read(); control.account(null); assert.equal(state.state,'signed-out'); assert.equal(state.data,undefined);
  control.account({uid:'approved'}); visible=false; await control.read(); assert.equal(state.data,undefined);
  const stuck=createTeacherController({online:()=>true,visible:()=>true,timeoutMs:5,render:value=>state=value,load:()=>new Promise(()=>{})});
  stuck.account({uid:'approved'}); void stuck.read(); await new Promise(done=>setTimeout(done,15)); assert.equal(state.state,'error'); assert.equal(state.data,undefined);
});
