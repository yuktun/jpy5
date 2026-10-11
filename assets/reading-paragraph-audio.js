document.addEventListener("DOMContentLoaded", () => {
  const stage = document.querySelector("#reading-stage");
  const fullAudio = document.querySelector(".reading-audio-workspace audio");
  const timing = Object.values(window.JPY5_READING_PARAGRAPH_AUDIO || {}).find(item => item.src === fullAudio?.src);
  if (!stage || !fullAudio || !timing) return;
  const audio = document.createElement("audio");
  audio.src = timing.src;
  audio.preload = "metadata";
  audio.hidden = true;
  audio.dataset.readingParagraphAudio = "";
  fullAudio.after(audio);
  let active = null;
  let range = null;
  let serial = 0;
  let timer = null;

  function reset(button) {
    button.textContent = "▶ 播放本段";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `播放第 ${button.dataset.readingPlay} 段日文原聲`);
  }
  function stop() {
    serial++;
    range = null;
    clearInterval(timer);
    timer = null;
    const button = active;
    active = null;
    audio.pause();
    if (button) reset(button);
  }
  function checkEnd() {
    if (range && audio.currentTime >= range.end) {
      const end = range.end;
      stop();
      audio.currentTime = end;
    }
  }
  function seekToStart() {
    if (!range) return;
    try { audio.currentTime = range.start; } catch { /* Retry once metadata arrives. */ }
  }
  function showError() {
    const button = active;
    stop();
    if (button) {
      button.textContent = "↻ 重試播放";
      button.title = "原聲音訊暫未能載入，請重試";
    }
  }
  function decorate() {
    if (active && !stage.contains(active)) stop();
    stage.querySelectorAll(".reading-paper [data-paragraph], .translation-list [data-reading-paragraph]").forEach(container => {
      if (container.querySelector("[data-reading-play]")) return;
      const id = container.dataset.paragraph || container.dataset.readingParagraph;
      if (!timing.paragraphs.some(p => String(p.id) === id)) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "reading-paragraph-play";
      button.dataset.readingPlay = id;
      button.title = "課本原聲音軌 · 只播放本段";
      reset(button);
      (container.querySelector("p") || container).append(button);
    });
  }
  stage.addEventListener("click", event => {
    const button = event.target.closest("[data-reading-play]");
    if (!button) return;
    const wasActive = active === button;
    stop();
    if (wasActive) return;
    range = timing.paragraphs.find(p => String(p.id) === button.dataset.readingPlay);
    if (!range) return;
    document.querySelectorAll("audio").forEach(other => { if (other !== audio) other.pause(); });
    active = button;
    const request = serial;
    button.title = "課本原聲音軌 · 只播放本段";
    button.textContent = "■ 停止播放";
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", `停止播放第 ${range.id} 段`);
    if (audio.error) audio.load();
    seekToStart();
    timer = setInterval(checkEnd, 40);
    audio.play().catch(() => { if (request === serial) showError(); });
  });
  audio.addEventListener("loadedmetadata", seekToStart);
  audio.addEventListener("timeupdate", checkEnd);
  audio.addEventListener("ended", stop);
  audio.addEventListener("error", showError);
  document.addEventListener("play", event => {
    if (event.target.matches("audio") && event.target !== audio) stop();
  }, true);
  window.addEventListener("pagehide", stop);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  new MutationObserver(decorate).observe(stage, { childList: true, subtree: true });
  decorate();
});
