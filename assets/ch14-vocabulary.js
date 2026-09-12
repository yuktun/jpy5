const { items: vocabulary, sections } = window.JPY5_VOCABULARY;
const defaults = { section:"all", direction:"normal", random:false, filter:"all", index:0, orders:{}, results:{}, starred:[] };
let state = { ...defaults, ...JPY5.read("vocabulary.cards.v2", {}) };
state.orders ||= {}; state.results ||= {}; state.starred ||= [];
let flipped = false;

const $ = selector => document.querySelector(selector);
const byId = id => vocabulary.find(item => item.id === id);
const pronunciation = window.JPY5Pronunciation;
const save = () => JPY5.write("vocabulary.cards.v2", state);
const sectionItems = () => state.section === "all" ? vocabulary : vocabulary.filter(item => item.section === state.section);
const orderKey = () => `${state.section}-${state.random ? "random" : "normal"}`;

function orderedItems() {
  const base = sectionItems();
  if (!state.random) return base;
  const key = orderKey(), baseIds = base.map(item => item.id);
  if (!state.orders[key] || state.orders[key].length !== baseIds.length || state.orders[key].some(id => !baseIds.includes(id))) state.orders[key] = JPY5.shuffle(baseIds);
  return state.orders[key].map(byId).filter(Boolean);
}

function activeItems() {
  const ordered = orderedItems();
  if (state.filter === "all") return ordered;
  if (state.filter === "starred") return ordered.filter(item => state.starred.includes(item.id));
  return ordered.filter(item => state.results[item.id] === state.filter);
}

function current() {
  const deck = activeItems();
  state.index = Math.min(Math.max(0, state.index), Math.max(0, deck.length - 1));
  return deck[state.index];
}

const frontText = item => state.direction === "normal" ? item.kana : (item.original || item.written);
const backTitle = item => state.direction === "normal" ? (item.original || item.written) : item.kana;
const frontLabel = () => state.direction === "normal" ? "平假名／片假名" : "漢字／外語原寫";
const sectionLabel = item => sections[item.section]?.label || "第 14 課";
function scriptLabel(item) { if (item.original) return "英文／外語原寫"; return item.written !== item.kana ? "漢字表記" : "日文表記"; }

function updateStats() {
  const right = Object.values(state.results).filter(value => value === "right").length;
  const wrong = Object.values(state.results).filter(value => value === "wrong").length;
  const total = right + wrong;
  $("#vocab-progress").textContent = `已完成 ${total} / ${vocabulary.length}｜正確率 ${total ? Math.round(right / total * 100) : 0}%`;
  $("#vocab-right-count").textContent = right;
  $("#vocab-wrong-count").textContent = wrong;
  $("#vocab-star-count").textContent = state.starred.length;
}

function renderList() {
  const query = $("#vocab-search").value.trim().toLowerCase(), selectedSection = $("#list-section").value;
  const matches = vocabulary.filter(item => {
    const inSection = selectedSection === "all" || item.section === selectedSection;
    return inSection && [item.kana,item.written,item.original,item.meaning,item.type,item.note,sectionLabel(item)].some(value => value.toLowerCase().includes(query));
  });
  $("#vocab-list").innerHTML = matches.map(item => `<article class="vocab-row"><span>${item.id}</span><div><b lang="ja">${item.original || item.written}</b><small>${item.kana}${item.original ? ` · ${item.written}` : ""}</small></div>${pronunciation.button(item, "vocab-row-speak", `data-vocab-speak="${item.id}"`)}<p>${item.meaning}${item.note ? `<small>${item.note}</small>` : ""}</p><em>${item.type}<small>${sectionLabel(item)}</small></em></article>`).join("");
  $("#vocab-count").textContent = `顯示 ${matches.length} / ${vocabulary.length}`;
}

function renderCard() {
  const deck = activeItems(), item = current();
  document.querySelectorAll("[data-vocab-section]").forEach(button => button.classList.toggle("active", button.dataset.vocabSection === state.section));
  document.querySelectorAll("[data-vocab-direction]").forEach(button => button.classList.toggle("active", button.dataset.vocabDirection === state.direction));
  document.querySelectorAll("[data-vocab-filter]").forEach(button => button.classList.toggle("active", button.dataset.vocabFilter === state.filter));
  $("#vocab-shuffle").classList.toggle("active", state.random);
  $("#vocab-shuffle").textContent = state.random ? "隨機次序 ON" : "循序模式";
  $("#vocab-jump").max = deck.length || 1; $("#vocab-jump").value = item ? state.index + 1 : ""; $("#vocab-total").textContent = `/ ${deck.length}`;
  updateStats();
  const card = $("#vocab-card"); card.disabled = !item;
  $("#vocab-card-speaker").innerHTML = item ? pronunciation.button(item, "vocab-card-speak") : "";
  $("#vocab-card-number").textContent = item ? `${sectionLabel(item)} · ${state.index + 1} / ${deck.length}` : "沒有卡片";
  if (!item) {
    $("#vocab-card-front").hidden = false; $("#vocab-card-back").hidden = true;
    $("#vocab-card-front").innerHTML = "<h2>這個分類暫時沒有卡片</h2><span>先完成或標記一些詞彙，再回來重溫。</span>";
    $("#vocab-star").textContent = "☆"; save(); return;
  }
  $("#vocab-card-front").hidden = flipped; $("#vocab-card-back").hidden = !flipped;
  $("#vocab-card-front").innerHTML = `<p>${frontLabel()}</p><h2 lang="ja">${frontText(item)}</h2><span>點擊翻面查看答案</span>`;
  const sameForm = frontText(item) === backTitle(item);
  $("#vocab-card-back").innerHTML = `<p>題目 · ${frontLabel()}</p><h2 class="card-retained-prompt" lang="ja">${frontText(item)}</h2><span class="card-answer-label">答案 · ${state.direction === "normal" ? scriptLabel(item) : "平假名／片假名"}</span>${sameForm ? "" : `<h2 lang="ja">${backTitle(item)}</h2>`}${sameForm ? `<span class="vocab-writing">日文表記相同</span>` : item.original ? `<span class="vocab-writing">日文表記 · ${item.written}</span>` : ""}<strong>${item.meaning}</strong><span>${item.type}${item.note ? ` · ${item.note}` : ""}</span>`;
  $("#vocab-star").textContent = state.starred.includes(item.id) ? "★" : "☆"; save();
}

function resetPosition() { state.index = 0; flipped = false; }
function move(step) { const deck=activeItems(); if(!deck.length)return; state.index=(state.index+step+deck.length)%deck.length; flipped=false; renderCard(); }
function mark(value) {
  const item=current(); if(!item)return;
  state.results[item.id]=value; save();
  if (!activeItems().length) { resetPosition(); renderCard(); }
  else move(1);
}

$("#vocab-search").addEventListener("input", renderList);
$("#list-section").addEventListener("change", renderList);
$("#vocab-card-speaker").addEventListener("pointerdown", event => event.stopPropagation());
$("#vocab-card-speaker").addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); const item=current(); if(item)pronunciation.speak(item); });
$("#vocab-list").addEventListener("pointerdown", event => { if(event.target.closest("[data-vocab-speak]"))event.stopPropagation(); });
$("#vocab-list").addEventListener("click", event => { const button=event.target.closest("[data-vocab-speak]"); if(!button)return; event.preventDefault(); event.stopPropagation(); const item=byId(Number(button.dataset.vocabSpeak)); if(item)pronunciation.speak(item); });
$("#vocab-card").onclick = () => { if(current()){flipped=!flipped;renderCard();} };
JPY5.bindSwipe($("#vocab-card"), {next:()=>move(1), previous:()=>move(-1)});
$("#vocab-prev").onclick = () => move(-1); $("#vocab-next").onclick = () => move(1);
$("#vocab-right").onclick = () => mark("right"); $("#vocab-wrong").onclick = () => mark("wrong");
$("#vocab-star").onclick = () => { const item=current(); if(!item)return; state.starred=state.starred.includes(item.id)?state.starred.filter(id=>id!==item.id):[...state.starred,item.id]; renderCard(); };
$("#vocab-shuffle").onclick = () => { state.random=!state.random; resetPosition(); renderCard(); };
$("#vocab-jump").onchange = event => { state.index=Math.max(0,Number(event.target.value)-1); flipped=false; renderCard(); };
$("#reset-vocabulary").onclick = () => { if(confirm("清除全部 208 詞的記憶卡進度、答題標記和收藏？")){state=structuredClone(defaults);renderCard();} };
document.querySelectorAll("[data-vocab-section]").forEach(button => button.onclick=()=>{state.section=button.dataset.vocabSection;state.filter="all";resetPosition();renderCard();});
document.querySelectorAll("[data-vocab-direction]").forEach(button => button.onclick=()=>{state.direction=button.dataset.vocabDirection;flipped=false;renderCard();});
document.querySelectorAll("[data-vocab-filter]").forEach(button => button.onclick=()=>{state.filter=button.dataset.vocabFilter;resetPosition();renderCard();});
document.addEventListener("keydown", event => { if(event.target.matches("input,textarea,select"))return; if(event.code==="Space"){event.preventDefault();if(current()){flipped=!flipped;renderCard();}} if(event.key==="ArrowLeft")move(-1); if(event.key==="ArrowRight")move(1); });
renderList(); renderCard();
