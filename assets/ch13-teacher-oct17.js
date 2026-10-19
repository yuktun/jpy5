// Source-specific additions; the original handouts, question IDs and scores remain intact.
(() => {
  const teacher=window.JPY5_TEACHER;
  if(!teacher)return;
  const source='https://drive.google.com/file/d/14UOoHb84_CQpz0YOTrXNuTLKXvatn5vS/view';
  const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const link=pages=>`<a class="teacher-source" href="${source}#page=${String(pages).split('–')[0]}" target="_blank" rel="noopener">17 OCT 修正版老師講義 · PDF 第 ${esc(pages)} 頁 ↗</a>`;
  const grammar={
    hodo:{title:'程度的畫面與時態',pages:'1–5',quotes:[
      '「ため{息|いき}が{出|で}るほど{美|うつく}しい」というのは、「{美|うつく}しすぎて、{言葉|ことば}で{表現|ひょうげん}できない」という{意味|いみ}です。つまり、「とても{美|うつく}しい」という{意味|いみ}です。'
    ],study:'老師在組句題把「美しい」改為「美しかった」，對應「若い頃」。第二題圈出「あって／も／ほど」，第三題圈出「に／が／ほど／のに」。這些標註已放在下方原題的答案內；不用重做一份題目。練習2要求想出不同於課本示例的答案。'},
    ndatte:{title:'「んだ」與引用「って」分開理解',pages:'6–8',quotes:[
      'V {普通形|ふつうけい}＋んだって？　※「んだ」＋「って」',
      'バスが{来|こ}なかったんです。',
      '{彼|かれ}が{会社|かいしゃ}を{辞|や}めるってうわさを{聞|き}きました。'
    ],study:'修正版把說明的「んだ／のだ」與引用的「って」分開呈現。升調對話選「友達」，說話者要確認「雑誌で読んだこと」；降調是傳達消息，講義明確寫「確認の意味はない」。這是講義對這兩段對話的分類；原有升降調說明及舊例保留。'},
    nagara:{title:'狀態的接續與「ながらも」',pages:'9–15',quotes:[
      '6{年間|ねんかん}も{香港|ほんこん}に{住|す}んでいながら、まだピークに{行|い}ったことがありません。',
      '{使|つか}える{動詞|どうし}に{注意|ちゅうい}！！（～ています）、{状態動詞|じょうたいどうし}（ex.あります、います etc…）',
      '「～ながらも」にすると、{強調|きょうちょう}の{意味|いみ}になる。',
      '{彼|かれ}は{犯人|はんにん}を{知|し}っていながら、{警察|けいさつ}に{知|し}らせなかった。',
      '{仕事|しごと}がとても{忙|いそが}しいながら、{毎日|まいにち}{幸|しあわ}せです。',
      '{彼|かれ}は{料理|りょうり}が{苦手|にがて}ながら、がんばってフランス{料理|りょうり}を{作|つく}った。',
      '{太郎|たろう}くんは4{歳|さい}ながら、{漢字|かんじ}をよく{知|し}っている。'
    ],study:'新版的香港例是6年；舊老師補充的9年例照樣保留，兩者不是同一筆題目資料的更正。老師用V、い形容詞、な形容詞、名詞的例子標出接續，並在原題圈出「あり／い／思い」。練習2要另想不同答案；練習3是自己的經驗，不是唯一標準答案。'},
    tsumari:{title:'換句話說：具體解釋與推論',pages:'16–21',quotes:[
      '{言葉|ことば}を{言|い}い{換|か}えるとき、「つまり～のだ」と{言|い}うこともある。',
      'スーさんは{日本語|にほんご}を{勉強|べんきょう}して{半年|はんとし}でN1に{合格|ごうかく}した。つまり、{彼|かれ}は{天才|てんさい}なのだ。'
    ],study:'老師的箭頭把「約1萬人中有約1000名留學生」連到「1割」，把「一年休假12天」連到「每月一天」，並把父親是兄弟連到「いとこ同士」。這些原有課本例不用另抄；下方原題保留，新增老師紅字答案及出處。講義也提供「つまり～のだ」的例子；它是該例的推論，並非客觀測定一個人是否天才。'},
    yone:{title:'確認、引起關心與語調',pages:'22–27',quotes:[
      '{普通形|ふつうけい}／{丁寧形|ていねいけい}＋よね　※「よ」（{初級|しょきゅう}L20）＋「ね」（{初級|しょきゅう}L5）',
      '{田中|たなか}さんはまだ{学生|がくせい}［だ］よね。'
    ],study:'修正版在對話①圈「確認して」及「しています」（資訊清楚）；②圈「関心」；③圈「前から」；④圈「怒って」。第24頁把「質問」刪去改為「確認」的提醒，不能只見問號便當成詢問新資訊。講義也提到女性說話時常省略名詞／な形容詞後的「だ」；此處保留為老師對用語傾向的說明，不當成按性別限制使用的規則。原有四種情境解說不重複抄寫，末頁兩題的老師選項和提示已放入原題答案。'}
  };
  const vocabularyRows=[
    ['掃除機','そうじき','vacuum cleaner／吸塵器',1],
    ['ため息','ためいき','sigh／嘆息、嘆氣',2],
    ['あふれる','あふれる','【自Ⅱ】overflow／溢出、充滿',4,'ごみ{箱|ばこ}からゴミがあふれている。'],
    ['たまる','たまる','【自Ⅰ】pile up／堆積；講義另列【他Ⅱ】作對照',4,'ゴミがたまる。{仕事|しごと}がたまる。'],
    ['受験生','じゅけんせい','student preparing for an exam／考生',13,'','同頁的「アトム」是小飛俠阿童木／Mighty Atom，屬課本機械人例的詞語，不另加計分詞卡。'],
    ['都心','としん','city centre／市中心（講義說明：主要指東京的中心區）',13],
    ['双子','ふたご','twins／雙胞胎',14],
    ['世界的','せかいてき','worldwide／世界性［的］（な形容詞）',14],
    ['スター','スター','star／明星',14],
    ['シーズン','シーズン','season／旺季',15],
    ['約～','やく～','about／約',17],
    ['割','わり','10 percent／百分之十',17],
    ['休暇','きゅうか','holiday／休假',17],
    ['いとこ','いとこ','cousin／表堂兄弟姐妹間',18,'','講義另列「いとこ同士」：表堂兄弟姐妹之間。'],
    ['同士','どうし','us together／～之間',18,'いとこ{同士|どうし}'],
    ['ルーズ','ルーズ','［な］sloppy／懶散',19,'','老師提醒：來自英語 loose，但日語「ルーズ［な］」與英語 loose 並非意思完全相同。舊詞條與獨立校核保留。'],
    ['売り上げ','うりあげ','sales／營業額',20,'{売|う}り{上|あ}げが{落|お}ちる。'],
    ['落ちる','おちる','講義在「売り上げが落ちる」中示範營業額下降，助詞是「が」',20,'{売|う}り{上|あ}げが{落|お}ちる。'],
    ['工学部','こうがくぶ','department of engineering／工科（院）系',21],
    ['入り直す','はいりなおす','【Ⅰ自】go back／重新上學',21,'{大学|だいがく}に{入|はい}り{直|なお}す。'],
    ['関係','かんけい','～関係：related／與～相關的',21],
    ['ポテトチップス','ポテトチップス','chips, potato chips／炸土豆片',25],
    ['インスタント食品','インスタントしょくひん','instant food／快餐食品',27],
    ['インスタント','インスタント','instant／即席、即食、速溶',27],
    ['食品','しょくひん','food／食品',27],
    ['あきる','あきる','【Ⅱ自】get tired of／厭（了）',27,'ゲームにあきる。']
  ];
  const vocabulary=Object.fromEntries(vocabularyRows.map(([word,reading,gloss,page,example='',study=''])=>[word,{word,reading,gloss,page,example,study}]));
  const answers={
    'hodo-1-1':{page:2,quote:'は／が／ほど／{美|うつく}しかった',study:'紅字把「美しい」改為過去式；老師解釋「ため息が出るほど」是非常美麗的程度。'},
    'hodo-1-2':{page:3,quote:'は／が／あって／も／ほど',study:'紅字把「ある」改為「あって」，並在「寝る時間」後加「も」。'},
    'hodo-1-3':{page:4,quote:'に／が／ほど／のに',study:'紅字標出地點「に」、主語「が」、程度「ほど」與逆接「のに」。'},
    'ndatte-1':{page:8,quote:'b．{田中|たなか}さんが{結婚|けっこん}するって{聞|き}いたけど、{本当|ほんとう}？',study:'老師圈b：升調要確認聽來的消息，並非單純告知。'},
    'nagara-1-1':{page:13,quote:'いい{車|くるま}を{持|も}ってい',study:'填入空格後接題目已有的「ながら」。'},
    'nagara-1-2':{page:13,quote:'ロボットであり',study:'老師紅字使用「であり」，保留名詞接續。'},
    'nagara-1-3':{page:13,quote:'{都心|としん}にあり',study:'老師紅字使用狀態的「あり」。'},
    'tsumari-1-1':{page:20,quote:'{行|い}けないということですね',study:'老師紅字是把前面「白天有課，晚上要寫報告」概括為不能去。'},
    'tsumari-1-2':{page:20,quote:'くびということですか',study:'老師紅字以疑問式確認推論，不能把店長的暗示直接當成已證實的事實。'},
    'yone-1':{page:26,quote:'a．そうですよ',study:'老師提示：B想對A的確認回答「是」。'},
    'yone-2':{page:26,quote:'a．{捨|す}てるんですよ',study:'老師提示：B想告訴A新的資訊。'}
  };
  const sections={
    'hodo:1':{page:5,quote:'{教科書|きょうかしょ}の{答|こた}えと{違|ちが}うものを{考|かんが}えましょう！！'},
    'nagara:1':{page:14,quote:'{教科書|きょうかしょ}の{答|こた}えとは{違|ちが}う{答|こた}えを{言|い}いましょう！'}
  };
  function grammarBlock(id,furigana=true){
    const item=grammar[id];if(!item)return '';
    return `<details class="teacher-addition" data-oct17-grammar="${id}"><summary id="teacher-oct17-${id}"><span>17 OCT 老師補充</span> ${esc(item.title)}</summary><div class="teacher-addition-body"><b>老師原文／原例（節錄）</b>${item.quotes.map(quote=>`<p lang="ja">${teacher.jp(quote,furigana)}</p>`).join('')}<b>學習整理（中文轉述及銜接提示）</b><p>${esc(item.study)}</p>${link(item.pages)}</div></details>`;
  }
  function vocabularyBlock(word,furigana=true){
    const item=vocabulary[word];if(!item)return '';
    const marked=`{${item.word}|${item.reading}}`;
    return `<details class="teacher-addition" data-oct17-vocabulary="${esc(word)}"><summary><span>17 OCT 老師詞彙提示</span></summary><div class="teacher-addition-body"><p><span lang="ja">${teacher.jp(marked,furigana)}</span>：${esc(item.gloss)}</p>${item.example?`<p lang="ja">${teacher.jp(item.example,furigana)}</p>`:''}${item.study?`<p><b>學習整理：</b>${esc(item.study)}</p>`:''}${link(item.page)}</div></details>`;
  }
  function answerBlock(id,existingAnswer=''){
    const item=answers[id];if(!item)return '';
    const normalize=text=>String(text).replace(/\{([^{}|]+)\|[^{}|]+\}/g,'$1').normalize('NFKC').replace(/[。．.\s]/g,'');
    const sameAnswer=normalize(item.quote)===normalize(existingAnswer);
    return `<aside class="teacher-example" data-oct17-answer="${id}"><b>老師紅字標註（原題，並非新增題目）</b>${sameAnswer?'<p>老師標註與以上原有答案相同，不重複抄寫。</p>':`<p lang="ja">${teacher.jp(item.quote)}</p>`}<p><b>學習整理：</b>${esc(item.study)}</p>${link(item.page)}</aside>`;
  }
  function sectionBlock(id,index){
    const item=sections[`${id}:${index}`];if(!item)return '';
    return `<aside class="teacher-example" data-oct17-instruction><b>老師課堂要求</b><p lang="ja">${teacher.jp(item.quote)}</p><p>先用自己的內容作答。以下原有答案仍是建議例，不是這項課堂要求的唯一答案。</p>${link(item.page)}</aside>`;
  }
  // Add a sibling disclosure only for the five matching existing grammar notes.
  const originalBlock=teacher.block;
  const keys=new Map(Object.entries(teacher.grammar).map(([id,item])=>[item,id]));
  teacher.block=(item,furigana=true)=>originalBlock(item,furigana)+grammarBlock(keys.get(item),furigana);
  teacher.oct17={source,grammar,vocabulary,answers,sections,grammarBlock,vocabularyBlock,answerBlock,sectionBlock};
})();
