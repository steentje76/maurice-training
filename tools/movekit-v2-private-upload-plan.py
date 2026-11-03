#!/usr/bin/env python3
"""MoveKit V2 private transfer plan, NO NETWORK OR UPLOAD.

Checks the supplier Golden V2 videos and the locally verified 582 WebP posters.
Output is forced under the original source-owned private review directory,
never the public GitHub checkout or bundled app assets.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

COUNT = 582
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
ID = re.compile(r"TK-\d{6}\Z")
SHA = re.compile(r"[0-9a-f]{64}\Z")


def need(ok, message):
    if not ok:
        raise ValueError(message)


def digest(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def paths(repo, source):
    root = Path(repo).resolve()
    source = Path(source).resolve()
    need(root != source and root not in source.parents, "SOURCE_IS_PUBLIC_REPOSITORY")
    vdirs = sorted(x for x in source.iterdir() if x.is_dir() and
                   x.name.startswith("complete-exercise-library-golden-release-"))
    need(len(vdirs) == 1, "INVALID_VIDEO_SOURCE_DIRECTORY")
    return (root, source, vdirs[0],
            source / ".tk-private-review" / "posters-webp-v2")


def plan(repo, source, verify=True):
    repo, source, video_dir, poster_dir = paths(repo, source)
    inv_path = repo / "docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json"
    manifest_path = poster_dir / "catalog-poster-registry.json"
    inv = json.loads(inv_path.read_text(encoding="utf8"))
    posters = json.loads(manifest_path.read_text(encoding="utf8"))
    need(inv.get("schema") == "trainingskompas-movekit-golden-inventory/2.0" and
         inv.get("status") == "STAGING_ONLY_DO_NOT_ACTIVATE" and
         len(inv.get("items", [])) == COUNT, "SOURCE_INVENTORY_INVALID")
    need(posters.get("schema") == "trainingskompas-movekit-private-poster-registry/1.0"
         and posters.get("status") == "LOCAL_ONLY_NO_UPLOAD_NO_RELEASE"
         and posters.get("count") == COUNT
         and len(posters.get("items", [])) == COUNT, "PRIVATE_POSTER_REGISTRY_INVALID")
    by_id = {}
    by_slug = {}
    for entry in posters["items"]:
        catalog_id, slug = entry.get("catalog_id"), entry.get("provider_id")
        need(isinstance(catalog_id, str) and ID.fullmatch(catalog_id) and
             isinstance(slug, str) and SLUG.fullmatch(slug) and
             catalog_id not in by_id and slug not in by_slug, "DUPLICATE_POSTER_ID")
        by_id[catalog_id] = entry
        by_slug[slug] = entry
    items = []
    visited = set()
    for entry in inv["items"]:
        cid, slug = entry.get("catalog_id"), entry.get("provider_id")
        need(isinstance(cid, str) and ID.fullmatch(cid) and
             isinstance(slug, str) and SLUG.fullmatch(slug) and
             cid not in visited, "INVALID_VIDEO_CATALOG_ID")
        visited.add(cid)
        media = entry.get("video")
        poster = by_id.get(cid)
        need(poster is not None and poster.get("provider_id") == slug, "POSTER_CATALOG_MISMATCH")
        need(isinstance(media, dict) and
             media.get("path") == "movekit/v2/video/" + slug + ".mp4" and
             isinstance(media.get("bytes"), int) and media["bytes"] > 0 and
             isinstance(media.get("sha256"), str) and SHA.fullmatch(media["sha256"]),
             "INVALID_VIDEO_DESCRIPTOR")
        need(poster.get("private_storage_path") ==
             "movekit/v2/poster-optimized/" + slug + ".webp" and
             isinstance(poster.get("bytes"), int) and poster["bytes"] > 0 and
             isinstance(poster.get("sha256"), str) and SHA.fullmatch(poster["sha256"]) and
             poster.get("mime") == "image/webp", "INVALID_POSTER_DESCRIPTOR")
        video_src = video_dir / (slug + ".mp4")
        poster_src = poster_dir / (slug + ".webp")
        need(video_src.is_file() and video_src.stat().st_size == media["bytes"],
             "VIDEO_SOURCE_FILE_MISSING_OR_SIZE")
        need(poster_src.is_file() and poster_src.stat().st_size == poster["bytes"],
             "WEBP_SOURCE_FILE_MISSING_OR_SIZE")
        if verify:
            need(digest(video_src) == media["sha256"], "VIDEO_SOURCE_SHA_CHANGED")
            need(digest(poster_src) == poster["sha256"], "WEBP_SOURCE_SHA_CHANGED")
        items.extend((
            {"catalog_id": cid, "media_type": "video", "version": "v2",
             "bucket": "exercise-media", "content_type": "video/mp4",
             "storage_path": media["path"], "bytes": media["bytes"],
             "sha256": media["sha256"], "local_source": str(video_src)},
            {"catalog_id": cid, "media_type": "poster", "version": "v2",
             "bucket": "exercise-posters", "content_type": "image/webp",
             "storage_path": poster["private_storage_path"], "bytes": poster["bytes"],
             "sha256": poster["sha256"], "local_source": str(poster_src)}
        ))
    need(len(visited) == COUNT and len(items) == COUNT * 2 and
         len(by_id) == COUNT and len(by_slug) == COUNT, "INCOMPLETE_MEDIA_PLAN")
    need({x.name for x in video_dir.glob("*.mp4")} ==
         {entry["provider_id"] + ".mp4" for entry in inv["items"]},
         "UNEXPECTED_VIDEO_FILES")
    items.sort(key=lambda x: (x["catalog_id"], x["media_type"]))
    need(len({(x["bucket"], x["storage_path"]) for x in items}) == COUNT*2,
         "DUPLICATE_STORAGE_TARGET")
    by_type = {t: sum(x["bytes"] for x in items if x["media_type"] == t)
               for t in ("video", "poster")}
    return {
        "schema": "trainingskompas-movekit-v2-private-upload-plan/1.0",
        "status": "LOCAL_ONLY_NO_NETWORK_NO_UPLOAD",
        "source_release": inv["release"],
        "catalog_items": COUNT, "files": COUNT*2,
        "verified_files": bool(verify), "video_bytes": by_type["video"],
        "poster_bytes": by_type["poster"],
        "expected_bucket_settings": {
            "exercise-media": {"public": False, "mime": "video/mp4"},
            "exercise-posters": {"public": False, "mime": "image/webp"}
        },
        "items": items
    }


def store_private(source, result):
    source = Path(source).resolve()
    output = source / ".tk-private-review" / "TK504-MOVEKIT-V2-UPLOAD-PLAN.json"
    need(result.get("verified_files") is True, "MUST_VERIFY_BEFORE_WRITING")
    need(output.parent.resolve() == (source / ".tk-private-review").resolve(),
         "OUTSIDE_PRIVATE_SOURCE")
    serialized = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        need(output.read_text(encoding="utf8") == serialized,
             "EXISTING_UPLOAD_PLAN_DIFFERS")
    else:
        output.write_text(serialized, encoding="utf8")
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path(r"C:\Movikit"))
    parser.add_argument("--write-private", action="store_true")
    parser.add_argument("--skip-sha-for-preflight", action="store_true")
    args = parser.parse_args()
    need(not (args.write_private and args.skip_sha_for_preflight),
         "CANNOT_WRITE_UNVERIFIED_PLAN")
    repo = Path(__file__).resolve().parent.parent
    result = plan(repo, args.source, verify=not args.skip_sha_for_preflight)
    info = {k: v for k, v in result.items() if k != "items"}
    if args.write_private:
        info["private_plan_path"] = str(store_private(args.source, result))
    print(json.dumps(info, indent=2))


if __name__ == "__main__":
    main()
