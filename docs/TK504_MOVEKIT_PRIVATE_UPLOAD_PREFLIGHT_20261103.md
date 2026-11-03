# TK504 — MoveKit V2 private media transfer preflight (isolated workstream)

Date: 3 November 2026
Branch: feat/tk504-media-upload-preflight-20261103
Base SHA: cbac55c569595ffc86a5ef35f452e8fbade01fa0
Governance: MoveKit #504 / Draft PR #595 and preceding repair PR #587.

## Scope
Prepare secure, idempotent migration of 582 vendor MP4s and the corresponding
582 optimized WebP posters from authorized local media into private Supabase
Storage. This workstream does NOT deploy a broker, activate V2 media, modify
the live database, mutate any currently published URLs, merge to main or build
an APK. The separate server-side V2 entitlement workstream must be reviewed
and integrated before any commercial-media delivery.

The code works only with source files on the approved desktop. The repository
is public: vendor MP4s, PNGs, WebPs, paid exercise instructions and private
per-object transfer manifests are not committed to GitHub.

## Result from real source
Source: C:\Movikit, using the Golden 2026-10-04 hashed inventory from the
current Draft PR #595 and the private optimized-poster registry.
- 582 MP4 files, 2,047,785,201 bytes.
- 582 optimized WebP posters, 9,634,714 bytes.
- 1,164 media objects and 582 distinct canonical catalog exercise IDs.
- Every local MP4 and WebP file re-hashed to its expected SHA-256.
- All version-2 storage object keys derived from canonical IDs and verified
  provider slugs. No fuzzy names or fabricated exercise-ID bindings.
- Immutable V1 and V2 paths never overwritten.
- Local private plan: C:\Movikit\.tk-private-review\
  TK504-PRIVATE-MEDIA-UPLOAD-PLAN-20261103.json
- Upload status: **NOT EXECUTED**; remote object count currently known as zero
  for exercise-media. No billing-relevant 2GB media transfer was initiated.

## Remote prerequisites
Supabase project: Maurice training (mhfxhzkdmgkaplicdszg).
Read-only preflight on 3 November 2026: private exercise-media bucket exists
with MIME video/mp4 and a 32MiB per-object limit, 0 objects.
The separate private exercise-posters bucket does NOT exist. It is specified
as the target for optimized image/webp media but must be provisioned,
independently reviewed, and confirmed private before its first upload.
No bucket, RLS, grants, table or other production resource was changed here.

## Non-destructive transfer gates
tools/movekit-private-upload-plan.py:
- default audit is offline/read-only, validates all 1,164 hashes.
- --mode plan writes ONLY in C:\Movikit\.tk-private-review and refuses
  output in the public Git checkout or an arbitrary directory.
- --mode execute has no public upload, overwrite, update or delete support.
  Execute requires explicit --kind, approval reference, checked private-bucket
  settings, review-gated environment variables, and a separately provided
  service key. Never supply service keys in command arguments, source files,
  GitHub comments or logs.
- transfers are sequential and bounded to max 20 objects / max 64 MiB
  per invocation (default 1 object / max 16 MiB).
- existing private objects are downloaded and independently SHA-256 verified
  before skipping; mismatched paths STOP rather than overwrite.
- newly uploaded objects are downloaded and SHA-256 verified before recording
  success. Redirects are forbidden to prevent credential exfiltration.
- a missing/unsafe bucket, wrong MIME, path traversal, source checksum error,
  missing approval or remote outage STOPs without silently continuing.
- signed URLs and public media URLs are not generated.

The script is executable infrastructure but has not been authorized to
perform a remote upload in this workstream. Its explicit manual gates are
defense in depth and not a substitute for licensor/owner release review.

## Verification
Run:
  python tools/test_movekit_private_upload_plan.py
  python tools/movekit-private-upload-plan.py --source C:\Movikit --mode audit

Synthetic tests include a fully generated 582×2 media fixture, completeness,
SHA/size corruption, canonical binding, private-only plan path, no overwrite,
remote verification, transfer budgets, strict bucket MIME/private checks,
no redirect and malformed/traversal object paths. No vendor media or test
credentials leave the authorized PC.

## Unresolved integration gates
1. Server-side user entitlement and per-object approved catalog permissions.
2. Supplier evidence reference for encrypted media, legal/commercial review.
3. Create and verify private WebP bucket and controlled client/proxy delivery.
4. Approved release manifest, physical Android offline/Range/mobile-byte QA.
5. Independent code/security review, current-SHA CI, acceptance signoff.
6. Maintain owner order: repair reported issues, jointly review UX, then APK.

This work must be integrated back into PR #595 only by a controlled,
non-conflicting merge. Do NOT merge it directly into production main.
