import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {snapshotFromStorage,applySnapshot,mergeSnapshots,syncableKey} from '../assets/firebase-sync.mjs';
const makeStorage=(initial={})=>{
  const data=new Map(Object.entries(initial));return {get length(){return data.size;},key:index=>[...data.keys()][index]??null,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
};
const fixture=lesson=>({
  [`jpy5.chapter${lesson}.quiz.history`]:JSON.stringify([{id:`old-${lesson}`,date:'2025-01-01T00:00:00Z',mode:'exam',results:[{questionId:`q${lesson}`,selected:1,correct:false}]}]),
  [`jpy5.chapter${lesson}.quiz.lastWrong`]:JSON.stringify([`q${lesson}`,`unattempted-${lesson}`]),
  [`jpy5.chapter${lesson}.quiz.starred`]:JSON.stringify([`star-${lesson}`]),
  [`jpy5.chapter${lesson}.vocabulary.cards.v2`]:JSON.stringify({results:{word:{correct:2}}}),
  [`jpy5.chapter${lesson}.reading`]:JSON.stringify({answers:{q:'saved'}}),
  [`jpy5.chapter${lesson}.conversation`]:JSON.stringify({drafts:{one:'saved'}})
});
const storage=makeStorage({...fixture(19),...fixture(20),'jpy5.chapter19.theme':'"dark"','jpy5.chapter20.quiz.activeRun':'{"id":"local-draft"}','foreign':'private'}),snapshot=snapshotFromStorage(storage);
assert.equal(Object.keys(snapshot).length,12);assert(!syncableKey('jpy5.chapter20.quiz.activeRun'));assert(!syncableKey('jpy5.chapter19.theme'));
const target=makeStorage({'foreign':'other','jpy5.chapter13.quiz.history':'[]'});applySnapshot(snapshot,target);assert.deepEqual(snapshotFromStorage(target),{...snapshot,'jpy5.chapter13.quiz.history':'[]'});assert.equal(target.getItem('foreign'),'other');
for(const lesson of [19,20]){
  const prefix=`jpy5.chapter${lesson}.quiz.`,local=fixture(lesson),cloud=fixture(lesson);
  local[prefix+'history']=JSON.stringify([{id:'retry',date:'2026-01-01T00:00:00Z',mode:'challenge',results:[{questionId:`q${lesson}`,selected:0,correct:true}]}]);
  local[prefix+'lastWrong']=JSON.stringify([`unattempted-${lesson}`]);local[prefix+'starred']=JSON.stringify(['local-star']);
  const merged=mergeSnapshots(local,cloud);
  assert.deepEqual(JSON.parse(merged[prefix+'lastWrong']),[`unattempted-${lesson}`]);assert.equal(JSON.parse(merged[prefix+'history']).length,2);assert.deepEqual(JSON.parse(merged[prefix+'starred']),[`star-${lesson}`,'local-star']);
  assert.deepEqual(mergeSnapshots(merged,cloud),merged,'round trip does not resurrect corrected wrong answer');
  assert.deepEqual(mergeSnapshots(merged,merged),merged,'repeated sync does not duplicate histories or answer rows');
  const legacy=mergeSnapshots({[prefix+'history']:JSON.stringify([{id:'new-id',date:'2026-01-01',results:[{questionId:'pattern-app-1',selected:0,correct:true}]}]),[prefix+'lastWrong']:'[]'},{[prefix+'lastWrong']:'["pattern-1","other-2"]'});
  assert.deepEqual(JSON.parse(legacy[prefix+'lastWrong']),['other-app-2'],'legacy review aliases cannot resurrect a corrected mistake');
}
// Drive the reading exam controller so merge fixtures use the persisted learner actions.
{
  const controller = {window:{}, JPY5:{shuffle:values=>[...values].reverse()}};
  vm.runInNewContext(await readFile('assets/reading-exam.js','utf8'),controller);
  const questions=['q1','q2'].map(id=>({id,options:['a','b'],answer:1}));
  const state={answered:{},wrong:[],attempts:[],examAnswers:{}};
  const clicks={}, inputs=questions.map(({id})=>({name:id,value:'1'}));
  const stage={
    querySelectorAll:()=>inputs,
    querySelector:selector=>({
      addEventListener:(_event,handler)=>{clicks[selector]=handler;},
      focus(){}
    })
  };
  const exam=controller.window.JPY5ReadingExam({
    state,questions,shuffle:true,save(){},render(){exam.content();exam.bind(stage);},
    prompt:q=>q.id,option:(_q,text)=>text,thresholds:[2,1]
  });
  exam.content();exam.bind(stage);
  const untouched=structuredClone(state);
  assert.equal(untouched.examRevision,undefined,'opening the exam does not claim a newer session');
  inputs[0].onchange();
  const draft=structuredClone(state);
  inputs[1].onchange();
  clicks['#submit-reading-exam']();
  const complete=structuredClone(state);
  assert(complete.examRevision>draft.examRevision);
  assert.deepEqual(complete.examResult,{score:2,total:2});
  clicks['#restart-reading-exam']();
  const restarted=structuredClone(state);
  assert(restarted.examGeneration>complete.examRevision);
  assert.equal(restarted.examResult,null);
  inputs[1].value='0'; inputs[1].onchange();
  const partial=structuredClone(state);
  assert(partial.examRevision>restarted.examRevision);
  const key='jpy5.chapter19.reading';
  const merge=(a,b)=>JSON.parse(mergeSnapshots({[key]:JSON.stringify(a)},{[key]:JSON.stringify(b)})[key]);
  function expectSession(actual,expected) {
    for(const field of ['examGeneration','examRevision','examAnswers','examOrder','examResult']) {
      assert.deepEqual(actual[field],expected[field],field);
    }
  }
  function both(a,b,winner) {
    for(const resolved of [merge(a,b),merge(b,a)])expectSession(resolved,winner);
  }
  const staleComplete={...complete,examOrder:{q1:[1,0],q2:[0,1]}};
  both(untouched,draft,draft);
  both(draft,staleComplete,staleComplete);
  both(staleComplete,restarted,restarted);
  both(staleComplete,partial,partial);
  both(restarted,partial,partial);
  both({},partial,partial);
  const legacyComplete={...staleComplete}, legacyPartial={...draft};
  delete legacyComplete.examRevision; delete legacyPartial.examRevision;
  both(legacyComplete,legacyPartial,legacyComplete);
  both(legacyPartial,untouched,legacyPartial);
  both(legacyComplete,restarted,restarted);
  const alternate={...draft,examAnswers:{q2:0},examOrder:{q1:[1,0],q2:[0,1]}};
  assert.notDeepEqual(draft.examOrder,alternate.examOrder);
  const edited={...alternate,examRevision:draft.examRevision+1};
  both(draft,edited,edited);
  const tie=merge(draft,alternate);
  assert([draft,alternate].some(candidate=>JSON.stringify(candidate.examAnswers)===JSON.stringify(tie.examAnswers)
    &&JSON.stringify(candidate.examOrder)===JSON.stringify(tie.examOrder)));
  expectSession(merge(alternate,draft),tie);
  assert.deepEqual(JSON.parse(mergeSnapshots({}, {[key]:JSON.stringify(partial)})[key]),partial);
  const otherAttempt={date:'2025-01-02',score:0,total:2,results:[]};
  const older={...staleComplete,attempts:[otherAttempt],sourceNotes:{before:'old note'}};
  const newer={...partial,sourceNotes:{after:'new note'}};
  for(const result of [merge(older,newer),merge(newer,older)]) {
    expectSession(result,partial);
    assert.deepEqual(new Set(result.attempts.map(x=>x.date)),new Set([otherAttempt.date,complete.attempts[0].date]));
    assert.deepEqual(result.sourceNotes,{before:'old note',after:'new note'});
    expectSession(merge(result,older),partial);
  }
}

// Two independent local devices and a mock owner-only Firestore document.
// No Firebase SDK, credentials, login or real cloud writes are used.
const source=(await readFile('assets/firebase-sync.mjs','utf8')).replace(/^import .*firebase-config.*;\r?\n/,'').replace(/export /g,'');
let cloud=null,transactions=0,fail=false;const observers=new Set(),refs=[];
const docSnapshot=()=>({exists:()=>Boolean(cloud),data:()=>structuredClone(cloud)});
let queue=Promise.resolve();
const firestoreSdk={doc:(db,collection,uid)=>{refs.push([collection,uid]);return {uid};},serverTimestamp:()=>123,
  getDoc:async()=>docSnapshot(),
  runTransaction:(db,callback)=>{
    const result=queue.then(async()=>{if(fail)throw new Error('mock network unavailable');let written;await callback({get:async()=>docSnapshot(),set:(ref,data)=>{written=structuredClone(data);}});cloud=written;transactions++;for(const cb of observers)cb(docSnapshot());return written.progress;});
    queue=result.catch(()=>{});return result;
  },
  onSnapshot:(ref,callback)=>{observers.add(callback);callback(docSnapshot());return()=>observers.delete(callback);}
};
function device(initial, database=firestoreSdk){
  let handle;const events={},storage=makeStorage(initial),context={console:{warn(){}},Intl,Date,JSON,Map,Set,Object,Array,navigator:{onLine:true},localStorage:storage,clearTimeout(){},setTimeout(){return 1;},window:{addEventListener:(name,cb)=>events[name]=cb},document:{querySelector:()=>null}};
  vm.runInNewContext(source,context);
  const service={db:{},auth:{},firestoreSdk:database,authSdk:{onAuthStateChanged:(auth,cb)=>handle=cb,signOut:async()=>handle(null)}};
  const sync=context.initialiseFirebaseSync(async()=>service);
  return {storage,sync,context,events,login:async(uid='fixture-owner')=>{await Promise.resolve();await handle(uid?{uid}:null);}};
}
const a=device({...fixture(19),...fixture(20),'jpy5.chapter19.quiz.activeRun':'{"id":"a-run"}'});await a.login();assert.equal(transactions,1);assert.equal(Object.keys(cloud.progress).length,12);
const b=device({'jpy5-sync-migration-fixture-owner':'merged'});await b.login();assert.deepEqual(snapshotFromStorage(b.storage),cloud.progress,'returning empty device restores both lessons');
assert.equal(a.storage.getItem('jpy5.chapter19.quiz.activeRun'),' {"id":"a-run"}'.trim(),'cloud apply leaves active run local');
const prefix='jpy5.chapter19.quiz.';
b.storage.setItem(prefix+'history',JSON.stringify([{id:'b-retry',date:'2026-10-12T00:00:00Z',mode:'exam',results:[{questionId:'q19',selected:0,correct:true}]},...JSON.parse(b.storage.getItem(prefix+'history'))]));
b.storage.setItem(prefix+'lastWrong',JSON.stringify(['unattempted-19']));b.sync.localChanged();await b.sync.flush();
assert.deepEqual(JSON.parse(a.storage.getItem(prefix+'lastWrong')),['unattempted-19'],'live second device receives correct retry without stale resurrection');
a.context.navigator.onLine=false;
a.storage.setItem('jpy5.chapter20.quiz.starred',JSON.stringify(['offline-star',...JSON.parse(a.storage.getItem('jpy5.chapter20.quiz.starred'))]));a.sync.localChanged();assert.equal(await a.sync.flush(),false);
a.context.navigator.onLine=true;fail=true;assert.equal(await a.sync.flush(),false,'failed write stays pending');fail=false;await a.events.online();
assert(JSON.parse(b.storage.getItem('jpy5.chapter20.quiz.starred')).includes('offline-star'),'reconnect uploads local progress to other device');
const c=device({'jpy5-sync-migration-fixture-owner':'merged',...fixture(20),'jpy5.chapter20.quiz.history':JSON.stringify([{id:'offline-attempt',date:'2026-10-12T01:00:00Z',results:[]}])});await c.login();
assert(JSON.parse(cloud.progress['jpy5.chapter20.quiz.history']).some(h=>h.id==='offline-attempt'),'returning login merges offline history rather than replacing it');
assert(refs.every(([collection,uid])=>collection==='jpy5Users'&&uid==='fixture-owner'));
const before=JSON.stringify(cloud);cloud={schemaVersion:999,progress:{private:'other schema'}};a.sync.localChanged();assert.equal(await a.sync.flush(),false);assert.equal(cloud.schemaVersion,999,'unknown future schema never overwritten');
assert.notEqual(before,JSON.stringify(cloud));
// Unknown schema must also block logout until the pending save succeeds.
let release;queue=new Promise(resolve=>release=resolve);const retained=JSON.stringify(cloud);
a.sync.localChanged();const inFlight=a.sync.flush(), logout=a.sync.logout();
release();
assert.equal(await inFlight,false);
await assert.rejects(logout,/未同步/);
assert.equal(a.sync.user.uid,'fixture-owner');
assert.equal(JSON.stringify(cloud),retained);

cloud=JSON.parse(before);
await a.sync.logout();
assert.equal(a.sync.user,null);
assert(!a.storage.getItem('jpy5.chapter20.quiz.starred')?.includes('offline-star'),'guest snapshot restored exactly');

const localGuestKey='jpy5.chapter13.reading', accountOnly='jpy5.chapter17.conversation';
const draft='jpy5.chapter17.quiz.activeRun';
const accountClouds=new Map();
const isolatedService={
  doc:(_db,_collection,uid)=>uid, serverTimestamp:()=>100,
  getDoc:async uid=>({exists:()=>accountClouds.has(uid),data:()=>accountClouds.get(uid)}),
  runTransaction:async (_db,write)=>write({
    get:uid=>isolatedService.getDoc(uid),
    set:(uid,data)=>accountClouds.set(uid,structuredClone(data))
  }), onSnapshot:()=>()=>{}
};
const userA='learner-a', userB='learner-b';
const shared=device({[localGuestKey]:'{"guest":1}',[draft]:'{"id":"guest"}'},isolatedService);
await shared.login(userA);
shared.storage.setItem(accountOnly,'{"owner":"A"}');
shared.storage.setItem(draft,'{"id":"draft-A"}');
shared.sync.localChanged();
await shared.sync.logout();
assert.equal(shared.storage.getItem(accountOnly),null);
assert.equal(shared.storage.getItem(draft),'{"id":"guest"}');
shared.storage.setItem(localGuestKey,'{"guest":2}');
await shared.login(userB);
assert.equal(shared.storage.getItem(accountOnly),null);
assert.equal(accountClouds.get(userB).progress[accountOnly],undefined);
await shared.login(userA);
assert.equal(shared.storage.getItem(accountOnly),'{"owner":"A"}');
assert.equal(shared.storage.getItem(draft),'{"id":"draft-A"}');
// A fresh page on the same account must keep the previous guest snapshot intact.
const reopened=device(Object.fromEntries(Array.from({length:shared.storage.length},(_,i)=>{
  const key=shared.storage.key(i);return [key,shared.storage.getItem(key)];
})),isolatedService);
await reopened.login(userA);
await reopened.sync.logout();
assert.equal(reopened.storage.getItem(localGuestKey),'{"guest":2}');
assert.equal(reopened.storage.getItem(accountOnly),null);
assert.equal(reopened.storage.getItem(draft),'{"id":"guest"}');
let enteredWrite, resumeWrite;
const entered = new Promise(resolve => enteredWrite=resolve);
const barrier = new Promise(resolve => resumeWrite=resolve);
let delayNext=false;
const switching=device({[localGuestKey]:'{"guest":3}'},{
  ...isolatedService,
  async runTransaction(db, write) {
    if(delayNext) { delayNext=false; enteredWrite(); await barrier; }
    return isolatedService.runTransaction(db,write);
  }
});
await switching.login(userA);
switching.storage.setItem(accountOnly,'{"owner":"still A"}');
switching.sync.localChanged();
delayNext=true;
const previousWrite=switching.sync.flush();
await entered;
const newLogin=switching.login('new-user');
await new Promise(resolve=>setImmediate(resolve));
resumeWrite();
assert.equal(await previousWrite,false);
await newLogin;
assert.equal(accountClouds.get('new-user').progress[localGuestKey],'{"guest":3}');
assert.equal(accountClouds.get('new-user').progress[accountOnly],undefined);
for (const initialUser of [null, userB]) {
  const legacy=device({
    'jpy5-sync-guest-progress':'{}',
    'jpy5-sync-migration-learner-a':'merged',
    [accountOnly]:'{"owner":"A"}'
  },isolatedService);
  await legacy.login(initialUser);
  if (!initialUser) await legacy.login(userB);
  assert.equal(legacy.storage.getItem(accountOnly),null);
  assert.equal(accountClouds.get(userB).progress[accountOnly],undefined);
  assert.equal(JSON.parse(legacy.storage.getItem('jpy5-sync-recovery-before-owner-tracking'))[accountOnly],'{"owner":"A"}');
}
console.log('Progress sync roundtrip, owner transitions, guest restoration, draft isolation and pending writes passed.');
