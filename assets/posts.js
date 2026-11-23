(() => {
  const list = document.querySelector("[data-posts]");
  if (!list) return;
  const archive = list.dataset.posts === "all";
  const topics = {
    grammar: "文法詞彙", conversation: "會話聆聽", reading: "閱讀理解",
    writing: "寫作練習", study: "學習方法", other: "其他"
  };
  const topicOf = value => typeof value === "string" && Object.hasOwn(topics, value) ? value : "other";
  const lessonOf = value => Number.isInteger(value) && value > 0 ? String(value) : "general";
  const lessonLabel = value => value === "general" ? "通用" : `第 ${value} 課`;
  const normalize = value => value.normalize("NFKC").trim().toLocaleLowerCase("zh-Hant");

  const isText = value => typeof value === "string" && value.trim().length > 0;
  const isDate = value => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  const isPost = post => post
    && typeof post.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)
    && isText(post.title) && isText(post.summary) && isText(post.category)
    && isDate(post.publishedAt)
    && (post.updatedAt === undefined || (isDate(post.updatedAt) && post.updatedAt >= post.publishedAt))
    && Number.isInteger(post.readingMinutes) && post.readingMinutes > 0;

  function element(tag, value, className) {
    const node = document.createElement(tag);
    if (value) node.textContent = value;
    if (className) node.className = className;
    return node;
  }

  function card(post, heading) {
    const item = element("li", null, "post-card");
    if (archive) {
      item.dataset.topic = topicOf(post.topic);
      item.dataset.lesson = lessonOf(post.lesson);
    }
    const link = element("a");
    link.href = `article-${post.slug}.html`;
    const date = element("time", post.publishedAt.replaceAll("-", "."));
    date.dateTime = post.publishedAt;
    const metadata = element("p", null, "post-meta");
    if (archive) {
      metadata.append(element("span", topics[topicOf(post.topic)]), element("span", lessonLabel(lessonOf(post.lesson))));
    }
    if (!archive || post.category !== topics[topicOf(post.topic)]) metadata.append(element("span", post.category));
    metadata.append(date, element("span", `約 ${post.readingMinutes} 分鐘`));
    const arrow = element("span", "↗", "post-arrow");
    arrow.setAttribute("aria-hidden", "true");
    if (archive) link.append(element(heading, post.title), element("p", post.summary), metadata, arrow);
    else link.append(metadata, element(heading, post.title), element("p", post.summary), arrow);
    item.append(link);
    return item;
  }

  // Enhance the complete HTML fallback before requesting metadata.
  const controls = archive && document.querySelector("[data-archive-controls]");
  let refreshArchive = () => {};
  if (controls) {
    const search = controls.querySelector("[data-archive-search]");
    const topicGroup = controls.querySelector("[data-archive-topics]");
    const lessonSelect = controls.querySelector("[data-archive-lesson]");
    const status = controls.querySelector("[data-archive-status]");
    const empty = document.querySelector("[data-archive-empty]");
    let selectedTopic = "all";
    let composing = false;
    let query = "";
    let rows = [];

    function applyFilters() {
      if (!composing) query = normalize(search.value);
      let count = 0;
      for (const { node, topic, lesson, text } of rows) {
        node.hidden = !((selectedTopic === "all" || selectedTopic === topic)
          && (lessonSelect.value === "all" || lessonSelect.value === lesson)
          && text.includes(query));
        if (!node.hidden) count++;
      }
      for (const button of topicGroup.querySelectorAll("button")) {
        button.setAttribute("aria-pressed", String(button.dataset.topic === selectedTopic));
      }
      status.textContent = `顯示 ${count} / ${rows.length} 篇文章 · 最新在前`;
      empty.hidden = count !== 0;
    }

    refreshArchive = () => {
      const focusedTopic = topicGroup.contains(document.activeElement) ? document.activeElement.dataset.topic : null;
      rows = Array.from(list.children, node => ({
        node, topic: topicOf(node.dataset.topic),
        lesson: lessonOf(Number(node.dataset.lesson)),
        text: normalize(`${node.querySelector("h2").textContent} ${node.querySelector("p:not(.post-meta)").textContent}`)
      }));
      if (selectedTopic !== "all" && !rows.some(row => row.topic === selectedTopic)) selectedTopic = "all";
      topicGroup.replaceChildren(...["all", ...Object.keys(topics).filter(topic => rows.some(row => row.topic === topic))].map(topic => {
        const count = topic === "all" ? rows.length : rows.filter(row => row.topic === topic).length;
        const button = element("button", `${topic === "all" ? "全部" : topics[topic]} ${count}`);
        button.type = "button";
        button.dataset.topic = topic;
        button.setAttribute("aria-controls", list.id);
        return button;
      }));
      const previousLesson = lessonSelect.value;
      const lessons = [...new Set(rows.map(row => row.lesson))].sort((a, b) => {
        if (a === "general") return 1;
        if (b === "general") return -1;
        return Number(a) - Number(b);
      });
      lessonSelect.replaceChildren(...["all", ...lessons].map(lesson => {
        const option = element("option", lesson === "all" ? `所有課次（${rows.length}）` : `${lessonLabel(lesson)}（${rows.filter(row => row.lesson === lesson).length}）`);
        option.value = lesson;
        return option;
      }));
      lessonSelect.value = lessons.includes(previousLesson) ? previousLesson : "all";
      applyFilters();
      if (focusedTopic) (topicGroup.querySelector(`[data-topic="${focusedTopic}"]`) || topicGroup.querySelector("button")).focus();
    };
    topicGroup.addEventListener("click", event => {
      const button = event.target.closest("button[data-topic]");
      if (!button) return;
      selectedTopic = button.dataset.topic;
      applyFilters();
    });
    search.addEventListener("compositionstart", () => { composing = true; });
    search.addEventListener("compositionend", () => { composing = false; applyFilters(); });
    search.addEventListener("input", event => { if (!composing && !event.isComposing) applyFilters(); });
    lessonSelect.addEventListener("change", applyFilters);
    function reset() {
      search.value = "";
      composing = false;
      selectedTopic = "all";
      lessonSelect.value = "all";
      applyFilters();
    }
    controls.querySelector("[data-archive-reset]").addEventListener("click", reset);
    empty.querySelector("button").addEventListener("click", () => { reset(); search.focus(); });
    window.addEventListener("pageshow", applyFilters);
    refreshArchive();
    controls.hidden = false;
  }

  fetch("assets/posts.json", { cache: "no-store" })
    .then(response => response.ok ? response.json() : null)
    .then(posts => {
      if (!Array.isArray(posts) || !posts.length || !posts.every(isPost)) return;
      if (new Set(posts.map(post => post.slug)).size !== posts.length) return;
      posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug, "en"));
      const latest = list.dataset.posts === "latest";
      const focusedHref = list.contains(document.activeElement) ? document.activeElement.getAttribute("href") : null;
      list.replaceChildren(...(latest ? posts.slice(0, 3) : posts).map(post => card(post, latest ? "h3" : "h2")));
      refreshArchive();
      if (focusedHref) Array.from(list.querySelectorAll("a")).find(link => link.getAttribute("href") === focusedHref)?.focus();
      list.dataset.postsReady = "";
    })
    .catch(() => {});
})();
