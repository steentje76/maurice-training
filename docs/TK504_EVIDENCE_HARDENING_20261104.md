# TK504 evidence hardening round – 2026-11-04

Base: branch `feat/tk504-owner-review-terms-20261103`, head `a376faad`. Draft PR #598 only.
Uncommitted, for independent audit. No app activation, DB, media, catalog, taxonomy-registry,
`index.html`, APK or merge change. The private supplier/owner folder was **not read**; all
tests are synthetic. Baseline of 226 stays immutable; the 356 stay unactivated and **all 356
remain pending human review** (245 AI proposals, 85 term proposals, 26 owner-content cases).
The 128 open exceptions are unchanged; nothing was approved here.

## G1 – whole-term supplier evidence (`movekit-v2-source-metadata-proof.py`)
* Old: `word in evidence_string` (substring). `row`∈`Throw`, `dip`∈`dipped` passed.
* New: `tokens()` = NFKC + `casefold` + split on every non-alphanumeric code point (all
  hyphens/dashes incl. U+2011/U+2013, spaces, punctuation, `_`). `mentions()` matches the phrase's
  consecutive whole words **within one supplier field** (name / shortDescription / each
  instruction), never across fields. Only the **last** word may carry plain plural `s`/`es`
  (`pull-ups`, `rows`, `dips`; not `rowing`, `dipped`, `traps bar`).
* `push-up`, `pull-up`, `trap bar`, `wide-stance`, `inverted v`, `extra weight` still match.
* Supplier text is never altered; the `*_unchanged` fields are as before.
* Wording: every correction now carries `evidence_kind=SUPPLIER_TEXT_TERM_MENTION_ONLY` and an
  `evidence_note` ("does NOT prove the equipment or movement is required"); report has
  `evidence_matching=unicode_whole_word_mention_only`. Still `…_NOT_APPROVED`,
  `safe_for_automatic_import=false`.
* Limit: NFKC-based; no stemming, no translation. Terms such as `no jump` need adjacent words.
* Not changed (still `expectedFailure` gaps, out of scope): suggested facet vocabulary
  (8 facets, only `bench`/`medicine_ball` in registry) and TK-000539's stance-only evidence.

## G3 – full source-term coverage (`movekit-v2-taxonomy-preflight.py`)
* Expected set = for the 3 fields `primaryMuscles`, `secondaryMuscles`, `equipment`, every
  supplier term that exists in the PROPOSED registry (exact string, each `(field,term)` once).
  Derived from supplier record + registry only, never from AI rationale.
* AI reason is parsed and cross-checked: duplicate reason term → `DUPLICATE_REASON_TERM`;
  term not in that source field → `SOURCE_TERM_NOT_FOUND`; not in registry → `TERM_NOT_REVIEWED`;
  anything outside the expected set → `REASON_TERM_OUTSIDE_SOURCE_SET`.
* **Omission decision:** a registry term the reason omitted is **auto-completed** as a proposed
  annotation with `provenance=auto_completed_from_source_not_approved`, `approved=false`
  (reason-listed ones: `ai_reason_confirmed_against_source`). No human mapping is invented.
* Report additions: `schema …/1.1`, `registry_sha256`, `expected_source_term_count`,
  `expected_source_term_set_sha256`, `auto_completed_annotation_count`. CLI never overwrites an
  existing output file. `human_approved` stays `false`.
* Expected on the real data (per ChatGPT's verification): `auto_completed_annotation_count`
  = 1 (TK-000298 primaryMuscles term). To be confirmed by rerun; not run here.

## G4 – stage compiler integrity (`movekit-v2-private-reviewed-stage.py`)
`compile_private(catalog, inventory, suppliers, ledger, ai, terms, owner, metadata_proof, registry)`
(both `metadata_proof` and `registry` are now mandatory positional – no default, no bypass flag).
* Registry must be `PROPOSED_NOT_APPROVED`; term report `schema` must be `…/1.1` and its
  `registry_sha256` must equal the canonical SHA-256 of the registry passed in
  (`TERM_REPORT_STALE_OR_REGISTRY_CHANGED`).
* The term report is **recomputed in memory** with `annotate(ai.deferred, ledger, suppliers,
  registry)`; its key set must be recomputed keys + `supplier_sha256`,`ai_result_sha256`
  (`TERM_REPORT_KEYS_CHANGED`) and every value must equal the recomputation, incl. covered
  case ids and every annotation (`TERM_REPORT_NOT_REPRODUCIBLE`). A forged/flipped `approved`,
  removed or added term, changed registry or changed deferred reason is rejected.
* AI deferred ids must equal the ledger's DEFER ids (111).
* `run()` now reads `TK504-V2-TAXONOMY-PREFLIGHT-85-20261104-V2.json` and does **not** fall back.

### Migration risk (exact)
* The existing private `TK504-V2-TAXONOMY-PREFLIGHT-85-20261103.json` is schema `1.0`, has no
  registry digest and (per ChatGPT) lacks TK-000298's extra primaryMuscles term. It is
  **deliberately rejected** (fail closed); the stage cannot be compiled from it.
* Action required (outside this round): run the preflight to a NEW file named
  `TK504-V2-TAXONOMY-PREFLIGHT-85-20261104-V2.json`, review the auto-completed annotation(s),
  then compile. The old file is preserved untouched; nothing was overwritten or fabricated.
* The existing 12-case metadata proof file is still accepted by the stage, but was produced with
  substring matching; rerun G1 tool to a new file to re-verify its evidence under whole-word rules.

## G5 – owner split and evidence (same file)
* Owner choices must be exactly `apart` 8 / `meta` 12 / `variant` 6 (`OWNER_CHOICE_SPLIT_UNEXPECTED`).
  `hold`/`exclude` are rejected: no dedicated supported rule exists.
* `metadata_proof` mandatory (`METADATA_PROOF_REQUIRED`); its 12 corrections must be exactly the
  `meta` ids, each `owner_choice=meta`, not-approved, `safe_for_automatic_import=false`, with
  unchanged supplier fields. `possible_duplicate_groups` mandatory
  (`VARIANT_PAIR_EVIDENCE_REQUIRED`): exactly 3 pairs of 2 distinct `variant` ids covering all 6,
  with inventory video-hash integrity. A route's evidence must match its choice
  (`OWNER_EVIDENCE_ROUTE_MISMATCH`).
* Tests build a complete synthetic 582/356 fixture (`test_movekit_v2_private_reviewed_stage.py`);
  no private files needed.

## Not done / decisions
* G6: no AI classification approved, no training rules, no registry/catalog edits.
* The `tk504-owner-feedback` raw-file check (`verify_owner_feedback`) is unchanged.
* Gap tests: removed `expectedFailure` and renamed to `test_fixed_g*` only for fixed gaps
  (G1 whole-word, G3 coverage, G4 report rederivation, G5 meta/variant/split). Four gaps remain
  `expectedFailure` (facet vocabulary, lower-back evidence, two ledger-vs-supplier ACCEPT gaps).

## Verification
`python -B -m unittest discover -s tools -p "test_movekit*.py"` → 163 tests OK, 4 expected failures.

## Onafhankelijke actual-source verificatie — ChatGPT, 4 november 2026

De eigenaar heeft het lokale uitzonderingenrapport gezien/doorgenomen; dit vormt **geen** formele goedkeuring van de 356 nieuwe oefeningen. De implementatie is daarom uitsluitend binnen Draft PR #598 en de privé-reviewbestanden voortgezet.

- Preflight opnieuw uitgevoerd tegen de **echte 582 lokale bronrecords**, de bestaande 226 gepubliceerde catalogusrecords, het bestaande AI-ledger en de voorgestelde terminologieregistry. Resultaat: 85 terminologiegevallen, 26 owner-cases, 18 voorgestelde termen, **exact 1 bron-afgeleide ontbrekende annotatie in TK-000298**. Deze kreeg `auto_completed_from_source_not_approved` en `approved:false`; niet automatisch vrijgegeven.
- De twaalf metadata-evidencegevallen opnieuw uit de oorspronkelijke leverancierstekst opgebouwd met de strengere Unicode-whole-term matcher. Resultaat: **12/12 bronverwijzingen aanwezig**; uitdrukkelijk enkel *term genoemd*, niet de verplichting dat een middel nodig is of een oefening zo uitgevoerd moet worden.
- De stage daadwerkelijk opnieuw gecompileerd met **nieuwe, versiegebonden** terminologie- en metadata-rapporten, uitsluitend naar een nieuw bestand in `C:\Movikit\.tk-private-review`. Status: `PRIVATE_REVIEW_NOT_RELEASED`, 226/356/582, routes 245/85/26, nul imports, nul media-grants, nul DB-, historie- of accountmutaties.
- Onafhankelijke volledige oude/nieuwe-stage vergelijking: **alle 226 bestaande catalogusrecords exact gelijk**, alle 356 nieuwe bronidentiteiten, identity-, intelligence- en assetvelden exact gelijk, en **alle overige niet-terminologievelden gelijk**. Van 99 naar 100 brontermverwijzingen, waarvan de ene nieuwe **niet-goedgekeurd**; alle 85 terminologiegevallen hebben nu expliciete herkomst.
- Compiler accepteert nu uitsluitend het nieuwe metadata-bewijsniveau `unicode_whole_word_mention_only` en `SUPPLIER_TEXT_TERM_MENTION_ONLY`, dus het oude substringrapport kan niet via een directe compile-call worden geaccepteerd.
- Nieuwe strikt gegenereerde private bestanden:
  - `TK504-V2-TAXONOMY-PREFLIGHT-85-20261104-V2.json`
  - `TK504-V2-OWNER-METADATA-EVIDENCE-12-20261104-V2.json`
  - `TK504-V2-PRIVATE-REVIEWED-STAGE-582-HARDENED-20261104.json`
- Onafhankelijk volledige synthetic testsuite: **165/165 OK, 4 expectedFailure** (de resterende bewust geblokkeerde bewijszwakten G2, G2b, G6, G7). `git diff --check`: PASS. De CLI-regel `FAILED: PRIVATE_OUTPUT_PATH_REQUIRED` is een verwachte negatieve testcase, geen suite-fout.

**Niet gedaan:** geen classificatie goedgekeurd, geen MoveKit-rechten verleend, geen licentietekst in Git, geen uitrol, geen APK, geen PR naar main, geen daadwerkelijke sportinhoudelijke validatie van de 128 afwijkingen. Bestaande gebruikerdata en eerder ingevoerde herstelrecords blijven onaangeroerd.
