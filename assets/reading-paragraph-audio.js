document.addEventListener("DOMContentLoaded", () => {
  const stage = document.querySelector("#reading-stage");
  const data = window.JPY5_READING;
  if (!stage || !data) return;
  const supported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  let active = null;
  let utterance = null;

  function reset(button) {
    button.textContent = "▶ 播放本段";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `播放第 ${button.dataset.readingPlay} 段日文`);
  }
  function stop() {
    const button = active;
    active = null;
    utterance = null;
    if (button) {
      window.speechSynthesis.cancel();
      reset(button);
    }
  }
  function decorate() {
    if (active && !stage.contains(active)) stop();
    stage.querySelectorAll(".reading-paper [data-paragraph], .translation-list [data-reading-paragraph]").forEach(container => {
      if (container.querySelector("[data-reading-play]")) return;
      const id = container.dataset.paragraph || container.dataset.readingParagraph;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "reading-paragraph-play";
      button.dataset.readingPlay = id;
      button.title = "日語語音朗讀 · 只播放本段";
      reset(button);
      if (!supported) {
        button.disabled = true;
        button.title = "此瀏覽器不支援日語語音朗讀";
      }
      (container.querySelector("p") || container).append(button);
    });
  }
  stage.addEventListener("click", event => {
    const button = event.target.closest("[data-reading-play]");
    if (!button || !supported) return;
    const wasActive = active === button;
    stop();
    if (wasActive) return;
    const paragraph = data.paragraphs.find(p => String(p.id) === button.dataset.readingPlay);
    if (!paragraph) return;
    document.querySelectorAll("audio").forEach(audio => audio.pause());
    const speech = new SpeechSynthesisUtterance(paragraph.jp);
    speech.lang = "ja-JP";
    speech.rate = 0.9;
    const voice = window.speechSynthesis.getVoices().find(candidate => /^ja(?:-|_)/i.test(candidate.lang));
    if (voice) speech.voice = voice;
    active = button;
    utterance = speech;
    button.textContent = "■ 停止播放";
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", `停止播放第 ${paragraph.id} 段`);
    const finish = () => {
      if (utterance !== speech) return;
      active = null;
      utterance = null;
      reset(button);
    };
    speech.onend = finish;
    speech.onerror = event => {
      if (utterance !== speech) return;
      finish();
      if (!["canceled", "interrupted"].includes(event.error)) {
        button.textContent = "↻ 重試播放";
        button.title = "未能朗讀；請確認裝置有日語語音，再重試";
      }
    };
    try {
      window.speechSynthesis.speak(speech);
    } catch {
      finish();
      button.textContent = "↻ 重試播放";
      button.title = "未能朗讀；請確認裝置有日語語音，再重試";
    }
  });
  document.addEventListener("play", event => {
    if (event.target.matches("audio")) stop();
  }, true);
  window.addEventListener("pagehide", stop);
  new MutationObserver(decorate).observe(stage, { childList: true, subtree: true });
  decorate();
});
