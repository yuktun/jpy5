document.addEventListener("DOMContentLoaded",()=>{
  const data=window.JPY5_CONVERSATION,stage=document.querySelector("#conversation-stage"),audio=document.querySelector("#lesson-audio");
  const fresh=()=>({stateVersion:3,mode:"dialogue",furigana:true,drafts:{},promptNotes:{},expressionNotes:{},activityNotes:{},replayProgress:{},listenCount:0});
  const stored=JPY5.read("conversation",{}),legacyModes={prompts:"comprehension",expressions:"comprehension"};
  let state={...fresh(),...stored};
  state.mode=legacyModes[state.mode]||state.mode;state.stateVersion=3;
  for(const key of ["drafts","promptNotes","expressionNotes","activityNotes","replayProgress"])state[key]=state[key]||{};
  if(stored.activityDrafts)state.activityNotes={...stored.activityDrafts,...state.activityNotes};
  if(String(state.activityNotes.challenge||"").trim()&&!String(state.activityNotes["activity-6"]||"").trim())state.activityNotes["activity-6"]=state.activityNotes.challenge;
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const kanjiRun=/[\u3400-\u9fff々〆ヶ]/;
  function ruby(text){
    if(!state.furigana)return esc(text);
    const entries=Object.entries(data.furigana||{}).sort((a,b)=>b[0].length-a[0].length);
    if(!entries.length)return esc(text);
    const pattern=new RegExp(entries.map(([word])=>word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g"),map=new Map(entries);
    let output="",last=0;
    for(const match of String(text).matchAll(pattern)){output+=esc(String(text).slice(last,match.index));const word=match[0],reading=map.get(word);output+=kanjiRun.test(word)?`<ruby>${esc(word)}<rt>${esc(reading)}</rt></ruby>`:esc(word);last=match.index+word.length}
    return output+esc(String(text).slice(last));
  }
  const lines=text=>ruby(text).replace(/\n/g,"<br>"),save=()=>{JPY5.write("conversation",state);updateSummary()};
  function updateSummary(){document.querySelector("#saved-draft-count").textContent=Object.values(state.drafts).filter(value=>String(value).trim()).length;document.querySelector("#listen-count").textContent=state.listenCount||0}
  function heading(kicker,title,status){return `<div class="stage-heading"><div><p class="kicker">${esc(kicker)}</p><h2>${ruby(title)}</h2></div><span>${esc(status)}</span></div>`}
  const circled="①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬";
  function targetMarkup(text){
    let last=0,output="";const pattern=/([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬])＿+/g;
    for(const match of String(text).matchAll(pattern)){output+=ruby(String(text).slice(last,match.index));const id=circled.indexOf(match[1])+1,target=data.listeningTargets.find(item=>item.id===id);output+=`${match[1]}<mark class="verified-answer" data-answer-span="${id}">${ruby(target.answer)}</mark>`;last=match.index+match[0].length}
    return output+ruby(String(text).slice(last));
  }
  function dialogue(){return heading("完整會話",data.title,"20 句 · 13 個已核實表現")+`<div class="verified-notice"><strong>課本解答＋官方音訊核實</strong><p>綠色標記只涵蓋原空欄的答案表現；每個表現均可獨立重播。</p></div><div class="dialogue-list">${data.dialogue.map(([speaker,text])=>{const ids=[...text.matchAll(/([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬])＿+/g)].map(match=>circled.indexOf(match[1])+1);return `<article class="dialogue-row"><b>${ruby(speaker)}</b><p>${targetMarkup(text)}</p>${ids.length?`<div class="dialogue-row-actions">${ids.map(id=>`<button class="listen-button" type="button" data-listen-target="${id}">▶ 播放這句 ${id}</button>`).join("")}</div>`:""}</article>`}).join("")}</div>`}
  function translation(){return heading("全文中文翻譯",data.title,`${data.translation.length} 句完整譯文`)+`<div class="dialogue-list translation-list">${data.translation.map(([speaker,text])=>`<article class="dialogue-row"><b>${esc(speaker)}</b><p lang="zh-Hant">${esc(text)}</p></article>`).join("")}</div>`}
  function answerToggle(id,label="課本官方答案 / 課本解答"){return `<button class="secondary-button" type="button" data-answer-toggle="${id}" aria-expanded="false">答案を見る / 顯示答案</button><div class="reference-answer" data-answer-panel="${id}" hidden><b>${esc(label)}</b>`}
  function comprehensionCard(item,noteType,noteKey){const attr=noteType==="prompt"?"data-prompt-note":"data-expression-note",notes=noteType==="prompt"?state.promptNotes:state.expressionNotes;return `<article class="textbook-answer-card"><span>${esc(item.number)}</span><h3>${ruby(item.jp||item.q)}</h3><label>自己的聆聽筆記<textarea rows="3" ${attr}="${esc(noteKey)}">${esc(notes[noteKey]||"")}</textarea></label>${answerToggle(item.id)}<p>${ruby(item.answer)}</p></div></article>`}
  function comprehension(){
    const content=`<section class="textbook-listen-section"><div class="section-divider"><p class="kicker">課本原題</p><h2>2. 聞いてみよう</h2><p>1）内容を聞き取りましょう。</p></div><div class="textbook-answer-grid">${data.sourcePrompts.map(item=>comprehensionCard(item,"prompt",item.id)).join("")}</div></section>`;
    const expressionGroups=data.expressionExercises.map((group,groupIndex)=>`<section class="activity-group"><h3>${ruby(group.prompt)}</h3><div class="textbook-answer-grid">${group.items.map((item,itemIndex)=>comprehensionCard(item,"expression",`${groupIndex}-${itemIndex}`)).join("")}</div></section>`).join("");
    return heading("理解練習","2. 聞いてみよう","5 個內容問題 · 5 個表現問題")+`<div class="textbook-no-grade"><strong>先聽、再寫、最後揭示</strong><p>答案預設隱藏；顯示答案不會改寫你的筆記。</p></div>${content}<section class="textbook-listen-section"><div class="section-divider"><p class="kicker">課本原題</p><h2>2）表現を聞き取りましょう。</h2></div>${expressionGroups}</section>`;
  }
  function activityTask(item){
    const picture=item.pictureRequired?`<p class="ch17-picture-note">※ 圖畫是課本活動不可缺少的一部分。請配合<a href="${esc(JPY5.sources.textbook)}" target="_blank" rel="noopener">原課本</a>完成；本頁不以文字臆造圖中內容。</p>`:"";
    const model=item.noModel?"":`${answerToggle(item.id,item.modelLabel)}<p>${lines(item.model)}</p></div>`;
    return `<article class="textbook-task-card"><span>${esc(item.number||"")}</span><p class="textbook-prompt">${lines(item.prompt)}</p>${picture}<label>準備筆記／自己的說法<textarea rows="6" data-activity-note="${item.id}">${esc(state.activityNotes[item.id]||"")}</textarea></label>${model}</article>`;
  }
  function legacySectionNote(key){
    if(!key||!Object.prototype.hasOwnProperty.call(state.activityNotes,key))return "";
    return `<article class="practice-panel"><span>舊版保存的本節備註</span><p>這是升級前保存在整個本節的筆記，未自動分配到任何單一題目。</p><label>本節備註<textarea rows="4" data-activity-note="${esc(key)}" data-legacy-activity-note="${esc(key)}">${esc(state.activityNotes[key]||"")}</textarea></label></article>`;
  }
  function activities(){
    const sections=data.textbookActivities.map(section=>`<section class="textbook-activity-card"><header><span>${esc(section.label)}</span><h2>${ruby(section.section)}</h2></header>${section.intro?`<p class="textbook-activity-intro">${lines(section.intro)}</p>`:""}${legacySectionNote(section.legacyNoteKey)}${section.items.map(activityTask).join("")}</section>`).join("");
    return heading("課本活動","1・4・5・6","自由口說 · 不作嚴格評分")+`<div class="textbook-activity-list">${sections}</div>`;
  }
  function focus(){return heading("重點句子","十三個已核實表現","官方音訊單句重播")+`<div class="focus-grid">${data.listeningTargets.map(target=>`<article class="focus-card"><span>${target.id} · ${ruby(target.speaker)}</span><h3>${ruby(target.answer)}</h3><p>${ruby(target.context)}</p><button class="listen-button" type="button" data-listen-target="${target.id}">▶ 播放這句</button><small>${target.start.toFixed(2)}–${target.end.toFixed(2)} 秒</small></article>`).join("")}</div>`}
  const normalize=value=>String(value||"").normalize("NFKC").toLowerCase().replace(/[\s、。！？!?・,.]/g,"");
  function blanks(){return heading("會話填寫","3. もう一度聞こう",`${Object.values(state.drafts).filter(value=>String(value).trim()).length}/13 已寫答案`)+`<div class="textbook-no-grade"><strong>十三個空欄均已核實</strong><p>可寬鬆核對或揭示課本答案；揭示不會覆寫輸入。</p></div>${legacySectionNote("repeat")}<div class="listening-draft-list">${data.listeningTargets.map(target=>`<article class="practice-panel"><span>空欄 ${target.id} · ${ruby(target.speaker)}</span><h3>${ruby(target.context)}</h3><label>我的答案<input type="text" lang="ja" autocomplete="off" data-blank-draft="${target.id}" value="${esc(state.drafts[target.id]||"")}"></label><div class="ch17-blank-actions"><button class="secondary-button" type="button" data-check-blank="${target.id}">核對</button><button class="secondary-button" type="button" data-answer-toggle="blank-${target.id}" aria-expanded="false">答案を見る / 顯示答案</button><button class="listen-button" type="button" data-listen-target="${target.id}">▶ 播放這句</button></div><p class="blank-feedback" data-blank-feedback="${target.id}"></p><div class="reference-answer" data-answer-panel="blank-${target.id}" hidden><b>課本官方答案 / 課本解答</b><p>${ruby(target.answer)}</p></div></article>`).join("")}</div>`}
  function guide(){return heading("LISTENING GUIDE","完成版練習方法","課本・解答冊・官方音訊已核實")+`<div class="review-path listening-guide"><article><b>01</b><div><span>完整會話</span><h2>先聽人物與場景</h2><p>保留20句完整會話作為第一個、預設模式。</p></div></article><article><b>02</b><div><span>精聽十三句</span><h2>逐段重播答案表現</h2><p>每次只播放綠色標記的原空欄範圍。</p></div></article><article><b>03</b><div><span>課本問題</span><h2>先寫自己的理解</h2><p>揭示官方答案不會覆寫筆記。</p></div></article><article><b>04</b><div><span>口說延伸</span><h2>練習抱怨、道歉與和好</h2><p>完成課本1・4・5・6活動，開放題不作嚴格評分。</p></div></article></div><p class="source-status-line verified-source-line"><b>核實狀態：</b>十三個答案及其官方音訊重播區間均已逐項整理；非官方教學內容另有明確標示。</p>`}
  const renderers={dialogue,translation,comprehension,activities,focus,blanks,guide};
  let replaySerial=0,activeStop=null;
  function cancelReplay(){replaySerial++;if(activeStop){audio.removeEventListener("timeupdate",activeStop);activeStop=null}}
  function playTarget(id){
    const target=data.listeningTargets.find(item=>item.id===Number(id));if(!target)return;
    cancelReplay();const serial=replaySerial;audio.currentTime=target.start;
    activeStop=()=>{if(serial!==replaySerial)return;if(audio.currentTime>=target.end){audio.pause();audio.currentTime=target.end;audio.removeEventListener("timeupdate",activeStop);activeStop=null}};
    audio.addEventListener("timeupdate",activeStop);state.replayProgress[target.id]=(state.replayProgress[target.id]||0)+1;save();audio.play().catch(()=>{});
  }
  function bind(){
    stage.querySelectorAll("[data-listen-target]").forEach(button=>button.onclick=()=>playTarget(button.dataset.listenTarget));
    stage.querySelectorAll("[data-blank-draft]").forEach(input=>input.addEventListener("input",()=>{state.drafts[input.dataset.blankDraft]=input.value;save()}));
    stage.querySelectorAll("[data-prompt-note]").forEach(input=>input.addEventListener("input",()=>{state.promptNotes[input.dataset.promptNote]=input.value;save()}));
    stage.querySelectorAll("[data-expression-note]").forEach(input=>input.addEventListener("input",()=>{state.expressionNotes[input.dataset.expressionNote]=input.value;save()}));
    stage.querySelectorAll("[data-activity-note]").forEach(input=>input.addEventListener("input",()=>{state.activityNotes[input.dataset.activityNote]=input.value;save()}));
    stage.querySelectorAll("[data-answer-toggle]").forEach(button=>button.onclick=()=>{const panel=stage.querySelector(`[data-answer-panel="${button.dataset.answerToggle}"]`);panel.hidden=!panel.hidden;button.setAttribute("aria-expanded",String(!panel.hidden));button.textContent=panel.hidden?"答案を見る / 顯示答案":"答案を隠す / 隱藏答案"});
    stage.querySelectorAll("[data-check-blank]").forEach(button=>button.onclick=()=>{const target=data.listeningTargets.find(item=>item.id===Number(button.dataset.checkBlank)),value=state.drafts[target.id]||"",accepted=[target.answer,...(target.variants||[])].map(normalize),feedback=stage.querySelector(`[data-blank-feedback="${target.id}"]`);feedback.textContent=!normalize(value)?"請先寫下聽到的內容。":accepted.includes(normalize(value))?"與課本答案一致。":"再聽一次，或顯示答案作比較。";feedback.className=`blank-feedback ${accepted.includes(normalize(value))?"correct":""}`});
  }
  function render(){document.querySelectorAll("[data-mode]").forEach(button=>button.classList.toggle("active",button.dataset.mode===state.mode));stage.innerHTML=(renderers[state.mode]||dialogue)();bind()}
  document.querySelectorAll("[data-mode]").forEach(button=>button.onclick=()=>{state.mode=button.dataset.mode;save();render()});
  document.querySelector("#furigana-toggle").onclick=event=>{state.furigana=!state.furigana;event.currentTarget.textContent=`假名 ${state.furigana?"ON":"OFF"}`;save();render()};
  document.querySelector("#furigana-toggle").textContent=`假名 ${state.furigana?"ON":"OFF"}`;
  document.querySelector("#reset-conversation").onclick=()=>{if(confirm("只清除第 18 課聆聽筆記及本頁設定？")){cancelReplay();state=fresh();JPY5.remove("conversation");document.querySelector("#furigana-toggle").textContent="假名 ON";render();updateSummary()}};
  audio.addEventListener("play",()=>{state.listenCount=(state.listenCount||0)+1;save()});
  audio.addEventListener("pause",()=>{if(activeStop)cancelReplay()});
  save();render();
});
