import {firebaseConfig} from './firebase-config.mjs';
import {mountTeacherDemos} from './teacher-demo.mjs?v=2';
import {createAuthService} from './teacher-access.mjs';

export const grammarField='teacherGrammarOct2026Json';
const patternIds=['sai','toitta','niwatatte','uchini','nitotte','towa','nioite','wakeda','nodewanaidarouka','kke','ge'];
export async function fetchTeacherGrammar({user,signal,fetchImpl=fetch}) {
  const token=await user.getIdToken();
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  const url=new URL(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/(default)/documents/jpy5TeacherNotes/lesson14`);
  for(const field of ['schemaVersion',grammarField])url.searchParams.append('mask.fieldPaths',field);
  const response=await fetchImpl(url.href,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',credentials:'omit',redirect:'error',signal});
  if(!response.ok)throw Object.assign(new Error('Teacher grammar unavailable'),{code:response.status===403?'denied':response.status===404?'missing':'error'});
  const fields=(await response.json()).fields;
  if(fields?.schemaVersion?.integerValue!=='2')throw new Error('Unsupported teacher document');
  const serialized=fields[grammarField]?.stringValue;
  if(typeof serialized!=='string')throw Object.assign(new Error('Teacher grammar missing'),{code:'missing'});
  const data=JSON.parse(serialized);
  if(data.version!==1 || !data.notes || !patternIds.every(id=>{
    const n=data.notes[id];
    return n && ['title','text','source','pages'].every(key=>typeof n[key]==='string') && Array.isArray(n.examples) && n.examples.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(value=>typeof value==='string'));
  }))throw new Error('Invalid teacher grammar');
  return data;
}
// Build nodes as text, with explicit ruby only; never interpret server text as HTML.
function japanese(node,text) {
  let start=0;
  for(const match of text.matchAll(/\{([^{}|]+)\|([^{}|]+)\}/g)){
    node.append(document.createTextNode(text.slice(start,match.index)));
    const ruby=document.createElement('ruby'),rt=document.createElement('rt');
    ruby.append(document.createTextNode(match[1]));rt.textContent=match[2];ruby.append(rt);node.append(ruby);start=match.index+match[0].length;
  }
  node.append(document.createTextNode(text.slice(start)));
}
export function renderTeacherGrammar(content,data,root){
  const note=data.notes[root.dataset.teacherGrammarId];
  if(!note)return;
  const heading=document.createElement('h4');heading.textContent=note.title;content.append(heading);
  for(const paragraph of note.text.split(/\r?\n\s*\r?\n/)){
    const text=document.createElement('p');text.textContent=paragraph;content.append(text);
  }
  for(const [ja,zh] of note.examples){
    const example=document.createElement('div');example.className='teacher-example';
    const original=document.createElement('p');original.lang='ja';japanese(original,ja);
    const translation=document.createElement('p');translation.lang='zh-Hant';translation.textContent=zh;
    example.append(original,translation);content.append(example);
  }
  const source=document.createElement('small');source.className='teacher-source';source.textContent=`來源 · ${note.source} · 頁碼／段落 ${note.pages}`;content.append(source);
}
export const mountTeacherGrammar=(roots,serviceFactory=createAuthService)=>mountTeacherDemos(roots,serviceFactory,{
  load:(user,signal)=>fetchTeacherGrammar({user,signal}),renderNote:renderTeacherGrammar
});
if(typeof document!=='undefined'){
  const start=()=>mountTeacherGrammar(document.querySelectorAll('[data-teacher-grammar-id]'));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else void start();
}
