# Textbook grammar exercises: Lessons 14–20

## Scope and source coverage

The Grammar Notes pages place textbook meaning checks and numbered grammar exercises beside their matching grammar cards. The seven lesson PDFs were inspected as full-page scans: in every lesson the grammar exercise section is PDF pages **9–12**. These are PDF indices, not printed page numbers. Reading/listening comprehension, vocabulary lists, and the later integrated 問題 section are outside this addition.

| Lesson / textbook source | PDF pages | Printed pages | Groups | Sections | Response items | Answer PDF pages |
| --- | --- | --- | ---: | ---: | ---: | --- |
| [14](https://drive.google.com/file/d/1JWHjSZ8Zx4VTOK_4KdkyqXCPwg-1coTa/view) | 9–12 | 23–26 | 11 | 18 | 31 | [13–16 key](https://drive.google.com/file/d/11B7PYBhsThVzk6VA0RMB-h2nfBK8JfSt/view#page=7), 7–8 |
| [15](https://drive.google.com/file/d/1UYaasmfp5cXbxcLxF8HXcyBz5_RcEIh7/view) | 9–12 | 37–40 | 9 | 12 | 25 | [13–16 key](https://drive.google.com/file/d/11B7PYBhsThVzk6VA0RMB-h2nfBK8JfSt/view#page=10), 10–11 |
| [16](https://drive.google.com/file/d/1lvnV5pz-2_-t1g_ZTd37-fYDvn3z6g6K/view) | 9–12 | 51–54 | 10 | 16 | 25 | [13–16 key](https://drive.google.com/file/d/11B7PYBhsThVzk6VA0RMB-h2nfBK8JfSt/view#page=15), 15–16 |
| [17](https://drive.google.com/file/d/12UGc_n0xgCl_4TNz19AnXZ1g59IWo1-9/view) | 9–12 | 65–68 | 11* | 15 | 29 | [17–20 key](https://drive.google.com/file/d/1qDyavAA70k4fO1YDAho4jvgahTJBOwyM/view#page=3), 3–4 |
| [18](https://drive.google.com/file/d/18F81fFs-6enf3sLODqXtfLT3kPxMXCt2/view) | 9–12 | 79–82 | 8 | 14 | 29 | [17–20 key](https://drive.google.com/file/d/1qDyavAA70k4fO1YDAho4jvgahTJBOwyM/view#page=7), 7–8 |
| [19](https://drive.google.com/file/d/1HByfaUELEKEE05Ao8NMxEdsaoAMi7Xih/view) | 9–12 | 93–96 | 8 | 15 | 25 | [17–20 key](https://drive.google.com/file/d/1qDyavAA70k4fO1YDAho4jvgahTJBOwyM/view#page=10), 10–11 |
| [20](https://drive.google.com/file/d/1LK9U6MaWIo_FJgW8Y46X_pIs9qHegkst/view) | 9–12 | 107–110 | 12 | 20 | 35 | [17–20 key](https://drive.google.com/file/d/1qDyavAA70k4fO1YDAho4jvgahTJBOwyM/view#page=14), 14–16 |
| **Total** | **28 pages** | | **69** | **110** | **199** | |

*Lesson 17 has ten existing scored grammar cards. The textbook also checks the suffix **上（じょう）** on PDF page 9. Its check is preserved in a separate, unscored source appendix (`groups.ue`), rather than being attached to the unrelated means expression により. This makes eleven displayed exercise groups without changing the ten-card quiz/progress bank.*

The source mappings and counts were consolidated from the private extraction audits for lessons 14–15, 16–17, 18–19, and 20, then compared with the public lesson datasets. Independent visual comparison of all seven lessons and their answer pages is complete. The review covered questions, options, printed answers, models, and contextual ruby; identified corrections were applied, with no unresolved content issues. The full release regression suite is a separate check.

## Answers, models, and Japanese text

| Lesson | Fixed official answers | Answer-book examples | Omitted personal responses |
| --- | ---: | ---: | ---: |
| 14 | 16 | 14 | 1 |
| 15 | 12 | 12 | 1 |
| 16 | 13 | 9 | 3 |
| 17 | 9 | 19 | 1 |
| 18 | 13 | 13 | 3 |
| 19 | 9 | 13 | 3 |
| 20 | 19 | 14 | 2 |
| **Total** | **91** | **94** | **14** |

Closed choices and constrained sentence transformations use the printed official key. Open completions, advice, name-origin explanations, and situation responses retain the booklet's wording as labelled suggested examples; other answers may be valid. When the booklet prints 省略 for a personal task, the page states that omission and invites the learner to respond. No answer has been invented for those fourteen tasks. Dataset status names may distinguish personal activities from missing answers; the table counts both by their common source condition, an omitted personal-response key.

Printed exercise 例 models are retained, including long discussion models and models continued onto the next page. They are distinct from the explanatory example pairs already in the grammar cards. Word banks retain source alternatives, including an option consumed by a printed matching model. Prompt/key wording differences are preserved and qualified rather than silently rewritten.

Japanese prompts, options, word banks, printed models, answers, and original Japanese instructions use explicit hiragana ruby or the renderer's reading map. Source-page links identify the 1-based PDF page and, where supplied, its printed label. An item-level answer reference overrides a section reference when a key crosses pages. Chinese instructions supplement exercises whose source only supplies a label and model; explicit Japanese task instructions remain available in Japanese.

## Display, progress, and release boundaries

Exercise groups are collapsed by default. Each answer opens separately and starts hidden after reload. The exercises are public study material and do not score, alter quiz questions, or write learning progress. Existing teacher grammar demonstration access, adverb protection, Firebase authentication, and security rules retain their established boundaries.

Public delivery consists of the seven `assets/chNN-textbook-exercises-data.js` files, the shared `assets/textbook-exercises.js` renderer, page integration, and documentation. Text and code can be included in an explicitly requested offline package. Linked Drive PDFs need internet. Private downloaded PDFs, rendered PNGs, extraction metadata, and migration directories are excluded from public serving and offline inventory.

## Completed local validation

All seven lessons passed independent visual comparison with their source and answer scans, including contextual ruby. Dataset checks passed for JavaScript evaluation, expected IDs/counts, unique response IDs, answer provenance, and Japanese annotation coverage. Synthetic renderer tests and integration checks passed for all 199 items, 69 groups, and 110 sections at three widths and in two themes, including keyboard/touch operation, every answer, initial/reloaded collapse state, and progress retention.

The focused offline test passed with an explicitly downloaded 232-resource package and seven newly opened offline tabs: all 199 items, native first/last answer disclosures, ruby, valid retained drafts/bookmarks, and the Lesson 17 source appendix were checked. Lesson 14 protected bodies stayed empty, and the run made zero PDF, source, or protected-content requests. The broader offline suite passed all 73 pages and 232 resources, including updates, failures, cancellation, removal, eviction, and retry after browser shutdown. Lesson 13's original 21 textbook exercises passed offline and isolation checks.

Regression checks also passed 142 quiz-reliability assertions across Lessons 13–20, the protected adverb/grammar demonstration browser checks, seven controller unit checks, 29 private-fragment checks, parity, and sync checks. These are completed local results for an unpublished change; no Firebase, authentication, or protection settings were mutated.

Run the focused and existing regression checks after changes:

```bash
npm run test:textbook-renderer
npm run test:textbook-14-20
npm run test:textbook-offline
node scripts/test-lesson13-textbook-exercises.mjs
node scripts/generate-offline-manifest.mjs
node scripts/test-offline-manifest.mjs
node scripts/test-pwa.mjs
```

The browser checks require Playwright and an installed supported browser; set `JPY5_BROWSER_CHANNEL=msedge` on Windows when needed. The completed results above describe local validation only; this change has not been published. No deployment, account action, or security-rule change was performed for this content addition.
