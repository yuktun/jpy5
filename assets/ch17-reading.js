document.addEventListener("DOMContentLoaded", () => {
  const data=window.JPY5_READING, stage=document.querySelector("#reading-stage");
  const defaults=()=>({mode:"original",font:1,furigana:true,answered:{},wrong:[],vocabIndex:0,vocabFlipped:false,attempts:[],examAnswers:{},textbookDrafts:{}});
  let state={...defaults(),...JPY5.read("reading",{})}, findIndex=0;
  state.examAnswers=state.examAnswers||{};
  state.textbookDrafts=state.textbookDrafts||{};
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
    for(const match of String(text).matchAll(pattern)){out+=esc(String(text).slice(last,match.index));out+=segmentedRuby(match[0],readings.get(match[0]));last=match.index+match[0].length}
    return out+esc(String(text).slice(last));
  }
  const lines=text=>ruby(text).replace(/\n/g,"<br>");
  function shell(title,subtitle,body){return `<div class="reading-stage-head"><div><p class="kicker">第 17 課</p><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:""}</div></div>${body}`}
  const questionText=q=>esc(q.q), optionText=(q,option)=>esc(option), draftValue=id=>esc(state.textbookDrafts[id]||"");
  function original(){return shell(ruby(data.title),"閱讀〈暦〉：從月份名稱、舊曆到明治改曆。",`<article class="reading-paper" style="--reading-size:${[.98,1.1,1.24][state.font]}rem"><div class="reading-badge">第17課</div>${data.paragraphs.map(p=>`<p data-paragraph="${p.id}">${ruby(p.jp)}</p>`).join("")}<footer>（${ruby(data.author)}）</footer></article>`)}
  function translation(){return shell("繁體中文翻譯","段落編號與日文原文完全對應。",`<div class="translation-list">${data.paragraphs.map(p=>`<article><span>0${p.id}</span><p>${esc(p.zh)}</p></article>`).join("")}</div>`)}
  function modelAnswer(item){return `<button class="secondary-button" type="button" data-model-toggle="${item.id}" aria-expanded="false">參考回答例を見る</button><div class="ch14-model-answer" data-model-answer="${item.id}" hidden><b>參考回答例（非課本官方答案）</b><p>${lines(item.model)}</p>${item.modelNote?`<small>${esc(item.modelNote)}</small>`:""}</div>`}
  function promptList(item){return item.questions?.length?`<div class="ch17-prompt-list">${item.questions.map(q=>`<p>${ruby(q)}</p>`).join("")}</div>`:""}
  function openTask(item,rows=7){
    const calendars=item.calendarTypes?`<div class="ch17-calendar-types" aria-label="暦の種類">${item.calendarTypes.map(type=>`<span>${ruby(type)}</span>`).join("")}</div>`:"";
    return `<article class="ch14-textbook-task"><span>${esc(item.number)}）</span><p>${lines(item.prompt)}</p>${promptList(item)}${calendars}<label for="draft-${item.id}">自己的答案／準備筆記（不會自動評分）</label><textarea id="draft-${item.id}" rows="${rows}" data-textbook-draft="${item.id}" lang="ja">${draftValue(item.id)}</textarea>${modelAnswer(item)}</article>`;
  }
  function sectionHeader(section){return `<header><span>${esc(section.label)}</span><h2>${section.number}. ${ruby(section.title)}</h2></header>`}
  function tableCell(cell){if(typeof cell==="string")return lines(cell);return `${cell.before?lines(cell.before):""}<input class="ch17-table-input" data-textbook-draft="${cell.blank}" value="${draftValue(cell.blank)}" aria-label="${esc(cell.blank)}">${cell.after?lines(cell.after):""}`}
  function reasonLine(item){let html=lines(item.before||"");for(const suffix of ["","2","3","4"]){const blank=item[`blank${suffix}`];if(!blank)continue;html+=`<input class="ch15-inline-input" data-textbook-draft="${blank}" value="${draftValue(blank)}" aria-label="${esc(blank)}">${lines(item[`after${suffix}`]||"")}`}return html}
  const officialToggle=id=>`<button class="secondary-button" type="button" data-official-toggle="${id}">答案を見る / 顯示答案</button>`;
  function questionCards(){
    const [think,confirm,discuss,challenge]=data.textbookActivities.sections;
    const confirmQuestions=`<section class="ch14-subsection"><h3>1）${ruby("質問に答えてください。")}</h3><div class="textbook-answer-grid">${confirm.questions.map(item=>`<article class="textbook-answer-card"><span>${item.number}</span><h3>${ruby(item.q)}</h3><label>自己的答案（不會自動評分）<textarea rows="5" data-textbook-draft="${item.id}" lang="ja">${draftValue(item.id)}</textarea></label>${officialToggle(item.id)}<div class="ch14-official-answer" data-official-answer="${item.id}" hidden><b>官方答案 / 課本解答</b><p>${ruby(item.answer)}</p></div></article>`).join("")}</div></section>`;
    const table=confirm.calendarTable;
    const calendarTable=`<section class="ch14-subsection"><h3>2）${ruby(table.prompt)}</h3><p class="ch15-no-grade">請先自行整理；答案不會自動填入或評分。</p><div class="ch17-calendar-table-wrap"><table class="ch17-calendar-table"><thead><tr><th></th>${table.columns.map(column=>`<th>${ruby(column)}</th>`).join("")}</tr></thead><tbody>${table.rows.map(row=>`<tr><th>${ruby(row.label)}</th><td>${tableCell(row.old)}</td><td>${tableCell(row.modern)}</td></tr>`).join("")}</tbody></table></div>${officialToggle(table.id)}<div class="ch14-official-answer" data-official-answer="${table.id}" hidden><b>官方答案 / 課本解答</b><ol>${table.answers.map((answer,index)=>`<li>${"①②③④⑤⑥"[index]} ${ruby(answer)}</li>`).join("")}</ol><small class="ch17-errata-note">${esc(table.answerNote)}</small></div></section>`;
    const reasons=confirm.reasons;
    const reasonExercise=`<section class="ch14-subsection"><h3>3）${ruby(reasons.prompt)}</h3><p class="ch15-no-grade">請依本文自由填寫；不會按字面嚴格評分。</p>${reasons.groups.map(group=>`<div class="ch17-reason-group"><b>${ruby(group.title)}</b><ol>${group.items.map(item=>`<li>${reasonLine(item)}</li>`).join("")}</ol></div>`).join("")}${officialToggle(reasons.id)}<div class="ch14-official-answer" data-official-answer="${reasons.id}" hidden><b>官方答案 / 課本解答</b><ol>${reasons.answers.map((answer,index)=>`<li>${"①②③④⑤⑥⑦⑧"[index]} ${ruby(answer)}</li>`).join("")}</ol></div></section>`;
    const challengeBody=`<article class="ch14-textbook-task"><span>作文</span><p>${lines(challenge.prompt)}</p><div class="ch14-writing-guide"><b>${ruby("文章の流れ：")}</b>${challenge.flow.map(step=>`<span>${ruby(step)}</span>`).join("")}</div><label for="draft-challenge">自己的文章（不會自動評分）</label><textarea id="draft-challenge" rows="15" data-textbook-draft="challenge-writing" data-character-count lang="ja">${draftValue("challenge-writing")}</textarea><small class="ch14-character-count">現在：<span>${[...(state.textbookDrafts["challenge-writing"]||"")].length}</span> 字（課本目安：約400字）</small>${modelAnswer({id:"challenge-model",model:challenge.model,modelNote:challenge.modelNote})}</article>`;
    return shell("課本『読む・書く』原題","依課本順序完成 1・3・4・5；官方答案與非官方參考回答例均預設隱藏。",`<div class="ch14-textbook-sections"><section class="ch14-textbook-section">${sectionHeader(think)}<div class="ch14-section-body">${think.items.map(item=>openTask(item,8)).join("")}</div></section><section class="ch14-textbook-section">${sectionHeader(confirm)}<div class="ch14-section-body">${confirmQuestions}${calendarTable}${reasonExercise}</div></section><section class="ch14-textbook-section">${sectionHeader(discuss)}<div class="ch14-section-body">${discuss.items.map(item=>openTask(item,9)).join("")}</div></section><section class="ch14-textbook-section">${sectionHeader(challenge)}<div class="ch14-section-body">${challengeBody}</div></section></div>`);
  }
  function findAnswers(){const task=data.find[findIndex%data.find.length];return shell("原文找答案",`問題 ${findIndex+1}/${data.find.length} · 點選包含答案的段落。`,`<article class="find-prompt"><h3>${esc(task.q)}</h3><p>${esc(task.hint)}</p></article><div class="find-passages">${data.paragraphs.map(p=>`<button data-find="${p.id}"><span>段落 0${p.id}</span>${ruby(p.jp)}</button>`).join("")}</div><p class="find-feedback"></p><button class="primary-button find-next" hidden>下一題 →</button>`)}
  function vocab(){const [jp,zh]=data.vocab[state.vocabIndex%data.vocab.length];return shell("單字練習","點卡翻面；鍵盤可用 Space、←、→。",`<button class="reading-vocab-card ${state.vocabFlipped?'flipped':''}" id="reading-vocab-card"><span>${state.vocabIndex+1} / ${data.vocab.length}</span><strong>${ruby(jp)}</strong>${state.vocabFlipped?`<b class="reading-card-answer">${esc(zh)}</b><small>點擊或按 Space 返回題目</small>`:`<small>點擊查看中文意思</small>`}</button><div class="card-actions"><button data-vocab-nav="prev">← 上一個</button><button data-vocab-star>${state.wrong.includes(`v${state.vocabIndex}`)?"★ 重溫中":"☆ 加入重溫"}</button><button data-vocab-nav="next">下一個 →</button></div><div class="vocab-overview">${data.vocab.map((v,i)=>`<button data-vocab-jump="${i}" class="${i===state.vocabIndex?'active':''}">${ruby(v[0])}</button>`).join("")}</div>`)}
  function exam(){return shell("模擬考試",`${data.questions.length} 題應用程式練習一次完成，未提交答案會自動保存；提交後才顯示分數。`,`<div class="exam-list">${data.questions.map((q,i)=>`<article><span>${String(i+1).padStart(2,"0")}</span><h3>${questionText(q)}</h3><div>${q.options.map((o,n)=>`<label><input type="radio" name="${q.id}" value="${n}" ${state.examAnswers[q.id]===n?'checked':''}> ${optionText(q,o)}</label>`).join("")}</div></article>`).join("")}</div><div class="exam-submit"><p id="exam-status">已答 ${Object.keys(state.examAnswers).length} / ${data.questions.length}</p><button class="primary-button" id="submit-reading-exam">提交試卷 →</button></div><section class="reading-result" hidden></section>`)}
  function mistakes(){const qs=data.questions.filter(q=>state.wrong.includes(q.id)),words=data.vocab.filter((_,i)=>state.wrong.includes(`v${i}`));return shell("錯題重溫","模擬考試答錯或標記的單字會集中在這裡。",`${!qs.length&&!words.length?'<div class="empty-state"><h2>暫時冇錯題</h2><p>完成模擬考試後，錯題會自動出現在這裡。</p></div>':`<div class="mistake-list">${qs.map(q=>`<article><span>模擬考試</span><h3>${questionText(q)}</h3><p>答案：${optionText(q,q.options[q.answer])}</p><p>${esc(q.why)}</p><button class="chip" data-clear-wrong="${q.id}">標記已掌握</button></article>`).join("")}${words.map(([jp,zh])=>`<article><span>單字</span><h3>${ruby(jp)}</h3><p>${esc(zh)}</p></article>`).join("")}</div>`}`)}
  const renderers={original,translation,questions:questionCards,find:findAnswers,vocab,exam,mistakes};
  function setMode(mode){state.mode=mode;state.vocabFlipped=false;findIndex=0;save();render()}
  function bind(){
    stage.querySelectorAll("[data-textbook-draft]").forEach(field=>field.addEventListener("input",()=>{state.textbookDrafts[field.dataset.textbookDraft]=field.value;const count=field.matches("[data-character-count]")?stage.querySelector(".ch14-character-count span"):null;if(count)count.textContent=[...field.value].length;save()}));
    stage.querySelectorAll("[data-official-toggle]").forEach(button=>button.onclick=()=>{const panel=stage.querySelector(`[data-official-answer="${button.dataset.officialToggle}"]`);panel.hidden=!panel.hidden;button.textContent=panel.hidden?"答案を見る / 顯示答案":"答案を隠す / 隱藏答案"});
    stage.querySelectorAll("[data-model-toggle]").forEach(button=>button.onclick=()=>{const panel=stage.querySelector(`[data-model-answer="${button.dataset.modelToggle}"]`);panel.hidden=!panel.hidden;button.setAttribute("aria-expanded",String(!panel.hidden));button.textContent=panel.hidden?"參考回答例を見る":"參考回答例を隠す"});
    stage.querySelectorAll("[data-find]").forEach(b=>b.onclick=()=>{const task=data.find[findIndex%data.find.length],ok=Number(b.dataset.find)===task.answer;stage.querySelectorAll("[data-find]").forEach(x=>x.disabled=true);b.classList.add(ok?"correct":"wrong");stage.querySelector(`[data-find="${task.answer}"]`).classList.add("correct");stage.querySelector(".find-feedback").textContent=ok?"搵啱了，呢段包含完整答案。":"答案在綠色段落；再對照問題讀一次。";stage.querySelector(".find-next").hidden=false});
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
  function render(){document.querySelectorAll("[data-reading-mode]").forEach(b=>b.classList.toggle("active",b.dataset.readingMode===state.mode));stage.innerHTML=(renderers[state.mode]||original)();bind()}
  document.querySelectorAll("[data-reading-mode]").forEach(b=>b.onclick=()=>setMode(b.dataset.readingMode));
  document.querySelector("#font-down").onclick=()=>{state.font=Math.max(0,state.font-1);save();render()};
  document.querySelector("#font-up").onclick=()=>{state.font=Math.min(2,state.font+1);save();render()};
  document.querySelector("#furigana-toggle").onclick=e=>{state.furigana=!state.furigana;e.currentTarget.textContent=`假名 ${state.furigana?'ON':'OFF'}`;save();render()};
  document.querySelector("#furigana-toggle").textContent=`假名 ${state.furigana?'ON':'OFF'}`;
  document.addEventListener("keydown",e=>{if(e.target.matches("input,textarea,select"))return;if(state.mode==="vocab"&&e.code==="Space"){e.preventDefault();state.vocabFlipped=!state.vocabFlipped;save();render()}if(state.mode==="vocab"&&["ArrowLeft","ArrowRight"].includes(e.key)){state.vocabIndex=(state.vocabIndex+(e.key==="ArrowRight"?1:data.vocab.length-1))%data.vocab.length;state.vocabFlipped=false;save();render()}});
  render();
});
