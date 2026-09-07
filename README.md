# 日本語 Year 5

A mobile-friendly study site for **みんなの日本語 中級Ⅱ**. This draft establishes the Year 5 learning structure with Chapter 13 vocabulary, grammar, reading, listening, flashcards, quizzes, history, and mixed review.

## Run locally

No build step or dependencies are required.

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Structure

The dependency-free static site is organized around a homepage, a Chapter 13 learning hub, separate study-tool pages, and shared data/behavior modules under `assets/`.

### Current draft

- Vocabulary: 31 core words from the 159-word Chapter 13 source list, searchable list, and quick cards
- Grammar: eight source-grounded patterns, 22 example cards, two card directions, review queues, and saved progress
- Quiz: 24 questions, practice/exam modes, filters, retry, starring, and saved history
- Reading: the complete `ゲッキョク株式会社` text, Traditional Chinese translation, furigana and font controls, comprehension, answer-finding, vocabulary cards, mock exam, and mistake review
- Textbook/listening: the Chapter 13 `3. もう一度聞こう` dialogue, five underlined expressions, focused audio replay, flashcards, multiple choice, sentence ordering, dialogue fill-in, exact dictation, and mistake review
- Experience: responsive layout, automatic/light/dark themes, and app icons for browser/iPhone shortcuts

## Source

Content is adapted from the user's Chapter 13 grammar, vocabulary, and textbook materials in Google Drive. Wording is kept concise for study use.
