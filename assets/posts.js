(() => {
  const list = document.querySelector("[data-posts]");
  if (!list) return;

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
    const link = element("a");
    link.href = `article-${post.slug}.html`;
    const date = element("time", post.publishedAt.replaceAll("-", "."));
    date.dateTime = post.publishedAt;
    const metadata = element("p", null, "post-meta");
    metadata.append(element("span", post.category), date, element("span", `約 ${post.readingMinutes} 分鐘`));
    const arrow = element("span", "↗", "post-arrow");
    arrow.setAttribute("aria-hidden", "true");
    link.append(metadata, element(heading, post.title), element("p", post.summary), arrow);
    item.append(link);
    return item;
  }

  fetch("assets/posts.json", { cache: "no-store" })
    .then(response => response.ok ? response.json() : null)
    .then(posts => {
      if (!Array.isArray(posts) || !posts.length || !posts.every(isPost)) return;
      if (new Set(posts.map(post => post.slug)).size !== posts.length) return;
      posts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug, "en"));
      const latest = list.dataset.posts === "latest";
      list.replaceChildren(...(latest ? posts.slice(0, 3) : posts).map(post => card(post, latest ? "h3" : "h2")));
      list.dataset.postsReady = "";
    })
    .catch(() => {});
})();
