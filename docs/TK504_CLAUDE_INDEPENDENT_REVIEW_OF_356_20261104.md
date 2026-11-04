# TK504 independent second review of the 356 pending MoveKit exercises (2026-11-04)

Reviewer: Claude (second reviewer, independent of the author of the audited tools).
Repo state audited: branch `feat/tk504-owner-review-terms-20261103`, HEAD `a376faad003ff369caccc90c8ab7fce7370bc069`, uncommitted additions only.
Status: **private-workflow audit. Nothing here approves, releases, imports, signs, grants or activates anything.** All 356 stay `pending_review`, untrainable, no media grant.

## 0. Scope and what I did not see

- **The private staging folder was not read.** One existence check needed an interactive permission approval that this session cannot give, so I stopped. I did not try to get around it. No supplier text, owner note, media or private report was opened.
- Everything below is derived from tracked code, tracked docs, the tracked catalog vocabulary and synthetic tests.
- Counts are labelled by how they are known:
  - **[P] proven here**: derivable from tracked code/files and re-checked by a test I ran.
  - **[C] code-asserted**: the tool refuses to run unless the number holds on the private data. I did not observe the run.
  - **[D] documented earlier**: stated in earlier tracked docs. I did not re-observe it.
  - **unknown**: needs the private data. I give no number.

## 1. Owner intent that is kept (unchanged by this review)

1. Owner answers are **suggestions, not approvals** (docs 20261103). The tools tag them `NOT_AUTHENTICATED_APPROVAL`; keep that.
2. Variant pairs keep **both identities and both source files**. No automatic de-duplication, and no formal variant relation, until a content decision is made.
3. The owner's "rope required" clarification for the jump-rope case is a **separate correction request**. The supplier record is never edited.
4. Supplier terms stay **immutable and source-first**. Proposed codes are namespaced (`movekit:...`) and never replace the app taxonomy. Forearms is not Grip. Lower Back is not Rug.
5. No invented science: fatigue, recovery and confidence stay `null`; `assets` stays `[]`.
6. The owner is **not** asked to inspect 582 or 356 exercises one by one (see section 5).

## 2. Counts and their provenance

| Item | Number | Basis |
|---|---|---|
| Baseline / pending / total | 226 / 356 / 582 | [C] hard-checked in the stage builder and compiler |
| AI ACCEPT proposals / AI DEFER | 245 / 111 | [C] preflight and compiler refuse any other split |
| Source-term proposals / owner cases | 85 / 26 | [C] same |
| Owner "metadata" cases | 12 | [C] and [P]: the proof tool hard-codes exactly 12 rules |
| Owner variant cases / pairs | 6 / 3 | [C] the compiler requires every `variant` id to be in exactly one of 3 pairs |
| Owner "separate" cases | 8 | **Not enforced anywhere.** It is only the remainder of 26 - 12 - 6 (see gap G5) |
| Taxonomy map terms | 18 (5 muscle + 13 equipment) | [P] test `test_pin_map_is_namespaced_unique_and_unapproved` |
| Metadata cases by rule kind | 6 equipment, 2 multiphase movement, 1 movement execution, 1 muscle conflict, 1 name variant, 1 lower-back tag | [P] test `test_pin_hardcoded_rule_issue_kinds_are_the_only_semantic_labels` |
| Distinct equipment facets suggested by the 12 rules | 8, of which only 2 exist in the taxonomy map | [P] test `test_pin_facet_vocabulary_overlap_is_partial` |
| Taxonomy suggestions needing review | 212 (137 exact movement+muscle+equipment, 75 movement+muscle); 8 conflicting; 136 no baseline match | [D] offline-stage doc; not re-observed |
| Tracked app vocabulary | 13 primary-muscle tags, 8 equipment tags | [P] read from the tracked catalog |

"Potential 111 deferred AI classifications" = 85 + 26, which is consistent with 111 [C].

## 3. Machine-check classes

### A. Source-verifiable by machine (no human judgement needed)

These checks exist and I confirmed they fail closed (existing tests plus mine):

- Supplier record hash per entry; supplier, catalog and inventory file hashes pinned in the ledger.
- Provider id, catalog id and name match between ledger, inventory and supplier. Duplicates and unknown ids are rejected.
- Baseline 226 byte-identical after compilation.
- Owner report equals the original owner file field by field (provider, record hash, choice, note, timestamp). This was previously untested; `test_pin_verify_owner_feedback_detects_changed_note` now pins it.
- Group disjointness (term cases vs owner cases vs AI-accepted).
- Video identity per variant pair compared to inventory hashes.
- Every supplier term quoted by a deferral reason really exists in that record.
- Release invariants: no category set, no assets, no fatigue/recovery/confidence, not confirmed by a reviewer.
- The three hash functions (ledger, preflight, proof) produce identical digests (`test_pin_three_hash_functions_agree`). They are three copies and could drift.

**Not covered by these checks** (the audited files only):

- Media bytes on disk are never hashed. The stage builder only checks the filename convention (`slug.mp4`, `slug.png`). The inventory video hash is used only to compare the two members of a variant pair. "Media match" therefore rests on whatever built the inventory. I did not audit that tool.

### B. Deterministic terminology that can be auto-drafted but not formally approved

- The 18 map entries: exact English source term to namespaced code plus Dutch label. The mapping is a lookup, so a draft sheet can be generated without a human.
- Which of the 85 records use which of the 18 terms (annotations come straight from the source). See G3 for how completeness is derived.
- Equipment facets whose evidence is a word in the supplier name (e.g. a "trap bar" in the name). A deterministic draft is fine; approval stays human.
- AI proposals whose category/type equals the unanimous baseline suggestion (see section 6, proposed machine split). Count: unknown.
- Dutch label wording (e.g. brand-named equipment, "Tibialis") is draftable. Whether the brand name or a generic name is the canonical code is a small human choice.

### C. Real owner/human choices

See the REDFLAG list (section 7).

## 4. Findings: where checks are insufficient

Each gap has a synthetic test in `tools/test_movekit_independent_review_gaps.py`. Gap tests are marked `expectedFailure`: the suite stays green while the gap exists, and the test turns red as an "unexpected success" once someone fixes the tool. No audited tool was changed.

| # | Gap | Effect | Test |
|---|---|---|---|
| G1 | **Evidence match uses substring search** (`word in text`). "row" is satisfied by "Throw", "dip" by "dipped", "press" by "compress". | A source-evidence proof can pass without real evidence. Affects the two multiphase rules most (several short words each). | `test_gap_evidence_must_match_whole_words_not_substrings` |
| G2 | **Facet vocabulary is ungoverned.** 6 of 8 suggested equipment facets exist nowhere in the reviewed map. The 2 that overlap are bare strings, not the namespaced codes. | An approved metadata correction would introduce unreviewed equipment terms. | `test_gap_suggested_equipment_facets_need_reviewed_vocabulary` |
| G2b | The evidence words for the lower-back-tag case describe a stance, not a muscle. | The proof passes while not supporting the claim it is labelled with. | `test_gap_evidence_word_for_lower_back_case_must_name_the_muscle` |
| G3 | **Preflight trusts the AI-written deferral reason for completeness.** It checks that listed terms exist in the source, but not that all unmapped source terms are listed. | A record can be marked "terms covered" with some mappable terms missing from the annotations. | `test_gap_every_mappable_source_term_must_be_annotated` |
| G4 | **Compiler does not re-derive the term report or bind it to the map version.** The report holds no map hash; proposed annotations are copied into the stage without recomputation. | Edits to the map or the report after the preflight run go unnoticed. | `test_gap_term_report_content_is_not_rederived` |
| G5 | **Owner-choice shape is only partly enforced.** `meta` without a metadata proof and `variant` without a pair report both compile silently. `exclude` and `hold` are accepted and routed like the others. The 8/12/6 split is not asserted. | The compile can succeed with a missing evidence layer. The production `run()` always supplies both layers, so this is a library-level fail-open, not a current-run defect. | three tests: `..._meta_choice_without_metadata_proof...`, `..._variant_choice_without_pair_report...`, `..._exact_owner_choice_split...` |
| G6 | **AI ACCEPT is validated against app vocabulary only.** `equipment: ["barbell"]` passes on a record whose supplier equipment says Bodyweight. | A wrong proposal is "valid" and counts toward the 245. | `test_gap_accept_must_not_contradict_supplier_equipment` |
| G7 | **ACCEPT is never compared to the baseline suggestion.** It may differ from, or have no basis in, the catalog similarity result, and nothing records that. | The 245 cannot be split into "agrees with evidence" and "AI-only". | `test_gap_accept_must_state_relation_to_baseline_suggestion` |
| G8 | **No tracked supplier-to-app term table.** Supplier terms are English; app terms are Dutch (e.g. "Rug", "Billen", "Borst"). None of those Dutch terms appears in any audited tool. The mapping behind the 245 therefore lives only in untracked AI output. | The 245 are **not source-traceable from tracked code**. This is the biggest limit on "reuse prior decisions". | `test_pin_no_tracked_english_to_app_term_table_exists` |
| G9 | `goals` is required on every ACCEPT, but supplier rows have no goals field. | Goals are AI-introduced, not source facts. Treat as proposal-only, never as an owner-confirmed fact. | `test_pin_goals_are_not_source_derived` |
| G10 | **Parallel concept:** the map proposes `movekit:muscle:adductors`, while the tracked app vocabulary already has "Adductoren". | Two codes for one muscle group would split filters and counts. | `test_pin_map_term_already_in_app_vocabulary_is_a_parallel_concept` |
| G11 | The suggestion engine treats a unanimous match with 1 supporter the same as one with many. No support count is in the output. | Weak hints look as strong as strong ones. Read from code; no test added. | none |
| G12 | `HUMAN_ATTESTED` can be written in the ledger, but the compiler only accepts exactly `accept_ai: 245, defer_ai: 111`. | The ledger cannot record human review without breaking the compiler. Human decisions belong in the separate, non-binding draft collector. This is a design fact, not a defect. | none |

**No false approval path was found that produces approval, release, import, media grant or activation.** Every gap above weakens evidence quality (a wrong or unevidenced proposal can look valid), not authority.

## 5. Reuse of prior decisions and the review the owner is asked to do

Reused unchanged: the 226 baseline; the owner's 26 answers as suggestions; the 18-term map as a proposal; the AI ledger as a proposal; the pair and metadata evidence layers; the local draft collector as the place to record non-binding decisions.

Proposed way to avoid per-exercise review: ask for decisions on **rules and a short list of exceptions**, not on exercises.

1. **One rule decision** for the machine-agreeing proposals (class B): "accept AI proposals that equal the unanimous baseline suggestion and whose source terms are all covered by the approved table". The owner approves the rule, not each record.
2. **One vocabulary sheet**: the 18 terms plus the 8 equipment facets. That is 26 term-level yes/no decisions.
3. **3 pair comparisons** (6 exercises).
4. **6 non-equipment metadata cases** (2 multiphase, 1 execution, 1 muscle conflict, 1 name variant, 1 lower-back tag).
5. **Exceptions list**: AI proposals that disagree with, or have no basis in, the baseline suggestion. Count unknown until the machine split exists (section 6).

## 6. Recommended follow-up code (NOT done, not requested)

1. Whole-word matching, and negation detection if needed, in the metadata proof (G1). Reject facets outside the reviewed map (G2).
2. Add the map's SHA-256 to the preflight output. Have the compiler recompute annotations from the source and the map (G3, G4).
3. Compiler: require the metadata proof when any owner choice is `meta`, and the pair report when any is `variant`. Make `hold` and `exclude` explicit instead of silent (G5).
4. Add a tracked, versioned English-to-Dutch term table. Validate ACCEPT primary, secondary and equipment against it (G6, G8).
5. Add a **read-only agreement report**: for each of the 245, record `agrees_with_suggestion | differs | no_baseline_basis`, plus the support count (G7, G11). This produces the machine split behind rules 1 and 5 in section 5. It is private output only, no approvals.

## 7. REDFLAG: decisions only a human can make

Each item lists the evidence to show the owner. Show source facts and the tool's proposal, never the AI's reasoning as proof.

1. **Same movement or variant: 3 pairs (6 exercises).**
   Show: name, short description and instructions of both, side by side; poster and video of both; whether the video hashes are equal. An earlier tracked doc reports one pair with identical bytes and two pairs with different bytes [D].
   Decide: separate exercise / formal variant of / duplicate to merge. Equal bytes do not prove the same movement, and different bytes do not prove a different movement.
2. **Equipment corrections without proof of necessity.**
   The 6 equipment rules (all 6 are tagged EQUIPMENT in the rules) have proof that a word is *mentioned* (G1 applies). Mention does not show the equipment is *required* rather than optional.
   Show: the supplier equipment list (unchanged), the exact sentence containing the term, the proposed facet.
   Decide: required, optional or ignore; and whether each of the 8 facets joins the vocabulary (G2).
3. **Muscle and body-part taxonomy** (5 map terms: Forearms, Lower Back, Neck, Tibialis, Adductors).
   Show: the app's 13 existing primary tags, the supplier term, and the number of affected exercises (private, unknown here).
   Decide: new term, or fold into an existing one. Forearms into Grip? Lower Back into Rug? Adductors into the existing Adductoren (G10)? Neck and Tibialis have no app equivalent.
4. **Non-equipment metadata cases (6 exercises).** Multiphase movements (which pattern is primary), the movement-execution case (the "no jump" variant), the muscle conflict (neck), the name variant, and the lower-back tag.
   The current evidence words do not support the labelled claim, in particular the lower-back-tag case (G2b).
   Show: the relevant supplier sentences, the supplier's own muscle and pattern tags (unchanged), and the owner's note.
5. **AI proposals that disagree with, or have no basis in, the catalog.**
   Known from the earlier run: 8 conflicting and 136 no-match suggestions among the 356 [D]. How many of the 245 AI accepts fall there is **unknown**.
   Show: AI category/type, the baseline signature and its support count, supplier tags. Do not show the AI rationale as evidence.
6. **Owner choice versus owner note.** A choice (separate, metadata, variant) can contradict the note text. This is not machine-checkable and I did not read the notes. If any contradict, the owner resolves them. Also confirm that no `hold` or `exclude` choice exists, since the compiler allows both (G5).

Not human choices: hash, id, provider, count and baseline-immutability checks (class A), and the deterministic lookup of the 18 terms (class B). Formal release, entitlement and import remain separate authenticated steps outside this audit.

## 8. Tests run

Commands (from the repo root):

```
python -I tools/test_movekit_independent_review_gaps.py
python -I -m unittest discover -s tools -p "test_movekit*.py"
```

- Baseline before my change: `Ran 114 tests ... OK`.
- New file: `Ran 25 tests ... OK (expected failures=10)`. That is 15 pin tests passing and 10 gap tests failing as expected.
- All MoveKit tests after the change: `Ran 139 tests ... OK (expected failures=10)`.
- The line `FAILED: PRIVATE_OUTPUT_PATH_REQUIRED` in earlier runs is an intended negative CLI case inside a passing suite.
- Not run: any tool against the private data, any browser test, any media check.

## 9. Files changed (uncommitted)

- `tools/test_movekit_independent_review_gaps.py` (new, synthetic only)
- `docs/TK504_CLAUDE_INDEPENDENT_REVIEW_OF_356_20261104.md` (this file)

An untracked `tools/__pycache__/` was already present before my work. I did not create or commit it.

## Post-audit correctie — 4 november 2026

Dit document is een **tijdgebonden onafhankelijke tweede review** op broncode vóór de navolgende reparaties. Sindsdien zijn G1, G3, G4 en G5 technisch gecorrigeerd, met onafhankelijke controle tegen de privébron en 165 geslaagde synthetische tests (4 resterende expected-failure-gaps). De oorspronkelijke observaties hierboven blijven als audittrace behouden maar zijn niet alle meer actuele open fouten. Zie `docs/TK504_EVIDENCE_HARDENING_20261104.md`. Geen formele classificatie- of releasegoedkeuring.
