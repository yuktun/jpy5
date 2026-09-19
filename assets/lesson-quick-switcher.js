(() => {
  const match = location.pathname.match(/chapter-(\d+)-(vocabulary|notes|reading|textbook|review)\.html$/);
  if (!match) return;

  const lesson = Number(match[1]);
  const module = match[2];
  const modules = [
    ["vocabulary", "詞彙"],
    ["notes", "文法"],
    ["reading", "閱讀"],
    ["textbook", "聆聽"],
    ["review", "複習"]
  ];
  const render = navigation => {
    const routeFor = (targetLesson, targetModule) => navigation.routes[String(targetLesson)]?.[targetModule];
    const fallbackFor = targetLesson => `chapter-${targetLesson}.html`;
    const link = (href, label, current = false) => href
      ? `<a href="${href}"${current ? ' class="active" aria-current="page"' : ""}>${label}</a>`
      : `<span class="lesson-module-unavailable" aria-disabled="true">${label}</span>`;
    const selectOptions = navigation.lessons.map(targetLesson => `<option value="${targetLesson}"${targetLesson === lesson ? " selected" : ""}>第 ${targetLesson} 課</option>`).join("");
    const switcher = document.createElement("nav");
    switcher.className = "lesson-quick-switcher";
    switcher.setAttribute("aria-label", `第 ${lesson} 課學習導覽`);
    switcher.innerHTML = `<label class="lesson-select-label">課次<select class="lesson-select" aria-label="選擇課次">${selectOptions}</select></label><div class="lesson-quick-sections" aria-label="學習模組">${modules.map(([name, label]) => link(routeFor(lesson, name), label, name === module)).join("")}</div><p class="lesson-navigation-status" aria-live="polite"></p>`;
    const header = document.querySelector(".site-header");
    if (!header) return;
    document.querySelectorAll(".module-lesson-switcher,.reading-controls .lesson-pills").forEach(nav => nav.remove());
    header.insertAdjacentElement("afterend", switcher);
    switcher.querySelector(".lesson-select").addEventListener("change", event => {
      const targetLesson = Number(event.currentTarget.value);
      const destination = routeFor(targetLesson, module);
      if (destination) { location.assign(destination); return; }
      switcher.querySelector(".lesson-navigation-status").textContent = `第 ${targetLesson} 課未設有${modules.find(([name]) => name === module)?.[1] || "此"}模組，將開啟該課學習中心。`;
      location.assign(fallbackFor(targetLesson));
    });
  };
  fetch("assets/lesson-navigation.json", { cache: "no-store" })
    .then(response => response.ok ? response.json() : Promise.reject(new Error("Navigation data unavailable")))
    .then(render)
    .catch(() => {});
})();
