# 日本語 Year 5

A mobile-friendly study site for **みんなの日本語 中級Ⅱ**. Chapter 13 is the first complete published lesson, with vocabulary, grammar, reading, listening, flashcards, quizzes, history, and mixed review.

## Run locally

No build step or dependencies are required.

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

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

Content is adapted from the user's Chapter 13 grammar, vocabulary, and textbook materials in Google Drive. Wording is kept concise for study use.
