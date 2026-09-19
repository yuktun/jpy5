(() => {
  const section = document.querySelector("[data-install-app-section]");
  const button = document.querySelector("[data-install-app]");
  const feedback = document.querySelector("[data-install-app-feedback]");
  if (!section || !button || !feedback) return;

  let deferredPrompt = null;
  let returnFocus = null;
  let savedScrollY = 0;
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isAppleMobile = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const setFeedback = message => { feedback.textContent = message; };

  if (isStandalone()) {
    section.hidden = true;
    return;
  }

  const dialog = document.createElement("dialog");
  dialog.className = "grammar-extra-dialog install-app-dialog";
  dialog.setAttribute("aria-labelledby", "install-app-dialog-title");
  document.body.append(dialog);

  const lockBackground = () => {
    savedScrollY = window.scrollY;
    document.body.classList.add("grammar-extra-open");
    document.body.style.top = `-${savedScrollY}px`;
  };
  const unlockBackground = () => {
    document.body.classList.remove("grammar-extra-open");
    document.body.style.top = "";
    window.scrollTo(0, savedScrollY);
  };
  const closeDialog = () => {
    if (dialog.open) dialog.close();
  };
  const openInstructions = () => {
    const apple = isAppleMobile();
    dialog.innerHTML = `<div class="grammar-extra-head"><div><span>安裝 JPY5</span><h2 id="install-app-dialog-title">${apple ? "將 JPY5 加入主畫面" : "安裝 JPY5"}</h2></div><button type="button" class="grammar-extra-icon-close" data-install-close aria-label="關閉安裝說明">×</button></div><div class="grammar-extra-body install-app-body">${apple ? `<ol><li>按瀏覽器的「分享」按鈕。</li><li>選擇「加入主畫面」。</li><li>如有「開啟為網頁 App」選項，請啟用。</li><li>按「加入」完成。</li></ol>` : `<p class="grammar-extra-summary">這個瀏覽器未提供即時安裝提示。</p><p>請從瀏覽器選單或網址列尋找「安裝 JPY5」或「加入桌面」；完成後可從桌面或應用程式列表直接開啟。</p>`}</div><div class="grammar-extra-footer"><button type="button" class="secondary-button" data-install-close>明白</button></div>`;
    returnFocus = document.activeElement;
    lockBackground();
    dialog.showModal();
    dialog.querySelector("[data-install-close]").focus();
  };

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    setFeedback("");
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    section.hidden = true;
    closeDialog();
  });

  button.addEventListener("click", async () => {
    if (!deferredPrompt) {
      openInstructions();
      return;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      setFeedback(choice.outcome === "accepted" ? "已開始安裝 JPY5。" : "已取消安裝；你可隨時再按此按鈕。");
    } catch {
      setFeedback("暫時未能顯示安裝提示，請從瀏覽器選單選擇安裝。");
    }
  });
  dialog.addEventListener("click", event => {
    if (event.target === dialog || event.target.closest("[data-install-close]")) closeDialog();
  });
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener("close", () => {
    unlockBackground();
    returnFocus?.focus({ preventScroll: true });
    returnFocus = null;
  });
})();
