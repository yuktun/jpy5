document.addEventListener("DOMContentLoaded", () => {
  const data=window.JPY5_READING, stage=document.querySelector("#reading-stage");
  const teacherData=window.JPY5_READING_TEACHER_NOTES;
  const defaults=()=>({mode:"original",font:1,furigana:true,answered:{},wrong:[],vocabIndex:0,vocabFlipped:false,attempts:[],examAnswers:{},textbookDrafts:{}});
  let state={...defaults(),...JPY5.read("reading",{})}, findIndex=0;
  const esc=v=>String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const save=()=>JPY5.write("reading",state);
  const kanjiRun=/[\u3400-\u9fff々〆ヶ]/;
  function segmentedRuby(word,reading){
    const explicit=data.furiganaSegments?.[word];
    if(explicit)return explicit.map(([base,kana])=>kana===undefined?esc(base):`<ruby>${esc(base)}<rt>${esc(kana)}</rt></ruby>`).join("");
    if(!kanjiRun.test(word))return esc(word);
    const parts=word.match(/[\u3400-\u9fff々〆ヶ]+|[^\u3400-\u9fff々〆ヶ]+/g)||[word];
    if(parts.length===1)return `<ruby>${esc(word)}<rt>${esc(reading)}</rt></ruby>`;
    let remaining=reading;
    return parts.map((part,index)=>{
      if(!kanjiRun.test(part)){
        const at=remaining.indexOf(part);
        if(at===0)remaining=remaining.slice(part.length);
        return esc(part);
      }
      const next=parts.slice(index+1).find(piece=>!kanjiRun.test(piece));
      const length=next?Math.max(0,remaining.indexOf(next)):remaining.length;
      const kana=remaining.slice(0,length);
      remaining=remaining.slice(length);
      return `<ruby>${esc(part)}<rt>${esc(kana)}</rt></ruby>`;
    }).join("");
  }
  function ruby(text,{furiganaContext,furiganaOverrides=[]}={}){
    if(!state.furigana)return esc(text);
    const readings=new Map(Object.entries(data.furigana));
    Object.entries(data.furiganaContexts?.[furiganaContext]||{}).forEach(([word,reading])=>readings.set(word,reading));
    const words=[...readings.keys()].sort((a,b)=>b.length-a.length);
    const pattern=new RegExp(words.map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g");
    let out="",last=0,occurrences=new Map;
    for(const match of String(text).matchAll(pattern)){
      out+=esc(String(text).slice(last,match.index));
      const occurrence=(occurrences.get(match[0])||0)+1;
      occurrences.set(match[0],occurrence);
      const override=furiganaOverrides.find(entry=>entry.word===match[0]&&entry.occurrence===occurrence);
      out+=segmentedRuby(match[0],override?.reading||readings.get(match[0]));
      last=match.index+match[0].length;
    }
    return out+esc(String(text).slice(last));
  }
  function shell(title,subtitle,body){return `<div class="reading-stage-head"><div><p class="kicker">第 13 課</p><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:""}</div></div>${body}`}
  const paragraphRuby=p=>ruby(p.jp,{furiganaContext:p.furiganaContext,furiganaOverrides:p.furiganaOverrides});
  const questionRuby=q=>ruby(q.q,{furiganaContext:q.revealTsukigime!==false?"monthlyParking":undefined});
  const optionText=(question,option)=>question.optionLanguage==="zh"?esc(option):ruby(option);
  const rubyLines=(text,options)=>ruby(text,options).replace(/\n/g,"<br>");
  function original(){
    return shell(ruby(data.title),"先掌握時間線：來日初期 → 活動範圍擴大 → 在日第六年解開誤會。",`<article class="reading-paper" style="--reading-size:${[.98,1.1,1.24][state.font]}rem"><div class="reading-badge">第13課</div>${data.paragraphs.map(p=>`<p data-paragraph="${p.id}">${paragraphRuby(p)}</p>`).join("")}<footer>（${ruby(data.author)}）</footer>`);
  }
  function translation(){
    return shell("繁體中文翻譯","段落編號與日文原文完全對應。",`<div class="translation-list">${data.paragraphs.map(p=>`<article><span>0${p.id}</span><p>${esc(p.zh)}</p></article>`).join("")}</div>`);
  }
  function questionCards(){
    const exercises=data.textbookExercises;
    const blank=(sectionId,itemIndex,answerIndex)=>`<label class="textbook-blank"><span class="sr-only">第 ${itemIndex+1} 題空格 ${answerIndex+1}</span><input type="text" autocomplete="off" data-textbook-draft="${sectionId}-${itemIndex}-${answerIndex}" aria-label="第 ${itemIndex+1} 題空格 ${answerIndex+1}"></label>`;
    const answerBlock=(section,body)=>`<button type="button" class="textbook-answer-toggle" data-textbook-answer-toggle="${section.id}" aria-expanded="false" aria-controls="textbook-answer-${section.id}">答案を見る / 顯示答案</button><div class="textbook-answer" id="textbook-answer-${section.id}" hidden><span>參考答案</span>${body}</div>`;
    const sections=exercises.sections.map(section=>{
      let body="",answers="";
      if(section.id==="timeline"){
        body=`<ol class="textbook-timeline-list">${section.items.map((item,i)=>`<li><label><input type="number" min="1" max="5" inputmode="numeric" aria-label="第 ${i+1} 項時間順序"><span lang="ja">${ruby(item.text)}</span></label></li>`).join("")}</ol>`;
        answers=`<ol>${section.items.map(item=>`<li><b>${esc(item.answer)}</b>　<span lang="ja">${ruby(item.text)}</span></li>`).join("")}</ol>`;
      }else if(section.id==="completion"){
        body=`<ol class="textbook-completion-list">${section.items.map((item,i)=>`<li lang="ja">${item.parts.map((part,n)=>`${ruby(part)}${n<item.answers.length?blank(section.id,i,n):""}`).join("")}</li>`).join("")}</ol>`;
        answers=`<ol>${section.items.map(item=>`<li lang="ja">${item.answers.map(answer=>ruby(answer,{furiganaContext:"monthlyParking"})).join(" ／ ")}</li>`).join("")}</ol>`;
      }else{
        body=`<ol class="textbook-free-response-list">${section.items.map((item,i)=>`<li>${item.text?`<p lang="ja">${ruby(item.text)}</p>`:""}<label><span>我的答案（不計分）</span><textarea rows="3" data-textbook-draft="${section.id}-${i}" aria-label="${esc(section.instruction)} 第 ${i+1} 題"></textarea></label></li>`).join("")}</ol>`;
        answers=`<ol>${section.items.map(item=>`<li lang="ja">${ruby(item.answer,{furiganaContext:"monthlyParking"})}</li>`).join("")}</ol>`;
      }
      return `<article class="textbook-exercise" data-textbook-section="${section.id}"><header><span>${exercises.sourceLabel} · ${section.number}</span><h3 lang="ja">${ruby(section.instruction)}</h3>${section.note?`<p lang="ja">${ruby(section.note)}</p>`:""}</header>${body}${answerBlock(section,answers)}</article>`;
    }).join("");
    const checkGroup=`<section class="textbook-activity-group"><header class="textbook-activity-heading"><span>${exercises.sourceLabel}</span><h2 lang="ja">${ruby(exercises.title)}</h2><p>按課文內容整理時間線、完成句子並回答問題；自由記述不作嚴格自動評分。</p></header><aside class="textbook-no-grade"><strong>作答說明</strong><p lang="ja">${ruby(exercises.note)}</p></aside><div class="textbook-exercise-list">${sections}</div></section>`;
    const modelBlock=(activity,item,index)=>{
      const id=`textbook-model-${activity.id}-${item.id}`;
      let content="";
      if(item.kind==="open"){
        content=`${item.modelAnswer.map(paragraph=>`<p lang="ja">${rubyLines(paragraph,{furiganaContext:"monthlyParking"})}</p>`).join("")}<aside class="textbook-learning-tip"><strong>學習提示</strong><p>${esc(item.tip)}</p></aside>`;
      }else if(item.kind==="research"){
        content=`${item.modelIntro.map(paragraph=>`<p lang="ja">${rubyLines(paragraph)}</p>`).join("")}<dl class="textbook-reading-examples">${item.readings.map(group=>`<div><dt>${esc(group.reading)}</dt><dd>${group.examples.map(example=>`<span lang="ja">${ruby(example)}</span>`).join("")}</dd></div>`).join("")}</dl><h4>発表例</h4><p lang="ja">${rubyLines(item.presentation)}</p><p class="textbook-reference-note" lang="ja">${rubyLines(item.note)}</p>`;
      }else{
        content=item.modelAnswers.map((answer,answerIndex)=>`<section class="textbook-model-example"><h4>參考回答例 ${answerIndex+1}</h4>${answer.map(paragraph=>`<p lang="ja">${rubyLines(paragraph,{furiganaContext:"monthlyParking"})}</p>`).join("")}</section>`).join("");
      }
      return `<button type="button" class="textbook-model-toggle" data-textbook-model-toggle="${id}" aria-expanded="false" aria-controls="${id}">參考回答例を見る</button><div class="textbook-model-answer" id="${id}" hidden><span>參考回答例</span>${content}</div>`;
    };
    const activityGroups=data.textbookActivities.map(activity=>`<section class="textbook-activity-group"><header class="textbook-activity-heading"><span>${activity.sourceLabel}</span><h2 lang="ja">${ruby(`${activity.number}. ${activity.title}`)}</h2><p>${activity.id==="think-speak"?"先整理自己的想法，再練習口頭發表。":"用自己的經驗介紹一個讀法出乎意料的漢字詞。"}</p></header><div class="textbook-activity-cards">${activity.items.map((item,index)=>`<article class="textbook-activity-card"><span>${activity.number}.${index+1} · 不計分</span><h3 lang="ja">${rubyLines(item.prompt)}</h3><label class="textbook-draft-label"><span>${item.kind==="research"?"我的查考與發表準備":"我的回答準備"}（不計分）</span><textarea rows="${item.kind==="research"?8:6}" data-textbook-draft="activity-${item.id}" aria-label="${esc(activity.title)} ${index+1} 我的回答"></textarea></label>${modelBlock(activity,item,index)}</article>`).join("")}</div></section>`).join("");
    return shell("課本「読む・書く」原題",`<span class="textbook-source-label">課本原題</span> 依課本順序完成第 3～5 部分；所有開放題均不作自動評分。`,`<div class="textbook-activities">${checkGroup}${activityGroups}</div>`);
  }
  function teacherText(paragraph){
    const targets=(paragraph.annotations||[]).map((item,index)=>({...item,index,start:-1}));
    const counts=new Map;
    targets.forEach(target=>{
      const seen=(counts.get(target.text)||0)+1; counts.set(target.text,seen);
      let from=0, found=-1;
      for(let i=0;i<(target.occurrence||seen);i++){found=paragraph.jp.indexOf(target.text,from);from=found+target.text.length}
      target.start=found;
    });
    const ordered=targets.filter(t=>t.start>=0).sort((a,b)=>a.start-b.start||b.text.length-a.text.length);
    let position=0, html="";
    ordered.forEach(target=>{
      if(target.start<position)return;
      html+=ruby(paragraph.jp.slice(position,target.start),{furiganaContext:"monthlyParking"});
      const note=teacherData.notes[target.note];
      const context=["earlyTsuki","finalTsukiSourceReading"].includes(target.note)?"misreadMonthlyParking":"monthlyParking";
      html+=`<button type="button" class="teacher-annotation teacher-annotation--${esc(note.type||"vocab")}" data-teacher-note="${esc(target.note)}" aria-haspopup="dialog" aria-label="開啟「${esc(note.term)}」老師筆記">${ruby(target.text,{furiganaContext:context})}</button>`;
      position=target.start+target.text.length;
    });
    return html+ruby(paragraph.jp.slice(position),{furiganaContext:"monthlyParking"});
  }
  function teacher(){
    if(!teacherData)return shell("老師筆記","資料載入中……","");
    const title=`${ruby("ゲッキョク")}<button type="button" class="teacher-annotation" data-teacher-note="company" aria-haspopup="dialog" aria-label="開啟「株式会社」老師筆記">${ruby("株式会社")}</button>`;
    const paragraphLabel=p=>{const source=teacherData.sourceParagraphs[p.id];return `原文第 ${source.sourceParagraph} 段${source.part?`（${source.part}）`:""}`;};
    return shell("老師筆記",teacherData.objective,`<section class="teacher-overview"><span class="reading-badge">老師閱讀重點</span><p>${esc(teacherData.objective)}</p><ol class="teacher-timeline">${teacherData.timeline.map((item,i)=>`<li>${esc(item)}${i<teacherData.timeline.length-1?'<span aria-hidden="true">→</span>':''}</li>`).join("")}</ol><small class="teacher-reference">老師筆記來源：福田州平老師</small></section><article class="reading-paper teacher-paper" style="--reading-size:${[.98,1.1,1.24][state.font]}"><h3>${title}</h3>${teacherData.paragraphs.map(p=>`<section class="teacher-paragraph" data-teacher-paragraph="${p.id}"><div class="teacher-paragraph-meta"><span>${paragraphLabel(p)}</span><button type="button" class="teacher-focus" data-paragraph-focus="${p.id}" aria-expanded="false">💡 段落重點</button></div><p>${teacherText(p)}</p><aside class="teacher-focus-note" id="paragraph-focus-${p.id}" hidden>${esc(p.focus)}</aside></section>`).join("")}</article>`);
  }
  function findAnswers(){
    const task=data.find[findIndex%data.find.length];
    return shell("原文找答案",`問題 ${findIndex+1}/${data.find.length} · 點選包含答案的段落。`,`<article class="find-prompt"><h3>${esc(task.q)}</h3><p>${esc(task.hint)}</p></article><div class="find-passages">${data.paragraphs.map(p=>`<button data-find="${p.id}"><span>段落 0${p.id}</span>${paragraphRuby(p)}</button>`).join("")}</div><p class="find-feedback"></p><button class="primary-button find-next" hidden>下一題 →</button>`);
  }
  function vocab(){
    const [jp,zh]=data.vocab[state.vocabIndex%data.vocab.length];
    return shell("單字練習","點卡翻面；鍵盤可用 Space、←、→。",`<button class="reading-vocab-card ${state.vocabFlipped?'flipped':''}" id="reading-vocab-card"><span>${state.vocabIndex+1} / ${data.vocab.length}</span><strong>${ruby(jp)}</strong>${state.vocabFlipped?`<b class="reading-card-answer">${esc(zh)}</b><small>點擊或按 Space 返回題目</small>`:`<small>點擊查看中文意思</small>`}</button><div class="card-actions"><button data-vocab-nav="prev">← 上一個</button><button data-vocab-star>${state.wrong.includes(`v${state.vocabIndex}`)?"★ 重溫中":"☆ 加入重溫"}</button><button data-vocab-nav="next">下一個 →</button></div><div class="vocab-overview">${data.vocab.map((v,i)=>`<button data-vocab-jump="${i}" class="${i===state.vocabIndex?'active':''}">${ruby(v[0])}</button>`).join("")}</div>`);
  }
  function exam(){
    return shell("模擬考試","13 題一次完成，提交後才顯示答案及分數。",`<div class="exam-list">${data.questions.map((q,i)=>`<article><span>${String(i+1).padStart(2,"0")}</span><h3>${questionRuby(q)}</h3><div>${q.options.map((o,n)=>`<label><input type="radio" name="${q.id}" value="${n}" ${state.examAnswers[q.id]===n?'checked':''}> ${optionText(q,o)}</label>`).join("")}</div></article>`).join("")}</div><div class="exam-submit"><p id="exam-status">已答 ${Object.keys(state.examAnswers).length} / ${data.questions.length}</p><button class="primary-button" id="submit-reading-exam">提交試卷 →</button></div><section class="reading-result" hidden></section>`);
  }
  function mistakes(){
    const qs=data.questions.filter(q=>state.wrong.includes(q.id));
    const words=data.vocab.map(([jp,zh],i)=>({jp,zh,id:`v${i}`})).filter(word=>state.wrong.includes(word.id));
    return shell("錯題重溫","閱讀題答錯或標記的單字會集中在這裡。",`${!qs.length&&!words.length?'<div class="empty-state"><h2>暫時冇錯題</h2><p>完成閱讀問題或模擬考試後，錯題會自動出現在這裡。</p></div>':`<div class="mistake-list">${qs.map(q=>`<article><span>閱讀理解</span><h3>${questionRuby(q)}</h3><p>答案：${optionText(q,q.options[q.answer])}</p><p>${esc(q.why)}</p><button class="chip" data-clear-wrong="${q.id}">標記已掌握</button></article>`).join("")}${words.map(word=>`<article><span>單字</span><h3>${ruby(word.jp)}</h3><p>${esc(word.zh)}</p><button class="chip" data-clear-wrong="${word.id}">標記已掌握</button></article>`).join("")}</div>`}`);
  }
  const renderers={original,teacher,translation,questions:questionCards,find:findAnswers,vocab,exam,mistakes};
  let activeNoteButton=null, notePopup=null;
  function closeTeacherPopup({restoreFocus=true}={}){
    if(!notePopup)return;
    notePopup.remove(); notePopup=null;
    const origin=activeNoteButton; activeNoteButton=null;
    if(restoreFocus)origin?.focus({preventScroll:true});
  }
  function speakNote(note){
    if(!("speechSynthesis" in window))return;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(note.term); utterance.lang="ja-JP"; window.speechSynthesis.speak(utterance);
  }
  function openTeacherPopup(button){
    closeTeacherPopup({restoreFocus:false}); activeNoteButton=button;
    const note=teacherData.notes[button.dataset.teacherNote]; if(!note)return;
    const popup=document.createElement("section"); popup.className="teacher-note-popup"; popup.setAttribute("role","dialog"); popup.setAttribute("aria-modal","false"); popup.setAttribute("aria-label",`${note.term} 老師筆記`); popup.tabIndex=-1;
    const canSpeak=typeof window.speechSynthesis!=="undefined"&&typeof window.SpeechSynthesisUtterance!=="undefined";
    popup.innerHTML=`<div class="teacher-note-head">${canSpeak?`<button type="button" class="teacher-speak" aria-label="朗讀 ${esc(note.term)}">🔊</button>`:""}<div><strong>${esc(note.term)}</strong>${note.reading?`<small>（${esc(note.reading)}）</small>`:""}</div><button type="button" class="teacher-note-close" aria-label="關閉老師筆記">×</button></div><p class="teacher-note-meaning">${esc(note.meaning)}</p><div><b>老師筆記</b><p>${esc(note.teacherNote)}</p></div>${note.correction?`<div class="teacher-correction"><b>💡 校對補充</b><p>${esc(note.correction)}</p></div>`:""}`;
    document.body.append(popup); notePopup=popup;
    const rect=button.getBoundingClientRect(), compact=window.matchMedia("(max-width: 720px)").matches;
    if(!compact){const width=Math.min(350,window.innerWidth-24);let left=Math.min(Math.max(12,rect.left),window.innerWidth-width-12);let top=rect.bottom+10;popup.style.width=`${width}px`; popup.style.left=`${left}px`; popup.style.top=`${top}px`;const height=popup.getBoundingClientRect().height;if(top+height>window.innerHeight-12){top=Math.max(12,rect.top-height-10);popup.style.top=`${top}px`}}
    popup.querySelector(".teacher-speak")?.addEventListener("click",()=>speakNote(note)); popup.querySelector(".teacher-note-close").onclick=()=>closeTeacherPopup();
    popup.focus({preventScroll:true});
  }
  function setMode(mode){state.mode=mode;state.vocabFlipped=false;findIndex=0;save();render()}
  function scoreQuestion(button){
    const q=data.questions.find(x=>x.id===button.dataset.q), chosen=Number(button.dataset.option), card=button.closest(".reading-question"), ok=chosen===q.answer;
    state.answered[q.id]=chosen;
    if(!ok&&!state.wrong.includes(q.id))state.wrong.push(q.id);
    if(ok)state.wrong=state.wrong.filter(x=>x!==q.id);
    save(); card.querySelectorAll("button").forEach((b,n)=>{b.disabled=true;if(n===q.answer)b.classList.add("correct")});
    if(!ok)button.classList.add("wrong");
    card.querySelector(".reading-feedback").textContent=(ok?"答對。":"未正確。")+q.why;
  }
  function bind(){
    stage.querySelectorAll("[data-teacher-note]").forEach(button=>button.onclick=()=>openTeacherPopup(button));
    stage.querySelectorAll("[data-paragraph-focus]").forEach(button=>button.onclick=()=>{const note=stage.querySelector(`#paragraph-focus-${button.dataset.paragraphFocus}`), open=note.hidden; note.hidden=!open;button.setAttribute("aria-expanded",String(open));});
    stage.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>scoreQuestion(b));
    stage.querySelectorAll("[data-textbook-answer-toggle]").forEach(button=>button.onclick=()=>{const answer=stage.querySelector(`#textbook-answer-${button.dataset.textbookAnswerToggle}`),show=answer.hidden;answer.hidden=!show;button.setAttribute("aria-expanded",String(show));button.textContent=show?"答案を隠す / 隱藏答案":"答案を見る / 顯示答案";});
    stage.querySelectorAll("[data-textbook-model-toggle]").forEach(button=>button.onclick=()=>{const answer=stage.querySelector(`#${button.dataset.textbookModelToggle}`),show=answer.hidden;answer.hidden=!show;button.setAttribute("aria-expanded",String(show));button.textContent=show?"參考回答例を隠す":"參考回答例を見る";});
    stage.querySelectorAll("[data-textbook-draft]").forEach(input=>{const key=input.dataset.textbookDraft;input.value=state.textbookDrafts?.[key]||"";input.oninput=()=>{state.textbookDrafts={...(state.textbookDrafts||{}),[key]:input.value};save();};});
    stage.querySelectorAll("[data-find]").forEach(b=>b.onclick=()=>{const task=data.find[findIndex%data.find.length],ok=Number(b.dataset.find)===task.answer;stage.querySelectorAll("[data-find]").forEach(x=>x.disabled=true);b.classList.add(ok?"correct":"wrong");stage.querySelector(`[data-find="${task.answer}"]`).classList.add("correct");stage.querySelector(".find-feedback").textContent=ok?"搵啱了，呢段包含完整答案。":"答案在綠色段落；再對照問題讀一次。";stage.querySelector(".find-next").hidden=false;});
    stage.querySelector(".find-next")?.addEventListener("click",()=>{findIndex=(findIndex+1)%data.find.length;render()});
    stage.querySelector("#reading-vocab-card")?.addEventListener("click",()=>{state.vocabFlipped=!state.vocabFlipped;save();render()});
    stage.querySelectorAll("[data-vocab-nav]").forEach(b=>b.onclick=()=>{state.vocabIndex=(state.vocabIndex+(b.dataset.vocabNav==="next"?1:data.vocab.length-1))%data.vocab.length;state.vocabFlipped=false;save();render()});
    JPY5.bindSwipe(stage.querySelector("#reading-vocab-card"),{next:()=>stage.querySelector('[data-vocab-nav="next"]')?.click(),previous:()=>stage.querySelector('[data-vocab-nav="prev"]')?.click()});
    stage.querySelectorAll("[data-vocab-jump]").forEach(b=>b.onclick=()=>{state.vocabIndex=Number(b.dataset.vocabJump);state.vocabFlipped=false;save();render()});
    stage.querySelector("[data-vocab-star]")?.addEventListener("click",()=>{const id=`v${state.vocabIndex}`;state.wrong=state.wrong.includes(id)?state.wrong.filter(x=>x!==id):[...state.wrong,id];save();render()});
    stage.querySelectorAll('.exam-list input').forEach(input=>input.onchange=()=>{state.examAnswers[input.name]=Number(input.value);save();stage.querySelector("#exam-status").textContent=`已答 ${Object.keys(state.examAnswers).length} / ${data.questions.length}`});
    stage.querySelector("#submit-reading-exam")?.addEventListener("click",()=>{if(Object.keys(state.examAnswers).length<data.questions.length){stage.querySelector("#exam-status").textContent="請先完成全部題目。";return}let score=0;const results=data.questions.map(q=>{const ok=state.examAnswers[q.id]===q.answer;if(ok){score++;state.wrong=state.wrong.filter(x=>x!==q.id)}else if(!state.wrong.includes(q.id))state.wrong.push(q.id);return {id:q.id,ok}});state.attempts.push({date:new Date().toISOString(),score,total:data.questions.length,results});state.examAnswers={};save();stage.querySelector(".reading-result").hidden=false;stage.querySelector(".reading-result").innerHTML=`<strong>${score} / ${data.questions.length}</strong><h2>${score>=11?'掌握得很好！':score>=8?'再重溫幾個段落。':'先回原文找答案。'}</h2><p>錯題已自動加入「錯題重溫」。</p>`;stage.querySelector("#submit-reading-exam").disabled=true});
    stage.querySelectorAll("[data-clear-wrong]").forEach(b=>b.onclick=()=>{state.wrong=state.wrong.filter(x=>x!==b.dataset.clearWrong);save();render()});
  }
  function render(){closeTeacherPopup({restoreFocus:false});document.querySelectorAll("[data-reading-mode]").forEach(b=>b.classList.toggle("active",b.dataset.readingMode===state.mode));stage.innerHTML=(renderers[state.mode]||original)();bind()}
  document.querySelectorAll("[data-reading-mode]").forEach(b=>b.onclick=()=>setMode(b.dataset.readingMode));
  document.querySelector("#font-down").onclick=()=>{state.font=Math.max(0,state.font-1);save();render()};
  document.querySelector("#font-up").onclick=()=>{state.font=Math.min(2,state.font+1);save();render()};
  document.querySelector("#furigana-toggle").onclick=e=>{state.furigana=!state.furigana;e.currentTarget.textContent=`假名 ${state.furigana?'ON':'OFF'}`;save();render()};
  document.querySelector("#furigana-toggle").textContent=`假名 ${state.furigana?'ON':'OFF'}`;
  document.addEventListener("pointerdown",e=>{if(notePopup&&!notePopup.contains(e.target)&&!activeNoteButton?.contains(e.target))closeTeacherPopup({restoreFocus:false})});
  document.addEventListener("scroll",e=>{if(!notePopup||!(e.target instanceof Element)||!e.target.closest(".teacher-note-popup"))closeTeacherPopup({restoreFocus:false})},true);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&notePopup){e.preventDefault();closeTeacherPopup();return}if(e.target.matches("input,textarea,select"))return;if(state.mode==="vocab"&&e.code==="Space"){e.preventDefault();state.vocabFlipped=!state.vocabFlipped;save();render()}if(state.mode==="vocab"&&["ArrowLeft","ArrowRight"].includes(e.key)){state.vocabIndex=(state.vocabIndex+(e.key==="ArrowRight"?1:data.vocab.length-1))%data.vocab.length;state.vocabFlipped=false;save();render()}});
  render();
});
