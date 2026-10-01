# MoveKit Media Scale Gate — Architecture Decision

**Date:** 2026-10-01  
**Baseline:** `2be79b09129f56a04d09d16e7803e37e2d75b21c`  
**Related:** issue #504 · DEC-MOVEKIT-002 · EXERCISE-MEDIA-001  
**Status:** **TARGET ARCHITECTURE SELECTED; IMPLEMENTATION / CUT-OVER NOT YET PROVEN**  
**Batch 002:** **BLOCKED until the acceptance gates in this document are complete.**

## 1. Why this gate exists

The current MoveKit implementation is safe as a Batch-001 pilot but is not a proven scale architecture.

Current canonical facts:
- exercise catalog: 226 MoveKit exercises;
- supplied full library: 412 unique MoveKit exercises;
- 186 additive exercises remain after exact provider-slug reconciliation;
- current videos in normal Git: about 437 MB;
- current repository `.git` was recorded at about 567 MB after Batch 001;
- the remaining 186 videos were previously estimated to add about 630 MB;
- Android deliberately excludes `videos/` from the Capacitor bundle;
- web/PWA media is served from the production Netlify origin;
- Android currently resolves media directly to `https://maurice-art.netlify.app/videos/<slug>.mp4`;
- the PWA service worker maintains a separate 250 MB video cache.

The current path therefore couples licensed binary media to Git history and public static hosting.

## 2. New compliance finding

The supplied MoveKit library package references **MoveKit License Agreement v1.0**.

The currently published agreement permits use and streaming inside mobile/web products, but its Delivery to End Users clause prohibits publicly exposing raw content-file URLs or download links to unauthorized parties.

Current TK behavior explicitly exposes direct static MP4 locations to the client and tests that Android resolves to the public Netlify media URL. This is a delivery-model risk and must be resolved before expanding the library.

This document is an engineering/compliance interpretation, not legal advice. If there is any ambiguity about the approved protected-streaming implementation, written confirmation from MoveKit is the final authority.

## 3. Live platform facts verified on 2026-10-01

### Netlify
- production project: `maurice-art`;
- current main deploy after PR #503 is healthy;
- Netlify Large Media is deprecated and is not selected as the target.

### Supabase
- Trainingskompas production project: `Maurice training`;
- organization plan: **Pro**;
- live Storage currently contains only the private `avatars` bucket;
- there is **no live exercise-media bucket** today.

Therefore Supabase Storage is a target architecture, not an already-deployed MoveKit media layer.

Current Supabase Pro allowances make the media size non-problematic:
- 100 GB included file storage;
- Smart CDN on Pro;
- 250 GB cached egress and 250 GB uncached egress included per billing period before overage.

At the current library scale (~1 GB total video after all 412 exercises), storage headroom is large. Even a future ~10,000-exercise library at a few MB per clip remains within an object-storage architecture; bandwidth, not storage, will become the meaningful cost driver.

## 4. Options evaluated

### A. Normal Git + Netlify static media
**Decision: REJECT as long-term target.**

Advantages:
- already works;
- minimal code;
- same-origin web behavior;
- simple deploy semantics.

Problems:
- projected Git history crosses GitHub's ideal <1 GB repository guidance;
- binary history keeps growing permanently;
- every media expansion enlarges source-control operational burden;
- direct static URLs are public by design;
- does not solve the MoveKit delivery restriction.

Acceptable only as the temporary current state while protected delivery is implemented.

### B. Git LFS + Netlify/GitHub delivery
**Decision: REJECT as application-delivery target.**

Advantages:
- removes large binary payloads from ordinary Git objects;
- GitHub supports substantial LFS quotas depending on plan.

Problems:
- LFS is a source-control asset mechanism, not an application media authorization layer;
- downloads consume owner bandwidth;
- CI/checkouts can consume LFS bandwidth;
- does not inherently prevent public/raw asset URL exposure;
- Netlify Large Media, the historical Netlify-LFS delivery integration, is deprecated.

LFS may be considered later for archival/source workflows, but not as TK's runtime media origin.

### C. Public object storage
**Decision: REJECT.**

It scales technically but preserves the same raw-public-URL problem as Netlify static assets.

### D. Private Supabase Storage + short-lived authorized playback URL
**Decision: SELECTED TARGET.**

Why:
- already part of TK's platform stack;
- separates binary media from Git and Netlify deploys;
- private bucket supports authorization;
- Pro plan includes sufficient storage and Smart CDN;
- signed URLs can be short-lived and can be generated only after an authenticated, authorized request;
- preserves CDN/Range-friendly direct media delivery without proxying every byte through a serverless function.

### E. Private storage + byte-streaming proxy
**Decision: RESERVE / NOT DEFAULT.**

A Netlify/Edge proxy can hide the object-store URL completely, but it adds:
- a second bandwidth hop;
- serverless/edge compute cost;
- Range/streaming complexity;
- more failure modes in the critical video path.

Use only if MoveKit confirms that short-lived signed playback URLs do not satisfy its delivery requirements.

## 5. Target architecture

```
MoveKit licensed source files
        |
        v
offline import / integrity tooling
        |
        +--> Git: exercise metadata + media manifest + checksum + provenance
        |
        +--> private Supabase Storage bucket: exercise-media
                    |
                    v
authenticated access check
                    |
                    v
short-lived signed playback URL
                    |
                    v
Exercise media resolver
                    |
                    +--> Web <video>
                    +--> Android WebView <video>
```

### Source of truth
Git remains the source of truth for:
- exercise identity;
- provider slug;
- media type;
- expected object path;
- SHA-256 checksum;
- byte size;
- MIME type;
- optional media version.

Supabase Storage is the binary delivery store, not the exercise identity source.

### Storage layout
Proposed immutable layout:

```
exercise-media/
  movekit/
    v1/
      video/<provider-slug>.mp4
      poster/<provider-slug>.<ext>
```

If a file changes, prefer a new immutable version/path or versioned manifest record rather than silent in-place replacement.

### Access
- bucket is private;
- no `/object/public/` URLs;
- only authenticated TK users may request playable media;
- authorization is product access, not a new training-decision rule;
- signed URLs are short-lived and must not be written to telemetry, logs or durable user data;
- playback UI exposes no download action.

## 6. Application integration rule

Do **not** rewrite training screens around Supabase.

The existing abstraction is valuable:
- `ExerciseAssetProvider` remains the provider/identity registry;
- the canonical exercise remains identified by TK catalog ID + provider slug;
- `MediaUrlResolver` remains the single media-origin boundary.

Because signed URL creation is asynchronous, introduce an access layer rather than spreading Storage calls across UI code.

Recommended shape:

```
ExerciseAssetProvider.resolveDescriptor(catalogId, type)
  -> { provider, slug, path, checksum, mime }

MediaAccessBroker.resolvePlayableUrl(descriptor, authContext)
  -> short-lived playable URL

resolveExerciseMedia(...)
  -> existing UI-facing media object
```

The Calculation Engine, Context Engine, Decision Engine and AI Coach do not participate in media URL generation.

## 7. Cache / offline policy

During migration:
- do not add new licensed full-file caching behavior;
- preserve normal browser/CDN caching for authorized playback;
- do not key persistent caches by signed URL token;
- do not log signed URLs.

The existing `tk-videos-v1` full-response Cache API behavior must be explicitly re-evaluated before it is used with the protected origin. The target is to cache by canonical media identity if retained, never by tokenized URL.

Offline licensed-video availability is **not** a Batch-002 requirement. Correct authorization and reliable online playback have priority.

## 8. Migration plan

### Phase 0 — compliance contract
- record the MoveKit v1.0 delivery restriction;
- if needed, obtain written confirmation that authenticated short-lived signed playback URLs are an acceptable in-app streaming pattern.

### Phase 1 — storage foundation
- create private `exercise-media` bucket through a reviewed migration/controlled setup;
- define minimal authenticated policies;
- upload the existing 226 videos;
- generate a manifest with slug, path, SHA-256, byte size and MIME;
- prove object count/checksums against the current canonical media set.

### Phase 2 — dual-read application adapter
- add `MediaAccessBroker`;
- keep existing public Netlify path as temporary fallback behind an explicit migration state;
- signed private path is primary;
- failure is visible and fail-closed; never substitute another exercise's media.

### Phase 3 — device proof
Verify:
- web playback;
- Android WebView playback;
- HTTP Range behavior;
- seek/replay;
- expired signed URL refresh;
- offline/degraded state;
- wrong-slug and unknown-ID fail-closed behavior;
- no URL/token leakage into telemetry.

### Phase 4 — cut-over
After Phase 3 is green:
- disable direct public media resolution;
- remove `videos/` from the deployable working tree;
- update service-worker media behavior;
- retain old Git history for now; **do not rewrite protected main history as part of the cut-over**;
- verify Netlify production has no raw public MoveKit MP4 path.

### Phase 5 — Batch 002
Only after Phase 4:
- ingest the remaining 186 metadata records in bounded batches;
- upload their media directly to private Storage, never to normal Git;
- preserve exact provider-slug identity;
- keep intelligence UNKNOWN unless a deterministic evidence-backed classifier exists;
- run catalog/media/checksum/regression gates after every batch.

## 9. Scale expectations

Approximate planning, not a billing guarantee:
- 412 videos: roughly 1 GB order of magnitude;
- 1,000 videos: a few GB;
- 10,000 videos: tens of GB at the current average file size.

At ~2.5–3 MB average playback size:
- 10,000 full video plays/month is roughly 25–30 GB egress;
- 100,000 plays/month is roughly 250–300 GB.

That means Supabase Pro storage is not the early constraint; cached egress becomes the first meaningful scaling meter. Smart CDN and browser caching therefore matter.

## 10. Acceptance gates

Batch 002 remains BLOCKED until all mandatory items below are proven:

1. **ARCHITECTURE:** private object-storage target implemented, not just documented.
2. **LICENSE:** no publicly addressable raw MoveKit media path remains in the active application delivery model; any remaining ambiguity is resolved with MoveKit.
3. **INTEGRITY:** all migrated objects match canonical slug + checksum; no cross-exercise substitution.
4. **AUTHORIZATION:** unauthenticated access to protected media fails.
5. **WEB:** normal playback and seeking proven.
6. **ANDROID:** real-device playback and seeking proven.
7. **RANGE:** partial content / seek behavior verified against the selected delivery path.
8. **DEGRADED STATE:** expired/missing media fails visibly without breaking training logging.
9. **OBSERVABILITY:** no signed URL/token is recorded in telemetry.
10. **CUT-OVER:** Netlify/public raw-media route disabled after successful migration.
11. **REGRESSION:** existing ExerciseAssetProvider/media identity tests updated and green.
12. **PCC:** architecture/change evidence referenced from PCC after merge; PCC remains governance-only.

## 11. Decision

**Selected long-term direction:** private Supabase Storage plus short-lived authenticated playback URLs, behind the existing exercise-media abstraction.

**Rejected as long-term runtime delivery:** normal Git/static Netlify, Git LFS delivery, and public object storage.

**Immediate next implementation sprint:** build and validate the private storage/media-access path for the existing 226 exercises. Do not start the 186-item Batch 002 media import first.
