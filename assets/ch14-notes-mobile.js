// Shared notes enhancement; retain the pilot's classes and Lesson 14 anchor IDs.
(() => {
  const lesson = location.pathname.match(/(?:^|\/)chapter-([1-9]\d*)-notes\.html$/)?.[1];
  if (!lesson) return;
  const prefix = `ch${lesson}`;
  const patterns = window.JPY5_DATA?.patterns;
  const cards = [...document.querySelectorAll('.grammar-grid[data-group] > .note-card')];
  if (!Array.isArray(patterns) || !patterns.length || cards.length !== patterns.length ||
      patterns.some(pattern => !pattern || typeof pattern.id !== 'string' || !/^[\w-]+$/.test(pattern.id) ||
        typeof pattern.title !== 'string' || !Array.isArray(pattern.examples)) ||
      new Set(patterns.map(pattern => pattern.id)).size !== patterns.length) return;
  const groups = [...document.querySelectorAll('.grammar-grid[data-group]')];
  const ordered = groups.flatMap(grid => patterns.filter(pattern => pattern.group === grid.dataset.group));
  if (ordered.length !== patterns.length || ordered.some((pattern, index) => {
    const card = cards[index], lists = card.querySelectorAll(':scope > .examples-list');
    return pattern !== patterns[index] || !card.querySelector(':scope > h3') ||
      card.parentElement.dataset.group !== pattern.group || lists.length !== 1 ||
      lists[0].children.length !== pattern.examples.length ||
      [...lists[0].children].some(node => !node.matches('.example')) ||
      document.getElementById(`${prefix}-grammar-${pattern.id}`) ||
      document.getElementById(`${prefix}-examples-${pattern.id}`);
  })) return;
  if (document.getElementById(`${prefix}-grammar-toc`) || document.getElementById(`${prefix}-toc-title`)) return;

  const mobile = matchMedia('(max-width: 680px)');
  document.body.classList.add('ch14-notes-mobile');
  const headings = cards.map((card, index) => {
    const pattern = patterns[index], heading = card.querySelector(':scope > h3');
    heading.id = `${prefix}-grammar-${pattern.id}`;
    heading.tabIndex = -1;
    card.dataset.grammarId = pattern.id;
    const list = card.querySelector(':scope > .examples-list');
    const remaining = [...list.children].slice(2);
    if (remaining.length) {
      const rest = document.createElement('div');
      rest.className = 'ch14-examples-rest';
      rest.id = `${prefix}-examples-${pattern.id}`;
      rest.append(...remaining);
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'ch14-examples-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', rest.id);
      toggle.textContent = `顯示其餘 ${remaining.length} 句`;
      toggle.addEventListener('click', () => {
        const top = toggle.getBoundingClientRect().top;
        const expanded = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        toggle.textContent = expanded ? `收起其餘 ${remaining.length} 句` : `顯示其餘 ${remaining.length} 句`;
        rest.classList.toggle('is-expanded', expanded);
        // Keep the control under the finger, including when scroll anchoring runs.
        scrollInstantly(scrollY + toggle.getBoundingClientRect().top - top);
      });
      list.append(toggle, rest);
    }
    return heading;
  });

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'ch14-toc-trigger';
  trigger.textContent = '目錄';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', `${prefix}-grammar-toc`);
  trigger.setAttribute('aria-expanded', 'false');
  const sheet = document.createElement('dialog');
  sheet.id = `${prefix}-grammar-toc`;
  sheet.className = 'ch14-toc-sheet';
  sheet.setAttribute('aria-labelledby', `${prefix}-toc-title`);
  sheet.innerHTML = `<div class="ch14-toc-head"><h2 id="${prefix}-toc-title">文法目錄</h2><button type="button" class="ch14-toc-close" aria-label="關閉文法目錄">×</button></div><nav class="ch14-toc-list" aria-label="文法句型"></nav>`;
  const list = sheet.querySelector('nav');
  const links = patterns.map((pattern, index) => {
    const link = document.createElement('a');
    link.href = `#${headings[index].id}`;
    const number = document.createElement('span');
    number.className = 'ch14-toc-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const title = document.createElement('span');
    title.lang = 'ja';
    title.textContent = pattern.title;
    const current = document.createElement('span');
    current.className = 'ch14-toc-current';
    current.textContent = '目前';
    link.append(number, title, current);
    link.addEventListener('click', event => {
      event.preventDefault();
      closeSheet(false);
      headings[index].focus({ preventScroll: true });
      scrollInstantly(scrollY + headings[index].getBoundingClientRect().top - topClearance() - 16);
      updateCurrent();
    });
    list.append(link);
    return link;
  });
  document.body.append(trigger, sheet);
  let savedY = 0;
  function scrollInstantly(top) {
    const root = document.documentElement, previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top, left: 0, behavior: 'auto' });
    root.style.scrollBehavior = previous;
  }
  function topClearance() {
    let bottom = 0;
    for (const element of document.querySelectorAll('.site-header, .lesson-quick-switcher')) {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      if (['fixed', 'sticky'].includes(style.position) && rect.top <= parseFloat(style.top || 0) + 1) bottom = Math.max(bottom, rect.bottom);
    }
    return bottom;
  }
  function updateCurrent() {
    const threshold = topClearance() + 24;
    let current = 0;
    headings.forEach((heading, index) => { if (heading.getBoundingClientRect().top <= threshold) current = index; });
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) current = headings.length - 1;
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function closeSheet(restoreFocus = true) {
    if (!sheet.open) return;
    sheet.close();
    document.body.classList.remove('ch14-toc-open');
    document.body.style.top = '';
    scrollInstantly(savedY);
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus && mobile.matches) trigger.focus({ preventScroll: true });
  }
  trigger.addEventListener('click', () => {
    if (!mobile.matches) return;
    updateCurrent();
    savedY = scrollY;
    document.body.style.top = `-${savedY}px`;
    document.body.classList.add('ch14-toc-open');
    sheet.showModal();
    trigger.setAttribute('aria-expanded', 'true');
    sheet.querySelector('.ch14-toc-close').focus({ preventScroll: true });
    // Always expose the first patterns for a two-tap return from the footer.
    list.scrollTop = 0;
  });
  sheet.querySelector('.ch14-toc-close').addEventListener('click', () => closeSheet());
  sheet.addEventListener('cancel', event => { event.preventDefault(); closeSheet(); });
  sheet.addEventListener('click', event => {
    const rect = sheet.getBoundingClientRect();
    if (event.target === sheet && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeSheet();
  });
  mobile.addEventListener('change', () => { if (!mobile.matches) closeSheet(false); });
  let queued = false;
  function queueCurrent() {
    if (queued || sheet.open || !mobile.matches) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; updateCurrent(); });
  }
  addEventListener('scroll', queueCurrent, { passive: true });
  addEventListener('resize', queueCurrent);
  updateCurrent();
})();
