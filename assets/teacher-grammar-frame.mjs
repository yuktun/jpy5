// Reuse the original renderers in a disposable document. Removing the frame
// removes their DOM, globals and event handlers together on access loss.
export function mountGrammarFrame(root, grammar) {
  const template = root.querySelector('template[data-grammar-template]');
  const content = root.querySelector('[data-teacher-content]');
  const page = root.dataset.grammarPage;
  const scripts = {
    notes: ['grammar-ruby.js', 'notes.js'],
    flashcards: ['grammar-ruby.js', 'flashcards.js'],
    quiz: ['grammar-ruby.js', 'quiz-progress.js', 'ch14-quiz.js'],
    history: ['grammar-ruby.js', 'history.js']
  }[page];
  if (!template || !scripts || !grammar?.data?.patterns?.length || !Array.isArray(grammar.data.questions) || !Array.isArray(grammar.extras) || !Array.isArray(grammar.ruby) || !grammar.questionSignatures) throw new Error('Unsupported grammar payload');
  if(!grammar.data.questions.every(q=>/^sha256:[a-f0-9]{64}$/.test(grammar.questionSignatures[q.id])))throw new Error('Missing question fingerprints');
  const json = JSON.stringify(grammar).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const frame = document.createElement('iframe');
  frame.title = '第 14 課已授權文法工具';
  frame.className = 'teacher-grammar-frame';
  // Auth and persistence stay in the parent. The frame itself never fetches
  // cloud data or initializes another persistent Firestore instance.
  const bootstrap = `const payload=${json}; window.JPY5_DATA=payload.data; window.JPY5_GRAMMAR_EXTRA=payload.extras; window.JPY5_GRAMMAR_RUBY_EXTRA=payload.ruby; window.JPY5QuestionSignatures=payload.questionSignatures; window.JPY5ProtectedLesson='14'; window.JPY5=parent.JPY5;`;
  frame.srcdoc = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; base-uri 'self'; form-action 'none'; connect-src 'none'"><base href="${location.href.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" target="_top"><title>第 14 課文法工具</title><link rel="stylesheet" href="assets/styles.css"><style>html,body{height:auto;min-height:0!important}body{margin:0}main{padding-top:1rem}</style><script>${bootstrap}</script>${scripts.map(file=>`<script src="assets/${file}" defer></script>`).join('')}</head><body>${template.innerHTML}</body></html>`;
  const theme = () => { if(frame.contentDocument) frame.contentDocument.documentElement.dataset.theme=document.documentElement.dataset.theme; };
  const themeObserver = new MutationObserver(theme);
  themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  frame.addEventListener('load',()=>{
    theme();
    // Keep an original modal's viewport visible within the surrounding gate.
    frame.contentDocument?.addEventListener('click',event=>{
      if(event.target.closest('[data-extra-id]'))frame.scrollIntoView({block:'center',behavior:'instant'});
    },true);
  });
  content.append(frame);
  return () => { themeObserver.disconnect(); frame.remove(); };
}
