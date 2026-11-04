#!/usr/bin/env python3
"""Synthetic G2/G2b tests: owner-proposed equipment facets and the TK-000539 anatomy exception.

Fully synthetic: no private folder, supplier payload, owner note, media or network.
"""
import copy
import importlib.util
import json
import re
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


PROOF = load("of_proof", "movekit-v2-source-metadata-proof.py")
STAGE = load("of_stage", "movekit-v2-private-reviewed-stage.py")
import test_movekit_v2_private_reviewed_stage as STAGE_FIXTURE  # noqa: E402

REGISTRY_PATH = TOOLS / "movekit-v2-owner-facet-proposals.json"
MAP = json.loads((TOOLS / "movekit-v2-taxonomy-map.json").read_text(encoding="utf8"))
EIGHT = ["bench", "cambered_bar", "dip_belt", "jump_rope", "medicine_ball",
         "pull_up_bar", "trap_bar", "wall_target"]


def registry():
    return json.loads(REGISTRY_PATH.read_text(encoding="utf8"))


def synthetic_inputs():
    """12 owner 'meta' cases with the real ids/rules; supplier rows contain only the rule words."""
    rows, owner, ledger = [], [], []
    for cid, (slug, words, _, _) in PROOF.RULES.items():
        row = {"slug": slug, "name": "Synthetic " + slug, "shortDescription": "",
               "instructions": ["Use " + w + " here." for w in words],
               "equipment": ["Synthetic Supplier Equipment"], "primaryMuscles": ["Synthetic Muscle"],
               "movementPattern": ["synthetic"]}
        sha = PROOF.src_sha(row)
        rows.append(row)
        owner.append({"catalog_id": cid, "provider_id": slug, "supplier_record_sha256": sha,
                      "owner_choice": "meta", "owner_note": "synthetic"})
        ledger.append({"catalog_id": cid, "provider_id": slug, "supplier_record_sha256": sha})
    owner += [{"catalog_id": f"X{i}", "provider_id": f"o{i}", "owner_choice": "apart"}
              for i in range(14)]
    ledger += [{"catalog_id": f"L{i}", "provider_id": f"l{i}"} for i in range(344)]
    rows += [{"slug": f"p{i}"} for i in range(570)]
    return {"routes": owner}, {"entries": ledger}, rows


def reconcile(reg=None):
    owner, ledger, rows = synthetic_inputs()
    return PROOF.reconcile(owner, ledger, rows, reg)


class OwnerFacetRegistry(unittest.TestCase):
    def test_registry_covers_exactly_the_eight_rule_facets(self):
        reg = registry()
        self.assertEqual(sorted(reg["facets"]), EIGHT)
        used = {f for (_, _, adds, _) in PROOF.RULES.values() for f in adds}
        self.assertEqual(used, set(EIGHT))
        self.assertTrue(PROOF.validate_facet_registry(reg))
        PROOF.validate_rules_facets(PROOF.RULES, reg)

    def test_registry_is_owner_sourced_unapproved_and_unmapped(self):
        reg = registry()
        self.assertEqual(reg["source"], "OWNER_FEEDBACK_NOT_SUPPLIER_ATTRIBUTE")
        self.assertIs(reg["approval"], False)
        self.assertIs(reg["runtime_activation"], False)
        for key, entry in reg["facets"].items():
            self.assertRegex(key, r"^[a-z][a-z0-9]*(_[a-z0-9]+)*$")
            self.assertEqual(entry, {"source": "OWNER_FEEDBACK_NOT_SUPPLIER_ATTRIBUTE",
                                     "approval": False, "canonical_filter_mapping": None})

    def test_supplier_exact_taxonomy_registry_was_not_extended(self):
        known = {v["code"].rsplit(":", 1)[1] for v in MAP["equipment"].values()}
        self.assertEqual(sorted(set(EIGHT) & known), ["bench", "medicine_ball"])
        for missing in ("cambered_bar", "dip_belt", "jump_rope", "pull_up_bar",
                        "trap_bar", "wall_target"):
            self.assertNotIn(missing, known)
        self.assertEqual(len(MAP["equipment"]) + len(MAP["muscles"]), 18)
        self.assertEqual(MAP["status"], "PROPOSED_NOT_APPROVED")

    def test_unmapped_rule_facet_is_rejected(self):
        for bad in ("plate", "Jump Rope", "kettlebell"):
            rules = copy.deepcopy(PROOF.RULES)
            rules["TK-000381"] = ("jump-rope", ["rope"], ["jump_rope", bad], "EQUIPMENT")
            with self.assertRaisesRegex(ValueError, "FACET_NOT_IN_OWNER_REGISTRY"):
                PROOF.validate_rules_facets(rules, registry())

    def test_reconcile_rejects_unmapped_rule_facet(self):
        saved = dict(PROOF.RULES)
        try:
            PROOF.RULES["TK-000381"] = ("jump-rope", ["rope"], ["kettlebell"], "EQUIPMENT")
            with self.assertRaisesRegex(ValueError, "FACET_NOT_IN_OWNER_REGISTRY"):
                reconcile()
        finally:
            PROOF.RULES.clear()
            PROOF.RULES.update(saved)

    def test_forged_registry_flags_are_rejected(self):
        def forge(mutate, pattern):
            reg = registry()
            mutate(reg)
            with self.assertRaisesRegex(ValueError, pattern):
                PROOF.validate_facet_registry(reg)
        forge(lambda r: r.update(approval=True), "FACET_REGISTRY_INVALID")
        forge(lambda r: r.update(status="APPROVED"), "FACET_REGISTRY_INVALID")
        forge(lambda r: r.update(runtime_activation=True), "FACET_REGISTRY_INVALID")
        forge(lambda r: r.update(source="SUPPLIER_ATTRIBUTE"), "FACET_REGISTRY_INVALID")
        forge(lambda r: r["facets"]["bench"].update(approval=True), "FACET_ENTRY_INVALID")
        forge(lambda r: r["facets"]["bench"].update(source="SUPPLIER_ATTRIBUTE"),
              "FACET_ENTRY_INVALID")
        forge(lambda r: r["facets"]["bench"].update(canonical_filter_mapping="movekit:equipment:bench"),
              "FACET_ENTRY_INVALID")
        forge(lambda r: r["facets"]["bench"].update(extra=1), "FACET_ENTRY_INVALID")
        forge(lambda r: r["facets"].update({"Bad Key": copy.deepcopy(r["facets"]["bench"])}),
              "FACET_KEY_NOT_SNAKE_CASE")
        forge(lambda r: r.update(facets={}), "FACET_REGISTRY_INVALID")

    def test_reconcile_with_forged_registry_is_rejected(self):
        reg = registry()
        reg["facets"]["bench"]["approval"] = True
        with self.assertRaisesRegex(ValueError, "FACET_ENTRY_INVALID"):
            reconcile(reg)


class TwelveValidUnapprovedCases(unittest.TestCase):
    def setUp(self):
        self.out = reconcile()

    def test_twelve_cases_all_unapproved(self):
        cases = self.out["corrections"]
        self.assertEqual(len(cases), 12)
        self.assertEqual({c["catalog_id"] for c in cases}, set(PROOF.RULES))
        for c in cases:
            self.assertIs(c["safe_for_automatic_import"], False)
            self.assertEqual(c["owner_facet_source"], "OWNER_FEEDBACK_NOT_SUPPLIER_ATTRIBUTE")
            self.assertEqual(c["supplier_equipment_unchanged"], ["Synthetic Supplier Equipment"])
            self.assertNotIn("approved", c)
        generic = [c for c in cases if c["catalog_id"] != "TK-000539"]
        self.assertEqual(len(generic), 11)
        self.assertTrue(all(c["review_status"] == "EVIDENCED_CORRECTION_PROPOSAL_NOT_APPROVED"
                            and c["evidence_kind"] == "SUPPLIER_TEXT_TERM_MENTION_ONLY"
                            for c in generic))
        self.assertFalse(self.out["original_supplier_rows_modified"])

    def test_registry_provenance_recorded_and_verified(self):
        record = self.out["owner_facet_registry"]
        self.assertEqual(record["sha256"], PROOF.registry_sha256(registry()))
        self.assertEqual(record["facet_count"], 8)
        self.assertEqual(record["source"], "OWNER_FEEDBACK_NOT_SUPPLIER_ATTRIBUTE")
        self.assertTrue(re.fullmatch(r"[0-9a-f]{64}", record["sha256"]))
        by = {c["catalog_id"]: c for c in self.out["corrections"]}
        STAGE.verify_metadata_facets_and_anatomy(self.out, by, registry())

    def test_tk000539_is_not_claimed_as_anatomy(self):
        c = {x["catalog_id"]: x for x in self.out["corrections"]}["TK-000539"]
        self.assertEqual(c["issue"], "EXACT_LOWER_BACK_TAG")
        self.assertEqual(c["review_status"], "ANATOMICAL_TAG_NOT_EVIDENCED_REQUIRES_REVIEW")
        self.assertEqual(c["evidence_kind"], "MOVEMENT_STANCE_NOT_ANATOMICAL_EVIDENCE")
        self.assertIs(c["anatomical_tag_claim_valid"], False)
        self.assertIs(c["safe_for_automatic_import"], False)
        self.assertEqual(c["supporting_supplier_terms"], ["wide-stance"])
        self.assertEqual(c["suggested_additional_equipment_facets"], [])
        # supplier row untouched
        self.assertEqual(c["supplier_primary_muscles_unchanged"], ["Synthetic Muscle"])
        self.assertEqual(c["supplier_equipment_unchanged"], ["Synthetic Supplier Equipment"])

    def test_anatomical_issue_kind_rejected_for_other_case(self):
        saved = dict(PROOF.RULES)
        try:
            PROOF.RULES["TK-000402"] = ("lunge-sprint", ["lunge"], [], "EXACT_LOWER_BACK_TAG")
            with self.assertRaisesRegex(ValueError, "ANATOMICAL_ISSUE_ONLY_FOR"):
                reconcile()
        finally:
            PROOF.RULES.clear()
            PROOF.RULES.update(saved)

    def test_case_539_cannot_be_relabelled_in_rules(self):
        saved = dict(PROOF.RULES)
        try:
            PROOF.RULES["TK-000539"] = ("sumo-deadlift", ["wide-stance"], [], "EQUIPMENT")
            with self.assertRaisesRegex(ValueError, "ANATOMICAL_CASE_ISSUE_CHANGED"):
                reconcile()
        finally:
            PROOF.RULES.clear()
            PROOF.RULES.update(saved)


class StageVerification(unittest.TestCase):
    def setUp(self):
        self.proof = reconcile()
        self.by = {c["catalog_id"]: copy.deepcopy(c) for c in self.proof["corrections"]}
        self.reg = registry()

    def check(self, pattern, proof=None):
        with self.assertRaisesRegex(ValueError, pattern):
            STAGE.verify_metadata_facets_and_anatomy(proof or self.proof, self.by, self.reg)

    def test_forged_registry_hash_in_proof(self):
        self.proof["owner_facet_registry"]["sha256"] = "0" * 64
        self.check("OWNER_FACET_REGISTRY_PROOF_MISMATCH")

    def test_missing_registry_record_in_proof(self):
        del self.proof["owner_facet_registry"]
        self.check("OWNER_FACET_REGISTRY_PROOF_MISMATCH")

    def test_registry_changed_after_proof_was_made(self):
        self.reg["facets"]["extra_thing"] = copy.deepcopy(self.reg["facets"]["bench"])
        self.check("OWNER_FACET_REGISTRY_PROOF_MISMATCH")

    def test_forged_registry_flag_in_stage(self):
        self.reg["facets"]["bench"]["approval"] = True
        self.check("FACET_ENTRY_INVALID")

    def test_correction_with_unregistered_facet(self):
        self.by["TK-000381"]["suggested_additional_equipment_facets"] = ["plate"]
        self.check("FACET_NOT_IN_OWNER_REGISTRY:TK-000381")

    def test_correction_facet_claiming_supplier_source(self):
        self.by["TK-000381"]["owner_facet_source"] = "SUPPLIER_ATTRIBUTE"
        self.check("FACET_SOURCE_NOT_OWNER")

    def test_downgraded_anatomical_assertion(self):
        self.by["TK-000539"]["review_status"] = "EVIDENCED_CORRECTION_PROPOSAL_NOT_APPROVED"
        self.by["TK-000539"]["evidence_kind"] = "SUPPLIER_TEXT_TERM_MENTION_ONLY"
        self.check("ANATOMICAL_EXCEPTION_INVALID:TK-000539")

    def test_anatomical_claim_flag_flipped(self):
        self.by["TK-000539"]["anatomical_tag_claim_valid"] = True
        self.check("ANATOMICAL_EXCEPTION_INVALID:TK-000539")

    def test_anatomical_safe_for_import_flipped(self):
        self.by["TK-000539"]["safe_for_automatic_import"] = True
        self.check("ANATOMICAL_EXCEPTION_INVALID:TK-000539")

    def test_anatomical_terms_or_facets_changed(self):
        self.by["TK-000539"]["supporting_supplier_terms"] = ["lower back"]
        self.check("ANATOMICAL_EXCEPTION_INVALID:TK-000539")
        self.by["TK-000539"]["supporting_supplier_terms"] = ["wide-stance"]
        self.by["TK-000539"]["suggested_additional_equipment_facets"] = ["bench"]
        self.check("ANATOMICAL_EXCEPTION_INVALID:TK-000539")

    def test_anatomical_claim_field_missing_is_rejected(self):
        del self.by["TK-000539"]["anatomical_tag_claim_valid"]
        self.check("ANATOMICAL_EXCEPTION_INVALID:TK-000539")

    def test_wrong_case_id_with_anatomical_status(self):
        for field, value in (("review_status", "ANATOMICAL_TAG_NOT_EVIDENCED_REQUIRES_REVIEW"),
                             ("evidence_kind", "MOVEMENT_STANCE_NOT_ANATOMICAL_EVIDENCE"),
                             ("issue", "EXACT_LOWER_BACK_TAG"),
                             ("anatomical_tag_claim_valid", False)):
            by = copy.deepcopy(self.by)
            by["TK-000402"][field] = value
            with self.assertRaisesRegex(ValueError, "ANATOMICAL_STATUS_NOT_PERMITTED:TK-000402"):
                STAGE.verify_metadata_facets_and_anatomy(self.proof, by, self.reg)

    def test_stage_compile_rejects_forged_or_missing_registry_record(self):
        data = copy.deepcopy(STAGE_FIXTURE.fixture())
        self.assertIsNotNone(STAGE.compile_private(*data))
        forged = copy.deepcopy(data)
        forged[7]["owner_facet_registry"]["sha256"] = "f" * 64
        with self.assertRaisesRegex(ValueError, "OWNER_FACET_REGISTRY_PROOF_MISMATCH"):
            STAGE.compile_private(*forged)
        missing = copy.deepcopy(data)
        del missing[7]["owner_facet_registry"]
        with self.assertRaisesRegex(ValueError, "OWNER_FACET_REGISTRY_PROOF_MISMATCH"):
            STAGE.compile_private(*missing)

    def test_stage_compile_rejects_anatomical_status_on_wrong_case(self):
        data = copy.deepcopy(STAGE_FIXTURE.fixture())
        data[7]["corrections"][0]["review_status"] = PROOF.ANATOMY_STATUS
        with self.assertRaisesRegex(ValueError, "ANATOMICAL_STATUS_NOT_PERMITTED"):
            STAGE.compile_private(*data)

    def test_stage_compile_rejects_unregistered_facet(self):
        data = copy.deepcopy(STAGE_FIXTURE.fixture())
        data[7]["corrections"][0]["suggested_additional_equipment_facets"] = ["unmapped_thing"]
        with self.assertRaisesRegex(ValueError, "FACET_NOT_IN_OWNER_REGISTRY"):
            STAGE.compile_private(*data)


if __name__ == "__main__":
    unittest.main(verbosity=2)
