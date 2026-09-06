const grammar = [
  {
    group: "readWrite", title: "～たて", meaning: "剛……；新……（剛完成、仍很新鮮的狀態）",
    formation: "V ます形去ます ＋ たて ＋ の N ／ たてだ",
    jp: "ここのパンは焼きたてで、おいしい。", zh: "這裡的麵包剛烤好，很好吃。",
    question: "「剛摘下來的番茄」應怎樣說？", options: ["とれたてのトマト", "とったほどトマト", "とるながらトマト"], answer: 0,
    note: "～たて只適用於部分動詞；「剛讀完的書」通常說 読んだばかりの本。"
  },
  {
    group: "readWrite", title: "たとえ～ても", meaning: "即使……；哪怕……也……",
    formation: "たとえ ＋ V ても ／ N でも ／ V たとしても",
    jp: "たとえ子どもでも、やったことの責任はとらなくてはいけない。", zh: "即使是小孩子，也要為自己做過的事負責。",
    question: "たとえ雨が＿＿、試合は行います。", options: ["降るほど", "降っても", "降りたて"], answer: 1,
    note: "たとえ先提出極端假設，後面常接ても、でも或たとしても。"
  },
  {
    group: "readWrite", title: "～たりしない", meaning: "不會做……；才不會……（舉例式、語氣較婉轉）",
    formation: "V た形 ＋ り ＋ しない",
    jp: "今回失敗しても、絶対に諦めたりしない。", zh: "即使這次失敗，我也絕不會放棄。",
    question: "彼に何と言われても、＿＿。", options: ["泣きたてだ", "泣くほど", "泣いたりしない"], answer: 2,
    note: "用「舉出某行為」的方式加以否定，也可帶出堅定的語氣。"
  },
  {
    group: "readWrite", title: "～ほど", meaning: "……得；到了……的程度",
    formation: "N ／ いA ／ V 普通形 ＋ ほど",
    jp: "今日は死ぬほど疲れた。", zh: "今天簡直累得要死。",
    question: "彼は飛び上がる＿＿驚いた。", options: ["ほど", "たて", "んだって"], answer: 0,
    note: "用比喻或具體事例，說明動作或狀態達到某種程度。"
  },
  {
    group: "speakListen", title: "～んだって", meaning: "聽說……；據說……（口語）",
    formation: "N ／ なA ＋ なんだって ｜ いA ／ V ＋ んだって",
    jp: "山田さん、お酒が嫌いなんだって。", zh: "聽說山田先生不喜歡喝酒。",
    question: "想說「聽說那家店的蛋糕很好吃」：", options: ["あの店のケーキ、おいしいんだって。", "あの店のケーキ、おいしいたて。", "あの店のケーキ、おいしいほど。"], answer: 0,
    note: "把從別人那裡聽來的資訊轉述出去；升調時也可用來確認消息。"
  },
  {
    group: "speakListen", title: "～ながら", meaning: "雖然……卻……（逆接、轉折）",
    formation: "V ます形去ます ／ N ／ いA ／ なA ＋ ながら（も）",
    jp: "このバイクは小型ながら、馬力がある。", zh: "這輛摩托車雖然小型，馬力卻很強。",
    question: "「雖然很窄，終於有了自己的家」：＿＿、ようやく自分の家を持てた。", options: ["狭いたて", "狭いながらも", "狭いんだって"], answer: 1,
    note: "本課重點是逆接用法，近似「のに／けれども」，不是「一邊……一邊……」。"
  },
  {
    group: "speakListen", title: "つまり～ってことだ", meaning: "換言之……；也就是說……",
    formation: "つまり ＋ 普通形 ＋ ってことだ／です",
    jp: "つまり、社員はその犠牲者だってことです。", zh: "也就是說，公司職員是受害者。",
    question: "「つまり」在這個句型中最接近哪個意思？", options: ["雖然", "剛剛", "換言之"], answer: 2,
    note: "「ってこと」是「ということ」的口語形式，用來重述或歸納意思。"
  },
  {
    group: "speakListen", title: "～よね", meaning: "……吧？（再次確認共識、尋求認同）",
    formation: "句子普通形／禮貌形 ＋ よね",
    jp: "日本語って難しいよね。", zh: "日語很難吧？",
    question: "確認對方也出席昨天的會議：昨日の会議、出席しました＿＿。", options: ["たて", "よね", "たりしない"], answer: 1,
    note: "說話人認為雙方已有共識，再向對方確認並期待認同。"
  }
];

let responses = new Map();

function cardTemplate(item, index) {
  return `
    <article class="grammar-card" data-question="${index}">
      <div class="card-topline"><span>GRAMMAR</span><span>${String(index + 1).padStart(2, "0")}</span></div>
      <h3>${item.title}</h3>
      <p class="meaning">${item.meaning}</p>
      <div class="formation">${item.formation}</div>
      <p class="example"><span class="example-jp" lang="ja">${item.jp}</span><span class="example-zh">${item.zh}</span></p>
      <div class="quiz">
        <p class="quiz-question">小練習｜${item.question}</p>
        <div class="options">${item.options.map((option, optionIndex) => `<button class="option" type="button" data-option="${optionIndex}">${option}</button>`).join("")}</div>
        <p class="feedback" aria-live="polite"></p>
      </div>
    </article>`;
}

function render() {
  document.querySelector('[data-group="readWrite"]').innerHTML = grammar.map((item, i) => item.group === "readWrite" ? cardTemplate(item, i) : "").join("");
  document.querySelector('[data-group="speakListen"]').innerHTML = grammar.map((item, i) => item.group === "speakListen" ? cardTemplate(item, i) : "").join("");
  bindAnswers();
  updateScore();
}

function bindAnswers() {
  document.querySelectorAll(".grammar-card").forEach(card => {
    const questionIndex = Number(card.dataset.question);
    card.querySelectorAll(".option").forEach(button => button.addEventListener("click", () => answer(card, questionIndex, Number(button.dataset.option))));
  });
}

function answer(card, questionIndex, selected) {
  if (responses.has(questionIndex)) return;
  const item = grammar[questionIndex];
  responses.set(questionIndex, selected === item.answer);
  card.querySelectorAll(".option").forEach((button, i) => {
    button.disabled = true;
    if (i === item.answer) button.classList.add("correct");
    else if (i === selected) button.classList.add("wrong");
  });
  card.querySelector(".feedback").textContent = `${selected === item.answer ? "答對了。" : "再留意句型的接續。"} ${item.note}`;
  updateScore();
}

function updateScore() {
  const correct = [...responses.values()].filter(Boolean).length;
  document.querySelector("#score").textContent = `${correct} / ${grammar.length}`;
  const message = document.querySelector("#score-message");
  if (responses.size === 0) message.textContent = "選一個答案，開始複習。";
  else if (responses.size < grammar.length) message.textContent = `已完成 ${responses.size} 題，繼續！`;
  else if (correct === grammar.length) message.textContent = "全對！第 13 課很穩了。";
  else message.textContent = "完成了。重看解說後再試一次吧。";
}

document.querySelector("#reset-quiz").addEventListener("click", () => {
  responses = new Map();
  render();
  document.querySelector("#read-write").scrollIntoView();
});

render();
