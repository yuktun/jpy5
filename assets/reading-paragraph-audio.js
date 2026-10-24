document.addEventListener("DOMContentLoaded", () => {
  const stage = document.querySelector("#reading-stage");
  const fullAudio = document.querySelector(".reading-audio-workspace audio");
  const timing = Object.values(window.JPY5_READING_PARAGRAPH_AUDIO || {}).find(item => new URL(item.src, document.baseURI).href === fullAudio?.src);
  if (!stage || !fullAudio || !timing) return;
  const audio = document.createElement("audio");
  audio.src = timing.src;
  audio.preload = "metadata";
  audio.hidden = true;
  audio.dataset.readingParagraphAudio = "";
  fullAudio.after(audio);
  window.JPY5PlaybackSpeed.attach([fullAudio, audio]);
  let active = null;
  let range = null;
  let serial = 0;
  let timer = null;
  let pendingStart = false;
  const sentenceTiming = window.JPY5_READING_SENTENCE_AUDIO;
  const sentences = sentenceTiming?.src === timing.src ? sentenceTiming.sentences : [];

  function reset(button) {
    if (button.hasAttribute("data-reading-sentence")) {
      button.setAttribute("aria-pressed", "false");
      return;
    }
    button.textContent = "▶ 播放本段";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `播放第 ${button.dataset.readingPlay} 段日文原聲`);
  }
  function stop() {
    serial++;
    range = null;
    pendingStart = false;
    clearTimeout(timer);
    timer = null;
    const button = active;
    active = null;
    audio.pause();
    if (button) reset(button);
  }
  function checkEnd() {
    if (range && !pendingStart && !audio.seeking && audio.currentTime >= range.end) {
      const end = range.end;
      stop();
      audio.currentTime = end;
    }
    scheduleEnd();
  }
  function scheduleEnd() {
    clearTimeout(timer);
    if (!range) return;
    // Deadlines are calculated from media time, never from a fixed clip duration.
    // A speed change reschedules immediately; cap polling to 20 ms of audio.
    const rate = audio.playbackRate || 1;
    const remaining = pendingStart || audio.seeking ? Infinity : (range.end - audio.currentTime) * 1000 / rate;
    timer = setTimeout(checkEnd, Math.max(4, Math.min(20 / rate, remaining)));
  }
  function seekToStart() {
    if (!range || !pendingStart || audio.seeking) return;
    // Seeking before metadata after a failed load can stall at time zero.
    // Start the native load in the user gesture; loadedmetadata will seek
    // before playback can advance, using the most recent requested range.
    if (audio.readyState < 1) {
      playCurrent();
      return;
    }
    try { audio.currentTime = range.start; } catch { /* Retry once metadata arrives. */ }
    playCurrent();
  }
  function playCurrent() {
    const request = serial;
    audio.play().catch(() => { if (request === serial) showError(); });
  }
  function showError() {
    const button = active;
    stop();
    if (button) {
      if (button.hasAttribute("data-reading-sentence")) {
        button.title = "錄音暫時未能播放，請再按一次重試（需要網絡）";
        return;
      }
      button.textContent = "↻ 重試播放";
      button.title = "原聲音訊暫未能載入，請重試";
    }
  }
  // Keep existing ruby nodes intact, including occurrence-based overrides.
  function decorateSentences() {
    stage.querySelectorAll(".translation-original").forEach(original => {
      if (original.querySelector("[data-reading-sentence]")) return;
      const id = original.closest("[data-reading-paragraph]")?.dataset.readingParagraph;
      const clips = sentences.filter(item => String(item.paragraph) === id);
      if (!clips.length) return;
      const baseText = node => {
        const clone = node.cloneNode(true);
        clone.querySelectorAll?.("rt,rp").forEach(rt => rt.remove());
        return clone.textContent;
      };
      if (baseText(original) !== clips.map(item => item.text).join("")) return;
      const fragment = document.createDocumentFragment();
      for (const clip of clips) {
        // Native buttons form atomic inline boxes in browsers. A keyboard-
        // accessible span lets a long sentence flow across paragraph lines.
        const button = document.createElement("span");
        button.setAttribute("role", "button");
        button.tabIndex = 0;
        button.className = "reading-sentence-play";
        button.dataset.readingSentence = clip.id;
        button.title = "播放這一句（再按可重播）";
        reset(button);
        let remaining = clip.text.length;
        while (remaining > 0 && original.firstChild) {
          const node = original.firstChild;
          const length = baseText(node).length;
          if (length > remaining) node.splitText(remaining);
          button.append(node);
          remaining -= Math.min(length, remaining);
        }
        fragment.append(button);
      }
      original.append(fragment);
    });
  }
  function decorate() {
    if (active && !stage.contains(active)) stop();
    decorateSentences();
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
    const button = event.target.closest("[data-reading-play], [data-reading-sentence]");
    if (!button) return;
    const isSentence = button.hasAttribute("data-reading-sentence");
    const wasActive = active === button;
    stop();
    if (wasActive && !isSentence) return;
    range = isSentence
      ? sentences.find(item => item.id === button.dataset.readingSentence)
      : timing.paragraphs.find(p => String(p.id) === button.dataset.readingPlay);
    if (!range) return;
    document.querySelectorAll("audio").forEach(other => { if (other !== audio) other.pause(); });
    active = button;
    button.title = isSentence ? "播放這一句（再按可重播）" : "課本原聲音軌 · 只播放本段";
    if (!isSentence) button.textContent = "■ 停止播放";
    button.setAttribute("aria-pressed", "true");
    if (!isSentence) button.setAttribute("aria-label", `停止播放第 ${range.id} 段`);
    if (audio.error) audio.load();
    pendingStart = true;
    seekToStart();
    scheduleEnd();
  });
  stage.addEventListener("keydown", event => {
    const sentence = event.target.closest("[data-reading-sentence]");
    if (sentence && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      sentence.click();
    }
  });
  audio.addEventListener("loadedmetadata", seekToStart);
  audio.addEventListener("seeked", () => {
    if (!range || !pendingStart) return;
    // Coalesce clicks during a native seek; overlapping seeks can leave media
    // permanently seeking. Only the most recent sentence is allowed to start.
    if (Math.abs(audio.currentTime - range.start) > 0.05) {
      seekToStart();
      return;
    }
    pendingStart = false;
    if (audio.paused) playCurrent();
  });
  audio.addEventListener("ratechange", checkEnd);
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
