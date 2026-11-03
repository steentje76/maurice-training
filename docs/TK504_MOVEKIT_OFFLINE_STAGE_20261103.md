# TK #504 — MoveKit offline training & private media, staged v0.1
Status: **implemented core / inventory, NOT shipped**, 3 November 2026. Branch: `feat/tk504-offline-engine-20261103`, base: consolidated recovery PR #587.

## Verified facts
- MoveKit Golden Release 2026-10-04 on the authorised desktop `C:\movikit`: **582 MP4**, **582 PNG** and **582 matching metadata records**; all file paths and unique slugs present.
- Existing canonical catalog/manifest has **226 MoveKit ids**; the new inventory retains those exact ids and proposes **356 new ones** only as staging candidates.
- **210 of the 226 existing MP4s have changed SHA-256** in the Golden release. No in-place replacement: all Golden assets use separate `movekit/v2/video/` and `movekit/v2/poster/` object paths.
- Video bytes: 2,047,785,201. PNG poster bytes: 1,682,375,101. These source binaries are **NOT committed to Git**.
- Live Supabase `exercise-media` bucket is private, MP4-only, contains **0 objects**. Signed media broker is already deployed; it returns 401 unauthenticated. No cutover, upload or change to existing public playback has occurred.

## Licensing constraint (hard gate)
Source: [MoveKit License Agreement v1.0 section 3](https://movekit.com/license). Display and streaming to authenticated app users are permitted; enabling end-user downloads, extraction or obtaining raw media files is prohibited. The agreement does not explicitly authorize persistent end-user offline copies. **Obtain written licensor clarification before enabling any offline media storage**, even if private/encrypted. Do not expose raw files, raw URLs, download endpoints, license IDs, or secret keys to app users. No media content is used for AI training.

## Implemented in this branch
1. `tools/movekit-golden-inventory.py`: reproducible SHA-256, size, mapping and complete-source checks. `docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json` is staging evidence, not the live catalog.
2. `core/offlineMoveKitPackCore.js`: deterministic selected-workout media size estimate and account-scoped **instruction-only** guide packs. Rejects invalid IDs, duplicate catalog identities, traversal, unlicensed or unverified raw media downloads and cross-account writes. The download gate always remains closed at v0.1 even if all browser flags are set.
3. `core/offlineMoveKitIndexedDB.js`: persistent app-origin scoped **guide metadata** (no MP4, poster bytes, signed URLs or tokens). Uses account-prefixed keys; account ownership is checked on writes/reads/listing. The pack store now supports explicit `clearOwner(userId)` for logout cleanup. **IndexedDB storage is not encrypted or a secure vault**; this method must be called from the auth/logout lifecycle before this feature is enabled for users.
4. `core/privateMoveKitMediaClient.js`: staging-only client for the existing Netlify signing broker. On Android `https://localhost` (and `capacitor://localhost`), it selects the allowlisted HTTPS Netlify broker instead of the non-existent local function. It checks authenticated ownership before/after the request, restricts signing to the current **V1 (226 exercises) path** and URL host/path/token/TTL, never persists signed links, disallows redirects and fails closed on expiry/invalid URLs. **Not wired into `<video>` UI**.
5. `core/offlineMoveKitWorkoutProjector.js`: strict read-only adapter from the **existing** `snapshotFromVasteTraining` / `snapshotFromCustomTraining` `items[].exercise_id` shape to TEXT `exercises.id`. The **live Supabase `exercises` table has no `catalog_id` column** (verified 3 November 2026; 109 rows, 23 canonical TK-style IDs, zero UUID IDs). Only matching `TK-######` IDs or a separately code-reviewed ID-binding registry can map to MoveKit. No name/position inference and no use of a fictitious catalog_id column; missing mappings are reported as PARTIAL/NONE rather than fictional offline readiness.
6. Tests: `core/offlineMoveKitPackCore.test.js` 56, `core/privateMoveKitMediaClient.test.js` 31, `core/privateMoveKitMediaContract.test.js` 12 against the **real existing server handler**, `core/offlineMoveKitWorkoutProjector.test.js` 32 using TEXT exercise IDs, plus a separately executed Chromium IndexedDB reload/owner-isolation/logout-cleanup test. This is **131** direct deterministic checks plus the browser acceptance test.

**Not yet wired into the end-user app**: offline pack UI, downloads, native protected video playback. No retroactive claim that Android can cache video after first viewing.

## Required follow-on delivery gates
1. Supplier clarification for in-app offline encrypted cache (not raw user-downloadable files). If denied, use **online streaming + offline poster/instruction fallback only**.
2. Private storage of versioned Golden videos in `exercise-media` with idempotent uploads and per-object SHA-256 integrity proof; separate private/optimized poster strategy, not 1.68GB raw PNG in APK.
3. Server-verified entitlement/account scope for temporary signed streams, expiry, CORS, Range 206 and seek, without exposure to anonymous callers. **Existing deployed broker only validates JWT and serves V1 (226 IDs); no verified commercial entitlement and no V2 catalog mapping yet**. Staged client must not claim support for V2 playback until a separately reviewed versioned server cutover.
4. If licensed, an approved Android **app-private secure media adapter** with encryption, owner separation, capacity/quota and cleanup on logout. Keep source files inaccessible through share/export routes; verify offline playback without network on physical Samsung, not merely browser emulation.
5. Workout-level Wi-Fi-first explicit download with visible MB budget and offline readiness (never download all 582 videos by default). No cellular download without express consent; no silently recurring data usage.
6. Existing offline exercise execution and session queue must pass flight-mode, restart, retry, account switching and reconnect tests independently; no change to Calculation/Context/Decision Engines.
7. Independent code/security review, exact SHA Quality Gate, physical-device acceptance and PO release approval before merge to `main` or APK publication.

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
