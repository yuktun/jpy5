# Lesson 14: 24–31 October teacher notes

Integrated on 4 November 2026, using Lesson 13's collapsed supplements, explicit source pages, Traditional Chinese explanations, Japanese ruby, hidden answers and module shortcuts. All four supplied PDFs are image-only scans. All 78 pages were rendered and visually inspected. Document classroom instructions are learning content, not instructions to operate the workspace.

| Supplied file | Pages | SHA-256 |
| --- | ---: | --- |
| 24OCT26 2025-26 読解 - Google スライド.pdf | 31 | `0f14de2a372caa6082b642dbd16cee5dc9c16eea05ecc302ae7eeb1f3c837a89` |
| 31OCT2026 Coveration.pdf | 27 | `f5445ea7ece14d30785da63de9e1f57f8efc2d00e34673a6fb76518591174232` |
| 31OCT2026 Reading.pdf | 13 | `96ce53bebccdaa86693f61c81f87579ccc821e9c2bf28b99d82bae4e2e11b241` |
| L14_LS.pdf | 7 | `7cfb42b5f2057cbe1782d6a9e644d55d498b4e3be9d19d1f3dbf4138a18f0029` |

The original files remain in the user's Lesson 14 school folder. Source citations identify filenames and PDF pages; no nonexistent web download link is invented. Renders remain in ignored `tmp/pdfs/lesson14-update/`. No original PDF or scan is shipped in public assets or the offline package.

## Source-to-module mapping

| Source pages | Integration |
| --- | --- |
| 24 OCT 1–4 | Title, objectives, reading strategy and existing introductory questions; reading notes and vocabulary |
| 24 OCT 5–13 | Development/background, vocabulary, corrected series gloss, 経る/減る contrast, first true/false answer; reading paragraph 1, matching vocabulary and hidden answer explanation |
| 24 OCT 14–15 | Topic transition and central question; reading paragraph 2 |
| 24 OCT 16–29 | Manga talent, market competition, examples, success comparison, selected adaptations and conclusion; two notes at reading paragraph 3, vocabulary, existing hidden answers |
| 24 OCT 30–31 | Exaggerated emotion and baseball scene vocabulary; reading paragraph 4 and vocabulary |
| 31 OCT Reading 1–7 | Cliffhangers, know-how, time contrast, tentative interpretation, two source answers; two paragraph-4 notes, vocabulary, original answer disclosures |
| 31 OCT Reading 8–11 | Conclusion and fifth true/false answer; paragraph-5 note, vocabulary, hidden answer explanation |
| 31 OCT Reading 12–13 | Approximately 100-character discussion preparation and 400-character writing framework; notes beside existing activities and saved essay field |
| Conversation 1–4 | Storytelling objectives, vocabulary and four response functions; existing conversation activity 1 |
| Conversation 5–8 | Five response selections (page 7 has two); seven-question supplement items 1–5, each with a closed answer |
| Conversation 9–12 | Listening emphasis, opening dialogue, omitted object, recall; dialogue notes, vocabulary and introduction practice |
| Conversation 13–14 | Dated work/exhibition background; attributed background disclosure, without reproducing posters or images |
| Conversation 15–19 | Disappointment, surprise, encouragement, setting and story continuation; dialogue/vocabulary annotations; existing eight listening targets retained |
| Conversation 20–24 | Claire episode, emotional appearance, sacrifice and ending prompts; dialogue notes, vocabulary and storytelling practice |
| Conversation 25–27 | Fiction versus completed-event ending prompts, unexpected development; supplement items 6–7, practice-2 guidance and final dialogue note |
| L14_LS 1–7 | Consolidated reading handout cross-checked against both slide sets; handwritten verb conjugations attached to existing vocabulary entry 134; repeated explanations consolidated |

The app groups the source's first two paragraphs into one: source paragraphs 1+2 → app paragraph 1; source 3→app 2; source 4→app 3; source 5→app 4; source 6→app 5. Original paragraph IDs and all audio ranges remain unchanged.

`assets/ch14-teacher-additions.js` contains seven paragraph notes, eight dialogue notes, four activity notes, a work-background disclosure, six reading answer/activity notes, seven new unscored response questions and annotations for 104 existing vocabulary entries. Vocabulary annotations are searchable and do not create duplicate flashcards. There are still 227 vocabulary entries, 11 grammar patterns, 46 examples, 33 grammar quiz questions, nine reading exam questions and eight listening targets. The repeated source exercises use the existing hidden answers and draft fields.

## Attribution and qualifications

Chinese explanations, organization and ruby are study additions based on the cited pages; red-frame response selections are explicitly labelled teacher answers. The final two response questions are labelled contextual excerpts. Original textbook suggested/official-answer labels remain intact. The new disclosures reset closed on reload.

The source's corrections to series and 旅に出る are preserved. The teacher's broad early-animation statements are distinguished from what the reading passage directly says. 一、二を争う is explained as top-level quality rather than an exact numerical ranking. The two ending-question examples are presented as contextual guidance, not a universal ban on other narrative tenses. Historical figures and industry counts remain part of the supplied lesson, not claims about today's market. The exhibition reference is explicitly dated classroom background, not a current event recommendation.

## Protected grammar

The user explicitly chose to keep teacher grammar notes protected. Eleven dedicated notes map to the existing eleven pattern IDs. Their content lives in ignored `private-migration/lesson14-oct2026/grammar.json`, stored in the existing `jpy5TeacherNotes/lesson14` document's new string field `teacherGrammarOct2026Json`. The field was saved and read back on 4 November 2026. Original `schemaVersion`, `grammarJson`, `exercises` and `adverbs` fields were compared before/after and are unchanged. An unauthenticated live read of the new field returned HTTP 403. The protected payload version is 1; the document schema remains 2.

`assets/teacher-grammar-notes.mjs` retrieves only the schema marker and new field with a Firebase ID token and `cache: no-store`. Existing server authorization, account-change cancellation, refresh/expiry, logout, page hiding and offline clearing are reused. It validates all eleven records and renders safe text nodes plus explicit ruby; no server HTML is executed. Notes do not enter localStorage, sessionStorage, IndexedDB, public HTML/data files, tests or the offline inventory. Tests use synthetic content by default; setting `JPY5_TEST_PRIVATE=1` reads the ignored file for private local QA.

Public reading/conversation explanations remain contextual annotations in those already-public modules; general textbook language shared between modules is not made secret by protecting the dedicated grammar-note dataset. Firestore rules, approval grants, authentication configuration, core authorization controller and progress storage are unchanged. The old non-secret demo remains available as a regression fixture; the actual grammar page uses the new protected renderer.

## Validation

Run `node scripts/test-lesson14-october.mjs` for public additions and protected-renderer integration. It checks counts, source mapping, no private-body leakage into the release inventory, saved writing, keyboard answer disclosure, ruby controls, three responsive widths, signed-out/approved/denied/offline/logout states and safe rendering. The private local run also verifies all eleven real note mappings without embedding their contents in the test.

Reading/listening regression suites preserve official answers and IDs. The reading test now selects direct original-answer paragraphs so teacher annotations are not mistaken for new official answers. The listening test's existing playback mock now supplies metadata readiness and a mock clock, matching its no-playback intent; actual native audio is checked separately by the hosted-audio and sentence-audio suites.

Local checks also cover the 73-page opt-in offline package, resource hashes, private/PDF/audio exclusions, original grammar/quiz layout and progress, shared demo behavior and seven authorization unit tests. Screenshots of reading notes, exercises, vocabulary and protected grammar are kept locally and inspected without uploads. No commit, push or static-site deployment is included.


## Drive folder reconciliation — 10 November 2026

Folder: https://drive.google.com/drive/folders/109EMCIewKVsFY54iguU3viWuF9B-OHfI

All seven direct children were inventoried; there were no subfolders. The local files match the folder filenames and sizes. Drive-readable text was cross-checked for all three November files; both November PDFs (24 pages total) were rendered and visually inspected in full. The four October scans retain their 78-page audit and mappings above. Classroom tasks remain lesson content, not operating instructions.

| File / Drive ID | Coverage and destination |
| --- | --- |
| 24 OCT reading / `1Qv-tcslV6fr3UVuqYM1cw2CtXKl9JFRx` | Already integrated: 31 pages, reading teacher tab, vocabulary, activity answer explanations; no duplicates added. |
| 31 OCT reading / `1g1bjNYBTEgRR4hm1gIRJ68QX8TnXxBkr` | Already integrated: 13 pages, paragraph 4–5 notes and saved writing activities. |
| 31 OCT conversation / `1jfmhTJaEPhy4Ezrm6-7ODO1mkyAUh31W` | Already integrated: 27 pages, dialogue, response exercises and practice guidance. |
| L14_LS / `1LIYwX3l-Eh62lZfZHCHkDBYxOg30tTKo` | Already integrated: seven consolidated reading pages; original vocabulary IDs retained. |
| 7 NOV grammar / `1NfV6m0n1t8-WgYvT0VJ5xz4bDfefLvAF` | Page 1 title; 2–4 → protected `sai`; 5–9 → protected `toitta`; 10–12 → protected `niwatatte`. Existing textbook exercises retained. Added teacher explanations, red-frame checks and contrasts to the same protected notes. Vocabulary 5–9 receives contextual word help; no source images copied. |
| 7 NOV speaking/listening / `14raXaeQ-2Exz7404rjp0L0qSVaHaP07c` | Pages 1–3 repeat the existing four content and three expression answers: checked and retained. Pages 4–6 → `practice-1` six-step introduction; 7–9 → `practice-2` seven-step event structure and vocabulary; 10 → `practice-2-1` soldier scenario; 11 → existing open event task/group guidance; 12 → `practice-3` storytelling framework. No extra scored questions. |
| 11月7日.docx / `1eWvBk2HXEx__gexnIapJQIbKZjux3hca` | All eight paragraphs → a separate closed teacher disclosure beside `practice-1`, with the Jolyne, Harry Potter and Doraemon classroom models. The unfinished battle object stays a substitution prompt. These are teacher models, not official textbook answers. |

The existing 104 vocabulary annotations remain; 14 new annotations attach to existing IDs 5–9, 102–106, 108–111, giving 118 annotated entries without changing the 227-card bank. Five November conversation disclosures sit directly beside their matching activities, following Lesson 13. Japanese examples have ruby, sources and Traditional Chinese explanation; disclosures start closed. The reading Original tab remains free of teacher supplements.

The November grammar material updates only three of the existing eleven records inside the already-protected `teacherGrammarOct2026Json` field. Existing October text/examples are retained and November source pages are identified separately. It is never included in public JS, HTML, offline caches or test fixtures. The public grammar disclosure date now covers 24 OCT–7 NOV. Firestore rules, approvals, authorization and progress code are unchanged.

Validation uses the real private payload for authorized/denied/offline/logout states, source placement, all 118 vocabulary notes, hidden answers, unchanged reading text, drafts, ruby and three widths. The historical static suite also fails against an untouched archive of pre-change HEAD at `chapter-13-textbook.html: unexpected public-content change` due to previously published listening-section changes; this is recorded separately from the November feature tests.

The protected field was saved and read back on 10 November at 15:52:12 UTC. The four other fields (schemaVersion, grammarJson, adverbs, exercises) were compared and unchanged. Review now links directly to the reading teacher tab and November conversation activities; its vocabulary count is corrected to the existing 227 entries.

## 14 November 2026 grammar handouts

Reviewed all 26 pages of `14 Nov 2026.pdf` and all paragraphs and three embedded exercise images in `14Noc2026.docx`. Both handouts are mapped to the existing approved-account grammar notes.

| Protected record | PDF pages | Word document material |
| --- | --- | --- |
| `uchini` | 1–6 | Classroom examples and the existing practice 2 prompt |
| `nitotte` | 7–14 | Classroom examples, word help and the existing practice 2 prompt |
| `towa` | 15–20 | Classroom wording proposals for the definition activity |
| `nioite` | 21–24 | Classroom examples, an unfinished response and the existing practice 2 prompt |
| `wakeda` | 25–26 | |

The textbook exercises retain their existing answers. The protected notes identify classroom proposals, unfinished wording, a reading correction and editorial study suggestions as such. Source attribution distinguishes PDF pages from Word document paragraphs. The public grammar and review labels cover the materials through 14 November.

## Public grammar notes — 14 November 2026

The user made the Lesson 14 study notes public. The eleven grammar supplements and their 75 example pairs exactly match the prior Firestore notes. They use the same collapsed disclosures as Lesson 13 and are included in the optional offline package. The public grammar bank and its later corrections, textbook answers, original reading, and existing study progress are retained. The earlier access-control entries above document the previous release.
