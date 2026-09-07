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

Most lesson material and audio are adapted for study use from [ttrw.jp](https://ttrw.jp/). Textbook PDF links are maintained centrally in `assets/common.js`:

- Lesson 13: [大家的日语中级2第13课](https://ttrw.jp/static/textbook//1027/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC13%E8%AF%BE.pdf)
- Lesson 14: [大家的日语中级2第14课](https://ttrw.jp/static/textbook//1028/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC14%E8%AF%BE.pdf)
- Lesson 15: [大家的日语中级2第15课](https://ttrw.jp/static/textbook//1029/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC15%E8%AF%BE.pdf)
- Lesson 16: [大家的日语中级2第16课](https://ttrw.jp/static/textbook//1030/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC16%E8%AF%BE.pdf)
