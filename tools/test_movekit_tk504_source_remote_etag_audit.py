"""Synthetic negative tests for TK504 source -> remote Storage ETag audit."""
import hashlib
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from tk504_source_remote_etag_audit import verify


def make_row(i,data,poster=False):
    slug=f"synthetic-exercise-{i}"
    cat=f"TK-{i:06d}"
    path=("movekit/v2/poster-optimized/" if poster else "movekit/v2/video/")+slug+(".webp" if poster else ".mp4")
    detail={"path":path,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()}
    if poster:
        return {"catalog_id":cat,"provider_id":slug,**detail}
    return {"catalog_id":cat,"provider_id":slug,"video":detail}


class TestSourceEtags(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.video=[make_row(1,b"video-A"),make_row(2,b"video-B")]
        self.poster=[make_row(1,b"poster-A",True),make_row(2,b"poster-B",True)]
        for n,blob in [(1,b"video-A"),(2,b"video-B")]:
            (self.root/f"synthetic-exercise-{n}.mp4").write_bytes(blob)
        for n,blob in [(1,b"poster-A"),(2,b"poster-B")]:
            (self.root/f"synthetic-exercise-{n}.webp").write_bytes(blob)

    def run_video(self):
        return verify(self.video,self.root,"video","movekit/v2/video/",expected_count=2)

    def run_poster(self):
        return verify(self.poster,self.root,"poster","movekit/v2/poster-optimized/",
                      source_ids={x["catalog_id"]:x["provider_id"] for x in self.video},expected_count=2)

    def test_source_sha_match(self):
        out=self.run_video()
        self.assertEqual(out["problem_count"],0)
        self.assertEqual(out["checked"],2)
        self.assertEqual(len(out["etag_manifest_md5"]),32)

    def test_non_media_sidecar_is_ignored(self):
        (self.root/"LICENSE.txt").write_text("synthetic fixture",encoding="utf-8")
        (self.root/"manifest.json").write_text("{}",encoding="utf-8")
        self.assertEqual(self.run_video()["problem_count"],0)

    def test_mutated_media_byte_is_detected(self):
        (self.root/"synthetic-exercise-2.mp4").write_bytes(b"video-X")
        self.assertGreater(self.run_video()["problem_count"],0)

    def test_same_extension_extra_is_rejected(self):
        (self.root/"unexpected.mp4").write_bytes(b"x")
        self.assertGreater(self.run_video()["problem_count"],0)

    def test_missing_video_is_rejected(self):
        (self.root/"synthetic-exercise-1.mp4").unlink()
        self.assertGreater(self.run_video()["problem_count"],0)

    def test_provider_crosswalk_mismatch_is_rejected(self):
        src={"TK-000001":"other-exercise","TK-000002":"synthetic-exercise-2"}
        out=verify(self.poster,self.root,"poster","movekit/v2/poster-optimized/",
                   source_ids=src,expected_count=2)
        self.assertGreater(out["problem_count"],0)

    def test_path_traversal_provider_id_rejected(self):
        self.video[0]["provider_id"]="../../escape"
        self.assertGreater(self.run_video()["problem_count"],0)

    def test_poster_sha_match(self):
        self.assertEqual(self.run_poster()["problem_count"],0)

    def test_expected_storage_path_mismatch_rejected(self):
        self.video[0]["video"]["path"]="movekit/v2/video/wrong.mp4"
        self.assertGreater(self.run_video()["problem_count"],0)


if __name__=="__main__":
    unittest.main()
