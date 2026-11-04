# TK504 — signed-media requires a reviewed canonical exercise binding

**4 November 2026 — staged Draft PR #599, not production release**

## Gap closed in draft broker

Before this change, an artificially enabled V2 signing request could pass a
release JSON entry and a broad per-user `movekit_v2` entitlement without proving
that the **individual exercise** was approved as a canonical active TK row.

`netlify/functions/exercise-media-v2-url.js` now checks, **on every signing
request**, in this order:

1. Exact pinned Golden video/poster identity and separately reviewed media
   release entry (unchanged).
2. Authenticated Supabase user identity and current per-user DB grant (unchanged).
3. **New**: exact `movekit_exercise_bindings` row for that catalog ID;
   `approved=true`, `reviewer_kind=human`, valid review reference/date,
   matching provider ID, Golden inventory SHA-256, reviewed taxonomy digest and
   reserved `movekit-v2-TK-XXXXXX` exercise ID.
4. **New**: separate read-only lookup of that exact `exercises` row, requiring
   `scope=global`, null owner/user fields and `active=true`.
5. Only then may the server request the existing 60-second private signed URL.

The staged client now presents an explicit content-binding denial as
`MEDIA_NOT_RELEASED` rather than misleadingly reporting a subscription/
entitlement problem. Unknown 403 failures remain `ENTITLEMENT_REQUIRED`, and
account switching during the denial response invalidates that request.

All backend requests are exact-ID, GET-only, `no-store`, redirect-rejecting and
use only the server-side credential. Missing, duplicate, malformed, stale,
personal, inactive or AI-only approvals are denied; backend failures return
unavailable without signing. Client input cannot select a database owner,
exercise ID, bucket, storage path or raw media URL.

## Verification

- Synthetic broker security scenarios: **32 PASS**, including malicious and
  stale binding responses, owner-scope collisions and backend failures.
- Synthetic client ↔ broker ↔ grant ↔ binding ↔ exercise ↔ signer: **16 PASS**.
- Previously published 226 continue using their existing V1 path; no V2
  activation or fallback changes.
- CI Quality Gate to be recorded only after exact commit checks complete.

## Remaining gates

This is a **server-side read authorization check**, not a trusted review
issuance service or production content-release authority. The migration for
`movekit_exercise_bindings` remains staged and unapplied to live Supabase;
it enforces review freshness via a database trigger when/if approved and
deployed. A privileged transactional import/approval writer, authenticated
reviewer identity, rigorous review of 356 candidate exercises, immutable
signed/audited release manifest, licensing review, real-user and physical
Samsung/PM5 acceptance are still required. Historical source agreement is not
human approval. All 356 candidates remain **NOT_PUBLISHED**. The checked-in
`MOVEKIT_V2_RELEASE_GATES.json` remains **BLOCKED_NOT_REVIEWED**.

**No database mutation, user-rights issuance, deployment, main merge or APK.**
