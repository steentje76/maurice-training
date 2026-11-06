#!/usr/bin/env python3
"""Synthetic contract tests; no supplier payload, videos or credentials."""
import importlib.util
import json
import sys
sys.dont_write_bytecode = True
import unittest
from copy import deepcopy
from pathlib import Path
from test_movekit_catalog_stage import fixtures

SCRIPT = Path(__file__).with_name("movekit-classification-review.py")
SPEC = importlib.util.spec_from_file_location("tk504_classification_review", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def sample():
    catalog, inventory, rows = fixtures()
    for old in catalog["catalog"]:
        old["identity"]["category"] = "mobility"
        old["identity"]["type"] = "mobility"
    return catalog, inventory, rows


class ClassificationTests(unittest.TestCase):
    def test_full_356_suggestions_remain_unapproved(self):
        catalog, inventory, rows = sample()
        before = json.dumps(catalog, sort_keys=True)
        result = MODULE.recommend(catalog, inventory, rows)
        self.assertEqual(result["total"], 582)
        self.assertEqual(result["candidate_count"], 356)
        self.assertEqual(len(result["candidates"]), 356)
        self.assertEqual(result["suggestions_not_approved"], 356)
        self.assertTrue(all(x["review_required"] for x in result["candidates"]))
        self.assertEqual(before, json.dumps(catalog, sort_keys=True))

    def test_exact_provenance_requires_all_three_fields(self):
        cat, inv, rows = sample()
        candidate = MODULE.recommend(cat, inv, rows)["candidates"][0]
        self.assertEqual(candidate["matching_basis"], "pattern+primary+equipment")
        self.assertEqual(candidate["proposed_type"], "mobility")
        self.assertEqual(candidate["proposed_category"], "mobility")
        self.assertEqual(len(candidate["supporting_catalog_ids"]), 226)

    def test_equipment_difference_falls_back_to_primary_match(self):
        cat, inv, rows = sample()
        rows[226]["equipment"] = ["Machine"]
        result = MODULE.recommend(cat, inv, rows)
        target = next(x for x in result["candidates"] if x["catalog_id"] == "TK-000227")
        self.assertEqual(target["matching_basis"], "pattern+primary")
        self.assertEqual(target["status"], "SUGGESTED_UNVERIFIED")

    def test_conflicting_exact_match_blocks_broad_fallback(self):
        cat, inv, rows = sample()
        cat["catalog"][0]["identity"]["category"] = "cardio"
        result = MODULE.recommend(cat, inv, rows)
        target = result["candidates"][0]
        self.assertEqual(target["status"], "CONFLICT_REVIEW_REQUIRED")
        self.assertEqual(target["matching_basis"], "pattern+primary+equipment")
        self.assertIsNone(target["proposed_category"])
        self.assertIsNone(target["proposed_type"])

    def test_no_match_stays_unmapped(self):
        cat, inv, rows = sample()
        rows[226]["primaryMuscles"] = ["NeverSeenMuscle"]
        result = MODULE.recommend(cat, inv, rows)
        target = next(x for x in result["candidates"] if x["catalog_id"] == "TK-000227")
        self.assertEqual(target["status"], "NO_BASELINE_MATCH")
        self.assertEqual(target["supporting_catalog_ids"], [])

    def test_reordering_tag_lists_does_not_change_result(self):
        cat, inv, rows = sample()
        for row in rows:
            row["primaryMuscles"] = ["Legs", "Core"]
            row["equipment"] = ["Bodyweight", "Dumbbell"]
        expected = MODULE.recommend(cat, inv, rows)
        rows[226]["primaryMuscles"] = ["Core", "Legs"]
        rows[226]["equipment"] = ["Dumbbell", "Bodyweight"]
        self.assertEqual(expected, MODULE.recommend(cat, inv, rows))

    def test_invalid_supplier_tags_rejected(self):
        cat, inv, rows = sample()
        rows[226]["movementPattern"] = ["Mobility", None]
        with self.assertRaisesRegex(ValueError, "INVALID_MOVEMENTPATTERN"):
            MODULE.recommend(cat, inv, rows)

    def test_no_approved_claims_or_instruction_export(self):
        cat, inv, rows = sample()
        result = MODULE.recommend(cat, inv, rows)
        output = json.dumps(result)
        self.assertNotIn("Supplier-provided demonstration", output)
        self.assertNotIn("https://", output)
        self.assertNotIn(".mp4", output)
        self.assertNotIn("confidence", output)
        self.assertNotIn("APPROVED", output.replace("UNVERIFIED", ""))

    def test_changed_existing_id_is_rejected_before_classification(self):
        cat, inv, rows = sample()
        inv["items"][1]["catalog_id"] = "TK-999999"
        with self.assertRaisesRegex(ValueError, "EXISTING_ID_REASSIGNED"):
            MODULE.recommend(cat, inv, rows)

    def test_source_incompleteness_rejected(self):
        cat, inv, rows = sample()
        with self.assertRaisesRegex(ValueError, "SOURCE_COUNT_MISMATCH"):
            MODULE.recommend(cat, inv, rows[:-1])


if __name__ == "__main__":
    unittest.main(verbosity=2)
