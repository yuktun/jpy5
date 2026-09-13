const { patterns } = window.JPY5_DATA;
const ruby = window.JPY5GrammarRuby.render;
const renderExample = window.JPY5GrammarRuby.renderExample;
const defaults = { deck:"summary", direction:"jp", shuffled:false, filter:"all", positions:{summary:0,examples:0}, order:{}, results:{}, starred:[] };
let state = Object.assign({}, defaults, JPY5.read("flashcards", {}));
state.positions = Object.assign({}, defaults.positions, state.positions);
state.order = state.order || {}; state.results = state.results || {}; state.starred = state.starred || [];
let flipped = false;

const summaries = patterns.map(p => ({ id:`summary-${p.id}`, pattern:p.id, label:p.title, jp:p.title, zh:p.meaning, answer:`<h3 lang="ja">${ruby(p.title)}</h3><p>${p.meaning}</p><div class="formation" lang="ja">${ruby(p.formation)}</div><p>${p.note}</p><p class="contrast-note"><b>辨析</b>${p.contrast}</p>` }));
const examples = patterns.flatMap(p => p.examples.map(([jp,zh],i)=>({ id:`example-${p.id}-${i}`, pattern:p.id, label:p.title, jp, zh, answer:`<h3 lang="ja">${ruby(p.title)}</h3><p class="example-jp" lang="ja">${renderExample(jp,p.id)}</p><p>${zh}</p><div class="formation" lang="ja">${ruby(p.formation)}</div>` })));
const baseDeck = () => state.deck === "summary" ? summaries : examples;
const key = () => `${state.deck}-${state.direction}-${state.shuffled?"random":"normal"}`;
function orderedDeck() {
  const base = baseDeck();
  if (!state.shuffled) return base;
  if (!state.order[key()] || state.order[key()].length !== base.length) state.order[key()] = JPY5.shuffle(base.map(c=>c.id));
  return state.order[key()].map(id=>base.find(c=>c.id===id)).filter(Boolean);
}
function activeDeck() {
  const cards=orderedDeck();
  if(state.filter==="all") return cards;
  if(state.filter==="starred") return cards.filter(c=>state.starred.includes(c.id));
  return cards.filter(c=>state.results[c.id]===state.filter);
}
function currentIndex() { const deck=activeDeck(); return Math.min(Math.max(0,state.positions[state.deck]||0),Math.max(0,deck.length-1)); }
function save() { JPY5.write("flashcards",state); }
function frontMarkup(card, reveal=false) { const jp=reveal&&state.deck==="examples"?renderExample(card.jp,card.pattern):ruby(card.jp); return state.direction==="jp"?`<h2 lang="ja">${jp}</h2><p>這句使用甚麼文法？</p>`:`<h2>${card.zh}</h2><p>想出日文句型或例句。</p>`; }
function backMarkup(card) {
  let details=card.answer;
  if(state.direction==="jp") details=details.replace(state.deck==="summary"?`<h3 lang="ja">${ruby(card.jp)}</h3>`:`<p class="example-jp" lang="ja">${renderExample(card.jp,card.pattern)}</p>`,"");
  else details=details.replace(`<p>${card.zh}</p>`,"");
  return `<div class="card-retained-block"><small>題目</small>${frontMarkup(card,true)}</div><div class="card-revealed-details"><small>答案與詳解</small>${details}</div>`;
}
function render() {
  const deck=activeDeck(), index=currentIndex(), card=deck[index]; flipped=false;
  document.querySelectorAll("[data-deck]").forEach(b=>b.classList.toggle("active",b.dataset.deck===state.deck));
  document.querySelectorAll("[data-direction]").forEach(b=>b.classList.toggle("active",b.dataset.direction===state.direction));
  document.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.filter===state.filter));
  document.querySelector("#shuffle-toggle").textContent=state.shuffled?"隨機模式":"循序模式";
  document.querySelector("#shuffle-toggle").classList.toggle("active",state.shuffled);
  const right=Object.values(state.results).filter(v=>v==="right").length, wrong=Object.values(state.results).filter(v=>v==="wrong").length;
  document.querySelector("#right-count").textContent=right; document.querySelector("#wrong-count").textContent=wrong;
  document.querySelector("#fc-stats").textContent=`已完成 ${right+wrong}｜正確率 ${right+wrong?Math.round(right/(right+wrong)*100):0}%`;
  document.querySelector("#deck-label").textContent=`${state.deck==="summary"?"句型概要":"例句練習"} · ${state.filter==="all"?"全部":state.filter==="right"?"答對":state.filter==="wrong"?"答錯":"已標記"}`;
  document.querySelector("#card-jump").max=deck.length||1; document.querySelector("#card-jump").value=card?index+1:""; document.querySelector("#card-total").textContent=`/ ${deck.length}`;
  const el=document.querySelector("#flashcard"); el.disabled=!card;
  if(!card){ document.querySelector("#card-kicker").textContent="沒有卡片"; document.querySelector("#card-front").innerHTML="<h2>這個分類暫時是空的。</h2><p>先回答或標記一些卡片，再回來重溫。</p>"; document.querySelector("#card-back").hidden=true; document.querySelector("#flip-hint").hidden=true; return; }
  document.querySelector("#card-kicker").textContent=`${card.label} · ${index+1}/${deck.length}`;
  document.querySelector("#card-front").innerHTML=frontMarkup(card);
  document.querySelector("#card-back").innerHTML=backMarkup(card); document.querySelector("#card-front").hidden=false; document.querySelector("#card-back").hidden=true; document.querySelector("#flip-hint").hidden=false;
  document.querySelector("#star-card").textContent=state.starred.includes(card.id)?"★":"☆";
  save();
}
function flip(){ if(!activeDeck()[currentIndex()])return; flipped=!flipped; document.querySelector("#card-front").hidden=flipped; document.querySelector("#card-back").hidden=!flipped; document.querySelector("#flip-hint").textContent=flipped?"點擊或按 Space 返回題目":"點擊或按 Space 查看答案"; }
function move(delta){ const d=activeDeck(); if(!d.length)return; state.positions[state.deck]=(currentIndex()+delta+d.length)%d.length; render(); }
function mark(value){ const card=activeDeck()[currentIndex()]; if(!card)return; state.results[card.id]=value; save(); move(1); }
document.querySelectorAll("[data-deck]").forEach(b=>b.onclick=()=>{state.deck=b.dataset.deck;state.filter="all";render();});
document.querySelectorAll("[data-direction]").forEach(b=>b.onclick=()=>{state.direction=b.dataset.direction;render();});
document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;state.positions[state.deck]=0;render();});
document.querySelector("#shuffle-toggle").onclick=()=>{state.shuffled=!state.shuffled;state.positions[state.deck]=0;render();};
document.querySelector("#flashcard").onclick=flip; document.querySelector("#prev-card").onclick=()=>move(-1); document.querySelector("#next-card").onclick=()=>move(1);
JPY5.bindSwipe(document.querySelector("#flashcard"),{next:()=>move(1),previous:()=>move(-1)});
document.querySelector("#mark-right").onclick=()=>mark("right"); document.querySelector("#mark-wrong").onclick=()=>mark("wrong");
document.querySelector("#star-card").onclick=()=>{const c=activeDeck()[currentIndex()];if(!c)return;state.starred=state.starred.includes(c.id)?state.starred.filter(id=>id!==c.id):[...state.starred,c.id];render();};
document.querySelector("#card-jump").onchange=e=>{state.positions[state.deck]=Math.max(0,Number(e.target.value)-1);render();};
document.querySelector("#reset-flashcards").onclick=()=>{if(confirm("清除所有 Flashcard 進度和標記？")){state=structuredClone(defaults);render();}};
document.addEventListener("keydown",e=>{if(e.target.matches("input,select"))return;if(e.code==="Space"){e.preventDefault();flip();}if(e.key==="ArrowLeft")move(-1);if(e.key==="ArrowRight")move(1);});
render();
