# Lesson 18 source audit

Status: school vocabulary and grammar PDFs verified directly on 2026-09-19.
The textbook inventory remains limited to its previously inspected metadata and
audio links; no Lesson 18 learning dataset is implemented by this audit.

## Authoritative sources

- School vocabulary PDF: Google Drive file ID `1V3WSk6ggOp77KnCt3XkKEftTXk3k2crK`
  (`japanese_vocab_lv2_ch18.pdf.pdf`), six pages; directly inspected at the
  supplied local path.
- School grammar PDF: Google Drive file ID `1gQdp-sbNHMYeVd6x-WMmXh1i-dr2hpRI`
  (`g_2_18.pdf`), four pages; directly inspected at the supplied local path.
- Textbook: [大家的日語 中級II 第18課](https://ttrw.jp/static/textbook//1032/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC18%E8%AF%BE.pdf), HTTP 200, 24 PDF pages.

## Verified vocabulary inventory

The vocabulary PDF contains **108** numbered entries in this source order:

| Section | Entries |
| --- | ---: |
| 文法・練習 | 1–18 (18) |
| 話す・聞く | 19–46 (28) |
| 読む・書く | 47–108 (62) |

All six pages were read directly. Each row provides kana, Japanese writing,
classification, and Traditional Chinese meaning; the source order, spellings,
readings, meanings, verb group/transitivity labels where printed, and section
membership are now authorized for dataset transcription. The PDF prints `-` in
some writing cells; preserve that source notation rather than inventing kanji.

## Verified grammar inventory

The grammar PDF contains **eight** patterns and **39** numbered printed
examples, in this order:

1. `に違いない` — 4 examples
2. `に比べて` — 4 examples
3. `ものだ／ものではない` — 9 examples
4. `～た` (discovery: `あった／いた`) — 3 examples
5. `だって、…` — 4 examples
6. `～たところで` — 5 examples
7. `Nだって` — 5 examples
8. `こそ` — 5 examples

Patterns 1–3 are grouped under 読む・書く; 4–8 under 話す・聞く. Every numbered
example was checked against the four-page PDF. The previous inventory's pattern
5 label, `だって、…もの`, was too narrow: the printed heading is `だって、…`;
`だって…もの／もん` appears in the usage explanation and examples. Preserve that
distinction. The source says this form is often used by children or women; do
not turn that observation into an absolute restriction.

## Textbook inventory

- Reading title recorded by the prior inventory: `鉛筆削り（あるいは幸運としての渡辺昇①）`.
  The image-based pages still require visual transcription for paragraph count,
  page numbers, and printed comprehension exercises.
- Conversation title recorded by the prior inventory: `あなたこそ、あの本の山はいったい何なの！`.
  Dialogue pages, speaker labels, blanks, listening prompts, and printed answer
  keys require visual inspection; no transcript or answer is authorised yet.
- The inspected textbook has no machine-readable evidence of sentence timestamps.

## Verified audio references

- MP3 1–17: `https://ttrw.jp/static/sound/sound202406141718354184.mp3`
- MP3 1–18: `https://ttrw.jp/static/sound/sound202406141718354246.mp3`
- MP3 1–19: `https://ttrw.jp/static/sound/sound202406141718354323.mp3`

These URLs are printed in the textbook PDF. Accessibility of a URL does not
verify dialogue answers, comprehension answers, transcript wording, or timing.

## Existing Lesson 18 files

No `chapter-18*.html`, `assets/ch18-*.js`, or Lesson 18 datasets exist on this
branch. No Lesson 18 implementation scaffolding will be reused.

## Implementation order and completion criteria

1. Transcribe the verified 108 vocabulary entries and eight grammar patterns/39
   examples into source-derived datasets.
2. Render the textbook's reading and dialogue pages, then record exact text,
   paragraph boundaries, prompts, blanks, and any printed answers.
3. Create source-derived datasets before supplementary teaching material.
4. Reuse Lesson 17's module architecture, isolated `jpy5.chapter18.` storage,
   responsive switcher, time-based Auto theme, and offline-manifest checks.
5. Do not enable answer scoring or focused replay without verified answers and
   timestamps.

Vocabulary and core-grammar implementation is now authorized. Completion still
requires visual verification of every source-supported reading/listening field;
no educational content is implemented by this audit.
