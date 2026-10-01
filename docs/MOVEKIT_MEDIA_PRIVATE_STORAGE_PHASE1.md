# MoveKit Private Media — Phase 1 Foundation

**Baseline:** main after PR #505  
**Scope:** storage/auth foundation only; **no playback cut-over** and **no Batch 002 import**.

## Implemented

- `migratie_v578.sql` defines private bucket `exercise-media`.
- Bucket permits only `video/mp4` in Phase 1.
- Hard object limit is 32 MiB. Current 226-file evidence: 528,679,284 bytes total; largest file 8,514,448 bytes.
- No anon/authenticated Storage policy is created. Live preflight proved all existing object policies are avatar-only.
- `netlify/functions/exercise-media-url.js` is the access broker:
  - requires a valid Supabase JWT;
  - accepts canonical `catalog_id`, not a Storage path;
  - derives MoveKit slug from `exercise-catalog.json`;
  - signs the fixed private object path server-side using service role;
  - TTL = 300 seconds;
  - response is `no-store`;
  - supports the allowlisted Android/WebView origin but does not use Origin as an auth boundary.
- `core/fExerciseMediaPrivateStorage.test.js` guards default-deny, path derivation, auth, signing, CORS and no-public-URL semantics.

## Deliberately not implemented

- No current media file is uploaded by this change.
- No UI caller uses the access broker yet.
- No `ExerciseAssetProvider` / `MediaUrlResolver` behavior changes yet.
- Existing public Netlify videos remain active during Phase 1.
- No poster delivery is added.
- No service-worker cache change.
- No Batch 002 exercise/media import.

## Required before production migration is useful

After merge and exact-head Quality Gate:
1. apply the storage migration through the governed Supabase migration path;
2. verify bucket `public=false`, MIME/size limits and absence of non-avatar broad policies;
3. upload a bounded pilot subset of existing 226 videos to immutable paths;
4. validate the access broker against real objects and Range playback;
5. only then design dual-read/cut-over.

This keeps the working application unchanged while creating the protected delivery foundation required by the Media Scale Gate.

## Production verification — 1 oktober 2026

Post-merge read-only verification confirms:
- migration `movekit_private_media_foundation_v578` is present in production;
- bucket `exercise-media` exists with `public=false`, 32 MiB object limit and `video/mp4` allowlist;
- object policies on `storage.objects` remain avatar-only;
- production Netlify deploy `c64f4f59f70903831c34b5f7a420c557d3b0ddcc` is ready and includes `exercise-media-url`;
- the private bucket is still empty before the bounded pilot.

The next controlled action is therefore the bounded integrity pilot documented in `docs/MOVEKIT_MEDIA_PILOT_RUNBOOK.md`. Phase 2 dual-read and Batch 002 remain blocked until that pilot proves real-object signing, Range/seek and authenticated broker behavior.

