# MoveKit Private Media — Pilot & Integrity Runbook

**Date:** 1 oktober 2026  
**Scope:** existing Batch-001 set (226 videos) only.  
**Batch 002:** remains BLOCKED.  
**Production project ref:** `mhfxhzkdmgkaplicdszg`.

## Proven production baseline

- Migration `movekit_private_media_foundation_v578` is applied in production.
- Storage bucket `exercise-media` exists with `public=false`.
- Bucket limit = 32 MiB; allowed MIME = `video/mp4`.
- Storage object policies remain avatar-only; no broad authenticated/anonymous exercise-media policy exists.
- Production Netlify deploy `c64f4f59f70903831c34b5f7a420c557d3b0ddcc` is ready and contains `exercise-media-url`.
- At the start of this runbook the private bucket contains 0 objects.
- The existing public application remains unchanged until a later verified cut-over.

## Canonical media manifest

`docs/generated/MOVEKIT_MEDIA_MANIFEST_V1.json` is generated from:
- canonical `exercise-catalog.json`;
- the current `videos/<provider-slug>.mp4` set.

For every current MoveKit exercise it records:
- `catalog_id`;
- provider + provider slug;
- immutable target object path;
- SHA-256;
- byte size;
- MIME.

Current proven inventory:
- 226 unique exercises/videos;
- 528,679,284 bytes total;
- no duplicate catalog IDs, provider slugs or object paths.

Regenerate only when deliberately changing the canonical current media set:

```bash
node tools/movekit-media-pilot.js --write-manifest
```

Normal verification is read-only:

```bash
node tools/movekit-media-pilot.js
```

A stale/missing manifest is a hard failure.

## Bounded pilot

The initial pilot is deterministically the first three canonical items:
1. TK-000001 — `abdominals-stretch-variation-four`
2. TK-000002 — `abdominals-stretch-variation-one`
3. TK-000003 — `abdominals-stretch-variation-three`

The uploader uses the official Supabase CLI. It does not read or request a service-role secret.

Prerequisite: an already-authorized Supabase CLI session on the operator workstation.

```bash
npx supabase@latest login
node tools/movekit-media-pilot.js --upload-pilot --pilot-count 3
```

The tool:
- lists the private target prefix first;
- refuses to overwrite an existing pilot object;
- uploads only canonical local files;
- fixes `video/mp4` and long-lived immutable object cache control;
- prints catalog/path/hash/byte evidence, never credentials.

Do not paste Supabase access tokens into repository files, logs, issues, chat, or documentation.

## Required post-upload proof

A successful upload alone does not authorize application cut-over. Before Phase 2:
1. confirm the three Storage objects exist at the manifest paths;
2. compare object/download SHA-256 and size with the manifest;
3. call the deployed `exercise-media-url` broker from a normal authenticated TK session;
4. verify unauthenticated broker requests fail;
5. verify the returned short-lived URL supports HTTP Range/seek;
6. verify wrong catalog ID / wrong slug cannot select another exercise;
7. verify no signed URL or bearer token appears in telemetry/logging;
8. delete no public/static media yet.

Record exact evidence before expanding the pilot.

## Current operational blocker

The connected development workstation currently has no authenticated Supabase CLI session. The official CLI reports that no access token is available. No credentials were read, copied, created or bypassed.

Therefore:
- manifest/integrity tooling can be built and tested now;
- the three-object production upload must wait for a legitimate Supabase CLI login;
- dual-read application code must not be activated before the pilot + Range/broker proof;
- Batch 002 remains blocked.

## Next controlled step after pilot proof

Only after the bounded pilot is green:
- expand upload to all existing 226 manifest objects;
- prove object count + full checksum parity;
- implement Phase 2 `MediaAccessBroker` dual-read with private signed media primary and explicit temporary public fallback;
- then perform web + Android device proof before public-route removal.
