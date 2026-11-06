#!/usr/bin/env python3
"""Prepare missing PRIVATE MoveKit V2 posters from a CLI Storage listing.

Fail closed on malformed/extra paths, duplicates, missing inventory IDs,
or mismatched expected remote count. No storage writes and no network calls.
Only hardlinks inside the owner's private local media directory are made.
"""
import argparse
import importlib.util
import json
import re
from pathlib import Path

MODULE = Path(__file__).with_name("movekit-v2-stage-private-transfer.py")
spec = importlib.util.spec_from_file_location("tk504_stage_private", MODULE)
stage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stage)
REMOTE = re.compile(r"^/exercise-posters/(movekit/v2/poster-optimized/[a-z0-9]+(?:-[a-z0-9]+)*\.webp)$")


def build(manifest_path, remote_list_path, stage_root, expected_present):
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    poster_by_path = {}
    video_ids = set()
    for row in manifest["items"]:
        if row["media_type"] == "poster":
            path = row["storage_path"]
            if path in poster_by_path:
                raise RuntimeError("DUPLICATE_MANIFEST_POSTER")
            poster_by_path[path] = row["catalog_id"]
        elif row["media_type"] == "video":
            video_ids.add(row["catalog_id"])
        else:
            raise RuntimeError("INVALID_MEDIA_TYPE")
    if len(poster_by_path) != 582 or len(video_ids) != 582:
        raise RuntimeError("INVALID_GOLDEN_SOURCE_COUNT")
    remote = set()
    for row in Path(remote_list_path).read_text(encoding="utf-8-sig").splitlines():
        line = row.strip()
        match = REMOTE.fullmatch(line)
        if match:
            path = match.group(1)
            if path in remote:
                raise RuntimeError("DUPLICATE_REMOTE_OBJECT")
            if path not in poster_by_path:
                raise RuntimeError("UNKNOWN_REMOTE_OBJECT")
            remote.add(path)
        elif line.startswith("/exercise-posters/") or "ERROR" in line.upper():
            raise RuntimeError("UNEXPECTED_REMOTE_LISTING_LINE")
    if len(remote) != expected_present:
        raise RuntimeError(f"REMOTE_COUNT_MISMATCH: listed {len(remote)}, expected {expected_present}")
    skips = {f"{cid}:video" for cid in video_ids}
    skips.update(f"{poster_by_path[path]}:poster" for path in remote)
    result = stage.run(manifest_path, stage_root, skips)
    if result["poster_files"] + len(remote) != 582 or result["video_files"] != 0:
        raise RuntimeError("RETRY_STAGING_COUNT_MISMATCH")
    return {"remote_posters_already_present": len(remote), **result}


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True)
    p.add_argument("--remote-list", required=True)
    p.add_argument("--stage-root", required=True)
    p.add_argument("--expected-present", type=int, required=True)
    a = p.parse_args()
    print(json.dumps(build(a.manifest, a.remote_list, a.stage_root, a.expected_present), indent=2))
