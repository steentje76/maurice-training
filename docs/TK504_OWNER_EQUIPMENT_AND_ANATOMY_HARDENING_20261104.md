# TK504 owner equipment facets (G2) and TK-000539 anatomy (G2b) – 2026-11-04

Base: branch `feat/tk504-owner-review-terms-20261103`, HEAD `225fcca`. Draft PR #598 only.
**Uncommitted**, for independent audit. The private supplier/owner folder (`C:\Movikit`) was
**not read**; all tests are synthetic. No catalog, runtime index, DB, media, grant, APK, `main`
merge or production change. The owner read the exceptions report but has **not** formally
approved a release. All 356 exercises stay pending human review; nothing is approved here.

## G2 – owner-proposed equipment facets

Finding: the 12 owner metadata proposals use 8 distinct extra equipment facets; only `bench`
and `medicine_ball` exist in the supplier-exact taxonomy registry. These are owner suggestions,
not supplier attributes.

Change:
* New `tools/movekit-v2-owner-facet-proposals.json` (schema `tk504-owner-facet-proposals/1.0`,
  version 1), independent of `tools/movekit-v2-taxonomy-map.json`. It lists all 8 snake_case
  keys: `bench, cambered_bar, dip_belt, jump_rope, medicine_ball, pull_up_bar, trap_bar,
  wall_target`. Every entry: `source=OWNER_FEEDBACK_NOT_SUPPLIER_ATTRIBUTE`, `approval=false`,
  `canonical_filter_mapping=null`. Top level: `status=PROPOSED_NOT_APPROVED`, `approval=false`,
  `runtime_activation=false`.
* The supplier-exact taxonomy map was **not** modified (still 18 terms; the six missing owner
  terms were not inserted). `bench`/`medicine_ball` having a same-named supplier term gives
  them no mapping or approval in the owner registry.
* `movekit-v2-source-metadata-proof.py`: `validate_facet_registry` (strict flags, key format,
  exact entry shape), `validate_rules_facets` (every `RULES` facet must be a registry key),
  both run inside `reconcile`. The proof output now has `owner_facet_registry`
  (`schema, version, source, status, facet_count, sha256`; sha256 = canonical-JSON hash of the
  registry) and each correction has `owner_facet_source`.
* `movekit-v2-private-reviewed-stage.py`: `verify_metadata_facets_and_anatomy` revalidates the
  registry file loaded at stage time, requires the proof's `owner_facet_registry` to equal the
  freshly computed record (so hash, count, flags and provenance must match), requires every
  suggested facet to be a registry key and `owner_facet_source` to be the owner source. The stage
  evidence copy keeps `approved:false` and adds `suggested_facets_source`.

## G2b – TK-000539 (`EXACT_LOWER_BACK_TAG`)

Finding: the only evidence term is `wide-stance` – a movement stance, not evidence of a
lower-back anatomical tag.

Change:
* The proof emits for TK-000539 only: `review_status=ANATOMICAL_TAG_NOT_EVIDENCED_REQUIRES_REVIEW`,
  `evidence_kind=MOVEMENT_STANCE_NOT_ANATOMICAL_EVIDENCE`, `anatomical_tag_claim_valid=false`,
  `safe_for_automatic_import=false`, and an evidence note that no anatomical claim is made. The
  supplier equipment/muscle/pattern fields stay untouched (`*_unchanged`).
* `reconcile` rejects issue `EXACT_LOWER_BACK_TAG` for any other id, and rejects TK-000539
  carrying any other issue.
* The stage accepts the exceptional status only for TK-000539 and only when issue, status,
  evidence kind, `anatomical_tag_claim_valid is False`, `safe_for_automatic_import is False`,
  terms `['wide-stance']` and empty facet list all match exactly. TK-000539 with the generic
  status ("downgraded") is rejected; any other id with the status, evidence kind, issue or the
  `anatomical_tag_claim_valid` field is rejected (`ANATOMICAL_STATUS_NOT_PERMITTED`).

## Tests (all synthetic)

New `tools/test_movekit_owner_facets_and_anatomy.py` (27 tests): registry covers exactly the 8
keys and the `RULES` facets; flags/source/mapping pinned; supplier taxonomy map not extended
(overlap exactly `bench`, `medicine_ball`); unmapped facets rejected (registry, `reconcile`,
stage correction); forged registry flags (top-level and entry), non-snake-case key, extra entry
field; forged/missing/stale registry hash in the proof (also through `compile_private`); 12
valid unapproved cases from the real rule ids with synthetic supplier rows; TK-000539 positive
shape; negatives: downgraded status, flipped claim/safe flags, changed terms/facets, missing
claim field, wrong case id for each marker, relabelled rules. `test_movekit_v2_private_reviewed_stage.py`
fixture now carries the registry record and `owner_facet_source`.

Full run: `python -B -m unittest discover -s tools -p "test_*.py"` → 192 tests OK,
4 expected failures. The `FAILED: PRIVATE_OUTPUT_PATH_REQUIRED` line in the output is printed by
an existing CLI-guard test. `node tools/check-doc-consistency.js` fails on a missing
`docs/ROADMAP_INDEX.json` unrelated to this change.

## Existing `expectedFailure` tests

None changed. G6/G7 gaps stay `expectedFailure`. The two G2/G2b gap tests also stay, because they
assert the *unfixed* expectations (facets inside the supplier-exact map; an anatomy word in the
TK-000539 evidence terms). We deliberately did not satisfy them: owner terms stay out of the
supplier registry, and the stance evidence is relabelled rather than upgraded.

## Limitations

* The registry hash proves integrity/provenance of the file, not owner approval; nothing is
  approved and no canonical filter mapping exists. A human must decide each facet.
* TK-000539 still needs a human anatomy decision; evidence is not found in the supplier terms
  this tool checks. The tool does not search for other lower-back evidence.
* The stage cross-checks facets against the registry, not against `RULES`; the proof's own
  `reconcile` enforces `RULES` ↔ registry.
* Real private inputs were not run; the real proof file must be regenerated with this tool
  (old proofs lack `owner_facet_registry` and are rejected by the stage).
* Facet keys are validated for format only, not semantic correctness.

## Onafhankelijke bronverificatie door ChatGPT (na de implementatie)

4 november 2026. De nieuwe onafhankelijke eigenaar-apparatuurregistry is uitsluitend een voorstel; geen leveranciersregistratie of toestemming. Tegen de echte privébron is vervolgens een **nieuwe** 12-recordmetadata-evidencefile gebouwd:

`C:\Movikit\.tk-private-review\TK504-V2-OWNER-METADATA-EVIDENCE-12-20261104-V3.json`

Met dit strengere bewijs is de **nieuwe** privé-stage opnieuw gecompileerd:

`C:\Movikit\.tk-private-review\TK504-V2-PRIVATE-REVIEWED-STAGE-582-G2G2B-20261104.json`

Resultaat: alle 582 records aanwezig, de 226 bestaande records en alle 356 nieuwe source/identity/intelligence/assets/flags/relations exact ongewijzigd, dezelfde routes 245/85/26 en alle 356 `NOT_PUBLISHED`. Alleen de 12 niet-goedgekeurde metadata-evidenceprojecties kregen expliciete eigenaarprovenance en veilig onderscheiden reviewstatus; **TK-000539 is uitdrukkelijk niet anatomisch bewezen**. Geen automatische equipment-toevoeging aan catalogus of eigen trainingen. Privévergelijking: `TK504-G2G2B-STAGE-IMMUTABILITY-CHECK-20261104.py` → PASS.

De aanvankelijke twee `expectedFailure`-gaptets voor G2 en G2b zijn vervolgens **omgezet naar werkende guards** die de veilige gekozen oplossing toetsen (onafhankelijke eigenaarregistry en de niet-anatomische classificatie), in plaats van een onjuiste leverancierstaxonomie-/anatomieclaim te verlangen. De nog openstaande, echte G6/G7-ledgertests blijven expliciet als expected failure gemarkeerd. De losse read-only reconciliatie van AI versus supplier/catalogus staat gedocumenteerd in `TK504_AI_SOURCE_EVIDENCE_RECONCILIATION_20261104.md`.

De eerdere secties zijn historische auditinformatie en bevatten daarom de oorspronkelijk gemelde 4 expected failures. De latere volledige testuitslag is maatgevend.
