# GAP-P2-010 — Service-worker runtime-core precache closure candidate

**Baseline:** `8c2c75027e26b0c170f26b60fe7f92c5f33101f2`  
**Branch:** `audit/gap-p2-010-pwa-precache-v1`  
**Canonical gap status:** intentionally remains OPEN until merge + audit reconciliation.

## Re-audit finding

The historical gap recorded 13 missing runtime `core/*.js` modules. On the current baseline, `index.html` loads **94** runtime core scripts while `sw.js` precached only **26**. Therefore **68 runtime core scripts were missing** before this change.

## Change

- `sw.js`: all **94/94** runtime `core/*.js` paths are now in `STATIC_ASSETS`.
- `CACHE_NAME` and `CACHE_STATIC`: `v470070` → `v470071`.
- `core/sw-guard.test.js`: the precache assertion now derives the runtime core-script set directly from `index.html`; a newly wired runtime core module without a matching precache entry fails the discovery-based release gate.
- Additional guard: every discovered runtime core script path must exist as a repository file.
- Existing protected-core `CORE_SIG` coverage is unchanged because no calculation/decision core implementation changed.

## Verified invariant before CI

- Runtime core scripts in `index.html`: **94**
- Runtime core scripts precached before: **26**
- Missing before: **68**
- Runtime core scripts precached after transformation: **94**
- Missing after: **0**

## Scope boundary

No calculation, context, decision, AI, training execution, persistence, nutrition semantics, entitlement logic, database migration, or GAP-P2-008 / PR #492 code is changed here.
