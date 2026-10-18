// No separate teacher-authored grammar notes are available for this lesson.
// This non-secret demo is rendered only after a server permission check.
// Real teacher notes must always be retrieved from the protected document.
window.JPY5_TEACHER = {
  grammar: Object.fromEntries(window.JPY5_DATA.patterns.map(pattern=>[pattern.id,{placeholder:true}])),
  block: () => '<details class="teacher-grammar-placeholder" data-teacher-demo><summary>Teacher\'s notes</summary><p data-teacher-demo-status role="status" aria-live="polite">正在準備存取驗證…</p><button type="button" class="text-button" data-teacher-demo-login hidden>Google 登入</button><button type="button" class="text-button" data-teacher-demo-retry hidden>重試</button><div data-teacher-demo-content></div></details>'
};
