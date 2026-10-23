# Lesson 14 sentence audio

The Chinese translation view now has 19 inline Japanese sentence controls in its
original five paragraphs. It reuses the lesson 13 player and stylesheet without
modifying either. Clicking a sentence plays only its range from the existing
original recording; clicking again restarts it. Active highlighting, keyboard
Enter/Space, paragraph playback and whole-track playback share the tested
playback lifecycle. Original text, translations and ruby remain unchanged;
the existing font controls also apply to the translation's Japanese text.

## Recording alignment

Original source: https://ttrw.jp/static/sound/sound202406141718352903.mp3

The existing local MP3 is 176.914 seconds long. The cached word-timestamp JSON
records that same source URL and duration. Complete displayed sentences were
matched to the transcript's actual phrase spans, including multi-phrase long
sentences. No character-count or equal-duration splitting was used.

FFmpeg `silencedetect=noise=-38dB:d=0.3` was run on that exact MP3. Internal starts
are placed 250ms before the corresponding detected speech onset and internal
ends 250ms into the following pause. Existing outer paragraph boundaries are
retained. All 38 selected start/end positions fall within measured silence.
Each clip's full Japanese text is bound to the range and checked against the
current reading data. There are no ambiguous sentence-to-range matches in the
cached transcript; occasional recognition errors such as 次週/自習 do not change
the sentence boundaries.

MP3 SHA-256: `2b478903051d9072a0489a93196897cd7d925858a06fcc3394447b138ddf125c`.
Word-timestamp JSON SHA-256:
`b458663375f7bb703922402b5f96a06f090d881469a741c7df851d7e0e3dd3e4`.

| Paragraph / sentence | Start–end (seconds) |
| --- | --- |
| 1 / 1 | 9.60–15.70 |
| 1 / 2 | 16.47–24.55 |
| 1 / 3 | 25.45–40.44 |
| 2 / 1 | 41.84–46.08 |
| 3 / 1 | 47.14–52.98 |
| 3 / 2 | 53.52–58.37 |
| 3 / 3 | 58.97–62.71 |
| 3 / 4 | 63.26–67.00 |
| 3 / 5 | 67.99–78.56 |
| 3 / 6 | 79.12–84.81 |
| 3 / 7 | 85.63–98.42 |
| 3 / 8 | 99.67–109.30 |
| 3 / 9 | 110.23–113.98 |
| 4 / 1 | 115.30–120.75 |
| 4 / 2 | 121.74–126.17 |
| 4 / 3 | 126.86–134.85 |
| 4 / 4 | 135.80–148.72 |
| 4 / 5 | 149.70–160.44 |
| 5 / 1 | 161.58–171.32 |

These boundaries have **not been audibly verified**. Native browser tests play
and decode the actual local MP3 and check seeking, natural completion and stop
behavior, but are not a human judgment of quiet phonetic onsets/tails. No new ASR
was invoked and no Application Control or other security settings were changed.
No audio or private data was uploaded to an external processor.

## Validation

Use Playwright and Microsoft Edge (`JPY5_BROWSER_CHANNEL=msedge`). Native media
tests use the existing official files under `JPY5_READING_AUDIO_DIR`, or the
default local `tmp/reading-audio/`, named `13.mp3` through `20.mp3`.

- `node scripts/test-lesson14-sentence-audio.mjs`: all 19 starts/ends and original
  duration, natural completion, replay, 60 rapid switches, single active highlight,
  paragraph/sentence/full-track switching, view and navigation cleanup, simulated
  hidden-page cleanup, keyboard controls, exact Japanese/Chinese text, retained
  ruby, font and vocabulary controls, failed-audio text preservation and recovery.
  Responsive widths: 320, 390, 768 and 1440px, with long sentences flowing across
  lines and no horizontal overflow. Screenshots were visually inspected.
- `node scripts/test-reading-sentence-audio.mjs`: lesson 13's 21-sentence regression.
- `node scripts/test-reading-paragraph-audio.mjs`: all 45 original-audio paragraph
  ranges across lessons 13–20.
- `node scripts/test-reading-translations.mjs`: bilingual/furigana and paragraph
  controls across lessons 13–20.
- `node scripts/test-lesson14-reading.mjs`: textbook activities, hidden answers,
  saved drafts, furigana, exam scoring and responsive layouts.
- `node scripts/test-teacher-static.mjs` and `node scripts/test-teacher-demo.mjs`:
  historical content parity and isolated teacher gates. The static allowance
  strips only the new lesson 14 translation guidance/font-size markup before
  comparing the rest of that renderer to the historical baseline. Teacher
  protection logic and content are unchanged.
- `node scripts/generate-offline-manifest.mjs`, `node scripts/test-pwa.mjs`,
  `node scripts/test-offline-manifest.mjs`, `node scripts/test-offline-mode.mjs`:
  73 pages and 236 same-origin resources, portable resource hashes, explicit
  offline download/update, failure recovery, cold starts, removal and progress
  retention. External audio/PDFs remain excluded.

The original audio remains online-only from the app's perspective, with no
guaranteed offline availability and no redistribution. iPhone Safari has not
been directly tested. No live account testing was performed; teacher-gate
tests use synthetic identities and mocked schema responses.

Local screenshots, range results and exact-recording silence evidence are in
ignored `tmp/sentence14-pilot/`. This extension is limited to lesson 14; the shared player and lesson 13
implementation are unchanged.
