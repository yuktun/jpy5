const { patterns } = window.JPY5_DATA;
function noteCard(pattern, index) {
  return `<article class="grammar-card note-card"><div class="card-topline"><span>${pattern.group}</span><span>${String(index+1).padStart(2,"0")}</span></div><h3>${pattern.title}</h3><p class="meaning">${pattern.meaning}</p><div class="formation">${pattern.formation}</div><p class="usage-note">${pattern.note}</p><div class="examples-list">${pattern.examples.map(([jp,zh])=>`<p class="example"><span class="example-jp" lang="ja">${jp}</span><span class="example-zh">${zh}</span></p>`).join("")}</div></article>`;
}
document.querySelectorAll("[data-group]").forEach(grid => { grid.innerHTML = patterns.map((p,i)=>p.group===grid.dataset.group?noteCard(p,i):"").join(""); });
