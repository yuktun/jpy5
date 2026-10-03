document.addEventListener("DOMContentLoaded", () => {
  const data=window.JPY5_READING, stage=document.querySelector("#reading-stage");
  const defaults=()=>({mode:"original",font:1,furigana:true,answered:{},wrong:[],vocabIndex:0,vocabFlipped:false,attempts:[],textbookDrafts:{},textbookChecks:{}});
  let state={...defaults(),...JPY5.read("reading",{})}, findIndex=0, examAnswers={};
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
        if(remaining.startsWith(part))remaining=remaining.slice(part.length);
        return esc(part);
      }
      const next=parts.slice(index+1).find(piece=>!kanjiRun.test(piece));
      const length=next?Math.max(0,remaining.indexOf(next)):remaining.length;
      const kana=remaining.slice(0,length);
      remaining=remaining.slice(length);
      return `<ruby>${esc(part)}<rt>${esc(kana)}</rt></ruby>`;
    }).join("");
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
  function shell(title,subtitle,body){return `<div class="reading-stage-head"><div><p class="kicker">第 14 課</p><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:""}</div></div>${body}`}
  const questionText=q=>esc(q.q);
  const optionText=(q,option)=>esc(option);
  function original(){
    return shell(ruby(data.title),"先掌握論述：動畫發展 → 漫畫產業 → 表現手法 → 世界品牌。",`<article class="reading-paper" style="--reading-size:${[.98,1.1,1.24][state.font]}rem"><div class="reading-badge">第14課</div>${data.paragraphs.map(p=>`<p data-paragraph="${p.id}">${ruby(p.jp)}</p>`).join("")}<footer>（${ruby(data.author)}）</footer></article>`);
  }
  function translation(){
    return shell("繁體中文翻譯","段落編號與日文原文完全對應。",`<div class="translation-list">${data.paragraphs.map(p=>`<article><span>0${p.id}</span><p>${esc(p.zh)}</p></article>`).join("")}</div>`);
  }
  function questionCards(){
    const sections=data.textbookActivities.sections;
    const openTask=(task,rows=5)=>`<article class="ch14-textbook-task"><p lang="ja">${ruby(task.prompt).replace(/\n/g,"<br>")}</p><label>自己的回答<textarea rows="${rows}" data-textbook-draft="${task.id}" lang="ja" placeholder="ここに入力してください">${esc(state.textbookDrafts[task.id]||"")}</textarea></label><button class="secondary-button" type="button" data-model-toggle="${task.id}" aria-expanded="false">參考回答例を見る</button><div class="ch14-model-answer" data-model-answer="${task.id}" hidden><b>參考回答例（非課本官方答案）</b><p lang="ja">${ruby(task.model).replace(/\n/g,"<br>")}</p>${task.tip?`<small>${esc(task.tip)}</small>`:""}</div></article>`;
    const think=sections.find(section=>section.number===1), confirm=sections.find(section=>section.number===3), discuss=sections.find(section=>section.number===4), challenge=sections.find(section=>section.number===5);
    return shell("課本「読む・書く」原題","依課本順序完成 1・3・4・5；開放題不自動評分，草稿會自動保存。",`<div class="ch14-textbook-sections">
      <section class="ch14-textbook-section"><header><span>${think.label}</span><h2>1. ${ruby(think.title)}</h2></header><div class="ch14-section-body">${think.items.map(item=>openTask(item)).join("")}</div></section>
      <section class="ch14-textbook-section"><header><span>${confirm.label}</span><h2>3. ${ruby(confirm.title)}</h2></header><div class="ch14-section-body"><div class="ch14-subsection"><h3>1）本文の内容と合っていれば○、違っていれば×を書いてください。</h3><div class="ch14-truth-list">${confirm.truth.map((item,index)=>`<article data-truth-card="${item.id}"><span>${index+1}</span><p lang="ja">${ruby(item.statement)}</p><div><button type="button" data-truth="${item.id}" data-value="true" class="${state.textbookChecks[item.id]===true?'selected':''}">○</button><button type="button" data-truth="${item.id}" data-value="false" class="${state.textbookChecks[item.id]===false?'selected':''}">×</button></div><small data-truth-result></small></article>`).join("")}</div><button class="secondary-button" type="button" data-truth-reveal>答案を見る / 顯示答案</button><div class="ch14-official-answer" data-truth-official hidden><b>官方答案 / 課本解答</b><p>① ○　② ○　③ ○　④ ×　⑤ ×</p></div></div><div class="ch14-subsection"><h3>2）質問に答えてください。</h3>${confirm.questions.map((item,index)=>`<article class="ch14-textbook-task"><span>問題 ${index+1}</span><p lang="ja">${ruby(item.prompt)}</p><label>自己的回答<textarea rows="4" data-textbook-draft="${item.id}" lang="ja" placeholder="ここに入力してください">${esc(state.textbookDrafts[item.id]||"")}</textarea></label><div class="ch14-official-answer" data-confirm-answer hidden><b>官方答案 / 課本解答</b><p lang="ja">${ruby(item.answer)}</p></div></article>`).join("")}<button class="secondary-button" type="button" data-confirm-reveal aria-expanded="false">答案を見る / 顯示答案</button></div></div></section>
      <section class="ch14-textbook-section"><header><span>${discuss.label}</span><h2>4. ${ruby(discuss.title)}</h2></header><div class="ch14-section-body">${discuss.items.map(item=>openTask(item)).join("")}</div></section>
      <section class="ch14-textbook-section"><header><span>${challenge.label}</span><h2>5. ${ruby(challenge.title)}</h2></header><div class="ch14-section-body"><article class="ch14-textbook-task ch14-writing-task"><p lang="ja">${ruby(challenge.prompt)}</p><div class="ch14-writing-guide"><b>文章の流れ</b>${challenge.guide.map((step,index)=>`<span>${index+1}. ${ruby(step)}</span>`).join("")}</div><label>作文<textarea rows="14" data-textbook-draft="challenge-essay" data-character-count lang="ja" placeholder="400字程度で書いてください。">${esc(state.textbookDrafts["challenge-essay"]||"")}</textarea></label><small class="ch14-character-count"><span>${[...(state.textbookDrafts["challenge-essay"]||"")].length}</span> 字</small><button class="secondary-button" type="button" data-model-toggle="challenge-essay" aria-expanded="false">參考回答例を見る</button><div class="ch14-model-answer" data-model-answer="challenge-essay" hidden><b>參考回答例（非課本官方答案）</b><p lang="ja">${ruby(challenge.model).replace(/\n/g,"<br>")}</p><small>題材和內容可以不同；請按三部分結構清楚說明自己的看法。</small></div></article></div></section>
    </div>`);
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
    return shell("模擬考試","9 題一次完成，提交後才顯示答案及分數。",`<div class="exam-list">${data.questions.map((q,i)=>`<article><span>${String(i+1).padStart(2,"0")}</span><h3>${questionText(q)}</h3><div>${q.options.map((o,n)=>`<label><input type="radio" name="${q.id}" value="${n}" ${examAnswers[q.id]===n?'checked':''}> ${optionText(q,o)}</label>`).join("")}</div></article>`).join("")}</div><div class="exam-submit"><p id="exam-status">已答 0 / ${data.questions.length}</p><button class="primary-button" id="submit-reading-exam">提交試卷 →</button></div><section class="reading-result" hidden></section>`);
  }
  function mistakes(){
    const qs=data.questions.filter(q=>state.wrong.includes(q.id));
    const words=data.vocab.filter((_,i)=>state.wrong.includes(`v${i}`));
    return shell("錯題重溫","模擬考試答錯或標記的單字會集中在這裡。",`${!qs.length&&!words.length?'<div class="empty-state"><h2>暫時冇錯題</h2><p>完成模擬考試或標記單字後，內容會自動出現在這裡。</p></div>':`<div class="mistake-list">${qs.map(q=>`<article><span>模擬考試</span><h3>${questionText(q)}</h3><p>答案：${optionText(q,q.options[q.answer])}</p><p>${esc(q.why)}</p><button class="chip" data-clear-wrong="${q.id}">標記已掌握</button></article>`).join("")}${words.map(([jp,zh])=>`<article><span>單字</span><h3>${ruby(jp)}</h3><p>${esc(zh)}</p></article>`).join("")}</div>`}`);
  }
  const renderers={original,translation,questions:questionCards,find:findAnswers,vocab,exam,mistakes};
  function setMode(mode){state.mode=mode;state.vocabFlipped=false;findIndex=0;examAnswers={};save();render()}
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
    stage.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>scoreQuestion(b));
    stage.querySelectorAll("[data-textbook-draft]").forEach(field=>field.addEventListener("input",()=>{state.textbookDrafts[field.dataset.textbookDraft]=field.value;const count=field.closest(".ch14-writing-task")?.querySelector(".ch14-character-count span");if(count)count.textContent=[...field.value].length;save()}));
    stage.querySelectorAll("[data-model-toggle]").forEach(button=>button.onclick=()=>{const panel=stage.querySelector(`[data-model-answer="${button.dataset.modelToggle}"]`),show=panel.hidden;panel.hidden=!show;button.setAttribute("aria-expanded",String(show));button.textContent=show?"參考回答例を隠す / 隱藏":"參考回答例を見る"});
    stage.querySelectorAll("[data-truth]").forEach(button=>button.onclick=()=>{const id=button.dataset.truth;state.textbookChecks[id]=button.dataset.value==="true";save();button.closest("[data-truth-card]").querySelectorAll("[data-truth]").forEach(choice=>choice.classList.toggle("selected",choice===button))});
    stage.querySelector("[data-truth-reveal]")?.addEventListener("click",event=>{const panel=stage.querySelector("[data-truth-official]"),show=panel.hidden;panel.hidden=!show;event.currentTarget.textContent=show?"答案を隠す / 隱藏答案":"答案を見る / 顯示答案";stage.querySelectorAll("[data-truth-card]").forEach(card=>{const source=data.textbookActivities.sections.find(section=>section.number===3).truth.find(item=>item.id===card.dataset.truthCard),chosen=state.textbookChecks[source.id],result=card.querySelector("[data-truth-result]");result.textContent=show?(chosen===undefined?`官方答案：${source.answer?'○':'×'}`:chosen===source.answer?`✓ 與官方答案相同（${source.answer?'○':'×'}）`:`官方答案：${source.answer?'○':'×'}`):"";card.classList.toggle("revealed",show)})});
    stage.querySelector("[data-confirm-reveal]")?.addEventListener("click",event=>{const panels=stage.querySelectorAll("[data-confirm-answer]"),show=[...panels].some(panel=>panel.hidden);panels.forEach(panel=>panel.hidden=!show);event.currentTarget.setAttribute("aria-expanded",String(show));event.currentTarget.textContent=show?"答案を隠す / 隱藏答案":"答案を見る / 顯示答案"});
    stage.querySelectorAll("[data-find]").forEach(b=>b.onclick=()=>{const task=data.find[findIndex%data.find.length],ok=Number(b.dataset.find)===task.answer;stage.querySelectorAll("[data-find]").forEach(x=>x.disabled=true);b.classList.add(ok?"correct":"wrong");stage.querySelector(`[data-find="${task.answer}"]`).classList.add("correct");stage.querySelector(".find-feedback").textContent=ok?"搵啱了，呢段包含完整答案。":"答案在綠色段落；再對照問題讀一次。";stage.querySelector(".find-next").hidden=false;});
    stage.querySelector(".find-next")?.addEventListener("click",()=>{findIndex=(findIndex+1)%data.find.length;render()});
    stage.querySelector("#reading-vocab-card")?.addEventListener("click",()=>{state.vocabFlipped=!state.vocabFlipped;save();render()});
    stage.querySelectorAll("[data-vocab-nav]").forEach(b=>b.onclick=()=>{state.vocabIndex=(state.vocabIndex+(b.dataset.vocabNav==="next"?1:data.vocab.length-1))%data.vocab.length;state.vocabFlipped=false;save();render()});
    JPY5.bindSwipe(stage.querySelector("#reading-vocab-card"),{next:()=>stage.querySelector('[data-vocab-nav="next"]')?.click(),previous:()=>stage.querySelector('[data-vocab-nav="prev"]')?.click()});
    stage.querySelectorAll("[data-vocab-jump]").forEach(b=>b.onclick=()=>{state.vocabIndex=Number(b.dataset.vocabJump);state.vocabFlipped=false;save();render()});
    stage.querySelector("[data-vocab-star]")?.addEventListener("click",()=>{const id=`v${state.vocabIndex}`;state.wrong=state.wrong.includes(id)?state.wrong.filter(x=>x!==id):[...state.wrong,id];save();render()});
    stage.querySelectorAll('.exam-list input').forEach(input=>input.onchange=()=>{examAnswers[input.name]=Number(input.value);stage.querySelector("#exam-status").textContent=`已答 ${Object.keys(examAnswers).length} / ${data.questions.length}`});
    stage.querySelector("#submit-reading-exam")?.addEventListener("click",()=>{if(Object.keys(examAnswers).length<data.questions.length){stage.querySelector("#exam-status").textContent="請先完成全部題目。";return}let score=0;const results=data.questions.map(q=>{const ok=examAnswers[q.id]===q.answer;if(ok){score++;state.wrong=state.wrong.filter(x=>x!==q.id)}else if(!state.wrong.includes(q.id))state.wrong.push(q.id);return {id:q.id,ok}});state.attempts.push({date:new Date().toISOString(),score,total:data.questions.length,results});save();stage.querySelector(".reading-result").hidden=false;stage.querySelector(".reading-result").innerHTML=`<strong>${score} / ${data.questions.length}</strong><h2>${score>=8?'掌握得很好！':score>=6?'再重溫幾個段落。':'先回原文找答案。'}</h2><p>錯題已自動加入「錯題重溫」。</p>`;stage.querySelector("#submit-reading-exam").disabled=true});
    stage.querySelectorAll("[data-clear-wrong]").forEach(b=>b.onclick=()=>{state.wrong=state.wrong.filter(x=>x!==b.dataset.clearWrong);save();render()});
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
