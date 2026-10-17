// Old quiz drafts stored full question signatures. Replace those with hashes
// without discarding question IDs, answers, ordering or revision ownership.
export async function migrateTeacherDraft(storage = localStorage, cryptoApi = crypto) {
  const key = 'jpy5.chapter14.quiz.activeRun';
  const raw = storage.getItem(key);
  if (!raw) return;
  let draft;
  try { draft = JSON.parse(raw); } catch { storage.removeItem(key); return; }
  if (!Array.isArray(draft?.signatures)) { storage.removeItem(key); return; }
  if (draft.signatures.every(value=>/^sha256:[a-f0-9]{64}$/.test(value))) return;
  // Clear plaintext immediately; keep the same progress with pending markers
  // while digesting. It can be restored once an authorized bank is available.
  const safe = Object.fromEntries(['version','id','mode','questionIds','index','answers','startedAt','revision'].filter(key=>Object.hasOwn(draft,key)).map(key=>[key,draft[key]]));
  const pending = JSON.stringify({...safe,signatures:draft.signatures.map(()=>null)});
  storage.setItem(key,pending);
  const hashes = await Promise.all(draft.signatures.map(async value=>{
    if(/^sha256:[a-f0-9]{64}$/.test(value))return value;
    if(typeof value!=='string')return null;
    const bytes=await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(value));
    return 'sha256:'+Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  }));
  // Do not overwrite a newer draft written by another tab during migration.
  if(storage.getItem(key)===pending)storage.setItem(key,JSON.stringify({...safe,signatures:hashes}));
}
export const teacherDraftReady = typeof window === 'undefined' ? Promise.resolve() : migrateTeacherDraft().catch(()=>{});
