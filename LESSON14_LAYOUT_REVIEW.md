# Lesson 14 layout and content-boundary review

Layout revision based on `40b3d7d045e48f71d05748516ca248051fef8f62`. This static update requires no Firebase configuration, document or authorization changes.

## Proposed public content

The ordinary notes, flashcards, quiz and history pages return to their original single-document layout. General grammar loads without sign-in or an embedded frame. The large access header and its status/logout controls are absent. The existing lesson/module selector remains; the duplicate inner lesson pills are removed.

This restores the original 11 grammar patterns, 46 examples, 57 flashcards, 33 quiz questions, seven application-authored explanation modules and 68 associated ruby entries. Their original data, answers and readings are compared against the pre-protection revision. Existing hash-based quiz signatures and storage IDs remain compatible.

Compatible older raw-signature drafts are converted synchronously before the public quiz starts, using the unchanged current question bank and its existing fingerprints. Answers, question order, position and revision ownership remain intact. Incompatible/corrupt drafts retain the original quiz progress safeguards.

The linked public textbook is *大家的日語中級2 第14課*, available from the repository's existing ttrw.jp textbook link. The 28-page scan was downloaded and its grammar pages 9-12 (printed pages 23-26) visually inspected. Their eleven grammar headings and sequence correspond to the application's eleven patterns. The repository's original study-flow commit identifies ttrw.jp as the overall material source. The separate explanation module identifies itself as an application learning addition independent of the original school grammar data.

This supports treating the core grammar and application explanations as general study material under the user's revised scope. It does **not** establish individual authorship of every translation, explanation, generated exercise or example. There is no independent teacher-specific attribution for those fields. The approved public scope includes this dataset and its offline copies with that provenance limitation disclosed.

## Current public adverbs and remaining grammar authorization

The user explicitly revised the lesson 14 review/Exercise scope after confirming the same review notes are available to another class. That review, its word definitions/usages and attached answers/help are now public static content and part of the optional offline package. The user subsequently approved the vocabulary page’s collapsed 老師副詞筆記 as public because other classes also have it. Its original 4 cards, 8 example blocks, 7 practice prompts, 2 hidden answer panels, source explanations and editorial additions are restored as static content, available without sign-in or Firebase and in the optional offline package. Its native outer disclosure remains closed initially. The redundant adverb field in the existing Firestore document is unchanged. The existing Home page remains the account-management entry point.

No separate teacher-authored lesson 14 grammar-note dataset was found. Each grammar card therefore has a closed demonstration labelled Teacher's notes. Its body stays empty until Firebase authorizes a read of the existing protected document. All eleven cards share one request with a field mask returning only schemaVersion; no handout or grammar text is downloaded for this demonstration. Signed-out, denied, error, logout and offline states keep or clear the body to empty. The existing controller periodically revalidates authorization and limits the display lease.

The exact dummy text "Teacher's notes here" is intentionally non-secret and is shipped in the public module/offline package. Only its display is gated; this is a UI demonstration, not protection of that literal. Any still-protected teacher text remains server-only. New real teacher grammar notes would need a separately reviewed private content mapping; this revision does not fabricate notes or upload replacements.

Phrases already shared with the public textbook/general exercises cannot be made private by protecting a teacher handout. The public adverb restoration is compared byte-for-byte with the ignored migration fragment. Security checks continue to cover the remaining authorization boundary using synthetic protected fixtures.

## Proposed live changes and limitations

If approved, publish only the reviewed static revision to yuktun/jpy5. No Firestore rules, UID grants, account credentials, note document import or Drive permission change is required. The current schema-v2 document can retain its redundant exercises, adverbs and grammarJson fields; removing them is optional future cleanup requiring separate approval. The existing Firestore document remains unchanged. Old offline packages remain pinned until explicitly updated. Cache retirement continues to remove the remaining protected grammar-bearing files; the approved public review and vocabulary/adverb pages are no longer retired.

This adverb follow-up is based on published revision `2cb386d9fe158d8ccc18b6d43c3f09d93afd8fee`. Lesson 13, lessons 15-20, unrelated vocabulary/reading/listening and the classmates repository remain outside this change. Publication requires separate release approval; no push or deployment is included.

The annotated Library screenshot was resolved, but the official materialization helper could not apply Library metadata on this Windows environment; its native image read returned metadata rather than pixels. No local screenshot was claimed as verified. Layout work follows the supplied description and the actual lesson 13/14 DOM. This screenshot inspection limitation remains open.

## Local review interaction follow-up

The review module now restores its original public exercise shell, matching lesson 13. The original header, source link and exercise disclosures provide the layout directly; there is no authorization gate, extra outer disclosure or green padded wrapper. The source PDF retains its original label and the existing automatic network indicator, shown once.

Because the review is static public content, its controls are available when the existing shared lesson 13 interaction script starts. This resolves the previous late-loading mismatch without changing that shared script or the protected loader. Mouse hover, keyboard focus/activation/Escape and touch tap/outside/scroll dismissal use the same code as lesson 13. Answer labels toggle with their original wording. The public review remains available when signed out and offline; the other protected sections retain their existing clearing behavior.

This follow-up changes no protected payload or Firebase state. A hash comparison against the original public source confirms unchanged review wording, ruby, all 33 word definitions/usages (six in the top word bank), thirteen answer panels and source markup. Signed-out browser tests block Firebase access and verify that the review makes no protected-content requests. The new supplied screenshot could not be materialized after one bounded retry because the supported metadata helper is unavailable on Windows; comparison used the inspected screenshot description and actual lesson implementations. This follow-up is local and unpublished pending review.

## Local public-adverb validation

The lesson 14 generator record was restored from the original public revision. Its generated inner fragment matches the ignored migration copy exactly after newline normalization. A scope check confirms the rest of the vocabulary page and the Firestore rules, authorization modules and progress sync are unchanged from the published base. Other lessons' pages remain unchanged.

Passed: generator consistency; static boundary/parity; 232 offline resource hashes; all eight adverb inventories and interactions at 390/810/1280 pixels in light/dark themes; lesson 14 native summary keyboard/touch controls while signed out with Firebase blocked and zero protected reads; lesson 13 teacher regression; public review parity/interactions; grammar layout/progress regression; seven authorization unit tests; synthetic protected loader/autoload and eleven-panel grammar authorization tests. The real worker upgrade from the published base retains progress, preserves the old package until an explicit update, then serves public adverbs in a fresh offline tab while grammar demo bodies remain empty. Full offline regression passed all 73 pages, download/cancellation/retry, integrity failure, cold start, update/removal, eviction and interrupted-download recovery.

The offline package remains opt-in, with version `f063e205435580b3` and 232 resources. No PDF is downloaded or cached. Local browser screenshots were inspected only in the workspace; none were uploaded. No push, deployment, Firebase state, credential or classmates-repository change was performed for this follow-up.

## Flashcard prompts and module navigation follow-up

Based on published `00325d1c5e17ae0c411c9397ec09ff48afe6474c`, the shared flashcard renderer now shows only the position above a Chinese-to-Japanese question. The Japanese pattern label and answer details appear on flip, then disappear when returning to the question or changing cards/decks/direction/filter/order. Answer details are created only while revealed; accessible descriptions follow the visible side. Japanese-to-meaning prompts remain intact. Keyboard activation of other controls no longer triggers the global flip shortcut, and an empty filter displays its message even after a revealed card. Storage keys, IDs, scoring and saved order/progress are unchanged. All eight flashcard pages use the updated script URL.

The layout audit covered the lesson 14 hub and all eight study modules. Flashcards, Quiz and History were missing the peer lessons' rounded six-lesson bar; each now has exactly one below the hero. Vocabulary, Notes, Reading, Listening/Textbook and Review already use one compact lesson/module selector like their peers; no second nested bar or frame was added. The hub retains its five module cards and grammar subtools. Grammar authorization, public adverbs/review/textbook exercises and all PDF links retain their scope.

Headless **Microsoft Edge** on the user's computer passed all 378 reverse fronts across lessons 13–20, both decks and directions, screen-reader descriptions, keyboard/touch flip, next/back/filter/shuffle/reload reset, existing progress retention, and all nine lesson 14 pages at 390/810/1280 pixels in light/dark themes. The actual service-worker upgrade from the published release reproduces the old leak before update, retains the old package until explicitly updated, then fixes a fresh offline tab while preserving progress, public adverbs and empty grammar gates. Seven authorization unit tests, synthetic grammar/loader browser tests, general grammar/quiz resume/history, static boundary checks, all 232 resource hashes and the full 73-page offline suite passed. Native iPhone/Safari and a real approved-account session remain outside this local Edge run.

The local package version is `5c5749801f56edca` (232 resources). Original supplied screenshot defects were identified by the parent; local rendered screenshots were inspected without uploads. No Firebase/auth/data, Drive, sasukimm, commit, push or deployment action is included in this follow-up.
