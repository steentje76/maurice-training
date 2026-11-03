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
