# Reading playback speed, lessons 13–20

The shared original-audio player offers exactly 0.25×, 0.5×, 0.75×,
1×, 1.25×, 1.5×, 1.75× and 2×. The default is 1×. A labelled native
select beside the full-track player controls sentence, paragraph and full-track
playback together, including native full-track rate changes. Supported pitch
preservation properties are enabled. The preference uses local storage key
`jpy5.reading.playbackRate`; invalid/unavailable storage falls back to 1× and
write failures do not interrupt playback.

Sentence and paragraph end checks use current media time. The next deadline is
recalculated when the rate changes, with polling limited to approximately 20 ms
of audio. Existing clip timestamps, recording URLs, lesson text, ruby,
translations, paragraph grouping and teacher authorization code are unchanged.
External recordings remain online-only and are not part of the offline package.

## Verification

Installed Microsoft Edge, automated native media decoding of the exact existing
MP3 recordings served locally with range requests; audio assets remain ignored.

- `node scripts/test-reading-playback-speed.mjs`: all eight rates on each of
  eight lessons (64 native end checks), eight full natural sentence runs at
  all rates, and two mid-sentence changes (0.25→2 and 2→0.25). All 74 passed;
  largest measured pause overshoot 0.0190 seconds,
  followed by clamping to the existing end timestamp. Also covers pitch flags,
  native rate synchronization, replay, 60 rapid switches per lesson, paragraph
  and full-track playback, preference across lessons/reloads, invalid/throwing
  storage, labelled control and 320/390/768/1440 px layouts.
- Targeted lesson 20 rerun additionally verifies failed MP3 requests at 2×,
  cleared highlighting and successful retry retaining 2×.
- `test-reading-sentence-audio.mjs`, `test-lesson14-sentence-audio.mjs`, and
  `test-reading-sentence-remaining.mjs`: all 160 sentence ranges; natural ends,
  replay/switches, error recovery, view/navigation/background cleanup,
  translations/ruby/font/vocabulary controls and responsive/dark layouts pass.
- `test-reading-paragraph-audio.mjs`: all 45 paragraph ranges pass.
- `test-reading-translations.mjs`, `test-teacher-static.mjs`,
  `test-teacher-demo.mjs`, `test-pwa.mjs`, and `test-offline-manifest.mjs` pass.
- `test-offline-mode.mjs`: real service worker, download/retry, all 73 pages
  after offline cold start, update integrity, removal/re-enable, missing-cache
  recovery and interrupted-download recovery pass with the final stable files.
- Final offline inventory: 242 resources, 73 pages, version `1ae21dcf3185df3a`.

The first translation-test launch selected absent bundled Chromium; the installed
Edge rerun passed. An earlier offline run overlapped the final layout edit and
timed out during integrity verification; the stable-file rerun passed fully.

## Limits

Natural runs cover one existing sentence at all eight rates, rather than all 160
sentences at every rate. All 160 ranges were separately regression-tested.
No fresh human listening review or direct iPhone/iPad Safari test was performed.
Pitch preservation is checked through browser properties, not a listening study.
No new transcript alignment is introduced. Existing documented lesson 19–20 hub
errors and lesson 18 listening-test failure remain outside this reading change.

Ignored evidence: `tmp/reading-speed/results.json`, `extra-results.json`,
`phone.png`, `desktop.png`; existing sentence regression evidence remains in its
respective ignored test-output directories.
