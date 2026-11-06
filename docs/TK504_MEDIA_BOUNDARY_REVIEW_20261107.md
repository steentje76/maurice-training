# TK504 — private media boundary review and hardening

Status: STAGED / release flags remain OFF. Reviewed baseline: PR #602 `61a58df`, stacked PR #604 `8aca60a`. No production, entitlement, media, database or APK writes.

## Changes

- The real V2 broker now checks the server-owned grant again after asynchronous Storage signing. Revoked/expired grants, failed rechecks, shortened entitlement and consumed ticket validity refuse to return the signed URL.
- Requested Storage TTL is at most 60 seconds and is capped by the grant's remaining lifetime. Less than 31 seconds is rejected to preserve the existing client's 30-second safety margin. The response deducts elapsed signing/recheck time from advertised validity.
- The existing canonical ExerciseAssetProvider bridge forwards its registered provider slug to the client. The client checks the returned URL against that exact asset path, in addition to the existing host/bucket/type/query checks. This is response-integrity validation, not client-side authorization.
- No alternative library, writer, stream server, publication flow or active release was introduced.

## Actual local verification

Executed in Node against actual broker/client/bridge code, with synthetic backend responses/time only:

- `node core/tk504MediaRenewalBoundary.test.js`: 15 PASS.
- `node core/movekitV2Broker.test.js`: 28 PASS.
- `node core/movekitV2ClientServerContract.test.js`: 15 PASS.
- `node core/movekitV2ExerciseMediaBridge.test.js`: 29 PASS.
- `node core/tk504ProtectedPlayback.test.js`: 17 PASS.
- `git diff --check`: PASS.

The new test is automatically discovered by the existing release gate. No real JWT, Storage GET/Range, Android/WebView, downloaded licensed bytes, or real entitlement revocation was exercised by these tests. Full combined Quality Gate remains the integration owner's responsibility.

## Remaining release blockers

1. **Legacy V1 signing and public distribution.** `netlify/functions/exercise-media-url.js` (handle/descriptor/sign) authorizes any valid account and signs V1 paths without V2 grant/release checks. If those objects and function credentials remain available, this remains an independent licensed-media access path. Do not disable it before verified replacement playback; close it during an explicit controlled cutover, along with 226 public MP4s and 206 embedded poster payloads.
2. **Direct signed URLs are bearer capabilities.** Another account can reuse an issued URL until Storage expiry. Client logout/DOM invalidation and broker entitlement rechecking cannot revoke a previously issued URL or downloaded bytes. A grant revoked just after the final check also has a bounded window. If strict per-request account-bound replay prevention is required, an authenticated streaming boundary supporting Range is needed; direct signed links cannot honestly provide that guarantee. Requested TTL uses local issuance time; Storage issuance/transport timing must be measured in actual acceptance.
3. **Browser/CDN cache.** Broker JSON `no-store` and the service worker's Supabase bypass do not control the Storage object's GET cache headers. Verify actual video/poster `Cache-Control`, account-switch reuse and expiry/Range behavior; do not infer no-cache from the broker response.
4. **Issuance audit/rate limiting.** No reliable shared issuance limiter or bounded audit sink is wired into the V2 broker. A process-local map would not enforce a distributed limit and can grow unbounded. No such substitute was added. Choose existing persistent/edge infrastructure and test it before production; posters still issue one broker request each and need measured concurrency/batching behavior.
5. **Timeouts and real-service/device proof.** The broker has no explicit backend timeout. Real two-account Auth/PostgREST, signed Storage GET/206/seek, expiry refresh, offline/restart and Android/WebView acceptance remain open, as do license-holder verification and production approval.

These changes close narrow code defects and add regression evidence. They do not establish production readiness or claim all 582 exercises are available.
