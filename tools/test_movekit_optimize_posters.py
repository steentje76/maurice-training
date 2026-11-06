#!/usr/bin/env python3
"""Only synthetic PNG headers and manifests; no licensed content in tests."""
import importlib.util
import json
import struct
import sys
sys.dont_write_bytecode = True
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("movekit-optimize-posters.py")
SPEC = importlib.util.spec_from_file_location("tk504_poster_optimize", SCRIPT)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


def make_fixture(root):
    repo = root / "repo"
    source = root / "supplier"
    (repo / "docs/generated").mkdir(parents=True)
    poster_dir = source / "complete-exercise-library-posters-golden-release-synthetic" / "posters"
    poster_dir.mkdir(parents=True)
    header = b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + b"IHDR" + struct.pack(">IIBBBBB", 2752, 1536, 8, 2, 0, 0, 0)
    items = []
    for i in range(582):
        slug = f"synthetic-{i:04d}"
        (poster_dir / (slug + ".png")).write_bytes(header)
        items.append({
            "provider_id": slug,
            "poster": {"path": f"movekit/v2/poster/{slug}.png", "bytes": len(header),
                       "sha256": MOD.sha256(poster_dir / (slug + ".png"))},
        })
    inv_file = repo / "docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json"
    inv_file.write_text(json.dumps({
        "schema": MOD.SCHEMA,
        "status": "STAGING_ONLY_DO_NOT_ACTIVATE",
        "items": items,
    }), encoding="utf8")
    return repo, source, poster_dir, inv_file


class PosterPreflightTests(unittest.TestCase):
    def test_582_synthetic_files_no_outputs(self):
        with tempfile.TemporaryDirectory() as d:
            repo, source, poster_dir, _ = make_fixture(Path(d))
            rows, target = MOD.preflight(repo, source, "all")
            self.assertEqual(len(rows), 582)
            self.assertTrue(str(target).endswith("posters-webp-v2"))
            self.assertFalse(target.exists())
            self.assertTrue(all(r[3:5] == (2752, 1536) for r in rows))

    def test_unknown_extra_poster_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            repo, source, poster_dir, _ = make_fixture(Path(d))
            (poster_dir / "extra.png").write_bytes((poster_dir / "synthetic-0000.png").read_bytes())
            with self.assertRaisesRegex(ValueError, "UNEXPECTED_POSTER_FILES"):
                MOD.preflight(repo, source, "all")

    def test_source_size_mismatch_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            repo, source, poster_dir, _ = make_fixture(Path(d))
            (poster_dir / "synthetic-0000.png").write_bytes(b"changed")
            with self.assertRaisesRegex(ValueError, "SOURCE_POSTER_SIZE_OR_PATH_MISMATCH"):
                MOD.preflight(repo, source, "all")

    def test_source_image_header_corruption_is_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            repo, source, poster_dir, _ = make_fixture(Path(d))
            p = poster_dir / "synthetic-0000.png"
            p.write_bytes(b"bad_png" + p.read_bytes()[7:])
            with self.assertRaisesRegex(ValueError, "INVALID_PNG_HEADER"):
                MOD.preflight(repo, source, "all")

    def test_bad_storage_path_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            repo, source, _, inv_file = make_fixture(Path(d))
            inv = json.loads(inv_file.read_text())
            inv["items"][0]["poster"]["path"] = "../../outside.png"
            inv_file.write_text(json.dumps(inv))
            with self.assertRaisesRegex(ValueError, "INVALID_POSTER_DESCRIPTOR"):
                MOD.preflight(repo, source, "all")

    def test_source_must_not_be_in_public_repo(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            repo = root / "repo"
            repo.mkdir()
            with self.assertRaisesRegex(ValueError, "SOURCE_INSIDE_PUBLIC_REPO"):
                MOD.preflight(repo, repo / "private-assets", "all")

    def test_distinct_smoke_and_full_destinations(self):
        with tempfile.TemporaryDirectory() as d:
            repo, source, _, _ = make_fixture(Path(d))
            _, smoke = MOD.preflight(repo, source, "smoke")
            _, full = MOD.preflight(repo, source, "all")
            self.assertNotEqual(smoke, full)
            self.assertEqual(smoke.parent, full.parent)


if __name__ == "__main__":
    unittest.main(verbosity=2)
