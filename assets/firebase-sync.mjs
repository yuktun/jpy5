import {firebaseConfig} from './firebase-config.mjs';

const SDK='https://www.gstatic.com/firebasejs/10.14.1';
export const CLOUD_SCHEMA_VERSION=1;
export const GUEST_SNAPSHOT_KEY='jpy5-sync-guest-progress';
const migrationKey=uid=>`jpy5-sync-migration-${uid}`;
export const syncableKey=key=>/^jpy5\.chapter(?:13|14|15|16|17|18|19|20)\.(?!theme$|quiz\.activeRun$)/.test(key)||key==='jpy5-learning-guide-checklist-v1';
const clone=value=>JSON.parse(JSON.stringify(value));

export function snapshotFromStorage(storage=localStorage){
  const progress={};
  for(let index=0;index<storage.length;index++){
    const key=storage.key(index);if(key&&syncableKey(key)){const value=storage.getItem(key);if(value!==null)progress[key]=value;}
  }
  return progress;
}
export const hasProgress=progress=>Object.keys(progress||{}).length>0;
function decode(value){try{return JSON.parse(value);}catch{return value;}}
function encode(value){return typeof value==='string'?value:JSON.stringify(value);}
function mergeValue(local,cloud){
  if(Array.isArray(local)&&Array.isArray(cloud)){
    const byId=new Map();
    for(const value of cloud)byId.set(value&&typeof value==='object'&&value.id?`id:${value.id}`:`value:${JSON.stringify(value)}`,value);
    for(const value of local){const key=value&&typeof value==='object'&&value.id?`id:${value.id}`:`value:${JSON.stringify(value)}`;byId.set(key,byId.has(key)&&value&&typeof value==='object'?mergeValue(value,byId.get(key)):value);}
    return [...byId.values()];
  }
  if(local&&cloud&&typeof local==='object'&&typeof cloud==='object'){
    const result={...cloud};for(const key of Object.keys(local))result[key]=key in cloud?mergeValue(local[key],cloud[key]):local[key];return result;
  }
  return local; // Existing-device value wins only for an irreconcilable scalar conflict.
}
// This preserves every cloud-only key and merges structured records recursively. The
// current device wins an irreconcilable scalar conflict, matching Japanese Study's
// conservative local-default conflict handling.
export function mergeSnapshots(local={},cloud={}){
  const progress=Object.fromEntries(Object.entries(cloud).filter(([key])=>syncableKey(key)));
  for(const [key,value] of Object.entries(local))if(syncableKey(key))progress[key]=key in progress?encode(mergeValue(decode(value),decode(progress[key]))):value;
  for(let lesson=13;lesson<=20;lesson++){
    const prefix=`jpy5.chapter${lesson}.quiz.`,historyKey=prefix+'history',wrongKey=prefix+'lastWrong';
    const left=decode(local[historyKey]),right=decode(cloud[historyKey]);
    if(Array.isArray(left)&&Array.isArray(right)){
      // A run ID identifies one complete attempt; never combine its answer arrays.
      const attempts=new Map();
      for(const attempt of [...right,...left]){
        const key=attempt?.id||JSON.stringify(attempt),previous=attempts.get(key);
        if(!previous||String(attempt?.date||'')>=String(previous?.date||''))attempts.set(key,attempt);
      }
      progress[historyKey]=encode([...attempts.values()]);
    }
    const history=decode(progress[historyKey]);
    if(!Array.isArray(history))continue;
    history.sort((a,b)=>String(b?.date||'').localeCompare(String(a?.date||''))||String(b?.id||'').localeCompare(String(a?.id||'')));
    progress[historyKey]=encode(history);
    const wrong=decode(progress[wrongKey]);
    if(!Array.isArray(wrong))continue;
    const reviewId=id=>lesson>=18&&!/-app-(1|2)$/.test(id)?id.replace(/-(1|2)$/,'-app-$1'):id;
    // Completed attempts are immutable, dated evidence. A newer correct retry
    // removes a stale device's wrong flag; questions never retried remain wrong.
    const latest=new Map();
    for(const attempt of history)if(Array.isArray(attempt?.results))for(const result of attempt.results){
      if(typeof result?.questionId==='string'&&Number.isInteger(result.selected)&&typeof result.correct==='boolean'){
        const id=reviewId(result.questionId);if(!latest.has(id))latest.set(id,result.correct);
      }
    }
    const active=new Set(wrong.filter(id=>typeof id==='string').map(reviewId).filter(id=>latest.get(id)!==true));
    for(const [id,correct] of latest)if(!correct)active.add(id);
    progress[wrongKey]=encode([...active]);
  }
  return progress;
}
export function cloudState(progress,updatedAt){return {schemaVersion:CLOUD_SCHEMA_VERSION,progress,updatedAt};}

async function createService(){
  const [appSdk,authSdk,firestoreSdk]=await Promise.all([import(`${SDK}/firebase-app.js`),import(`${SDK}/firebase-auth.js`),import(`${SDK}/firebase-firestore.js`)]);
  const app=appSdk.getApps().length?appSdk.getApp():appSdk.initializeApp(firebaseConfig);
  let db;
  try{db=firestoreSdk.initializeFirestore(app,{localCache:firestoreSdk.persistentLocalCache({tabManager:firestoreSdk.persistentMultipleTabManager()})});}
  catch{db=firestoreSdk.getFirestore(app);}
  const auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);
  return {auth,authSdk,db,firestoreSdk};
}

function homeUi(sync){
  const guest=document.querySelector('[data-sync-guest]'),account=document.querySelector('[data-sync-account]'),name=document.querySelector('[data-sync-name]'),email=document.querySelector('[data-sync-email]'),status=document.querySelector('[data-sync-status]'),guestStatus=document.querySelector('[data-sync-guest-status]'),loginButton=document.querySelector('[data-sync-login]');
  if(!guest||!account)return;
  sync.render=({user,state='guest',message='進度保存在此裝置'})=>{
    guest.hidden=Boolean(user);account.hidden=!user;
    if(!user&&guestStatus){guestStatus.textContent=message;guestStatus.dataset.state=state;}
    if(user){name.textContent=user.displayName||'Google 帳戶';email.textContent=user.email||'';status.textContent=message;status.dataset.state=state;}
  };
  sync.setLoginReady=ready=>{if(loginButton)loginButton.disabled=!ready;};
  loginButton?.addEventListener('click',async event=>{event.currentTarget.disabled=true;sync.status('pending','正在開啟 Google 登入…');try{await sync.login();}catch(error){sync.status('error',error.message||'Google 登入失敗，請稍後再試。');}finally{event.currentTarget.disabled=!sync.ready;}});
  document.querySelector('[data-sync-now]')?.addEventListener('click',()=>sync.flush());
  document.querySelector('[data-sync-logout]')?.addEventListener('click',async()=>{try{await sync.logout();}catch(error){sync.status('error',error.message||'尚有未同步進度，請連線後重試。');}});
}

export function initialiseFirebaseSync(serviceFactory=createService){
  if(window.JPY5Sync)return window.JPY5Sync;
  let service,user=null,active=false,timer=null,pending=false,guestSession=false,unsubscribe=null,generation=0;
  const sync={
    user:null,ready:false,render:null,setLoginReady:()=>{},
    status(state,message){sync.render?.({user,state,message});},
    localChanged(){if(!active)return;pending=true;sync.status('pending','尚未同步');clearTimeout(timer);timer=setTimeout(()=>sync.flush(),1200);},
    async flush(){
      if(!active||!user||!pending)return true;
      if(!navigator.onLine){sync.status('offline','等待網絡連線');return false;}
      const epoch=generation,uid=user.uid;
      pending=false;sync.status('syncing','同步中…');
      try{
        const ref=service.firestoreSdk.doc(service.db,'jpy5Users',uid);
        const written=await service.firestoreSdk.runTransaction(service.db,async transaction=>{
          const doc=await transaction.get(ref),data=doc.exists()?doc.data():null;
          if(epoch!==generation||user?.uid!==uid)throw new Error('Account changed during progress sync');
          if(data&&data.schemaVersion!==CLOUD_SCHEMA_VERSION)throw new Error('Unsupported progress schema');
          const progress=mergeSnapshots(snapshotFromStorage(),data?.progress||{});
          transaction.set(ref,cloudState(progress,service.firestoreSdk.serverTimestamp()));return progress;
        });
        if(epoch===generation&&user?.uid===uid){applySnapshot(mergeSnapshots(snapshotFromStorage(),written));sync.status('synced',`已同步 · ${new Intl.DateTimeFormat('zh-HK',{dateStyle:'short',timeStyle:'short'}).format(new Date())}`);}
        return true;
      }
      catch(error){if(epoch!==generation)return false;pending=true;sync.status(navigator.onLine?'error':'offline',navigator.onLine?'同步失敗，請重試':'等待網絡連線');console.warn('JPY5 progress sync:',error);return false;}
    },
    async login(){
      if(!service)throw new Error('正在準備 Google 登入…');
      const provider=new service.authSdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
      try{return await service.authSdk.signInWithPopup(service.auth,provider);}
      catch(error){if(['auth/popup-closed-by-user','auth/cancelled-popup-request'].includes(error.code))throw new Error('已取消 Google 登入。');if(error.code==='auth/popup-blocked')throw new Error('登入視窗被封鎖，請允許彈出視窗後重試。');throw new Error('Google 登入失敗，請稍後再試。');}
    },
    async logout(){if(!await sync.flush())throw new Error('尚有未同步進度。');return service.authSdk.signOut(service.auth);}
  };
  window.JPY5Sync=sync;homeUi(sync);sync.status('pending','正在準備 Google 登入…');
  window.addEventListener('online',()=>sync.flush());
  const handleUser=async nextUser=>{
    const epoch=++generation;unsubscribe?.();unsubscribe=null;
    active=false;pending=false;user=nextUser;sync.user=user;
    try{
      if(!user){
        if(guestSession){const guest=decode(localStorage.getItem(GUEST_SNAPSHOT_KEY)||'{}');applySnapshot(guest);guestSession=false;}
        sync.status('guest','進度保存在此裝置');return;
      }
      const local=snapshotFromStorage();
      if(!guestSession&&!localStorage.getItem(GUEST_SNAPSHOT_KEY))localStorage.setItem(GUEST_SNAPSHOT_KEY,JSON.stringify(clone(local)));
      guestSession=true;sync.status('syncing','正在讀取雲端進度…');
      const ref=service.firestoreSdk.doc(service.db,'jpy5Users',user.uid),doc=await service.firestoreSdk.getDoc(ref);
      if(epoch!==generation)return;
      if(doc.exists()&&doc.data().schemaVersion!==CLOUD_SCHEMA_VERSION)throw new Error('Unsupported progress schema');
      const cloud=doc.exists()&&doc.data().progress&&typeof doc.data().progress==='object'?doc.data().progress:{};
      const marker=localStorage.getItem(migrationKey(user.uid));
      if(!marker){localStorage.setItem(`jpy5-sync-backup-${user.uid}`,JSON.stringify({createdAt:new Date().toISOString(),local,cloud}));localStorage.setItem(migrationKey(user.uid),'merged');}
      applySnapshot(mergeSnapshots(snapshotFromStorage(),cloud));active=true;pending=true;await sync.flush();
      if(epoch!==generation)return;
      unsubscribe=service.firestoreSdk.onSnapshot(ref,snapshot=>{
        if(epoch!==generation||!snapshot.exists())return;
        const data=snapshot.data();if(data.schemaVersion!==CLOUD_SCHEMA_VERSION)return;
        applySnapshot(mergeSnapshots(snapshotFromStorage(),data.progress||{}));
      },error=>{sync.status(navigator.onLine?'error':'offline',navigator.onLine?'同步失敗，請重試':'離線時仍可學習');console.warn('JPY5 progress sync:',error);});
    }catch(error){sync.status('error','同步失敗，請重試');console.warn('JPY5 progress sync:',error);}
  };
  serviceFactory().then(result=>{
    service=result;
    // Subscribe only after `service` is assigned: Firebase can invoke this
    // callback immediately for a persisted signed-in account.
    service.authSdk.onAuthStateChanged(service.auth,handleUser);
    sync.ready=true;sync.setLoginReady(true);sync.status('guest','進度保存在此裝置');
  }).catch(error=>{sync.ready=false;sync.setLoginReady(false);sync.status('unavailable','Google 同步服務暫時不可用');console.warn('JPY5 progress sync:',error);});
  return sync;
}

export function applySnapshot(progress,storage=localStorage){
  // Apply only supplied progress. Never clear unrelated/older learner records.
  for(const [key,value] of Object.entries(progress||{}))if(syncableKey(key))storage.setItem(key,value);
}
