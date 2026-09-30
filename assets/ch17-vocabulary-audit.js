// Preserve the school handout's labels while adding explicit teaching notes.
(() => {
  const items=window.JPY5_VOCABULARY?.items||[];
  const notes={
    23:"來源標示：他動詞（原樣保留）。教學補充：一般辭典把「引き返す」列作自動詞，表示折返／返回。",
    78:"來源標示：名詞（原樣保留）。教學補充：「身近」在一般用法多作な形容詞，例如「身近な問題」。"
  };
  const originals={3:"cookie",13:"cost",26:"event",43:"violin",48:"living room",64:"youth",66:"Pelé",73:"Pokémon",74:"relay",75:"Hawaii",82:"style",90:"Rome"};
  for(const [id,original] of Object.entries(originals)){
    const item=items.find(entry=>entry.id===Number(id));
    if(item)item.original=original;
  }
  for(const [id,note] of Object.entries(notes)){
    const item=items.find(entry=>entry.id===Number(id));
    if(item)item.note=note;
  }
})();
