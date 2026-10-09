document.addEventListener("DOMContentLoaded", () => {
  const wordButtons = document.querySelectorAll(".teacher-word-bank [data-word-meaning]");
  if (wordButtons.length) {
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
    popover.addEventListener("pointerenter", cancelDismiss);
    popover.addEventListener("pointerleave", () => { if (interaction === "hover") dismissAfterLeave(); });
    document.addEventListener("pointerdown", event => {
      pointerType = event.pointerType;
      if (!event.target.closest(".teacher-word-bank [data-word-meaning]") && !popover.contains(event.target)) hide();
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
  }
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
