"""TK504 15-batch owner decision: exact content fingerprint and release isolation."""
import copy
import json
import unittest
import zipfile
from pathlib import Path

import test_movekit_tk504_batch25_import as fixture_module
import tk504_bulk_owner_review as approval
import tk504_private_review_batch as batch


class BulkOwnerReviewTests(unittest.TestCase):
    def setUp(self):
        self.fixture=fixture_module.BatchTests()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.args=self.fixture.args
        self.stage=self.args.stage
        self.translations=self.args.translations
        self.obj=json.loads(self.stage.read_text(encoding="utf-8"))
        with zipfile.ZipFile(self.translations) as z:
            self.txt=json.loads(z.read(
                "TK504-NL-CANONICAL-OVERLAY-582-20261105.json"))
        self.manifest=approval.create_manifest(
            self.obj["catalog"],self.txt["items"])
        self.approval_path=self.args.private_out.parent/"bulk-owner.json"
        self.approval_path.write_text(json.dumps(self.manifest),encoding="utf-8")
        self.args.bulk_approval=self.approval_path

    def test_fifteen_exact_ranges_no_missing_or_overlap(self):
        ranges=self.manifest["content_fingerprint"]["batches"]
        self.assertEqual(len(ranges),15)
        self.assertEqual([v["count"] for v in ranges],[25]*14+[6])
        self.assertEqual(ranges[0]["from"],"TK-000227")
        self.assertEqual(ranges[-1]["through"],"TK-000582")
        self.assertEqual(sum(v["count"] for v in ranges),356)
        self.assertEqual(self.manifest["decision_utterance"],approval.UTTERANCE)

    def test_bulk_scope_never_grants_release(self):
        self.assertEqual(self.manifest["status"],approval.STATUS)
        self.assertTrue(all(v is False for v in
                            self.manifest["access_release"].values()))
        self.assertIn("owner_bulk_instruction_not_356_separate_per_item_signatures",
                      self.manifest["review_evidence_type"])

    def test_exact_evidence_pinning_pass(self):
        self.assertTrue(approval.verify(
            self.manifest,self.obj["catalog"],self.txt["items"]))

    def test_draft_content_tamper_is_rejected(self):
        modified=copy.deepcopy(self.txt)
        modified["items"][240]["translations"]["name_nl"]="CHANGED"
        with self.assertRaises(ValueError):approval.verify(
            self.manifest,self.obj["catalog"],modified["items"])

    def test_category_tamper_is_rejected(self):
        changed=copy.deepcopy(self.obj)
        changed["catalog"][2]["_review"]["feedback"].setdefault(
            "ai_classification_proposal",{})["category"]="unknown-manipulated"
        with self.assertRaises(ValueError):approval.verify(
            self.manifest,changed["catalog"],self.txt["items"])

    def test_release_flag_flip_is_rejected(self):
        changed=copy.deepcopy(self.manifest)
        changed["access_release"]["production_release_authorized"]=True
        with self.assertRaises(ValueError):approval.verify(
            changed,self.obj["catalog"],self.txt["items"])

    def test_scope_expansion_is_rejected(self):
        changed=copy.deepcopy(self.manifest)
        changed["scope"]["content_approved_count"]=357
        with self.assertRaises(ValueError):approval.verify(
            changed,self.obj["catalog"],self.txt["items"])

    def test_first_batch_25_content_approved_but_not_published(self):
        rows=batch.batch_records(self.args)
        self.assertEqual(len(rows),25)
        self.assertTrue(all(r["approved"] for r in rows))
        self.assertTrue(all(r["approval_kind"]=="OWNER_BULK_CONTENT_APPROVED"
                            for r in rows))
        self.assertTrue(all(r["row"]["_review"]["trainable"] is False
                            and r["row"]["_review"]["selectable"] is False
                            and r["row"]["_review"]["status"]=="NOT_PUBLISHED"
                            for r in rows))

    def test_batch_two_only_approved_for_visible_content(self):
        self.args.start=252
        rows=batch.batch_records(self.args)
        self.assertEqual(len(rows),25)
        self.assertEqual(sum(r["approved"] for r in rows),25)
        self.assertTrue(all(r["row"]["_review"]["owner_approval_scope"]
                            =="BULK_VISIBLE_CONTENT_ONLY" for r in rows))

    def test_final_six_approved_but_not_trainable(self):
        self.args.start=577
        self.args.count=6
        rows=batch.batch_records(self.args)
        self.assertEqual(len(rows),6)
        self.assertTrue(all(r["approved"] for r in rows))
        self.assertTrue(all(r["row"]["_review"]["trainable"] is False
                            for r in rows))

    def test_wrong_manifest_does_not_render(self):
        changed=copy.deepcopy(self.manifest)
        changed["content_fingerprint"]["display_sha256"]="0"*64
        self.approval_path.write_text(json.dumps(changed))
        with self.assertRaises(ValueError):batch.batch_records(self.args)

    def test_default_old_pilot_evidence_still_one(self):
        self.args.bulk_approval=None
        self.args.start=227
        rows=batch.batch_records(self.args)
        self.assertEqual(sum(r["approved"] for r in rows),1)
        self.assertFalse(rows[1]["approved"])


if __name__=="__main__":
    unittest.main()
