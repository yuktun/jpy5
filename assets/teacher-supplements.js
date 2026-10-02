document.addEventListener("DOMContentLoaded", () => {
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
