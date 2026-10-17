# Lesson 13 teacher-additions source audit

## Textbook grammar exercises added 2026-10-17

The supplied textbook PDF was visually checked at PDF/printed pages 9-12. The two supplied copies have identical content. These pages are the source of the question wording, word bank and worked examples in `assets/ch13-textbook-exercises.js`. Traditional Chinese directions and explanations are learning aids. No PDF or scan is bundled with the site.

| Grammar ID | PDF page | Response items |
| --- | --- | --- |
| tate | 9 | 1 comprehension choice |
| tatoe | 9 | 1 comprehension choice |
| tarishinai | 9 | 1 comprehension choice |
| hodo | 10 | Practice 1: 3; Practice 2: 3 |
| ndatte | 10 | 1 comprehension choice |
| nagara | 10-11 | Practice 1: 3; Practice 2: 2; Practice 3: 1 personal response |
| tsumari | 11 | Practice 1: 2; Practice 2: 1 personal response |
| yone | 12 | 2 choices |

Sources: [textbook](https://ttrw.jp/static/textbook//1027/%E5%A4%A7%E5%AE%B6%E7%9A%84%E6%97%A5%E8%AF%AD%E4%B8%AD%E7%BA%A72%E7%AC%AC13%E8%AF%BE.pdf), [answer scan](https://drive.google.com/file/d/11B7PYBhsThVzk6VA0RMB-h2nfBK8JfSt/view). The answer scan is a separate 16-page Lessons 13-16 key; only the Lesson 13 grammar material on pages 3-4 was consulted. Personal activities `nagara` Practice 3 and `tsumari` Practice 2 are omitted in that key; this app supplies clearly labelled original example responses. Other open completions allow grammatically and contextually appropriate alternatives. No answers from Lessons 14-16 were imported.

The two `yone` choices are both **a**. In the first, the respondent confirms information about their own country with `そうですよ`; this is not an instruction to echo every `よね` with `よね`. In the second, the respondent did not know the sorting rule, so the speaker supplies new information with `よ`.

The integration is optional in the shared notes renderer and loaded only by Chapter 13. It changes no grammar IDs, scored keys, storage schema, flashcards or quiz drafts. Each of the eight exercise groups is collapsed by default, styled like the teacher supplements; each of the 21 answers remains in a separate native disclosure. Japanese fields use explicit, locally checked hiragana readings through the existing teacher-supplement ruby renderer. Contextual readings distinguish 人気 (にんき), 二人 (ふたり), 双子 (ふたご), 月に１回 (つきにいっかい), 来られない (こられない), 話す (はなす) versus the noun 話 (はなし), and 出したり (だしたり) versus 出る (でる). Chinese explanations are not annotated. `scripts/test-lesson13-textbook-exercises.mjs` checks source grouping, individual keyboard/mouse disclosure, closed-on-reload behavior, layouts and progress retention, with no automatic PDF requests.

Reviewed on 2026-10-13. Scope: all 35 new explanatory notes and the new writing task, plus the reading references directly implicated by these notes. This is a content audit as well as an implementation check. It does not certify every older exercise in every lesson.

## Evidence and study guidance

Use the original passage for what the author says. Use the handouts for classroom tasks and the teacher's interpretation. When an explanation overstates a language rule, the module marks the clarification as **校對補充** and links the dictionary or research behind it. An app-authored practice example is labelled as an example, rather than an official answer.

The teacher's scanned slides and worksheet pages were inspected visually, including the surrounding instructions and answer choices. Their PDFs contain little usable text, so empty text extraction was not treated as evidence of missing content. The two supplementary handouts were read through the Drive connector. Original textbook PDF pages 2 and 3 were rendered at 150 dpi and inspected directly.

| Source | PDF pages used | Link |
| --- | --- | --- |
| 10 October grammar slides | 2-16 | [Teacher PDF](https://drive.google.com/file/d/1xE8nqBQAB_Gamy-ua1iPKJiAp8wiqhP0/view) |
| 10 October grammar worksheet, 12:13 scan | 1-6 | [Teacher PDF](https://drive.google.com/file/d/1Qkyqjn4rst2D7O0qx1Me6qdvJERJCp44/view) |
| 3-10 October conversation supplementary handout | 2-3 | [Teacher PDF](https://drive.google.com/file/d/1Z-5D5mcDUC2sdVyfXTcG5gLnA-_npS0m/view) |
| 10 October speaking/listening slides | 8-17 | [Teacher PDF](https://drive.google.com/file/d/1fi0FdYC_VpPmmoKffr10FZFqiR0im1_p/view) |
| 10 October practice supplementary handout | 2 | [Teacher PDF](https://drive.google.com/file/d/1jQcboaBOZfQtYhUf0bX9iYeskGLkXwJT/view) |
| 3 October reading slides | 3, 6, 10, 11, 13 | [Teacher PDF](https://drive.google.com/file/d/1BT5vY2PLstzvBTE6vyozA2FG-VcyppoE/view) |
| 19 September reading slides, admission-price reading | Section on 大人／小人 | [Teacher PDF](https://drive.google.com/file/d/1mTDBdsysjEkkSFsCNO-6LTjTJHSgeyEM/view) |
| Original Lesson 13 textbook | PDF 2: passage; PDF 3: exercises | Reviewed from the previously downloaded `tmp/pdfs/lesson13-textbook.pdf` |

Page references displayed in the app refer to PDF page numbers, not the textbook page numbers printed inside a handout.

## Corrections and qualifications

1. **Colleague practice: ～そうですよ / ～そうですね.** The earlier addition suggested bare `そうですね？` too loosely as a confirmation replacement. The corrected note distinguishes a complete hearsay sentence from a standalone conversational response. The scaffold now contains complete example sentences, including the textbook's hearsay confirmation. The teacher slide's use of `よ` to introduce information is retained. The [Japan Foundation's explanation of hearsay そうです](https://www.jpf.go.jp/j/urawa/j_rsorcs/textbook/setsumei_pdf/setsumei19_4.pdf) provides both the plain-form connection and examples ending in `よ` and `ね`.

2. **言うんです / 言ったんです.** The handout's continuing-emotion explanation is identified as the teacher's interpretation of this conversation. The correction explains that nonpast forms can recount past events; applying that account to this line is an analysis, not a prescribed answer in the research. Past tense does not prove that the emotion has ended. Evidence: [Kodama (2011), functions and viewpoints of the historical present in personal narratives](https://www.jstage.jst.go.jp/article/nihongokyoiku/148/0/148_114/_article/-char/ja/).

3. **いくら～ても.** Grammar slide 9 states an overly absolute restriction against unlikely events. The module keeps the useful contrast with `たとえ`, but explicitly avoids teaching that `いくら` cannot be hypothetical. The dictionary includes its use with hypothetical concessive conditions. Evidence: [Shogakukan's 精選版 日本国語大辞典, 幾ら](https://kotobank.jp/word/%E5%B9%BE%E3%82%89-431526).

4. **どうにか.** The app's earlier phrase "順利完成" overstated the result. The corrected explanation says he managed to finish; smoothness and perfection are not part of the word's meaning. Evidence: [Shogakukan's dictionary entry](https://kotobank.jp/word/%E3%81%A9%E3%81%86%E3%81%AB%E3%81%8B-581113).

5. **Reading ending.** Reading slides 3 and 6 and the textbook exercises simplify the ending. The original distinguishes an old sound returning in Ikebukuro from the inner voice not misreading in Aomori. The app preserves that contrast. Original exercises and their reference answers remain available for source comparison, with visible cautions beside the affected questions and answers; they are not presented as a complete summary of the passage.

6. **Sixth year / six years later.** The passage says `在日６年目にして`; textbook completion question 4 says `６年後`. Those are not precise synonyms. A visible caution directs passage summaries to use "in his sixth year in Japan". The copied exercise wording is identified as the source's wording.

7. **Writing instruction.** The earlier added headline omitted the requirement to use all four time expressions. It now includes `～の頃`, `そのうち`, `～か月目／年目にして`, and `今でも`, matching reading slide 13. The draft remains ungraded and approximately 400 characters, as the task specifies.

8. **～たて error-finding exercise.** `ご飯を食べたてだ` is deliberately supplied as an incorrect sentence for students to fix. The note now says so explicitly; it is neither a correct model nor evidence of an accidental teacher typo.

9. **逆さま.** The handout's distinction is valid when read as a distinction between the base word and its function in a sentence. The module clarifies noun/な-adjective classification versus adverbial use of `逆さまに`. Evidence: [Shogakukan's 逆様 entry](https://kotobank.jp/word/%E9%80%86%E6%A7%98-508991).

10. **Related older reading references.** The admission-price exercise's app-authored answer and furigana now use the lesson's specified `小人＝しょうにん`, rather than `こども`. Evidence: the 19 September slide and [Shogakukan's 小人 entry](https://kotobank.jp/word/%E5%B0%8F%E4%BA%BA-503912). The final quoted `月極` retains the source's `ゲッキョク` furigana, but the popup explicitly identifies it as the story's quoted misreading. The lexical reading to learn remains `つきぎめ`; see [Shogakukan's explanation](https://domani.shogakukan.co.jp/808737).

## Complete coverage of the additions

| Module entry | Source / PDF pages | Audit result |
| --- | --- | --- |
| Grammar: ～たて | Grammar 2-7 | Correct meaning and connection; deliberate wrong example labelled |
| Grammar: たとえ～ても | Grammar 8-10 | Useful contrast retained; absolute いくら restriction qualified |
| Grammar: ～たりしない | Grammar 11-13 | Emphatic negative meaning and た-form connection checked |
| Grammar: ～ほど | Grammar 14-16 | Degree, approximate quantity, and negative comparison distinguished |
| Grammar: ～んだって | Worksheet 3 | Hearsay and rising confirmation distinguished; noun/な-adjective connection checked |
| Grammar: ～ながら | Worksheet 3-4 | Concessive use distinguished from simultaneous actions |
| Grammar: つまり | Worksheet 4 | Paraphrase/confirmation checked; no mandatory coupling with ってこと |
| Grammar: ～よね | Worksheet 4-5 | Four contextual examples checked; no universal anger interpretation |
| Dialogue: でしょ | Conversation 2 | Agreement and informal register checked |
| Dialogue: どうにか | Conversation 2 | "Managed to finish" replaces overstated smoothness |
| Dialogue: ってとこかな | Conversation 3 | Approximate equivalence and tentative tone checked |
| Dialogue: 言うんですよ | Conversation 3 | Teacher interpretation distinguished from a universal tense rule |
| Dialogue: それが | Conversation 3 | Unexpected development checked |
| Dialogue: そうそう | Conversation 3 | Recollection in this context checked; worksheet alternatives not combined as answers |
| Dialogue: もいいところ | Conversation 3 | Excessive degree and self-directed exasperation checked |
| Practice: 1a, friends | Speaking/listening 8-9 | Respond, associate, change topic, confirm |
| Practice: 1b, colleagues | Speaking/listening 10 | Hearsay/confirmation explanation corrected; examples labelled |
| Practice: 2a, friend's mistake | Speaking/listening 11-12 | Empathy scaffold checked |
| Practice: 2b, senior colleague | Speaking/listening 13 | Polite empathy scaffold checked |
| Practice: 3a, 住めば都 | Speaking/listening 14-16 | Ask, explain, paraphrase, confirm |
| Practice: 3b, 猿も木から落ちる | Speaking/listening 15, 17 | Same four-step scaffold checked |
| Vocabulary: 逆さま | Practice handout 2 | Base classification / adverbial function distinguished |
| Vocabulary: どうにか | Conversation 2 | Managed completion, without implying perfection |
| Vocabulary: 我慢強い | Worksheet 5 | Neutral negative 我慢強くない checked |
| Vocabulary: 絞る | Worksheet 5 | Squeezing/juicing sense and object を checked |
| Vocabulary: 入社する | Grammar 7 | Joining a company and 入社したて checked |
| Vocabulary: 口に出す | Grammar 13 | Saying aloud and たりしない example checked |
| Vocabulary: たまる | Worksheet 5 | Intransitive accumulation with が checked |
| Vocabulary: ルーズ | Worksheet 6 | Japanese sense not equated with every English loose sense |
| Vocabulary: 落ちる | Worksheet 6 | Sales declining with が checked |
| Vocabulary: 入り直す | Worksheet 6 | Re-entering university with に checked |
| Vocabulary: あきる | Worksheet 6 | Object of boredom with に checked |
| Vocabulary: 流れ | Reading 11, 13 | Organization/development of the passage checked |
| Reading: oral presentation | Reading 10 | Conclusion, example, reason scaffold checked |
| Reading: ending clarification | Reading 3, 6 + original passage | Original place contrast made explicit |
| Reading: writing task | Reading 13 | All four required expressions restored |

## Implementation verification

The additions still attach to all eight grammar IDs, seven unique dialogue rows, six practice IDs, and twelve existing vocabulary entries. The existing 159 vocabulary entries, five listening targets, seven listening questions, thirteen reading questions, and scored answer keys are unchanged.

Passed after the corrections:

- `node scripts/test-lesson13-additions.mjs`: all note/source mappings; rendered correction links; source cautions visible before and after answer reveal; restored writing instructions; drafts, furigana, accessible disclosures, and layouts at 390, 810, and 1280 pixels.
- `node scripts/test-lesson13-reading.mjs`: preserved scored IDs/keys, corrected admission-price reading, textbook tasks, draft persistence, and desktop/iPad/mobile layouts.
- `node scripts/test-lesson13-listening.mjs`: data integrity, saved drafts, hidden answers, shadowing, and responsive layouts.
- `node scripts/test-lesson13-teacher.mjs`: existing supplementary exercises, answer disclosure, word help, and layouts.
- `node scripts/test-pwa.mjs`: 73 pages and 215 cached resources, including corrected notes and data.
- JavaScript syntax checks and `git diff --check`.
