document.addEventListener("DOMContentLoaded", () => {
  const data = window.JPY5_CONVERSATION;
  const stage = document.querySelector("#conversation-stage");
  const audio = document.querySelector("#lesson-audio");
  const fresh = () => ({mode:"dialogue", card:0, flipped:false, furigana:true, attempts:0, marks:{}, mistakes:{}, stars:{}, comprehensionAnswers:{}, comprehensionMistakes:{}, drafts:{}});
  let state = {...fresh(), ...JPY5.read("conversation", {})};
  let current = 0;
  let built = [];
  let orderPool = [];
  let detailScrollY = 0, detailReturnFocus = null, activeAudioStop = null, audioPlayToken = 0;
  const lockDetailBackground = () => { detailScrollY = window.scrollY; document.body.classList.add("grammar-extra-open"); document.body.style.top = "-" + detailScrollY + "px"; };
  const unlockDetailBackground = () => { const root=document.documentElement, previous=root.style.scrollBehavior; root.style.scrollBehavior="auto"; document.body.classList.remove("grammar-extra-open"); document.body.style.top=""; window.scrollTo({left:0,top:detailScrollY,behavior:"auto"}); requestAnimationFrame(()=>{root.style.scrollBehavior=previous;}); };

  const item = id => data.items.find(x => x.id === Number(id));
  const esc = value => String(value).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const kanjiRun=/[\u3400-\u9fff々〆ヶ]/;
  function segmentedRuby(word,reading){const explicit=data.furiganaSegments?.[word];if(explicit)return explicit.map(([base,kana])=>kana===undefined?esc(base):`<ruby>${esc(base)}<rt>${esc(kana)}</rt></ruby>`).join("");if(!kanjiRun.test(word))return esc(word);const parts=word.match(/[\u3400-\u9fff々〆ヶ]+|[^\u3400-\u9fff々〆ヶ]+/g)||[word];if(parts.length===1)return `<ruby>${esc(word)}<rt>${esc(reading)}</rt></ruby>`;let r=reading;return parts.map((p,i)=>{if(!kanjiRun.test(p)){if(r.startsWith(p))r=r.slice(p.length);return esc(p)}const n=parts.slice(i+1).find(x=>!kanjiRun.test(x)),l=n?Math.max(0,r.indexOf(n)):r.length,k=r.slice(0,l);r=r.slice(l);return `<ruby>${esc(p)}<rt>${esc(k)}</rt></ruby>`}).join("")}
  function ruby(text){if(!state.furigana)return esc(text);const m=new Map(Object.entries(data.furigana||{})),w=[...m.keys()].sort((a,b)=>b.length-a.length),p=new RegExp(w.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g");let out="",last=0;for(const x of String(text).matchAll(p)){out+=esc(String(text).slice(last,x.index))+segmentedRuby(x[0],m.get(x[0]));last=x.index+x[0].length}return out+esc(String(text).slice(last))}
  function embeddedRuby(text){let out=esc(text);for(const x of (data.embeddedJapanese||[]).sort((a,b)=>b.length-a.length))out=out.split(esc(x)).join(ruby(x));return out}
  const rubyIfJapanese=t=>/[ぁ-ゖァ-ヺ]/.test(String(t))?ruby(t):esc(t);
  const multiline = text => ruby(text).replace(/\n/g,"<br>");
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
    if (activeAudioStop) audio.removeEventListener("timeupdate", activeAudioStop);
    const token=++audioPlayToken;
    audio.currentTime = x.start;
    audio.play().catch(() => {});
    const stop = () => { if(token!==audioPlayToken)return;if(audio.currentTime >= x.end){audio.pause();audio.removeEventListener("timeupdate",stop);if(activeAudioStop===stop)activeAudioStop=null;} };
    activeAudioStop=stop; audio.addEventListener("timeupdate", stop);
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
    dialog.querySelector("#focus-detail-title").innerHTML=ruby(x.jp);
    dialog.querySelector("#focus-detail-kana").textContent=x.kana;
    dialog.querySelector("#focus-detail-meaning").textContent=x.zh;
    dialog.querySelector("#focus-detail-use").textContent=x.use;
    dialog.querySelector("#focus-detail-point").textContent=x.point;
    const replay=dialog.querySelector("[data-dialog-listen]");
    replay.dataset.dialogListen=x.id;
    replay.hidden=!(Number.isFinite(x.start)&&Number.isFinite(x.end)&&x.end>x.start);
    detailReturnFocus=document.activeElement; lockDetailBackground();
    dialog.showModal();
  }

  function renderDialogue() {
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">課本 3. もう一度聞こう</p><h2>${ruby(data.title)}</h2></div><button class="chip" id="toggle-focus" type="button">隱藏底線句</button></div><div class="dialogue-list">${data.dialogue.map(row => {
      const [speaker,before,id,after] = row;
      const focus = id ? `<button class="focus-line" data-focus-line="${id}" data-answer-text="${esc(item(id).jp)}" type="button" aria-haspopup="dialog" aria-label="查看底線句解釋">${ruby(item(id).jp)}</button>` : "";
      return `<article class="dialogue-row"><b>${ruby(speaker)}</b><p>${ruby(before)}${focus}${ruby(after || "")}</p>${id ? listenButton(id,"播放這句") : ""}</article>`;
    }).join("")}</div>`;
    let hidden = false;
    stage.querySelector("#toggle-focus").onclick = e => {
      hidden = !hidden;
      stage.querySelectorAll(".focus-line").forEach(x => { x.innerHTML = hidden ? "＿＿＿＿＿＿＿＿" : ruby(x.dataset.answerText); x.disabled=hidden; });
      e.currentTarget.textContent = hidden ? "顯示底線句" : "隱藏底線句";
      e.currentTarget.classList.toggle("active", hidden);
    };
  }
  const completeDialogueText = row => {
    const [,before,id,after] = row, target = id ? item(id) : null;
    const answer = target ? (target.segments ? target.segments.map(segment => segment.text).join("") : target.jp) : "";
    return `${before || ""}${answer}${after || ""}`;
  };
  function renderTranslation() {
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">全文中文翻譯</p><h2>${esc(data.title)}</h2></div><span>${data.translation.length} 句雙語對照</span></div><div class="dialogue-list translation-list">${data.translation.map(([speaker,text],index) => `<article class="dialogue-row"><b>${esc(speaker)}</b><p lang="zh-Hant">${esc(text)}<span class="translation-original" lang="ja">${ruby(completeDialogueText(data.dialogue[index]))}</span></p></article>`).join("")}</div>`;
  }
  function renderFocus() {
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">重點句子</p><h2>八個聆聽目標</h2></div><span>已按官方 MP3 核實句段</span></div><div class="focus-grid">${data.items.map(x => `<article class="focus-card"><div class="focus-number">0${x.id}</div><button class="star-button ${state.stars[x.id]?'active':''}" data-star="${x.id}" aria-label="收藏句子">${state.stars[x.id]?'★':'☆'}</button><h3>${ruby(x.jp)}</h3><p class="focus-meaning">${esc(x.zh)}</p><p>${esc(x.use)}</p>${listenButton(x.id)}</article>`).join("")}</div>`;
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
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">理解練習</p><h2>內容與表現理解</h2></div><span>6 題自訂練習 ＋ 8 題課本原題</span></div><div class="reading-question-list">${data.comprehension.map((q,index) => {
      const selected=state.comprehensionAnswers[q.id], answered=selected!==undefined;
      return `<article class="reading-question" data-comprehension="${q.id}"><span>${q.kind} · ${String(index+1).padStart(2,"0")}</span><h3>${embeddedRuby(q.q)}</h3><div>${q.options.map((option,i)=>`<button data-comprehension-answer="${i}" ${answered?"disabled":""} class="${answered&&i===q.answer?"correct":answered&&i===selected&&i!==q.answer?"wrong":""}">${rubyIfJapanese(option)}</button>`).join("")}</div><p class="reading-feedback">${answered?`${selected===q.answer?"答對。":"未正確。"}${embeddedRuby(q.why)}`:""}</p></article>`;
    }).join("")}</div><section class="textbook-listen-section"><div class="section-divider"><p class="kicker">課本原題 · 2. 聞いてみよう</p><h2>課本內容・表現問題</h2><p>自由作答，不自動評分；需要時再查看官方答案。</p></div><div class="textbook-answer-grid">${data.textbookQuestions.map(q=>`<article class="textbook-answer-card"><span>${ruby(q.group)} · ${q.number}</span><h3>${ruby(q.q)}</h3><label>你的答案<textarea rows="4" data-draft="${q.id}" lang="ja" placeholder="ここに入力してください">${esc(state.drafts?.[q.id]||"")}</textarea></label><button class="secondary-button" type="button" data-reference-toggle="${q.id}" data-closed-label="答案を見る / 顯示答案">答案を見る / 顯示答案</button><div class="reference-answer" data-reference="${q.id}" hidden><b>官方答案 / 課本解答</b><p>${ruby(q.answer)}</p><small>${esc(q.explain)}</small></div></article>`).join("")}</div></section>`;
    stage.querySelectorAll("[data-comprehension-answer]").forEach(button => button.onclick = () => {
      const card=button.closest("[data-comprehension]"), q=data.comprehension.find(entry=>entry.id===card.dataset.comprehension), selected=Number(button.dataset.comprehensionAnswer), ok=selected===q.answer;
      state.comprehensionAnswers[q.id]=selected; state.attempts+=1;
      if(ok) delete state.comprehensionMistakes[q.id]; else state.comprehensionMistakes[q.id]=(state.comprehensionMistakes[q.id]||0)+1;
      save(); render();
    });
    bindDraftsAndReferences();
  }

  function bindDraftsAndReferences() {
    stage.querySelectorAll("[data-draft]").forEach(field => field.addEventListener("input", () => {
      state.drafts ||= {}; state.drafts[field.dataset.draft] = field.value; save();
    }));
    stage.querySelectorAll("[data-reference-toggle]").forEach(button => button.onclick = () => {
      const answer=stage.querySelector(`[data-reference="${button.dataset.referenceToggle}"]`), opening=answer.hidden;
      answer.hidden=!opening; button.textContent=opening ? (button.dataset.closedLabel.startsWith("答案")?"答案を隠す / 隱藏答案":"參考回答例を隠す") : button.dataset.closedLabel;
    });
  }

  function renderActivityTask(task) {
    return `<article class="textbook-task-card"><p class="textbook-prompt">${multiline(task.prompt)}</p><label>你的準備稿<textarea rows="6" data-draft="${task.id}" lang="ja" placeholder="ここに入力してください">${esc(state.drafts?.[task.id]||"")}</textarea></label><button class="secondary-button" type="button" data-reference-toggle="${task.id}" data-closed-label="參考回答例を見る">參考回答例を見る</button><div class="reference-answer" data-reference="${task.id}" hidden><b>${esc(task.modelLabel)}</b><p>${multiline(task.model)}</p></div></article>`;
  }

  function renderActivities() {
    const groups=["1. やってみよう","4. 言ってみよう","5. 練習しよう","6. チャレンジしよう"];
    stage.innerHTML=`<div class="stage-heading"><div><p class="kicker">課本活動</p><h2>話して、聞いて、練習しよう</h2></div><span>自由作答 · 不自動評分</span></div><div class="textbook-activity-list">${groups.map(section=>{
      const entries=data.textbookActivities.filter(entry=>entry.section===section);
      return `<section class="textbook-activity-card"><header><span>課本原題</span><h2>${ruby(section)}</h2></header>${entries.map(entry=>{
        if(entry.kind==="pronunciation")return `<div class="activity-group pronunciation-activity"><p class="textbook-prompt">${ruby(entry.prompt)}</p><div class="pronunciation-number-grid">${["①","②","③","④"].map(number=>`<article><strong>${number}</strong><span>課本の絵を見ながら、MP3のとおりに言ってみましょう。</span></article>`).join("")}</div><div class="practice-actions"><button class="listen-button" type="button" data-play-main>▶ 主音訊を再生</button><a class="secondary-button" data-ch15-textbook href="#" target="_blank" rel="noopener">原課本を見る ↗</a></div><small>發音及語調練習不會自動評分。</small></div>`;
        if(entry.tasks)return `<div class="activity-group"><h3>${ruby(entry.exercise)}</h3><p>${ruby(entry.instruction)}</p>${entry.tasks.map(renderActivityTask).join("")}</div>`;
        return renderActivityTask(entry);
      }).join("")}</section>`;
    }).join("")}</div>`;
    bindDraftsAndReferences();
    stage.querySelector("[data-play-main]")?.addEventListener("click",()=>{audioPlayToken++;if(activeAudioStop)audio.removeEventListener("timeupdate",activeAudioStop);activeAudioStop=null;audio.currentTime=0;audio.play().catch(()=>{});});
    if(window.JPY5?.sources?.textbook)stage.querySelectorAll("[data-ch15-textbook]").forEach(link=>link.href=window.JPY5.sources.textbook);
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
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">課本 3. もう一度聞こう</p><h2>一口氣填回八個目標</h2></div><span>${data.items.length} 個編號位置</span></div><article class="practice-panel"><div class="cloze-intro"><button class="listen-button" id="play-full" type="button">▶ 由開頭播放全段</button><p>先聽完整會話，再在編號位置輸入答案。標點及空格不影響評分。</p></div><div class="dialogue-list cloze-list">${data.dialogue.map(row => {
      const [speaker,before,id,after] = row;
      const blank = id ? `<label class="cloze-blank"><span>底線 ${id}</span><input data-cloze="${id}" lang="ja" autocomplete="off" placeholder="輸入聽到的句子"></label>` : "";
      return `<article class="dialogue-row"><b>${esc(speaker)}</b><p>${esc(before)}${blank}${esc(after || "")}</p></article>`;
    }).join("")}</div><div class="practice-actions"><button class="text-button" id="reveal-cloze">官方答案を見る</button><button class="primary-button" id="check-cloze">檢查八項</button></div><div class="reference-answer cloze-official-answers" id="cloze-official-answers" hidden><b>官方答案 / 課本解答</b><ol>${data.items.map(x=>`<li>${ruby(x.jp)}</li>`).join("")}</ol></div><p class="answer-message"></p></article>`;
    stage.querySelector("#play-full").onclick = () => { audioPlayToken++;if(activeAudioStop)audio.removeEventListener("timeupdate",activeAudioStop);activeAudioStop=null;audio.currentTime=0;audio.play().catch(()=>{}); };
    stage.querySelector("#reveal-cloze").onclick = e => { const answers=stage.querySelector("#cloze-official-answers"), opening=answers.hidden; answers.hidden=!opening; e.currentTarget.textContent=opening?"官方答案を隠す":"官方答案を見る"; };
    stage.querySelector("#check-cloze").onclick = () => {
      let score=0;
      data.items.forEach(x => { const input=stage.querySelector(`[data-cloze="${x.id}"]`); const ok=clean(input.value)===clean(x.jp); input.classList.toggle("correct",ok); input.classList.toggle("wrong",!ok); record(x.id,ok); if(ok)score++; });
      stage.querySelector(".answer-message").textContent = score===data.items.length ? "全部句子正確！" : `答對 ${score}/${data.items.length}。紅色位置可到「重點句子」重溫。`;
    };
  }
  function renderDictation() {
    const x = data.items[current % data.items.length];
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">精確默寫</p><h2>聽完寫出整句</h2></div><span>${current + 1} / ${data.items.length}</span></div><article class="practice-panel dictation-panel">${listenButton(x.id,"播放考題")}<p>${esc(x.zh)}</p><label>輸入日文句子<textarea id="dictation-answer" rows="4" lang="ja" autocomplete="off" placeholder="ここに入力してください"></textarea></label><div class="practice-actions"><button class="text-button" id="show-answer">顯示答案</button><button class="primary-button" id="check-dictation">檢查答案</button></div><p class="answer-message"></p></article>`;
    stage.querySelector("#show-answer").onclick = () => stage.querySelector(".answer-message").innerHTML = ruby(x.jp);
    stage.querySelector("#check-dictation").onclick = () => {
      const ok = clean(stage.querySelector("#dictation-answer").value) === clean(x.jp); record(x.id,ok);
      stage.querySelector(".answer-message").innerHTML = ok ? "完全正確！" : `未完全一致。正確句子：${ruby(x.jp)}`;
      if (ok) setTimeout(() => { current=(current+1)%data.items.length; render(); }, 1000);
    };
  }
  function renderMistakes() {
    const wrong = data.items.filter(x => state.mistakes[x.id]);
    const comprehensionWrong=data.comprehension.filter(q=>state.comprehensionMistakes[q.id]);
    const total=wrong.length+comprehensionWrong.length;
    stage.innerHTML = `<div class="stage-heading"><div><p class="kicker">錯題重溫</p><h2>針對容易錯的內容</h2></div><span>${total} 項待重溫</span></div>${total ? `<div class="mistake-list">${wrong.map(x => `<article><span>句子練習 · 錯過 ${state.mistakes[x.id]} 次</span><h3>${esc(x.jp)}</h3><p>${esc(x.zh)}</p>${listenButton(x.id)}<button class="chip" data-mastered="${x.id}">標記已掌握</button></article>`).join("")}${comprehensionWrong.map(q=>`<article><span>${q.kind} · 錯過 ${state.comprehensionMistakes[q.id]} 次</span><h3>${esc(q.q)}</h3><p>答案：${esc(q.options[q.answer])}</p><p>${esc(q.why)}</p><button class="chip" data-mastered-comprehension="${q.id}">標記已掌握</button></article>`).join("")}</div>` : `<div class="empty-state"><h2>暫時沒有錯題</h2><p>完成理解練習、選擇題、重組或默寫後，錯題會自動來到這裡。</p><button class="primary-button" data-go-choice>開始選擇題 →</button></div>`}`;
    stage.querySelector("[data-go-choice]")?.addEventListener("click",()=>setMode("choice"));
    stage.querySelectorAll("[data-mastered]").forEach(b => b.onclick = () => { delete state.mistakes[b.dataset.mastered]; state.marks[b.dataset.mastered]="correct"; save(); render(); });
    stage.querySelectorAll("[data-mastered-comprehension]").forEach(b => b.onclick = () => { delete state.comprehensionMistakes[b.dataset.masteredComprehension]; save(); render(); });
  }
  function render() {
    const renderers = {dialogue:renderDialogue,translation:renderTranslation,comprehension:renderComprehension,activities:renderActivities,focus:renderFocus,cards:renderCards,choice:renderChoice,order:renderOrder,cloze:renderCloze,dictation:renderDictation,mistakes:renderMistakes};
    (renderers[state.mode] || renderDialogue)();
    stage.querySelectorAll('.conversation-options button,.sentence-build button,.word-bank button,.card-answer-label + strong,.mistake-list h3').forEach(node=>node.innerHTML=ruby(node.textContent));
    stage.querySelectorAll("[data-focus-line]").forEach(b => b.onclick = () => showFocusDetail(b.dataset.focusLine));
    stage.querySelectorAll("[data-listen]").forEach(b => b.onclick = () => play(b.dataset.listen));
    stage.querySelectorAll("[data-star]").forEach(b => b.onclick = () => { const id=b.dataset.star; state.stars[id] = !state.stars[id]; save(); render(); });
    stage.querySelectorAll("[data-card-nav]").forEach(b => b.onclick = () => { state.card=(state.card+(b.dataset.cardNav==="next"?1:data.items.length-1))%data.items.length; state.flipped=false; save(); render(); });
    JPY5.bindSwipe(stage.querySelector("#conversation-card"),{next:()=>stage.querySelector('[data-card-nav="next"]')?.click(),previous:()=>stage.querySelector('[data-card-nav="prev"]')?.click()});
    stage.querySelectorAll("[data-mark]").forEach(b => b.onclick = () => { record(data.items[state.card].id,b.dataset.mark==="correct"); state.card=(state.card+1)%data.items.length; state.flipped=false; save(); render(); });
  }

  document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => setMode(b.dataset.mode));
  document.querySelector("#furigana-toggle").onclick=e=>{state.furigana=!state.furigana;e.currentTarget.textContent=`假名 ${state.furigana?'ON':'OFF'}`;save();render();};
  document.querySelector("#furigana-toggle").textContent=`假名 ${state.furigana?'ON':'OFF'}`;
  const detailDialog=document.querySelector("#focus-detail-dialog");
  const closeDetail = () => { if (detailDialog.open) detailDialog.close(); };
  detailDialog.querySelectorAll("[data-dialog-close]").forEach(button => { button.onclick = closeDetail; });
  detailDialog.addEventListener("close", () => { detailReturnFocus?.focus({preventScroll:true}); unlockDetailBackground(); detailReturnFocus=null; });
  detailDialog.querySelector("[data-dialog-listen]").onclick=e=>play(e.currentTarget.dataset.dialogListen);
  detailDialog.addEventListener("click",e=>{if(e.target===detailDialog)closeDetail();});
  detailDialog.addEventListener("cancel",e=>{e.preventDefault();closeDetail();});
  document.querySelector("#reset-conversation").onclick = () => { if (confirm("清除本頁所有會話練習進度？")) { state=fresh(); save(); setMode("dialogue"); } };
  document.addEventListener("keydown", e => {
    if (e.target.matches("input,textarea,select")) return;
    if (state.mode === "cards" && e.code === "Space") { e.preventDefault(); state.flipped=!state.flipped; save(); render(); }
    if (state.mode === "cards" && ["ArrowLeft","ArrowRight"].includes(e.key)) { state.card=(state.card+(e.key==="ArrowRight"?1:data.items.length-1))%data.items.length; state.flipped=false; save(); render(); }
  });
  document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("active",b.dataset.mode===state.mode));
  updateSummary(); render();
});
