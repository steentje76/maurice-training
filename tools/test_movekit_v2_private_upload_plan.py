#!/usr/bin/env python3
"""Synthetic-only MoveKit upload planning tests. No files from the supplier."""
import importlib.util
import json
import sys
sys.dont_write_bytecode = True
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("movekit-v2-private-upload-plan.py")
SPEC = importlib.util.spec_from_file_location("movekit_private_upload_plan", SCRIPT)
P = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(P)
P.COUNT = 2


def fixture(root):
    repo = root / "public-repo"
    source = root / "private-source"
    (repo / "docs/generated").mkdir(parents=True)
    videos = source / "complete-exercise-library-golden-release-synthetic"
    posters = source / ".tk-private-review/posters-webp-v2"
    videos.mkdir(parents=True)
    posters.mkdir(parents=True)
    inv_items, post_items = [], []
    for i in range(2):
        cid, slug = f"TK-{i+1:06d}", f"synthetic-{i}"
        vbytes, pbytes = f"video_{i}_fake".encode(), f"webp_{i}_fake".encode()
        vfile = videos / f"{slug}.mp4"
        pfile = posters / f"{slug}.webp"
        vfile.write_bytes(vbytes)
        pfile.write_bytes(pbytes)
        inv_items.append({
            "catalog_id": cid, "provider_id": slug,
            "video": {
                "path": f"movekit/v2/video/{slug}.mp4",
                "sha256": P.digest(vfile), "bytes": len(vbytes)
            }
        })
        post_items.append({
            "catalog_id": cid, "provider_id": slug,
            "private_storage_path": f"movekit/v2/poster-optimized/{slug}.webp",
            "sha256": P.digest(pfile), "bytes": len(pbytes),
            "mime": "image/webp"
        })
    inv = {
        "schema": "trainingskompas-movekit-golden-inventory/2.0",
        "status": "STAGING_ONLY_DO_NOT_ACTIVATE",
        "release": "SYNTHETIC_TEST_ONLY",
        "items": inv_items
    }
    post = {
        "schema": "trainingskompas-movekit-private-poster-registry/1.0",
        "status": "LOCAL_ONLY_NO_UPLOAD_NO_RELEASE",
        "count": 2, "items": post_items
    }
    inventory_path = repo / "docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json"
    poster_path = posters / "catalog-poster-registry.json"
    inventory_path.write_text(json.dumps(inv), encoding="utf8")
    poster_path.write_text(json.dumps(post), encoding="utf8")
    return repo, source, videos, posters, inventory_path, poster_path


class UploadPlanTests(unittest.TestCase):
    def test_generates_deterministic_verified_plan_no_network(self):
        with tempfile.TemporaryDirectory() as dirname:
            repo, source, videos, posters, _, _ = fixture(Path(dirname))
            original = {str(x): P.digest(x) for x in list(videos.glob("*.mp4")) +
                        list(posters.glob("*.webp"))}
            result = P.plan(repo, source, verify=True)
            self.assertEqual(result["catalog_items"], 2)
            self.assertEqual(result["files"], 4)
            self.assertEqual(result["status"], "LOCAL_ONLY_NO_NETWORK_NO_UPLOAD")
            self.assertTrue(result["verified_files"])
            self.assertEqual({x["bucket"] for x in result["items"]},
                             {"exercise-media", "exercise-posters"})
            self.assertEqual({(x["catalog_id"], x["media_type"]) for x in result["items"]},
                             {(f"TK-{i:06d}", t) for i in (1, 2) for t in ("video", "poster")})
            self.assertEqual(original, {x: P.digest(x) for x in original})
            self.assertFalse((source / ".tk-private-review/TK504-MOVEKIT-V2-UPLOAD-PLAN.json").exists())

    def test_private_write_is_idempotent(self):
        with tempfile.TemporaryDirectory() as dirname:
            repo, source, *_ = fixture(Path(dirname))
            result = P.plan(repo, source, verify=True)
            a = P.store_private(source, result)
            b = P.store_private(source, result)
            self.assertEqual(a, b)
            self.assertTrue(a.is_file())
            self.assertEqual(json.loads(a.read_text(encoding="utf8"))["files"], 4)
            self.assertNotIn(str(repo), str(a))

    def test_unverified_write_is_rejected(self):
        with tempfile.TemporaryDirectory() as dirname:
            repo, source, *_ = fixture(Path(dirname))
            result = P.plan(repo, source, verify=False)
            with self.assertRaisesRegex(ValueError, "MUST_VERIFY_BEFORE_WRITING"):
                P.store_private(source, result)

    def test_corrupt_source_video_is_rejected(self):
        with tempfile.TemporaryDirectory() as dirname:
            repo, source, videos, *_ = fixture(Path(dirname))
            src = videos / "synthetic-0.mp4"
            src.write_bytes(src.read_bytes().replace(b"fake", b"FAKE"))
            with self.assertRaisesRegex(ValueError, "VIDEO_SOURCE_SHA_CHANGED"):
                P.plan(repo, source, verify=True)

    def test_corrupt_optimized_poster_is_rejected(self):
        with tempfile.TemporaryDirectory() as dirname:
            repo, source, videos, posters, *_ = fixture(Path(dirname))
            src = posters / "synthetic-0.webp"
            src.write_bytes(src.read_bytes().replace(b"fake", b"FAKE"))
            with self.assertRaisesRegex(ValueError, "WEBP_SOURCE_SHA_CHANGED"):
                P.plan(repo, source, verify=True)

    def test_poster_catalog_collision_blocks(self):
        with tempfile.TemporaryDirectory() as dirname:
            repo, source, videos, posters, inv_path, post_path = fixture(Path(dirname))
            post = json.loads(post_path.read_text())
            post["items"][1]["catalog_id"] = post["items"][0]["catalog_id"]
            post_path.write_text(json.dumps(post))
            with self.assertRaisesRegex(ValueError, "DUPLICATE_POSTER_ID"):
                P.plan(repo, source)

    def test_path_traversal_storage_is_blocked(self):
        with tempfile.TemporaryDirectory() as dirname:
            repo, source, videos, posters, inv_path, post_path = fixture(Path(dirname))
            inv = json.loads(inv_path.read_text())
            inv["items"][0]["video"]["path"] = "../../private/evil.mp4"
            inv_path.write_text(json.dumps(inv))
            with self.assertRaisesRegex(ValueError, "INVALID_VIDEO_DESCRIPTOR"):
                P.plan(repo, source)

    def test_extra_mp4_is_blocked(self):
        with tempfile.TemporaryDirectory() as dirname:
            repo, source, videos, *_ = fixture(Path(dirname))
            (videos / "not-in-golden.mp4").write_bytes(b"fake")
            with self.assertRaisesRegex(ValueError, "UNEXPECTED_VIDEO_FILES"):
                P.plan(repo, source)

    def test_empty_catalog_is_blocked(self):
        with tempfile.TemporaryDirectory() as dirname:
            repo, source, videos, posters, inv_path, post_path = fixture(Path(dirname))
            inv = json.loads(inv_path.read_text())
            inv["items"] = []
            inv_path.write_text(json.dumps(inv))
            with self.assertRaisesRegex(ValueError, "SOURCE_INVENTORY_INVALID"):
                P.plan(repo, source)

    def test_private_plan_conflict_is_blocked(self):
        with tempfile.TemporaryDirectory() as dirname:
            repo, source, *_ = fixture(Path(dirname))
            result = P.plan(repo, source)
            path = P.store_private(source, result)
            path.write_text('{"tampered":true}', encoding="utf8")
            with self.assertRaisesRegex(ValueError, "EXISTING_UPLOAD_PLAN_DIFFERS"):
                P.store_private(source, result)

    def test_public_repo_sources_are_blocked(self):
        with tempfile.TemporaryDirectory() as dirname:
            root = Path(dirname)
            repo = root / "repo"
            repo.mkdir()
            with self.assertRaisesRegex(ValueError, "SOURCE_IS_PUBLIC_REPOSITORY"):
                P.paths(repo, repo / "private-videos")


if __name__ == "__main__":
    unittest.main(verbosity=2)
