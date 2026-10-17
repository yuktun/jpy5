(() => {
  const script = document.currentScript;
  const root = new URL("../", script.src).pathname;
  let registration;
  let state = {};
  let initialVersion;
  let status, dialog, details, progress, download, remove, check, reload;

  const send = type => (navigator.serviceWorker?.controller || registration?.active)?.postMessage({ type });
  const refresh = () => { activateWaiting(); send("JPY5_CACHE_STATUS"); };
  // A waiting metadata-only worker may survive a browser restart. Activating it
  // never downloads or replaces the saved package and never reloads a lesson.
  const activateWaiting = () => registration?.waiting?.postMessage({ type: "JPY5_ACTIVATE" });
  const errors = {
    quota: "儲存空間不足，未能完成下載。請騰出空間後重試。",
    changed: "網站內容已更新，下載未完成。請檢查更新後重試。",
    incomplete: "離線內容不完整或下載曾中斷，請連線後重新下載。",
    download: "下載未完成。請檢查網絡及儲存空間，保持此頁開啟後重試。",
    remove: "未能完全移除離線內容，請重試。"
  };

  function render() {
    const online = navigator.onLine;
    const busy = state.downloading;
    const available = !!registration?.active;
    status.dataset.state = busy ? "pending" : state.error ? "error" : state.ready ? "ready" : "online";
    const label = busy ? `下載中 ${state.completed}/${state.total}` : state.ready ? (state.updateAvailable ? "離線內容有更新" : "離線已就緒") : "離線設定";
    status.textContent = label;
    let message = state.ready ? "已完整下載，可離線開啟及使用本站學習內容。" : "預設使用網上模式，不會自動下載離線包。";
    if (busy) message = `正在下載 ${state.completed} / ${state.total} 個檔案。請保持此頁開啟。`;
    else if (state.error) message = `${errors[state.error] || "此瀏覽器暫時無法使用離線儲存。"}${state.ready ? " 原有完整離線版本仍可使用。" : " 尚未準備好離線使用。"}`;
    else if (state.updateAvailable) message += " 有新版本可供下載；目前保留已下載版本。";
    if (!online) message += " 目前沒有網絡。";
    details.textContent = message;
    progress.hidden = !busy;
    progress.max = state.total || 1;
    progress.value = state.completed || 0;
    download.textContent = state.error ? "重新下載" : state.updateAvailable ? "下載離線更新" : "下載離線內容";
    download.disabled = !available || !online || busy || state.unavailable;
    download.hidden = !!state.ready && !state.updateAvailable && !state.error;
    remove.disabled = !available;
    remove.textContent = busy ? "取消並移除離線內容" : "移除離線內容";
    check.disabled = !available || !online || busy;
    reload.hidden = !(state.ready && initialVersion && state.version !== initialVersion);
    dialog.querySelector("[data-offline-size]").textContent = state.bytes ? `約 ${(state.bytes / 1024 / 1024).toFixed(1)} MB（${state.total} 個檔案）。` : "";
  }

  function markOnlineLinks() {
    for (const link of document.querySelectorAll("a[href]")) {
      const url = new URL(link.href, location.href);
      if (!/^https?:$/.test(url.protocol)) continue;
      if (url.origin === location.origin && url.pathname.startsWith(root) && !/\.pdf$/i.test(decodeURIComponent(url.pathname))) continue;
      if (link.querySelector(".internet-required")) continue;
      const note = document.createElement("small");
      note.className = "internet-required";
      note.textContent = "（需網絡）";
      link.append(note);
    }
    for (const audio of document.querySelectorAll("audio[src],audio source[src]")) {
      if (new URL(audio.src, location.href).origin === location.origin) continue;
      const player = audio.closest("audio");
      if (player.nextElementSibling?.classList.contains("audio-internet-required")) continue;
      const note = document.createElement("small");
      note.className = "internet-required audio-internet-required";
      note.textContent = "音訊需網絡，不包括在離線內容內。";
      player.insertAdjacentElement("afterend", note);
    }
  }

  async function start() {
    status = document.createElement("button");
    status.type = "button";
    status.className = "pwa-status";
    status.setAttribute("aria-haspopup", "dialog");
    const brand = document.querySelector(".site-header .brand");
    if (brand) brand.insertAdjacentElement("afterend", status);
    else document.body.prepend(status);
    dialog = document.createElement("dialog");
    dialog.className = "pwa-offline-dialog";
    dialog.setAttribute("aria-labelledby", "offline-title");
    dialog.innerHTML = `<h2 id="offline-title">離線使用</h2>
      <p>自行選擇下載本站頁面、課文、詞彙、練習及所需程式。<span data-offline-size></span></p>
      <p><strong>所有 PDF、外部連結、外部音訊及 Google 同步均需網絡，不包括在離線包內。</strong>發音需裝置已安裝日語語音。</p>
      <p data-offline-status role="status" aria-live="polite"></p>
      <progress aria-label="離線下載進度" hidden></progress>
      <p>iPhone／Safari 請保持此頁開啟直到完成。瀏覽器可能回收儲存空間；使用前請確認「離線已就緒」。</p>
      <p>移除只會刪除本站離線內容，保留學習進度、登入資料及其他網站資料。</p>
      <div class="pwa-offline-actions">
        <button type="button" data-offline-download class="primary-button">下載離線內容</button>
        <button type="button" data-offline-check class="secondary-button">檢查更新</button>
        <button type="button" data-offline-remove class="secondary-button">移除離線內容</button>
        <button type="button" data-offline-reload class="primary-button" hidden>重新載入新版本</button>
        <button type="button" data-offline-close class="secondary-button">關閉</button>
      </div>`;
    document.body.append(dialog);
    details = dialog.querySelector("[data-offline-status]");
    progress = dialog.querySelector("progress");
    download = dialog.querySelector("[data-offline-download]");
    remove = dialog.querySelector("[data-offline-remove]");
    check = dialog.querySelector("[data-offline-check]");
    reload = dialog.querySelector("[data-offline-reload]");
    status.addEventListener("click", () => { refresh(); dialog.showModal(); });
    dialog.querySelector("[data-offline-close]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => status.focus({ preventScroll: true }));
    download.addEventListener("click", () => {
      state = { ...state, downloading: true, completed: 0, error: null };
      render();
      send("JPY5_DOWNLOAD");
    });
    remove.addEventListener("click", () => { remove.disabled = true; send("JPY5_REMOVE"); });
    check.addEventListener("click", async () => {
      check.disabled = true;
      try { await registration.update(); activateWaiting(); refresh(); }
      catch { details.textContent = "無法檢查更新，請連線後重試。"; }
      finally { check.disabled = !navigator.onLine; }
    });
    reload.addEventListener("click", () => location.reload());
    render();
    markOnlineLinks();
    let scheduled = false;
    new MutationObserver(() => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => { scheduled = false; markOnlineLinks(); });
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "src"] });
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      state = { error: "unsupported", unavailable: true }; render(); return;
    }
    navigator.serviceWorker.addEventListener("message", event => {
      if (event.data?.type === "JPY5_OFFLINE_STATUS") {
        if (initialVersion === undefined) initialVersion = event.data.version || event.data.availableVersion;
        state = event.data; render();
      } else if (event.data?.type === "JPY5_OFFLINE_UNAVAILABLE") {
        state = { error: "unsupported", unavailable: true }; render();
      }
    });
    navigator.serviceWorker.addEventListener("controllerchange", refresh);
    try {
      registration = await navigator.serviceWorker.getRegistration(root);
      if (registration?.scope !== new URL(root, location.href).href) registration = null;
      if (!registration) registration = await navigator.serviceWorker.register(`${root}sw.js`, { scope: root, updateViaCache: "none" });
      const watchInstalling = () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => { if (worker.state === "installed") activateWaiting(); });
      };
      registration.addEventListener("updatefound", watchInstalling);
      watchInstalling();
      activateWaiting();
      await navigator.serviceWorker.ready;
      refresh();
      if (navigator.onLine) registration.update().catch(() => {});
    } catch { state = { error: "unsupported", unavailable: true }; render(); }
    const checkOnline = () => { refresh(); if (navigator.onLine && !state.downloading) registration?.update().catch(() => {}); };
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkOnline(); });
    window.addEventListener("online", checkOnline);
    window.addEventListener("offline", () => { render(); refresh(); });
    // Also recovers the UI when a mobile browser kills a download worker.
    setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 10000);
  }
  window.addEventListener("DOMContentLoaded", start, { once: true });
})();
