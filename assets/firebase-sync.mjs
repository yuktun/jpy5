import {firebaseConfig} from './firebase-config.mjs';

const SDK='https://www.gstatic.com/firebasejs/10.14.1';
export const CLOUD_SCHEMA_VERSION=1;
export const GUEST_SNAPSHOT_KEY='jpy5-sync-guest-progress';
const migrationKey=uid=>`jpy5-sync-migration-${uid}`;
const syncableKey=key=>/^jpy5\.chapter(?:13|14|15|16|17|18)\.(?!theme$)/.test(key)||key==='jpy5-learning-guide-checklist-v1';
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
  const progress={...cloud};
  for(const [key,value] of Object.entries(local))progress[key]=key in cloud?encode(mergeValue(decode(value),decode(cloud[key]))):value;
  return progress;
}
export function cloudState(progress,updatedAt){return {schemaVersion:CLOUD_SCHEMA_VERSION,progress,updatedAt};}

async function createService(onUser){
  const [appSdk,authSdk,firestoreSdk]=await Promise.all([import(`${SDK}/firebase-app.js`),import(`${SDK}/firebase-auth.js`),import(`${SDK}/firebase-firestore.js`)]);
  const app=appSdk.getApps().length?appSdk.getApp():appSdk.initializeApp(firebaseConfig);
  let db;
  try{db=firestoreSdk.initializeFirestore(app,{localCache:firestoreSdk.persistentLocalCache({tabManager:firestoreSdk.persistentMultipleTabManager()})});}
  catch{db=firestoreSdk.getFirestore(app);}
  const auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.browserLocalPersistence);authSdk.onAuthStateChanged(auth,onUser);
  return {auth,authSdk,db,firestoreSdk};
}

function homeUi(sync){
  const guest=document.querySelector('[data-sync-guest]'),account=document.querySelector('[data-sync-account]'),name=document.querySelector('[data-sync-name]'),email=document.querySelector('[data-sync-email]'),status=document.querySelector('[data-sync-status]');
  if(!guest||!account)return;
  sync.render=({user,state='guest',message='進度保存在此裝置'})=>{
    guest.hidden=Boolean(user);account.hidden=!user;
    if(user){name.textContent=user.displayName||'Google 帳戶';email.textContent=user.email||'';status.textContent=message;status.dataset.state=state;}
  };
  document.querySelector('[data-sync-login]')?.addEventListener('click',async event=>{event.currentTarget.disabled=true;try{await sync.login();}catch(error){sync.status('error',error.message||'Google 登入失敗，請稍後再試。');}finally{event.currentTarget.disabled=false;}});
  document.querySelector('[data-sync-now]')?.addEventListener('click',()=>sync.flush());
  document.querySelector('[data-sync-logout]')?.addEventListener('click',async()=>{try{await sync.logout();}catch(error){sync.status('error',error.message||'尚有未同步進度，請連線後重試。');}});
}

export function initialiseFirebaseSync(){
  if(window.JPY5Sync)return window.JPY5Sync;
  let service,user=null,active=false,timer=null,pending=false,guestSession=false;
  const sync={
    user:null,render:null,
    status(state,message){sync.render?.({user,state,message});},
    localChanged(){if(!active)return;pending=true;sync.status('pending','尚未同步');clearTimeout(timer);timer=setTimeout(()=>sync.flush(),1200);},
    async flush(){
      if(!active||!user||!pending)return true;
      if(!navigator.onLine){sync.status('offline','等待網絡連線');return false;}
      pending=false;sync.status('syncing','同步中…');
      try{await service.firestoreSdk.setDoc(service.firestoreSdk.doc(service.db,'jpy5Users',user.uid),cloudState(snapshotFromStorage(),service.firestoreSdk.serverTimestamp()));sync.status('synced',`已同步 · ${new Intl.DateTimeFormat('zh-HK',{dateStyle:'short',timeStyle:'short'}).format(new Date())}`);return true;}
      catch(error){pending=true;sync.status(navigator.onLine?'error':'offline',navigator.onLine?'同步失敗，請重試':'等待網絡連線');console.warn('JPY5 progress sync:',error);return false;}
    },
    async login(){
      const provider=new service.authSdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
      try{return await service.authSdk.signInWithPopup(service.auth,provider);}
      catch(error){if(['auth/popup-closed-by-user','auth/cancelled-popup-request'].includes(error.code))throw new Error('已取消 Google 登入。');if(error.code==='auth/popup-blocked')throw new Error('登入視窗被封鎖，請允許彈出視窗後重試。');throw new Error('Google 登入失敗，請稍後再試。');}
    },
    async logout(){if(!await sync.flush())throw new Error('尚有未同步進度。');return service.authSdk.signOut(service.auth);}
  };
  window.JPY5Sync=sync;homeUi(sync);sync.status('guest','進度保存在此裝置');
  window.addEventListener('online',()=>sync.flush());
  createService(async nextUser=>{
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
      const cloud=doc.exists()&&doc.data().schemaVersion===CLOUD_SCHEMA_VERSION&&doc.data().progress&&typeof doc.data().progress==='object'?doc.data().progress:{};
      const marker=localStorage.getItem(migrationKey(user.uid));
      if(!marker){const merged=mergeSnapshots(local,cloud);applySnapshot(merged);localStorage.setItem(`jpy5-sync-backup-${user.uid}`,JSON.stringify({createdAt:new Date().toISOString(),local,cloud}));localStorage.setItem(migrationKey(user.uid),'merged');active=true;pending=true;await sync.flush();}
      else {if(hasProgress(cloud))applySnapshot(cloud);active=true;sync.status('synced','已同步');}
    }catch(error){sync.status('error','同步失敗，請重試');console.warn('JPY5 progress sync:',error);}
  }).catch(error=>{sync.status('unavailable','同步服務暫時不可用');console.warn('JPY5 progress sync:',error);});
  return sync;
}

function applySnapshot(progress){
  for(let index=localStorage.length-1;index>=0;index--){const key=localStorage.key(index);if(key&&syncableKey(key))localStorage.removeItem(key);}
  for(const [key,value] of Object.entries(progress||{}))if(syncableKey(key))localStorage.setItem(key,value);
}
