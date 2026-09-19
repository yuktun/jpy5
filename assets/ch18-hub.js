document.addEventListener("DOMContentLoaded", () => {
  const vocab = JPY5.read("vocabulary.cards.v2", {results:{}});
  const flashcards = JPY5.read("flashcards", {results:{}});
  const quizHistory = JPY5.read("quiz.history", []);
  const reading = JPY5.read("reading", {answered:{},attempts:[]});
  const conversation = JPY5.read("conversation", {attempts:0,marks:{},comprehensionAnswers:{}});
  const set = (name, value) => { const node=document.querySelector(`[data-progress="${name}"]`); if(node)node.textContent=value; };
  const vocabDone = Object.keys(vocab.results || {}).length;
  const grammarDone = Object.keys(flashcards.results || {}).length;
  const readingDone = Object.keys(reading.answered || {}).length;
  const listeningDone = Object.keys(conversation.comprehensionAnswers || {}).length;
  set("vocabulary", `${vocabDone}/108 已評估`);
  set("grammar", `${grammarDone}/47 張已評估`);
  set("reading", "教材原題不計分");
  set("listening", "Beta：答案待音訊核實，暫不評分");
  set("quiz", `${quizHistory.length} 次測驗紀錄`);
  const finiteRatio=(done,total)=>Number.isFinite(done)&&total>0?Math.min(1,Math.max(0,done/total)):0;
  const milestones = [finiteRatio(vocabDone,108), finiteRatio(grammarDone,47), Math.min(quizHistory.length,1)];
  const overall = Math.round(milestones.reduce((sum,value)=>sum+value,0)/milestones.length*100);
  set("overall", `${overall}%`);
  const bar=document.querySelector("#hub-progress-bar"); if(bar)bar.style.width=`${overall}%`;
});


