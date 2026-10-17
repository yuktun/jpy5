// Textbook pp. 9-12: prompts/models from the supplied pages; open answers are study aids.
window.JPY5_TEXTBOOK_EXERCISES = (() => {
  const groups = {
    tate: [{title:"理解確認", page:9, instruction:"選擇符合句意的答案。", items:[
      {id:"tate-1", prompt:"入社したての社員は仕事に（　）。", options:["慣れていないので不安だ", "慣れているので安心だ"], answer:"a．慣れていないので不安だ", explanation:"「入社したて」指剛加入公司，這裡著重尚未熟悉工作。"}
    ]}],
    tatoe: [{title:"理解確認", page:9, instruction:"選擇符合句意的答案。", items:[
      {id:"tatoe-1", prompt:"たとえ妻でも、宇宙に行きたいという僕を止めることはできない。", options:["妻だけ僕を止めることができる。", "誰も僕を止めることができない。"], answer:"b．誰も僕を止めることができない。", explanation:"連妻子也不能阻止，藉極端例子表達決心不變。"}
    ]}],
    tarishinai: [{title:"理解確認", page:9, instruction:"選擇符合句意的答案。", items:[
      {id:"tarishinai-1", prompt:"彼女は、たとえ疲れていても、それを口に出したりしない。", options:["彼女はとても我慢強い人だ。", "彼女はあまり疲れない人だ。"], answer:"a．彼女はとても我慢強い人だ。", explanation:"即使疲倦也不說出口，並非不會疲倦。"}
    ]}],
    hodo: [
      {title:"練習1", page:10, instruction:"參照例句，把提示詞組成使用「ほど」的句子；按需要改變詞形、加入助詞。", model:"この　掃除機　使っていても　誰も　気づかない　静かだ\n→ この掃除機は使っていても誰も気づかないほど静かだ。", items:[
        {id:"hodo-1-1", prompt:"彼女　若い頃　ため息　出る　美しい　→", answer:"彼女は若い頃、ため息が出るほど美しかった。", suggested:true, explanation:"以「ため息が出る」表示美麗的程度；「若い頃」配合過去形。"},
        {id:"hodo-1-2", prompt:"この　歌手　人気　ある　最近は　寝る　時間　ない　忙しい　らしい　→", answer:"この歌手は人気があって、最近は寝る時間がないほど忙しいらしい。", suggested:true, explanation:"「寝る時間がないほど」修飾「忙しい」；「らしい」保留傳聞語氣。"},
        {id:"hodo-1-3", prompt:"ごみ箱　ごみ　あふれる　たまっている　誰も　捨てようとしない　→", answer:"ごみ箱にごみがあふれるほどたまっているのに、誰も捨てようとしない。", suggested:true, explanation:"「あふれるほど」表示堆積程度；後半用「のに」連接反差。"}
      ]},
      {title:"練習2", page:10, instruction:"在空白處補上符合文意的表達。", model:"彼に結婚を申し込まれたときは、もう死んでもいいと思うほどうれしかった。", items:[
        {id:"hodo-2-1", prompt:"＿＿＿＿ときは＿＿＿＿ほど緊張した。", answer:"初めて舞台に立ったときは、声が出ないほど緊張した。", suggested:true},
        {id:"hodo-2-2", prompt:"＿＿＿＿ので＿＿＿＿ほど悲しかった。", answer:"大切な友達が遠くへ引っ越したので、何もしたくなくなるほど悲しかった。", suggested:true},
        {id:"hodo-2-3", prompt:"＿＿＿＿はびっくりするほど＿＿＿＿。", answer:"この店のケーキはびっくりするほど大きい。", suggested:true}
      ]}
    ],
    ndatte: [{title:"理解確認", page:10, instruction:"選擇符合對話意思的答案。", items:[
      {id:"ndatte-1", prompt:"田中さんが結婚するんだって？\n…そうらしいですね。", options:["田中さんが結婚すると言っていました。", "田中さんが結婚するって聞いたけど、本当？"], answer:"b．田中さんが結婚するって聞いたけど、本当？", explanation:"本題是上揚語調的確認：聽說了這個消息，再向對方核實。"}
    ]}],
    nagara: [
      {title:"練習1", page:10, instruction:"從詞庫選擇適當表達填入括號，並按句子改變詞形。", model:"息子は（受験生であり）ながら、勉強しないでテレビばかり見ている。", bank:["いい車を持っている", "受験生である", "都心にある", "ロボットである"], items:[
        {id:"nagara-1-1", prompt:"兄は（　）ながら、月に１回ぐらいしか運転しない。", answer:"いい車を持ってい", explanation:"「持っている」的ます形是「持っています」；去掉「ます」，接「ながら」成為「持っていながら」。"},
        {id:"nagara-1-2", prompt:"アトムは（　）ながら、人の気持ちが分かる。", answer:"ロボットであり", explanation:"「である」接「ながら」時用「でありながら」。"},
        {id:"nagara-1-3", prompt:"この公園は（　）ながら、森の中のように静かだ。", answer:"都心にあり", explanation:"「ある」接「ながら」時用「ありながら」。"}
      ]},
      {title:"練習2", page:11, instruction:"補完句子，表達與前半預期相反的結果。", model:"あの二人は双子でありながら、顔も性格も全然違う。", items:[
        {id:"nagara-2-1", prompt:"たばこは体に悪いとわかっていながら、＿＿＿＿。", answer:"たばこは体に悪いとわかっていながら、毎日吸ってしまう。", suggested:true},
        {id:"nagara-2-2", prompt:"あの人は世界的なスターでありながら、＿＿＿＿。", answer:"あの人は世界的なスターでありながら、とても気さくに話してくれる。", suggested:true}
      ]},
      {title:"練習3", page:11, instruction:"これまでに「もったいないと思いながら」、したことを話してください。", japaneseInstruction:true, model:"若い頃の私は１シーズン着ただけのコートを、まだ着られると思いながら、デザインが古いというだけで捨ててしまった。今思えば、実にもったいない話である。", items:[
        {id:"nagara-3-1", prompt:"自分の経験を話してください。", personal:true, suggested:true, answer:"冷蔵庫に野菜が残っていると知りながら、また買ってしまいました。結局、古い野菜を食べきれず、もったいないと思いながら捨ててしまいました。", explanation:"可換成自己的真實經驗，說明「知道／覺得如此，卻仍做了某事」。"}
      ]}
    ],
    tsumari: [
      {title:"練習1", page:11, instruction:"參照例句，用「つまり」把對方的話換個方式確認。", model:"A：あの人ね、約束を忘れたり、遅れたりすることが多いし、部屋も片づいていないし…。\nB：つまり、ルーズだということですか。", items:[
        {id:"tsumari-1-1", prompt:"A：あしたはちょっと…。昼間は授業があるし、夜はレポートを書かなければならないんです。\nB：つまり、＿＿＿＿。", answer:"B：つまり、あしたは来られないということですね。", suggested:true, explanation:"對方列出不能赴約的理由，確認其含意；「行けない」等表達也可依情境使用。"},
        {id:"tsumari-1-2", prompt:"店長：最近店は暇だし、売上げも落ちてきて、悪いんだけど…。\nアルバイト：つまり、＿＿＿＿。", answer:"アルバイト：つまり、私はもうここで働けないということですか。", suggested:true, explanation:"用問句確認店長未說完的意思，避免把自己的推測直接當作事實。"}
      ]},
      {title:"練習2", page:11, instruction:"例のように話の最後を「つまり、……ということです」でまとめてください。", japaneseInstruction:true, model:"私の両親は二人とも音楽家ですが、私は大学は工学部に入りました。しかし、やはり音楽が好きで、30歳前に音楽大学に入り直して、今は音楽関係の仕事をしています。つまり、親の影響は大きいということです。", items:[
        {id:"tsumari-2-1", prompt:"自分の話をまとめてください。", personal:true, suggested:true, answer:"以前は日本語のニュースがほとんどわかりませんでした。でも、毎日少しずつ聞いていたら、少しずつ内容がわかるようになりました。つまり、毎日続けることが大切だということです。", explanation:"先說明經歷，再用「つまり」歸納重點。"}
      ]}
    ],
    yone: [{title:"練習", page:12, instruction:"選擇符合對話情境的表達。", model:"A：インスタント食品って、毎日食べるとあきるんだよね。\nB：（a．うん、そうだよね。　b．うん、そうだよ。）\n例の答え：a", items:[
      {id:"yone-1", prompt:"A：サントスさん、お国では日本と違ってクリスマスは家族と過ごすことが多いんですよね。\nB：（　）。", options:["そうですよ", "そうですよね"], answer:"a．そうですよ。", explanation:"A 向熟悉自己國家習俗的 B 確認；B 以「そうですよ」肯定、告知。不要把所有「よね」都機械地回應成「そうですよね」。"},
      {id:"yone-2", prompt:"A：タワポンさん、ちょっと待って。ごみは分けてから（　）。\nB：そうですか。知りませんでした。", options:["捨てるんですよ", "捨てるんですよね"], answer:"a．捨てるんですよ。", explanation:"B 原本不知道規則，所以 A 是告知新資訊，用「よ」。"}
    ]}]
  };
  const escape = text => String(text).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  function render(id) {
    const sections = groups[id];
    if (!sections) return "";
    const source = window.JPY5.sources.textbooks[13];
    return `<section class="textbook-practice" data-textbook-pattern="${id}" aria-labelledby="textbook-${id}-title"><h4 id="textbook-${id}-title">課本原題練習</h4><p class="textbook-practice-note">先自行作答，再逐題展開答案。此練習不計分，不改動學習進度。</p>${sections.map(section=>`<section class="textbook-practice-group"><h5>${escape(section.title)} <a href="${source}#page=${section.page}" target="_blank" rel="noopener">P.${section.page} 原頁 ↗ <small class="internet-required">（需網絡）</small></a></h5><p${section.japaneseInstruction?' lang="ja"':''}>${escape(section.instruction)}</p>${section.model?`<div class="textbook-model"><b>課本例</b><p lang="ja">${escape(section.model)}</p></div>`:""}${section.bank?`<ul class="textbook-word-bank" aria-label="詞庫" lang="ja">${section.bank.map(word=>`<li>${escape(word)}</li>`).join("")}</ul>`:""}<ol class="textbook-question-list">${section.items.map((item,index)=>`<li data-textbook-question="${item.id}"><p lang="ja">${escape(item.prompt)}</p>${item.options?`<ol type="a" lang="ja">${item.options.map(option=>`<li>${escape(option)}</li>`).join("")}</ol>`:""}<details class="textbook-answer"><summary>${escape(section.title)} ${index+1} · ${item.personal?"顯示個人作答示例":item.suggested?"顯示建議答案":"顯示答案"}</summary><div class="textbook-answer-body">${item.suggested?`<p class="textbook-practice-note">${item.personal?"個人作答示例；並非官方或唯一答案。":"建議例：其他符合題意、文法正確的表達也可以。"}</p>`:""}<p lang="ja">${escape(item.answer)}</p>${item.explanation?`<p>${escape(item.explanation)}</p>`:""}</div></details></li>`).join("")}</ol></section>`).join("")}</section>`;
  }
  return {groups, render};
})();
