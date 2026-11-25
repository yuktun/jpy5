// Local deterministic media model for the lesson interaction suites. The
// native playback suites separately exercise the actual MP3 files and seeks.
export function mockSegmentMedia() {
  const prototype = HTMLMediaElement.prototype;
  Object.defineProperties(prototype, {
    readyState: {get() {return 4;}},
    seeking: {get() {return false;}},
    paused: {get() {return this.dataset.playing !== 'yes';}},
    currentTime: {
      get() {return Number(this.dataset.time || 0);},
      set(value) {
        this.dataset.time = String(value);
        queueMicrotask(() => this.dispatchEvent(new Event('seeked')));
      }
    }
  });
  prototype.play = function() {
    this.dataset.playCount = String(Number(this.dataset.playCount || 0) + 1);
    this.dataset.playing = 'yes';
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  };
  prototype.pause = function() {
    this.dataset.pauseCount = String(Number(this.dataset.pauseCount || 0) + 1);
    this.dataset.playing = 'no';
    this.dispatchEvent(new Event('pause'));
  };
}
