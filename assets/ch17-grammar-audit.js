// Lesson 17 延伸學習校訂層。來源例句保留在 ch17-data.js；本檔只整理應用程式補充內容。
(() => {
  const extras=window.JPY5_GRAMMAR_EXTRA||[];
  const comparisons={
    karanaru:{headings:["～からなる","～でできている"],rows:[["焦點","組織、制度、群體的構成","物品的材料或製法"],["例","五人からなるチーム","木でできている机"]]},
    toshitewa:{headings:["としては","にしては"],rows:[["核心","提出立場、分類或列舉項目","實際結果偏離一般預期"],["例","問題点としては価格だ","初心者にしては上手だ"]]},
    niyori:{headings:["本課的 により","其他 によって"],rows:[["核心","手段、方法、依據","也可表原因、施事者或個別差異"],["判斷","靠甚麼達成結果？","須按整句語法判斷"]]},
    kotokara:{headings:["ことから","一般的 から"],rows:[["核心","把事實、線索當作推論或由來","直接陳述主觀理由"],["後項","判斷、命名、客觀結果","意志、請求等亦可"]]},
    zaruwoenai:{headings:["ざるを得ない","しかない／ほかない"],rows:[["語感","正式；受壓力而不得不做","較中性地表示只剩一個選擇"],["する","せざるを得ない","するしかない"]]},
    tehajimete:{headings:["～てはじめて","～てから"],rows:[["核心","經歷後才出現新理解或發現","單純表示先後次序"],["後項","分かる、気づく 等常見","各種動作皆可"]]},
    ttara:{headings:["Nったら","Vたら"],rows:[["核心","帶情緒提起某人或事物","條件：如果／一……就……"],["場合","親近、口語","按句意廣泛使用"]]},
    nishitewa:{headings:["にしては","としては"],rows:[["核心","與一般預期有落差","從某立場評價或列舉"],["必要條件","後項有意外評價","不一定有意外感"]]},
    karaniwa:{headings:["からには","一般的 から"],rows:[["核心","既然成立，就有相稱責任或決心","一般原因、理由"],["後項","べきだ、つもりだ、意志等","各種結果皆可"]]},
    daroudesho:{headings:["本課用法","一般推量"],rows:[["核心","提醒、責備對方本應知道的事","推測情況或天氣"],["例","危ないからだめでしょ","明日は雨でしょう"]]}
  };
  extras.forEach(extra=>{
    const id=extra.grammarIds[0];
    // Early placeholder quizzes had implausible distractors. The audited 40-question
    // bank is the single scored practice surface; modal examples remain unscored.
    delete extra.exercises;
    if(comparisons[id])extra.comparison=comparisons[id];
  });
  const toshitewa=extras.find(extra=>extra.grammarIds.includes("toshitewa"));
  if(toshitewa)toshitewa.examples=[
    ["問題点としては、値段が高いことが挙げられます。","列舉問題點：價格高。"],
    ["改善案としては、受付時間の延長が考えられます。","列舉改善方案：延長受理時間。"]
  ];
})();
