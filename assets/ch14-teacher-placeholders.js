// Bodies are retrieved only from the existing authorized Firestore document.
// No teacher grammar content is embedded in this public template.
window.JPY5_TEACHER = {
  grammar: Object.fromEntries(window.JPY5_DATA.patterns.map(pattern=>[pattern.id,{id:pattern.id}])),
  block: note => `<details class="teacher-grammar-placeholder" data-teacher-demo data-teacher-grammar-id="${note.id}"><summary>Teacher's notes · 24 OCT–14 NOV</summary><p data-teacher-demo-status role="status" aria-live="polite">正在準備存取驗證…</p><button type="button" class="text-button" data-teacher-demo-login hidden>Google 登入</button><button type="button" class="text-button" data-teacher-demo-retry hidden>重試</button><div data-teacher-demo-content></div></details>`
};
