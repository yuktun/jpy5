// Supplied five-page Quiz 1 (26A), Lesson 13. Answers are independent study suggestions.
(() => {
  "use strict";
  const data = {
  "title": "クイズ① みんなの日本語中級Ⅱ　第13課",
  "sections": [
    {
      "id": "I",
      "title": "聞いて書く問題です。",
      "pages": "1",
      "points": "5×2=10",
      "instruction": "先生の言う文を聞いて、書いてください。文は３回読みます。漢字を書くときは、ひらがなも書いてください。",
      "note": "原 PDF 只有答題空白，未提供老師朗讀的句子、錄音或答案。本部分可供課堂聽寫；暫不能自行核對，亦不以其他課文錄音代替。",
      "items": [
        {
          "prompt": "１）＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿",
          "unavailable": true
        },
        {
          "prompt": "２）＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿",
          "unavailable": true
        }
      ]
    },
    {
      "id": "II",
      "title": "ひらがなを漢字に、漢字をひらがなに書き換えてください。",
      "pages": "1",
      "points": "1×10=10",
      "items": [
        {
          "prompt": "わたしはどちらかというと<u>甘党</u>です。",
          "answer": "あまとう"
        },
        {
          "prompt": "「聞くは一時の<u>恥</u>、聞かぬは一生の恥」ということわざがある。",
          "answer": "はじ"
        },
        {
          "prompt": "a）<u>一瞬</u>にして、一大 b）<u>企業</u>が消えた。",
          "fields": [
            "3a",
            "3b"
          ],
          "answer": "a）いっしゅん　b）きぎょう"
        },
        {
          "prompt": "誰でも、一度くらいは<u>勘違い</u>したことがあるはずだ。",
          "answer": "かんちがい"
        },
        {
          "prompt": "何度も<u>試行錯誤</u>して、やっと完成した。",
          "answer": "しこうさくご"
        },
        {
          "prompt": "車を買ったので、行動<u>範囲</u>が広がった。",
          "answer": "はんい"
        },
        {
          "prompt": "道路を<u>おうだん</u>する時は、左右をよく見ましょう。",
          "answer": "横断"
        },
        {
          "prompt": "日本語に<u>ちょくやく</u>できない広東語もたくさんあります。",
          "answer": "直訳"
        },
        {
          "prompt": "香港といえば、派手な<u>かんばん</u>が有名だ。",
          "answer": "看板"
        }
      ]
    },
    {
      "id": "III",
      "title": "□の中から言葉を選び、正しい形にして下線部に書いてください。（　）にはひらがな一字を入れてください。",
      "pages": "2",
      "points": "動詞 2×8=16　助詞 1×7=7",
      "instruction": "☆動詞の選択は正しくても、形が違う場合は－１点。動詞の選択が正しくない場合は、助詞が正解でも、0点。",
      "bank": [
        "のみこむ",
        "要する",
        "使い分ける",
        "出くわす",
        "忍ばせる",
        "突っ走る",
        "思い込む",
        "浮かぶ"
      ],
      "note": "以下為填入空格的參考形式，並非官方評分；本頁不自動計分。",
      "items": [
        {
          "prompt": "スペースで５年も日本語を勉強しているが、今でも似ている意味のことば（　）＿＿＿＿＿＿。",
          "answer": "を／使い分けられない",
          "explanation": "「今でも」配合前句的「が」，表達至今仍未能分辨使用；可能形的否定。"
        },
        {
          "prompt": "おなかがすいたとき、食べられるようにかばんの中にお菓子（　）＿＿＿＿＿＿ある。",
          "answer": "が／忍ばせて",
          "explanation": "「お菓子が忍ばせてある」表示已預先放好糖果；「を／忍ばせて」亦可，強調準備的行為。"
        },
        {
          "prompt": "今の仕事に慣れるまでに、ずいぶん長い月日（　）＿＿＿＿＿＿。",
          "answer": "を／要した"
        },
        {
          "prompt": "時々仕事で会う彼女をずっと日本人だ（　）＿＿＿＿＿＿いたのだが、実際に話してみて香港人だとわかった。",
          "answer": "と／思い込んで"
        },
        {
          "prompt": "遅刻しそうだったので、自転車で＿＿＿＿＿＿、アルバイトへ行った。",
          "answer": "突っ走って"
        },
        {
          "prompt": "A：今日デパートで買い物していたら、３回も上司（　）＿＿＿＿＿＿ちゃったよ！\nB：休日に会社の人とはあんまり会いたくないわね。",
          "answer": "に／出くわし",
          "explanation": "後面已有「ちゃった」，填「出くわし」即可，完整為「出くわしちゃった」。"
        },
        {
          "prompt": "新しい職場で仕事のやり方（　）＿＿＿＿＿＿までに時間がかかるのは当然だ。",
          "answer": "を／のみこむ"
        },
        {
          "prompt": "昨日古いアルバムを見ていたら、友達との楽しかった思い出が頭（　）＿＿＿＿＿＿。",
          "answer": "に／浮かんだ"
        }
      ]
    },
    {
      "id": "IV",
      "title": "どちらがいいですか。正しいほうを選んで〇をつけてください。",
      "pages": "2–3",
      "points": "2×4=8",
      "items": [
        {
          "prompt": "Ａ：学校の近くに新しくできた一風堂というラーメン屋のラーメンはおいしいですね。\nＢ：",
          "options": [
            "でしょ。わたしは食べたことがないんです。",
            "でしょ。わたしもこの間食べて、そう思ったんです。"
          ],
          "answer": "b）でしょ。わたしもこの間食べて、そう思ったんです。",
          "explanation": "「でしょ」確認雙方已有的共同認識。",
          "note": "一風堂：いっぷうどう（原文假名）"
        },
        {
          "prompt": "Ａ：今度の映画見た？\nＢ：まだ見てないんだ。\nＡ：",
          "options": [
            "すごくおもしろいよ。",
            "すごくおもしろいよね。"
          ],
          "answer": "a）すごくおもしろいよ。",
          "explanation": "對方未看過，以「よ」提供新資訊。"
        },
        {
          "prompt": "たとえ失敗しても、",
          "options": [
            "わたしは絶対あきらめません。",
            "わたしは絶対がんばりません。"
          ],
          "answer": "a）わたしは絶対あきらめません。"
        },
        {
          "prompt": "香港に住んでいながら、",
          "options": [
            "いつもオーシャンパークへ行きます。",
            "まだオーシャンパークへ行ったことがありません。"
          ],
          "answer": "b）まだオーシャンパークへ行ったことがありません。",
          "note": "※オーシャンパーク：Ocean Park 海洋公園",
          "explanation": "「ながら」在此表示與預期相反。"
        }
      ]
    },
    {
      "id": "V",
      "title": "会話を完成させてください。①②④には、□の中の文字から始まることばを入れてください。③は、自分で適切なことばを考えて書いてください。",
      "pages": "3",
      "points": "3×4=12",
      "instruction": "例）高橋さんが参加していたら、【も】もっと楽しかったと思います。",
      "context": "シン：来週のスピーチ大会、会場まで一緒に行かない？僕、方向音痴だから・・・\nワン：うん、いいけど、…「ホウコウオンチ」？それ、どういう意味？\nシン：方向音痴っていうのは、よく方向が分からなくなるってことだよ。\nワン：①【つ】＿＿＿＿道に迷いやすいってことだね。そうなんだ、じゃあ、一緒に行こう。シンさんはいろいろな日本語を知っていてすごいよね。\nシン：そんなことないよ。この間、たまごを食べたって言いたかったのに、タバコを食べたって言って、日本人にびっくりされたよ。\nワン：②【た】＿＿＿＿似ている発音のことばを間違えることって③＿＿＿＿よね。\nシン：そうだよね。日本語の勉強、もっと頑張らないと！④【と】＿＿＿＿来週のコンサートのことだけど、もうチケット買っておいたから、10時に芸術センターの前で待ち合わせしよう。",
      "note": "僕：ぼく／方向音痴：ほうこうおんち（原文假名）",
      "items": [
        {
          "prompt": "①【つ】＿＿＿＿",
          "answer": "つまり"
        },
        {
          "prompt": "②【た】＿＿＿＿",
          "answer": "たしかに（確かに）"
        },
        {
          "prompt": "③＿＿＿＿よね。",
          "answer": "よくある",
          "open": true,
          "explanation": "例：「よくある」「ある」等，能自然接「よね」並回應發音相似容易說錯的內容即可；不是唯一答案。"
        },
        {
          "prompt": "④【と】＿＿＿＿",
          "answer": "ところで"
        }
      ]
    },
    {
      "id": "VI",
      "title": "下線部を補って、文または会話を完成させてください。",
      "pages": "3–4",
      "points": "4×4=16",
      "note": "以下均為示範作答。保留指定句型、文法正確及上下文自然的其他內容亦可；不作唯一答案判定。",
      "items": [
        {
          "prompt": "Ａ：＿＿＿＿たての＿＿＿＿はとてもおいしいんです。さぁ、遠慮しないで＿＿＿＿てください。\nＢ：じゃあ、いただきます。",
          "answer": "Ａ：焼きたてのパンはとてもおいしいんです。さぁ、遠慮しないで食べてください。\nＢ：じゃあ、いただきます。",
          "open": true,
          "explanation": "動詞ます形去ます＋たて，例如「炊きたてのご飯／食べ」亦可。原題已有「てください」，填「食べ」即可。"
        },
        {
          "prompt": "＿＿＿＿はびっくりするほど＿＿＿＿。",
          "answer": "この店のラーメンはびっくりするほどおいしい。",
          "open": true,
          "explanation": "可換成其他人或事物，後面寫令人驚訝的程度，例如「彼はびっくりするほど足が速い」。"
        },
        {
          "prompt": "彼は＿＿＿＿ので、＿＿＿＿たり（／だり）しない。",
          "answer": "彼はまじめなので、約束を破ったりしない。",
          "open": true,
          "explanation": "前後須有合理因果；動詞た形＋りしない。也可寫「彼はお酒が嫌いなので、ビールを飲んだりしない」。"
        },
        {
          "prompt": "新しい iPhone を買った。ところが、＿＿＿＿。",
          "answer": "新しい iPhone を買った。ところが、すぐに壊れてしまった。",
          "open": true,
          "explanation": "「ところが」後接出乎預料的結果，例如「電源が入らなかった」亦可。"
        }
      ]
    },
    {
      "id": "VII",
      "title": "正しいほうを選んで〇をつけてください。",
      "pages": "4",
      "points": "2×4=8",
      "items": [
        {
          "prompt": "消防車が着いたときには、ビルは（　すでに ・ かつて　）半分焼けてしまっていた。",
          "options": [
            "すでに",
            "かつて"
          ],
          "answer": "すでに",
          "explanation": "表示消防車到達時，事情已經發生。"
        },
        {
          "prompt": "A：あの人、知ってる？\nB：もちろん。あの人、（　とっくに ・ かつて　）この会社の社長だった人よ。\nA：そうか。だからどこかで見たことあるなって思ってたんだよ。",
          "options": [
            "とっくに",
            "かつて"
          ],
          "answer": "かつて",
          "explanation": "「かつて」表示曾經擔任社長。"
        },
        {
          "prompt": "母：（　すでに ・ もう　）宿題したの？\n子：（　とっくに ・ かつて　）したよ。",
          "fields": [
            "母",
            "子"
          ],
          "answer": "母：もう／子：とっくに",
          "explanation": "日常問是否已做完用「もう」；「とっくに」強調早已做完。"
        }
      ]
    },
    {
      "id": "VIII",
      "title": "次の文を読んで質問に答えてください。",
      "pages": "4–5",
      "points": "6＋3",
      "passages": [
        "①勉強して３年たった頃、もう一度日本へ旅行に行った。空港やレストラン、買い物しているときに話す日本語はほとんどわかるようになり、山田さんという日本人と友達になった。",
        "②初めて日本へ旅行したのは６年前だ。日本の食べ物や風景を夢に見るほど好きだったので、とても楽しみにしていた旅行だった。そのときは日本語が一言も話せず、結局日本人と友だちになることはできなかった。いつか日本人の友達を作りたいと思い、日本語を勉強することに決めた。",
        "③香港に戻り、早速日本語が勉強できる学校を探した。HKUスペースがいいと友達に紹介してもらい、申し込んだ。はじめは「あ、い、う、え、お」もわからなかったが、そのうち、だんだんわかるようになってきて、うれしくなった。",
        "④今年日本語を勉強して５年目になる。だんだん難しくなって、あきらめそうになることもあるが、今では日本のことわざも少しわかるようになった。「継続は力なり」私はこの言葉がいちばん好きだ。",
        "⑤日本へ行ったあと、日本人の友人と日本語でメールをするようになり、スペースで勉強し始めたばかりの頃の自分の夢が実現した。そのうち日本語の勉強は趣味になったが、仕事が忙しくて挫折しそうになったことが何度もあった。勉強を続けるかどうか迷ったが、せっかくここまで勉強したのだからと自分に言い聞かせて、続けることに決めた。"
      ],
      "note": "挫折：ざせつ（原文假名）",
      "items": [
        {
          "prompt": "①～⑤までの文章を正しい順番に直してください。\n（　）→（　）→（　）→（　）→（　）",
          "answer": "② → ③ → ① → ⑤ → ④",
          "explanation": "初次旅行 → 回港開始學習 → 學習三年後再遊日本 → 與日本朋友通信並堅持學習 → 今年第五年。"
        },
        {
          "prompt": "「継続は力なり」はどういう意味だと思いますか。上の文章から考えて、答えを一つ選んで（　）に書いてください。",
          "optionLabels": [
            "①",
            "②",
            "③"
          ],
          "options": [
            "途中で嫌になっても、あきらめないで、ずっと努力しつづけると、結果として力になるということ。",
            "途中であきらめてしまっても、大丈夫だということ。",
            "継続してもあまり意味がないので、それよりも早く新しいことを始めたほうがいいということ。"
          ],
          "answer": "①"
        }
      ]
    },
    {
      "id": "IX",
      "title": "「　」に合うことわざを□の中から選んで（　）に書いてください。",
      "pages": "5",
      "points": "2×2=4",
      "bank": [
        "猿も木から落ちる",
        "石の上にも三年",
        "住めば都",
        "情けは人のためならず"
      ],
      "items": [
        {
          "prompt": "A：あー、仕事嫌だな。課長にしかられてばかりだよ。もう辞めたいよ。\nB：佐藤課長は厳しいからね。でも「　①　」って言うじゃない。もう少し頑張ってみたら。\nA：うーん、そうだなあ…。",
          "answer": "① 石の上にも三年",
          "explanation": "即使辛苦，只要耐心堅持，終會有成果。"
        },
        {
          "prompt": "A：テレビでマジックショーを見ていたら、「マジックの名人」っていわれてる人が失敗してたよ。\nB：へえ、「　②　」だな。",
          "answer": "② 猿も木から落ちる",
          "note": "※マジックショー：Magic show 魔術",
          "explanation": "即使專家也會有失誤。"
        }
      ]
    }
  ]
};
  const host = document.getElementById("lesson13-quiz1");
  if (!host || host.dataset.initialized) return;
  host.dataset.initialized = "true";
  const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  // Only the source's underlines are markup. No readings on the kanji-answer targets.
  const jp = value => esc(value).replace(/&lt;u&gt;/g,"<u>").replace(/&lt;\/u&gt;/g,"</u>");
  const key = "jpy5.lesson13.quiz1.26a.drafts.v1";
  let drafts = {}, canSave = true;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    if (saved && typeof saved === "object" && !Array.isArray(saved)) drafts = saved;
  } catch { canSave = false; }
  host.innerHTML = `<div class="teacher-supplement-header"><div><span class="teacher-label">YEAR 5 · QUIZ ① · 26A</span><h2 id="quiz13-title">Quiz① 練習與參考答案</h2><p lang="ja">${esc(data.title)}</p></div></div>
    <p class="teacher-source-note">來源：HKU SPACE，<cite>Y5_Quiz1_Ch13_26A.pdf</cite>，全5頁。題目依原稿次序整理；原稿沒有答案頁，以下均為本 App 整理的參考答案，並非老師官方答案。開放題可有其他合理作答。原 PDF 及聽寫錄音不包括在離線內容內。</p>
    <p>先作答，再按「顯示參考答案」核對。呢份練習不自動計分，亦不改動原有測驗成績。草稿只儲存在本機瀏覽器。</p>
    <nav class="quiz13-nav" aria-label="Quiz① 題目部分">${data.sections.map(s=>`<a href="#quiz13-${s.id}">${s.id}</a>`).join("")}</nav>
    <p class="quiz13-save-status" role="status" aria-live="polite"></p>
    ${data.sections.map(section=>`<details class="quiz13-section teacher-exercise" id="quiz13-${section.id}">
      <summary><span>${section.id}</span> <strong lang="ja">${esc(section.title)}</strong> <small>P.${section.pages} · ${esc(section.points)}</small></summary>
      <div class="teacher-exercise-body">
      ${section.instruction?`<p lang="ja" class="quiz13-source-text">${esc(section.instruction)}</p>`:""}
      ${section.note?`<p class="teacher-source-note">${esc(section.note)}</p>`:""}
      ${section.bank?`<ul class="quiz13-bank" aria-label="${section.id} 詞語選項" lang="ja">${section.bank.map(word=>`<li>${esc(word)}</li>`).join("")}</ul>`:""}
      ${section.context?`<div class="quiz13-context" lang="ja">${esc(section.context)}</div>`:""}
      ${section.passages?`<div class="quiz13-passages" lang="ja">${section.passages.map(text=>`<p>${esc(text)}</p>`).join("")}</div>`:""}
      <ol class="quiz13-question-list">${section.items.map((item,index)=>{
        const id = `quiz13-${section.id}-${index+1}`;
        const fields = item.fields || [""];
        return `<li data-quiz13-question="${section.id}-${index+1}">
          <p id="${id}-prompt" lang="ja" class="quiz13-source-text">${jp(item.prompt)}</p>
          ${item.note?`<p class="teacher-source-note" lang="ja">${esc(item.note)}</p>`:""}
          ${item.options?`<fieldset class="quiz13-options" aria-describedby="${id}-prompt"><legend>${section.id}・${index+1} 選擇答案</legend>${item.options.map((option,i)=>`<label><input type="radio" name="${id}" data-draft="${id}" value="${i}"><span lang="ja">${esc(item.optionLabels?.[i] || String.fromCharCode(97+i)+")")} ${esc(option)}</span></label>`).join("")}</fieldset>`:
            fields.map((field,i)=>`<label class="quiz13-entry" for="${id}-${i}">${section.id}・${index+1}${field?" "+esc(field):""} 作答<textarea rows="${item.open?3:2}" id="${id}-${i}" data-draft="${id}-${i}" lang="ja" aria-describedby="${id}-prompt" spellcheck="false"></textarea></label>`).join("")}
          ${item.unavailable?`<p class="teacher-source-note">答案未提供：需老師原來朗讀的句子或錄音，才能核對本題。</p>`:
            `<details class="quiz13-answer"><summary>${item.open?"顯示參考答案（示範；非唯一答案）":"顯示參考答案"}</summary><div><p class="suggested-note">參考答案 · 原 PDF 未附官方答案</p><p lang="ja" class="quiz13-source-text">${esc(item.answer)}</p>${item.explanation?`<p>${esc(item.explanation)}</p>`:""}</div></details>`}
        </li>`;
      }).join("")}</ol></div></details>`).join("")}`;
  const status = host.querySelector(".quiz13-save-status");
  const announce = () => { status.textContent = canSave ? "草稿會自動儲存在本機；參考答案預設隱藏。" : "本機儲存暫不可用；仍可作答及查看參考答案，重新載入後草稿可能不保留。"; };
  host.querySelectorAll("[data-draft]").forEach(input => {
    const value = drafts[input.dataset.draft];
    if (input.type === "radio") input.checked = typeof value === "string" && value === input.value;
    else if (typeof value === "string") input.value = value;
  });
  host.addEventListener("input", event => {
    const input = event.target;
    if (!input.matches("[data-draft]")) return;
    drafts[input.dataset.draft] = input.value;
    try { localStorage.setItem(key, JSON.stringify(drafts)); canSave = true; }
    catch { canSave = false; }
    announce();
  });
  // Section anchors also expand their destination; native details stays keyboard accessible.
  host.querySelectorAll(".quiz13-nav a").forEach(link=>link.addEventListener("click",()=>{
    document.getElementById(link.hash.slice(1)).open = true;
  }));
  const target = host.querySelector(location.hash && /^#quiz13-[IVX]+$/.test(location.hash) ? location.hash : "#quiz13-I");
  if (location.hash.startsWith("#quiz13-") && target) target.open = true;
  announce();
})();
