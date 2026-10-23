# Sentence audio: remaining reading lessons 15–20

The actual reading inventory is lessons 13–20. This prepared batch completes the
remaining six lessons with **all 120 written sentences enabled**, preserving all
35 existing paragraphs. Lessons 13–14 keep their deployed behavior.

| Lesson | Paragraphs retained | Sentences enabled |
| --- | ---: | ---: |
| 15 | 6 | 16 |
| 16 | 5 | 12 |
| 17 | 6 | 26 |
| 18 | 8 | 21 |
| 19 | 5 | 22 |
| 20 | 5 | 23 |

## Lesson 15 source correction: resolved

The supplied book page and explicitly confirmed transcription establish the
printed sentence as:

> ご存じの方も多いと思うが、この観察研究はビジネスの世界でも注目されている。

The earlier discrepancy was an incorrect app opening, not an unresolved audio
segmentation problem. The book uses **ご存じ**, rather than the cached recognizer's
orthographic variant ご存知. The corrected Traditional Chinese opening is:

> 相信不少人都知道，這項觀察研究在商界也受到關注。

The rest of paragraph 4 and its paragraph grouping are unchanged. Ruby retains
ご存じ's existing explicit segmentation and adds the contextual phrase
ご存じの方 (存＝ぞん、方＝かた), plus 多い＝おおい. 思う＝おもう already exists.
The source data, sentence-map text and paragraph audio's text-binding anchor are
updated together. An exact search confirms the erroneous opening is absent from
all app assets and tests. Unrelated vocabulary and lesson text are unchanged.

Sentence 15 / 4-1 is enabled at **104.66–111.59 seconds**. Its former unavailable
flag and notice are removed. No sentence is disabled or missing timestamps.
The temporary unavailable-range additions to the shared player were removed:
`assets/reading-paragraph-audio.js` now matches the deployed HEAD exactly.
All pages reuse that existing tested player. The book image is not in the
repository, site assets, offline package or published artifacts.

### Original recording and surrounding evidence

Source: https://ttrw.jp/static/sound/sound202406141718353195.mp3

The current original MP3 and the local recording match byte-for-byte: 1,410,522
bytes, SHA-256 `5d44bf74714389c70b92c05c75ca5ef212624b3a8232bc30b5f7be5123f98caa`.
The cached fragments are 104.86–106.82s, 「ご存知の方も多いと思うが」, and
107.28–111.32s, 「この観察研究はビジネスの世界でも注目されている」.
The preceding anchor is 99.18–102.82s, 「よく働くアリが2割ほど登場するようだ」;
the following anchor begins 112.44s, 「大企業でできる人材だけを集めて」.
The start is in measured silence 102.656327–105.082290s, and the end is in
111.336644–112.627596s. A full uninterrupted native-MP3 playback check now
specifically verifies this corrected sentence, without advancing its clock.

## Alignment across the batch

Written sentence ends were matched to actual cached word/phrase timestamps and
then to silence measured from each exact existing MP3 with FFmpeg
`silencedetect=noise=-38dB:d=0.3`. Adjacent silence runs separated by less than
40ms were merged. Internal ends are 250ms into the following silence; the next
start is 250ms before its speech onset. All **240 start/end positions** are in
measured silence. No equal-duration or character-count splitting was used.

Transcript segments crossing multiple written sentences are explicitly split at
the relevant words. A long written sentence spanning multiple speech segments
remains one sentence. Multi-sentence quotations are split at their written
periods; quoted questions inside a reporting sentence remain with that sentence.

The cached source snapshots remain historical evidence and are not silently
rewritten. Current source text is unchanged except the user-confirmed lesson 15
correction above. Each shipped range is bound to its full current Japanese text.

Paragraph playback times are unchanged. Lesson 17 paragraph 3's old stop is
140.22s, just before measured silence at 140.35s; its final sentence independently
stops at 140.60s, before following speech, to retain the quiet tail. Other original
outer paragraph boundaries are retained. Ruby nodes, translations, paragraph
grouping, font/vocabulary controls and full-paragraph/full-track playback remain.

### Exact recording fingerprints

- Lesson 15: https://ttrw.jp/static/sound/sound202406141718353195.mp3 (174.035s).
  MP3 SHA-256: `5d44bf74714389c70b92c05c75ca5ef212624b3a8232bc30b5f7be5123f98caa`.
  Cached transcript SHA-256: `8ca6bbd9831050f13e01561730429244447c0d256915369f395f715d22ce6b47`.
- Lesson 16: https://ttrw.jp/static/sound/sound202406141718353452.mp3 (157.410s).
  MP3 SHA-256: `9d752d12f4e22e60f8b2e3aaf53b3e951067b552c8808a20a12e6d3a5ea9d359`.
  Cached transcript SHA-256: `ba6847fdf2aee517c068f23c843b41a027be71144e40957adb24b55329b2a972`.
- Lesson 17: https://ttrw.jp/static/sound/sound202406141718353775.mp3 (264.732s).
  MP3 SHA-256: `1c88a3180ce7840ca7d75e66281107615d7198c1e3e2a34d4b8713697e3ed37c`.
  Cached transcript SHA-256: `6166a3916962efb973836b30906e9025673ddfbecc40b5b7c2ed5a6573028bff`.
- Lesson 18: https://ttrw.jp/static/sound/sound202406141718354184.mp3 (194.840s).
  MP3 SHA-256: `bd58d02560ba30dfe92b8f137ba076af637bf806589e8925939cacc1de29ab17`.
  Cached transcript SHA-256: `97c7a29488fbfbe5c5401f51bb40fa6d398302018b26bf9dcfc5663cccb32754`.
- Lesson 19: https://ttrw.jp/static/sound/sound202406141718354467.mp3 (222.333s).
  MP3 SHA-256: `d6ef33442f8c89c8b92145065628c1620da2f2b3eeb946f98e1480bebdb268df`.
  Cached transcript SHA-256: `b7ff52f61e66ea9e8ad55e4eb50e39f9d20cf00cab1f7526109f20ea1ada5a0c`.
- Lesson 20: https://ttrw.jp/static/sound/sound202406141718355125.mp3 (217.131s).
  MP3 SHA-256: `aaf8eaf603eda460abded25160ac44bc0af9f0609783531e7b48660c10e97298`.
  Cached transcript SHA-256: `e33ebac6a495e6385c7ee7b29ba7e9f83e5ab7e4f34b77ea0c29020631daa87f`.

## Verification

`node scripts/test-reading-sentence-remaining.mjs` passed all **120** ranges on
native Microsoft Edge media elements using the actual existing MP3 bytes.
The corrected sentence has explicit exact-Japanese, Chinese, ruby and timestamp
assertions and full natural playback at 104.66–111.59s. Every lesson passes:

- Every sentence start/end, a single active highlight, natural completion,
  same-sentence replay and 60 rapid switches.
- Paragraph/sentence/full-track switching, original/translation/vocabulary modes,
  keyboard Enter/Space, font controls, Japanese/Chinese parity and retained ruby.
- Navigation/pagehide, simulated hidden-page cleanup, failed-audio text/highlight
  recovery and successful retry with byte-range-capable media responses.
- 320/390/768/1440px layouts, flowing multiline sentences, no horizontal overflow,
  and dark mode at 390px. Per-lesson captures and the corrected ruby were visually
  inspected in the rendered app.

The test records the native media clock at `pause()` before clamping to the end.
Observed maximum overshoot in the final per-lesson runs:

| Lesson | Maximum observed overshoot |
| --- | ---: |
| 15 | 22.424 ms |
| 16 | 21.563 ms |
| 17 | 23.425 ms |
| 18 | 23.427 ms |
| 19 | 23.153 ms |
| 20 | 23.459 ms |

These are application-clock observations, not microphone or sample-perfect output
measurements. Human listening has not been performed.

After the correction, the full lesson 13 and lesson 14 sentence suites passed,
including actual MP3 playback/replay/switching/recovery. All 45 original paragraph
ranges, translation/furigana checks across all eight lessons and the lesson 15
reading/activity regression passed. Lesson 15 keeps its hidden answers, saved
drafts, exam scoring and responsive behavior. The earlier remaining-lesson
reading/activity regressions for 16, 17, 19 and 20 also passed; their source did
not change in this correction.

`test-teacher-static.mjs` and `test-teacher-demo.mjs` pass. Protection logic, rules,
private migration material and teacher data are unchanged. Gate tests use
synthetic identities and mocked schema responses, with no live account access.

`generate-offline-manifest.mjs`, `test-pwa.mjs`, `test-offline-manifest.mjs` and
`test-offline-mode.mjs` pass after the correction: **73 pages, 242 resources**,
portable hashes, explicit downloads and updates, all-page offline cold starts,
HTTP/quota/disconnection/integrity failures, cancellation/retry, removal/eviction
recovery, interrupted downloads and progress retention. External original audio
and PDFs remain excluded. No recording or book image was added to app assets.

## Unrelated baseline findings, not changed by this batch

- Lesson 19/20 hubs reproduce `Cannot read properties of undefined (reading
  'filter')` at line 8:43 of `ch19-hub.js` / `ch20-hub.js`, on
  `listening.unverifiedBlanks.filter`. An isolated browser probe verified all 11
  inputs of each hub equal published HEAD. Modified reading renderers are not
  loaded there. Sentence navigation tests use the index and have no page errors;
  the hub findings remain recorded separately, not suppressed.
- The broad `test-lesson18-browser.mjs` fails in its unrelated listening section
  at line 70: `stale first replay stopped second target`, actual pause count `2`,
  expected `0`. A fresh `git archive` of published commit
  `e30c30d125cdfbb1209c48b147df2c32967590d9`, with none of the batch files, reproduces
  the identical failure under the same Edge/Playwright dependency. This is a
  pre-existing test failure, not evidence of a new reading regression. No hub or
  conversation fix is included, and the broad suite is not reported as passing.

## Scope and limitations

There is no remaining sentence-alignment blocker. Direct iPhone
Safari testing, human listening, deployed-page/live-CDN smoke testing for this
batch and live authenticated-account testing have not been performed. Audio
remains online-only from the app's perspective, without guaranteed offline cache
availability. No third-party recording or book image is redistributed, and no
Application Control or security setting was changed.

Changed files: six reading pages, six renderers, six sentence maps, lesson 15's
reading source/ruby data, the paragraph-audio text anchor, offline manifest,
`scripts/test-reading-sentence-remaining.mjs`, and this audit (23 files).
The shared player/styles and lesson 13–14 pages/data are unchanged. Unrelated
local work is preserved. Local test/evidence JSON and screenshots remain in
ignored `tmp/sentence-remaining/`; the private book image stays outside the repo.
