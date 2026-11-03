# TK #504 — MoveKit offline training & private media, staged v0.1
Status: **implemented core / inventory, NOT shipped**, 3 November 2026. Branch: `feat/tk504-offline-engine-20261103`, base: consolidated recovery PR #587.

## Verified facts
- MoveKit Golden Release 2026-10-04 on the authorised desktop `C:\movikit`: **582 MP4**, **582 PNG** and **582 matching metadata records**; all file paths and unique slugs present.
- Existing canonical catalog/manifest has **226 MoveKit ids**; the new inventory retains those exact ids and proposes **356 new ones** only as staging candidates.
- **210 of the 226 existing MP4s have changed SHA-256** in the Golden release. No in-place replacement: all Golden assets use separate `movekit/v2/video/` and `movekit/v2/poster/` object paths.
- Video bytes: 2,047,785,201. PNG poster bytes: 1,682,375,101. These source binaries are **NOT committed to Git**.
- Live Supabase `exercise-media` bucket is private, MP4-only, contains **0 objects**. Signed media broker is already deployed; it returns 401 unauthenticated. No cutover, upload or change to existing public playback has occurred.

## MoveKit permission / license evidence
**Owner decision (3 November 2026):** the product owner explicitly attests "we hebben toestemming om jou beveiligde wijze toe te passen" in response to the proposed Android Keystore / non-exportable encrypted offline method. Implementation of the protected offline cache is therefore authorized **as a development workstream**. The underlying written licensor evidence was not attached or independently reviewed here; store its restricted-access reference in PCC/GitHub governance before commercial rollout. The source [MoveKit Agreement section 3](https://movekit.com/license) still prohibits end-user access to raw downloadable/extractable videos. Do not provide raw media URLs, files, license text/keys or media for AI training. No unencrypted MP4 file is included in Git or the APK.

## Implemented in this branch
1. `tools/movekit-golden-inventory.py`: reproducible SHA-256, size, mapping and complete-source checks. `docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json` is staging evidence, not the live catalog.
2. `core/offlineMoveKitPackCore.js`: deterministic selected-workout media size estimate and account-scoped **instruction-only** guide packs. Rejects invalid IDs, duplicate catalog identities, traversal, unlicensed or unverified raw media downloads and cross-account writes. The download gate always remains closed at v0.1 even if all browser flags are set.
3. `core/offlineMoveKitIndexedDB.js`: persistent app-origin scoped **guide metadata** (no MP4, poster bytes, signed URLs or tokens). Uses account-prefixed keys; account ownership is checked on writes/reads/listing. The pack store now supports explicit `clearOwner(userId)` for logout cleanup. **IndexedDB storage is not encrypted or a secure vault**; this method must be called from the auth/logout lifecycle before this feature is enabled for users.
4. `core/privateMoveKitMediaClient.js`: staging-only client for the existing Netlify signing broker. On Android `https://localhost` (and `capacitor://localhost`), it selects the allowlisted HTTPS Netlify broker instead of the non-existent local function. It checks authenticated ownership before/after the request, restricts signing to the current **V1 (226 exercises) path** and URL host/path/token/TTL, never persists signed links, disallows redirects and fails closed on expiry/invalid URLs. **Not wired into `<video>` UI**.
5. `core/offlineMoveKitWorkoutProjector.js`: strict read-only adapter from the **existing** `snapshotFromVasteTraining` / `snapshotFromCustomTraining` `items[].exercise_id` shape to TEXT `exercises.id`. The **live Supabase `exercises` table has no `catalog_id` column** (verified 3 November 2026; 109 rows, 23 canonical TK-style IDs, zero UUID IDs). Only matching `TK-######` IDs or a separately code-reviewed ID-binding registry can map to MoveKit. No name/position inference and no use of a fictitious catalog_id column; missing mappings are reported as PARTIAL/NONE rather than fictional offline readiness.
6. Tests: `core/offlineMoveKitPackCore.test.js` 56, `core/privateMoveKitMediaClient.test.js` 31, `core/privateMoveKitMediaContract.test.js` 12 against the **real existing server handler**, `core/offlineMoveKitWorkoutProjector.test.js` 32 using TEXT exercise IDs, plus a separately executed Chromium IndexedDB reload/owner-isolation/logout-cleanup test. This is **131** direct deterministic checks plus the browser acceptance test.

7. **Native encrypted Media Vault (staged)**: `android/app/src/main/java/com/trainingskompas/app/TkMediaVault.java` uses per-owner AES-256-GCM Android Keystore keys, authenticated 256 KiB chunks, SHA-256 against the packaged signed-v1/Golden-v2 registry, 250 MiB quota and atomic commit. Cached MP4 plaintext is never saved to a disk file.
8. **Native offline player**: `TkMediaDataSource` feeds decryption directly into Android MediaPlayer memory via random-access reads; `TkOfflineVideoPlayer` displays a full-screen non-exportable playback dialog with `FLAG_SECURE`; `TkOfflineMediaPlugin` offers account, status, Wi-Fi-first download, play, remove and key/data wipe at logout. The plugin is **BuildConfig.DEBUG-only**, and has no released UI integration or production entitlement activation.
9. `tools/build-movekit-android-integrity.js` generates deterministic 808 video digest records (226 V1 + 582 V2) as metadata-only Android assets. Instrumentation acceptance test `TkMediaVaultInstrumentedTest` uses synthesized bytes, never commercial videos.

**Not yet wired into the end-user app**: training-specific offline pack UI, authenticated broker to V2 upload, commercial licence evidence reference, native device playback acceptance and source upload. Production release remains disabled, no retroactive claim that Android video is already offline.

## Required follow-on delivery gates
1. Store restricted-access proof/reference of the owner-attested MoveKit permission for non-exportable encrypted offline caching in governance (owner confirmation on 3 Nov 2026); do not publish the contract or license secrets in the repository. Perform release legal review before commercial rollout.
2. Private storage of versioned Golden videos in `exercise-media` with idempotent uploads and per-object SHA-256 integrity proof; separate private/optimized poster strategy, not 1.68GB raw PNG in APK.
3. Server-verified entitlement/account scope for temporary signed streams, expiry, CORS, Range 206 and seek, without exposure to anonymous callers. **Existing deployed broker only validates JWT and serves V1 (226 IDs); no verified commercial entitlement and no V2 catalog mapping yet**. Staged client must not claim support for V2 playback until a separately reviewed versioned server cutover.
4. Compile and run the newly staged Android encrypted vault, native player, 250 MiB quota, 256 KiB AES-GCM chunks, SHA256 and keystore owner-key cleanup. Feature stays debug-only until verified physical Android offline/seek/tamper/owner-switch tests and entitlement checks are complete. Rooted/repackaged devices and external camera recording are outside absolute protection.
5. Workout-level Wi-Fi-first explicit download with visible MB budget and offline readiness (never download all 582 videos by default). No cellular download without express consent; no silently recurring data usage.
6. Existing offline exercise execution and session queue must pass flight-mode, restart, retry, account switching and reconnect tests independently; no change to Calculation/Context/Decision Engines.
7. Independent code/security review, exact SHA Quality Gate, physical-device acceptance and PO release approval before merge to `main` or APK publication. Build-only Java compilation is allowed; this is not an APK-release authorization.

## Verification commands
```powershell
python tools/movekit-golden-inventory.py --source C:\movikit
node core/offlineMoveKitPackCore.test.js
node core/privateMoveKitMediaClient.test.js
node core/privateMoveKitMediaContract.test.js
node core/offlineMoveKitWorkoutProjector.test.js
# On a machine with Playwright and Chrome:
$env:TK_CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
node core/offlineMoveKitIndexedDB.browser.cjs
```

The manifest's candidate IDs are **not authoritative public exercise IDs** until reviewed and versioned with the catalog; preserve every preexisting TK ID and programme reference.

## Local-only catalog expansion review (follow-up, 3 November 2026)
- Added tools/movekit-catalog-stage.py to build an exact 582-entry LOCAL PRIVATE review catalog from the existing 226-entry catalog, the hashed Golden V2 inventory and the locally held licensed supplier metadata. It preserves every existing catalog object without mutation and stages 356 proposed entries, with stable IDs, duplicate/missing-reference rejection and no source-to-runtime DB writes.
- Existing 226 entries are copied as-is. New entries retain source-provided name, muscle/equipment/difficulty fields and original instructions/mistakes for PRIVATE REVIEW ONLY. Their category/type require explicit review; fatigue, recovery and confidence are null. No progressions, relationships, verified injury flags or media URLs are fabricated.
- This repository is PUBLIC. The staging generator and synthetic tests contain no supplier instructions or licensed video/poster bytes. Any output containing supplier text is constrained to C:\movikit\.tk-private-review\ (never inside the Git repository), and requires an explicit output argument. Keep the output local; do not commit the generated private JSON or copy it into public GitHub/Netlify.
- Validated with python tools/test_movekit_catalog_stage.py (10 synthetic security/identity tests) and real desktop python tools/movekit-catalog-stage.py --source C:\movikit (226 retained + 356 candidates = 582). Output remains PRIVATE_LOCAL_REVIEW_ONLY_NOT_ACTIVE. Existing pack, projector and private media-client/broker tests also pass.
- Next gates: structured category/identity review, authoritative app exercise-ID bindings, licensed server-side entitlement and V2 media migration, production integration/regression/device acceptance. No main merge or APK from this step.

## Golden V2 taxonomy review (3 November 2026; local-only, unapproved)
- Added tools/movekit-classification-review.py with 10 synthetic, dependency-free regression tests. The report ONLY proposes category/type hints from exact agreement among existing catalog exercise identities with supplier-provided movement pattern, primary-muscle and equipment tags. If that exact key has no matches, it tries movement + primary; contradictory baseline mappings remain unresolved, with no fallback masking a conflict.
- Real local supplier set: 356 candidate exercises. 137 exact movement+primary+equipment taxonomy suggestions, 75 movement+primary suggestions, 8 conflicting baseline matches and 136 with no compatible baseline identity. Therefore 212 suggestions still require review, and 144 exercises have no suggestion. No approved scientific inference, auto-created relationships, invented recovery/fatigue, canonical catalog mutation or DB writes.
- Full report with provider slugs is PRIVATE at C:\Movikit\.tk-private-review\TK504-MOVEKIT-TAXONOMY-REVIEW-20261103.json; never commit or expose it. Git version stores only generic algorithm, synthetic tests and aggregate counts. Evidence means baseline metadata similarity, NOT evidence grade A-E.
- Gate to production remains human-reviewed classification and an authority decision for each category/type and valid DB exercise-ID bindings; no media release and no new APK in this development slice.

## Poster optimization pipeline (3 November 2026; private source, NO media release)
- Added tools/movekit-optimize-posters.py and tools/movekit-verify-optimized-posters.py. Original supplier PNG files are immutable. Processing runs locally against the verified 582-item hashed Golden V2 inventory; it never copies source content into Git, APK, public CDN or Supabase.
- Result from DESKTOP-DP6BUNC: 582/582 source PNGs converted to 1280px-or-less WebP at quality 82 using isolated Pillow 12.3.0, no global software dependency. Source 1,682,374,967 bytes -> 9,634,714 bytes optimized (1,672,740,253 bytes saved, approximately 99.43% reduction). This is a private staged copy, NOT shipped to any user.
- tools/movekit-verify-optimized-posters.py independently verified original PNG SHA-256, optimized WebP SHA-256, decoding/dimensions, uniqueness, exact 582 catalog-ID associations and totals. Final local registry at C:\Movikit\.tk-private-review\posters-webp-v2\catalog-poster-registry.json, status LOCAL_ONLY_NO_UPLOAD_NO_RELEASE. Exact raw files and private upload registry must not enter public Git or release packages.
- Objective quality sampling: 20 evenly spaced examples comparing optimized WebP against original resized to output resolution, PSNR min 41.98 dB, median 44.92 dB, max 46.65 dB. This is a preliminary encoding-fidelity indicator, NOT human visual approval on Android. Seven additional synthetic poster-contract tests PASS.
- Next gates: product/UX visual review for representative posters, private authenticated storage and entitlement, safe V2 poster delivery, device caching, actual mobile-data measurement, and independent release acceptance. No poster URL switch, app UI activation, APK or main merge.

## V2 signed-video broker and explicit entitlement gate (staged 3 November 2026)
- New isolated Netlify handler: netlify/functions/exercise-media-v2-url.js. It signs ONLY an allowlisted MoveKit v2 MP4, derived server-side from the immutable Golden SHA inventory; it never accepts client-supplied paths, slugs, output versions other than v2, alternate buckets or URLs. It DOES NOT modify the currently deployed V1 broker.
- New server-controlled release registry docs/generated/MOVEKIT_V2_RELEASE_GATES.json has status BLOCKED_NOT_REVIEWED, no approved items or inventory digest. No V2 videos can be signed in the actual default configuration. To enable the broker deliberately requires THREE server-only deployment flags (signing, license review, upload checksum review), an approved registry with a byte-exact Golden inventory SHA, per-item reviewer and upload references, exact media hash/size/path, and current user authorization. Environment flags alone are insufficient.
- Authorization is independent of client account claims and plan names. The bearer is checked against the Auth service; then the service-only REST request checks public.movekit_media_grants for EXACT authenticated user_id and scope movekit_v2, active=true, unrevoked and unexpired. Missing grant table, revoked, missing or ambiguous grant: DENY without ever issuing a signed URL. The service key is never exposed to the client.
- Database migration staged via the Supabase CLI: supabase/migrations/20261103155325_tk504_movekit_v2_media_grants.sql. It is NOT APPLIED to production or acceptance. It defaults to active=false, has no anon/authenticated policies, explicitly revokes client access and grants SELECT only to service_role. This is not an automatic entitlement writer; grant issuance and revocation need a separate approved back-office process.
- Signing duration: 60 seconds, Cache-Control no-store; strict signed URL origin/path/token checking and no public download override. This does NOT guarantee instant revocation after signing: Supabase private signed-media CDN caching can continue serving an issued link until cache expiry. Require short cache controls, private-only playback and legal/security acceptance before any commercial release.
- 24 synthetic V2 broker security and authorization tests PASS, including no-release default, wrong user, invalid/expired/revoked grant, backend failures, stale/bad signed paths and no-signer-before-authorization. Tests make no remote calls.
- The V2 poster bucket and V2 client UX are NOT activated. The current live exercise-media bucket remains private MP4-only with ZERO objects; no V2 video or WebP was uploaded, no key/secret/media is committed. Versioned poster delivery requires a separate private poster bucket and approved manifest with the local verified WebP hashes; do not enable V2 poster signing prematurely.
- The related workout execution recovery remains PR #587. No V2 DB write, storage upload, production switch, APK or merge authorization from this staged step.

## Controlled private upload manifest (3 November 2026)
- Added tools/movekit-v2-private-upload-plan.py. It checks 582 licensed Golden V2 MP4s and all 582 pre-verified optimized WebP posters locally, cross-references stable catalog IDs, validates unique private bucket/object paths, sizes, SHA-256 and MIME. No raw files/credentials are copied to the public repository, and this tool has NO network/upload implementation.
- Real desktop verification: 1,164 source media files, video 2,047,785,201 bytes + optimized posters 9,634,714 bytes = 2,057,419,915 bytes. Per-object SHA verified on all files; outputs fixed to C:\Movikit\.tk-private-review\TK504-MOVEKIT-V2-UPLOAD-PLAN.json. Exactly 11 new synthetic plan-identity/sha/conflict tests PASS.
- Live Supabase exercise-media bucket was read-only verified private, video/mp4-only, empty. The exercise-posters private WebP bucket does NOT yet exist. The desktop has no SUPABASE_SERVICE_ROLE_KEY in its process environment; no upload attempted, no plaintext credentials exposed. A separate authorized deployment/transfer process must verify missing infrastructure, entitlement grants, idempotent upload behavior, server-side object SHA receipts, storage costs and Range 206/seek before cutover.
- All code and future media releases remain Draft / APK-HOLD. Never expose the local private plan or licensed media in GitHub, Netlify or ChatGPT attachments.

## Private poster bucket / live Supabase provisioning (3 November 2026)
- Via the authorized Supabase project connector, created the missing **exercise-posters** bucket in the existing project `mhfxhzkdmgkaplicdszg`; confirmed `public=false`, MIME allowlist `image/webp`, per-object limit 1,048,576 bytes and zero objects. Existing `exercise-media` stayed private (`video/mp4`, 33,554,432-byte max, zero objects).
- The 582 locally optimized posters were checked against the staging manifest; largest is just 40,034 bytes. All are under the private bucket limit.
- Inspected live storage.objects RLS: enabled, and existing storage.objects policies were scoped to `bucket_id='avatars'`; new MoveKit buckets have no ordinary user write/read policy. Server-only signed-url delivery remains strictly gated and inactive.
- The new bucket's creation is mirrored by idempotent migration `supabase/migrations/20261103162918_tk504_private_poster_bucket.sql`, created using the Supabase CLI for repeatable fresh environments. The remote bucket is already provisioned, but migration history was not updated and other staged migrations were NOT applied to live.
- Browser Dashboard login on MedscanMaurice is separate from CLI login on desktop `DESKTOP-DP6BUNC`. Supabase project connector is authenticated, but the desktop CLI has no access token; do not attempt authenticated Storage CLI transfer until a separate explicit desktop CLI OAuth flow is completed. No secrets requested or recorded in chat.

## TK504 — PRIVATE MOVekit V2 STORAGE TRANSFER COMPLETED (3 November 2026)

**Latest live state; supersedes earlier no-media-upload staging notes.**
The existing hosted Supabase production project's PRIVATE storage received the
licensed V2 assets. Main, the workout/exercise database, the production app,
Netlify activation, entitlement migrations and APK were NOT changed.

- Supabase project: Maurice training, mhfxhzkdmgkaplicdszg.
- exercise-media: 582/582 MP4 videos, 2,047,785,201 bytes, private=true.
  Exact prefix: movekit/v2/video/. All video file sizes within bucket 32 MiB cap.
- exercise-posters: 582/582 optimized WebP posters, 9,634,714 bytes,
  private=true. Exact prefix: movekit/v2/poster-optimized/.
- Total: **1,164 private objects = 2,057,419,915 bytes**. Server-side SQL
  confirms counts, exact total byte sums, MIME and 0 unexpected media paths.
- All 1,164 exact remote object names compared with the private Golden
  manifest via tools/movekit-v2-verify-remote-paths.py:
  EXACT_REMOTE_PATH_SET_MATCH. Private manifest SHA-256:
  6513fc8f804b7ab543e0275a6b9ca9b1a50c355d7fe5bb9db9cbe00964a2f358.
- Full SHA-256 re-download checks passed for **219 distinct WebP posters**
  and **7 V2 MP4 videos** (first pilot + six spread over the inventory).
  All 1,164 original local source file SHA-256 checks passed before upload.
  Do NOT claim 1,164 remote objects received a full re-download hash test;
  all remote paths/metadata and overall byte totals were checked.
- The CLI on Windows initially rejected absolute source paths. Switching
  to relative paths fixed uploads. Recursive cp includes the source folder
  basename; two misplaced pilot-only paths were detected and deleted, then
  transferred to the intended canonical V2 folder. No stray paths remain.
- First poster batch stopped after 426 objects because PowerShell interpreted
  CLI informational stderr as an exception. A fresh listing was reconciled
  with the manifest; exactly 156 missing posters were privately hardlinked
  and uploaded without overwriting existing objects. Videos: 581 remaining
  video files uploaded in a single bounded-parallel batch, plus first pilot.
- A four-connection poster verification DOWNLOAD hit Supabase HTTP 429
  too_many_connections after 219 local output entries. 215 were SHA-correct.
  Four zero-byte incomplete local download placeholders were individually
  retried (sequential downloads) and then passed full SHA-256; no evidence
  of corrupted uploads. Avoid 4-way verification downloads until throttling/
  connection pooling is addressed.
- Supabase CLI 3.0.0 with explicit --remote project, --experimental, --yes,
  and correctly prefixed folders used for storage operations. All Golden
  license files, media manifests, transfer logs and temporary hardlinks stay
  privately in C:\Movikit\.tk-private-review. No licensed assets or secret
  credentials were placed in public Git.
- Both buckets remain private, with storage.objects RLS and no added
  client-facing object policies. The new V2 grant schema has NOT been
  applied to the live database; V2 signer release approval registry remains
  BLOCKED and the V2 app is unwired. Storage success is NOT an entitlement
  or application release.
- Outstanding release gates: documented supplier license/commercial review,
  per-user grant and catalog binding, reconcile staged V2 client/server
  contract, versioned reviewed release registry for both media types,
  physical Android offline/Range/seek/account-switch tests and all prior
  #577/#582/#584/#579 fixes plus joint UX review. NO APK yet.

## Staged V2 media client and canonical ExerciseAssetProvider bridge, 3 November 2026

- A single server-authoritative grant model now governs signing. Auth is verified by Supabase Auth on each request, followed by a server-only, per-user lookup in the planned movekit_media_grants table. Neither user_metadata nor app_metadata nor a client-supplied user ID can authorize media. The grant migration has NOT been applied.
- Broker netlify/functions/exercise-media-v2-url.js supports both MP4 and optimized WebP with strict server-derived bucket/path/size/hash. A 582-item WebP digest index is now generated from private, independently checked source files, and contains only existing catalog IDs/provider slugs, bytes, SHA and Storage paths. No licensed media bytes, supplier instruction text, or secrets are placed in public Git.
- Registry release is STILL BLOCKED_NOT_REVIEWED with zero approved media entries. Both immutable public source JSON SHA256 digests must match the release registry in any approved configuration, as must per-object review/upload evidence. An independent server-only POSTER_UPLOAD_VERIFIED flag also gates optimized posters. Files being present in private storage is not publication approval.
- The staged WebView client and isolated broker have one contract: exact V2 version, two media types, 60-second private signed URLs, no local signed-URL persistence, no active UI and no offline media release. Account switching invalidates in-flight client requests.
- Bridge core/movekitV2ExerciseMediaBridge.js connects the 226 existing known Movekit catalog entries by immutable TK IDs and exact provider identity; it does not fuzzy-match Supabase TEXT IDs, silently link legacy IDs or activate the 356 candidate exercises. It cannot change workout logs.
- Production-style Netlify/esbuild Node bundle independently built and loaded from a private temp path. Both 582-item catalogs survived and the broker remained denied by default. Runtime repository fs.readFileSync dependency was replaced by statically bundled JSON require(), with both source-byte SHA pins checked by a separate test.
- Tests passed: 28 broker security/authorization, 14 integrated client/server/grants scenarios, 25 bridge identity assertions, dedicated 582-pair SHA/manifest binding test; existing V1 security checks (31+12) and offline MoveKit core/projector checks (56+32) remained green.
- No production app, workouts, main branch, Supabase data grants, active Netlify function, licensed-media release flags or Android APK were changed. Next gates: approved supplier license and classification, backend entitlement model, Android seek/playback and encrypted offline tests, joint UX after outstanding functional repairs.
