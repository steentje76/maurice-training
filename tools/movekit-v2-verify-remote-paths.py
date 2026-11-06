#!/usr/bin/env python3
"""Compare all Supabase Storage listings with TK504 Golden V2 media paths.

No network, credential, media, upload or database access in this script.
Lists were obtained with the authenticated Supabase storage ls command.
"""
import argparse
import hashlib
import json
from pathlib import Path

EXPECTED_COUNTS = {"video": 582, "poster": 582}
EXPECTED_BYTES = {"video": 2047785201, "poster": 9634714}
BUCKETS = {"video": "exercise-media", "poster": "exercise-posters"}


def compare(manifest_path, video_list, poster_list):
    private = Path(manifest_path).resolve(strict=True)
    if private.name != "TK504-MOVEKIT-V2-UPLOAD-PLAN.json" or private.parent.name != ".tk-private-review":
        raise ValueError("PRIVATE_MANIFEST_REQUIRED")
    raw = private.read_bytes()
    manifest = json.loads(raw)
    if manifest.get("status") != "LOCAL_ONLY_NO_NETWORK_NO_UPLOAD" or not manifest.get("verified_files"):
        raise ValueError("SOURCE_HASH_PRECHECK_MISSING")
    expected = {"video": set(), "poster": set()}
    byte_totals = {"video": 0, "poster": 0}
    ids = {"video": set(), "poster": set()}
    for media in manifest["items"]:
        kind = media["media_type"]
        if kind not in expected or media["bucket"] != BUCKETS[kind] or media["version"] != "v2":
            raise ValueError("WRONG_MEDIA_BUCKET_OR_TYPE")
        if media["catalog_id"] in ids[kind]:
            raise ValueError("DUPLICATE_CATALOG_ID")
        ids[kind].add(media["catalog_id"])
        key = "/" + media["bucket"] + "/" + media["storage_path"]
        if key in expected[kind]:
            raise ValueError("DUPLICATE_STORAGE_KEY")
        if kind == "video":
            correct = key.startswith("/exercise-media/movekit/v2/video/") and key.endswith(".mp4")
        else:
            correct = key.startswith("/exercise-posters/movekit/v2/poster-optimized/") and key.endswith(".webp")
        if not correct or not isinstance(media["bytes"], int) or media["bytes"] <= 0:
            raise ValueError("INVALID_EXPECTED_MEDIA_PATH")
        expected[kind].add(key)
        byte_totals[kind] += media["bytes"]
    for kind in EXPECTED_COUNTS:
        if len(expected[kind]) != EXPECTED_COUNTS[kind] or byte_totals[kind] != EXPECTED_BYTES[kind]:
            raise ValueError("GOLDEN_INVENTORY_TOTAL_CHANGED")
    for kind, listing in (("video", video_list), ("poster", poster_list)):
        rows = Path(listing).read_text(encoding="utf-8-sig").splitlines()
        if len(rows) != len(set(rows)):
            raise ValueError(kind + "_DUPLICATE_REMOTE_LISTING")
        actual = set(rows)
        if expected[kind] != actual:
            missing = expected[kind] - actual
            extra = actual - expected[kind]
            raise ValueError(f"{kind}_REMOTE_PATH_MISMATCH missing={len(missing)} unexpected={len(extra)}")
    return {
        "status": "EXACT_REMOTE_PATH_SET_MATCH",
        "verified_manifest_sha256": hashlib.sha256(raw).hexdigest(),
        "video_paths": len(expected["video"]), "poster_paths": len(expected["poster"]),
        "video_bytes_expected": byte_totals["video"],
        "poster_bytes_expected": byte_totals["poster"],
        "limitation": "Listings prove path names; compare remote byte totals separately via Supabase SQL and sample files by re-download."
    }


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True)
    p.add_argument("--video-list", required=True)
    p.add_argument("--poster-list", required=True)
    args = p.parse_args()
    print(json.dumps(compare(args.manifest, args.video_list, args.poster_list), indent=2))
