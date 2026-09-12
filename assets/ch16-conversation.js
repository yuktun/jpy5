document.addEventListener("DOMContentLoaded", () => {
  const data = window.JPY5_CONVERSATION;
  const stage = document.querySelector("#conversation-stage");
  const audio = document.querySelector("#lesson-audio");
  const fresh = () => ({mode:"dialogue", card:0, flipped:false, attempts:0, marks:{}, mistakes:{}, stars:{}, comprehensionAnswers:{}, comprehensionMistakes:{}});
  let state = {...fresh(), ...JPY5.read("conversation", {})};
  let current = 0;
  let built = [];
  let orderPool = [];

  const item = id => data.items.find(x => x.id === Number(id));
  const esc = value => String(value).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const clean = value => value.replace(/[\s、。！？?「」『』,.，．]/g, "").trim();
  const save = () => { JPY5.write("conversation", state); updateSummary(); };
  function updateSummary() {
    document.querySelector("#mastered-count").textContent = Object.values(state.marks).filter(x => x === "correct").length;
    document.querySelector("#attempt-count").textContent = state.attempts || 0;
  }
  function record(id, correct) {
    state.attempts += 1;
    if (correct) state.marks[id] = "correct";
    else { state.marks[id] = "wrong"; state.mistakes[id] = (state.mistakes[id] || 0) + 1; }
    save();
  }
  function play(id) {
    const x = item(id); if (!x) return;
    if (!Number.isFinite(x.start) || !Number.isFinite(x.end) || x.end <= x.start) return;
    audio.currentTime = x.start;
    audio.play().catch(() => {});
    const stop = () => { if (audio.currentTime >= x.end) { audio.pause(); audio.removeEventListener("timeupdate", stop); } };
    audio.addEventListener("timeupdate", stop);
  }
  function setMode(mode) {
    state.mode = mode; state.flipped = false; current = 0; built = []; orderPool = []; save();
    document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
    render();
  }
  const listenButton = (id, label="重聽原句") => {
    const x=item(id);
    return x && Number.isFinite(x.start) && Number.isFinite(x.end) && x.end>x.start
      ? `<button class="listen-button" data-listen="${id}" type="button">▶ ${label}</button>`
      : "";
  };

  function showFocusDetail(id) {
    const x=item(id), dialog=document.querySelector("#focus-detail-dialog"); if(!x||!dialog)return;
    dialog.querySelector("#focus-detail-number").textContent=`底線句 0${x.id}`;
    dialog.querySelector("#focus-detail-title").textContent=x.jp;
    dialog.querySelector("#focus-detail-kana").textContent=x.kana;
    dialog.querySelector("#focus-detail-meaning").textContent=x.zh;
    dialog.querySelector("#focus-detail-use").textContent=x.use;
    dialog.querySelector("#focus-detail-point").textContent=x.point;
    const replay=dialog.querySelector("[data-dialog-listen]");
    replay.dataset.dialogListen=x.id;
    replay.hidden=!(Number.isFinite(x.start)&&Number.isFinite(x.end)&&x.end>x.start);
    dialog.showModal();
  }

  function renderDialogue() {
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">完整會話</p><h2>${data.title}</h2></div><button class="chip" id="toggle-focus" type="button">隱藏底線句</button></div><div class="dialogue-list">${data.dialogue.map(row => {
      const [speaker,before,id,after] = row;
      const focus = id ? `<button class="focus-line" data-focus-line="${id}" type="button" aria-haspopup="dialog" aria-label="查看底線句解釋：${esc(item(id).jp)}">${esc(item(id).jp)}</button>` : "";
      return `<article class="dialogue-row"><b>${esc(speaker)}</b><p>${esc(before)}${focus}${esc(after || "")}</p>${id ? listenButton(id,"播放這句") : ""}</article>`;
    }).join("")}</div>`;
    let hidden = false;
    stage.querySelector("#toggle-focus").onclick = e => {
      hidden = !hidden;
      stage.querySelectorAll(".focus-line").forEach(x => { x.textContent = hidden ? "＿＿＿＿＿＿＿＿" : item(x.dataset.focusLine).jp; x.disabled=hidden; });
      e.currentTarget.textContent = hidden ? "顯示底線句" : "隱藏底線句";
      e.currentTarget.classList.toggle("active", hidden);
    };
  }
  function renderFocus() {
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">重點句子</p><h2>八個聆聽目標</h2></div><span>句段時間碼尚未核實，暫停單句重播</span></div><div class="focus-grid">${data.items.map(x => `<article class="focus-card"><div class="focus-number">0${x.id}</div><button class="star-button ${state.stars[x.id]?'active':''}" data-star="${x.id}" aria-label="收藏句子">${state.stars[x.id]?'★':'☆'}</button><h3>${esc(x.jp)}</h3><p class="focus-meaning">${esc(x.zh)}</p><p>${esc(x.use)}</p>${listenButton(x.id)}</article>`).join("")}</div>`;
  }
  function renderCards() {
    const x = data.items[state.card % data.items.length];
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">記憶卡</p><h2>底線句子卡</h2></div><span>${state.card + 1} / ${data.items.length}</span></div><button class="conversation-card ${state.flipped?'is-flipped':''}" id="conversation-card" type="button"><span class="card-face front"><small>中文意思／用途</small><strong>${esc(x.zh)}</strong><em>點擊或按 Space 翻面</em></span><span class="card-face back"><small>題目 · 中文意思／用途</small><strong class="card-retained-prompt">${esc(x.zh)}</strong><span class="card-answer-label">答案 · 日本語</span><strong>${esc(x.jp)}</strong><em>${esc(x.use)}</em></span></button><div class="card-actions"><button data-card-nav="prev">←</button><button class="danger" data-mark="wrong">×</button><button class="success" data-mark="correct">✓</button><button data-star="${x.id}" class="${state.stars[x.id]?'is-starred':''}">${state.stars[x.id]?'★':'☆'}</button><button data-card-nav="next">→</button></div><div class="card-listen">${listenButton(x.id)}</div>`;
    stage.querySelector("#conversation-card").onclick = () => { state.flipped = !state.flipped; save(); render(); };
  }
  function renderChoice() {
    const x = data.items[current % data.items.length];
    const options = JPY5.shuffle([x.jp, ...x.distractors]);
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">選擇題</p><h2>聽懂話語功能</h2></div><span>${current + 1} / ${data.items.length}</span></div><article class="practice-panel">${listenButton(x.id,"先聽原句")}<p class="question-label">「${esc(x.zh)}」日文點講？</p><div class="conversation-options">${options.map(o => `<button type="button" data-answer="${esc(o)}">${esc(o)}</button>`).join("")}</div><p class="answer-message" aria-live="polite"></p><button class="primary-button next-practice" type="button" hidden>下一題 →</button></article>`;
    stage.querySelectorAll("[data-answer]").forEach(b => b.onclick = () => {
      const ok = b.dataset.answer === x.jp; record(x.id, ok);
      stage.querySelectorAll("[data-answer]").forEach(o => { o.disabled = true; if (o.dataset.answer === x.jp) o.classList.add("correct"); });
      if (!ok) b.classList.add("wrong");
      stage.querySelector(".answer-message").textContent = ok ? `答對了。${x.use}` : `正確答案：${x.jp}`;
      stage.querySelector(".next-practice").hidden = false;
    });
    stage.querySelector(".next-practice").onclick = () => { current = (current + 1) % data.items.length; render(); };
  }
  function renderComprehension() {
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">教材問題</p><h2>內容與表現理解</h2></div><span>${data.comprehension.length} 題</span></div><div class="reading-question-list">${data.comprehension.map((q,index) => {
      const selected=state.comprehensionAnswers[q.id], answered=selected!==undefined;
      return `<article class="reading-question" data-comprehension="${q.id}"><span>${q.kind} · ${String(index+1).padStart(2,"0")}</span><h3>${esc(q.q)}</h3><div>${q.options.map((option,i)=>`<button data-comprehension-answer="${i}" ${answered?"disabled":""} class="${answered&&i===q.answer?"correct":answered&&i===selected&&i!==q.answer?"wrong":""}">${esc(option)}</button>`).join("")}</div><p class="reading-feedback">${answered?`${selected===q.answer?"答對。":"未正確。"}${esc(q.why)}`:""}</p></article>`;
    }).join("")}</div>`;
    stage.querySelectorAll("[data-comprehension-answer]").forEach(button => button.onclick = () => {
      const card=button.closest("[data-comprehension]"), q=data.comprehension.find(entry=>entry.id===card.dataset.comprehension), selected=Number(button.dataset.comprehensionAnswer), ok=selected===q.answer;
      state.comprehensionAnswers[q.id]=selected; state.attempts+=1;
      if(ok) delete state.comprehensionMistakes[q.id]; else state.comprehensionMistakes[q.id]=(state.comprehensionMistakes[q.id]||0)+1;
      save(); render();
    });
  }
  function renderOrder() {
    const x = data.items[current % data.items.length];
    if (!orderPool.length && !built.length) orderPool = JPY5.shuffle(x.chunks);
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">句子重組</p><h2>砌出完整底線句</h2></div><span>${current + 1} / ${data.items.length}</span></div><article class="practice-panel">${listenButton(x.id,"聽一次提示")}<p class="focus-meaning">${esc(x.zh)}</p><div class="sentence-build">${built.length ? built.map((c,i) => `<button data-remove="${i}">${esc(c)}</button>`).join("") : '<span>點下面詞塊組成句子</span>'}</div><div class="word-bank">${orderPool.map((c,i) => `<button data-chunk="${i}">${esc(c)}</button>`).join("")}</div><div class="practice-actions"><button class="text-button" id="clear-build">重新開始</button><button class="primary-button" id="check-build">檢查答案</button></div><p class="answer-message"></p></article>`;
    stage.querySelectorAll("[data-chunk]").forEach(b => b.onclick = () => { built.push(orderPool.splice(Number(b.dataset.chunk),1)[0]); render(); });
    stage.querySelectorAll("[data-remove]").forEach(b => b.onclick = () => { orderPool.push(built.splice(Number(b.dataset.remove),1)[0]); render(); });
    stage.querySelector("#clear-build").onclick = () => { built=[]; orderPool=JPY5.shuffle(x.chunks); render(); };
    stage.querySelector("#check-build").onclick = () => {
      const ok = built.join("") === x.chunks.join(""); record(x.id,ok);
      stage.querySelector(".answer-message").textContent = ok ? "正確！已經排好完整句子。" : "次序未啱，再聽一次慢慢試。";
      if (ok) setTimeout(() => { built=[]; orderPool=[]; current=(current+1)%data.items.length; render(); }, 900);
    };
  }
  function renderCloze() {
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">會話填寫</p><h2>一口氣填回八個目標</h2></div><span>${data.items.length} 個編號位置</span></div><article class="practice-panel"><div class="cloze-intro"><button class="listen-button" id="play-full" type="button">▶ 由開頭播放全段</button><p>先聽完整會話，再在編號位置輸入答案。標點及空格不影響評分。</p></div><div class="dialogue-list cloze-list">${data.dialogue.map(row => {
      const [speaker,before,id,after] = row;
      const blank = id ? `<label class="cloze-blank"><span>底線 ${id}</span><input data-cloze="${id}" lang="ja" autocomplete="off" placeholder="輸入聽到的句子"></label>` : "";
      return `<article class="dialogue-row"><b>${esc(speaker)}</b><p>${esc(before)}${blank}${esc(after || "")}</p></article>`;
    }).join("")}</div><div class="practice-actions"><button class="text-button" id="reveal-cloze">顯示答案</button><button class="primary-button" id="check-cloze">檢查八項</button></div><p class="answer-message"></p></article>`;
    stage.querySelector("#play-full").onclick = () => { audio.currentTime=0; audio.play().catch(()=>{}); };
    stage.querySelector("#reveal-cloze").onclick = () => data.items.forEach(x => { stage.querySelector(`[data-cloze="${x.id}"]`).value=x.jp; });
    stage.querySelector("#check-cloze").onclick = () => {
      let score=0;
      data.items.forEach(x => { const input=stage.querySelector(`[data-cloze="${x.id}"]`); const ok=clean(input.value)===clean(x.jp); input.classList.toggle("correct",ok); input.classList.toggle("wrong",!ok); record(x.id,ok); if(ok)score++; });
      stage.querySelector(".answer-message").textContent = score===data.items.length ? "全部句子正確！" : `答對 ${score}/${data.items.length}。紅色位置可到「重點句子」重溫。`;
    };
  }
  function renderDictation() {
    const x = data.items[current % data.items.length];
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">精確默寫</p><h2>聽完寫出整句</h2></div><span>${current + 1} / ${data.items.length}</span></div><article class="practice-panel dictation-panel">${listenButton(x.id,"播放考題")}<p>${esc(x.zh)}</p><label>輸入日文句子<textarea id="dictation-answer" rows="4" lang="ja" autocomplete="off" placeholder="ここに入力してください"></textarea></label><div class="practice-actions"><button class="text-button" id="show-answer">顯示答案</button><button class="primary-button" id="check-dictation">檢查答案</button></div><p class="answer-message"></p></article>`;
    stage.querySelector("#show-answer").onclick = () => stage.querySelector(".answer-message").textContent = x.jp;
    stage.querySelector("#check-dictation").onclick = () => {
      const ok = clean(stage.querySelector("#dictation-answer").value) === clean(x.jp); record(x.id,ok);
      stage.querySelector(".answer-message").textContent = ok ? "完全正確！" : `未完全一致。正確句子：${x.jp}`;
      if (ok) setTimeout(() => { current=(current+1)%data.items.length; render(); }, 1000);
    };
  }
  function renderMistakes() {
    const wrong = data.items.filter(x => state.mistakes[x.id]);
    const comprehensionWrong=data.comprehension.filter(q=>state.comprehensionMistakes[q.id]);
    const total=wrong.length+comprehensionWrong.length;
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">錯題重溫</p><h2>針對容易錯的內容</h2></div><span>${total} 項待重溫</span></div>${total ? `<div class="mistake-list">${wrong.map(x => `<article><span>句子練習 · 錯過 ${state.mistakes[x.id]} 次</span><h3>${esc(x.jp)}</h3><p>${esc(x.zh)}</p>${listenButton(x.id)}<button class="chip" data-mastered="${x.id}">標記已掌握</button></article>`).join("")}${comprehensionWrong.map(q=>`<article><span>${q.kind} · 錯過 ${state.comprehensionMistakes[q.id]} 次</span><h3>${esc(q.q)}</h3><p>答案：${esc(q.options[q.answer])}</p><p>${esc(q.why)}</p><button class="chip" data-mastered-comprehension="${q.id}">標記已掌握</button></article>`).join("")}</div>` : `<div class="empty-state"><h2>暫時沒有錯題</h2><p>完成教材問題、選擇題、重組或默寫後，錯題會自動來到這裡。</p><button class="primary-button" data-go-choice>開始選擇題 →</button></div>`}`;
    stage.querySelector("[data-go-choice]")?.addEventListener("click",()=>setMode("choice"));
    stage.querySelectorAll("[data-mastered]").forEach(b => b.onclick = () => { delete state.mistakes[b.dataset.mastered]; state.marks[b.dataset.mastered]="correct"; save(); render(); });
    stage.querySelectorAll("[data-mastered-comprehension]").forEach(b => b.onclick = () => { delete state.comprehensionMistakes[b.dataset.masteredComprehension]; save(); render(); });
  }
  function render() {
    const renderers = {dialogue:renderDialogue,comprehension:renderComprehension,focus:renderFocus,cards:renderCards,choice:renderChoice,order:renderOrder,cloze:renderCloze,dictation:renderDictation,mistakes:renderMistakes};
    (renderers[state.mode] || renderDialogue)();
    stage.querySelectorAll("[data-focus-line]").forEach(b => b.onclick = () => showFocusDetail(b.dataset.focusLine));
    stage.querySelectorAll("[data-listen]").forEach(b => b.onclick = () => play(b.dataset.listen));
    stage.querySelectorAll("[data-star]").forEach(b => b.onclick = () => { const id=b.dataset.star; state.stars[id] = !state.stars[id]; save(); render(); });
    stage.querySelectorAll("[data-card-nav]").forEach(b => b.onclick = () => { state.card=(state.card+(b.dataset.cardNav==="next"?1:data.items.length-1))%data.items.length; state.flipped=false; save(); render(); });
    JPY5.bindSwipe(stage.querySelector("#conversation-card"),{next:()=>stage.querySelector('[data-card-nav="next"]')?.click(),previous:()=>stage.querySelector('[data-card-nav="prev"]')?.click()});
    stage.querySelectorAll("[data-mark]").forEach(b => b.onclick = () => { record(data.items[state.card].id,b.dataset.mark==="correct"); state.card=(state.card+1)%data.items.length; state.flipped=false; save(); render(); });
  }

  document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => setMode(b.dataset.mode));
  const detailDialog=document.querySelector("#focus-detail-dialog");
  detailDialog.querySelector("[data-dialog-close]").onclick=()=>detailDialog.close();
  detailDialog.querySelector("[data-dialog-listen]").onclick=e=>play(e.currentTarget.dataset.dialogListen);
  detailDialog.addEventListener("click",e=>{if(e.target===detailDialog)detailDialog.close();});
  document.querySelector("#reset-conversation").onclick = () => { if (confirm("清除本頁所有會話練習進度？")) { state=fresh(); save(); setMode("dialogue"); } };
  document.addEventListener("keydown", e => {
    if (e.target.matches("input,textarea,select")) return;
    if (state.mode === "cards" && e.code === "Space") { e.preventDefault(); state.flipped=!state.flipped; save(); render(); }
    if (state.mode === "cards" && ["ArrowLeft","ArrowRight"].includes(e.key)) { state.card=(state.card+(e.key==="ArrowRight"?1:data.items.length-1))%data.items.length; state.flipped=false; save(); render(); }
  });
  document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("active",b.dataset.mode===state.mode));
  updateSummary(); render();
});
