(() => {
  const visitKey = "jpy5-navigation-last-visit-v1";
  const classLesson = 14;
  const modules = [
    ["vocabulary", "詞彙"],
    ["notes", "文法"],
    ["reading", "閱讀"],
    ["textbook", "聆聽"],
    ["review", "複習"],
    ["flashcards", "文法記憶卡"],
    ["quiz", "文法測驗"],
    ["history", "測驗紀錄"]
  ];
  const moduleNames = new Map(modules);
  const page = location.pathname.split("/").pop();
  const match = page.match(/^chapter-(\d+)(?:-([a-z]+))?\.html$/);
  const chooser = document.querySelector("[data-home-lesson-picker]");
  if (!match && !chooser) return;

  function routeFor(navigation, lesson, module) {
    if (!Number.isInteger(lesson) || !navigation.lessons.includes(lesson)) return null;
    const hub = navigation.hubs?.[lesson];
    if (hub !== `chapter-${lesson}.html`) return null;
    if (module === null) return hub;
    if (!moduleNames.has(module)) return null;
    const route = navigation.routes?.[lesson]?.[module];
    return route === `chapter-${lesson}-${module}.html` ? route : null;
  }

  function readVisit(navigation) {
    try {
      const visit = JSON.parse(localStorage.getItem(visitKey));
      if (visit?.version !== 1 || typeof visit.visitedAt !== "string") return null;
      const date = new Date(visit.visitedAt);
      if (!Number.isFinite(date.getTime()) || date.toISOString() !== visit.visitedAt) return null;
      const route = routeFor(navigation, visit.lesson, visit.module);
      return route ? { ...visit, route } : null;
    } catch {
      return null;
    }
  }

  function recordVisit(lesson, module) {
    try {
      localStorage.setItem(visitKey, JSON.stringify({
        version: 1, lesson, module, visitedAt: new Date().toISOString()
      }));
    } catch {}
  }

  function renderHome(navigation) {
    const classHub = routeFor(navigation, classLesson, null);
    if (!classHub) return;
    const select = chooser.querySelector("select");
    const activityNav = chooser.querySelector(".home-module-nav");
    const hint = chooser.querySelector("[data-home-lesson-hint]");
    const hub = chooser.querySelector("[data-selected-hub]");
    const visitHeading = document.querySelector("[data-last-visit-heading]");
    const visitDescription = document.querySelector("[data-last-visit-description]");
    const visitLink = document.querySelector("[data-last-visit-link]");
    const activityLinks = Array.from(activityNav.querySelectorAll("[data-module]"));

    const selectLesson = lesson => {
      const selectedHub = routeFor(navigation, lesson, null);
      if (!selectedHub) return;
      hint.textContent = lesson === classLesson ? `課堂進度・第 ${classLesson} 課` : "";
      for (const link of activityLinks) {
        const href = routeFor(navigation, lesson, link.dataset.module);
        link.hidden = !href;
        if (href) link.href = href;
      }
      activityNav.setAttribute("aria-label", `第 ${lesson} 課學習活動`);
      hub.href = selectedHub;
      hub.setAttribute("aria-label", `開啟第 ${lesson} 課學習中心`);
    };

    const restoreHome = () => {
      select.value = classLesson;
      selectLesson(classLesson);
      const visit = readVisit(navigation);
      visitHeading.textContent = visit
        ? `第 ${visit.lesson} 課・${moduleNames.get(visit.module) ?? "學習中心"}`
        : `從第 ${classLesson} 課開始`;
      visitDescription.textContent = visit ? "這部裝置上次開啟的學習頁面。" : "跟隨課堂進度，也可選擇其他課次。";
      visitLink.href = visit?.route ?? classHub;
      visitLink.firstElementChild.textContent = visit ? "繼續上次開啟的頁面" : "開始學習";
    };

    const options = navigation.lessons
      .filter(lesson => routeFor(navigation, lesson, null))
      .map(lesson => new Option(`第 ${lesson} 課`, lesson));
    select.replaceChildren(...options);
    select.disabled = false;
    restoreHome();
    select.addEventListener("change", () => selectLesson(Number(select.value)));
    window.addEventListener("pageshow", event => { if (event.persisted) restoreHome(); });
  }

  function renderSwitcher(navigation, lesson, module) {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const switcher = document.createElement("nav");
    switcher.className = "lesson-quick-switcher";
    switcher.setAttribute("aria-label", `第 ${lesson} 課學習導覽`);
    const options = navigation.lessons
      .filter(target => routeFor(navigation, target, null))
      .map(target => `<option value="${target}"${target === lesson ? " selected" : ""}>第 ${target} 課</option>`)
      .join("");
    const links = modules.map(([name, label]) => {
      const href = routeFor(navigation, lesson, name);
      if (!href) return `<span class="lesson-module-unavailable" aria-disabled="true">${label}</span>`;
      const active = name === module ? ' class="active" aria-current="page"' : "";
      return `<a href="${href}"${active}>${label}</a>`;
    }).join("");
    switcher.innerHTML = `<label class="lesson-select-label">課次<select class="lesson-select" aria-label="切換課次">${options}</select></label><div class="lesson-quick-sections">${links}</div>`;
    document.querySelectorAll(".module-lesson-switcher,.reading-controls .lesson-pills").forEach(nav => nav.remove());
    header.insertAdjacentElement("afterend", switcher);
    switcher.querySelector("select").addEventListener("change", event => {
      const targetLesson = Number(event.currentTarget.value);
      const destination = routeFor(navigation, targetLesson, module) || routeFor(navigation, targetLesson, null);
      if (destination) location.assign(destination);
    });
  }

  fetch("assets/lesson-navigation.json", { cache: "no-store" })
    .then(response => response.ok ? response.json() : null)
    .then(navigation => {
      if (!Array.isArray(navigation?.lessons)) return;
      if (chooser) {
        renderHome(navigation);
        return;
      }
      const lesson = Number(match[1]);
      const module = match[2] ?? null;
      if (routeFor(navigation, lesson, module) !== page) return;
      recordVisit(lesson, module);
      window.addEventListener("pageshow", event => { if (event.persisted) recordVisit(lesson, module); });
      renderSwitcher(navigation, lesson, module);
    })
    .catch(() => {});
})();
