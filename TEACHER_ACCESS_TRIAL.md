# Lesson 14 teacher-text trial

**Current layout follow-up:** [LESSON14_LAYOUT_REVIEW.md](LESSON14_LAYOUT_REVIEW.md)
defines the revised boundary and single-document public grammar layout. It
supersedes the historical conservative grammar boundary described below.
The revised scope makes lesson 14 review/Exercise public, including offline
copies. The user subsequently approved the lesson 14 adverb supplement as public too, with its native closed panel and optional offline copy. The non-secret grammar-panel
demonstration appears only after a masked server authorization check. No
Firebase or credential change is part of this static revision. The historical
trial/deployment record below does not override this current content boundary.

Local implementation only. No live rules, content, identities, grants or hosting have been changed. Base: `8a4a519af833679e37d334a9aa20a7b86be7d27c`, verified against a fresh clone of `yuktun/jpy5` main. No repository AGENTS.md or applicable engineering skill was available in this checkout/catalog; README contributor guidance was followed.

**Deployment hold:** do not deploy the rules from `5160c02`. The current tracked
`firestore.rules` supersedes that incomplete repository baseline and preserves
the existing live permissions for both study apps. The conservative boundary now
includes original school grammar and derived exercises, as requested. Local rule
reconciliation does not authorize deployment, content upload, grants or publication.

## Verified live rule baseline

Read-only Firebase Console inspection on 2026-10-17 verified the default database's
starred rules release displayed as `Sept 25, 2026 • 10:57 am` (console display).
It allows owner read/write at `/users/{userId}`, at
`/users/{userId}/progress/{documentId}`, at `/jpy5Users/{userId}`, and recursively
below `/jpy5Users/{userId}`. The shared owner predicate checks a signed-in UID
against the path's user ID. These permissions are all retained in the current
tracked rules. The teacher matches are isolated top-level collections and do not
overlap those existing owner paths.

The console's Authentication directory verified the intended account's UID and
Google provider. That private mapping is kept outside tracked files. The inspected
directory does not expose the `email_verified` token claim; real token eligibility
still requires private verification. No credentials were created, and no write
permission or live authorization test was attempted.

## Content boundary and provenance

Two existing sections have explicit teacher-source provenance:

- `chapter-14-review.html#teacher-exercise`: teacher worksheet transcription, 6 PDF pages, 45 top-level prompts and 13 answer panels. Suggested answers and explanations are editorial additions, not an official teacher key.
- `chapter-14-vocabulary.html#teacher-adverbs`: teacher adverb handout page 2, 4 cards, 8 example blocks and 7 practice prompts. Chinese translations, comparison notes and reference answers are editorial additions.

The trial protects each complete section, including attached editorial answers/help. General vocabulary, reading, listening and review navigation stay public. No separate lesson 14 teacher grammar-note dataset was found; the original school/source grammar has ambiguous provenance. The requested conservative boundary now protects that grammar and its editorial additions without inventing teacher authorship.

The original school/source grammar in `ch14-data.js` contains 11 patterns and
46 examples and supplies 57 grammar flashcards and 33 quiz questions. Its teacher
provenance is unresolved. All of it is now protected, along with 7 extra explanation
modules and 68 associated ruby entries formerly shipped in a shared module.
The original notes, flashcards, quiz and history renderers run in a disposable
authenticated view with the original tool layouts, wording, readings, examples,
answers and IDs. A bounded scrolling viewport keeps the original dialogs usable.
Background authorization checks preserve the current study view. Quiz order,
answers, resume position, flashcards and history retain their original storage keys.
Full question signatures in lesson 14's local draft are migrated to SHA-256
fingerprints without changing its progress fields. These drafts were already
excluded from cloud progress sync.

Removed public copies: both HTML sections, lesson 14's generator record in `scripts/adverb-notes-data.mjs`, lesson-specific quotations in both source audits, the core and extra grammar payloads, and 68 shared ruby entries. Six affected pages now ship empty gates and ordinary UI templates. Old data URLs are inert tombstones. The adverb generator retains only `{protected: true}` for lesson 14. Private scans check 118 lesson-unique worksheet/adverb fragments and 578 grammar, derived quiz, extra and ruby strings. Known overlaps deliberately remain: generic grammar tokens/IDs and one 18-character example independently present in lesson 15's editorial additions. This trial does not make shared language phrases secret or remove other lessons' material. No copied protected sentence was found in lesson 14's unrelated vocabulary, reading or listening content.

Lesson 13 and lesson 14's general data are checked against the base revision. Lessons 15–20 remain public for this first trial. The `sasukimm/jpy5` copy and all Drive links/permissions are unchanged.

## Authorization and caching

`jpy5TeacherNotes/lesson14` contains numeric `schemaVersion: 2` and strings `exercises`, `adverbs`, `grammarJson`. The last field holds original grammar data, extras, private ruby entries and question fingerprints. The complete private payload is approximately 100 KB. Only a single-document read is allowed, and only for a verified Google-authenticated UID whose administrator-created `jpy5TeacherAccess/{uid}` document has boolean `lesson14: true`. Other note IDs, collection listing, all note writes and all client reads/writes to approvals are denied. Both apps' deployed owner permissions are preserved, including the existing JPY5 subcollection wildcard. No root-wide wildcard grant is introduced; emulator tests include a deliberate broad-allow negative control and an attempted approval within a user's own subcollection.

The client shares the existing Firebase Auth instance but reads notes through Firestore REST with the Firebase ID token, `cache: no-store`, no cookies and no redirects. It never puts notes in the progress SDK, IndexedDB, localStorage, sessionStorage or Cache Storage. Firestore evaluates these Firebase-token REST reads against Security Rules: [Firebase REST authentication](https://firebase.google.com/docs/firestore/use-rest-api). A deny does not override an overlapping allow: [rule structure](https://firebase.google.com/docs/firestore/security/rules-structure).

The UI handles signed-out, ready, loading, denied, missing, offline and error states. Worksheet/adverb HTML is reconstructed through an allowlist sanitizer. Grammar uses original trusted renderers in a disposable document with network connections disabled by CSP. Removing it clears its DOM, globals, listeners and dialogs together. Text is held only in memory and cleared on account/token changes, logout attempts, offline/visibility/page transitions and authorization failure. Revalidation runs every 45 seconds without rebuilding the active UI, with a 60-second hard lease and 15-second timeout. Late responses are ignored; errors have no plaintext fallback. Revocation cannot retract copied text or push an immediate notification to an already displayed view.

The worker retires affected lesson 14 HTML/data/audit copies from this app's old package/legacy caches on activation, and refuses those entries from an old package. Four small verified public security modules replace shared ruby/progress/PWA code so lesson 13 and other public cached pages keep working. An old package becomes incomplete until an explicit full update. New packages contain public gates only; the six protected areas require internet. Updated app code removes old quiz signature text while retaining progress. The worker/code must first update/activate: old open pages, browser HTTP caches, historical commits, saved downloads, other repositories and unchanged Drive PDFs cannot be retroactively erased. This is authorization, not copy-proof encryption.

## Local checks and preview

Install development dependencies with `npm ci`; Java is required for the Firestore emulator. Use an installed Edge, or set `JPY5_BROWSER_CHANNEL` for a supported browser. All new test records, users and tokens are synthetic, and the rules suite requires a loopback emulator with a `demo-` project.

```sh
node scripts/generate-offline-manifest.mjs
npm run test:teacher
npm run test:rules
npm run test:teacher-browser
npm run test:teacher-grammar
npm run test:teacher-autoload
node scripts/test-teacher-static.mjs
node scripts/test-teacher-parity.mjs
node scripts/test-firebase-sync.mjs
node scripts/test-progress-sync-reliability.mjs
node scripts/test-quiz-reliability.mjs
node scripts/test-pwa.mjs
node scripts/test-offline-manifest.mjs
node scripts/test-offline-mode.mjs
node scripts/serve-public.mjs
```

Use the public-only server when private migration files are present; do not serve the repository directory with an unrestricted static file server. The preview allowlist excludes migration sources, Git objects, dependencies and logs.

The optional parity test requires the ignored migration source. It compares hashes of original data, four page layouts, ruby outputs, highlights, IDs and fingerprints without printing teacher text. The private static audit uses that source when present. Public browser fixtures contain synthetic text only.

### Lesson 14 automatic-loading follow-up (local only)

Signed-in users now load lesson 14 automatically when a protected page opens or sign-in completes. Every fetch still requires the server's existing approval check. The extra read button is hidden during normal use and appears only for recoverable errors or an expired lease. Repeated notifications for the same UID and overlapping lifecycle events share one request and retain a loaded study view. Account changes, logout and offline/hidden pages clear content; returning online or to the page reloads through authorization. Background revalidation and the hard lease remain in force.

This follow-up proposes only a static application update; it needs no Firebase rules, note document, allowlist or credential changes. Lessons 15-20 remain public. Existing pinned offline packages receive the updated loader after an explicit package update, following the app's existing update behavior.

## Proposed live sequence — requires separate approval

Local verification completed: 76 Firestore authorization/progress checks and an
overlapping-allow negative control; five controller/transport/privacy unit tests; six
protected areas at 390, 810 and 1280 pixels in light/dark themes; synthetic
sign-in, denied, authorized, logout/account-switch, sanitization and cache-retirement
checks; original grammar tools, dialogs, quiz resume/history and private draft
migration; the existing offline suite covering all 73 pages, cold start, download
failures, cancellation, updates, integrity, removal, eviction and retry; existing
lesson 14 reading/listening and lesson 13 teacher browser suites; progress-sync
regressions; and public-source/manifest checks. The private fragment audit found
118 lesson-unique long fragments absent from public files and checked 578 grammar
strings with only the shared tokens/example disclosed above remaining. The live rules and
intended account's directory record were inspected read-only; real-account
authorization and iPhone/Safari were not exercised. The emulator tests use only
synthetic identities and preserve owner reads, writes and deletes for both apps.

1. Privately recheck the matched intended UID and Google provider in `japanese-study-sync`, verify token eligibility, and obtain final grant approval. Do not infer the UID from an email or put either in Git. No new identity/provider/account/security-setting change is proposed.
2. Recheck the active rules release immediately before deployment and preserve a private backup. The current tracked rules already retain the 2026-10-17 inspected baseline. Reconcile any subsequent live changes while ensuring no broader overlapping allow grants note or approval access. Re-run the emulator suite against the exact complete ruleset to be reviewed. Never substitute `5160c02`'s obsolete rules.
3. After approval, deploy only the reviewed current tracked `firestore.rules` to that project (not Hosting, Storage or other services). Preserve all four existing owner boundaries listed above. Confirm unapproved and signed-out reads are denied before uploading real text.
4. A trusted administrator imports ignored `private-migration/lesson14.json` into the **single** document `jpy5TeacherNotes/lesson14`: numeric `schemaVersion` 2 and string fields `exercises`, `adverbs`, `grammarJson`. Do not parse `grammarJson` into a Firestore map or upload the whole file as one string. Original text, answers, IDs and readings are retained. Validate privately and keep the source out of Git, logs, public attachments and deployment artifacts. No service-account key, token or credential is to be created or committed for this task.
5. After confirming the UID and approving the grant, an administrator creates only `jpy5TeacherAccess/{confirmedUid}` with `{lesson14: true}`. No client approval UI exists. No other users or lessons are granted.
6. Publish the reviewed feature commit to **yuktun/jpy5 only**, after approval, with its regenerated inventory and service worker. Verify the deployed HTML, source generator and audit files contain no removed lesson 14 payload. Reopen/update existing clients and download a new offline package explicitly.
7. Privately smoke-test signed-out, unapproved and approved accounts; logout/account switching; removal of the UID approval; saved progress; lesson 13; and offline packages on desktop and a real iPhone/Safari. Restore the approved test grant only if explicitly authorized. Device-specific Safari behavior remains a release check.

Rollback/revoke by removing or setting the UID approval's `lesson14` to false. Keep the public shells and restrictive rules: restoring old static pages would republish the protected text. Review any rules rollback for overlapping access before applying it. The admin-only content document can remain inaccessible while resolving an issue.

The exact pending live changes are the reviewed Firestore rules, one note document, one confirmed UID approval document, and the reviewed static release to yuktun. No Firebase deployment, live content import, access grant, push, PR or classmates-copy change is performed by these local steps.
