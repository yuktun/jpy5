import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTeacherController, fetchTeacherNote} from '../assets/teacher-access-core.mjs';

test('REST uses only authorized non-cached reads; rejects errors and malformed records', async () => {
  const signal = new AbortController().signal;
  const user = {getIdToken: async () => 'synthetic-test-token'};
  let request;
  const load = fetchImpl => fetchTeacherNote({user, signal, projectId: 'demo-jpy5-teacher', fetchImpl});
  assert.deepEqual(await load(async (url, options) => {
    request = {url, ...options};
    return {ok:true,json:async()=>({fields:{schemaVersion:{integerValue:'1'},exercises:{stringValue:'synthetic exercises'},adverbs:{stringValue:'synthetic adverbs'}}})};
  }), {exercises:'synthetic exercises', adverbs:'synthetic adverbs'});
  assert.equal(request.cache, 'no-store'); assert.equal(request.credentials,'omit'); assert.equal(request.redirect,'error');
  assert.equal(request.headers.Authorization,'Bearer synthetic-test-token');
  assert.match(request.url,/\/jpy5TeacherNotes\/lesson14$/);
  for (const [status,code] of [[403,'denied'],[404,'missing'],[401,'error'],[500,'error']]) await assert.rejects(load(async()=>({ok:false,status})), error=>error.code===code);
  await assert.rejects(load(async()=>({ok:true,json:async()=>({fields:{}})})));
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
