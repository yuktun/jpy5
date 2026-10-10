document.addEventListener("DOMContentLoaded", () => {
  const data=window.JPY5_READING, stage=document.querySelector("#reading-stage");
  const defaults=()=>({mode:"original",font:1,furigana:true,answered:{},wrong:[],vocabIndex:0,vocabFlipped:false,attempts:[],examAnswers:{},sourceNotes:{},textbookDrafts:{},questionResults:{}});
  let state={...defaults(),...JPY5.read("reading",{})}, findIndex=0;
  state.examAnswers=state.examAnswers||{};
  state.vocabIndex=((state.vocabIndex%data.vocab.length)+data.vocab.length)%data.vocab.length;
  state.sourceNotes=state.sourceNotes||{};
  state.textbookDrafts=state.textbookDrafts||{};
  state.questionResults=state.questionResults||{};
  // Old questions mode showed the textbook: retain that destination for saved users.
  if(state.mode==="questions")state.mode="source";
  const setAnswer=(q,chosen)=>{state.answered[q.id]=chosen;state.questionResults[q.id]={selected:chosen,correct:chosen===q.answer};state.wrong=state.wrong.filter(id=>id!==q.id);if(chosen!==q.answer)state.wrong.push(q.id);};
  // A selected answer is authoritative after a cloud merge; normalize stale wrong arrays.
  data.questions.forEach(q=>{if(state.answered[q.id]!==undefined)setAnswer(q,state.answered[q.id]);});
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
    return parts.map((part,index)=>{if(!kanjiRun.test(part)){if(remaining.startsWith(part))remaining=remaining.slice(part.length);return esc(part)}const next=parts.slice(index+1).find(piece=>!kanjiRun.test(piece));const length=next?Math.max(0,remaining.indexOf(next)):remaining.length;const kana=remaining.slice(0,length);remaining=remaining.slice(length);return `<ruby>${esc(part)}<rt>${esc(kana)}</rt></ruby>`}).join("");
  }
  function ruby(text){
    if(!state.furigana)return esc(text);
    const readings=new Map(Object.entries(data.furigana));
    const words=[...readings.keys()].sort((a,b)=>b.length-a.length);
    const pattern=new RegExp(words.map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g");
    let out="",last=0;
    for(const match of String(text).matchAll(pattern)){
      out+=esc(String(text).slice(last,match.index));
      out+=segmentedRuby(match[0],readings.get(match[0]));
      last=match.index+match[0].length;
    }
    return out+esc(String(text).slice(last));
  }
  const lines=text=>ruby(text).replace(/\n/g,"<br>");
  function shell(title,subtitle,body){return `<div class="reading-stage-head"><div><p class="kicker">第 20 課</p><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:""}</div></div>${body}`}
  const questionText=q=>esc(q.q);
  const optionText=(q,option)=>esc(option);
  function original(){
    return shell(ruby(data.title),`閱讀〈${ruby(data.title)}〉：${data.paragraphs.length} 段視覺核對原文。`,`<article class="reading-paper" style="--reading-size:${[.98,1.1,1.24][state.font]}rem"><div class="reading-badge">第20課</div>${data.paragraphs.map(p=>`<p data-paragraph="${p.id}">${ruby(p.jp)}</p>`).join("")}<footer>（${ruby(data.author)}）</footer></article>`);
  }
  function translation(){
    return shell("繁體中文翻譯","每段中文下方附有完整日文原文；翻譯為編輯補充，非教材印刷中譯。",`<div class="translation-list">${data.paragraphs.map(p=>`<article><span>0${p.id}</span><p>${esc(p.zh)}<span class="translation-original" lang="ja">${esc(p.jp)}</span></p></article>`).join("")}</div>`);
  }
  function questionCards(){
    return shell("應用程式閱讀練習",`${data.questions.length} 題應用程式練習均依據已轉錄原文編寫；作答後即時顯示解釋及原文段落。`,`<div class="reading-question-list">${data.questions.map((q,i)=>{const chosen=state.answered[q.id],answered=chosen!==undefined;return `<article class="reading-question" data-question="${q.id}"><span>應用程式閱讀練習 · 問題 ${i+1} · 原文第 ${q.paragraph} 段</span><h3>${questionText(q)}</h3><div>${q.options.map((o,n)=>`<button data-q="${q.id}" data-option="${n}" ${answered?'disabled':''} class="${answered&&n===q.answer?'correct':answered&&n===chosen&&chosen!==q.answer?'wrong':''}">${optionText(q,o)}</button>`).join("")}</div><p class="reading-feedback">${answered?(chosen===q.answer?'答對。':'未正確。')+esc(q.why):''}</p>${answered?`<button class="chip" data-retry-question="${q.id}">重新作答</button>`:""}</article>`}).join("")}</div>`);
  }
  function findAnswers(){
    const task=data.find[findIndex%data.find.length];
    return shell("原文找答案",`問題 ${findIndex+1}/${data.find.length} · 點選包含答案的段落。`,`<article class="find-prompt"><h3>${esc(task.q)}</h3><p>${esc(task.hint)}</p></article><div class="find-passages">${data.paragraphs.map(p=>`<button data-find="${p.id}"><span>段落 0${p.id}</span>${ruby(p.jp)}</button>`).join("")}</div><p class="find-feedback"></p><button class="primary-button find-next" hidden>下一題 →</button>`);
  }
  function vocab(){
    const [jp,zh]=data.vocab[state.vocabIndex%data.vocab.length];
    return shell("單字練習","點卡翻面；鍵盤可用 Space、←、→。",`<button class="reading-vocab-card ${state.vocabFlipped?'flipped':''}" id="reading-vocab-card"><span>${state.vocabIndex+1} / ${data.vocab.length}</span><strong>${ruby(jp)}</strong>${state.vocabFlipped?`<b class="reading-card-answer">${esc(zh)}</b><small>點擊或按 Space 返回題目</small>`:`<small>點擊查看中文意思</small>`}</button><div class="card-actions"><button data-vocab-nav="prev">← 上一個</button><button data-vocab-star>${state.wrong.includes(`v${state.vocabIndex}`)?"★ 重溫中":"☆ 加入重溫"}</button><button data-vocab-nav="next">下一個 →</button></div><div class="vocab-overview">${data.vocab.map((v,i)=>`<button data-vocab-jump="${i}" class="${i===state.vocabIndex?'active':''}">${ruby(v[0])}</button>`).join("")}</div>`);
  }
  function exam(){
    return shell("模擬考試",`${data.questions.length} 題一次完成，未提交答案會自動保存；提交後才顯示分數。`,`<div class="exam-list">${data.questions.map((q,i)=>`<article><span>${String(i+1).padStart(2,"0")}</span><h3>${questionText(q)}</h3><div>${q.options.map((o,n)=>`<label><input type="radio" name="${q.id}" value="${n}" ${state.examAnswers[q.id]===n?'checked':''}> ${optionText(q,o)}</label>`).join("")}</div></article>`).join("")}</div><div class="exam-submit"><p id="exam-status">已答 ${Object.keys(state.examAnswers).length} / ${data.questions.length}</p><button class="primary-button" id="submit-reading-exam">提交試卷 →</button></div><section class="reading-result" hidden></section>`);
  }
  const draftValue=id=>esc(state.textbookDrafts[id]||"");
  const officialToggle=id=>`<button class="secondary-button" type="button" data-official-toggle="${id}" aria-expanded="false">答案を見る / 顯示答案</button>`;
  function officialAnswer(item){const answer=Array.isArray(item.answer)?item.answer.map((value,index)=>`${"①②③④⑤⑥⑦⑧"[index]} ${value}`).join("　"):item.answer;return `${officialToggle(item.id)}<div class="ch14-official-answer" data-official-answer="${item.id}" hidden><b>課本官方答案 / 課本解答</b><p>${ruby(answer)}</p></div>`}
  function sectionHeader(section){return `<header><span>${esc(section.label)}</span><h2>${section.number}. ${ruby(section.title)}</h2></header>`}
  function openTask(item){return `<article class="ch14-textbook-task"><span>${esc(item.number)}）</span><p>${lines(item.prompt)}</p>${item.examples?.length?`<ul class="ch19-robot-examples">${item.examples.map(example=>`<li>${ruby(example)}</li>`).join("")}</ul>`:""}${item.pictureDependent?'<p class="ch15-no-grade">課本以插圖呈現六種邦樂器；請使用頁底的「開啟原課本」對照圖片。</p>':""}<label>自己的答案／準備筆記（不會自動評分）<textarea rows="6" data-textbook-draft="${item.id}" lang="ja">${draftValue(item.id)}</textarea></label></article>`}
  function sourceQuestions(){
    const [think,confirm,discuss,challenge]=data.textbookActivities.sections,timeline=data.sourceActivities.find(item=>item.id==="source-timeline"),fill=data.sourceActivities.find(item=>item.id==="source-fill"),discussion=data.sourceActivities.find(item=>item.id==="source-discussion"),challengeData=data.sourceActivities.find(item=>item.id==="source-challenge");
    const questions=data.sourceQuestions.map((q,index)=>`<article class="textbook-answer-card"><span>${"①②③"[index]}</span><h3 lang="ja">${ruby(q.q)}</h3><ol type="a">${q.options.map(option=>`<li lang="ja">${ruby(option)}</li>`).join("")}</ol><label>自己的草稿（不會自動評分）<textarea rows="4" data-source-note="${q.id}" lang="ja">${esc(state.sourceNotes[q.id]||"")}</textarea></label>${officialAnswer(q)}</article>`).join("");
    const timelineCard=`<article class="ch14-subsection"><h3>2）${ruby(timeline.instruction)}</h3><ul>${timeline.items.map(item=>`<li lang="ja">${ruby(item)}</li>`).join("")}</ul><label class="textbook-draft-label"><span>①～⑤の答え（不會自動評分）</span><textarea rows="5" data-source-note="source-timeline" lang="ja">${esc(state.sourceNotes["source-timeline"]||"")}</textarea></label>${officialAnswer(timeline)}</article>`;
    const fillCard=`<article class="ch14-subsection"><h3>3）${ruby(fill.instruction)}</h3>${fill.items.map(item=>`<p lang="ja">${ruby(item)}</p>`).join("")}<label class="textbook-draft-label"><span>①～⑧の答え（自由文字，不會自動評分）</span><textarea rows="6" data-source-note="source-fill" lang="ja">${esc(state.sourceNotes["source-fill"]||"")}</textarea></label><p class="ch15-no-grade">課本明示：答案不必與本文完全相同；本題不作嚴格自動評分。</p>${officialAnswer(fill)}</article>`;
    const discussionCard=`<article class="ch14-textbook-task"><span>課本開放活動</span><p>${ruby(discussion.instruction)}</p><ol>${discussion.items.map(item=>`<li>${ruby(item)}</li>`).join("")}</ol><label>自己的答案／討論筆記（不會自動評分）<textarea rows="9" data-source-note="source-discussion" lang="ja">${esc(state.sourceNotes["source-discussion"]||"")}</textarea></label><p class="ch15-no-grade">課本解答冊：省略。本活動沒有固定答案。</p></article>`;
    const challengeCard=`<article class="ch14-textbook-task"><span>課本寫作活動</span><p>${ruby(challengeData.instruction)}</p><div class="ch14-writing-guide"><b>${ruby("文章の流れ：")}</b><span>${ruby("①どのようなものか・歴史")}</span><span>${ruby("②魅力・人")}</span></div><label>自己的文章（不會自動評分）<textarea rows="16" data-source-note="source-challenge" data-character-count="source-challenge" lang="ja">${esc(state.sourceNotes["source-challenge"]||"")}</textarea></label><small class="ch14-character-count"><span data-character-output="source-challenge">${[...(state.sourceNotes["source-challenge"]||"")].length}</span> 字</small><p class="ch15-no-grade">課本解答冊：省略。本活動沒有固定答案。</p></article>`;
    return shell("課本『読む・書く』原題","依課本順序完成 1・3・4・5；Section 3 的課本官方答案預設隱藏，所有開放活動均不計分。",`<div class="ch14-textbook-sections"><section class="ch14-textbook-section">${sectionHeader(think)}<div class="ch14-section-body"><p class="ch15-no-grade">課本解答冊：省略。請寫下自己的經驗與觀察。</p>${think.items.map(openTask).join("")}</div></section><section class="ch14-textbook-section">${sectionHeader(confirm)}<div class="ch14-section-body"><p class="ch15-no-grade">課本解答只供核對，不會覆寫自己的輸入，亦不納入 App 分數或掌握。</p><section class="ch14-subsection"><h3>1）${ruby("正しい答えを選んでください。")}</h3><div class="textbook-answer-grid">${questions}</div></section>${timelineCard}${fillCard}</div></section><section class="ch14-textbook-section">${sectionHeader(discuss)}<div class="ch14-section-body">${discussionCard}</div></section><section class="ch14-textbook-section">${sectionHeader(challenge)}<div class="ch14-section-body">${challengeCard}</div></section></div>`);
  }
  function mistakes(){
    const qs=data.questions.filter(q=>state.wrong.includes(q.id)),words=data.vocab.filter((_,i)=>state.wrong.includes('v'+i));
    return shell("錯題重溫","重新作答可更新掌握；查看解釋本身不會當作答對。",qs.length||words.length?'<div class="mistake-list">'+qs.map(q=>`<article><span>應用程式閱讀練習 · 第 ${q.paragraph} 段</span><h3>${questionText(q)}</h3><button class="chip" data-review-question="${q.id}">重新作答</button><details><summary>查看答案與原文依據（不計掌握）</summary><p>${optionText(q,q.options[q.answer])}</p><p>${esc(q.why)}</p></details></article>`).join('')+words.map(([jp,zh])=>'<article><span>單字重溫</span><h3>'+ruby(jp)+'</h3><p>'+esc(zh)+'</p></article>').join('')+'</div>':'<div class="empty-state"><h2>暫時沒有錯題</h2><p>App閱讀練習、模擬考試錯題及標記的單字會出現在這裏。</p></div>');
  }
  const renderers={original,translation,source:sourceQuestions,practice:questionCards,find:findAnswers,vocab,exam,mistakes};
  function setMode(mode){state.mode=mode;state.vocabFlipped=false;findIndex=0;save();render()}
  function scoreQuestion(button){
    const q=data.questions.find(x=>x.id===button.dataset.q);if(!q)return;
    setAnswer(q,Number(button.dataset.option));save();render();
  }
  function bind(){
    stage.querySelectorAll("[data-source-note]").forEach(input=>input.oninput=()=>{state.sourceNotes[input.dataset.sourceNote]=input.value;save()});
    stage.querySelectorAll("[data-textbook-draft]").forEach(input=>input.oninput=()=>{state.textbookDrafts[input.dataset.textbookDraft]=input.value;save()});
    stage.querySelectorAll("[data-official-toggle]").forEach(button=>button.onclick=()=>{const panel=stage.querySelector(`[data-official-answer="${button.dataset.officialToggle}"]`);panel.hidden=!panel.hidden;button.setAttribute("aria-expanded",String(!panel.hidden));button.textContent=panel.hidden?"答案を見る / 顯示答案":"答案を隠す / 隱藏答案"});
    stage.querySelectorAll("[data-character-count]").forEach(input=>input.addEventListener("input",()=>{const output=stage.querySelector(`[data-character-output="${input.dataset.characterCount}"]`);if(output)output.textContent=[...input.value].length}));
    stage.querySelectorAll("[data-retry-question],[data-review-question]").forEach(b=>b.onclick=()=>{const id=b.dataset.retryQuestion||b.dataset.reviewQuestion;delete state.answered[id];delete state.questionResults[id];state.mode="practice";save();render();stage.querySelector(`[data-question="${id}"]`)?.scrollIntoView({block:"center"});});
    stage.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>scoreQuestion(b));
    stage.querySelectorAll("[data-find]").forEach(b=>b.onclick=()=>{const task=data.find[findIndex%data.find.length],ok=Number(b.dataset.find)===task.answer;stage.querySelectorAll("[data-find]").forEach(x=>x.disabled=true);b.classList.add(ok?"correct":"wrong");stage.querySelector(`[data-find="${task.answer}"]`).classList.add("correct");stage.querySelector(".find-feedback").textContent=ok?"搵啱了，呢段包含完整答案。":"答案在綠色段落；再對照問題讀一次。";stage.querySelector(".find-next").hidden=false;});
    stage.querySelector(".find-next")?.addEventListener("click",()=>{findIndex=(findIndex+1)%data.find.length;render()});
    stage.querySelector("#reading-vocab-card")?.addEventListener("click",()=>{state.vocabFlipped=!state.vocabFlipped;save();render()});
    stage.querySelectorAll("[data-vocab-nav]").forEach(b=>b.onclick=()=>{state.vocabIndex=(state.vocabIndex+(b.dataset.vocabNav==="next"?1:data.vocab.length-1))%data.vocab.length;state.vocabFlipped=false;save();render()});
    JPY5.bindSwipe(stage.querySelector("#reading-vocab-card"),{next:()=>stage.querySelector('[data-vocab-nav="next"]')?.click(),previous:()=>stage.querySelector('[data-vocab-nav="prev"]')?.click()});
    stage.querySelectorAll("[data-vocab-jump]").forEach(b=>b.onclick=()=>{state.vocabIndex=Number(b.dataset.vocabJump);state.vocabFlipped=false;save();render()});
    stage.querySelector("[data-vocab-star]")?.addEventListener("click",()=>{const id=`v${state.vocabIndex}`;state.wrong=state.wrong.includes(id)?state.wrong.filter(x=>x!==id):[...state.wrong,id];save();render()});
    stage.querySelectorAll('.exam-list input').forEach(input=>input.onchange=()=>{state.examAnswers[input.name]=Number(input.value);save();stage.querySelector("#exam-status").textContent=`已答 ${Object.keys(state.examAnswers).length} / ${data.questions.length}`});
    stage.querySelector("#submit-reading-exam")?.addEventListener("click",()=>{if(Object.keys(state.examAnswers).length<data.questions.length){stage.querySelector("#exam-status").textContent="請先完成全部題目。";return}let score=0;const results=data.questions.map(q=>{const ok=state.examAnswers[q.id]===q.answer;if(ok)score++;setAnswer(q,state.examAnswers[q.id]);return {id:q.id,ok}});state.attempts.push({date:new Date().toISOString(),score,total:data.questions.length,results});state.examAnswers={};save();const ratio=score/data.questions.length;stage.querySelector(".reading-result").hidden=false;stage.querySelector(".reading-result").innerHTML=`<strong>${score} / ${data.questions.length}</strong><h2>${ratio>=.8?'掌握得很好！':ratio>=.5?'再重溫幾個段落。':'先回原文找答案。'}</h2><p>錯題已自動加入「錯題重溫」。</p>`;stage.querySelector("#submit-reading-exam").disabled=true});

  }
  function render(){document.querySelectorAll("[data-reading-mode]").forEach(b=>b.classList.toggle("active",b.dataset.readingMode===state.mode));stage.innerHTML=(renderers[state.mode]||original)();bind()}
  document.querySelectorAll("[data-reading-mode]").forEach(b=>b.onclick=()=>setMode(b.dataset.readingMode));
  document.querySelector("#font-down").onclick=()=>{state.font=Math.max(0,state.font-1);save();render()};
  document.querySelector("#font-up").onclick=()=>{state.font=Math.min(2,state.font+1);save();render()};
  document.querySelector("#furigana-toggle").onclick=e=>{state.furigana=!state.furigana;e.currentTarget.textContent=`假名 ${state.furigana?'ON':'OFF'}`;save();render()};
  document.querySelector("#furigana-toggle").textContent=`假名 ${state.furigana?'ON':'OFF'}`;
  document.addEventListener("keydown",e=>{if(e.target.matches("input,textarea,select"))return;if(state.mode==="vocab"&&e.code==="Space"){e.preventDefault();state.vocabFlipped=!state.vocabFlipped;save();render()}if(state.mode==="vocab"&&["ArrowLeft","ArrowRight"].includes(e.key)){state.vocabIndex=(state.vocabIndex+(e.key==="ArrowRight"?1:data.vocab.length-1))%data.vocab.length;state.vocabFlipped=false;save();render()}});
  render();
});
