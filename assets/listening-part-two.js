/* Keep the textbook's two listening question groups visible without changing saved answers. */
window.JPY5ListeningPartTwo = (() => {
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  function prepare(stage) {
    const data = window.JPY5_CONVERSATION;
    const questions = data.textbookQuestions || data.textbook?.listenQuestions;
    let groups;
    if (questions) {
      const original = stage.querySelector('.textbook-listen-section');
      const cards = [...original.querySelectorAll('.textbook-answer-card')];
      const supplement = make('section', 'listening-supplement');
      const oldHeading = stage.querySelector('.stage-heading');
      const customQuestions = stage.querySelector('.reading-question-list');
      oldHeading.querySelector('.kicker').textContent = '補充練習';
      oldHeading.querySelector('h2').textContent = '自訂理解練習';
      oldHeading.querySelector('span').textContent = `${data.comprehension.length} 題補充練習`;
      supplement.append(oldHeading, customQuestions);

      const heading = make('div', 'stage-heading listening-part-two-heading');
      const title = make('div');
      title.append(make('p', 'kicker', '課本原題 · 話す・聞く'), make('h2', '', '聆聽第二部分 · 2. 聞いてみよう'));
      heading.append(title);
      const note = make('p', 'listening-part-two-note', '先聽錄音，再寫下答案；官方答案預設隱藏。自由作答，不自動評分。');
      groups = [1, 2].map(part => {
        const section = make('section', 'textbook-listen-section');
        const divider = make('div', 'section-divider');
        divider.append(make('h2', '', part === 1 ? '1）內容理解' : '2）表現理解'));
        divider.append(make('p', '', part === 1 ? '内容を聞き取りましょう。' : '表現を聞き取りましょう。どう言いましたか。'));
        const grid = make('div', 'textbook-answer-grid');
        cards.forEach((card, index) => {
          const questionPart = questions[index].id.startsWith('tb-e') ? 2 : 1;
          if (questionPart === part) grid.append(card);
        });
        section.append(divider, grid);
        return section;
      });
      stage.replaceChildren(heading, note, ...groups, supplement);
    } else {
      groups = [...stage.querySelectorAll('.textbook-listen-section')];
      const heading = stage.querySelector('.stage-heading');
      heading.classList.add('listening-part-two-heading');
      heading.querySelector('.kicker').textContent = '課本原題 · 話す・聞く';
      heading.querySelector('h2').textContent = '聆聽第二部分 · 2. 聞いてみよう';
      groups[0].querySelector('.section-divider h2').textContent = '1）內容理解';
      groups[1].querySelector('.section-divider h2').textContent = '2）表現理解';
    }

    const navigation = make('nav', 'listening-part-nav');
    navigation.setAttribute('aria-label', '聆聽第二部分題組');
    groups.forEach((group, index) => {
      group.id = `listening-part-${index + 1}`;
      const heading = group.querySelector('.section-divider h2');
      heading.id = `${group.id}-title`;
      heading.tabIndex = -1;
      group.setAttribute('aria-labelledby', heading.id);
      const count = group.querySelectorAll('.textbook-answer-card').length;
      const link = make('a', 'secondary-button', `${index + 1}）${index ? '表現理解' : '內容理解'} · ${count} 題`);
      link.href = `#${group.id}`;
      link.addEventListener('click', event => {
        event.preventDefault();
        heading.focus({preventScroll: true});
        const switcher = document.querySelector('.lesson-quick-switcher');
        const offset = (switcher?.offsetHeight || 0) + 32;
        window.scrollTo({top: window.scrollY + group.getBoundingClientRect().top - offset, behavior: 'instant'});
      });
      navigation.append(link);
    });
    stage.querySelector('.listening-part-two-heading').after(navigation);
  }
  return {prepare};
})();
