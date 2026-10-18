import {firebaseConfig} from './firebase-config.mjs';
import {createTeacherController,verifyTeacherAccess} from './teacher-access-core.mjs';
import {createAuthService} from './teacher-access.mjs';

// Intentionally non-secret UI demo. Never replace this literal with real notes;
// actual teacher text must continue to come from authorized server retrieval.
const demoText="Teacher's notes here";
const messages={
  'signed-out':'登入並獲核准後，才可查看老師補充。',
  ready:'正在驗證存取權限…',loading:'正在驗證存取權限…',loaded:'',
  denied:'此帳戶未獲核准，暫時無法查看老師補充。',
  missing:'老師補充暫時未能提供。',offline:'老師補充需要連線，內容已清除。',
  expired:'存取驗證已到期，請重試。',error:'暫時未能驗證存取權限，請重試。'
};
export async function mountTeacherDemos(roots,serviceFactory=createAuthService){
  roots=[...roots];if(!roots.length)return null;
  let ready=false,loginPending=false;
  const controller=createTeacherController({
    load:(user,signal)=>verifyTeacherAccess({user,signal,projectId:firebaseConfig.projectId}),
    render({state,signedIn,data,preserve}){
      for(const root of roots){
        const content=root.querySelector('[data-teacher-demo-content]'),status=root.querySelector('[data-teacher-demo-status]'),login=root.querySelector('[data-teacher-demo-login]'),retry=root.querySelector('[data-teacher-demo-retry]');
        root.dataset.accessState=state;
        if(!preserve)content.replaceChildren();
        if(data?.approved){const paragraph=document.createElement('p');paragraph.textContent=demoText;content.append(paragraph);}
        status.textContent=messages[state];status.hidden=state==='loaded';
        login.hidden=signedIn;login.disabled=!ready||loginPending;
        retry.hidden=!signedIn||!['error','missing','expired'].includes(state);
      }
    }
  });
  const resume=()=>{if(ready&&!document.hidden&&navigator.onLine)void controller.read();};
  window.addEventListener('offline',()=>controller.clear());
  window.addEventListener('online',resume);
  window.addEventListener('pagehide',()=>controller.clear());
  window.addEventListener('pageshow',resume);
  document.addEventListener('visibilitychange',()=>document.hidden?controller.clear():resume());
  try{
    const service=await serviceFactory();ready=true;
    service.subscribe(user=>{if(controller.account(user)&&user)void controller.read();});
    for(const root of roots){
      root.querySelector('[data-teacher-demo-login]').addEventListener('click',async()=>{
        if(loginPending)return;loginPending=true;controller.clear();
        try{await service.login();}catch{controller.unavailable();}
        finally{loginPending=false;for(const panel of roots)panel.querySelector('[data-teacher-demo-login]').disabled=!ready;}
      });
      root.querySelector('[data-teacher-demo-retry]').addEventListener('click',()=>controller.read());
    }
  }catch{controller.unavailable();for(const root of roots){root.querySelector('[data-teacher-demo-status]').textContent='登入服務暫時未能使用，請重新整理。';root.querySelector('[data-teacher-demo-login]').hidden=true;}}
  return controller;
}
if(typeof document!=='undefined'){
  const start=()=>mountTeacherDemos(document.querySelectorAll('[data-teacher-demo]'));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else void start();
}
