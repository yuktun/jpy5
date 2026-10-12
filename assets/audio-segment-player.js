(() => {
  const players = new WeakMap();
  window.JPY5SegmentPlayer = {
    attach(audio) {
      if (players.has(audio)) return players.get(audio);
      let range = null, timer = null, serial = 0;
      function cancel(pause = false) {
        serial++;
        range = null;
        clearInterval(timer);
        timer = null;
        if (pause) audio.pause();
      }
      function seek() {
        if (!range) return;
        try { audio.currentTime = range.start; } catch { /* Metadata will retry the seek. */ }
      }
      function checkEnd() {
        if (!range || audio.currentTime < range.end) return;
        const end = range.end;
        cancel(true);
        audio.currentTime = end;
      }
      const player = {
        cancel,
        play(target) {
          if (!target || !Number.isFinite(target.start) || !Number.isFinite(target.end) || target.end <= target.start) return;
          cancel(true);
          range = { start: target.start, end: target.end };
          const request = serial;
          if (audio.error) audio.load();
          seek();
          timer = setInterval(checkEnd, 25);
          audio.play().catch(() => { if (request === serial) cancel(true); });
        },
        full() {
          cancel(true);
          audio.currentTime = 0;
          audio.play().catch(() => {});
        },
      };
      audio.addEventListener("loadedmetadata", seek);
      audio.addEventListener("timeupdate", checkEnd);
      audio.addEventListener("pause", () => { if (audio.paused) cancel(); });
      audio.addEventListener("ended", () => cancel());
      audio.addEventListener("error", () => cancel());
      // Native controls deliberately leave single-sentence mode, so seeking or
      // resuming the full track cannot be stopped by an earlier sentence.
      audio.addEventListener("pointerdown", () => cancel());
      audio.addEventListener("keydown", () => cancel());
      window.addEventListener("pagehide", () => { if (range) cancel(true); });
      document.addEventListener("visibilitychange", () => { if (document.hidden && range) cancel(true); });
      players.set(audio, player);
      return player;
    },
  };
})();
