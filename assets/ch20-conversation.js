document.addEventListener("DOMContentLoaded",()=>{
  const data=window.JPY5_CONVERSATION,stage=document.querySelector("#conversation-stage"),audio=document.querySelector("#lesson-audio");
  const expressionPromptCount=data.expressionExercises.reduce((total,exercise)=>total+exercise.items.length,0);
  document.querySelector('[data-mode="prompts"]').textContent=`${data.sourcePrompts.length}個內容問題`;
  document.querySelector('[data-mode="expressions"]').textContent=`${expressionPromptCount}個表現提示`;
  const fresh=()=>({mode:"dialogue",furigana:true,drafts:{},promptNotes:{},expressionNotes:{},activityNotes:{},listenCount:0});
  let state={...fresh(),...JPY5.read("conversation",{})};
  state.drafts=state.drafts||{};state.promptNotes=state.promptNotes||{};state.expressionNotes=state.expressionNotes||{};state.activityNotes=state.activityNotes||{};
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const kanjiRun=/[\u3400-\u9fff々〆ヶ]/;
  function ruby(text){
    if(!state.furigana)return esc(text);
    const entries=Object.entries(data.furigana||{}).sort((a,b)=>b[0].length-a[0].length);
    if(!entries.length)return esc(text);
    const pattern=new RegExp(entries.map(([word])=>word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g"),map=new Map(entries);
    let output="",last=0;
    for(const match of String(text).matchAll(pattern)){
      output+=esc(String(text).slice(last,match.index));
      const word=match[0],reading=map.get(word);
      output+=kanjiRun.test(word)?`<ruby>${esc(word)}<rt>${esc(reading)}</rt></ruby>`:esc(word);
      last=match.index+word.length;
    }
    return output+esc(String(text).slice(last));
  }
  const save=()=>{JPY5.write("conversation",state);updateSummary()};
  function updateSummary(){
    document.querySelector("#saved-draft-count").textContent=Object.values(state.drafts).filter(value=>String(value).trim()).length;
    document.querySelector("#listen-count").textContent=state.listenCount||0;
  }
  function blankMarkup(text){
    let last=0,output="";const pattern=/([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬])＿+/g;
    for(const match of String(text).matchAll(pattern)){
      output+=ruby(String(text).slice(last,match.index));
      output+=`<span class="unverified-blank" title="答案待音訊核實">${match[1]}　＿＿＿＿ <small>待核實</small></span>`;
      last=match.index+match[0].length;
    }
    return output+ruby(String(text).slice(last));
  }
  function heading(kicker,title,status){return `<div class="stage-heading"><div><p class="kicker">${esc(kicker)}</p><h2>${ruby(title)}</h2></div><span>${esc(status)}</span></div>`}
  function dialogue(){
    return heading("完整會話",data.title,`${data.dialogue.length} 句 · ${data.unverifiedBlanks.length} 個未核實空欄`)+`<div class="unverified-notice"><strong>Beta · 不評分</strong><p>實線文字來自印刷會話；${data.unverifiedBlanks.length}個編號位置需要官方音訊確認，現時保持空白。</p></div><div class="dialogue-list">${data.dialogue.map(([speaker,text])=>`<article class="dialogue-row"><b>${ruby(speaker)}</b><p>${blankMarkup(text)}</p></article>`).join("")}</div>`;
  }
  function blanks(){
    return heading("聆聽工作紙",`${data.unverifiedBlanks.length}個保留空欄`,`${Object.values(state.drafts).filter(value=>String(value).trim()).length}/${data.unverifiedBlanks.length} 已寫筆記`)+`<div class="unverified-notice"><strong>只保存你的聆聽筆記</strong><p>這裡不會顯示答案、判分或標示掌握。可反覆播放完整音檔，把自己聽到的內容記下，待權威答案核實後再校對。</p></div><div class="listening-draft-list">${data.unverifiedBlanks.map(blank=>`<article class="practice-panel"><span>空欄 ${blank.id} · ${ruby(blank.speaker)}</span><h3 lang="ja">${ruby(blank.context)}</h3><label>我的聆聽筆記<input type="text" lang="ja" autocomplete="off" data-blank-draft="${blank.id}" value="${esc(state.drafts[blank.id]||"")}" placeholder="答案未核實；只記錄你聽到的內容"></label><small>答案待音訊核實</small></article>`).join("")}</div>`;
  }
  function prompts(){
    return heading("來源提示","内容を聞き取りましょう",`${data.sourcePrompts.length} 題 · 不評分`)+`<div class="unverified-notice"><strong>題目來自印刷教材，答案未核實</strong><p>先在音檔中找證據，再寫下自己的理解。筆記會保存，但不會當作正確答案或完成分數。</p></div><div class="reading-question-list">${data.sourcePrompts.map((prompt,index)=>`<article class="reading-question"><span>來源提示 ${index+1} · 答案待核實</span><h3 lang="ja">${ruby(prompt.jp)}</h3><label>我的理解<textarea rows="3" data-prompt-note="${esc(prompt.id)}" placeholder="寫下聽到的證據或暫定答案">${esc(state.promptNotes[prompt.id]||"")}</textarea></label></article>`).join("")}</div>`;
  }
  function expressions(){
    return heading("來源提示","表現を聞き取りましょう",`${expressionPromptCount} 題 · 不評分`)+`<div class="unverified-notice"><strong>找出教材指定情境中的說法</strong><p>依各提示回到音檔辨認實際表現。教材提示照錄，沒有把推測內容當成答案。</p></div>${data.expressionExercises.map((exercise,group)=>`<section class="practice-panel"><p class="kicker">${ruby(exercise.section)}</p><h3 lang="ja">${ruby(exercise.prompt)}</h3>${exercise.items.map((item,index)=>{const key=`${group}-${index}`;return `<label class="expression-note"><span>${index+1}. ${ruby(item)}</span><textarea rows="2" data-expression-note="${key}" placeholder="記錄你聽到的表現或語氣">${esc(state.expressionNotes[key]||"")}</textarea></label>`}).join("")}<small>答案待音訊核實</small></section>`).join("")}`;
  }
  function guide(){
    return heading("LISTENING GUIDE","不猜答案的練習方法","完整音檔可用")+`<div class="review-path listening-guide"><article><b>01</b><div><span>不看原文</span><h2>先聽人物與場景</h2><p>辨認說話人物、場景及訪談／活動的流程。</p></div></article><article><b>02</b><div><span>對照印刷會話</span><h2>第二次追蹤印刷空欄</h2><p>只記錄確實聽到的音，不用文法直覺補完整句子。</p></div></article><article><b>03</b><div><span>內容理解</span><h2>回到來源內容提示</h2><p>在筆記中寫下支持答案的會話片段，而不是只寫結論。</p></div></article><article><b>04</b><div><span>表現觀察</span><h2>比較人物立場與語氣</h2><p>留意說話者的立場、回應方式、句尾與語氣。</p></div></article></div><p class="source-status-line"><b>目前限制：</b>沒有經核實的空欄答案、理解題答案或單句時間碼，因此沒有自動評分、答案揭示、單句重播或「已掌握」統計。</p>`;
  }
  function activities(){
    return heading("教材活動",data.sourceFollowUps.map(activity=>activity.section).join("・"),`${data.sourceFollowUps.length} 項 · 不計分`)+'<div class="listening-draft-list">'+data.sourceFollowUps.map(activity=>`<article class="practice-panel"><span>教材活動 · 不計分</span><h3 lang="ja">${ruby(activity.section)}</h3>${(activity.content||[]).map(block=>`<p lang="ja">${ruby(block)}</p>`).join("")}${activity.imagePrompts?`<p>教材有${activity.imagePrompts}幅圖（印刷第${activity.imagePromptPrintedPage}頁）；請由下方原課本連結對照圖像。</p>`:""}${activity.blankCount?`<p>${activity.blankCount}個空欄可到「空欄」模式保存草稿；答案待音訊核實。</p>`:""}<label>我的練習筆記（不計分）<textarea rows="3" data-activity-note="${esc(activity.id)}">${esc(state.activityNotes[activity.id]||'')}</textarea></label><small>來源狀態：${activity.answerStatus.includes("not_scored")?"開放式活動，不計分":"答案待音訊核實"}；筆記不是教材答案。</small></article>`).join('')+'</div>';
  }
  const renderers={dialogue,blanks,prompts,expressions,activities,guide};
  function bind(){
    stage.querySelectorAll("[data-activity-note]").forEach(input=>input.oninput=()=>{state.activityNotes[input.dataset.activityNote]=input.value;save()});
    stage.querySelectorAll("[data-blank-draft]").forEach(input=>input.addEventListener("input",()=>{state.drafts[input.dataset.blankDraft]=input.value;save()}));
    stage.querySelectorAll("[data-prompt-note]").forEach(input=>input.addEventListener("input",()=>{state.promptNotes[input.dataset.promptNote]=input.value;save()}));
    stage.querySelectorAll("[data-expression-note]").forEach(input=>input.addEventListener("input",()=>{state.expressionNotes[input.dataset.expressionNote]=input.value;save()}));
  }
  function render(){document.querySelectorAll("[data-mode]").forEach(button=>button.classList.toggle("active",button.dataset.mode===state.mode));stage.innerHTML=(renderers[state.mode]||dialogue)();bind()}
  document.querySelectorAll("[data-mode]").forEach(button=>button.onclick=()=>{state.mode=button.dataset.mode;save();render()});
  document.querySelector("#furigana-toggle").onclick=event=>{state.furigana=!state.furigana;event.currentTarget.textContent=`假名 ${state.furigana?"ON":"OFF"}`;save();render()};
  document.querySelector("#furigana-toggle").textContent=`假名 ${state.furigana?"ON":"OFF"}`;
  document.querySelector("#reset-conversation").onclick=()=>{if(confirm("只清除第 20 課聆聽筆記及本頁設定？")){state=fresh();JPY5.remove("conversation");document.querySelector("#furigana-toggle").textContent="假名 ON";render();updateSummary()}};
  audio.addEventListener("error",()=>{document.querySelector("#audio-status").textContent="官方音檔暫時未能播放；可開啟下方完整MP3連結重試。答案仍未核實。"});
  audio.addEventListener("play",()=>{state.listenCount=(state.listenCount||0)+1;save()});
  updateSummary();render();
});
