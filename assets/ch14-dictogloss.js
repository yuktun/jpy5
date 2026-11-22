(() => {
  const exercise = document.getElementById('grammar-dictogloss');
  if (!exercise) return;

  const passage = [
    '雑誌で、{1}人を見て、自分もそうなりたいと思った人は少なくない{2}。',
    '{3}、「人生で{4}何だろうか」と考えたことはありませんか。この問いは、社会人が{5}悩むテーマです。',
    '{6}、本当に今の仕事は{7}よいものなのだろうかと悩むこともあるでしょう。',
    '「本当にやりたかったことは{8}」と自分に質問したことがあるかもしれません。もっとよい道を探すために、転職、退職{9}選択肢で悩むことがあるかもしれません。このように、{10}、悩みは{11}。'
  ];
  const answers = [
    ['楽しげに生きている', '～げ'],
    ['のではないでしょうか', '～のではないだろうか'],
    ['仕事をする際', '～際'],
    ['本当の成功とは', '～とは'],
    ['長年にわたって', '～にわたって'],
    ['仕事をしているうちに', '～うちに'],
    ['自分にとって', '～にとって'],
    ['何だったっけ？', '～っけ'],
    ['といった', '～といった'],
    ['人生において', '～において'],
    ['なくならないわけです', '～わけだ']
  ];

  const key = 'jpy5.chapter14.dictogloss.v1';
  let draft = [];
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(stored)) draft = stored;
  } catch { /* Start with empty blanks if a saved draft cannot be read. */ }

  const prompts = exercise.querySelector('[data-dictogloss-prompts]');
  const transcript = exercise.querySelector('[data-dictogloss-transcript]');
  const patterns = exercise.querySelector('[data-dictogloss-patterns]');
  const storageStatus = exercise.querySelector('[data-dictogloss-storage]');
  for (const line of passage) {
    const prompt = document.createElement('p');
    const completed = document.createElement('p');
    for (const part of line.split(/(\{\d+\})/)) {
      const match = part.match(/^\{(\d+)\}$/);
      if (!match) {
        prompt.append(part);
        completed.append(part);
        continue;
      }
      const number = Number(match[1]);
      const index = number - 1;
      const label = document.createElement('label');
      label.className = 'dictogloss-blank';
      const caption = document.createElement('span');
      caption.textContent = number;
      const input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('aria-label', `第 ${number} 空`);
      input.value = typeof draft[index] === 'string' ? draft[index] : '';
      input.addEventListener('input', () => {
        draft[index] = input.value;
        try {
          localStorage.setItem(key, JSON.stringify(draft));
          storageStatus.textContent = '';
        } catch {
          storageStatus.textContent = '這個裝置暫時無法儲存草稿。';
        }
      });
      label.append(caption, input);
      prompt.append(label);

      const answer = document.createElement('strong');
      answer.textContent = answers[index][0];
      completed.append(answer);
    }
    prompts.append(prompt);
    transcript.append(completed);
  }
  for (const [answer, pattern] of answers) {
    const item = document.createElement('li');
    item.textContent = `${answer}（${pattern}）`;
    patterns.append(item);
  }
})();
