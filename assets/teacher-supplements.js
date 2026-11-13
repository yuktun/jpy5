// Bulk controls target only outer question sections, never answer disclosures.
window.JPY5ReviewGroups ||= (() => {
  const initialized = new WeakSet();
  function init() {
    for (const group of document.querySelectorAll('#teacher-exercise, #lesson13-quiz1')) {
      const sections = [...group.querySelectorAll(':scope > details.teacher-exercise')];
      if (!sections.length || initialized.has(group)) continue;
      initialized.add(group);
      const label = group.id === 'teacher-exercise' ? 'Exercise' : 'Quiz①';
      const toolbar = document.createElement('div');
      toolbar.className = 'review-group-controls';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary-button';
      button.dataset.reviewGroupToggle = '';
      button.setAttribute('aria-controls', group.id);
      const note = document.createElement('span');
      note.textContent = '只展開題目；答案需另按顯示。';
      toolbar.append(button, note);
      const header = group.querySelector(':scope > .teacher-supplement-header');
      if (header) header.after(toolbar);
      else group.insertBefore(toolbar, sections[0]);
      function sync() {
        const count = sections.filter(section => section.open).length;
        const allOpen = count === sections.length;
        const action = allOpen ? '全部收起' : '全部展開';
        button.textContent = action;
        button.setAttribute('aria-label', `${label}：${action}`);
        button.setAttribute('aria-expanded', String(allOpen));
        button.dataset.state = allOpen ? 'expanded' : count ? 'mixed' : 'collapsed';
      }
      button.addEventListener('click', () => {
        const expand = !sections.every(section => section.open);
        for (const section of sections) section.open = expand;
        sync();
      });
      // Native details toggle does not bubble; listen on the actual targets.
      for (const section of sections) section.addEventListener('toggle', sync);
      sync();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
  return {init};
})();

document.addEventListener("DOMContentLoaded", () => {
  // Keep the vocabulary page's global flashcard shortcuts from consuming
  // Space/arrow keys used by the adverb section's native buttons and disclosures.
  document.getElementById("teacher-adverbs")?.addEventListener("keydown", event => {
    if (event.target.closest("button,summary,a,input,select,textarea")) event.stopPropagation();
  });
  // Reuse one popover; renderers can initialize newly inserted word banks.
  window.JPY5WordHelp ||= (() => {
    const triggerSelector = ".teacher-word-bank [data-word-meaning], .teacher-word-inline[data-word-meaning]";
    const initialized = new WeakSet();
    const popover = document.createElement("div");
    popover.className = "teacher-word-help-popover";
    popover.id = "teacher-word-help";
    popover.setAttribute("role", "tooltip");
    popover.hidden = true;
    popover.innerHTML = '<span class="teacher-label">本題語境</span><h2 lang="ja"></h2><p class="teacher-word-meaning"></p><p class="teacher-word-usage"></p>';
    document.body.append(popover);
    let trigger = null, dismissTimer = null, pointerType = "", interaction = "";
    const cancelDismiss = () => clearTimeout(dismissTimer);
    function hide() {
      cancelDismiss();
      trigger?.removeAttribute("aria-describedby");
      trigger = null;
      popover.hidden = true;
    }
    function show(button, source) {
      cancelDismiss();
      trigger?.removeAttribute("aria-describedby");
      trigger = button;
      interaction = source;
      const title = popover.querySelector("h2");
      title.textContent = button.dataset.wordTitle || button.textContent;
      title.lang = button.lang || "ja";
      popover.querySelector(".teacher-word-meaning").textContent = button.dataset.wordMeaning;
      popover.querySelector(".teacher-word-usage").textContent = button.dataset.wordUsage;
      button.setAttribute("aria-describedby", popover.id);
      popover.hidden = false;
      const anchor = button.getBoundingClientRect(), bounds = popover.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
      const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
      popover.style.left = `${Math.max(left + 12, Math.min(anchor.left, left + width - bounds.width - 12))}px`;
      const below = anchor.bottom + 8;
      const preferredTop = below + bounds.height <= top + height - 12 ? below : anchor.top - bounds.height - 8;
      popover.style.top = `${Math.max(top + 12, Math.min(preferredTop, top + height - bounds.height - 12))}px`;
    }
    const dismissAfterLeave = () => { cancelDismiss(); dismissTimer = setTimeout(hide, 120); };
    function init(root = document) {
      root.querySelectorAll(triggerSelector).forEach(button => {
        if (initialized.has(button)) return;
        initialized.add(button);
        button.addEventListener("pointerenter", event => {
          if (event.pointerType === "mouse") show(button, "hover");
        });
        button.addEventListener("pointerleave", event => {
          if (trigger === button && interaction === "hover" && event.pointerType === "mouse") dismissAfterLeave();
        });
        button.addEventListener("focus", () => {
          if (pointerType !== "touch" && button.matches(":focus-visible")) show(button, "keyboard");
        });
        button.addEventListener("blur", () => { if (trigger === button && interaction === "keyboard") hide(); });
        button.addEventListener("click", event => {
          if (pointerType === "touch") {
            if (trigger === button && !popover.hidden) hide();
            else show(button, "touch");
          } else show(button, event.detail === 0 ? "keyboard" : "hover");
        });
      });
    }
    popover.addEventListener("pointerenter", cancelDismiss);
    popover.addEventListener("pointerleave", () => { if (interaction === "hover") dismissAfterLeave(); });
    document.addEventListener("pointerdown", event => {
      pointerType = event.pointerType;
      if (!event.target.closest(triggerSelector) && !popover.contains(event.target)) hide();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Tab") pointerType = "";
      if (event.key === "Escape") hide();
    });
    window.addEventListener("scroll", event => {
      if (popover.contains(event.target)) return;
      if (interaction === "hover" && trigger?.matches(":hover")) show(trigger, "hover");
      else hide();
    }, true);
    window.addEventListener("resize", hide);
    return {init};
  })();
  window.JPY5WordHelp.init();
  document.querySelectorAll("[data-answer-toggle]").forEach(button => {
    const answer = document.getElementById(button.getAttribute("aria-controls"));
    if (!answer || !answer.hidden) return;

    const revealLabel = button.textContent.trim();
    button.addEventListener("click", () => {
      const shouldReveal = answer.hidden;
      answer.hidden = !shouldReveal;
      button.setAttribute("aria-expanded", String(shouldReveal));
      button.textContent = shouldReveal
        ? (revealLabel.includes("建議") ? "隱藏建議答案" : "隱藏答案")
        : revealLabel;
    });
  });
});
