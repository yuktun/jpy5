# 日本語 Year 5

A small, mobile-friendly study site for **みんなの日本語 中級Ⅱ**. The first prototype focuses on Chapter 13 grammar with concise Traditional Chinese notes, formation rules, source-based examples, and an eight-question practice flow.

## Run locally

No build step or dependencies are required.

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Structure

```text
index.html              Homepage
chapter-13.html         Chapter 13 grammar lesson and quiz
assets/styles.css       Shared visual design and responsive layout
assets/chapter-13.js    Grammar content and quiz behaviour
```

## Source

Grammar explanations and example sentences are adapted from the user's Chapter 13 material, `g_2_13.pdf` (*みんなの日本語中級Ⅱ 第13課*). Wording is kept concise for study use.
