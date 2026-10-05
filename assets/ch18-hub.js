document.addEventListener("DOMContentLoaded",()=>{
  const vocab=window.JPY5_VOCABULARY.items,grammar=window.JPY5_DATA,readingData=window.JPY5_READING,listening=window.JPY5_CONVERSATION;
  const cards=JPY5.read("vocabulary.cards.v2",{results:{}}),flashcards=JPY5.read("flashcards",{results:{}}),reading=JPY5.read("reading",{answered:{}}),notes=JPY5.read("conversation",{drafts:{}}),history=JPY5.read("quiz.history",[]);
  const set=(name,value)=>{const node=document.querySelector('[data-progress="'+name+'"]');if(node)node.textContent=value;};
  const examples=grammar.patterns.reduce((n,p)=>n+p.examples.length,0),cardIds=grammar.patterns.flatMap(p=>['summary-'+p.id,...p.examples.map((_,i)=>'example-'+p.id+'-'+i)]),grammarTotal=cardIds.length;
  const vocabDone=vocab.filter(v=>cards.results?.[v.id]).length,grammarDone=cardIds.filter(id=>flashcards.results?.[id]).length;
  const readingDone=readingData.questions.filter(q=>reading.answered?.[q.id]===q.answer).length;
  const drafts=listening.listeningTargets.filter(b=>String(notes.drafts?.[b.id]||'').trim()).length;
  set('vocabulary',vocabDone+'/'+vocab.length+' 已評估');set('grammar',grammarDone+'/'+grammarTotal+' 張已評估');
  set('reading',readingDone+'/'+readingData.questions.length+' App題答對 · 教材原題不計分');
  set('listening',drafts+'/'+listening.listeningTargets.length+' 空欄已作答 · 答案及音訊已核實');set('quiz',history.length+' 次測驗紀錄');
  const count=(name,value)=>document.querySelectorAll('[data-count="'+name+'"]').forEach(node=>node.textContent=value);
  count('vocabulary',vocab.length);count('patterns',grammar.patterns.length);count('examples',examples);count('cards',grammarTotal);count('quiz',grammar.questions.length);count('reading',readingData.questions.length);count('find',readingData.find.length);count('words',readingData.vocab.length);count('sourceQuestions',readingData.sourceQuestions.length);count('dialogue',listening.dialogue.length);count('blanks',listening.listeningTargets.length);count('prompts',listening.sourcePrompts.length);
  const finiteRatio=(done,total)=>Number.isFinite(done)&&total>0?Math.min(1,Math.max(0,done/total)):0;
  const milestones=[finiteRatio(vocabDone,vocab.length),finiteRatio(grammarDone,grammarTotal),finiteRatio(readingDone,readingData.questions.length),Math.min(history.length,1)];
  const overall=Math.round(milestones.reduce((n,value)=>n+value,0)/milestones.length*100);
  set('overall',overall+'%');document.querySelector('#hub-progress-bar').style.width=overall+'%';
});
