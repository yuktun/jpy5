(() => {
  if (window.JPY5TeacherSupplements) return;
  const mounted = new WeakMap();
  function mount(root = document) {
    if (mounted.has(root)) return mounted.get(root);
    const events = new AbortController();
    const listen = (target, type, callback, options = {}) => target.addEventListener(type, callback, {...options, signal: events.signal});
    const scoped = selector => [...root.querySelectorAll(selector)].filter(node => root !== document || !node.closest("[data-teacher-content]"));
    let disposePopover = () => {};
    const dispose = () => { events.abort(); disposePopover(); mounted.delete(root); };
    mounted.set(root, dispose);
    // Keep the vocabulary page's global flashcard shortcuts from consuming
    // Space/arrow keys used by the adverb section's native buttons and disclosures.
    const adverbs = root.id === "teacher-adverbs" ? root : root.querySelector("#teacher-adverbs");
    if (adverbs) listen(adverbs, "keydown", event => {
      if (event.target.closest("button,summary,a,input,select,textarea")) event.stopPropagation();
    });
    const wordButtons = scoped(".teacher-word-bank [data-word-meaning]");
    if (wordButtons.length) {
      const popover = document.createElement("div");
      popover.className = "teacher-word-help-popover";
      popover.id = root === document ? "teacher-word-help" : "teacher-word-help-protected";
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
      disposePopover = () => { hide(); popover.remove(); };
      function show(button, source) {
        if (!button.isConnected || button.closest("details:not([open])")) return;
        cancelDismiss();
        trigger?.removeAttribute("aria-describedby");
        trigger = button;
        interaction = source;
        popover.querySelector("h2").textContent = button.textContent;
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
      wordButtons.forEach(button => {
        listen(button, "pointerenter", event => {
          if (event.pointerType === "mouse") show(button, "hover");
        });
        listen(button, "pointerleave", event => {
          if (trigger === button && interaction === "hover" && event.pointerType === "mouse") dismissAfterLeave();
        });
        listen(button, "focus", () => {
          if (pointerType !== "touch" && button.matches(":focus-visible")) show(button, "keyboard");
        });
        listen(button, "blur", () => { if (trigger === button && interaction === "keyboard") hide(); });
        listen(button, "click", event => {
          if (pointerType === "touch") {
            if (trigger === button && !popover.hidden) hide();
            else show(button, "touch");
          } else show(button, event.detail === 0 ? "keyboard" : "hover");
        });
      });
      listen(popover, "pointerenter", cancelDismiss);
      listen(popover, "pointerleave", () => { if (interaction === "hover") dismissAfterLeave(); });
      listen(document, "pointerdown", event => {
        pointerType = event.pointerType;
        if (!event.target.closest(".teacher-word-bank [data-word-meaning]") && !popover.contains(event.target)) hide();
      });
      listen(document, "keydown", event => {
        if (event.key === "Tab") pointerType = "";
        if (event.key === "Escape") hide();
      }, {capture:true});
      listen(window, "scroll", event => {
        if (popover.contains(event.target)) return;
        if (interaction === "hover" && trigger?.matches(":hover")) show(trigger, "hover");
        else hide();
      }, {capture:true});
      listen(window, "resize", hide);
      listen(document, "visibilitychange", () => { if (document.hidden) hide(); });
      listen(root, "toggle", event => { if (event.target.tagName === "DETAILS" && !event.target.open && event.target.contains(trigger)) hide(); }, {capture:true});
    }
    scoped("[data-answer-toggle]").forEach(button => {
      const answer = [...root.querySelectorAll("[id]")].find(node => node.id === button.getAttribute("aria-controls"));
      if (!answer || !answer.hidden) return;

      const revealLabel = button.textContent.trim();
      listen(button, "click", () => {
        const shouldReveal = answer.hidden;
        answer.hidden = !shouldReveal;
        button.setAttribute("aria-expanded", String(shouldReveal));
        button.textContent = shouldReveal
          ? (revealLabel.includes("建議") ? "隱藏建議答案" : "隱藏答案")
          : revealLabel;
      });
    });
    return dispose;
  }
  window.JPY5TeacherSupplements = {mount};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mount(), {once:true});
  else mount();
})();
