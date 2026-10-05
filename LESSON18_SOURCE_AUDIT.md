# Lesson 18 source audit

Status: school vocabulary and grammar PDFs verified directly on 2026-09-19.
Implementation inventory updated on 2026-10-01 before the quality upgrade.
Lesson 18 learning datasets and all nine module pages already exist. School-PDF
verification, visual textbook transcription, app-authored teaching, and
audio-verified listening targets are distinct evidence levels.

## Authoritative sources

- School vocabulary PDF: Google Drive file ID `1V3WSk6ggOp77KnCt3XkKEftTXk3k2crK`
  (`japanese_vocab_lv2_ch18.pdf.pdf`), six pages; directly inspected at the
  supplied local path.
- School grammar PDF: Google Drive file ID `1gQdp-sbNHMYeVd6x-WMmXh1i-dr2hpRI`
  (`g_2_18.pdf`), four pages; directly inspected at the supplied local path.
- Textbook: [大家的日語 中級II 第18課](https://ttrw.jp/static/textbook//1032/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC18%E8%AF%BE.pdf), HTTP 200, 24 PDF pages.
- Official answer book: `L17 to L20 ans.pdf`; Lesson 18 reading answers were
  visually verified on PDF page 5. Listening answers and examples were visually
  verified across PDF pages 5–7 and cross-checked with the textbook and audio.

## Verified vocabulary inventory

The vocabulary PDF contains **108** numbered entries in this source order:

| Section | Entries |
| --- | ---: |
| 文法・練習 | 1–18 (18) |
| 話す・聞く | 19–46 (28) |
| 読む・書く | 47–108 (62) |

All six pages were read directly. Each row provides kana, Japanese writing,
classification, and Traditional Chinese meaning; the source order, spellings,
readings, meanings, verb group/transitivity labels where printed, and section
membership are now authorized for dataset transcription. The PDF prints `-` in
some writing cells; preserve that source notation rather than inventing kanji.

## Verified grammar inventory

The grammar PDF contains **eight** patterns and **39** numbered printed
examples, in this order:

1. `に違いない` — 4 examples
2. `に比べて` — 4 examples
3. `ものだ／ものではない` — 9 examples
4. `～た` (discovery: `あった／いた`) — 3 examples
5. `だって、…` — 4 examples
6. `～たところで` — 5 examples
7. `Nだって` — 5 examples
8. `こそ` — 5 examples

Patterns 1–3 are grouped under 読む・書く; 4–8 under 話す・聞く. Every numbered
example was checked against the four-page PDF. The previous inventory's pattern
5 label, `だって、…もの`, was too narrow: the printed heading is `だって、…`;
`だって…もの／もん` appears in the usage explanation and examples. Preserve that
distinction. The source says this form is often used by children or women; do
not turn that observation into an absolute restriction.

## Textbook inventory

- Reading: `鉛筆削り（あるいは幸運としての渡辺昇①）`, credited to
  `村上春樹『村上朝日堂超短編小説 夜のくもざる』新潮社より`.
  The existing dataset contains eight visually verified Japanese paragraphs,
  an app-authored Traditional Chinese translation, and visually transcribed
  textbook activities 1 / 3 / 4 / 5. The six `3. 確かめよう` records retain
  IDs `source-1` through `source-6`; their official answers were visually
  transcribed from answer-book PDF page 5 and remain unscored.
- Conversation: `あなたこそ、あの本の山はいったい何なの！`.
  The visually transcribed dataset contains 20 dialogue lines, 13 printed
  numbered blanks, five content prompts, five expression situations, and all
  activities 1 / 3 / 4 / 5 / 6. Fixed answers and answer examples were checked
  against the official answer book PDF pp. 5–7. The 13 blank expressions and
  individual replay ranges were independently checked against official MP3 1–18.

## Verified audio references

- MP3 1–17: `https://ttrw.jp/static/sound/sound202406141718354184.mp3`
- MP3 1–18: `https://ttrw.jp/static/sound/sound202406141718354246.mp3`
- MP3 1–19: `https://ttrw.jp/static/sound/sound202406141718354323.mp3`

These URLs are printed in the textbook PDF. Accessibility of a URL does not
verify dialogue answers, comprehension answers, transcript wording, or timing.

## Existing Lesson 18 files

The hub, vocabulary, grammar notes, reading, listening/textbook, flashcards,
quiz, review, and history pages exist as `chapter-18*.html`, with dedicated
`assets/ch18-*.js` datasets/controllers. Vocabulary contains 108 entries and
grammar contains eight patterns/39 source examples. Additional grammar teaching
and an initial app quiz already exist. Reading source questions and listening
blanks are unscored. Progress uses the existing `jpy5.chapter18.*` namespace and
shared Firebase sync. This upgrade reuses that architecture and preserves source
records and existing user progress.

## Quality upgrade disposition — 2026-10-05

Local source copies under `work/lesson18-source/` were re-inspected: all six
school vocabulary pages, all four school grammar pages, textbook PDF pages 2–3
(reading / questions), and 5–8 (listening / follow-ups). The later listening
pass also inspected answer-book pages 5–7 and independently audited MP3 1–18.

### Vocabulary

- All 108 records remain in source order, with section counts 18 / 28 / 62.
  PDF layout wraps had leaked into kana, type and Chinese meaning as slashes;
  those wraps were cleaned, while true dictionary/polite alternatives remain.
- All source `-` writing cells are preserved. Printed verb group and transitivity
  are retained in `type`, and also exposed as `verbGroup` / `transitivity`.
  Every record has a source-page reference. Foreign originals are teaching support.
- Item 53 `言い返す` retains printed `Ⅱ・他`; its note explains ordinary
  group-I conjugation. Item 74 retains the printed dictionary form `走らす`
  and polite form `視線を走らせます`; both are explicitly distinguished.
  Item 97 `超～` retains the source's `接続詞` label with a teaching note about
  prefix use. Items 13, 33, 81 and 94 likewise retain printed classifications.
- Context notes distinguish the handout meaning from reading usage, for example
  `修理屋` (source: repair shop; reading: repair worker), `ちらちら` (intermittent
  appearance vs glancing), and `鉛筆削り` (source Chinese: 鉛筆削).
- The Lesson 17 card/list controller is reused within Lesson 18: forward/reverse,
  section/review filters, right/wrong/star, shuffle/sequential, jump/search,
  complete list, pronunciation, swipe and persistent state.

### Grammar source fidelity and teaching

Exactly eight patterns / 39 numbered source examples remain. The re-read found
that the earlier dataset abbreviated 12 numbered examples and mistranscribed
one Japanese word. Source-supported restorations are:

| Pattern / numbered example | Source evidence and correction |
| --- | --- |
| ものだ 6 | PDF p.2: restore A's forgotten report and B's complete response |
| ものだ 9 | PDF p.2 prints `会社`, not the dataset's `社会`; restore `会社` |
| discovery ～た 1–3 | PDF p.2: restore full finding-person, glasses and microscope contexts |
| だって、… 1–4 | PDF pp.2–3: restore printed A/B dialogue contexts |
| ～たところで 2 | PDF p.3: restore the late-arrival premise before the hypothetical visit |
| Nだって 3–4 | PDF p.3: restore the preceding statement and complete example |
| こそ 3 | PDF p.4: restore the literature-department A/B exchange |

The source's ものだ example 9 has a Japanese/Chinese discrepancy: Japanese
`会社の問題` but printed Chinese `社會的問題`. The Japanese is corrected to
the print; the Chinese meaning already recorded is preserved. The teaching note
explicitly identifies this discrepancy and the possibility-negation use of
`できるものではない`, distinct from moral prohibition.

Other source Japanese is retained. Chinese example text is labelled as editorial
presentation of the printed translation, not a claim of typographically exact
Chinese transcription. Supplementary explanations, comparisons and examples are
`延伸學習`; the source-example heading is `來源例句 · g_2_18.pdf`.
Pattern 5 is still `だって、…`, not `だって、…もの`. Its gender/age observation
is a tendency, never a restriction. Discovery's printed heading `あった／いた`
is retained in `sourceTitle`, with ～た used as the teaching title.

The single scored grammar bank has **32 App Practice questions**, four per
pattern (meaning, formation, context, contrast). The previous weaker modal
quizzes were removed. A Lesson 18-only ruby/highlight layer supports notes,
flashcards, quizzes and history without modifying shared grammar code.

### Reading

- All eight existing verified Japanese paragraphs, their IDs and the source
  credit are unchanged. A regression check compares them with commit
  `e25641e91446486a6e7cadaea60a970aaad0c2f0`.
- The textbook activity surface follows the printed order **1. 考えてみよう →
  3. 確かめよう → 4. 考えよう・話そう → 5. チャレンジしよう**. Activity
  wording was visually transcribed from textbook PDF pages 1, 3 and 4. The
  page-4 categories are exactly `① 物`, `② 人`, `③ 行為、行動`; the scenario
  instruction prints `動き`, not `動作`.
- The six `3. 確かめよう` records preserve IDs `source-1` through `source-6`,
  stay `scored:false`, and now carry official answers transcribed from the
  answer book PDF page 5. The classification is `A, A, B, B, B, A, B, B` and
  the two printed choices are `① b` and `② c`. Answers are hidden by default;
  reveal does not replace learner notes or selections and never contributes to
  App mastery or wrong-answer scoring.
- Re-reading printed p.73 corrected earlier question transcription errors:
  `何と何を`, `どんな関係`, `こんな幸運は`, classification `コレクター`, the
  quote `その鉛筆削りいいですねえ`, the full “20年以上…古いもの” option, and
  `遠慮しながら` rather than `意識しながら`. No answers were inferred in these records.
- **13 應用程式閱讀練習**, **5 原文找答案** tasks and **24** contextual vocabulary
  cards are a separate app-authored layer. Scored questions cite a valid paragraph
  and have a text-supported answer and explanation. They are not a textbook key.
- Original, translation, textbook Reading questions, App practice, find-answer,
  vocabulary, exam and wrong-answer review are separate modes. Chinese translation
  is editorial teaching material, not a printed textbook translation. Suggested
  answers for open activities 1 / 4 / 5 are app-authored and labelled
  `參考回答例（非課本官方答案）`.
- Exam selections save immediately and survive mode, font, furigana and page
  navigation. Exam submission updates the same current-answer/mastery record as
  practice. Wrong answers stay reviewable until a correct retry; viewing an answer
  or explanation never awards mastery. Existing ten vocabulary indices are preserved.

### Listening and source speaking activities — completed 2026-10-05

- All 20 dialogue rows were rechecked against textbook pp.75–76 and official
  MP3 1–18. All 13 numbered blanks retain their printed number, speaker and
  context. Exact answer spans are highlighted in the full dialogue, while each
  replay button is a separate row-level control.
- Official answer-book text and fresh MP3 ranges are stored in `listeningTargets`.
  Each range was exported and speech-checked independently; the three multi-answer
  rows expose 2, 2 and 3 separate controls. Replay uses a serial guard and removes
  the previous stop listener before a new target begins.
- `2. 聞いてみよう` retains all five content prompts and five expression
  situations in print order. Official answers are hidden initially. Reveal never
  fills or overwrites learner notes.
- `3. もう一度聞こう` is a 13-item editable cloze. Comparison ignores harmless
  whitespace and punctuation only; revealing an answer is independent of checking.
- All textbook activities `1. やってみよう`, `4. 言ってみよう`,
  `5. 練習しよう`, and `6. チャレンジしよう` are present. The four picture
  prompts link to the original textbook rather than inventing image descriptions.
  Official practice dialogues are labelled `課本解答例`; activity 6 is marked as
  open work because the answer book says `省略`.
- Existing `drafts`, `promptNotes`, `expressionNotes`, `activityNotes`,
  `listenCount`, furigana and mode state are preserved. Legacy prompt/expression
  modes migrate to the grouped comprehension mode; `activityDrafts` also migrates
  into the current activity-note map.
- Reset clears only `jpy5.chapter18.conversation`; it does not reset another lesson
  or Reading/Vocabulary. Playback count and saved-note count are not completion.

### Persistence, navigation and validation

All storage stays under `jpy5.chapter18.*` through the existing common/Firebase
adapter. No shared sync schema or destructive migration was introduced.
Grammar histories use archived old question definitions and new question snapshots;
old stars/review IDs resolve to corresponding pattern practice. Unattempted quiz
mistakes survive a filtered retry. Reading answers normalize contradictory wrong
arrays after storage merge. Source-question and listening notes never count as mastery.

All eight module switchers include 13 → 14 → 15 → 16 → 17 → 18. No clickable
Lesson 19/20 links were added; the semester homepage is untouched. Hub counts
derive from runtime datasets; its progress excludes unscored source/listening work.

Validation covers counts, unique/order IDs, fields, protected source text, exact
listening answer spans and ranges, stale replay cancellation, hidden-answer safety,
preserved histories and drafts, phone/iPad layout, nine-page offline loading,
asset links, JavaScript syntax, and the regenerated offline manifest. Shared
Lesson 13–17 listening, Lessons 19–20, Firebase, theme and PWA regressions are
also run. The shared stylesheet only adds the reusable row-action layout and
activity introduction treatment required by this Lesson 18 interface.

Intentionally unresolved for this listening module: the four textbook illustrations
are not duplicated in the app; learners open the source PDF for that visual context.
Open speaking work remains unscored. This listening upgrade does not alter the
separately completed Lesson 18 Reading implementation.
