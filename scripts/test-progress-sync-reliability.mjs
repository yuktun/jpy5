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
function device(initial){
  let handle;const events={},storage=makeStorage(initial),context={console:{warn(){}},Intl,Date,JSON,Map,Set,Object,Array,navigator:{onLine:true},localStorage:storage,clearTimeout(){},setTimeout(){return 1;},window:{addEventListener:(name,cb)=>events[name]=cb},document:{querySelector:()=>null}};
  vm.runInNewContext(source,context);
  const service={db:{},auth:{},firestoreSdk,authSdk:{onAuthStateChanged:(auth,cb)=>handle=cb,signOut:async()=>handle(null)}};
  const sync=context.initialiseFirebaseSync(async()=>service);
  return {storage,sync,context,events,login:async()=>{await Promise.resolve();await handle({uid:'fixture-owner'});}};
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
let release;queue=new Promise(resolve=>release=resolve);const retained=JSON.stringify(cloud);
a.sync.localChanged();const inFlight=a.sync.flush();await a.sync.logout();release();
assert.equal(await inFlight,false,'auth transition cancels a queued old-account write');
assert.equal(JSON.stringify(cloud),retained,'sign-out cannot copy guest storage into the previous account');
console.log('Lessons 19–20 sync roundtrip, history/bookmarks/wrongs, returning migration, live updates, offline retry and owner-only mock transaction tests passed.');
