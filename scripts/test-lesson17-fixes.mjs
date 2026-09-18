import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const root=process.cwd();
const modules=["vocabulary","notes","reading","textbook","flashcards","quiz","review","history"];
for(const lesson of [13,14,15,16,17])for(const module of modules){
  const file=`chapter-${lesson}-${module}.html`;
  assert((await readdir(root)).includes(file),`missing ${file}`);
}
const hub=await readFile(`${root}/assets/ch17-hub.js`,`utf8`);
assert.match(hub,/finiteRatio\(vocabDone,152\)/);
assert.doesNotMatch(hub,/listeningDone\/0/);
assert.match(hub,/暫不評分/);
const conversation=await readFile(`${root}/assets/ch17-conversation-data.js`,`utf8`);
assert.equal((conversation.match(/[①②③④⑤⑥⑦⑧⑨]/g)||[]).length,9);
assert.match(conversation,/items:\[\]/);
for(const common of ["assets/common.js","assets/ch14-common.js","assets/ch15-common.js","assets/ch16-common.js","assets/ch17-common.js"]){
 const source=await readFile(`${root}/${common}`,"utf8");
 assert.match(source,/hour>=18\|\|hour<6/);assert.match(source,/第18課・準備中/);
}
console.log("Lesson 17 fixes passed: navigation targets, finite progress, theme boundaries, and unscored listening draft.");
