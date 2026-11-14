# TK504 / #614 — Private Storage byte-SHA verifier (original 226)

Status: **CODE-ONLY. Live verification NOT executed.** Authorizes nothing: no signing, grants,
uploads, DB writes, release-gate changes, activation, APK. #614 APK-HOLD remains; no owner B_ACTIVATE.

- Tool: `tools/tk504_private_storage_byte_sha_verify.cjs`
- Tests: `core/tk504PrivateStorageByteShaVerifier.test.js` (auto-discovered by `node core/release-gate.js`)
- Input (fixed, not configurable): `docs/generated/TK614_ORIGINAL226_PRIVATE_MEDIA_STAGING_MANIFEST_20261109.json`
  — 452 entries: 226 `video` (`exercise-media`, 780 852 020 bytes) + 226 `poster` (`exercise-posters`, 3 879 362 bytes).

## What it proves (and what it does not)

With `--live` it downloads each of the 452 objects in full over HTTPS GET, streams the body into a
`node:crypto` SHA-256 digest, and compares **full-content SHA-256, exact byte length, Content-Type**
against the manifest. It never relies on ETag/metadata. A `PASS` verdict requires all 452 to pass and
the verified byte totals to equal the pinned totals.

It does **not** prove: that the objects are licensed/approved for release, that RLS/grant policy is
correct, that signed URLs or CDN caching behave correctly, or anything about the 356 released assets.
The existing 226 → 404 `MEDIA_NOT_APPROVED` broker hard-block and the 356 private signing path are
untouched by this change.

## Commands

Offline (default; no network, no credentials, no env read):

```
node tools/tk504_private_storage_byte_sha_verify.cjs          # same as --check
node tools/tk504_private_storage_byte_sha_verify.cjs --check
node core/tk504PrivateStorageByteShaVerifier.test.js          # synthetic, loopback-only
node core/release-gate.js
```

Offline validates: schema/status, 452 entries, 226 per kind, TK-000001..TK-000226 coverage, unique
catalog id per kind, unique bucket+path, unique provider id ↔ catalog id, canonical paths
(`movekit/v2/video/<slug>.mp4`, `movekit/v2/poster-optimized/<slug>.webp`, slug = provider_id),
lowercase non-empty SHA-256, byte bounds, the pinned byte totals, plus the staging tool's own
invariants (order, `authorizes` all false, no URL/secret text, `all_sha256` self-digest). It then
builds all 452 request targets and prints the plan size. Exit 0.

Live (**only with separate coordinator authorization**):

```
# PowerShell: avoid typing/pasting the secret into a command recorded by PSReadLine history.
# Prefer a dedicated scoped, read-only credential from the approved secret manager.
$secure = Read-Host 'Storage read credential' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:TK504_STORAGE_VERIFY_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  node tools/tk504_private_storage_byte_sha_verify.cjs --live --concurrency 2 `
    --report-out C:\private-evidence\tk504-bytesha-<date>.json
} finally {
  Remove-Item Env:TK504_STORAGE_VERIFY_KEY -ErrorAction SilentlyContinue
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
```

- Credential is read only from `process.env.TK504_STORAGE_VERIFY_KEY`; never from a file, never
  printed. JWT-style keys are sent as `apikey` + `Authorization: Bearer`; opaque `sb_secret_…` keys as
  `apikey` only. Missing/malformed key → `BLOCKED_NO_CREDENTIAL`, exit 2, zero requests.
- Target is hard-coded: `https://mhfxhzkdmgkaplicdszg.supabase.co/storage/v1/object/authenticated/<bucket>/<path>`.
  No URL/origin/manifest CLI option exists. (A loopback `http://127.0.0.1:<port>` origin is accepted
  only by the exported function with an explicit test flag; the CLI never sets it.)
- `--report-out` must be an absolute path **outside the repo** and must not already exist; it adds the
  per-object list `{catalog_id, media_type, outcome, category}` (identifiers only). Keep it out of Git.

## Request/stream rules

- `GET` only, `redirect: 'manual'` (any 3xx → `REDIRECT_REJECTED`, never followed), `Accept-Encoding: identity`,
  any non-identity `Content-Encoding` → `CONTENT_ENCODING_REJECTED` (no transparent decompression).
- `Content-Length`, if present, must equal manifest bytes; stream is aborted as soon as it exceeds them.
- Per-object `AbortController`: total `--timeout-ms` (default 300 000) and idle `--idle-ms` (default 30 000).
- Concurrency `--concurrency` 1..3 (default 2). Bytes are hashed in-memory chunk by chunk; nothing is persisted.
- Retry: at most **one**, only for transient transport outcomes (`HTTP_TRANSIENT` 408/429/5xx,
  `NETWORK_ERROR`, `TIMEOUT`, `TRUNCATED_STREAM`). Never for SHA/size/MIME mismatch, 4xx or redirects.

## Report and exit codes

Stdout is one JSON object with aggregates only: `schema, mode, project_ref, manifest_file_sha256,
manifest_all_sha256, app_commit, status/verdict, checked, pass, fail, unable, retries,
video{expected,checked,pass,fail,unable,expected_bytes,verified_bytes}, poster{…}, categories{…}, duration_ms`.
No URLs, headers, response bodies, keys or content.

| Outcome | Categories | Meaning |
|---|---|---|
| `fail` | `SHA256_MISMATCH`, `SIZE_MISMATCH`, `OVERSIZE_STREAM`, `MIME_MISMATCH` | Storage served a complete response that differs from the manifest |
| `unable` | `AUTH_REJECTED`, `OBJECT_NOT_FOUND` (400/404), `REDIRECT_REJECTED`, `HTTP_ERROR`, `HTTP_TRANSIENT`, `NETWORK_ERROR`, `TIMEOUT`, `TRUNCATED_STREAM`, `CONTENT_ENCODING_REJECTED`, `RESPONSE_URL_MISMATCH`, `INTERNAL_ERROR` | API/CDN/network/auth problem; no content claim either way |

Verdict: `PASS` (exit 0) only if 452/452 pass; `FAIL_MISMATCH` (exit 1) if any `fail`;
`INCOMPLETE_UNABLE` (exit 1) if only `unable`. Usage/manifest/credential precondition errors exit 2.

Known limits: Supabase may report a missing object as HTTP 400; both 400 and 404 map to
`OBJECT_NOT_FOUND` (unable, not a digest claim). A strict `Content-Type` mismatch (e.g. objects
uploaded as `application/octet-stream`) is reported as `fail/MIME_MISMATCH` even if the SHA matched.
A live run downloads ~785 MB.

## Local test coverage (synthetic, loopback only)

All success (incl. concurrency 1 and ≤3 bound), wrong digest (no retry), Content-Length mismatch,
mid-body connection drop (retried once), short chunked body, oversized stream, 500/503 (one retry,
recovery), 401/403/400/404/418 (no retry), 302 (not followed), gzip encoding, wrong MIME, idle/header
timeout, connection refused, duplicate id/path and other tampering of the real manifest, malformed/missing
manifest file, no/malformed key and no `--live` (zero network), illegal flags, `--report-out` inside repo,
CLI `--live` wiring against a stub fetch (452 GETs to the fixed origin, aggregate-only output, key never printed).
Mutation-checked: disabling the digest compare or the redirect check makes the suite fail.

## Independent local poster archive check (2026-11-09, read-only)

Source PNG posters in `C:\Movikit\complete-exercise-library-posters-golden-release-…\posters` for the
226 originals vs. `docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json` poster sha256/bytes:
checked 226, pass 226, missing 0, size mismatch 0, sha256 mismatch 0 (701 833 212 bytes).
This covers the **source PNGs only**; the Storage objects are the derived optimized WebPs and remain
unverified until an authorized `--live` run.
