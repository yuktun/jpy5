// No separate teacher-authored grammar notes are available for this lesson.
// These public placeholders never stand in for the protected handouts.
window.JPY5_TEACHER = {
  grammar: Object.fromEntries(window.JPY5_DATA.patterns.map(pattern=>[pattern.id,{placeholder:true}])),
  block: () => '<details class="teacher-grammar-placeholder" data-teacher-placeholder><summary>Teacher\'s notes</summary><p>Teacher\'s notes here</p></details>'
};
