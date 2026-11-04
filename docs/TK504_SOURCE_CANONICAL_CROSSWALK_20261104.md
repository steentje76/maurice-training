# TK-504 / PR #598 — Source → app crosswalk observation audit (2026-11-04)

Status: **read-only, report-only, fail-closed. Nothing is approved, activated or released.**
226 published stays unchanged, 356 stay pending/private, 245 AI-ACCEPT stay **unapproved
proposals**. No app index change, no Netlify/Supabase, no main merge, no APK, no media, no
owner-data writes. Implemented for independent audit and a controlled private read-only run.

## What was built

| File | Purpose |
| --- | --- |
| `tools/movekit-v2-source-app-crosswalk.py` | Pure module: `build_crosswalk`, `audit_field`, `analyze` / `evaluate_crosswalk`, plus a private CLI `run`. |
| `tools/test_movekit_v2_source_app_crosswalk.py` | 45 synthetic tests (226 published + 356 ledger corpus from the existing fixtures). |

No existing file was modified. In particular the **release gate
(`movekit-release-authority-gate.py`) is unchanged** — see "Gate integration decision".

## What the crosswalk is (and is not)

It records how the 226 already-published rows *historically* related a supplier term to an
app label, per field (`primary`, `secondary`, `equipment`, `pattern`), then measures how the 245
ACCEPT proposals line up with that history. It is an **observation**, not a translation table,
not exercise truth, and not approval. `classification_approved`, `release_authorized`,
`gate_flags_cleared`, `runtime_enabled`, `scientific_truth_claimed`, `goals_supported`,
`category_type_evidence_provided` are always `false`; evidence kind is always
`HISTORICAL_ONLY_NOT_SOURCE_PROOF`.

### Mapping rule (per field, per source term)

Only a **1:1 row** votes: exactly one source term and exactly one non-empty app label in that
field, for one published catalog id (a repeated exercise cannot vote twice; duplicate
catalog/provider ids fail the whole build).

| Status | Meaning |
| --- | --- |
| `SUPPORTED_HISTORICAL` | ≥ 3 distinct published ids, all voting for the **same** single app label, and no multi-term published row that carries the source term without that label. Direction is source → app only; no reverse claim is ever made. `target_shared_by` reports when several source terms share a label. |
| `CONFLICT` | ≥ 2 different labels among the 1:1 votes (so 2:1 is a conflict), **or** ≥ 3 unanimous votes contradicted by a multi-term row (`counter_rows`). |
| `TOO_FEW_OBSERVATIONS` | One label, fewer than 3 votes. Unresolved. |
| `MULTISOURCE_AMBIGUOUS` | Seen only in multi-term rows; many-to-many, never mapped. |
| `NO_DATA` | Never seen, or seen only with an empty/unusable app list. |
| `BLOCKED_FALSE_SYNONYM` | A vote pairs a hard-blocked source/app concept (below). Overrides any support. |

**Empty app lists** (common for secondary muscles) are neither a positive mapping nor a
counter-example. Source terms and app labels are normalised only by Unicode NFKC, casefold and
separator folding (`Lower-Back` = `lower back`); nothing else is merged.

### Hard blocks (canonical level)

* `FOREARMS_NOT_GRIP` — Forearms / Onderarmen / `movekit:muscle:forearms` ↛ Grip / Greep / grip strength.
* `LOWER_BACK_NOT_RUG` — Lower Back / Onderrug / lumbar / `movekit:muscle:lower_back` ↛ Rug / Back (generic).

They apply to the published history **and** to the accepted proposals, even when the source
label never occurs among the 226 (tests prove this). Generic `Back → Rug` is not blocked.
The 18 namespaced glossary terms may be listed as `namespaced_proposals`:
`review_required: true`, `runtime_enabled: false`, `replaces_app_label: false`,
`forced_translation: false`. A glossary that is approved/active/non-namespaced is ignored with a flag.

## Audit of the ACCEPT proposals (no approval)

Per accepted entry and field the module compares the entry's source terms and accepted labels with
the historical map. Field statuses, highest priority first: `BLOCKED_FALSE_SYNONYM`,
`ACCEPTED_EMPTY_NOT_EVIDENCE`, `HISTORICAL_CONTRADICTION` (supported target missing, or an extra
label when every term is supported), `HISTORICAL_CONFLICT`, `UNRESOLVED_COVERAGE`,
`HISTORICAL_MATCH_ONLY`, plus `AI_LABEL_WITHOUT_SOURCE_TERM`, `NO_DATA_BOTH_EMPTY`,
`SOURCE_OR_ACCEPTED_UNUSABLE`. **`HISTORICAL_MATCH_ONLY` never clears a gate flag** and is not
approval; it only says that earlier published rows were consistent.

* **Goals**: the supplier has none → reported only as `UNSUPPORTED_NO_SOURCE_FIELD` counts.
* **Category/type**: not assessed here (the release gate compares them against the baseline).
  Pattern observations are explicitly *not* category/type evidence.

## Output safety

* Public aggregate `report`: counts, status/flag codes, and domain-separated SHA-256 term ids.
  No supplier string, app label, provider slug, note, URL, media path, catalog id, reviewer or
  rationale text. Every string is sanitizer-checked (hex id / UPPER code / schema name / field name).
* `private_audit`: catalog id + field status/flag codes only. Still keep it private.
* The CLI refuses any output outside `<source>/.tk-private-review/`, refuses repo paths and
  existing files, and creates exclusively. The module has no network, DB or media I/O.

## Binding (fail-closed)

`analyze` returns `INPUT_INVALID_FAIL_CLOSED` with no mappings and a `fail_code` when: supplier ≠ 582
unique slugs, catalog ≠ 226, inventory ≠ 582 or not 1:1 with supplier, a published row's
`provider_id`/catalog id does not match supplier + inventory, pins are malformed or stale, the
ledger fails the existing `LEDGER.validate` (fake provider id, wrong supplier record SHA, wrong
`supplier-sha256` ref, stale source hashes), or optional `expected_digests` mismatch. `report.binding`
holds the object digests used.

## Gate integration decision: **not integrated**

The G6/G7 gate is already fail-closed with `release_authorized` always `false`. A historical match
cannot legitimately clear a `*_NOT_SOURCE_BACKED_VOCAB_ONLY` / `*_SOURCE_TERM_OMITTED` flag, and the
crosswalk's certainty is observational, so wiring it in would add risk and no authority. The
crosswalk is an independent report with exact `blockers`. Tests pin that the gate source does not
reference the crosswalk and that the gate output is identical before/after running it.
If a later reviewer wants it inside the gate, it must stay informational-only and
`historical-only` labelled.

## How to run

Synthetic tests (no private data):

```
python tools/test_movekit_v2_source_app_crosswalk.py
python tools/test_movekit_release_authority_gate.py
```

Real private run (performed and independently checked by ChatGPT after the initial implementation):

```
python tools/movekit-v2-source-app-crosswalk.py ^
  --source-root C:\Movikit ^
  --ledger C:\Movikit\.tk-private-review\<ledger>.json ^
  --output C:\Movikit\.tk-private-review\<new-file>.json
```

Pins are computed from the real file bytes and must equal the ledger's `source_hashes`; the output
contains `{report, private_audit}`.

## Remaining human review (nothing here replaces it)

1. Qualified review of **every** accepted field of every proposal; this audit cannot approve one.
2. Expert review of the proposed glossary terms and the two false-synonym rules, followed by
   one concise owner approval decision where genuinely required (not per-exercise data entry).
3. Goals for any accepted entry (no source field exists) and category/type via the release gate.
4. Contradiction/conflict/unresolved counts in the real run must be triaged by a human.
5. Server-side authorization (`PRODUCTION_AUTH_CONTRACT_NOT_IMPLEMENTED`) is still open; #577/#582/#584
   and the joint UX review remain open; no APK.
6. Known limits: "unanimous ≥ 3" shows consistency of earlier publishing decisions, which may itself
   be wrong; the 1:1-only voting ignores multi-term rows except as counter-evidence; alias lists for
   the two hard blocks are a conservative minimum, not an exhaustive thesaurus.

## Independently verified real-source run — 4 November 2026

ChatGPT independently executed the isolated, read-only CLI against the real private
582-record supplier metadata, current 226-record published catalog, pinned 582
inventory, 356-entry source-bound ledger and the proposed 18-term glossary. The output
was written **exclusively** to the authorized developer PC, outside Git:

`C:\Movikit\.tk-private-review\TK504-V2-SOURCE-APP-CROSSWALK-OBSERVATION-20261104.json`

Result: `HISTORICAL_OBSERVATION_ONLY_NOT_APPROVED`. The report remains fully blocked:
`classification_approved=false`, `release_authorized=false`,
`gate_flags_cleared=false`, `runtime_enabled=false`. Historical source-term
agreement is **not** evidence of scientifically correct classification.

| Field (245 AI-ACCEPT proposals) | Historical agreement only | Conflict | Contradiction | Unresolved | Both empty |
| --- | ---: | ---: | ---: | ---: | ---: |
| Primary muscles | 225 | 0 | 0 | 20 | 0 |
| Secondary muscles | 20 | 51 | 0 | 136 | 38 |
| Equipment | 218 | 27 | 0 | 0 | 0 |
| Movement pattern | 79 | 137 | 25 | 4 | 0 |

These are **field-wise statuses**, not unique review tasks or defects: each exercise
has four fields, and there may be multiple flags across fields. The older independent
one-source/one-target preflight counted 174 primary matches, while this engine can also
mark a multi-term exercise as historical agreement when all its individual source terms
have independently supported historical mappings. This broader 225 is not a stronger
scientific evidence level and must never be treated as an approval.

Across the 226 baseline records, the false historical
`Forearms → Grip` correspondence was explicitly detected and marked
`BLOCKED_FALSE_SYNONYM`; no resulting canonical mapping is available. Generic
`Lower Back → Rug` is proactively blocked even without an existing supporting row.
The large number of movement-pattern conflicts reflects broad supplier movement
categories versus more specific app movement patterns; no one-to-one conversion was
forced. The 18 namespaced glossary entries remain **unapproved**.

**Independent verification:** 45/45 focused synthetic crosswalk tests PASS;
full Python MoveKit test suite **289/289 PASS** with zero expected failures,
`git diff --check` PASS. No production account, workout history, import,
data migration, entitlement, media, release manifest, app runtime or APK was touched.

The output hashes have domain separation and redact plain source terms, but small
controlled vocabularies may still be guessed from unsalted hashes. Treat the
detail report as internal project evidence, not as material for unrestricted release.
