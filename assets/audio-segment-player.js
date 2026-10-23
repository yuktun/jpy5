(() => {
  const players = new WeakMap();
  window.JPY5SegmentPlayer = {
    attach(audio) {
      if (players.has(audio)) return players.get(audio);
      window.JPY5PlaybackSpeed.attach([audio]);
      let range = null, timer = null, serial = 0, pendingStart = false;
      function cancel(pause = false) {
        serial++;
        range = null;
        pendingStart = false;
        clearTimeout(timer);
        timer = null;
        if (pause) audio.pause();
      }
      function scheduleEnd() {
        clearTimeout(timer);
        if (!range) return;
        const rate = audio.playbackRate || 1;
        const remaining = pendingStart || audio.seeking ? Infinity : (range.end - audio.currentTime) * 1000 / rate;
        timer = setTimeout(checkEnd, Math.max(4, Math.min(20 / rate, remaining)));
      }
      function startPlayback() {
        const request = serial;
        audio.play().catch(() => { if (request === serial) cancel(true); });
      }
      function seek() {
        if (!range || !pendingStart || audio.seeking) return;
        if (audio.readyState < 1) { startPlayback(); return; }
        try { audio.currentTime = range.start; } catch { /* Retry when metadata arrives. */ }
        startPlayback();
      }
      function checkEnd() {
        // A previous position can exceed the new end until the native seek
        // completes. Only the latest confirmed seek may reach its stop boundary.
        if (range && !pendingStart && !audio.seeking && audio.currentTime >= range.end) {
          const end = range.end;
          cancel(true);
          audio.currentTime = end;
        }
        scheduleEnd();
      }
      const player = {
        cancel,
        play(target) {
          if (!target || !Number.isFinite(target.start) || !Number.isFinite(target.end) || target.end <= target.start) return;
          // Keep the active media alive when switching; pausing produces stale
          // pause events and needlessly interrupts the replacement seek.
          cancel();
          range = { start: target.start, end: target.end };
          pendingStart = true;
          if (audio.error) audio.load();
          seek();
          scheduleEnd();
        },
        full() {
          cancel();
          audio.currentTime = 0;
          startPlayback();
        },
      };
      audio.addEventListener("loadedmetadata", seek);
      audio.addEventListener("seeked", () => {
        if (!range || !pendingStart) return;
        if (Math.abs(audio.currentTime - range.start) > 0.05) { seek(); return; }
        pendingStart = false;
        if (audio.paused) startPlayback();
        checkEnd();
      });
      audio.addEventListener("ratechange", checkEnd);
      audio.addEventListener("timeupdate", checkEnd);
      audio.addEventListener("pause", () => { if (audio.paused && !pendingStart) cancel(); });
      audio.addEventListener("ended", () => cancel());
      audio.addEventListener("error", () => cancel());
      // Native controls deliberately leave segment mode. The separate speed
      // selector keeps segment mode and reschedules its media-time deadline.
      audio.addEventListener("pointerdown", () => cancel());
      audio.addEventListener("keydown", () => cancel());
      window.addEventListener("pagehide", () => { if (range) cancel(true); });
      document.addEventListener("visibilitychange", () => { if (document.hidden && range) cancel(true); });
      players.set(audio, player);
      return player;
    },
  };
})();
