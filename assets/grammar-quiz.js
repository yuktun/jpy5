const {patterns,questions,noHintQuestions=[]}=window.JPY5_DATA;
const grammarRuby=window.JPY5GrammarRuby;
const allQuestions=[...questions,...noHintQuestions];
const quizProgress=window.JPY5QuizProgress;
const storedSettings=JPY5.read("quiz.settings",{});
const savedSettings=storedSettings&&typeof storedSettings==="object"?storedSettings:{};
const validModes=new Set(["practice","exam","challenge"]);
let settings={mode:validModes.has(savedSettings.mode)?savedSettings.mode:"practice",selected:new Set((Array.isArray(savedSettings.selected)?savedSettings.selected:undefined)?.filter(id=>patterns.some(pattern=>pattern.id===id))||patterns.map(pattern=>pattern.id))};
let run=null;

const saveSettings=()=>JPY5.write("quiz.settings",{mode:settings.mode,selected:[...settings.selected],random:document.querySelector("#random-order")?.checked||false,wrongOnly:document.querySelector("#wrong-only")?.checked||false,starredOnly:document.querySelector("#starred-only")?.checked||false});
const reviewId=id=>allQuestions.some(question=>question.id===id)?id:id.replace(/-(1|2)$/,"-app-$1");
const starred=()=>[...new Set(quizProgress.list("quiz.starred").map(reviewId))];
const setStarred=value=>JPY5.write("quiz.starred",value);
const questionKindLabels={"意思":"意思","接續":"接續",meaning:"意思",formation:"接續",context:"情境",contrast:"辨析"};
const isChallenge=()=>settings.mode==="challenge";

function updateModeControls(){
  document.querySelectorAll("[data-mode]").forEach(button=>button.classList.toggle("active",button.dataset.mode===settings.mode));
  document.querySelector("#guided-question-setup").hidden=isChallenge();
  document.querySelector("#challenge-mode-note").hidden=!isChallenge();
  document.querySelector("#start-quiz").textContent=isChallenge()?`開始新挑戰（${noHintQuestions.length} 題） →`:"開始新測驗 →";
}

function setup(){
  document.querySelector("#pattern-filters").innerHTML=`<button data-pattern="all" class="active">全部句型</button>${patterns.map(pattern=>`<button data-pattern="${pattern.id}" class="active" lang="ja">${grammarRuby.render(pattern.title)}</button>`).join("")}`;
  document.querySelectorAll("[data-mode]").forEach(button=>button.onclick=()=>{settings.mode=button.dataset.mode;updateModeControls();saveSettings();});
  document.querySelectorAll("[data-pattern]").forEach(button=>button.onclick=()=>togglePattern(button));
  document.querySelector("#random-order").checked=Boolean(savedSettings.random);
  document.querySelector("#wrong-only").checked=Boolean(savedSettings.wrongOnly);
  document.querySelector("#starred-only").checked=Boolean(savedSettings.starredOnly);
  document.querySelectorAll("#random-order,#wrong-only,#starred-only").forEach(input=>input.onchange=saveSettings);
  document.querySelectorAll("[data-pattern]").forEach(button=>button.classList.toggle("active",button.dataset.pattern==="all"?settings.selected.size===patterns.length:settings.selected.has(button.dataset.pattern)));
  updateModeControls();
}

function togglePattern(button){
  const id=button.dataset.pattern;
  if(id==="all"){
    const selectAll=settings.selected.size!==patterns.length;
    settings.selected=new Set(selectAll?patterns.map(pattern=>pattern.id):[]);
  }else{
    settings.selected.has(id)?settings.selected.delete(id):settings.selected.add(id);
  }
  document.querySelectorAll("[data-pattern]").forEach(item=>item.classList.toggle("active",item.dataset.pattern==="all"?settings.selected.size===patterns.length:settings.selected.has(item.dataset.pattern)));
  saveSettings();
}

function buildQuestions(){
  let pool=isChallenge()?noHintQuestions:questions.filter(question=>settings.selected.has(question.pattern));
  if(document.querySelector("#wrong-only").checked){
    const wrong=quizProgress.list("quiz.lastWrong").map(reviewId);
    pool=pool.filter(question=>wrong.includes(question.id));
  }
  if(document.querySelector("#starred-only").checked)pool=pool.filter(question=>starred().includes(question.id));
  if(document.querySelector("#random-order").checked)pool=JPY5.shuffle(pool);
  return pool;
}

function start(customPool){
  const pool=customPool||buildQuestions();
  if(!pool.length){
    document.querySelector("#setup-message").textContent=isChallenge()?"這個篩選沒有無提示題目；可取消錯題／標記篩選後再試。":"這個篩選沒有題目，請選擇其他句型或重溫分類。";
    return;
  }
  run=quizProgress.create(pool,settings.mode);
  if(!quizProgress.save(run,{replace:true}))return;
  document.querySelector("#quiz-setup").hidden=true;
  document.querySelector("#quiz-result").hidden=true;
  document.querySelector("#quiz-runner").hidden=false;
  renderQuestion();
}

function renderQuestion(){
  const question=run.questions[run.index],pattern=patterns.find(item=>item.id===question.pattern),challenge=isChallenge();
  run.answered=run.answers[question.id]!==undefined;
  document.querySelector("#quiz-progress-text").innerHTML=challenge?`${run.index+1} / ${run.questions.length} · 無提示情境辨析`:`${run.index+1} / ${run.questions.length} · <span lang="ja">${grammarRuby.render(pattern.title)}</span>`;
  document.querySelector("#quiz-progress-bar").style.width=`${(run.index+1)/run.questions.length*100}%`;
  document.querySelector("#question-kind").textContent=challenge?"App 延伸練習 · 無提示情境辨析":"應用程式文法練習 · "+(questionKindLabels[question.kind]||question.kind);
  document.querySelector("#question-prompt").innerHTML=challenge?grammarRuby.render(question.prompt):grammarRuby.renderPrompt(question.prompt,pattern.title);
  document.querySelector("#quiz-options").innerHTML=question.options.map((option,index)=>`<button data-answer="${index}" lang="ja">${grammarRuby.render(option)}</button>`).join("");
  document.querySelectorAll("[data-answer]").forEach(button=>button.onclick=()=>choose(Number(button.dataset.answer)));
  document.querySelector("#answer-explanation").textContent="";
  document.querySelector("#next-question").textContent=run.index===run.questions.length-1?(challenge?"完成辨析 →":"完成測驗 →"):(challenge?"下一個情境 →":"下一題 →");
  document.querySelector("#next-question").disabled=!run.answered;
  updateStar();
  if(run.answered){
    if(settings.mode!=="exam")showAnswer();
    else document.querySelectorAll("[data-answer]").forEach((button,index)=>button.classList.toggle("selected",index===run.answers[question.id]));
  }
}

function choose(answer){
  const question=run.questions[run.index];
  if(settings.mode!=="exam"&&run.answered)return;
  run.answers[question.id]=answer;
  run.answered=true;if(!saveProgress())return;if(settings.mode!=="exam")showAnswer();
  else{
    document.querySelectorAll("[data-answer]").forEach((button,index)=>button.classList.toggle("selected",index===answer));
    document.querySelector("#next-question").disabled=false;
  }
}

function showAnswer(){
  const question=run.questions[run.index],selected=run.answers[question.id],pattern=patterns.find(item=>item.id===question.pattern),challenge=isChallenge();
  document.querySelectorAll("[data-answer]").forEach((button,index)=>{
    button.disabled=true;
    button.classList.toggle("correct",index===question.answer);
    button.classList.toggle("wrong",index===selected&&index!==question.answer);
  });
  const verdict=selected===question.answer?"答對了。":`正確答案是「<span lang="ja">${grammarRuby.render(question.options[question.answer])}</span>」。`;
  const selectedNuance=challenge&&question.choiceFeedback?.[selected]?`<span class="choice-nuance"><strong>你所選項目的語氣：</strong>${grammarRuby.escape(question.choiceFeedback[selected])}</span>`:"";
  const target=challenge?`<span class="answer-target"><strong>這題重點：</strong><span lang="ja">${grammarRuby.render(pattern.title)}</span></span>`:"";
  document.querySelector("#answer-explanation").innerHTML=`<span>${verdict} ${grammarRuby.escape(question.explanation)}</span>${selectedNuance}${target}`;
  document.querySelector("#next-question").disabled=false;
}

function next(){
  if(run.answers[run.questions[run.index].id]===undefined)return;
  if(run.index<run.questions.length-1){run.index++;if(!saveProgress())return;renderQuestion();}
  else finish();
}

async function finish(){const completedRun=run;const saved=await quizProgress.complete(completedRun,()=>{
  const results=completedRun.questions.map(question=>({questionId:question.id,question:{...question},selected:completedRun.answers[question.id],correct:completedRun.answers[question.id]===question.answer}));
  const score=results.filter(result=>result.correct).length,wrong=results.filter(result=>!result.correct).map(result=>result.questionId);
  JPY5.write("quiz.lastWrong",quizProgress.wrong(quizProgress.list("quiz.lastWrong").map(reviewId),results));
  const history=quizProgress.list("quiz.history");
  const attempt={id:completedRun.id,date:new Date().toISOString(),mode:completedRun.mode,score,total:results.length,results};
  JPY5.write("quiz.history",[attempt,...history].slice(0,100));
  if(!quizProgress.list("quiz.history").some(item=>item?.id===completedRun.id)||run!==completedRun)return;
  document.querySelector("#quiz-runner").hidden=true;
  document.querySelector("#quiz-result").hidden=false;
  document.querySelector("#result-score").textContent=`${score} / ${results.length}`;
  document.querySelector("#result-message").textContent=score===results.length?"全對！本輪題目已掌握。":`答對 ${Math.round(score/results.length*100)}%。本輪錯題已加入針對性重溫。`;
  document.querySelector("#retry-wrong").hidden=!wrong.length;
  document.querySelector("#retry-wrong").onclick=()=>start(allQuestions.filter(question=>wrong.includes(question.id)));
  document.querySelector("#result-details").innerHTML=results.map(result=>{
    const question=allQuestions.find(item=>item.id===result.questionId)||result.question,pattern=patterns.find(item=>item.id===question.pattern);
    return `<details class="result-item"><summary>${result.correct?"✓":"✕"} ${grammarRuby.renderPrompt(question.prompt,pattern?.title||"")}</summary><p>你的答案：<span lang="ja">${result.selected===undefined?"未作答":grammarRuby.render(question.options[result.selected])}</span></p><p>正確答案：<span lang="ja">${grammarRuby.render(question.options[question.answer])}</span></p><p>${grammarRuby.escape(question.explanation)}</p></details>`;
  }).join("");
});if(saved)refreshResume();return saved;}

function updateStar(){
  const question=run.questions[run.index],list=starred();
  document.querySelector("#quiz-star").textContent=list.includes(question.id)?"★ 已標記":"☆ 標記";
}

document.querySelector("#start-quiz").onclick=()=>start();
document.querySelector("#next-question").onclick=next;
document.querySelector("#quit-quiz").onclick=()=>{document.querySelector("#quiz-runner").hidden=true;document.querySelector("#quiz-setup").hidden=false;refreshResume();};
document.querySelector("#new-quiz").onclick=()=>{document.querySelector("#quiz-result").hidden=true;document.querySelector("#quiz-setup").hidden=false;refreshResume();};
document.querySelector("#quiz-star").onclick=()=>{const id=run.questions[run.index].id,list=starred();setStarred(list.includes(id)?list.filter(item=>item!==id):[...list,id]);updateStar();};
setup();

function saveProgress(){if(quizProgress.save(run))return true;document.querySelector("#quiz-runner").hidden=true;document.querySelector("#quiz-setup").hidden=false;refreshResume();return false;}
const refreshResume=quizProgress.offer(allQuestions,["practice","exam","challenge"],saved=>{run=saved;settings.mode=run.mode;updateModeControls();document.querySelector("#quiz-setup").hidden=true;document.querySelector("#quiz-result").hidden=true;document.querySelector("#quiz-runner").hidden=false;renderQuestion();});
