import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, getDoc, setDoc, deleteDoc, collection, getDocs} from 'firebase/firestore';
import {createMockUserToken} from '@firebase/util';

if(!/^(localhost|127\.0\.0\.1):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||'')) throw Error('Local emulator required');
const projectId='demo-jpy5-teacher';
const rules=await readFile('firestore.rules','utf8');
const env=await initializeTestEnvironment({projectId,firestore:{rules}});
const claims={email_verified:true,firebase:{sign_in_provider:'google.com'}};
const db=(uid,token=claims)=>uid?env.authenticatedContext(uid,token).firestore():env.unauthenticatedContext().firestore();
let checks=0;
const denied=async action=>{await assertFails(action);checks++;};
const allowed=async action=>{await assertSucceeds(action);checks++;};
try {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context=>{
    const admin=context.firestore();
    await setDoc(doc(admin,'jpy5TeacherNotes/lesson14'),{schemaVersion:2,exercises:'synthetic',adverbs:'synthetic',grammarJson:'{"synthetic":true}'});
    await setDoc(doc(admin,'jpy5TeacherNotes/lesson15'),{synthetic:true});
    await setDoc(doc(admin,'jpy5TeacherAccess/approved'),{lesson14:true});
    await setDoc(doc(admin,'jpy5TeacherAccess/disabled'),{lesson14:false});
    await setDoc(doc(admin,'jpy5TeacherAccess/malformed'),{lesson14:'true'});
  });
  for(const uid of [null,'unapproved','disabled','malformed']) await denied(getDoc(doc(db(uid),'jpy5TeacherNotes/lesson14')));
  await allowed(getDoc(doc(db('approved'),'jpy5TeacherNotes/lesson14')));
  // Field masks limit returned fields, not the document's read permission.
  // These unsigned mock tokens are accepted only by the loopback emulator.
  for(const[uid,tokenClaims,status]of[[null,claims,403],['unapproved',claims,403],['approved',claims,200],['approved',{...claims,email_verified:false},403]]){
    const headers=uid?{Authorization:`Bearer ${createMockUserToken({sub:uid,...tokenClaims},projectId)}`} : {};
    const response=await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/jpy5TeacherNotes/lesson14?mask.fieldPaths=schemaVersion`,{headers});
    assert.equal(response.status,status);checks++;
    if(status===200){const document=await response.json();assert.deepEqual(Object.keys(document.fields),['schemaVersion']);assert.equal(document.fields.schemaVersion.integerValue,'2');}
  }
  for(const claims of [{email_verified:false,firebase:{sign_in_provider:'google.com'}},{email_verified:true,firebase:{sign_in_provider:'password'}},{}]) await denied(getDoc(doc(db('approved',claims),'jpy5TeacherNotes/lesson14')));
  for(const uid of [null,'unapproved','approved']) {
    const client=db(uid);
    await denied(setDoc(doc(client,`jpy5TeacherAccess/${uid||'guest'}`),{lesson14:true}));
    await denied(getDoc(doc(client,'jpy5TeacherAccess/approved')));
    await denied(deleteDoc(doc(client,'jpy5TeacherAccess/approved')));
    await denied(setDoc(doc(client,'jpy5TeacherNotes/lesson14'),{exercises:'attempt'}));
    await denied(deleteDoc(doc(client,'jpy5TeacherNotes/lesson14')));
    await denied(getDocs(collection(client,'jpy5TeacherNotes')));
    await denied(getDoc(doc(client,'jpy5TeacherNotes/lesson15')));
    await denied(getDoc(doc(client,'jpy5TeacherNotes/lesson14/nested/content')));
  }
  // Progress ownership is neither an approval grant nor a broad wildcard allow.
  const user=db('unapproved');
  await allowed(setDoc(doc(user,'jpy5Users/unapproved'),{schemaVersion:1,progress:{synthetic:'kept'},lesson14:true}));
  await allowed(getDoc(doc(user,'jpy5Users/unapproved')));
  await denied(getDoc(doc(user,'jpy5TeacherNotes/lesson14')));
  await denied(getDoc(doc(db('approved'),'jpy5Users/unapproved')));
  await denied(setDoc(doc(db('approved'),'jpy5Users/unapproved'),{progress:{}}));
  await denied(getDoc(doc(db(null),'jpy5Users/unapproved')));
  await denied(getDocs(collection(user,'jpy5Users')));
  // Existing JPY5 subcollection ownership must survive the teacher trial.
  // An approval-shaped document inside a user's progress tree grants nothing.
  await allowed(setDoc(doc(user,'jpy5Users/unapproved/nested/approval'),{lesson14:true}));
  await denied(getDoc(doc(user,'jpy5TeacherNotes/lesson14')));
  for(const path of [
    'users/unapproved',
    'users/unapproved/progress/synthetic',
    'jpy5Users/unapproved/settings/synthetic',
    'jpy5Users/unapproved/progress/deep/nested/synthetic'
  ]) {
    await allowed(setDoc(doc(user,path),{synthetic:true}));
    await allowed(getDoc(doc(user,path)));
    await denied(getDoc(doc(db('approved'),path)));
    await denied(setDoc(doc(db('approved'),path),{synthetic:true}));
    await denied(deleteDoc(doc(db('approved'),path)));
    await denied(getDoc(doc(db(null),path)));
    await denied(setDoc(doc(db(null),path),{synthetic:true}));
    await allowed(deleteDoc(doc(user,path)));
  }
  // The other app's original subcollection permission is progress-only.
  await denied(setDoc(doc(user,'users/unapproved/other/synthetic'),{synthetic:true}));
  await denied(getDoc(doc(user,'unmatched/content')));
  await env.withSecurityRulesDisabled(context=>deleteDoc(doc(context.firestore(),'jpy5TeacherAccess/approved')));
  await denied(getDoc(doc(db('approved'),'jpy5TeacherNotes/lesson14')));
  console.log(`Firestore authorization and progress regression: ${checks} checks passed.`);
} finally {await env.cleanup();}

// Negative control: overlapping allows are ORed; a deny cannot rescue a broad allow.
const unsafe=await initializeTestEnvironment({projectId,firestore:{rules:rules.replace('match /databases/{database}/documents {','match /databases/{database}/documents { match /{path=**} { allow read: if request.auth != null; }')}});
try {await assertSucceeds(getDoc(doc(unsafe.authenticatedContext('unapproved',claims).firestore(),'jpy5TeacherNotes/lesson14'))); console.log('Overlapping-allow negative control confirmed; actual rules reject this read.');}
finally {await unsafe.cleanup();}
