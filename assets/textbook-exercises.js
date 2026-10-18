// Shared grammar-note exercises for Lessons 14–20. Load the lesson dataset first.
// JPY5_TEXTBOOK_EXERCISE_DATA: {lesson, source?, readings?, groups:{patternId:[section]},
//   orphanTitles?:{unmatchedPatternId:'Japanese title with explicit ruby'}}.
// section: {title,page,printedPage?,source?,instruction,japaneseInstruction?,model?,
//   bank?,answerSource?:{url,page},items:[{id,prompt,options?,answer?,
//   answerKind:'official'|'suggested'|'personal'|'missing',answerSource?,answerNote?,explanation?}]}.
// page always means the 1-based PDF page index; printedPage is the printed label.
// Japanese fields accept explicit {base|ひらがな} ruby. readings is an optional
// base-to-hiragana object (longest match first). All source strings remain text.
// An optional [data-textbook-unmatched] container receives only groups explicitly
// declared in orphanTitles and absent from JPY5_DATA.patterns. It remains hidden
// when empty. This appendix never adds grammar patterns or learning-progress IDs.
window.JPY5_TEXTBOOK_EXERCISES = (() => {
  const data = window.JPY5_TEXTBOOK_EXERCISE_DATA || {};
  const groups = data.groups || {};
  const escape = text => String(text ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const readings = Object.entries(data.readings || {}).filter(([base]) => base).sort((a,b) => b[0].length-a[0].length);
  const readingMap = new Map(readings);
  const readingPattern = readings.length ? new RegExp(readings.map(([base]) => base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu') : null;
  const ruby = (base, reading) => `<ruby>${escape(base)}<rt>${escape(reading)}</rt></ruby>`;
  function plainJapanese(text) {
    if (!readingPattern) return escape(text);
    let result = '', offset = 0;
    for (const match of text.matchAll(readingPattern)) {
      result += escape(text.slice(offset, match.index)) + ruby(match[0], readingMap.get(match[0]));
      offset = match.index + match[0].length;
    }
    return result + escape(text.slice(offset));
  }
  function jp(value) {
    const text = String(value ?? '');
    let result = '', offset = 0;
    for (const match of text.matchAll(/\{([^{}|]+)\|([^{}|]+)\}/gu)) {
      result += plainJapanese(text.slice(offset, match.index)) + ruby(match[1], match[2]);
      offset = match.index + match[0].length;
    }
    return (result + plainJapanese(text.slice(offset))).replace(/\r?\n/g, '<br>');
  }
  function sourceLink(source, label, printedPage) {
    if (!source?.url || !Number.isInteger(source.page) || source.page < 1) return '';
    // Dataset links can be HTTPS URLs or same-site relative paths; never execute URLs.
    const url = String(source.url);
    if (!/^(?:https?:\/\/|\.?\.?\/|[^:/?#]+(?:\/|\.pdf(?:[?#]|$)))/i.test(url) || /[\u0000-\u0020]/u.test(url)) return '';
    const pageLabel = printedPage == null ? `PDF P.${source.page}` : `PDF P.${source.page}（印刷頁 ${printedPage}）`;
    return `<a href="${escape(url.split('#')[0])}#page=${source.page}" target="_blank" rel="noopener">${escape(label)} · ${escape(pageLabel)} ↗ <small class="internet-required">（需連線）</small></a>`;
  }
  function renderAnswer(item, section, index) {
    // An unspecified provenance never becomes an official answer by default.
    const kind = item.answerKind || (item.personal ? 'personal' : 'suggested');
    const personalOmission = kind === 'personal' && !item.answer;
    const missing = kind === 'missing' || (item.answer == null && !personalOmission);
    const labels = {official:'官方答案', suggested:'參考示例（非唯一答案）', personal:personalOmission ? '自行作答（答案冊省略）' : '自行作答', missing:'答案未提供'};
    const label = labels[missing ? 'missing' : kind] || labels.suggested;
    const note = item.answerNote || (missing ? '此題未提供固定答案；不以推測答案取代原稿。' : personalOmission ? '此題為自行作答；答案冊標記省略，沒有固定答案。' : kind === 'personal' ? '此題為自行作答，沒有固定答案；請依自己的情況回答。' : kind === 'official' ? '' : '此為開放題參考示例，並非唯一答案；請參閱所附答案來源。');
    const provenance = sourceLink(item.answerSource || section.answerSource, '答案來源');
    return `<details class="textbook-answer" data-answer-kind="${escape(missing ? 'missing' : kind)}"><summary>${escape(section.title)} ${index+1} · ${label}</summary><div class="textbook-answer-body">${note ? `<p class="textbook-practice-note">${escape(note)}</p>` : ''}${missing || !item.answer ? '' : `<p lang="ja">${jp(item.answer)}</p>`}${item.explanation ? `<p>${escape(item.explanation)}</p>` : ''}${provenance ? `<p class="textbook-practice-note">${provenance}</p>` : ''}</div></details>`;
  }
  function render(id) {
    const sections = Object.hasOwn(groups, id) ? groups[id] : null;
    if (!Array.isArray(sections) || !sections.length) return '';
    const pages = [...new Set(sections.map(section => section.page))];
    const count = sections.reduce((total, section) => total + section.items.length, 0);
    const source = data.source || window.JPY5?.sources?.textbooks?.[data.lesson];
    return `<details class="teacher-addition textbook-practice" data-textbook-pattern="${escape(id)}"><summary><span>課本文法練習</span> · PDF P.${escape(pages.join('、'))} · ${count} 題</summary><div class="teacher-addition-body"><p class="textbook-practice-note">每題答案獨立收合；練習不計分，也不寫入學習進度。</p>${sections.map(section => `<section class="textbook-practice-group"><h4>${escape(section.title)} ${sourceLink({url:section.source || source,page:section.page}, '課本來源', section.printedPage)}</h4>${section.instruction ? `<p${section.japaneseInstruction ? ' lang="ja"' : ''}>${section.japaneseInstruction ? jp(section.instruction) : escape(section.instruction)}</p>` : ''}${section.model ? `<div class="textbook-model"><b>例題</b><p lang="ja">${jp(section.model)}</p></div>` : ''}${section.bank ? `<ul class="textbook-word-bank" aria-label="詞語選項" lang="ja">${section.bank.map(word => `<li>${jp(word)}</li>`).join('')}</ul>` : ''}<ol class="textbook-question-list">${section.items.map((item,index) => `<li data-textbook-question="${escape(item.id)}"><p lang="ja">${jp(item.prompt)}</p>${item.options ? `<ol type="a" lang="ja">${item.options.map(option => `<li>${jp(option)}</li>`).join('')}</ol>` : ''}${renderAnswer(item,section,index)}</li>`).join('')}</ol></section>`).join('')}</div></details>`;
  }
  function renderUnmatched() {
    const container = window.document?.querySelector('[data-textbook-unmatched]');
    if (!container) return;
    const patternIds = new Set((window.JPY5_DATA?.patterns || []).map(pattern => pattern.id));
    const titles = data.orphanTitles || {};
    const html = Object.keys(groups).filter(id => !patternIds.has(id) && Object.hasOwn(titles, id) && titles[id]).map(id => {
      const exercises = render(id);
      return exercises ? `<article class="grammar-card note-card" data-textbook-unmatched-pattern="${escape(id)}"><h3 lang="ja">${jp(titles[id])}</h3>${exercises}</article>` : '';
    }).join('');
    container.innerHTML = html;
    container.hidden = !html;
  }
  if (window.document?.readyState === 'loading') window.document.addEventListener('DOMContentLoaded', renderUnmatched, {once:true});
  else renderUnmatched();
  return {groups, render, jp, renderUnmatched};
})();
