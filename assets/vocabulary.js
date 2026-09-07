const vocabulary = [
 ["しぼる","絞る","擰、榨","動詞"],["にゅうしゃする","入社する","進公司、入職","名詞・する"],["くちにだす","口に出す","說出口","慣用表現"],["がまんする","我慢する","忍耐、忍受","名詞・する"],["がまんづよい","我慢強い","有忍耐力、有耐心","い形容詞"],["そうじき","掃除機","吸塵器","名詞"],["ためいき","ため息","嘆氣","名詞"],["あふれる","あふれる","充滿、溢出","動詞"],["たまる","たまる","積聚、堆滿","動詞"],["じゅけんせい","受験生","考生","名詞"],["としん","都心","市中心","名詞"],["ふたご","双子","雙胞胎","名詞"],["せかいてき","世界的","世界性、國際性","な形容詞"],["スター","スター","明星","名詞","star"],["シーズン","シーズン","季節、旺季","名詞","season"],["やく～","約～","大約","接頭語"],["わり","割","比率、比例","名詞"],["きゅうか","休暇","休假","名詞"],["いとこ","いとこ","表／堂兄弟姊妹","名詞"],["どうし","同士","彼此、同類關係","接尾語"],["ルーズ","ルーズ","鬆懈、散漫","な形容詞","loose"],["うりあげ","売り上げ","營業額","名詞"],["おちる","落ちる","下降、下滑","動詞"],["こうがくぶ","工学部","工學院、工程學系","名詞"],["はいりなおす","入り直す","重新進入、重新入讀","動詞"],["かんけい","関係","方面、關係","名詞"],["ポテトチップス","ポテトチップス","薯片","名詞","potato chips"],["インスタントしょくひん","インスタント食品","即食食品、速成食品","名詞","instant food"],["インスタント","インスタント","即食、速成","名詞・な形容詞","instant"],["しょくひん","食品","食品","名詞"],["あきる","あきる","厭倦、吃膩","動詞"]
].map((v,i)=>({id:i+1,kana:v[0],written:v[1],meaning:v[2],type:v[3],original:v[4]||""}));

const defaults={direction:"normal",random:false,index:0,order:vocabulary.map(v=>v.id)};
let state={...defaults,...JPY5.read("vocabulary.cards",{})};
let flipped=false;
const $=selector=>document.querySelector(selector);
const byId=id=>vocabulary.find(v=>v.id===id);
const save=()=>JPY5.write("vocabulary.cards",state);
function frontText(v){return state.direction==="normal"?v.kana:(v.original||v.written);}
function backTitle(v){return state.direction==="normal"?(v.original||v.written):v.kana;}
function scriptLabel(v){if(v.original)return "英文原寫";if(v.written!==v.kana)return "漢字表記";return "日文表記";}
function current(){if(!state.order.length)state.order=vocabulary.map(v=>v.id);state.index=Math.min(state.index,state.order.length-1);return byId(state.order[state.index])||vocabulary[0];}
function renderList(items=vocabulary){
  $("#vocab-list").innerHTML=items.map(v=>`<article class="vocab-row"><span>${v.id}</span><div><b lang="ja">${v.original||v.written}</b><small>${v.kana}${v.original?` · ${v.written}`:""}</small></div><p>${v.meaning}</p><em>${v.type}</em></article>`).join("");
  $("#vocab-count").textContent=`顯示 ${items.length} / ${vocabulary.length}`;
}
function renderCard(){
  const v=current();
  $("#vocab-card-number").textContent=`${state.index+1} / ${state.order.length}`;
  $("#vocab-card-front").hidden=flipped;$("#vocab-card-back").hidden=!flipped;
  $("#vocab-card-front").innerHTML=`<p>${state.direction==="normal"?"平假名／片假名":"漢字／英文原寫"}</p><h2 lang="ja">${frontText(v)}</h2><span>點擊翻面查看答案</span>`;
  $("#vocab-card-back").innerHTML=`<p>${state.direction==="normal"?scriptLabel(v):"平假名／片假名"}</p><h2 lang="ja">${backTitle(v)}</h2>${v.original?`<span class="vocab-writing">日文表記 · ${v.written}</span>`:""}<strong>${v.meaning}</strong><span>${v.type}</span>`;
  document.querySelectorAll("[data-vocab-direction]").forEach(button=>button.classList.toggle("active",button.dataset.vocabDirection===state.direction));
  $("#vocab-shuffle").classList.toggle("active",state.random);$("#vocab-shuffle").textContent=state.random?"隨機次序 ON":"隨機次序";
}
function move(step){state.index=(state.index+step+state.order.length)%state.order.length;flipped=false;save();renderCard();}
function setDirection(direction){state.direction=direction;flipped=false;save();renderCard();}
function setRandom(){const active=current().id;state.random=!state.random;state.order=state.random?JPY5.shuffle(vocabulary.map(v=>v.id)):vocabulary.map(v=>v.id);state.index=Math.max(0,state.order.indexOf(active));flipped=false;save();renderCard();}
$("#vocab-search").oninput=event=>{const q=event.target.value.trim().toLowerCase();renderList(vocabulary.filter(v=>[v.kana,v.written,v.original,v.meaning,v.type].some(x=>x.toLowerCase().includes(q))));};
$("#vocab-card").onclick=()=>{flipped=!flipped;renderCard();};
$("#vocab-prev").onclick=()=>move(-1);$("#vocab-next").onclick=()=>move(1);$("#vocab-shuffle").onclick=setRandom;
document.querySelectorAll("[data-vocab-direction]").forEach(button=>button.onclick=()=>setDirection(button.dataset.vocabDirection));
document.addEventListener("keydown",event=>{if(event.target.matches("input,textarea,select"))return;if(event.code==="Space"){event.preventDefault();flipped=!flipped;renderCard();}if(event.key==="ArrowLeft")move(-1);if(event.key==="ArrowRight")move(1);});
renderList();renderCard();
