#!/usr/bin/env python3
"""Derive a source-verified public-only MoveKit V2 WebP digest index.

Input remains on the source owner's private disk. Output includes ONLY
canonical catalog id, existing public provider slug, optimized WebP path,
byte length and SHA-256. NO images, video bytes, supplier instructions,
local paths, entitlements, signed URLs or secret values enter public Git.
This index is NOT a release approval.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

CID = re.compile(r"^TK-[0-9]{6}$")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SHA = re.compile(r"^[a-f0-9]{64}$")
SCHEMA = "trainingskompas-movekit-v2-optimized-poster-digests/1.0"


def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as fd:
        for block in iter(lambda: fd.read(1048576), b""):
            h.update(block)
    return h.hexdigest()


def build(public_inventory, private_registry, check_files=True):
    source_bytes = Path(public_inventory).read_bytes()
    inventory = json.loads(source_bytes)
    private_registry = Path(private_registry).resolve(strict=True)
    if private_registry.name != "catalog-poster-registry.json" or (
        private_registry.parent.name != "posters-webp-v2"
        or private_registry.parent.parent.name != ".tk-private-review"
    ):
        raise ValueError("PRIVATE_POSTER_REGISTRY_PATH_INVALID")
    registry = json.loads(private_registry.read_text(encoding="utf-8"))
    if (inventory.get("schema") != "trainingskompas-movekit-golden-inventory/2.0"
        or inventory.get("status") != "STAGING_ONLY_DO_NOT_ACTIVATE"
        or len(inventory.get("items", [])) != 582
        or registry.get("schema") != "trainingskompas-movekit-private-poster-registry/1.0"
        or registry.get("status") != "LOCAL_ONLY_NO_UPLOAD_NO_RELEASE"
        or registry.get("count") != 582 or len(registry.get("items", [])) != 582):
        raise ValueError("MEDIA_SOURCE_MANIFEST_INVALID")

    candidates = {}
    provider_ids = set()
    for item in inventory["items"]:
        cid, slug = item["catalog_id"], item["provider_id"]
        if not CID.fullmatch(cid) or not SLUG.fullmatch(slug) or cid in candidates or slug in provider_ids:
            raise ValueError("DUPLICATE_GOLDEN_CATALOG")
        candidates[cid] = slug
        provider_ids.add(slug)
    out, seen, paths, total = [], set(), set(), 0
    for item in registry["items"]:
        cid, slug = item["catalog_id"], item["provider_id"]
        if not isinstance(cid, str) or not isinstance(slug, str) or (
            cid not in candidates or candidates[cid] != slug or cid in seen
        ):
            raise ValueError("POSTER_ID_MAPPING_INVALID")
        seen.add(cid)
        target = "movekit/v2/poster-optimized/" + slug + ".webp"
        file_path = private_registry.parent / (slug + ".webp")
        if (item["media_version"] != "v2" or item["private_storage_path"] != target
            or target in paths or item["mime"] != "image/webp"
            or not isinstance(item["bytes"], int) or item["bytes"] < 1
            or item["bytes"] > 1048576 or not SHA.fullmatch(item["sha256"])):
            raise ValueError("POSTER_DESCRIPTOR_INVALID")
        paths.add(target)
        if check_files:
            if not file_path.is_file() or file_path.stat().st_size != item["bytes"] or sha(file_path) != item["sha256"]:
                raise ValueError("POSTER_SOURCE_HASH_MISMATCH")
        out.append({"catalog_id": cid, "provider_id": slug,
                    "path": target, "sha256": item["sha256"],
                    "bytes": item["bytes"], "mime": "image/webp"})
        total += item["bytes"]
    if set(candidates) != seen or len(out) != 582 or total != 9634714:
        raise ValueError("INCOMPLETE_OPTIMIZED_POSTER_SOURCE")
    return {"schema": SCHEMA, "status": "STAGING_INDEX_NOT_RELEASE_APPROVAL",
            "golden_inventory_sha256": hashlib.sha256(source_bytes).hexdigest(),
            "count": len(out), "total_bytes": total,
            "items": sorted(out, key=lambda x: x["catalog_id"])}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--public-inventory", required=True, type=Path)
    p.add_argument("--private-registry", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    args = p.parse_args()
    result = build(args.public_inventory, args.private_registry)
    output = args.output.resolve()
    if output.name != "MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json" or output.parent.name != "generated" or output.parent.parent.name != "docs":
        raise ValueError("PUBLIC_DIGEST_OUTPUT_PATH_INVALID")
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"poster_digests": result["count"],
                      "source_bytes": result["total_bytes"],
                      "status": result["status"],
                      "output_sha256": sha(output)}))


if __name__ == "__main__":
    main()
