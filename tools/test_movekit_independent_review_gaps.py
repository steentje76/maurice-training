#!/usr/bin/env python3
"""Synthetic gap tests from the independent second review of the 356 pending exercises.

Fully synthetic: no private folder, supplier payload, owner note, media or network.

Two kinds of test:
* PIN tests assert behaviour that is currently correct (or deliberately fail-closed).
* GAP tests assert the behaviour a reviewer would EXPECT and are marked
  ``expectedFailure``: the suite stays green while the gap exists, and the test turns
  into an "unexpected success" (suite failure) the moment the audited tool is fixed,
  which forces the marker to be removed. Nothing here changes any audited tool.
"""
import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
TOOLS = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, TOOLS / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


TAX = load("ir_taxonomy", "movekit-v2-taxonomy-preflight.py")
LEDGER = load("ir_ledger", "movekit-review-ledger.py")
PROOF = load("ir_proof", "movekit-v2-source-metadata-proof.py")
STAGE = load("ir_stage", "movekit-v2-private-reviewed-stage.py")
import test_movekit_v2_private_reviewed_stage as STAGE_FIXTURE  # noqa: E402
from test_movekit_classification_review import sample  # noqa: E402

MAP = json.loads((TOOLS / "movekit-v2-taxonomy-map.json").read_text(encoding="utf8"))


class SourceMetadataProofGaps(unittest.TestCase):
    """tools/movekit-v2-source-metadata-proof.py has no dedicated test file."""

    def setUp(self):
        self.supplier = {"slug": "s", "name": "Synthetic Move", "shortDescription": "",
                         "instructions": ["Throw the item."], "equipment": [],
                         "primaryMuscles": [], "movementPattern": []}
        sha = PROOF.src_sha(self.supplier)
        self.owner = {"routes": [{"catalog_id": "TK-000900", "provider_id": "s",
                                  "supplier_record_sha256": sha,
                                  "owner_choice": "meta", "owner_note": ""}]}
        self.ledger = {"entries": [{"catalog_id": "TK-000900", "provider_id": "s",
                                    "supplier_record_sha256": sha}]}
        self._orig = dict(PROOF.RULES)

    def tearDown(self):
        PROOF.RULES.clear()
        PROOF.RULES.update(self._orig)

    def reconcile(self, words):
        PROOF.RULES.clear()
        PROOF.RULES["TK-000900"] = ("s", words, [], "MULTIPHASE_MOVEMENT")
        # reconcile() has hard 26/356/582 size guards; satisfy them with inert padding.
        owner = copy.deepcopy(self.owner)
        ledger = copy.deepcopy(self.ledger)
        owner["routes"] += [{"catalog_id": f"X{i}", "provider_id": f"o{i}",
                             "owner_choice": "apart"} for i in range(25)]
        ledger["entries"] += [{"catalog_id": f"L{i}", "provider_id": f"l{i}"}
                              for i in range(355)]
        padded = [self.supplier] + [{"slug": f"p{i}"} for i in range(581)]
        return PROOF.reconcile(owner, ledger, padded)

    def test_pin_missing_evidence_word_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "SUPPLIER_EVIDENCE_MISSING"):
            self.reconcile(["squat"])

    def test_pin_result_is_never_approved_or_importable(self):
        out = self.reconcile(["throw"])
        item = out["corrections"][0]
        self.assertEqual(item["review_status"], "EVIDENCED_CORRECTION_PROPOSAL_NOT_APPROVED")
        self.assertFalse(item["safe_for_automatic_import"])
        self.assertFalse(out["original_supplier_rows_modified"])

    def test_fixed_g1_evidence_must_match_whole_words_not_substrings(self):
        """Evidence word 'row' must not be satisfied by the word 'Throw'."""
        with self.assertRaisesRegex(ValueError, "SUPPLIER_EVIDENCE_MISSING"):
            self.reconcile(["row"])

    def test_pin_hardcoded_rule_issue_kinds_are_the_only_semantic_labels(self):
        """Count of rule kinds is provable from tracked code (12 cases)."""
        kinds = {}
        for _, (_, _, _, kind) in self._orig.items():
            kinds[kind] = kinds.get(kind, 0) + 1
        self.assertEqual(sum(kinds.values()), 12)
        self.assertEqual(kinds, {"EQUIPMENT": 6, "MULTIPHASE_MOVEMENT": 2,
                                 "MOVEMENT_EXECUTION": 1, "SOURCE_MUSCLE_CONFLICT": 1,
                                 "SOURCE_NAME_VARIANT": 1, "EXACT_LOWER_BACK_TAG": 1})

    @unittest.expectedFailure
    def test_gap_suggested_equipment_facets_need_reviewed_vocabulary(self):
        """Every suggested facet must resolve to an entry of the reviewed taxonomy map."""
        known = {v["code"].rsplit(":", 1)[1] for v in MAP["equipment"].values()}
        facets = {f for (_, _, adds, _) in self._orig.values() for f in adds}
        self.assertTrue(facets <= known, sorted(facets - known))

    def test_pin_facet_vocabulary_overlap_is_partial(self):
        known = {v["code"].rsplit(":", 1)[1] for v in MAP["equipment"].values()}
        facets = {f for (_, _, adds, _) in self._orig.values() for f in adds}
        self.assertEqual(len(facets), 8)
        self.assertEqual(sorted(facets & known), ["bench", "medicine_ball"])

    @unittest.expectedFailure
    def test_gap_evidence_word_for_lower_back_case_must_name_the_muscle(self):
        """The only evidence terms for the lower-back-tag case describe a stance."""
        _, words, _, kind = self._orig["TK-000539"]
        self.assertEqual(kind, "EXACT_LOWER_BACK_TAG")
        self.assertTrue(any("back" in w for w in words), words)


class TaxonomyPreflightGaps(unittest.TestCase):
    def setUp(self):
        self.supplier = {"slug": "s", "primaryMuscles": ["Lower Back"],
                         "secondaryMuscles": ["Neck"], "equipment": ["Bench"]}
        self.ledger = {"catalog_id": "TK-000227", "provider_id": "s",
                       "supplier_record_sha256": TAX.record_hash(self.supplier),
                       "decision": "DEFER"}
        self.deferred = {"catalog_id": "TK-000227",
                         "reason": "primary:Lower Back ontbreekt exacte goedgekeurde mapping"}

    def annotate(self):
        return TAX.annotate([self.deferred], [self.ledger], [self.supplier], MAP)

    def test_fixed_g3_every_mappable_source_term_must_be_annotated(self):
        """The (AI-written) reason lists one term; the other mapped terms are now auto-completed
        from the supplier record + registry and marked as not approved."""
        case = self.annotate()["cases"][0]
        listed = {a["source_term"] for a in case["proposed_annotations"]}
        present = {t for key, table in (("primaryMuscles", "muscles"),
                                        ("secondaryMuscles", "muscles"),
                                        ("equipment", "equipment"))
                   for t in self.supplier[key] if t in MAP[table]}
        self.assertEqual(listed, present)
        marks = {a["source_term"]: a["provenance"] for a in case["proposed_annotations"]}
        self.assertEqual(marks["Lower Back"], "ai_reason_confirmed_against_source")
        self.assertEqual(marks["Neck"], "auto_completed_from_source_not_approved")
        self.assertTrue(all(a["approved"] is False for a in case["proposed_annotations"]))

    def test_pin_status_is_covered_but_human_required(self):
        case = self.annotate()["cases"][0]
        self.assertEqual(case["status"], "TERMS_COVERED_HUMAN_REVIEW_REQUIRED")
        self.assertFalse(self.annotate()["human_approved"])

    def test_pin_term_reason_followed_by_content_reason_fails_closed(self):
        self.deferred["reason"] += "; variants need review"
        with self.assertRaisesRegex(ValueError, "UNSUPPORTED_REASON"):
            self.annotate()

    def test_pin_map_is_namespaced_unique_and_unapproved(self):
        codes = [v["code"] for t in ("muscles", "equipment") for v in MAP[t].values()]
        self.assertEqual(len(codes), 18)
        self.assertEqual(len(set(codes)), 18)
        self.assertTrue(all(c.startswith("movekit:") for c in codes))
        self.assertEqual(MAP["status"], "PROPOSED_NOT_APPROVED")
        self.assertFalse(MAP["runtime_activation"])

    def test_pin_map_term_already_in_app_vocabulary_is_a_parallel_concept(self):
        """'Adductors' (map) and 'Adductoren' (tracked app catalog) name the same muscle group.

        Pinned so a human decides one canonical code instead of two parallel concepts.
        """
        catalog = json.loads((TOOLS.parent / "exercise-catalog.json").read_text(encoding="utf8"))
        app_terms = {t for e in catalog["catalog"] for t in e["identity"]["primary"]}
        self.assertIn("Adductoren", app_terms)
        self.assertEqual(MAP["muscles"]["Adductors"]["label_nl"], "Adductoren")

    def test_pin_no_tracked_english_to_app_term_table_exists(self):
        """The 245 AI proposals cannot be source-traced from tracked code: the English
        supplier -> Dutch app term table is absent from every audited tool."""
        text = "".join((TOOLS / n).read_text(encoding="utf8") for n in (
            "movekit-classification-review.py", "movekit-review-ledger.py",
            "movekit-v2-private-reviewed-stage.py", "movekit-v2-source-metadata-proof.py"))
        for dutch in ("Billen", "Borst", "Kuiten", "Schouders"):
            self.assertNotIn(dutch, text)


class LedgerSourceTraceGaps(unittest.TestCase):
    def setUp(self):
        self.catalog, self.inventory, self.rows = sample()
        base = {"category": "mobility", "type": "mobility", "pattern": "mobility",
                "primary": ["Core"], "secondary": [], "equipment": ["Bodyweight"],
                "goals": ["mobility"]}
        for e in self.catalog["catalog"]:
            e["identity"].update(copy.deepcopy(base))
        # widen the vocabulary with one foreign-looking set of tags
        other = self.catalog["catalog"][1]["identity"]
        other.update(primary=["Rug"], equipment=["barbell"], category="upper_body_pull",
                     type="compound")
        hashes = {"supplier": "a" * 64, "catalog": "b" * 64, "inventory": "c" * 64}
        self.template = LEDGER.make_template(self.catalog, self.inventory, self.rows, hashes)
        self.ledger = copy.deepcopy(self.template)

    def accept(self, **changes):
        e = self.ledger["entries"][0]
        cls = {"category": "mobility", "type": "mobility", "pattern": "mobility",
               "primary": ["Core"], "secondary": [], "equipment": ["Bodyweight"],
               "goals": ["mobility"]}
        cls.update(changes)
        e.update(decision="ACCEPT", classification=cls, review={
            "kind": "AI", "reviewer": "synthetic", "reference": "r",
            "reviewed_at": "2026-11-04T00:00:00Z", "rationale": "synthetic",
            "source_refs": ["supplier-sha256:" + e["supplier_record_sha256"]]})
        return e

    def test_pin_ai_accept_is_never_release(self):
        self.accept()
        out = LEDGER.validate(self.ledger, self.template, self.catalog)
        self.assertFalse(out["release_approved"])

    @unittest.expectedFailure
    def test_gap_accept_must_not_contradict_supplier_equipment(self):
        """Supplier row says Bodyweight; ACCEPT claims barbell. Vocabulary membership is the only check."""
        self.assertEqual(self.rows[226]["equipment"], ["Bodyweight"])
        self.accept(equipment=["barbell"])
        with self.assertRaises(ValueError):
            LEDGER.validate(self.ledger, self.template, self.catalog)

    @unittest.expectedFailure
    def test_gap_accept_must_state_relation_to_baseline_suggestion(self):
        """ACCEPT with a category different from the unanimous baseline suggestion is not flagged."""
        suggested = self.ledger["entries"][0]["suggestion"]["proposed_category"]
        self.assertEqual(suggested, "mobility")
        self.accept(category="upper_body_pull", type="compound")
        with self.assertRaises(ValueError):
            LEDGER.validate(self.ledger, self.template, self.catalog)

    def test_pin_goals_are_not_source_derived(self):
        """Supplier fixture rows carry no goals field; any accepted goals are AI-introduced."""
        self.assertNotIn("goals", self.rows[226])

    def test_pin_three_hash_functions_agree(self):
        row = {"slug": "x", "name": "n", "list": ["a", "b"], "ü": 1}
        self.assertEqual(TAX.record_hash(row), PROOF.src_sha(row))
        self.assertEqual(TAX.record_hash(row), LEDGER.digest(row))


class StageCompileFailOpenGaps(unittest.TestCase):
    def setUp(self):
        self.data = copy.deepcopy(STAGE_FIXTURE.fixture())

    def owner_routes(self):
        return self.data[6]["routes"]

    def test_fixed_g5_meta_without_metadata_proof_fails_closed(self):
        self.data = list(self.data)
        self.data[7] = None
        with self.assertRaisesRegex(ValueError, "METADATA_PROOF_REQUIRED"):
            STAGE.compile_private(*self.data)

    def test_fixed_g5_meta_route_needs_its_own_evidence(self):
        self.data[7]["corrections"].pop()
        self.data[7]["owner_metadata_cases"] = 11
        with self.assertRaisesRegex(ValueError, "INVALID_METADATA_PROOF"):
            STAGE.compile_private(*self.data)

    def test_fixed_g5_variant_without_pair_report_fails_closed(self):
        del self.data[6]["possible_duplicate_groups"]
        with self.assertRaisesRegex(ValueError, "VARIANT_PAIR_EVIDENCE_REQUIRED"):
            STAGE.compile_private(*self.data)

    def test_fixed_g5_pair_must_name_exactly_two_distinct_variants(self):
        groups = self.data[6]["possible_duplicate_groups"]
        groups[0]["catalog_ids"] = [groups[0]["catalog_ids"][0], groups[1]["catalog_ids"][0]]
        with self.assertRaisesRegex(ValueError, "INVALID_OWNER_VARIANT_PAIR"):
            STAGE.compile_private(*self.data)

    def test_fixed_g5_exact_owner_choice_split_is_enforced(self):
        for route in self.owner_routes():
            route["owner_choice"] = "exclude"
        with self.assertRaisesRegex(ValueError, "OWNER_CHOICE_SPLIT_UNEXPECTED"):
            STAGE.compile_private(*self.data)

    def test_fixed_g5_single_hold_or_exclude_is_rejected_even_with_same_total(self):
        for choice in ("hold", "exclude"):
            data = copy.deepcopy(self.data)
            data[6]["routes"][0]["owner_choice"] = choice  # was 'apart': split becomes 7/12/6 + 1
            with self.assertRaisesRegex(ValueError, "OWNER_CHOICE_SPLIT_UNEXPECTED"):
                STAGE.compile_private(*data)

    def test_fixed_g5_swapped_choices_with_right_totals_still_need_matching_evidence(self):
        routes = self.owner_routes()
        routes[0]["owner_choice"], routes[8]["owner_choice"] = "meta", "apart"
        with self.assertRaisesRegex(ValueError, "METADATA_OWNER_ROUTE_MISMATCH"):
            STAGE.compile_private(*self.data)

    def test_fixed_g4_term_report_content_is_rederived(self):
        """A tampered proposed_annotations payload is no longer copied into the stage."""
        self.data[5]["cases"][0]["proposed_annotations"] = [
            {"source_field": "equipment", "source_term": "Forged",
             "proposed": {"code": "movekit:equipment:forged"}, "approved": True}]
        with self.assertRaisesRegex(ValueError, "TERM_REPORT_NOT_REPRODUCIBLE"):
            STAGE.compile_private(*self.data)

    def test_fixed_g4_term_report_approval_flag_flip_is_rejected(self):
        self.data[5]["cases"][0]["proposed_annotations"][0]["approved"] = True
        with self.assertRaisesRegex(ValueError, "TERM_REPORT_NOT_REPRODUCIBLE"):
            STAGE.compile_private(*self.data)

    def test_fixed_g4_registry_change_invalidates_report(self):
        self.data[8]["muscles"]["Extra"] = {"code": "movekit:muscle:extra", "label_nl": "x"}
        with self.assertRaisesRegex(ValueError, "TERM_REPORT_STALE_OR_REGISTRY_CHANGED"):
            STAGE.compile_private(*self.data)

    def test_fixed_g4_old_unversioned_report_is_blocked_not_bypassed(self):
        self.data[5]["schema"] = "tk504-v2-taxonomy-preflight/1.0"
        with self.assertRaisesRegex(ValueError, "TERM_REPORT_STALE_OR_REGISTRY_CHANGED"):
            STAGE.compile_private(*self.data)

    def test_fixed_g4_omitted_source_term_in_report_is_rejected(self):
        """Old-style report that dropped a registry term the supplier row has."""
        self.data[5]["cases"][0]["proposed_annotations"] = []
        with self.assertRaisesRegex(ValueError, "TERM_REPORT_NOT_REPRODUCIBLE"):
            STAGE.compile_private(*self.data)

    def test_fixed_g4_extra_report_key_is_rejected(self):
        self.data[5]["note"] = "free-form"
        with self.assertRaisesRegex(ValueError, "TERM_REPORT_KEYS_CHANGED"):
            STAGE.compile_private(*self.data)

    def test_fixed_g4_deferred_reason_change_changes_recomputation(self):
        self.data[4]["deferred"][0]["reason"] = "variants need content review"
        with self.assertRaisesRegex(ValueError, "TERM_REPORT_NOT_REPRODUCIBLE|DUPLICATE_REVIEW_ID"):
            STAGE.compile_private(*self.data)

    def test_pin_valid_8_12_6_split_stays_unimportable_and_unactivated(self):
        out = STAGE.compile_private(*self.data)
        self.assertEqual(out["_approved_for_import"], 0)
        self.assertFalse(out["_app_activated"])
        self.assertEqual(out["_review_counts"]["OWNER_FEEDBACK_PENDING_CONTENT_REVIEW"], 26)
        self.assertTrue(all(x["assets"] == [] for x in out["catalog"][226:]))
        self.assertEqual(out["catalog"][:226], self.data[0]["catalog"])
        self.assertEqual(len(out["catalog"]), 582)

    def test_pin_term_report_cannot_target_ai_accepted_id(self):
        self.data[5]["cases"][0]["catalog_id"] = "TK-000227"
        with self.assertRaises(ValueError):
            STAGE.compile_private(*self.data)

    def test_pin_verify_owner_feedback_detects_changed_note(self):
        routes = [{"catalog_id": f"TK-{i:06d}", "provider_id": f"p{i}",
                   "supplier_record_sha256": "a" * 64, "owner_choice": "apart",
                   "owner_note": "n", "owner_updated_at": "t"} for i in range(26)]
        feedback = {"schema": "tk504-owner-feedback/1.0",
                    "scope": "OWNER_FEEDBACK_NOT_PRODUCTION_APPROVAL",
                    "source_sha256": "s", "supplier_sha256": "u",
                    "items": [{"catalog_id": r["catalog_id"], "provider_id": r["provider_id"],
                               "supplier_record_sha256": r["supplier_record_sha256"],
                               "decision": r["owner_choice"], "note": r["owner_note"],
                               "updated_at": r["owner_updated_at"]} for r in routes]}
        self.assertTrue(STAGE.verify_owner_feedback(feedback, {"routes": routes}, "s", "u"))
        feedback["items"][3]["note"] = "changed"
        with self.assertRaisesRegex(ValueError, "OWNER_REPORT_CHANGED"):
            STAGE.verify_owner_feedback(feedback, {"routes": routes}, "s", "u")


if __name__ == "__main__":
    unittest.main(verbosity=2)
