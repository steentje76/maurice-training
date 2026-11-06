#!/usr/bin/env python3
"""Synthetic provenance and release-boundary regressions."""
import importlib.util
import sys
sys.dont_write_bytecode = True
import unittest
from copy import deepcopy
from pathlib import Path
from test_movekit_classification_review import sample

SPEC = importlib.util.spec_from_file_location(
    "tk504_ledger", Path(__file__).with_name("movekit-review-ledger.py"))
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.catalog, self.inventory, self.rows = sample()
        self.classification = {
            "category": "mobility", "type": "mobility", "pattern": "mobility",
            "primary": ["Core"], "secondary": [], "equipment": ["Bodyweight"],
            "goals": ["mobility"],
        }
        for entry in self.catalog["catalog"]:
            entry["identity"].update(deepcopy(self.classification))
        self.hashes = {"supplier": "a"*64, "catalog": "b"*64, "inventory": "c"*64}
        self.template = M.make_template(self.catalog, self.inventory, self.rows, self.hashes)
        self.ledger = deepcopy(self.template)

    def accept(self, kind="AI"):
        e = self.ledger["entries"][0]
        e.update(decision="ACCEPT", classification=deepcopy(self.classification), review={
            "kind": kind, "reviewer": "synthetic-reviewer", "reference": "review-1",
            "reviewed_at": "2026-11-03T19:00:00Z", "rationale": "Synthetic rationale",
            "source_refs": ["supplier-sha256:" + e["supplier_record_sha256"]],
        })
        return e

    def validate(self):
        return M.validate(self.ledger, self.template, self.catalog)

    def test_deterministic_all_pending_no_mutation(self):
        self.assertEqual(self.template, M.make_template(
            self.catalog, self.inventory, self.rows, self.hashes))
        result = self.validate()
        self.assertEqual(result["counts"], {"pending": 356})
        self.assertFalse(result["release_approved"])
        self.assertFalse(result["db_writes"])
        self.assertEqual(self.ledger, self.template)

    def test_ai_review_never_human_or_release(self):
        self.accept()
        result = self.validate()
        self.assertEqual(result["counts"]["accept_ai"], 1)
        self.assertNotIn("accept_human_attested", result["counts"])
        self.assertFalse(result["app_activated"])

    def test_human_is_attestation_not_verified_authority(self):
        self.accept("HUMAN_ATTESTED")
        result = self.validate()
        self.assertFalse(result["human_identity_verified"])
        self.assertFalse(result["release_approved"])

    def test_stale_hash(self):
        self.ledger["source_hashes"]["supplier"] = "d"*64
        with self.assertRaisesRegex(ValueError, "STALE_SOURCE_HASH"):
            self.validate()

    def test_changed_supplier_payload_invalidates_record(self):
        self.ledger["entries"][0]["supplier_record_sha256"] = "e"*64
        with self.assertRaisesRegex(ValueError, "STALE_OR_CHANGED_SOURCE"):
            self.validate()

    def test_changed_suggestion_invalidates(self):
        self.ledger["entries"][0]["suggestion"]["proposed_type"] = "forged"
        with self.assertRaisesRegex(ValueError, "STALE_OR_CHANGED_SOURCE"):
            self.validate()

    def test_duplicate_identity(self):
        self.ledger["entries"][1] = deepcopy(self.ledger["entries"][0])
        with self.assertRaisesRegex(ValueError, "DUPLICATE_OR_UNKNOWN_ID"):
            self.validate()

    def test_missing_identity(self):
        self.ledger["entries"].pop()
        with self.assertRaisesRegex(ValueError, "INCOMPLETE_LEDGER"):
            self.validate()

    def test_unknown_classification_rejected(self):
        e = self.accept()
        e["classification"]["primary"] = ["InventedMuscle"]
        with self.assertRaisesRegex(ValueError, "UNKNOWN_CLASSIFICATION_PRIMARY"):
            self.validate()

    def test_incomplete_classification_rejected(self):
        self.accept()["classification"].pop("goals")
        with self.assertRaisesRegex(ValueError, "INCOMPLETE_CLASSIFICATION"):
            self.validate()

    def test_empty_primary_rejected(self):
        self.accept()["classification"]["primary"] = []
        with self.assertRaisesRegex(ValueError, "MISSING_PRIMARY_MUSCLE"):
            self.validate()

    def test_missing_exact_evidence_rejected(self):
        self.accept()["review"]["source_refs"] = ["supplier-metadata"]
        with self.assertRaisesRegex(ValueError, "MISSING_EXACT_SUPPLIER_REFERENCE"):
            self.validate()

    def test_missing_review_provenance_rejected(self):
        self.accept()["review"].pop("rationale")
        with self.assertRaisesRegex(ValueError, "INCOMPLETE_REVIEW_PROVENANCE"):
            self.validate()

    def test_auto_human_claim_not_allowed(self):
        self.accept("HUMAN_VERIFIED")
        with self.assertRaisesRegex(ValueError, "INVALID_REVIEW_KIND"):
            self.validate()

    def test_rejection_has_no_classification(self):
        e = self.accept()
        e["decision"] = "REJECT"
        with self.assertRaisesRegex(ValueError, "NON_ACCEPTED_CLASSIFICATION"):
            self.validate()
        e["classification"] = None
        self.assertEqual(self.validate()["counts"]["reject_ai"], 1)

    def test_output_path_guards_reused(self):
        with self.assertRaisesRegex(ValueError, "PUBLIC_REPO_OUTPUT_BLOCKED"):
            M.HINTS.CATALOG_STAGE.output_allowed(ROOT / "review.json", ROOT, ROOT / "source")

    def test_no_instruction_export_in_ledger(self):
        serialized = str(self.template)
        self.assertNotIn("instructions", serialized)
        self.assertNotIn("commonMistakes", serialized)


ROOT = Path(__file__).resolve().parent.parent
if __name__ == "__main__":
    unittest.main()
