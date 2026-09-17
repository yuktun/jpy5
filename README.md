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

When a release is available, it is downloaded and validated in a separate cache while the current version continues to run. The app shows **「發現新版本」** only after that download succeeds. Select **「立即更新」** to activate it and reload; select **「稍後」** to continue studying. Existing quiz, review, bookmark, remark, answer and preference data remain in the existing browser-local `jpy5.chapter13.`–`jpy5.chapter16.` keys. Nothing is synced between devices.

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

## Source

Most lesson material and audio are adapted for study use from [ttrw.jp](https://ttrw.jp/). Textbook PDF links are maintained centrally in `assets/common.js`:

- Lesson 13: [大家的日语中级2第13课](https://ttrw.jp/static/textbook//1027/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC13%E8%AF%BE.pdf)
- Lesson 14: [大家的日语中级2第14课](https://ttrw.jp/static/textbook//1028/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC14%E8%AF%BE.pdf)
- Lesson 15: [大家的日语中级2第15课](https://ttrw.jp/static/textbook//1029/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC15%E8%AF%BE.pdf)
- Lesson 16: [大家的日语中级2第16课](https://ttrw.jp/static/textbook//1030/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC16%E8%AF%BE.pdf)
