# Lessons 17–18 implementation plan

## Status

The school source pack was subsequently retrieved from the user-provided Google
Drive folders and is now inventoried in `LESSON17_SOURCE_AUDIT.md` and
`LESSON18_SOURCE_AUDIT.md`. The documents are intentionally kept out of the
application cache: they are source material, not public application assets.

## Existing baseline selected by feature

| Feature | Baseline | Reason |
| --- | --- | --- |
| Lesson hub and progress | `chapter-16.html`, `assets/ch16-hub.js` | Current complete lesson hub and module progress display. |
| Vocabulary and flashcards | `chapter-16-vocabulary.html`, `assets/ch16-vocabulary-data.js`, `assets/ch16-vocabulary.js` | Complete categorised list, bidirectional cards, reviews, shuffle and swipe support. |
| Grammar notes and supplementary modal | `chapter-16-notes.html`, `assets/ch16-data.js`, `assets/ch16-grammar-extra-data.js`, `assets/notes.js` | Current source-pattern schema and per-pattern supplementary coverage renderer. |
| Reading | `chapter-16-reading.html`, `assets/ch16-reading-data.js`, `assets/ch16-reading.js` | Current furigana, translation and comprehension flow. |
| Listening/textbook | `chapter-16-textbook.html`, `assets/ch16-conversation-data.js`, `assets/ch16-conversation.js` | Current source-link, whole-track playback and graceful replay fallback. |
| Quiz, review and history | `chapter-16-quiz.html`, `chapter-16-review.html`, `chapter-16-history.html`, `assets/ch16-quiz.js` | Current assessment and progress experience. |
| Storage and shared interactions | `assets/ch16-common.js` | Lesson-local namespace (`jpy5.chapter16.`), theme and swipe utilities. |
| PWA | `scripts/generate-offline-manifest.mjs`, `scripts/test-pwa.mjs`, `assets/offline-assets.js`, `sw.js`, `assets/pwa.js` | Generated same-origin cache inventory and non-disruptive update behaviour. |

## New files required per lesson

- Nine module pages: hub, vocabulary, notes, flashcards, reading, textbook,
  quiz, review and history (`chapter-17*.html`, then `chapter-18*.html`).
- Lesson-local common, hub, vocabulary/data, grammar data and supplementary
  data, reading/data, conversation/data, and quiz scripts under `assets/`.
- `LESSON17_SOURCE_AUDIT.md` and `LESSON18_SOURCE_AUDIT.md`.
- A content-integrity test that compares source inventories with the lesson
  data, grammar IDs and supplementary coverage.

## Existing files requiring modification after verification

- `index.html`: verified Lesson 17 and 18 cards and first-semester wording.
- Every applicable module lesson-switcher: add both lessons consistently.
- `scripts/test-pwa.mjs`: replace the present brittle 37-page expectation with
  an inventory-derived assertion when the new page inventory exists.
- Generated `assets/offline-assets.js` after `node scripts/generate-offline-manifest.mjs`.

## Required authoritative material

The required source PDFs have been identified. Their filenames, Drive IDs,
counts and confirmed audio links are recorded in the lesson audits. The
publisher's public table of contents is corroborative only; the supplied PDFs
remain the source of truth for data extraction.

## Quality gate after sources arrive

1. Complete Lesson 17 source audit and data extraction before creating Lesson
   18 curriculum data.
2. Check every vocabulary entry, grammar pattern and printed example against
   the source inventory; require unique grammar IDs and complete supplementary
   coverage.
3. Verify the Lesson 17 pages, storage isolation (`jpy5.chapter17.`), assets,
   navigation and scripts; run the PWA generator and tests before moving on.
4. Repeat independently for Lesson 18 with `jpy5.chapter18.`.
5. Regression-test Lessons 13–16 without changing their content or learner
   stores; then create separate commits and push a `codex/` feature branch.

## Features that must remain unchanged

- Lessons 13–16 educational data, local progress, review state and theme
  preference.
- Existing learner storage namespaces.
- Shared visual language and responsive layout.
- PWA explicit-update behaviour and GoatCounter backend-only analytics.
