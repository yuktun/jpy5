// Device-local drafts: cloud snapshots deliberately exclude active runs.
window.JPY5QuizProgress = (() => {
  const key="quiz.activeRun", version=1;
  const signature=q=>JSON.stringify([q.id,q.pattern,q.prompt,q.options,q.answer]);
  const list=(key)=>{
    const value=JPY5.read(key,[]);if(!Array.isArray(value))return [];
    return key==='quiz.starred'||key==='quiz.lastWrong'?value.filter(id=>typeof id==='string'):value;
  };
  const id=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  function notice(message,runner=false){
    const node=document.querySelector("#resume-message");if(node)node.textContent=message;
    if(runner&&message&&!document.querySelector("#quiz-runner")?.hidden){const feedback=document.querySelector("#answer-explanation");if(feedback)feedback.textContent=message;}
  }
  function create(questions,mode){return {id:id(),mode,questions,index:0,answers:{},answered:false,startedAt:new Date().toISOString(),revision:0};}
  function owns(run){const stored=JPY5.read(key,null);return stored?.id===run.id&&stored.revision===run.revision;}
  function save(run,{replace=false}={}){
    if(!run||run.finished)return false;
    if(!replace&&!owns(run)){
      notice("另一個分頁已更新這份測驗。請返回設定，繼續最新進度或開始新測驗。",true);
      return false;
    }
    const stored={version,id:run.id,mode:run.mode,questionIds:run.questions.map(q=>q.id),signatures:run.questions.map(signature),index:run.index,answers:{...run.answers},startedAt:run.startedAt,revision:run.revision+1};
    JPY5.write(key,stored);
    if(JSON.stringify(JPY5.read(key,null))!==JSON.stringify(stored)){
      notice("未能儲存測驗進度，請檢查瀏覽器儲存空間。",true);return false;
    }
    run.revision=stored.revision;return true;
  }
  function restore(bank,modes){
    const stored=JPY5.read(key,null);
    if(!stored)return null;
    const ids=stored.questionIds;
    if(![0,version].includes(stored.version??0)||typeof stored.id!=="string"||!modes.includes(stored.mode)||!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||!Number.isInteger(stored.index)||stored.index<0||stored.index>=ids.length||!Number.isInteger(stored.revision)||stored.revision<1||!stored.answers||typeof stored.answers!=="object"||Array.isArray(stored.answers)){
      notice("已儲存的測驗格式無法讀取。請開始新測驗；其他學習紀錄會保留。");return null;
    }
    const questions=ids.map(item=>bank.find(q=>q.id===item));
    if(questions.some((q,i)=>!q||stored.signatures?.[i]!==signature(q))){
      notice("題庫已更新，這份測驗不能安全繼續。請開始新測驗；已完成的紀錄會保留。");return null;
    }
    const answers={};
    for(const [item,answer] of Object.entries(stored.answers)){
      const q=questions.find(q=>q.id===item);
      if(!q||!Number.isInteger(answer)||answer<0||answer>=q.options.length){notice("已儲存的答案無法讀取。請開始新測驗。");return null;}
      answers[item]=answer;
    }
    if(questions.slice(0,stored.index).some(q=>answers[q.id]===undefined)){notice("已儲存的答案不完整。請開始新測驗。");return null;}
    if(list("quiz.history").some(attempt=>attempt?.id===stored.id))return null;
    return {...stored,questions,answers,answered:answers[questions[stored.index].id]!==undefined};
  }
  function offer(bank,modes,onResume){
    const button=document.querySelector("#continue-quiz");
    if(!button)return;
    const refresh=()=>{
      const saved=restore(bank,modes);button.hidden=!saved;
      if(!JPY5.read(key,null))notice("");
      if(saved)notice(`未完成測驗：${saved.index+1} / ${saved.questions.length}，已答 ${Object.keys(saved.answers).length} 題。可繼續或開始新測驗。`);
    };
    button.onclick=()=>{const saved=restore(bank,modes);if(saved)onResume(saved);};
    window.addEventListener("storage",event=>{if(event.key===null||event.key?.endsWith('.quiz.activeRun'))refresh();});refresh();return refresh;
  }
  async function complete(run,commit){
    if(!run||run.finished)return false;
    const finish=()=>{
      if(run.finished)return false;
      if(list("quiz.history").some(attempt=>attempt?.id===run.id)){run.finished=true;return false;}
      if(!owns(run)){notice("測驗進度已在另一分頁更新。請繼續最新進度後完成。",true);return false;}
      commit();
      if(!list("quiz.history").some(attempt=>attempt?.id===run.id)){notice("未能儲存完成紀錄，請稍後重試。",true);return false;}
      run.finished=true;
      if(owns(run))JPY5.remove(key);
      return true;
    };
    // Serialize completion across same-origin tabs where Web Locks is available.
    return navigator.locks?.request? navigator.locks.request('jpy5-quiz-finish',finish):finish();
  }
  function wrong(previous,results){
    const attempted=new Set(results.filter(r=>Number.isInteger(r.selected)).map(r=>r.questionId));
    return [...new Set([...(Array.isArray(previous)?previous:[]).filter(id=>!attempted.has(id)),...results.filter(r=>Number.isInteger(r.selected)&&!r.correct).map(r=>r.questionId)])];
  }
  return {create,save,restore,offer,complete,wrong,list};
})();
