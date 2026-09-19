(() => {
  const storageKey = "jpy5-learning-guide-checklist-v1";
  const triggers = document.querySelectorAll(".learning-guide-open");
  if (!triggers.length || !HTMLDialogElement.prototype.showModal) return;
  const steps = [["預習","上堂前快速閱讀課文及文法。唔需要全部背熟，先建立基本印象。"],["理解","上堂時留意老師點樣解釋文法、語境及例句。"],["比較","每課揀一至兩組容易混淆嘅文法做比較。"],["運用","每個主要文法最少自己造一句。盡量使用日常生活、工作或個人經歷。"],["輸出","用日文講一段約一分鐘嘅內容，或者用三句日文概括課文。"],["重溫","一星期後重新測試自己。特別重溫之前答錯嘅生字同文法。"]];
  let returnFocus = null;
  let savedScrollY = 0;
  let progress;
  try { progress = JSON.parse(localStorage.getItem(storageKey)); } catch { progress = []; }
  if (!Array.isArray(progress)) progress = [];
  const save = () => localStorage.setItem(storageKey, JSON.stringify(progress));
  const checklist = () => steps.map(([title, text], index) => `<label class="guide-check-item"><input type="checkbox" data-guide-step="${index}" ${progress[index] ? "checked" : ""}><span><b><i>0${index + 1}</i>${title}</b><small>${text}</small></span></label>`).join("");
  const dialog = document.createElement("dialog");
  dialog.id = "learning-guide-dialog";
  dialog.className = "grammar-extra-dialog learning-guide-dialog";
  dialog.setAttribute("aria-labelledby", "learning-guide-title");
  dialog.innerHTML = `<div class="grammar-extra-head"><div><span>大家的日本語 · 中級 II · 第 13–20 課</span><h2 id="learning-guide-title">Year 5 學習指南</h2></div><button type="button" class="grammar-extra-icon-close" data-guide-close aria-label="關閉學習指南">×</button></div><div class="grammar-extra-body learning-guide-body">
<section class="grammar-extra-section"><h3>第五年，學習重點開始轉變。</h3><p>以前學日文，我哋主要集中記生字、學句型同掌握基本文法。</p><p>去到中級 II，除咗要識文法，更需要識得閱讀長篇文章、理解語境、比較相似表達，以及自然地用日文表達自己嘅想法。</p><p>呢個唔代表以前嘅方法冇用，而係需要喺原有基礎上加入更多理解同運用。</p><div class="grammar-extra-table-wrap"><table class="grammar-extra-table"><thead><tr><th scope="col">以前常用方法</th><th scope="col">Year 5 建議方法</th></tr></thead><tbody><tr><td>背生字意思</td><td>學生字搭配及實際用法</td></tr><tr><td>記住文法規則</td><td>比較相似文法及語感</td></tr><tr><td>逐句翻譯文章</td><td>理解主旨、結構及作者想法</td></tr><tr><td>回答老師問題</td><td>主動解釋及延續對話</td></tr><tr><td>聽到每個字</td><td>理解整體意思、語氣及語境</td></tr></tbody></table></div></section>
<section class="grammar-extra-section"><h3>① 閱讀：唔好只做逐句翻譯</h3><p>建議閱讀時分三步：</p><ol><li>第一次：快速閱讀，理解文章講乜。</li><li>第二次：找出關鍵字、連接詞同段落關係。</li><li>第三次：用兩至三句日文概括內容。</li></ol><p><b>閱讀時特別留意：</b></p><ul><li>作者想表達咩？</li><li>作者心情有冇轉變？</li><li>點解作者會得出呢個結論？</li></ul><p class="grammar-extra-takeaway">學習目標：唔止識翻譯，而係可以用自己嘅說話解釋篇文章。</p></section>
<section class="grammar-extra-section"><h3>② 文法：比較比死記更加重要</h3><p>學習新文法時，唔好只記中文意思。</p><p><b>每次問自己：</b></p><ul><li>呢個句型點接續？</li><li>同之前學過嘅文法有咩分別？</li><li>適合口語定書面語？</li><li>有冇特別語氣或使用限制？</li><li>我可唔可以自己造句？</li></ul><div class="guide-example"><b>例如第 13 課：<span lang="ja">～たて vs ～たばかり</span></b><p>前者通常突出剛完成後嘅新狀態，後者着重事情剛完成或講者覺得發生咗冇幾耐。</p><p>兩者有重疊，但唔可以完全互換。</p></div><p class="guide-tip">提示：有延伸講解嘅文法卡片，可以按「附加資訊」深入學習。</p></section>
<section class="grammar-extra-section"><h3>③ 會話：學識將句子連接起來</h3><p>中級日文唔只係回答一條問題。</p><p><b>練習以下對話流程：</b></p><p class="guide-flow">收到消息 → 確認 → 整理意思 → 表達看法</p><div class="grammar-extra-dialogue"><article><b>A</b><p lang="ja">明日の会議、延期になったんだって？</p></article><article><b>B</b><p lang="ja">うん、来週になったよ。</p></article><article><b>A</b><p lang="ja">つまり、明日は会議がないってこと？</p></article><article><b>B</b><p lang="ja">そうだよ。</p></article><article><b>A</b><p lang="ja">じゃあ、予定を変更する必要があるよね。</p></article></div><p class="grammar-extra-takeaway">學習目標：由單句回答進步到自然對話。</p></section>
<section class="grammar-extra-section"><h3>④ 聽力：唔需要每個字都聽得清楚</h3><p>聽力練習時，先理解整體意思，再處理細節。</p><p><b>特別留意：</b></p><ul><li>講者想表達咩？</li><li>呢句係提問、確認，定係轉述？</li><li>語氣有冇表達驚訝、認同或不滿？</li><li>有冇使用口語縮約？</li></ul><p class="guide-flow" lang="ja">～んだって？　～ってこと？　～よね？</p><p>練習理解佢哋喺對話中嘅功能，而唔係只背中文翻譯。</p></section>
<section class="grammar-extra-section guide-routine"><div class="guide-routine-head"><div><h3>每課建議溫習流程</h3><p>呢個係可重複使用嘅學習指南清單，進度會儲存喺呢部裝置；唔係按課次分開。</p></div><button type="button" class="text-button" data-guide-reset>重設清單</button></div><div class="guide-checklist">${checklist()}</div></section><section class="guide-motivation"><span>Year 5 嘅目標：</span><strong>由「我明白呢句日文」</strong><em>進步到</em><strong>「我可以自然地用日文解釋自己嘅想法。」</strong></section></div><div class="grammar-extra-footer"><button type="button" class="secondary-button" data-guide-close>關閉</button></div>`;
  document.body.append(dialog);
  const lockBackground = () => { savedScrollY = window.scrollY; document.documentElement.classList.add("learning-guide-open"); document.body.classList.add("grammar-extra-open"); document.body.style.top = `-${savedScrollY}px`; };
  const unlockBackground = () => { document.documentElement.classList.remove("learning-guide-open"); document.body.classList.remove("grammar-extra-open"); document.body.style.top = ""; window.scrollTo(0, savedScrollY); };
  const close = () => { if (dialog.open) dialog.close(); unlockBackground(); returnFocus?.focus({ preventScroll: true }); returnFocus = null; };
  triggers.forEach(trigger => trigger.addEventListener("click", () => { returnFocus = document.activeElement; lockBackground(); dialog.showModal(); dialog.querySelector("[data-guide-close]").focus(); }));
  dialog.addEventListener("click", event => { if (event.target === dialog || event.target.closest("[data-guide-close]")) close(); });
  dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
  dialog.addEventListener("change", event => { const input = event.target.closest("[data-guide-step]"); if (input) { progress[Number(input.dataset.guideStep)] = input.checked; save(); } });
  dialog.addEventListener("click", event => { if (event.target.closest("[data-guide-reset]")) { progress = []; save(); dialog.querySelectorAll("[data-guide-step]").forEach(input => { input.checked = false; }); } });
})();
