#!/usr/bin/env python3
"""TK504 read-only release evidence: Golden V2 local SHA256 vs Supabase eTag metadata.

NO Supabase credentials, media bytes, paths or provider source data are written
to stdout / Git. ETags are checked as MD5 transfer fingerprints; only a server
byte download could establish SHA256 of the *stored* object. Staging is NOT an
authorization or a content publication decision.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path


def file_digests(path):
    md5 = hashlib.md5()
    sha = hashlib.sha256()
    count = 0
    with path.open("rb") as stream:
        while block := stream.read(4 * 1024 * 1024):
            md5.update(block)
            sha.update(block)
            count += len(block)
    return count, md5.hexdigest(), sha.hexdigest()


def verify(rows, folder, asset_name, prefix, source_ids=None, expected_count=582):
    assert len(rows) == expected_count, f"{asset_name}: invalid inventory count"
    assert folder.is_dir(), f"{asset_name}: source folder unavailable"
    expected_names = set()
    etag_lines = []
    problems = []
    total_bytes = 0
    for row in rows:
        provider_id = row["provider_id"]
        catalog_id = row["catalog_id"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", provider_id) or not re.fullmatch(r"TK-\d{6}", catalog_id):
            problems.append("malformed canonical/provider identity")
            continue
        details = row[asset_name] if asset_name == "video" else row
        ext = "mp4" if asset_name == "video" else "webp"
        filename = provider_id + "." + ext
        expected_path = prefix + filename
        expected_names.add(filename)
        if details["path"] != expected_path or details["bytes"] <= 0:
            problems.append(catalog_id + ": invalid inventory path/size")
            continue
        if source_ids is not None and source_ids.get(catalog_id) != provider_id:
            problems.append(catalog_id + ": vendor identity mismatch")
            continue
        path = folder / filename
        if not path.is_file() or path.is_symlink():
            problems.append(catalog_id + ": source missing or symlink")
            continue
        size, md5, sha256 = file_digests(path)
        total_bytes += size
        if size != details["bytes"] or sha256 != details["sha256"]:
            problems.append(catalog_id + ": SHA256 or byte-count mismatch")
        etag_lines.append((details["path"], str(size), md5))
    if len(expected_names) != expected_count:
        problems.append("duplicate source filenames")
    # LICENSE.txt and manifest.json are sidecars, not licensed media objects.
    actual_names = {p.name for p in folder.iterdir() if p.is_file() and p.suffix.lower() == '.' + ext}
    if actual_names != expected_names:
        problems.append(f"source set differs: missing={len(expected_names-actual_names)} unexpected={len(actual_names-expected_names)}")
    etag_lines.sort(key=lambda r: r[0])
    md5_manifest = hashlib.md5("\n".join("|".join(r) for r in etag_lines).encode("utf-8")).hexdigest()
    return {"asset": asset_name, "expected": expected_count, "checked": len(etag_lines),
            "total_bytes": total_bytes, "etag_manifest_md5": md5_manifest,
            "problems": problems[:20], "problem_count": len(problems)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--videos-dir", required=True, type=Path)
    parser.add_argument("--posters-dir", required=True, type=Path)
    parser.add_argument("--inventory", required=True, type=Path)
    parser.add_argument("--poster-inventory", required=True, type=Path)
    parser.add_argument("--remote-video-digest", required=True)
    parser.add_argument("--remote-poster-digest", required=True)
    args = parser.parse_args()
    golden = json.loads(args.inventory.read_text(encoding="utf-8"))
    posters = json.loads(args.poster_inventory.read_text(encoding="utf-8"))
    assert golden["status"] == "STAGING_ONLY_DO_NOT_ACTIVATE"
    assert posters["status"] == "STAGING_INDEX_NOT_RELEASE_APPROVAL"
    src = {r["catalog_id"]: r["provider_id"] for r in golden["items"]}
    assert len(src) == 582, "duplicate catalog ID"
    video = verify(golden["items"], args.videos_dir, "video",
                   "movekit/v2/video/")
    poster = verify(posters["items"], args.posters_dir, "poster",
                    "movekit/v2/poster-optimized/", source_ids=src)
    for result, observed in ((video, args.remote_video_digest), (poster, args.remote_poster_digest)):
        result["remote_etag_manifest_match"] = (
            result["etag_manifest_md5"].lower() == observed.lower()
        )
        # Don't emit a detailed per-asset list; only canonical IDs and aggregate data.
        result["local_sha256_verified"] = (
            result["problem_count"] == 0 and result["checked"] == 582
        )
        result["passed"] = result["local_sha256_verified"] and result["remote_etag_manifest_match"]
        print(json.dumps(result, separators=(",", ":"), ensure_ascii=True))
    success = video["passed"] and poster["passed"]
    print("TK504 582 VIDEO + 582 POSTER SOURCE SHA256 / REMOTE eTAG MANIFEST: "
          + ("PASS" if success else "BLOCKED"))
    print("CAVEAT: Matching Supabase eTag metadata is NOT a remote object SHA256 proof.")
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())
