// Install lifecycle fixtures; no real account or OS installation is used.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile('index.html','utf8');
const source=await readFile('assets/install-app.js','utf8');
assert.doesNotMatch(html,/開啟第 14 課學習中心|install-app-card|install-app-heading/);
assert.equal((html.match(/data-install-app-section/g)||[]).length,1);
assert.match(html,/<\/nav>\s*<div class="home-install-app" data-install-app-section>/);
assert.match(html, /data-install-app>加入桌面<\/button>/);
for(const module of ['vocabulary','notes','reading','textbook','review']) assert(html.includes(`href="chapter-14-${module}.html"`));
for(let lesson=13;lesson<=20;lesson++) assert(html.includes(`href="chapter-${lesson}.html?`));
assert(html.includes('data-sync-login'));
function fixture({apple=false,ipad=false,standalone=false,navigatorStandalone=false}={}) {
 const handlers=new Map(),dialogHandlers=new Map(),buttonHandlers=new Map(),classes=new Set();
 const section={hidden:false},feedback={textContent:''},button={focus(){document.activeElement=button;}};
 const closeButton={focus(){document.activeElement=closeButton;}};
 const dialog={open:false,innerHTML:'',setAttribute(){},querySelector(){return closeButton;},addEventListener:(n,f)=>dialogHandlers.set(n,f),showModal(){assert(!this.open);this.open=true;},close(){this.open=false;dialogHandlers.get('close')?.();}};
 button.addEventListener=(n,f)=>buttonHandlers.set(n,f);
 const body={style:{},classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)},append(){}};
 const document={activeElement:button,body,querySelector:s=>({'[data-install-app-section]':section,'[data-install-app]':button,'[data-install-app-feedback]':feedback}[s]),createElement:()=>dialog};
 const window={scrollY:125,matchMedia:()=>({matches:standalone}),scrollTo(x,y){this.scrollY=y;},addEventListener:(n,f)=>handlers.set(n,f)};
 const navigator={userAgent:apple?'iPhone':'desktop',platform:ipad?'MacIntel':'Win32',maxTouchPoints:ipad?5:0,standalone:navigatorStandalone};
 vm.runInNewContext(source,{window,document,navigator});
 return {section,feedback,dialog,classes,document,button,window,handlers,dialogHandlers,click:()=>buttonHandlers.get('click')(),close:()=>dialogHandlers.get('click')({target:{closest:()=>true}})};
}
for(const options of [{},{apple:true},{ipad:true}]) {
 const f=fixture(options);
 for(let i=0;i<3;i++) {
  await f.click(); assert(f.dialog.open); assert(f.classes.has('grammar-extra-open'));
  if(options.apple||options.ipad) for(const text of ['分享','加入主畫面','開啟為網頁 App','按「加入」完成']) assert(f.dialog.innerHTML.includes(text));
  else assert(f.dialog.innerHTML.includes('瀏覽器選單或網址列'));
  if(i===1) f.dialogHandlers.get('cancel')({preventDefault(){}}); else f.close();
  assert(!f.dialog.open);assert(!f.classes.has('grammar-extra-open'));assert.equal(f.document.activeElement,f.button);assert.equal(f.window.scrollY,125);
 }
}
for(const options of [{standalone:true},{navigatorStandalone:true}]) {const f=fixture(options);assert(f.section.hidden);assert.equal(f.handlers.size,0);}
for(const outcome of ['dismissed','accepted']) {
 const f=fixture(); let prompts=0;
 f.handlers.get('beforeinstallprompt')({preventDefault(){},async prompt(){prompts++;},userChoice:Promise.resolve({outcome})});
 await f.click();assert.equal(prompts,1);assert(f.feedback.textContent.includes(outcome==='accepted'?'已開始安裝':'已取消安裝'));
 await f.click();assert(f.dialog.open);assert.equal(prompts,1);f.close();
 await f.click();f.handlers.get('appinstalled')();assert(f.section.hidden);assert(!f.dialog.open);assert(!f.classes.has('grammar-extra-open'));
}
{const f=fixture();f.handlers.get('beforeinstallprompt')({preventDefault(){},async prompt(){throw Error('fixture');}});await f.click();assert(f.feedback.textContent.includes('暫時未能'));}
console.log('Homepage install passed: one hero button, five shortcuts/eight lessons/sync retained; repeated fallback, close/Escape/focus/scroll, iPhone/iPad guidance, standalone hiding, accepted/dismissed/error/install lifecycle fixtures.');
