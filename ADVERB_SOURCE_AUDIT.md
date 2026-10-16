# 副詞 handout: Lessons 13–20

Source: [teacher's eight-page 副詞.pdf](https://drive.google.com/file/d/1h2t9BYb8IYg4wTvl3_mn2MgaBPwlZDGL/view). All eight scanned pages were rendered and read on 17 October 2026 (Hong Kong time).

## Coverage

| Lesson | PDF page | Topic | Cards (source groupings) | Example blocks | Practice prompts |
| --- | --- | --- | ---: | ---: | ---: |
| 13 | 1 | 時間関係の副詞（１） | 4 | 8 | 7 |
| 14 | 2 | 時間関係の副詞（２） | 4 | 8 | 7 |
| 15 | 3 | 否定の副詞（１） | 4 | 9 | 7 |
| 16 | 4 | 否定の副詞（２） | 3 | 6 | 7 |
| 17 | 5 | 条件の文に使う副詞 | 5 | 14 | 5 |
| 18 | 6 | 変化を表す副詞 | 5 | 10 | 7 |
| 19 | 7 | 依頼・願望の副詞 | 3 | 6 | 6 |
| 20 | 8 | 推量の文で使う副詞 | 6 | 12 | 4 |
| Total | 8 | | 34 | 73 | 50 |

The Lesson 13 father/son exchange counts as one example block. Grouped synonymous forms remain together, following the handout. Line wrapping, spacing and question-number typography are normalized. Japanese examples, question choices and blank positions are retained. Parenthetical context notes are carried in the examples, translations, usage notes or memory guide. Source explanations are available in each card's native disclosure. Chinese translations, usage qualifications, memory guides and answers are explicitly labelled learning additions. The PDF contains no answer key: all answers are reference/suggested answers, never represented as teacher-confirmed answers.

## Qualifications and ambiguous questions

- **13, すでに:** the new scan says 終わってから時間が経っている状況, rather than the older page's inserted 長時間. The source category still says 長い時間; the adjoining Chinese note explains that a long elapsed time is not required. [小学館 類語例解辞典, 既に / とっくに](https://dictionary.goo.ne.jp/thsrs/15202/meaning/m0u/) distinguishes prior completion from an emphasis on much earlier completion. Lesson 13 question 1 prefers もう for ordinary conversation but does not make すでに ungrammatical. The old timeline suggesting a fixed temporal ranking was replaced by a compact comparison; existing extra examples were retained in the cards, memory guide or completion answers.
- **14, 今に:** the source's “opposite of the present” describes its examples, not every possible use.
- **15:** the source's degree ranking for そんなに / それほど / そう is preserved in its disclosure but qualified as context-sensitive. 全く also has affirmative uses. たいして does not invariably convey disappointment.
- **16:** 必ずしも is not total negation. The source's responsibility and school-closure interpretations are contextual examples, not a fixed responsibility share or frequency encoded in the adverb. 何も in this lesson means “no need to,” distinct from its indefinite-pronoun use.
- **17, もしも:** the source's たら-only grouping is explicitly scoped to the worksheet. [小学館 dictionaries, 若しも](https://kotobank.jp/word/%E8%8B%A5%E3%81%97%E3%82%82-645546) describe an emphatic hypothetical and include a ば example. The first exercise has two grammatically possible continuations; the likely classroom intent is explained without declaring the other impossible. The second is preserved as a language exercise; its medication-related option is explicitly not endorsed as an ingestion-treatment instruction.
- **18:** contrasts concern degree, completion and pace, not a single ranked scale. Source parenthetical explanations for ますます are included in the memory guide.
- **19:** どうか and ～ますように also work in ordinary wishes and blessings, not only prayer to an unseen being. “Select the unsuitable answer” is preserved, distinct from the other lessons' ordinary selection exercises.
- **20:** source positive/negative groupings are labelled classroom context, not absolute semantic rules. [小学館 デジタル大辞泉, 恐らく](https://kotobank.jp/word/%E6%81%90%E3%82%89%E3%81%8F-452741) defines confident conjecture without restricting it to negative outcomes. The first question likely targets explicit conjectural endings (C as the intended mismatch), but おそらく来なかった can express conjecture about the past; this ambiguity is shown beside the reference answer. No numerical probability scale is invented.

## Implementation and verification

The shared editable content is `scripts/adverb-notes-data.mjs`. `scripts/generate-adverb-notes.mjs` writes the same semantic HTML structure into all eight vocabulary pages. Notes remain readable without JavaScript; existing `teacher-supplements.js` handles answer disclosure. A scoped keyboard handler prevents vocabulary shortcuts from consuming Space on adverb controls. `assets/adverb-notes.css` uses the site's existing theme tokens. Vocabulary IDs, counts and score/storage models are unchanged.

Checks:

```text
node scripts/generate-adverb-notes.mjs --check
node scripts/test-adverb-notes.mjs
node scripts/test-lesson13-teacher.mjs
node scripts/generate-offline-manifest.mjs
node scripts/test-pwa.mjs
JPY5_PREVIOUS_REF=HEAD node scripts/test-adverb-update.mjs
```

Browser tests need Playwright and an installed browser (JPY5_BROWSER_CHANNEL=msedge on Windows). The source inventory is independently asserted by lesson, including examples and all 50 prompts. Browser checks cover mobile/tablet/desktop, both themes, source disclosures, keyboard answer controls, cross-lesson anchors, original vocabulary card behavior and storage retention. The update test installs the previous revision, activates the new release through the real update banner, then checks every supplement and answer control offline.

Verification completed on 17 October 2026: generator consistency, the eight-lesson browser suite (390/810/1280 px, light/dark), existing Lesson 13 teacher regression, PWA inventory (73 pages / 216 resources), and actual service-worker update from revision `298ba51` all passed. The updated cache version is `6f2975cdadd6b9d5`. Representative mobile, tablet and desktop screenshots were visually reviewed after the final layout change. This records local verification, not a live deployment.
