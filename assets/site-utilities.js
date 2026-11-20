(() => {
  const utilities = document.querySelector(".site-utilities");
  if (!utilities) return;
  const summary = utilities.querySelector("summary");

  function dismissOutside(event) {
    if (event.button === 0 && utilities.open && !utilities.contains(event.target) && !document.querySelector("dialog[open]")) {
      utilities.open = false;
    }
  }

  // Safari may omit click on blank space. Scrolling cancels the touch pointer.
  document.addEventListener("pointerup", event => {
    if (event.pointerType === "touch" && event.isPrimary) dismissOutside(event);
  }, { capture: true });
  // Capture before a modal can close and restore focus in its own handler.
  document.addEventListener("click", dismissOutside, { capture: true });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || !utilities.open || document.querySelector("dialog[open]")) return;
    event.preventDefault();
    utilities.open = false;
    summary.focus();
  });
})();
