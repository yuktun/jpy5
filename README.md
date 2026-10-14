# 日本語 Year 5

A mobile-friendly study site for **みんなの日本語 中級Ⅱ**. Lessons 13–16 provide vocabulary, grammar, reading, listening, flashcards, quizzes, history, and mixed review.

## Run locally

No build step or dependencies are required.

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Offline app and updates

Open the published site once while online and wait for the small **「離線內容已準備好」** status. It then saves the complete same-origin study app for offline startup: the homepage, all 36 lesson pages, local CSS and JavaScript (including vocabulary, grammar, flashcards, quizzes, reading, notes, review and history data), and the app icon. The generated inventory currently contains 86 resources and is checked in at `assets/offline-assets.js`.

When a release is available, it is downloaded and validated in a separate cache while the current version continues to run. The app shows **「發現新版本」** only after that download succeeds. Select **「立即更新」** to activate it and reload; select **「稍後」** to continue studying. Existing quiz, review, bookmark, remark, answer and preference data remain in the existing browser-local `jpy5.chapter13.`–`jpy5.chapter18.` keys. Google progress sync is optional; without login, nothing is sent to another device.

For contributors: after changing any page or `assets/` resource, run the following before committing so the new release receives a new, complete cache version:

```bash
node scripts/generate-offline-manifest.mjs
```

### iPhone and audio limitations

The manifest retains the existing name and icon, so an existing Home Screen shortcut receives the service worker the next time it is opened online; it does not need to be deleted and reinstalled. iOS can evict website storage when device space is low and does not guarantee background download completion. If the status says preparation is incomplete, reconnect, keep the app open, and reload until it reports ready.

The official lesson audio and textbook PDFs are served by `ttrw.jp`, not this GitHub Pages app, and their responses do not permit a verified same-origin precache. They may work from the browser's own cache but are **not guaranteed offline**. Vocabulary pronunciation uses the device's `speechSynthesis` Japanese voice; it works offline only when iOS/macOS/Android has a Japanese voice installed locally. Install a Japanese system voice and test it before relying on offline pronunciation.

### Troubleshooting

- If a page says offline content is not ready, reconnect and reopen the app; do not clear site data unless you accept losing local progress.
- If an update prompt does not appear, close/reopen the app while online. Updates are intentionally never forced during a study session.
- If iPhone has reclaimed storage, revisit the site online and wait for the ready status again.

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
