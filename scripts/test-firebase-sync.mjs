import assert from 'node:assert/strict';
import {CLOUD_SCHEMA_VERSION,cloudState,hasProgress,mergeSnapshots} from '../assets/firebase-sync.mjs';

const local={
  'jpy5.chapter13.vocabulary.cards.v2':JSON.stringify({results:{word1:{correct:2}}}),
  'jpy5.chapter14.quiz.history':JSON.stringify([{id:'local',score:8}])
};
const cloud={
  'jpy5.chapter13.vocabulary.cards.v2':JSON.stringify({results:{word2:{correct:1}}}),
  'jpy5.chapter15.conversation':JSON.stringify({attempts:2}),
  'jpy5.chapter14.quiz.history':JSON.stringify([{id:'cloud',score:7}])
};
const merged=mergeSnapshots(local,cloud);
assert.deepEqual(JSON.parse(merged['jpy5.chapter13.vocabulary.cards.v2']).results,{word2:{correct:1},word1:{correct:2}},'first login keeps local and cloud vocabulary records');
assert.deepEqual(JSON.parse(merged['jpy5.chapter14.quiz.history']).map(item=>item.id).sort(),['cloud','local'],'first login keeps both quiz histories');
assert.equal(merged['jpy5.chapter15.conversation'],cloud['jpy5.chapter15.conversation'],'cloud-only progress restores on an empty local device');
assert.equal(hasProgress({}),false,'empty local state remains a valid guest state');
assert.equal(hasProgress(local),true,'existing guest progress is detected for upload');
const record=cloudState(merged,'server timestamp');
assert.equal(record.schemaVersion,CLOUD_SCHEMA_VERSION,'cloud documents carry a version for future migration');
assert.deepEqual(record.progress,merged,'the document stores the exact existing localStorage payloads without rewriting lesson schemas');
console.log('Firebase sync adapter tests passed.');
