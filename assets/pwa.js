(() => {
  if (!("serviceWorker" in navigator)) return;

  const root = location.pathname.startsWith("/jpy5/") ? "/jpy5/" : "/";
  let registration;
  let updatePrompted = false;
  let reloading = false;
  let status;

  const statusDetails = {
    ready: { label: "Offline", description: "離線內容已準備好" },
    offline: { label: "Offline", description: "目前離線；可使用已準備好的離線內容" },
    pending: { label: "準備中", description: "正在準備離線內容" },
    error: { label: "未完成", description: "離線內容尚未準備完成" }
  };

  function setStatus(state) {
    const detail = statusDetails[state];
    if (!status) {
      status = document.createElement("span");
      status.className = "pwa-status";
      status.setAttribute("role", "status");
      status.innerHTML = '<span class="pwa-status-dot" aria-hidden="true"></span><span class="pwa-status-label"></span>';
      const header = document.querySelector(".site-header");
      const brand = header?.querySelector(".brand");
      if (header && brand) brand.insertAdjacentElement("afterend", status);
      else document.body.append(status);
    }
    status.dataset.state = state;
    status.setAttribute("aria-label", detail.description);
    status.querySelector(".pwa-status-label").textContent = detail.label;
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
    if (event.data?.type === "JPY5_OFFLINE_READY") setStatus(navigator.onLine ? "ready" : "offline");
  });

  async function register() {
    try {
      setStatus(navigator.onLine ? "pending" : "offline");
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
      if (!navigator.serviceWorker.controller) setStatus(navigator.onLine ? "ready" : "offline");
    } catch (error) {
      setStatus(navigator.onLine ? "error" : "offline");
    }
  }

  function checkForUpdate() {
    registration?.update().catch(() => {});
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkForUpdate(); });
  window.addEventListener("online", () => { setStatus("pending"); checkForUpdate(); });
  window.addEventListener("offline", () => setStatus("offline"));
  window.addEventListener("DOMContentLoaded", register, { once: true });
})();
