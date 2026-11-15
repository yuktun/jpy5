(() => {
  const utilities = document.querySelector(".site-utilities");
  if (!utilities) return;
  const summary = utilities.querySelector("summary");

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !utilities.open || document.querySelector("dialog[open]")) return;
    event.preventDefault();
    utilities.open = false;
    summary.focus();
  });
})();
