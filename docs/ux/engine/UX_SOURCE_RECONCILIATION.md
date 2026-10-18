# UX Knowledge Reconciliation v1

The engine MUST distinguish **CURRENT**, **TARGET**, **GAP**, and **PROVEN**. Existing TK runtime is evidence of behaviour, never automatic evidence of good UX.

## Promotion rule
A screen/component/pattern may enter generator canon only as:
- CANONICAL_REUSE — proven and target-compatible;
- REUSE_WITH_FIX — useful foundation with explicit delta;
- LEGACY_DO_NOT_COPY — existing but forbidden as generator template;
- TARGET_NOT_IMPLEMENTED — approved target, not runtime fact;
- PO_REVIEW_REQUIRED — unresolved.

The machine-readable source inventory is `UX_SOURCE_REGISTRY.json`. Every source keeps its own role/age/authority; no silent reconciliation.

## Required reconciliation pass
1. inventory all screens/actions from runtime and Route Map;
2. inventory target composition/tokens/behaviour from approved baseline/design system;
3. ingest H4/H5/H6/H7/H8/H10 only with staleness/coverage flags;
4. ingest current-target gap, screen scorecard, migration checklist, screen-specific audits and Decision Log;
5. classify every reusable surface;
6. only then populate Component/Flow/Pattern registries.

This prevents the engine from reproducing a poor current TK screen merely because it exists.
