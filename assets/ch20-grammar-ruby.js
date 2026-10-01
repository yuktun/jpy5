// Lesson 20 teaching ruby and target highlighting; source Japanese stays unchanged.
(() => {
  const escape=window.JPY5GrammarRuby.escape;
  const readings={
    学生:"がくせい",憂鬱:"ゆううつ",様子:"ようす",試験:"しけん",難:"むずか",違:"ちが",人:"ひと",規則:"きそく",破:"やぶ",知:"し",立派:"りっぱ",家:"いえ",住:"す",山田:"やまだ",金持:"かねも",幸:"しあわ",顔:"かお",知らせ:"しらせ",
    例年:"れいねん",比:"くら",今年:"ことし",野菜:"やさい",出来:"でき",男性:"だんせい",女性:"じょせい",柔軟性:"じゅうなんせい",使:"つか",手:"て",書:"か",字:"じ",早:"はや",東京:"とうきょう",大阪:"おおさか",物価:"ぶっか",安:"やす",
    心:"こころ",人間:"にんげん",本来:"ほんらい",自分勝手:"じぶんかって",金:"きん",世間:"せけん",冷:"つめ",一時:"いちじ",騒:"さわ",忘:"わす",人生:"じんせい",勤勉:"きんべん",悪口:"わるくち",言:"い",動物:"どうぶつ",会社:"かいしゃ",問題:"もんだい",個人:"こじん",解決:"かいけつ",
    今:"いま",本屋:"ほんや",前:"まえ",確:"たし",机:"つくえ",上:"うえ",置:"お",顕微鏡:"けんびきょう",見:"み",赤:"あか",細胞:"さいぼう",三:"みっ",分裂:"ぶんれつ",外:"そと",遊:"あそ",寒:"さむ",残:"のこ",食:"た",夕刊:"ゆうかん",今日:"きょう",日曜日:"にちようび",来:"こ",昨日:"きのう",待:"ま",喫茶店:"きっさてん",多:"おお",居:"い",
    遅い:"おそい",約束:"やくそく",時間:"じかん",遅:"おく",行:"い",今回:"こんかい",参加:"さんか",次回:"じかい",頼:"たの",引き受:"ひきう",悲:"かな",死:"し",帰:"かえ",子供:"こども",先生:"せんせい",間違:"まちが",浅田:"あさだ",坂田:"さかた",我慢:"がまん",誰:"だれ",一:"ひと",二:"ふた",秘密:"ひみつ",源氏物語:"げんじものがたり",終:"お",読:"よ",笑:"わら",話:"はな",時:"とき",思:"おも",私:"わたし",文学部:"ぶんがくぶ",進:"すす",父:"とう",望:"のぞ",製品:"せいひん",手伝:"てつだ",仕事:"しごと",
    子:"こ",過:"す",足跡:"あしあと",部屋:"へや",出:"で",玄関:"げんかん",靴:"くつ",交通費:"こうつうひ",雨:"あめ",去年:"きょねん",入力:"にゅうりょく",気持:"きも",努力:"どりょく",友達:"ともだち",探:"さが",駅:"えき",明日:"あした",予定:"よてい",急:"きゅう",電車:"でんしゃ",止:"と",運休:"うんきゅう",到着:"とうちゃく",連絡:"れんらく",確認:"かくにん",合格:"ごうかく",受付:"うけつけ",受け付:"うけつ",終電:"しゅうでん",間に合:"まにあ",忙:"いそが",休:"やす",担当:"たんとう"
  };
  const words=Object.keys(readings).sort((a,b)=>b.length-a.length),rx=new RegExp(words.join('|'),'g');
  function render(value){
    const text=String(value??'');let output='',last=0;
    for(const match of text.matchAll(rx)){output+=escape(text.slice(last,match.index));const kana=match[0]==='時'&&/\d/.test(text[match.index-1]||'')?'じ':readings[match[0]];output+=`<ruby>${escape(match[0])}<rt>${escape(kana)}</rt></ruby>`;last=match.index+match[0].length;}
    return (output+escape(text.slice(last))).replaceAll('\n','<br>');
  }
  const targets={nichigainai:['に違いない'],nikurabete:['に比べて','に比べると'],monoda:['ものではない','ものです','ものだ'],ta_discovery:['あった','いた','わかった'],datte:['だって'],tatokorode:['たところで','だところで'],ndatte:['だって'],koso:['からこそ','でこそ','こそ']};
  function renderExample(value,id){
    const text=String(value??''),choices=targets[id]||[],target=choices.find(t=>text.includes(t));
    if(!target)return render(text);
    // Highlight the selected grammatical string before ruby, preventing nested markup.
    const at=text.indexOf(target);
    return render(text.slice(0,at))+`<mark class="grammar-target">${render(target)}</mark>`+render(text.slice(at+target.length));
  }
  window.JPY5GrammarRuby={escape,render,renderExample,renderPrompt:render,renderTitleInText:render};
})();
