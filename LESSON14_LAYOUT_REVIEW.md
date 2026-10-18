# Lesson 14 layout and content-boundary review

Layout revision based on `40b3d7d045e48f71d05748516ca248051fef8f62`. This static update requires no Firebase configuration, document or authorization changes.

## Proposed public content

The ordinary notes, flashcards, quiz and history pages return to their original single-document layout. General grammar loads without sign-in or an embedded frame. The large access header and its status/logout controls are absent. The existing lesson/module selector remains; the duplicate inner lesson pills are removed.

This restores the original 11 grammar patterns, 46 examples, 57 flashcards, 33 quiz questions, seven application-authored explanation modules and 68 associated ruby entries. Their original data, answers and readings are compared against the pre-protection revision. Existing hash-based quiz signatures and storage IDs remain compatible.

Compatible older raw-signature drafts are converted synchronously before the public quiz starts, using the unchanged current question bank and its existing fingerprints. Answers, question order, position and revision ownership remain intact. Incompatible/corrupt drafts retain the original quiz progress safeguards.

The linked public textbook is *大家的日語中級2 第14課*, available from the repository's existing ttrw.jp textbook link. The 28-page scan was downloaded and its grammar pages 9-12 (printed pages 23-26) visually inspected. Their eleven grammar headings and sequence correspond to the application's eleven patterns. The repository's original study-flow commit identifies ttrw.jp as the overall material source. The separate explanation module identifies itself as an application learning addition independent of the original school grammar data.

This supports treating the core grammar and application explanations as general study material under the user's revised scope. It does **not** establish individual authorship of every translation, explanation, generated exercise or example. There is no independent teacher-specific attribution for those fields. The approved public scope includes this dataset and its offline copies with that provenance limitation disclosed.

## Teacher content remains protected

The explicitly teacher-sourced worksheet and adverb handouts, including attached editorial answers/help, remain in the ignored private migration source and existing protected Firestore document. Their public pages contain only collapsed supplement gates. Sign-in and server approval are still required; denial, logout, offline and lifecycle clearing remain enforced. Success/status/logout chrome is removed from the ordinary grammar experience. The existing Home page remains the account-management entry point.

No separate teacher-authored lesson 14 grammar-note dataset was found. Each grammar card therefore has a closed demonstration labelled Teacher's notes. Its body stays empty until Firebase authorizes a read of the existing protected document. All eleven cards share one request with a field mask returning only schemaVersion; no handout or grammar text is downloaded for this demonstration. Signed-out, denied, error, logout and offline states keep or clear the body to empty. The existing controller periodically revalidates authorization and limits the display lease.

The exact dummy text "Teacher's notes here" is intentionally non-secret and is shipped in the public module/offline package. Only its display is gated; this is a UI demonstration, not protection of that literal. Actual teacher text remains server-only. New real teacher grammar notes would need a separately reviewed private content mapping; this revision does not fabricate notes or upload replacements.

Phrases already shared with the public textbook/general exercises cannot be made private by protecting a teacher handout. Leak checks continue to exclude teacher-only wording from the public release; known general/source overlaps are reported without reproducing the protected text.

## Proposed live changes and limitations

If approved, publish only the reviewed static revision to yuktun/jpy5. No Firestore rules, UID grants, account credentials, note document import or Drive permission change is required. The current schema-v2 document can retain its now-unused redundant grammarJson field; removing it is optional future cleanup requiring separate approval. The actual worksheet/adverb fields remain unchanged. Old offline packages remain pinned until explicitly updated.

Lesson 13, lessons 15-20, unrelated vocabulary/reading/listening and the classmates repository remain outside this change.

The annotated Library screenshot was resolved, but the official materialization helper could not apply Library metadata on this Windows environment; its native image read returned metadata rather than pixels. No local screenshot was claimed as verified. Layout work follows the supplied description and the actual lesson 13/14 DOM. This screenshot inspection limitation remains open.

## Local review interaction follow-up

The review module now uses the same exercise shell as lesson 13. Its public sign-in/source gate is visible only while protected content is unavailable. Once authorized, the original protected header, source link and exercise disclosures provide the layout directly; there is no extra outer disclosure or green padded wrapper. The public PDF link relies on the existing automatic network label, avoiding a duplicate label.

Lesson 13's shared word-help and answer behavior now has an idempotent mount/dispose lifecycle. The protected loader mounts it after sanitized content arrives, and disposes listeners, timers and the body-level tooltip before clearing/replacing content. Mouse hover, keyboard focus/activation/Escape and touch tap/outside/scroll dismissal share the same implementation. Answer buttons also restore their original labels when closed. Revalidation preserves the mounted view; logout, account changes, errors and offline clearing remove it.

This follow-up changes no protected payload or Firebase state. Local private parity checks confirm unchanged wording, ruby, all 33 word definitions/usages (six in the top word bank) and thirteen answer panels. Public tests use synthetic content only. The new supplied screenshot could not be materialized after one bounded retry because the supported metadata helper is unavailable on Windows; comparison used the inspected screenshot description and actual lesson implementations. This follow-up is local and unpublished pending review.
