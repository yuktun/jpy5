// Choice identities are canonical indices, never positions on screen.
// Version 2 ordering is derived from the saved run ID and question sequence:
// reload/backtracking cannot change what a stored answer means.
window.JPY5QuizChoices = (() => {
  const hash = text => { let h=2166136261; for(const c of String(text)) h=Math.imul(h^c.charCodeAt(0),16777619)>>>0; return h; };
  function question(run, q) {
    return run.optionBankVersion===2 || !q.legacyOptions ? q : {...q,options:q.legacyOptions};
  }
  function shuffled(values,key) {
    const result=[...values];let seed=hash(key)||1;
    for(let i=result.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;const j=(seed>>>0)%(i+1);[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  function order(run, q) {
    const indices=q.options.map((_,i)=>i), others=shuffled(indices.filter(i=>i!==q.answer),`${run.id}|${q.id}`);
    const position=run.questions.findIndex(item=>item.id===q.id);
    // Shuffle the balanced position pool too: there is no repeating 1-2-3-4 pattern.
    const slots=shuffled(run.questions.map((_,i)=>(i+hash(run.id))%indices.length),`${run.id}|answer-positions`);
    const slot=slots[Math.max(0,position)];
    others.splice(slot,0,q.answer);
    return others;
  }
  const identity=(q,index)=>`${q.id}:choice:${index}`;
  return {question,order,identity};
})();
