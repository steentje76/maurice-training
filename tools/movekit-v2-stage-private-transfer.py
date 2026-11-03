#!/usr/bin/env python3
r"""TK #504: stage verified PRIVATE licensed media for bulk CLI upload.

Hardlinks are created only under C:\Movikit\.tk-private-review. This tool
makes NO network requests, writes NO user accounts and NEVER stages assets
inside the public repo. Paths and hashes MUST match private preflight plan.
"""
import argparse
import hashlib
import json
import os
import re
from pathlib import Path

CID = re.compile(r"^TK-\d{6}$")
SHA = re.compile(r"^[0-9a-f]{64}$")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def sha256_file(file_path):
    digest = hashlib.sha256()
    with file_path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run(manifest_path, stage_root, skip):
    manifest_path = Path(manifest_path).resolve(strict=True)
    root = manifest_path.parent.parent.resolve(strict=True)
    stage_root = Path(stage_root).resolve()
    if manifest_path.name != "TK504-MOVEKIT-V2-UPLOAD-PLAN.json":
        raise RuntimeError("INVALID_PRIVATE_PLAN_FILENAME")
    if manifest_path.parent.name != ".tk-private-review":
        raise RuntimeError("PLAN_NOT_IN_PRIVATE_REVIEW")
    if stage_root.parent != manifest_path.parent or root not in stage_root.parents:
        raise RuntimeError("INVALID_PRIVATE_STAGE_ROOT")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if (manifest.get("schema") != "trainingskompas-movekit-v2-private-upload-plan/1.0"
            or manifest.get("status") != "LOCAL_ONLY_NO_NETWORK_NO_UPLOAD"
            or manifest.get("verified_files") is not True
            or manifest.get("files") != 1164
            or manifest.get("catalog_items") != 582
            or len(manifest.get("items", [])) != 1164):
        raise RuntimeError("UNVERIFIED_PRIVATE_MANIFEST")
    expected = {"poster": set(), "video": set()}
    staged = {"poster": 0, "video": 0}
    totals = {"poster": 0, "video": 0}
    seen = set()
    for item in manifest["items"]:
        cid = item["catalog_id"]
        media_type = item["media_type"]
        key = f"{cid}:{media_type}"
        if media_type not in expected or not CID.fullmatch(cid) or key in seen:
            raise RuntimeError("DUPLICATE_OR_INVALID_CATALOG_ID")
        seen.add(key)
        slug = Path(item["storage_path"]).stem
        if not SLUG.fullmatch(slug):
            raise RuntimeError("UNSAFE_SLUG")
        if media_type == "video":
            suffix, folder, bucket, mime = ".mp4", "video", "exercise-media", "video/mp4"
        else:
            suffix, folder, bucket, mime = ".webp", "poster-optimized", "exercise-posters", "image/webp"
        if (item["version"] != "v2" or item["bucket"] != bucket
            or item["content_type"] != mime or
            item["storage_path"] != f"movekit/v2/{folder}/{slug}{suffix}"):
            raise RuntimeError("MEDIA_DESCRIPTOR_INVALID")
        if not SHA.fullmatch(item["sha256"]):
            raise RuntimeError("SOURCE_DIGEST_INVALID")
        src = Path(item["local_source"]).resolve(strict=True)
        if root not in src.parents or src.suffix.lower() != suffix:
            raise RuntimeError("SOURCE_OUTSIDE_LICENSED_PRIVATE_ROOT")
        if src.name != slug + suffix:
            raise RuntimeError("SOURCE_BASENAME_MISMATCH")
        if src.stat().st_size != item["bytes"] or sha256_file(src) != item["sha256"]:
            raise RuntimeError("SOURCE_HASH_OR_SIZE_MISMATCH")
        if key in skip:
            continue
        target_dir = stage_root / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        destination = target_dir / src.name
        if destination.exists():
            if not os.path.samefile(src, destination):
                raise RuntimeError("STAGING_PATH_COLLISION")
        else:
            os.link(src, destination)
        if destination.stat().st_size != item["bytes"]:
            raise RuntimeError("STAGED_SIZE_MISMATCH")
        expected[media_type].add(src.name)
        staged[media_type] += 1
        totals[media_type] += item["bytes"]
    if len(seen) != 1164 or len(skip & seen) != len(skip):
        raise RuntimeError("MISSING_OR_INCORRECT_SKIPPED_PILOTS")
    for media_type, basename in (("poster", "poster-optimized"), ("video", "video")):
        directory = stage_root / basename
        actual = {f.name for f in directory.iterdir() if f.is_file()} if directory.exists() else set()
        if actual != expected[media_type]:
            raise RuntimeError("UNEXPECTED_STAGED_SOURCE_FILE")
        if directory.exists() and len(list(directory.iterdir())) != len(actual):
            raise RuntimeError("NONFILE_ENTRY_IN_TRANSFER_DIRECTORY")
    return {"status": "PRIVATE_HARDLINK_STAGING_ONLY_NO_NETWORK", "pending_files": sum(staged.values()),
            "poster_files": staged["poster"], "video_files": staged["video"],
            "poster_bytes": totals["poster"], "video_bytes": totals["video"],
            "skip_count": len(skip), "stage_root": str(stage_root)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--stage-root", required=True)
    parser.add_argument("--skip", action="append", default=[])
    args = parser.parse_args()
    result = run(args.manifest, args.stage_root, set(args.skip))
    print(json.dumps(result, indent=2))
