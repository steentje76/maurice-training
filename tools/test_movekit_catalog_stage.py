#!/usr/bin/env python3
"""Synthetic-only checks for the local MoveKit catalog staging boundary."""
import importlib.util
import json
import sys
sys.dont_write_bytecode = True
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

SCRIPT = Path(__file__).with_name("movekit-catalog-stage.py")
spec = importlib.util.spec_from_file_location("movekit_catalog_stage", SCRIPT)
stage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stage)


def fixtures():
    old = []
    inventory = []
    metadata = []
    for i in range(1, 583):
        slug = f"synthetic-{i:04d}"
        cid = f"TK-{i:06d}"
        if i <= 226:
            old.append({
                "catalog_id": cid,
                "source": {"provider": "movekit", "provider_id": slug},
                "identity": {"name": f"Old {i}"},
                "intelligence": {"confidence": 42},
            })
        inventory.append({
            "catalog_id": cid, "provider_id": slug,
            "name": f"Supplier {i}",
            "status": "existing-id" if i <= 226 else "proposed-new",
        })
        metadata.append({
            "slug": slug, "name": f"Supplier {i}",
            "difficulty": "beginner",
            "primaryMuscles": ["Legs"], "secondaryMuscles": ["Core"],
            "equipment": ["Bodyweight"], "movementPattern": ["Mobility"],
            "instructions": ["Supplier-provided demonstration instruction."],
            "commonMistakes": ["Supplier-provided caution."],
            "videoFile": f"{slug}.mp4", "posterFile": f"posters/{slug}.png",
        })
    return ({"count": 226, "catalog": old},
            {"schema": "trainingskompas-movekit-golden-inventory/2.0",
             "status": "STAGING_ONLY_DO_NOT_ACTIVATE", "items": inventory}, metadata)


class StageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog, cls.inventory, cls.metadata = fixtures()

    def test_preserves_existing_entries_without_modification(self):
        before = json.dumps(self.catalog["catalog"], sort_keys=True)
        result = stage.build(self.catalog, self.inventory, self.metadata)
        self.assertEqual(result["count"], 582)
        self.assertEqual(len(result["catalog"]), 582)
        self.assertEqual(before, json.dumps(result["catalog"][:226], sort_keys=True))
        self.assertEqual(result["_status"], "PRIVATE_LOCAL_REVIEW_ONLY_NOT_ACTIVE")

    def test_no_fabricated_readiness_or_scientific_values(self):
        result = stage.build(self.catalog, self.inventory, self.metadata)
        new = result["catalog"][226:]
        self.assertEqual(len(new), 356)
        self.assertTrue(all(x["intelligence"]["fatigue"] is None for x in new))
        self.assertTrue(all(x["intelligence"]["recovery"] is None for x in new))
        self.assertTrue(all(x["intelligence"]["confidence"] is None for x in new))
        self.assertTrue(all(x["assets"] == [] for x in new))
        self.assertTrue(all(x["_review"]["status"] == "NOT_PUBLISHED" for x in new))

    def test_original_supplier_instructions_only(self):
        result = stage.build(self.catalog, self.inventory, self.metadata)
        item = result["catalog"][226]
        self.assertEqual(item["intelligence"]["cues"],
                         ["Supplier-provided demonstration instruction."])
        self.assertEqual(item["identity"]["category"], "pending_review")
        self.assertEqual(item["identity"]["primary"], ["Legs"])

    def test_source_incomplete_rejected(self):
        with self.assertRaisesRegex(ValueError, "SOURCE_COUNT_MISMATCH"):
            stage.build(self.catalog, self.inventory, self.metadata[:-1])

    def test_duplicate_source_slug_rejected(self):
        rows = deepcopy(self.metadata)
        rows[-1]["slug"] = rows[-2]["slug"]
        with self.assertRaisesRegex(ValueError, "DUPLICATE_SOURCE_SLUG"):
            stage.build(self.catalog, self.inventory, rows)

    def test_existing_id_reassignment_rejected(self):
        manifest = deepcopy(self.inventory)
        manifest["items"][0]["catalog_id"] = "TK-999999"
        with self.assertRaisesRegex(ValueError, "EXISTING_ID_REASSIGNED"):
            stage.build(self.catalog, manifest, self.metadata)

    def test_wrong_video_name_rejected(self):
        rows = deepcopy(self.metadata)
        rows[226]["videoFile"] = "../../another.mp4"
        with self.assertRaisesRegex(ValueError, "VIDEO_REFERENCE_MISMATCH"):
            stage.build(self.catalog, self.inventory, rows)

    def test_changed_supplier_name_rejected(self):
        rows = deepcopy(self.metadata)
        rows[226]["name"] = "unexpected renaming"
        with self.assertRaisesRegex(ValueError, "SOURCE_NAME_MISMATCH"):
            stage.build(self.catalog, self.inventory, rows)

    def test_wrong_inventory_status_rejected(self):
        inv = deepcopy(self.inventory)
        inv["status"] = "ACTIVE"
        with self.assertRaisesRegex(ValueError, "INVALID_INVENTORY"):
            stage.build(self.catalog, inv, self.metadata)

    def test_private_output_enforced(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            repo = root / "repo"
            source = root / "licensed"
            repo.mkdir()
            source.mkdir()
            valid = source / ".tk-private-review" / "review.json"
            self.assertEqual(stage.output_allowed(valid, repo, source), valid)
            for bad in (repo / "stage.json", root / "public.json",
                        source / "direct.json", source / ".tk-private-review" / "bad.txt"):
                with self.subTest(path=str(bad)):
                    with self.assertRaises(ValueError):
                        stage.output_allowed(bad, repo, source)
            valid.parent.mkdir()
            valid.write_text("nope", encoding="utf8")
            with self.assertRaisesRegex(ValueError, "OUTPUT_ALREADY_EXISTS"):
                stage.output_allowed(valid, repo, source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
