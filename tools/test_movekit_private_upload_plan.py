#!/usr/bin/env python3
"""Offline-only synthetic contract tests for MoveKit private migration."""
import hashlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from urllib import error

sys.dont_write_bytecode = True
TOOL = Path(__file__).with_name("movekit-private-upload-plan.py")
SPEC = importlib.util.spec_from_file_location("tk504_media_upload_preflight", TOOL)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)


def short_sha(data):
    return hashlib.sha256(data).hexdigest()


def fixture(root):
    repo = root / "repo"
    source = root / "source"
    (repo / "docs/generated").mkdir(parents=True)
    video = source / "complete-exercise-library-golden-release-synthetic"
    video.mkdir(parents=True)
    image = source / ".tk-private-review/posters-webp-v2"
    image.mkdir(parents=True)
    entries, registry = [], []
    for num in range(1, 583):
        slug = f"synthetic-{num:04d}"
        cid = f"TK-{num:06d}"
        vid = (slug + "video").encode("ascii")
        poster = (slug + "poster").encode("ascii")
        (video / (slug + ".mp4")).write_bytes(vid)
        (image / (slug + ".webp")).write_bytes(poster)
        entries.append({
            "catalog_id": cid,
            "provider_id": slug,
            "video": {"path": "movekit/v2/video/" + slug + ".mp4",
                      "sha256": short_sha(vid), "bytes": len(vid)},
        })
        registry.append({
            "catalog_id": cid, "provider_id": slug,
            "private_storage_path": "movekit/v2/poster-optimized/" + slug + ".webp",
            "sha256": short_sha(poster), "bytes": len(poster)
        })
    inventory = {
        "schema": "trainingskompas-movekit-golden-inventory/2.0",
        "status": "STAGING_ONLY_DO_NOT_ACTIVATE",
        "items": entries
    }
    poster_json = {
        "schema": "trainingskompas-movekit-private-poster-registry/1.0",
        "status": "LOCAL_ONLY_NO_UPLOAD_NO_RELEASE",
        "count": 582, "items": registry
    }
    inv_file = repo / "docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json"
    inv_file.write_text(json.dumps(inventory), encoding="utf8")
    reg_file = image / "catalog-poster-registry.json"
    reg_file.write_text(json.dumps(poster_json), encoding="utf8")
    return repo, source, video, image, inv_file, reg_file


def fake_item(folder, number=1, kind="video"):
    slug = f"synthetic-{number:04d}"
    ext = "mp4" if kind == "video" else "webp"
    payload = b"TEST-ONLY-NO-LICENSED-BYTES"
    file = folder / (slug + "." + ext)
    file.write_bytes(payload)
    return {
        "catalog_id": f"TK-{number:06d}", "source": slug, "kind": kind,
        "bucket": M.BUCKETS[kind],
        "storage_path": ("movekit/v2/video/" if kind == "video"
                         else "movekit/v2/poster-optimized/") + slug + "." + ext,
        "mime": M.MIMES[kind], "sha256": short_sha(payload),
        "bytes": len(payload), "_local_file": file
    }


class FakeStore:
    def __init__(self, initially=None):
        self.current = {} if initially is None else dict(initially)
        self.uploads = 0
        self.checked = []
    def check_private_bucket(self, bucket, mime):
        self.checked.append((bucket, mime))
        return True
    def remote_digest(self, item):
        return self.current.get(item["storage_path"])
    def upload_new(self, item):
        self.uploads += 1
        self.current[item["storage_path"]] = (item["bytes"], item["sha256"])


class SyntheticPlanTests(unittest.TestCase):
    def test_complete_582_video_582_poster_plan(self):
        with tempfile.TemporaryDirectory() as t:
            repo, source, *_ = fixture(Path(t))
            plan = M.prepare(repo, source)
            summary = M.safe_report(plan)
            self.assertEqual(len(plan), 1164)
            self.assertEqual(summary["catalog_id_count"], 582)
            self.assertEqual(summary["video_count"], 582)
            self.assertEqual(summary["poster_count"], 582)
            self.assertFalse(summary["public_media_release"])
            self.assertTrue(all("_local_file" not in e for e in summary["entries"]))
            self.assertEqual(len({(x["bucket"],x["storage_path"]) for x in plan}),1164)

    def test_unchanged_source_enforced_by_sha(self):
        with tempfile.TemporaryDirectory() as t:
            repo, source, video, *_ = fixture(Path(t))
            (video/"synthetic-0001.mp4").write_bytes(b"different_data")
            with self.assertRaisesRegex(ValueError, "MISSING_OR_CHANGED_SOURCE_MEDIA"):
                M.prepare(repo, source)

    def test_same_byte_length_source_modification_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            repo, source, video, *_ = fixture(Path(t))
            path = video/"synthetic-0001.mp4"
            path.write_bytes(b"X"*path.stat().st_size)
            with self.assertRaisesRegex(ValueError, "SOURCE_MEDIA_HASH_MISMATCH"):
                M.prepare(repo, source)

    def test_poster_catalog_binding_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            repo, source, video, image, inv, registry = fixture(Path(t))
            data = json.loads(registry.read_text())
            data["items"][0]["provider_id"] = "other-slug"
            registry.write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError, "POSTER_CATALOG_ID_MISMATCH"):
                M.prepare(repo, source)

    def test_missing_poster_registry_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            repo, source, video, image, inv, registry = fixture(Path(t))
            registry.unlink()
            with self.assertRaises(FileNotFoundError):
                M.prepare(repo, source)

    def test_no_output_to_public_repo(self):
        with tempfile.TemporaryDirectory() as t:
            repo, source, *_ = fixture(Path(t))
            with self.assertRaisesRegex(ValueError, "PLAN_MUST_STAY_PRIVATE"):
                M.allow_plan_path(repo/"public-plan.json", source, repo)
            with self.assertRaisesRegex(ValueError, "PLAN_MUST_STAY_PRIVATE"):
                M.allow_plan_path(source/"unsafe-plan.json", source, repo)
            expected = source/".tk-private-review"/"private-plan.json"
            self.assertEqual(M.allow_plan_path(expected,source,repo),expected)
            expected.write_text("already there")
            with self.assertRaisesRegex(ValueError, "PLAN_ALREADY_EXISTS"):
                M.allow_plan_path(expected,source,repo)

    def test_source_inside_repo_rejected(self):
        with tempfile.TemporaryDirectory() as t:
            root = Path(t)
            with self.assertRaisesRegex(ValueError, "SOURCE_WITHIN_REPO"):
                M.prepare(root,root/"supplier")

    def test_idempotent_upload_and_existing_verified_skip(self):
        with tempfile.TemporaryDirectory() as t:
            row=fake_item(Path(t))
            storage=FakeStore()
            result=M.execute([row],storage,"video",1,1024)
            self.assertEqual(result["new_uploaded"],1)
            self.assertEqual(result["remote_verified"],1)
            self.assertEqual(storage.uploads,1)
            result=M.execute([row],storage,"video",1,1024)
            self.assertEqual(result["already_verified"],1)
            self.assertEqual(storage.uploads,1)

    def test_remote_mismatch_does_not_overwrite(self):
        with tempfile.TemporaryDirectory() as t:
            row=fake_item(Path(t))
            storage=FakeStore({row["storage_path"]:(row["bytes"],"1"*64)})
            with self.assertRaisesRegex(ValueError,"EXISTING_REMOTE_MEDIA_INTEGRITY_MISMATCH"):
                M.execute([row],storage,"video",1,1024)
            self.assertEqual(storage.uploads,0)

    def test_checksum_recheck_before_upload(self):
        with tempfile.TemporaryDirectory() as t:
            row=fake_item(Path(t))
            row["_local_file"].write_bytes(b"totally different")
            storage=M.StorageTransport("synthetic-secret-key-very-long",opener=lambda *a,**k:None)
            with self.assertRaisesRegex(ValueError,"SOURCE_CHANGED_BEFORE_UPLOAD"):
                storage.upload_new(row)

    def test_bytes_budget_and_max_objects_fail_closed(self):
        with tempfile.TemporaryDirectory() as t:
            row=fake_item(Path(t))
            storage=FakeStore()
            r=M.execute([row],storage,"video",1,row["bytes"]*2-1)
            self.assertEqual(r["remote_verified"],0)
            self.assertEqual(storage.uploads,0)
            with self.assertRaisesRegex(ValueError,"UNSAFE_UPLOAD_BUDGET"):
                M.execute([row],storage,"video",21,1024)

    def test_no_path_traversal_or_bucket_switch(self):
        with tempfile.TemporaryDirectory() as t:
            row=fake_item(Path(t))
            self.assertEqual(M.StorageTransport._path(row),
                             "exercise-media/movekit/v2/video/synthetic-0001.mp4")
            row["storage_path"]="../../private/secrets"
            with self.assertRaisesRegex(ValueError,"UNTRUSTED_UPLOAD_PATH"):
                M.StorageTransport._path(row)
            row["storage_path"]="movekit/v2/video/synthetic-0001.mp4"
            row["bucket"]="avatars"
            with self.assertRaisesRegex(ValueError,"UNTRUSTED_UPLOAD_PATH"):
                M.StorageTransport._path(row)

    def test_http_redirect_rejected_before_data_can_leave(self):
        transport=M.StorageTransport("synthetic-secret-key-very-long")
        self.assertIsNone(M.RefuseRedirect().redirect_request(None,None,302,
                "redirect",{}, "https://attacker.example/steal-token"))
        # The key-bearing request is NOT forwarded by the opener.
        self.assertIsNotNone(transport.opener)

    def test_bucket_privacy_and_mime(self):
        def fake_meta(data):
            def opener(req, timeout):
                return io.BytesIO(json.dumps(data).encode("utf8"))
            return opener
        transport=M.StorageTransport("synthetic-secret-key-very-long",
                     opener=fake_meta({"id":"exercise-media","public":False,
                                      "allowed_mime_types":["video/mp4"]}))
        self.assertTrue(transport.check_private_bucket("exercise-media","video/mp4"))
        bad=M.StorageTransport("synthetic-secret-key-very-long",
              opener=fake_meta({"id":"exercise-media","public":True,
                                "allowed_mime_types":["video/mp4"]}))
        with self.assertRaisesRegex(ValueError,"BUCKET_NOT_PRIVATE"):
            bad.check_private_bucket("exercise-media","video/mp4")
        wrong=M.StorageTransport("synthetic-secret-key-very-long",
              opener=fake_meta({"id":"exercise-media","public":False,
                                "allowed_mime_types":["image/webp"]}))
        with self.assertRaisesRegex(ValueError,"BUCKET_MIME_NOT_ALLOWED"):
            wrong.check_private_bucket("exercise-media","video/mp4")

    def test_remote_download_and_sha(self):
        payload=b"synthetic-test-only"
        def opener(req,timeout):
            self.assertEqual(req.full_url,
                  M.BASE+"/storage/v1/object/authenticated/exercise-media/movekit/v2/video/synthetic-0001.mp4")
            self.assertIn("Authorization",req.headers)
            return io.BytesIO(payload)
        store=M.StorageTransport("synthetic-secret-key-very-long",opener=opener)
        with tempfile.TemporaryDirectory() as t:
            row=fake_item(Path(t))
            row["bytes"]=len(payload)
            self.assertEqual(store.remote_digest(row),(len(payload),short_sha(payload)))


if __name__=="__main__":
    unittest.main(verbosity=2)
