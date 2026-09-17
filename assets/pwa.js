(() => {
  if (!("serviceWorker" in navigator)) return;

  const root = location.pathname.startsWith("/jpy5/") ? "/jpy5/" : "/";
  let registration;
  let updatePrompted = false;
  let reloading = false;
  let status;

  function setStatus(text, state) {
    if (!status) {
      status = document.createElement("p");
      status.className = "pwa-status";
      status.setAttribute("role", "status");
      document.body.append(status);
    }
    status.dataset.state = state;
    status.textContent = text;
  }

  function showUpdate(waiting) {
    if (!waiting || updatePrompted) return;
    updatePrompted = true;
    const dialog = document.createElement("section");
    dialog.className = "pwa-update";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "pwa-update-title");
    dialog.innerHTML = `<h2 id="pwa-update-title">發現新版本</h2><p>新版本已準備好，更新後將重新載入 App。你的溫習紀錄會保留。</p><div><button type="button" class="primary-button">立即更新</button><button type="button" class="secondary-button">稍後</button></div>`;
    const [update, later] = dialog.querySelectorAll("button");
    update.addEventListener("click", () => {
      update.disabled = true;
      update.textContent = "正在更新…";
      waiting.postMessage({ type: "JPY5_SKIP_WAITING" });
    });
    later.addEventListener("click", () => dialog.remove());
    document.body.append(dialog);
    update.focus();
  }

  function inspect(reg) {
    if (reg.waiting) showUpdate(reg.waiting);
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloading) {
      reloading = true;
      location.reload();
    }
  });
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data?.type === "JPY5_OFFLINE_READY") setStatus("離線內容已準備好", "ready");
  });

  async function register() {
    try {
      setStatus("正在準備離線內容…", "pending");
      registration = await navigator.serviceWorker.register(`${root}sw.js`, { scope: root, updateViaCache: "none" });
      inspect(registration);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") inspect(registration);
        });
      });
      await navigator.serviceWorker.ready;
      navigator.serviceWorker.controller?.postMessage({ type: "JPY5_CACHE_STATUS" });
      if (!navigator.serviceWorker.controller) setStatus("離線內容已準備好", "ready");
    } catch (error) {
      setStatus("離線內容尚未準備完成；請連線後重新開啟 App。", "error");
    }
  }

  function checkForUpdate() {
    registration?.update().catch(() => {});
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdate(); });
  window.addEventListener("online", checkForUpdate);
  window.addEventListener("DOMContentLoaded", register, { once: true });
})();
