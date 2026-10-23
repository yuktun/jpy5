(() => {
  const controls = new WeakMap();
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const speedKey = "jpy5.reading.playbackRate";
  const validSpeed = value => speeds.includes(Number(value)) ? Number(value) : 1;
  window.JPY5PlaybackSpeed = {
    attach(media) {
      const fullAudio = media[0];
      if (controls.has(fullAudio)) return controls.get(fullAudio);
      let speed = 1;
      try { speed = validSpeed(localStorage.getItem(speedKey)); } catch { /* Storage is optional. */ }
      const label = document.createElement("label");
      label.className = "playback-speed-control";
      label.append("播放速度 ");
      const select = document.createElement("select");
      select.dataset.playbackSpeed = "";
      if (fullAudio.closest(".reading-audio-workspace")) select.dataset.readingPlaybackSpeed = "";
      for (const value of speeds) {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = `${value}×`;
        select.append(option);
      }
      label.append(select);
      const wrapper = document.createElement("div");
      wrapper.className = "audio-speed-controls";
      fullAudio.before(wrapper);
      wrapper.append(...media, label);
      function apply(value, remember = false) {
        speed = validSpeed(value);
        select.value = String(speed);
        for (const element of media) {
          element.defaultPlaybackRate = speed;
          if (element.playbackRate !== speed) element.playbackRate = speed;
          for (const property of ["preservesPitch", "webkitPreservesPitch", "mozPreservesPitch"]) {
            if (property in element) element[property] = true;
          }
        }
        if (remember) {
          try { localStorage.setItem(speedKey, String(speed)); } catch { /* Playback still works. */ }
        }
      }
      apply(speed);
      select.addEventListener("change", () => apply(select.value, true));
      for (const element of media) element.addEventListener("ratechange", () => {
        if (element.playbackRate !== speed) apply(element.playbackRate, true);
      });
      controls.set(fullAudio, select);
      return select;
    },
  };
})();
