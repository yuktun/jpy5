(() => {
  const match = location.pathname.match(/chapter-(\d+)-(vocabulary|notes|reading)\.html$/);
  if (!match) return;

  const lesson = Number(match[1]);
  const module = match[2];
  const modules = [
    ["vocabulary", "詞彙"],
    ["notes", "文法"],
    ["reading", "閱讀"]
  ];
  const lessons = [13, 14, 15, 16, 17, 18];
  const scrollKey = `jpy5-quick-switcher-scroll:${location.pathname}`;
  const pageFor = (targetLesson, targetModule) => `chapter-${targetLesson}-${targetModule}.html`;
  const lessonIndex = lessons.indexOf(lesson);
  const previousLesson = lessons[lessonIndex - 1];
  const nextLesson = lessons[lessonIndex + 1];

  const link = (href, label, current = false) => `<a href="${href}"${current ? ' class="active" aria-current="page"' : ""}>${label}</a>`;
  const lessonLink = (targetLesson, direction) => targetLesson
    ? `<a href="${pageFor(targetLesson, module)}" aria-label="${direction === "previous" ? "上一課" : "下一課"}">${direction === "previous" ? "←" : ""} 第${targetLesson}課 ${direction === "next" ? "→" : ""}</a>`
    : `<span aria-disabled="true">${direction === "previous" ? "← 上一課" : "下一課 →"}</span>`;

  const switcher = document.createElement("nav");
  switcher.className = "lesson-quick-switcher";
  switcher.setAttribute("aria-label", `第 ${lesson} 課快速切換`);
  switcher.innerHTML = `<div class="lesson-quick-sections" aria-label="學習部分">${modules.map(([name, label]) => link(pageFor(lesson, name), label, name === module)).join("")}</div><div class="lesson-quick-lessons">${lessonLink(previousLesson, "previous")}<span class="lesson-quick-current">第 ${lesson} 課</span>${lessonLink(nextLesson, "next")}</div>`;

  const header = document.querySelector(".site-header");
  if (!header) return;
  header.insertAdjacentElement("afterend", switcher);

  const saveScrollPosition = () => {
    try { sessionStorage.setItem(scrollKey, String(window.scrollY)); } catch {}
  };
  window.addEventListener("pagehide", saveScrollPosition);
  window.addEventListener("beforeunload", saveScrollPosition);
  window.addEventListener("load", () => {
    try {
      const saved = sessionStorage.getItem(scrollKey);
      if (saved !== null) window.scrollTo({ top: Number(saved), behavior: "auto" });
    } catch {}
  }, { once: true });
})();
