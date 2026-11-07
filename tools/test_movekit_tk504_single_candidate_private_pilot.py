"""TK504 single-pilot isolation, catalog contract and evidence negative tests."""
import argparse
import hashlib
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import tk504_single_candidate_private_pilot as pilot

ID="TK-000227"
SLUG="90-90-hip-switches"

class PilotTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root=Path(self.tmp.name)
        private=root/".tk-private-review"
        private.mkdir()
        self.videos=private/"videos";self.videos.mkdir()
        self.posters=private/"posters";self.posters.mkdir()
        self.video_data=b"video-immutable-test-content"
        self.poster_data=b"poster-immutable-test-content"
        (self.videos/(SLUG+".mp4")).write_bytes(self.video_data)
        (self.posters/(SLUG+".webp")).write_bytes(self.poster_data)
        self.stage=private/"stage.json"
        self.golden=private/"golden.json"
        self.posteridx=private/"poster-index.json"
        self.trans=private/"tr.zip"
        self.index=private/"index.html"
        self.out=private/"pilot-output"
        self.record={
          "catalog_id":ID,"source":{"provider":"movekit","provider_id":SLUG},
          "identity":{"name":"90/90 Hip Switches","nl":None,"category":"pending_review",
             "type":"pending_review","family":"pending_review",
             "pattern":"pending_review","primary":["Glutes"],"secondary":[],
             "equipment":["Bodyweight"],"difficulty":"beginner","goals":[]},
          "intelligence":{"cues":[],"mistakes":[]},"assets":[],
          "flags":{"favorite":False,"custom":False,"home_gym_ready":False,
                   "travel_ready":False,"injury_flags":[]},
          "_review":{"status":"NOT_PUBLISHED",
             "confirmed_by_authenticated_reviewer":False}
        }
        self.stage.write_text(json.dumps({"_status":"PRIVATE_DRAFT",
         "_approved_for_import":False,"catalog":[self.record]}),encoding="utf-8")
        self.video_meta={"sha256":hashlib.sha256(self.video_data).hexdigest(),
          "bytes":len(self.video_data),
          "path":"movekit/v2/video/"+SLUG+".mp4"}
        self.poster_meta={"catalog_id":ID,"provider_id":SLUG,
          "sha256":hashlib.sha256(self.poster_data).hexdigest(),
          "bytes":len(self.poster_data),
          "path":"movekit/v2/poster-optimized/"+SLUG+".webp"}
        self.golden.write_text(json.dumps({"items":[{"catalog_id":ID,
          "provider_id":SLUG,"video":self.video_meta}]}),encoding="utf-8")
        self.posteridx.write_text(json.dumps({"items":[self.poster_meta]}),encoding="utf-8")
        entry={"catalog_id":ID,"group":"UNRELEASED_CANDIDATE",
          "translation_status":"DRAFT_NOT_HUMAN_REVIEWED_NOT_PUBLISHED",
          "translations":{"name_nl":"90/90 heupwissels",
             "shortDescription_nl":"Zittende heupmobiliteit.",
             "instructions_nl":"1. Zit rechtop.; 2. Draai de heupen.",
             "commonMistakes_nl":"Rug krom houden."}}
        with zipfile.ZipFile(self.trans,"w") as z:
          z.writestr("TK504-NL-CANONICAL-OVERLAY-582-20261105.json",
                     json.dumps({"items":[entry]}))
        # Minimal synthetic markers from real TK, no supplier content in fixtures.
        self.index.write_text('<html><head></head><body><script>\n'
          'var ExerciseAssetProvider=(function(){});\n'
          'var VIDEO_MANIFEST={"TK-000001":{}};\n'
          'const TK504_PRIVATE_MEDIA_RELEASE = false;\n'
          'const EX_CATALOG = {"catalog":[{"catalog_id":"TK-000001"}],"count":1};\n'
          '</script></body></html>',encoding="utf-8")
        self.args=argparse.Namespace(index=self.index,stage=self.stage,
           golden=self.golden,poster_index=self.posteridx,
           translations=self.trans,videos_dir=self.videos,posters_dir=self.posters,
           private_out=self.out,port=18777,serve=False,check_only=True)

    def test_single_unpublished_candidate_is_usable_in_provisional_preview(self):
        r,tr,video,poster,vm,pm=pilot.parse_record(self.args)
        self.assertEqual(r["catalog_id"],ID)
        self.assertEqual(r["identity"]["nl"],"90/90 heupwissels")
        self.assertEqual(r["identity"]["category"],"mobility")
        self.assertEqual(r["_review"]["status"],"NOT_PUBLISHED")
        self.assertEqual(r["_review"]["integration_status"],pilot.PILOT_STATUS)
        self.assertEqual(video.stat().st_size,len(self.video_data))
        self.assertEqual(poster.stat().st_size,len(self.poster_data))

    def test_private_html_uses_existing_provider_and_ecs(self):
        pilot.launch(self.args)
        s=(self.out/"index.html").read_text(encoding="utf-8")
        self.assertEqual(s.count('EX_CATALOG.catalog.push('),1)
        self.assertIn('90/90 heupwissels',s)
        self.assertIn('VIDEO_MANIFEST["TK-000227"]',s)
        self.assertIn('var ExerciseAssetProvider=',s)
        self.assertIn('const EX_CATALOG = ',s)
        self.assertIn('tk504-pilot-video',s)
        self.assertIn('no',s.lower())  # flags and explicit no-release status present
        self.assertIn('http://127.0.0.1:18777',s)
        self.assertNotIn("TK-000228",s)
        self.assertIn("TK504_PRIVATE_MEDIA_RELEASE = false",s)
        self.assertIn("disabled_in_private_pilot",s)

    def test_approved_candidate_is_rejected(self):
        obj=json.loads(self.stage.read_text())
        obj["catalog"][0]["_review"]["status"]="RELEASE_APPROVED"
        self.stage.write_text(json.dumps(obj))
        with self.assertRaises(RuntimeError):pilot.parse_record(self.args)

    def test_human_approved_candidate_is_rejected_as_unreviewed_pilot(self):
        obj=json.loads(self.stage.read_text())
        obj["catalog"][0]["_review"]["confirmed_by_authenticated_reviewer"]=True
        self.stage.write_text(json.dumps(obj))
        with self.assertRaises(RuntimeError):pilot.parse_record(self.args)

    def test_different_provider_slug_is_rejected(self):
        obj=json.loads(self.stage.read_text())
        obj["catalog"][0]["source"]["provider_id"]="wrong-movekit-slug"
        self.stage.write_text(json.dumps(obj))
        with self.assertRaises(RuntimeError):pilot.parse_record(self.args)

    def test_video_byte_tampering_is_rejected(self):
        (self.videos/(SLUG+".mp4")).write_bytes(b"tampered")
        with self.assertRaises(RuntimeError):pilot.parse_record(self.args)

    def test_poster_byte_tampering_is_rejected(self):
        (self.posters/(SLUG+".webp")).write_bytes(b"tampered")
        with self.assertRaises(RuntimeError):pilot.parse_record(self.args)

    def test_unapproved_dutch_translation_is_required(self):
        with zipfile.ZipFile(self.trans,"w") as z:
            z.writestr("TK504-NL-CANONICAL-OVERLAY-582-20261105.json",
                       json.dumps({"items":[]}))
        with self.assertRaises(RuntimeError):pilot.parse_record(self.args)

    def test_no_writes_outside_private_folder(self):
        self.args.private_out=Path(self.tmp.name)/"not-private"
        with self.assertRaises(RuntimeError):pilot.launch(self.args)
        self.assertFalse(self.args.private_out.exists())

    def test_no_production_release_template(self):
        self.index.write_text(self.index.read_text().replace(
            "TK504_PRIVATE_MEDIA_RELEASE = false","TK504_PRIVATE_MEDIA_RELEASE = true"))
        with self.assertRaises(RuntimeError):pilot.launch(self.args)


if __name__=="__main__":
    unittest.main()
