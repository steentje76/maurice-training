"""Deterministic synthetic negative tests for 25-item local ECS import.

No proprietary MoveKit media, metadata, text or user data in this test.
"""
import argparse
import hashlib
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
import tk504_private_review_batch as batch


class BatchTests(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory();self.addCleanup(tmp.cleanup)
        root=Path(tmp.name);private=root/".tk-private-review";private.mkdir()
        video_dir=private/"videos";poster_dir=private/"posters"
        video_dir.mkdir();poster_dir.mkdir()
        work=root/"stub-index";work.mkdir()
        catalog=work/"exercise-catalog.json"
        index=work/"index.html"
        stage=private/"stage.json"
        golden=private/"golden.json"
        poster_index=private/"poster.json"
        translations=private/"translations.zip"
        approval=work/"approved.json"
        index.write_text(
          "<!doctype html><html><body><script>\n"
          "var ExerciseAssetProvider=(function(){return {};})();\n"
          "var VIDEO_MANIFEST={};\n"
          "const TK504_PRIVATE_MEDIA_RELEASE = false;\n"
          "const EX_CATALOG = {\"count\":226,\"catalog\":[]};\n"
          "</script></body></html>",encoding="utf-8")
        old=[];staged=[];vid=[];post=[];translated=[]
        for n in range(1,583):
            cid=f"TK-{n:06d}";slug=f"synthetic-exercise-{n}"
            row={"catalog_id":cid,"source":{"provider":"movekit","provider_id":slug},
                 "identity":{"name":f"Synthetic name {n}","nl":None,"category":"pending_review",
                   "family":"pending_review","pattern":"pending_review","type":"pending_review",
                   "difficulty":"beginner","primary":[],"secondary":[],"equipment":[],"goals":[]},
                 "intelligence":{},"assets":[],"relations":{},"flags":{},
                 "_review":{"status":"NOT_PUBLISHED","confirmed_by_authenticated_reviewer":False,
                 "feedback":{"ai_classification_proposal":{"category":"mobility"}}}}
            if n <=226:old.append(row)
            else:staged.append(row)
            vb=f"video-stub-{cid}".encode()
            pb=f"poster-stub-{cid}".encode()
            vi={"catalog_id":cid,"provider_id":slug,
                "video":{"path":f"movekit/v2/video/{slug}.mp4",
                 "bytes":len(vb),"sha256":hashlib.sha256(vb).hexdigest()}}
            pi={"catalog_id":cid,"provider_id":slug,
                "path":f"movekit/v2/poster-optimized/{slug}.webp",
                "bytes":len(pb),"sha256":hashlib.sha256(pb).hexdigest()}
            vid.append(vi);post.append(pi)
            translated.append({"catalog_id":cid,"group":"UNRELEASED_CANDIDATE",
                "translation_status":"DRAFT_NOT_HUMAN_REVIEWED_NOT_PUBLISHED",
                "translations":{"name_nl":f"Proefbeweging {n}",
                  "shortDescription_nl":"Synthetische omschrijving",
                  "instructions_nl":"1. Teststap; 2. Tweede teststap",
                  "commonMistakes_nl":"Niet uitvoeren zonder test"}})
            if 227<=n<=276 or 577<=n<=582:
                (video_dir/(slug+".mp4")).write_bytes(vb)
                (poster_dir/(slug+".webp")).write_bytes(pb)
        catalog.write_text(json.dumps({"count":226,"catalog":old}))
        stage.write_text(json.dumps({"_approved_for_import":0,
           "_app_activated":False,"catalog":staged}))
        golden.write_text(json.dumps({"items":vid}))
        poster_index.write_text(json.dumps({"items":post}))
        with zipfile.ZipFile(translations,"w") as z:
            z.writestr("TK504-NL-CANONICAL-OVERLAY-582-20261105.json",
                       json.dumps({"items":translated}))
        approval.write_text(json.dumps({"exercise":{"catalog_id":"TK-000227",
          "taxonomy":{"category":"mobility","type":"mobility","family":"mobility","pattern":"mobility"}},
          "decision_status":"OWNER_CONTENT_APPROVED_FOR_SINGLE_ITEM_PILOT",
          "access_release":{"production_release_authorized":False}}))
        self.args=argparse.Namespace(index=index,catalog=catalog,stage=stage,
          golden=golden,poster_index=poster_index,translations=translations,
          approval=approval,videos_dir=video_dir,posters_dir=poster_dir,
          private_out=private/"output",start=227,count=25,port=18777,
          check_only=True,serve=False)

    def mutate(self,key,action):
        p=getattr(self.args,key)
        obj=json.loads(p.read_text())
        action(obj)
        p.write_text(json.dumps(obj))

    def test_real_length_and_owner_scope(self):
        rows=batch.batch_records(self.args)
        self.assertEqual(len(rows),25)
        self.assertEqual([r["catalog_id"] for r in rows],
            [f"TK-{i:06d}" for i in range(227,252)])
        self.assertEqual(sum(r["approved"] for r in rows),1)
        self.assertTrue(all(r["row"]["_review"]["trainable"] is False for r in rows))
        self.assertTrue(all(r["row"]["_review"]["status"]=="NOT_PUBLISHED" for r in rows))
        self.assertEqual(rows[0]["row"]["identity"]["category"],"mobility")

    def test_following_batch_keeps_first_owner_scope_out(self):
        self.args.start=252
        rows=batch.batch_records(self.args)
        self.assertEqual(len(rows),25)
        self.assertEqual(sum(r["approved"] for r in rows),0)

    def test_final_six_are_supported_only_at_end(self):
        self.args.start=577
        self.args.count=6
        rows=batch.batch_records(self.args)
        self.assertEqual(len(rows),6)
        self.assertEqual(rows[-1]['catalog_id'],'TK-000582')
        self.assertEqual(sum(x['approved'] for x in rows),0)

    def test_reject_unaligned_batch_start(self):
        self.args.start=228
        with self.assertRaises(RuntimeError):batch.batch_records(self.args)

    def test_reject_batch_larger_than_25(self):
        self.args.count=26
        with self.assertRaises(RuntimeError):batch.batch_records(self.args)

    def test_reject_batch_below_25(self):
        self.args.count=24
        with self.assertRaises(RuntimeError):batch.batch_records(self.args)

    def test_reject_duplicate_provider_slug(self):
        self.mutate("stage",lambda o:o["catalog"][1]["source"].update(
          {"provider_id":o["catalog"][0]["source"]["provider_id"]}))
        with self.assertRaises(RuntimeError):batch.batch_records(self.args)

    def test_reject_approved_source_not_unpublished(self):
        self.mutate("stage",lambda o:o["catalog"][0]["_review"].update({"status":"PUBLISHED"}))
        with self.assertRaises(RuntimeError):batch.batch_records(self.args)

    def test_reject_auto_import_flag(self):
        self.mutate("stage",lambda o:o.update({"_approved_for_import":1}))
        with self.assertRaises(RuntimeError):batch.batch_records(self.args)

    def test_reject_wrong_golden_path(self):
        self.mutate("golden",lambda o:o["items"][226]["video"].update({"path":"videos/public.mp4"}))
        with self.assertRaises(RuntimeError):batch.batch_records(self.args)

    def test_reject_bad_video_bytes(self):
        p=self.args.videos_dir/"synthetic-exercise-230.mp4"
        p.write_bytes(b"tampered")
        with self.assertRaises(RuntimeError):batch.batch_records(self.args)

    def test_reject_bad_poster_bytes(self):
        p=self.args.posters_dir/"synthetic-exercise-230.webp"
        p.write_bytes(b"tampered")
        with self.assertRaises(RuntimeError):batch.batch_records(self.args)

    def test_reject_unreviewed_translation_turned_live(self):
        with zipfile.ZipFile(self.args.translations) as z:
            item=json.loads(z.read("TK504-NL-CANONICAL-OVERLAY-582-20261105.json"))
        item["items"][226]["translation_status"]="LIVE_APPROVED"
        with zipfile.ZipFile(self.args.translations,"w") as z:
            z.writestr("TK504-NL-CANONICAL-OVERLAY-582-20261105.json",json.dumps(item))
        with self.assertRaises(RuntimeError):batch.batch_records(self.args)

    def test_reject_output_outside_private_folder(self):
        self.args.private_out=Path(self.args.index.parent)/"outside"
        with self.assertRaises(RuntimeError):batch.run(self.args)
        self.assertFalse(self.args.private_out.exists())

    def test_reject_release_enabled(self):
        self.args.index.write_text(self.args.index.read_text().replace(
            "TK504_PRIVATE_MEDIA_RELEASE = false;","TK504_PRIVATE_MEDIA_RELEASE = true;"))
        with self.assertRaises(RuntimeError):batch.run(self.args)

    def test_inline_js_escape(self):
        dangerous="</script><img src=x onerror=alert(1)> &"
        safe=batch.js(dangerous)
        self.assertNotIn("<script",safe)
        self.assertNotIn("</script>",safe)
        self.assertNotIn("<img",safe)
        self.assertIn("\\u003c",safe)

    def test_preview_extends_existing_ecs_not_new_implementation(self):
        batch.run(self.args)
        html=(self.args.private_out/"index.html").read_text(encoding="utf-8")
        self.assertIn("EX_CATALOG.catalog.push(...",html)
        self.assertIn("Object.assign(VIDEO_MANIFEST",html)
        self.assertIn("ExerciseCatalogService",html)
        self.assertIn("ExerciseAssetProvider",html)
        self.assertIn("BATCH25_AUDIT=",html)
        self.assertIn("TRAININGSKOMPAS",html)
        self.assertNotIn("tk504_local_approval_saved",html)
        self.assertIn('panel.id="tk504-batch-review"',html) # added at runtime

if __name__=="__main__":
    unittest.main()
