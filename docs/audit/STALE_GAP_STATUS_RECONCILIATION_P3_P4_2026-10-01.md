# Stale gap-status reconciliation - P3/P4

**Date:** 1 October 2026
**Scope:** governance-only; no runtime or database changes.
**Verification baseline:** PR #508 head `2c0a26bff6b7a587a6a9202202d59013163da367` with Trainingskompas Quality Gate `36899823420` (#1354) SUCCESS.

## Reconciled records

### GAP-P3-033
- Historical implementation: PR #350, merge `c1e143272d06341781e749b1534dba95561c2669`.
- Current behavior proof: `core/fReplacementPrescription.test.js` 47/47 and `core/fExerciseSwapPrescriptionWeight.test.js` 34/34.
- `GAP_ANALYSIS_V2.md` already records the gap as CLOSED.
- Register correction: OPEN -> CLOSED_PROVEN.

### GAP-P4-003
- Historical implementation: PR #352, merge `56262b7190fa82afd442c9a671af1ee0f6a3facf`.
- Current behavior proof: `core/fWeekOverviewOwnership.test.js` 28/28.
- Owner-chain and cross-user isolation remain protected.
- Register correction: OPEN -> CLOSED_PROVEN.

### GAP-P4-004
- Historical implementation: same PR #352 / `56262b7190fa82afd442c9a671af1ee0f6a3facf`.
- Current behavior proof: `core/fWeekOverviewOwnership.test.js` 28/28, including the repo-wide unscoped-read guard.
- `GAP_ANALYSIS_V2.md` already records the gap as CLOSED.
- Register correction: OPEN -> CLOSED_PROVEN.

## Evidence semantics

Historical GitHub workflow records for PR #350/#352 are not available through the current workflow lookup, so this closure does not invent historical run IDs. It uses the merged implementation commits, the already-canonical CLOSED descriptions, fresh targeted tests on current code, and the current exact-head full Quality Gate from PR #508.

After reconciliation the 68-entry register is: 27 OPEN, 33 CLOSED_PROVEN, 1 READY_FOR_ACCEPTANCE, 5 REVIEW_REQUIRED and 2 SUPERSEDED.
