# Listening section 2, lessons 13–20

The textbook's `話す・聞く → 2. 聞いてみよう` questions were already stored
in all eight lessons. They were exposed through the generic `理解練習` tab;
lessons 13–16 placed them below supplementary multiple-choice questions.

The tab is now explicitly labelled **聆聽第二部分**. Official questions appear
first, separated into **1）內容理解** and **2）表現理解**, with jump links for
both groups. The jump links move keyboard focus and leave space for the sticky
lesson switcher. Lesson 17 retains both nested expression subgroups.

| Lesson | Content | Expressions | Total |
| --- | ---: | ---: | ---: |
| 13 | 3 | 4 | 7 |
| 14 | 4 | 3 | 7 |
| 15 | 3 | 5 | 8 |
| 16 | 3 | 5 | 8 |
| 17 | 4 | 6 | 10 |
| 18 | 5 | 5 | 10 |
| 19 | 4 | 5 | 9 |
| 20 | 5 | 4 | 9 |
| Total | 31 | 37 | 68 |

## Source and state preservation

The existing textbook scans and official answer keys were checked. Lesson 14's
four content answers and three expression answers match the supplied reference.
No new questions or invented answers were introduced. The lesson 19 character
name was corrected from `アンタ` to `アンヌ`, matching the textbook and answer
key (answer PDF page 9, printed page 25), in the answer, speaker list and dialogue.

Existing question IDs, draft keys, progress, supplementary exercises, answer
visibility controls, furigana, original recordings and replay ranges are retained.
The shared presentation helper moves existing DOM cards rather than recreating
their inputs. It is invoked before the existing per-render event binding.

The offline manifest includes the new helper and stylesheet. Audio remains
online-only, as before.

## Checks

`node scripts/test-listening-part-two.mjs` checks all 68 answers and both groups
at 320, 390, 768 and 1440 px, including hidden/revealed answers, draft persistence
after tab changes/reload/furigana toggles, keyboard focus, sticky-header clearance,
and horizontal overflow. Set `JPY5_BROWSER_CHANNEL=msedge` to use installed Edge.
The suite also seeds pre-update draft/progress records and checks that moved
supplementary questions still record exactly one attempt. These additional
regressions passed for every lesson at 390 px; use `JPY5_LISTENING_VIEWPORTS=390`
for that focused run.

Additional regression checks:

- `scripts/test-lesson13-listening.mjs`
- `scripts/test-lesson14-listening.mjs`
- `scripts/test-listening-translations.mjs`
- `scripts/test-audio-segment-player.mjs`
- `scripts/test-listening-audio-ranges.mjs` (controlled media; native MP3 mode
  is enabled with `JPY5_NATIVE_LISTENING_AUDIO=1`)
- `scripts/test-offline-manifest.mjs`
- `scripts/test-pwa.mjs`
- `scripts/test-offline-mode.mjs`

The legacy lesson 15, 16, 17, 19 and 20 listening suites fail their initial
media-seek assertion both here and on an isolated, untouched archive of commit
`2bec617620d16bdcbc145faafa4a9a37963f5ff0`. They are not evidence of a new
listening-section regression. The current cross-lesson range suite covers all
68 sentence replay ranges separately. `test-lesson18.mjs` also has an unrelated
outdated assertion forbidding lesson 19/20 links in an unchanged vocabulary page.

Internal browser evidence is saved in ignored `tmp/listening-part-two/`.
