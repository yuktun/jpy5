# Listening playback speed, lessons 13–20

## Inventory and behavior

All eight listening pages are `chapter-13-textbook.html` through
`chapter-20-textbook.html`. Their existing replay segment counts are:

| Lesson | Segments |
| --- | ---: |
| 13 | 5 |
| 14 | 8 |
| 15 | 8 |
| 16 | 10 |
| 17 | 9 |
| 18 | 13 |
| 19 | 8 |
| 20 | 7 |
| Total | 68 |

The common speed controller offers exactly 0.25×, 0.5×, 0.75×, 1×, 1.25×,
1.5×, 1.75× and 2×, defaulting to 1×. Reading and listening share the existing
local-storage key `jpy5.reading.playbackRate`. Invalid or unavailable storage
falls back safely; write failures do not interrupt playback. The labelled
native select supports keyboard and touch input. Pitch preservation properties
are enabled where supported. Full-track controls and segment playback use the
same rate, including changes made through native audio controls.

Questions, answers, transcripts, translations, ruby, original recording URLs and
existing segment boundaries are unchanged. Teacher authorization code is
unchanged. External original audio remains online-only and excluded from the
offline package.

## Replay race

The previous player could check a new segment's end against the old media
position while a native seek was pending. A controlled reproduction started
at 100 seconds, requested 10–12 seconds, and paused before that seek finished.
The fix gates stop checks on completion of the latest requested seek, coalesces
overlapping seeks, and ignores earlier play-request rejections. Switching no
longer emits unnecessary pre-play pauses. End deadlines are recalculated from
current media time and playback rate, including mid-play rate changes.

Existing test media doubles now model metadata and seek completion explicitly;
the lesson 18 replay assertion passes. A separate deterministic test covers
delayed/coalesced seeks, stale boundaries/rejections and full-track cancellation.

## Verification

Installed Microsoft Edge with native decoding of the exact original MP3s from
ignored local fixtures; no recordings were added to the project assets.

- `test-listening-audio-ranges.mjs`: all 68 existing segments pass in both
  controlled-media and native-MP3 modes, including replay switching.
- `test-listening-playback-speed.mjs`: 96 native boundary checks pass: eight
  rates on each lesson, natural 0.25× and 2× stops on each lesson, and both
  directions of mid-play changes on each lesson. Maximum measured overshoot
  in the final full run: 0.0170 seconds,
  followed by clamping to the existing end. Also passes 60 rapid switches per
  lesson, repeat, full-track actions, native rate synchronization, preference
  reloads, sharing preferences in both directions with reading, invalid/throwing
  storage, 2× audio-failure recovery, labelled controls and 320/390/768/1440 px.
- Targeted keyboard Home/End selection and dark-mode visibility pass.
- Reading regressions: all 160 sentence ranges, 45 paragraph ranges and 74
  reading speed boundary checks pass, including recovery, navigation, view
  switching, translations/ruby/font/vocabulary and responsive layout.
- Teacher static and synthetic-identity browser tests pass; no real account data
  is involved. Translation/ruby and PWA checks pass.
- Offline manifest and full service-worker tests pass: 244 resources, 73 pages,
  version `8b5ff7f6b2060f54`. Includes download/retry, cold starts, integrity updates,
  removal/re-enable, missing-cache and interrupted-download recovery. External
  recordings/PDFs remain excluded.

The full `test-lesson18-browser.mjs` passes the listening replay/state section,
then fails at line 84 in the unrelated quiz phase:
`assert(!wrong.includes(gqs[0].id))`. The same assertion fails on an isolated
archive of published commit `16d503cf07561871116bfc9ac7d3ff23633838c0`, with only
test media setup/counter adjustments to reach that phase. Production baseline
files were unchanged. The quiz issue and the previously documented lesson 19–20
hub errors are outside this change and remain untouched.

## Limits and evidence

No fresh human listening review or direct iPhone/iPad Safari testing was done.
Natural extreme-rate runs cover one existing segment per lesson; all 68 ranges
were separately tested. Pitch preservation is checked through browser properties.
No new speech alignment or third-party processing is introduced.

Ignored evidence: `tmp/listening-speed/results.json`, `extra-results.json`,
`baseline-quiz-evidence.json`, `phone.png`, `desktop.png`. Deterministic regression:
`scripts/test-audio-segment-player.mjs`. Original recordings remain ignored in
`tmp/listening-audio/`.
