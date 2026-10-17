# 日本語 Year 5

A mobile-friendly study site for **みんなの日本語 中級Ⅱ**. Lessons 13–16 provide vocabulary, grammar, reading, listening, flashcards, quizzes, history, and mixed review.

## Run locally

No build step or dependencies are required.

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Optional offline use and updates

The default is online mode. Opening or installing the app does **not** download an offline package. Normal page requests and browser HTTP caching still work as usual. Open **離線設定** in the header and choose **下載離線內容** to save all 73 study pages, text, vocabulary, exercises and required local assets. The dialog displays the package size, file progress, completion and actionable errors. Keep it open until **離線已就緒** appears.

**All PDFs (including same-origin PDFs), external links, external audio and Google sync require internet and are excluded.** Links and audio players are labelled accordingly. Device pronunciation also requires an installed local Japanese voice; test it before relying on it offline.

Updates download only when selected. The small service worker/inventory can update automatically, and the dialog reports when the saved package has a newer version available. Each file is checked against the release hash (text line endings are normalized for Windows/Git portability). A new package becomes active only after every required file is present. Failed, interrupted or inconsistent deployments never replace a complete saved package. Choose **重新載入新版本** after an update to reload the current page; other open pages can be reloaded when convenient.

**移除離線內容** cancels any download and removes only this app scope's offline package, metadata and legacy precache entries. It does not clear localStorage, IndexedDB, cookies, login state, learning progress, quiz drafts or unrelated app caches. Existing users move to the online default when the new worker activates and can explicitly enable offline use. Old automatically downloaded files are not treated as consent or as a verified new package; they are retained until an explicit download succeeds or the user selects removal. Existing Home Screen shortcuts need not be reinstalled.

### iPhone / Safari

Keep the app in the foreground during downloads. An interrupted download can be retried; partial content is never reported as ready. Browsers can reclaim website storage, and private browsing or insufficient space can prevent downloads. Reconnect and download again if the dialog reports incomplete content. Do not clear website data to troubleshoot, as that can delete learning progress. Safari's storage policy and eviction behavior are described in [WebKit's storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/). Real iPhone/Safari background suspension, Home Screen and device voice checks remain release-device checks, separate from the automated Edge suite.

### Contributor checks

After changing pages or assets, regenerate the checked-in inventory. The generator excludes PDFs even when placed under assets or linked locally. It includes local source-audit text linked by study pages. No external SDK is required for local study; optional Google sync needs internet.

```bash
node scripts/generate-offline-manifest.mjs
node scripts/test-pwa.mjs
node scripts/test-offline-manifest.mjs
node scripts/test-offline-mode.mjs
```

The browser suite requires Playwright and an installed Edge (or set JPY5_BROWSER_CHANNEL). It uses isolated profiles, a local server and no live accounts. It covers the online default, download/retry/cancellation, persistent-profile cold start, all 73 pages offline, PDFs/external links, update detection and integrity failures, removal/re-enabling, partial eviction and scoped legacy-cache cleanup. The existing adverb and teacher-exercise update suites exercise actual migration from the previous automatic worker followed by explicit offline download; set JPY5_PREVIOUS_REF to the last pre-opt-in commit for those migration suites.

## Structure

The dependency-free static site is organized around a homepage, a Chapter 13 learning hub, separate study-tool pages, and shared data/behavior modules under `assets/`.

### Chapter 13 complete edition

- Vocabulary: all 159 source words, three textbook sections, searchable/filterable list, two-way kana/kanji-or-original flashcards, keyboard controls, random order, marking, starred and targeted review queues, and saved progress
- Grammar: eight source-grounded patterns, 25 source examples, formation rules, usage notes, contrasts, 33 flashcards, two directions, review queues, and saved progress
- Quiz: 40 questions, practice/exam modes, grammar filters, incorrect retry, starring, and saved history
- Reading: the complete `ゲッキョク株式会社` text and official reading audio, Traditional Chinese translation, full furigana and font controls, 13 comprehension questions, answer-finding, vocabulary cards, mock exam, and mistake review
- Textbook/listening: the complete Chapter 13 `3. もう一度聞こう` dialogue and official audio, seven source-aligned comprehension questions, five clickable underlined expressions with reading/meaning/usage popups, focused replay, flashcards, multiple choice, sentence ordering, dialogue fill-in, exact dictation, and mistake review
- Experience: responsive layout, automatic/light/dark themes, and app icons for browser/iPhone shortcuts

### Lesson 13 teacher additions (3–10 October 2026)

The Grammar Notes page also places all 21 textbook response items from PDF pages 9-12 beside their matching eight grammar patterns, after the examples. Each exercise group is collapsed by default like the teacher supplements, and each answer has its own keyboard-accessible disclosure, closed initially and after reload. Japanese prompts, choices, models, word banks and answers include hiragana ruby using the existing teacher-supplement rendering convention. Open answers are labelled as suggestions; the two personal-response activities have explicitly non-official example responses. The exercises do not score or write progress. Their text is included only in an explicitly requested offline package; linked PDFs remain online-only. Run `node scripts/test-lesson13-textbook-exercises.mjs` after changing these exercises.

The existing modules include source-linked teacher notes for all eight grammar patterns, seven conversation explanations, six role-play hints, and twelve vocabulary usage notes. Reading activities include the teacher's presentation framework and an approximately 400-character writing exercise with a saved draft and character count. Open answers remain ungraded; existing vocabulary IDs, quiz records, and audio timing are preserved. The Review page links directly to the additions.

Teacher content and PDF page references live in `assets/ch13-teacher-additions.js`. Duplicate scans are consolidated with their corresponding handouts. Where the reading slides simplify the ending, a labelled note preserves the original text's distinction between Ikebukuro and Aomori. Run `node scripts/test-lesson13-additions.mjs` with Playwright available, alongside the existing Lesson 13 checks, after changing these additions.

All 35 added notes and the writing task were checked against their sources on 2026-10-13. [Lesson 13 source audit](LESSON13_SOURCE_AUDIT.md) records corrections, qualifications, and independent dictionary/research references. The modules label these as `校對補充`, distinguish a teacher's contextual interpretation from a general grammar rule, and display source cautions beside simplified reading questions and answers.

### Teacher exercises for Lessons 14–20

Each lesson's Review page includes **老師 Exercise**, following Lesson 13's worksheet layout. The seven teacher PDFs (41 pages) are transcribed in source order with hidden answers, labelled suggested responses for open questions, and contextual Traditional Chinese word-bank help. These exercises do not change scores or saved progress. Each page links its source PDF and identifies source inconsistencies beside the affected questions.

[Exercise source audit](LESSONS14_20_EXERCISE_AUDIT.md) records page coverage, answer review and source cautions. Browser checks cover all seven lessons at mobile, tablet and desktop widths, answer disclosure, word help, accessibility and progress retention:

```bash
node scripts/test-lessons14-20-teacher.mjs
node scripts/test-lesson13-teacher.mjs
node scripts/generate-offline-manifest.mjs
node scripts/test-pwa.mjs
```

`scripts/test-teacher-exercise-update.mjs` checks the real service-worker update from a prior published revision, progress retention, and all seven updated pages offline. Set `JPY5_PREVIOUS_REF=HEAD` before committing this release, or select the preceding published commit after committing. Browser checks require Playwright and an installed browser, using `JPY5_BROWSER_CHANNEL=msedge` on Windows when needed.

### Teacher adverbs for Lessons 13–20

Every Vocabulary page includes **老師副詞 · 例句・語感・練習**. All eight lessons share the same responsive cards, Traditional Chinese meanings and translations, teacher-source disclosures, comparison notes, cross-lesson links and hidden practice answers. The full eight-page handout contributes 34 grouped cards, 73 example blocks and 50 practice prompts. Lesson 13 now uses the shared format too. Ambiguous questions and simplified source rules are qualified beside the relevant content; reference answers are labelled as learning additions.

Edit `scripts/adverb-notes-data.mjs`, then run `node scripts/generate-adverb-notes.mjs` and `node scripts/generate-offline-manifest.mjs`. [Adverb source audit](ADVERB_SOURCE_AUDIT.md) records coverage and qualifications. Validate with `node scripts/test-adverb-notes.mjs`, `node scripts/test-lesson13-teacher.mjs`, `node scripts/test-pwa.mjs` and `node scripts/test-adverb-update.mjs` (set `JPY5_PREVIOUS_REF=HEAD` before committing). Existing vocabulary counts and saved progress are unchanged.

## Source

Most lesson material and audio are adapted for study use from [ttrw.jp](https://ttrw.jp/). Textbook PDF links are maintained centrally in `assets/common.js`:

- Lesson 13: [大家的日语中级2第13课](https://ttrw.jp/static/textbook//1027/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC13%E8%AF%BE.pdf)
- Lesson 14: [大家的日语中级2第14课](https://ttrw.jp/static/textbook//1028/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC14%E8%AF%BE.pdf)
- Lesson 15: [大家的日语中级2第15课](https://ttrw.jp/static/textbook//1029/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC15%E8%AF%BE.pdf)
- Lesson 16: [大家的日语中级2第16课](https://ttrw.jp/static/textbook//1030/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC16%E8%AF%BE.pdf)
# Optional Google progress sync

JPY5 works without an account and retains progress in browser localStorage. Google login is optional; after first login the app merges the existing local records with the account's cloud records, keeps a local guest snapshot for sign-out, and writes future changes locally first before batching them to Firestore. Cloud state is one owner-only document at `jpy5Users/{uid}` with `schemaVersion`, `progress` (the existing localStorage payloads keyed by their original localStorage keys), and a server `updatedAt` timestamp.

Sync includes Lessons 13–20. Returning logins merge offline records, writes use a Firestore transaction, and an account listener receives other-device progress. Histories merge by attempt ID, bookmarks retain the existing conservative union behavior, and dated quiz results resolve stale wrong-answer flags without removing unattempted mistakes. Theme preferences and unfinished quiz drafts remain device-local. The existing schema version, account path and owner-only rules are unchanged.

Quiz pages for Lessons 13–20 offer **繼續未完成測驗** and **開始新測驗**. A device keeps one unfinished run per lesson, including its mode, ordered question IDs, question signatures, answers and current position. Answers and navigation save immediately. Starting a new quiz replaces only that lesson's draft; finishing writes one history record with the run ID and clears its draft. Practice/exam and Lessons 18–20 no-hint mode share this lifecycle. An incompatible question-bank change or malformed draft shows a recovery message, while completed records remain intact. Revision checks reject stale-tab writes, and supported browsers serialize completion with Web Locks.

Local regression commands (browser suites require Playwright and an installed Edge, or `JPY5_BROWSER_CHANNEL`):

```bash
node scripts/test-quiz-reliability.mjs
node scripts/test-progress-sync-reliability.mjs
node scripts/test-firebase-sync.mjs
node scripts/test-grammar-no-hint.mjs
node scripts/test-pwa.mjs
```

The sync regression uses two isolated storage fixtures and a mocked Firestore service; it never logs in or writes real account progress. A live two-device Google account check is still a separate release verification.

Before releasing, enable Google in Firebase Authentication, add `yuktun.github.io` as an authorized domain, and deploy `firestore.rules` from this repository. The web configuration is public by design; Firebase Authentication and the owner-only Firestore rules enforce access control.
