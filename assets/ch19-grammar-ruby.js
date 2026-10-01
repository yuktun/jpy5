// Lesson 19 ruby and target highlighting, audited against g_2_19.pdf pp. 1–3.
// Only readings printed in the source handout are included. Source sentences stay unchanged.
(() => {
  const escape=window.JPY5GrammarRuby.escape;
  const readings={
    研究報告:"けんきゅうほうこく",調査:"ちょうさ",行った:"おこなった",結果:"けっか",
    奨学金:"しょうがくきん",発展途上国:"はってんとじょうこく",留学生:"りゅうがくせい",対象:"たいしょう",奨学生:"しょうがくせい",募集:"ぼしゅう",
    本社:"ほんしゃ",新製品:"しんせいひん",年寄り:"としより",上:"うえ",研究:"けんきゅう",開発:"かいはつ",
    山田:"やまだ",英語:"えいご",中国語:"ちゅうごくご",話せる:"はなせる",友人:"ゆうじん",家族:"かぞく",知らなかった:"しらなかった",
    暑い:"あつい",音:"おと",漢字:"かんじ",書けない:"かけない",子供:"こども",大人:"おとな",大人気:"だいにんき",
    仕事:"しごと",成功:"せいこう",協力:"きょうりょく",手紙:"てがみ",正直:"しょうじき",気持ち:"きもち",申し上げた:"もうしあげた",親:"おや",愛している:"あいしている",
    父:"ちち",肺:"はい",工場:"こうじょう",長年:"ながねん",働いた:"はたらいた",打ち込む:"うちこむ",支えて:"ささえて",
    実験:"じっけん",通して:"とおして",得られた:"えられた",信用:"しんよう",今日:"こんにち",世界:"せかい",出来事:"できごと",知る:"しる",出来る:"できる",
    我々:"われわれ",体験:"たいけん",書物:"しょもつ",知識:"ちしき",得る:"える",年間:"ねんかん",文通:"ぶんつう",二人:"ふたり",恋:"こい",実らせた:"みのらせた",
    学校:"がっこう",他:"た",一緒:"いっしょ",遊んだり:"あそんだり",学んだり:"まなんだり",社会生活:"しゃかいせいかつ",
    教師:"きょうし",学生:"がくせい",教える:"おしえる",逆:"ぎゃく",教えられる:"おしえられる",
    会議:"かいぎ",今週末:"こんしゅうまつ",来週:"らいしゅう",行われる:"おこなわれる",予定:"よてい",今月:"こんげつ",来月:"らいげつ",休暇:"きゅうか",
    北陸:"ほくりく",東北:"とうほく",一帯:"いったい",大雪:"おおゆき",被害:"ひがい",見舞われた:"みまわれた",
    見かけ:"みかけ",味:"あじ",学歴:"がくれき",人柄:"ひとがら",難点:"なんてん",奥さん:"おくさん",主人:"しゅじん",
    細かい:"こまかい",点:"てん",全体的:"ぜんたいてき",見れば:"みれば",勝敗:"しょうはい",一生懸命:"いっしょうけんめい",頑張ろう:"がんばろう",
    自然:"しぜん",田舎:"いなか",試合:"しあい",勝つ:"かつ",毎日:"まいにち",時間:"じかん",以上:"いじょう",練習:"れんしゅう",必要:"ひつよう",
    大手会社:"おおてかいしゃ",就職:"しゅうしょく",力:"ちから",家:"いえ",買う:"かう",組まなければ:"くまなければ",
    決して:"けっして",忘れません:"わすれません",忠告:"ちゅうこく",人前:"ひとまえ",馬鹿:"ばか",言う:"いう",弱い:"よわい",人間:"にんげん",
    国家試験:"こっかしけん",受かる:"うかる",諦めない:"あきらめない"
  };
  const words=Object.keys(readings).sort((a,b)=>b.length-a.length);
  const rx=new RegExp(words.map(word=>word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g");
  function render(value){
    const text=String(value??"");let output="",last=0;
    for(const match of text.matchAll(rx)){
      output+=escape(text.slice(last,match.index));
      output+=`<ruby>${escape(match[0])}<rt>${escape(readings[match[0]])}</rt></ruby>`;
      last=match.index+match[0].length;
    }
    return (output+escape(text.slice(last))).replaceAll("\n","<br>");
  }
  const targets={
    wotaishoni:["を対象に"],
    bakaridenakumo:["ばかりでなく"],
    nihokanaranai:["にほかなりません","にほかならない"],
    wotooshite:["を通して"],
    nikakete:["にかけて"],
    hatomokaku:["はともかくとして","はともかく"],
    tameniwa:["ためには"],
    kesshitenai:["決して"]
  };
  function renderExample(value,id){
    const text=String(value??""),target=(targets[id]||[]).find(choice=>text.includes(choice));
    if(!target)return render(text);
    const at=text.indexOf(target);
    return render(text.slice(0,at))+`<mark class="grammar-target">${render(target)}</mark>`+render(text.slice(at+target.length));
  }
  window.JPY5GrammarRuby={escape,render,renderExample,renderPrompt:render,renderTitleInText:render};
})();
