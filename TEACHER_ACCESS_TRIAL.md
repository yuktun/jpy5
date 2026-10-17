# Lesson 14 teacher-text trial

Local implementation only. No live rules, content, identities, grants or hosting have been changed. Base: `8a4a519af833679e37d334a9aa20a7b86be7d27c`, verified against a fresh clone of `yuktun/jpy5` main. No repository AGENTS.md or applicable engineering skill was available in this checkout/catalog; README contributor guidance was followed.

## Content boundary and provenance

Two existing sections have explicit teacher-source provenance:

- `chapter-14-review.html#teacher-exercise`: teacher worksheet transcription, 6 PDF pages, 45 top-level prompts and 13 answer panels. Suggested answers and explanations are editorial additions, not an official teacher key.
- `chapter-14-vocabulary.html#teacher-adverbs`: teacher adverb handout page 2, 4 cards, 8 example blocks and 7 practice prompts. Chinese translations, comparison notes and reference answers are editorial additions.

The trial protects each complete section, including its attached editorial answers/help. General vocabulary, grammar, reading, listening, quizzes and review navigation stay public. `ch14-grammar-extra-data.js` identifies general learning additions, with no established teacher provenance; it is unchanged. No separate lesson 14 teacher grammar-note dataset was found. Confirm any additional intended material before broadening the boundary.

Removed public copies: both HTML sections, lesson 14's generator record in `scripts/adverb-notes-data.mjs`, and lesson-specific quotations in both source audits. The generator retains only `{protected: true}` for lesson 14 and will not regenerate its text. Tests, shared data and offline inventory were audited. Remaining long-text overlaps are shared instructions/disclaimers in other lessons, not a separate lesson 14 payload. The local optional fragment check supplements structural checks; it is not a proof that no short phrase coincides with textbook content.

Lesson 13 and lesson 14's general data are checked against the base revision. Lessons 15–20 remain public for this first trial. The `sasukimm/jpy5` copy and all Drive links/permissions are unchanged.

## Authorization and caching

`jpy5TeacherNotes/lesson14` contains `schemaVersion: 1`, `exercises: string`, `adverbs: string`. Only a single-document read is allowed, and only for a verified Google-authenticated UID whose administrator-created `jpy5TeacherAccess/{uid}` document has boolean `lesson14: true`. Other note IDs, collection listing, all note writes and all client reads/writes to approvals are denied. Existing `jpy5Users/{uid}` progress ownership rules are unchanged. No wildcard grants are introduced; emulator tests include a deliberate broad-allow negative control.

The client shares the existing Firebase Auth instance but reads notes through Firestore REST with the Firebase ID token, `cache: no-store`, no cookies and no redirects. It never puts notes in the progress SDK, IndexedDB, localStorage, sessionStorage or Cache Storage. Firestore evaluates these Firebase-token REST reads against Security Rules: [Firebase REST authentication](https://firebase.google.com/docs/firestore/use-rest-api). A deny does not override an overlapping allow: [rule structure](https://firebase.google.com/docs/firestore/security/rules-structure).

The UI handles signed-out, ready, loading, denied, missing, offline and error states. Content is sanitized, held only in page memory, and cleared on account/token changes, logout attempts, offline/visibility/page transitions and after a 60-second display lease. Reads time out after 15 seconds, late responses are ignored, and errors have no plaintext fallback. Each new read goes to the server. Revocation cannot retract text already read or copied; an already visible page is cleared by its lease or lifecycle event, not by a live push.

The worker deletes affected lesson 14 HTML/audit entries from this app's old package/legacy caches on activation, and will not serve those entries from an unmarked old package. Other public cached files and all learner storage remain intact. An old package becomes incomplete until the learner explicitly downloads the updated package. The new package contains public shells only; the two teacher sections require internet. The worker must first update/activate: old open pages, browser HTTP caches, historical commits, saved downloads, other repositories and unchanged Drive PDFs cannot be retroactively erased. This is authorization, not copy-proof encryption.

## Local checks and preview

Install development dependencies with `npm ci`; Java is required for the Firestore emulator. Use an installed Edge, or set `JPY5_BROWSER_CHANNEL` for a supported browser. All new test records, users and tokens are synthetic, and the rules suite requires a loopback emulator with a `demo-` project.

```sh
node scripts/generate-offline-manifest.mjs
npm run test:teacher
npm run test:rules
npm run test:teacher-browser
node scripts/test-teacher-static.mjs
node scripts/test-firebase-sync.mjs
node scripts/test-progress-sync-reliability.mjs
node scripts/test-pwa.mjs
node scripts/test-offline-manifest.mjs
node scripts/test-offline-mode.mjs
node scripts/serve-public.mjs
```

Use the public-only server when private migration files are present; do not serve the repository directory with an unrestricted static file server. The preview allowlist excludes migration sources, Git objects, dependencies and logs.

## Proposed live sequence — requires separate approval

Local verification completed: 42 Firestore authorization/progress checks and an
overlapping-allow negative control; three controller/transport unit tests; both
protected sections at 390, 810 and 1280 pixels in light/dark themes; synthetic
sign-in, denied, authorized, logout/account-switch, sanitization and cache-retirement
checks; the existing offline suite covering all 73 pages, cold start, download
failures, cancellation, updates, integrity, removal, eviction and retry; existing
lesson 14 reading/listening and lesson 13 teacher browser suites; progress-sync
regressions; and public-source/manifest checks. The private fragment audit found
118 lesson-unique long fragments absent from public files. A real Google account,
live deployed rules and iPhone/Safari were not exercised. No live credentials were
used by the tests.

1. Privately verify the intended test account's Firebase Authentication UID in the existing project `japanese-study-sync`. Confirm Google provider and verified email. Do not infer the UID from an email or put either in Git. No new identity/provider/account/security-setting change is proposed.
2. Retrieve and review the currently deployed rules and preserve a private backup. This local test validates repository rules only. Merge any legitimate live rules while ensuring no broader overlapping allow grants note or approval access. Re-run the emulator checks against the exact complete proposed ruleset before approval/deployment.
3. After approval, deploy only the reviewed Firestore rules to that project (not Hosting, Storage or other services). Preserve the progress match exactly. Confirm unapproved and signed-out reads are denied before uploading real text.
4. A trusted administrator imports the ignored local `private-migration/lesson14.json` into the **single** document `jpy5TeacherNotes/lesson14`, with numeric `schemaVersion` and string `exercises`/`adverbs`. The source retains the original section markup and answer labels. Validate content privately and keep the local source out of Git, logs, public attachments and deployment artifacts. No service-account key, token or credential is to be created or committed for this task.
5. After confirming the UID and approving the grant, an administrator creates only `jpy5TeacherAccess/{confirmedUid}` with `{lesson14: true}`. No client approval UI exists. No other users or lessons are granted.
6. Publish the reviewed feature commit to **yuktun/jpy5 only**, after approval, with its regenerated inventory and service worker. Verify the deployed HTML, source generator and audit files contain no removed lesson 14 payload. Reopen/update existing clients and download a new offline package explicitly.
7. Privately smoke-test signed-out, unapproved and approved accounts; logout/account switching; removal of the UID approval; saved progress; lesson 13; and offline packages on desktop and a real iPhone/Safari. Restore the approved test grant only if explicitly authorized. Device-specific Safari behavior remains a release check.

Rollback/revoke by removing or setting the UID approval's `lesson14` to false. Keep the public shells and restrictive rules: restoring old static pages would republish the protected text. Review any rules rollback for overlapping access before applying it. The admin-only content document can remain inaccessible while resolving an issue.

The exact pending live changes are the reviewed Firestore rules, one note document, one confirmed UID approval document, and the reviewed static release to yuktun. No Firebase deployment, live content import, access grant, push, PR or classmates-copy change is performed by these local steps.
