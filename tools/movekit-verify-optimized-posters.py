#!/usr/bin/env python3
"""Verify local optimized MoveKit posters, then build a PRIVATE upload registry.

Never uploads anything. No encrypted-media entitlement is issued here.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path

TOOL = Path(__file__).with_name("movekit-optimize-posters.py")
SPEC = importlib.util.spec_from_file_location("tk504_poster_optimizer", TOOL)
OPT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(OPT)

def ensure(ok, code):
    if not ok:
        raise ValueError(code)

def verify(repo, source):
    from PIL import Image
    records, target = OPT.preflight(repo, source, "all")
    ensure(target.is_dir(), "OUTPUT_NOT_FOUND")
    manifest_file = target / "manifest.json"
    ensure(manifest_file.is_file(), "OPTIMIZED_MANIFEST_NOT_FOUND")
    manifest = json.loads(manifest_file.read_text(encoding="utf8"))
    ensure(manifest.get("schema") == "trainingskompas-movekit-poster-optimized/1.0" and
           manifest.get("status") == "PRIVATE_LOCAL_STAGING_NOT_UPLOADED" and
           manifest.get("complete") is True and manifest.get("count") == 582 and
           len(manifest.get("items", [])) == 582, "OPTIMIZED_MANIFEST_NOT_COMPLETE")
    items = manifest["items"]
    by_slug = {}
    for item in items:
        slug = item.get("provider_id")
        ensure(isinstance(slug, str) and OPT.SLUG.fullmatch(slug) and slug not in by_slug,
               "OPTIMIZED_DUPLICATE")
        by_slug[slug] = item
    ensure(set(by_slug) == {r[0] for r in records}, "OPTIMIZED_COVERAGE_INVALID")
    ensure({p.stem for p in target.glob("*.webp")} == set(by_slug),
           "UNEXPECTED_OPTIMIZED_POSTER")
    inv = json.loads((Path(repo)/"docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json").read_text(encoding="utf8"))
    by_catalog_slug = {x["provider_id"]: x["catalog_id"] for x in inv["items"]}
    ensure(len(by_catalog_slug) == 582 and len(set(by_catalog_slug.values())) == 582,
           "CATALOG_ID_AMBIGUOUS")
    registry = []
    source_total = 0
    optimized_total = 0
    for slug, src, raw, w, h in records:
        item = by_slug[slug]
        out_file = target / (slug + ".webp")
        ensure(item.get("storage_path") == f"movekit/v2/poster-optimized/{slug}.webp" and
               item.get("mime") == "image/webp" and
               item.get("original_sha256") == raw["sha256"] and
               item.get("original_bytes") == raw["bytes"], "POSTER_SOURCE_MAPPING_CHANGED")
        ensure(OPT.sha256(src) == raw["sha256"], "POSTER_SOURCE_SHA_CHANGED")
        ensure(out_file.is_file() and out_file.stat().st_size == item.get("optimized_bytes") and
               OPT.sha256(out_file) == item.get("optimized_sha256"), "POSTER_WEBP_SHA_CHANGED")
        target_w = min(w,manifest["width_limit"])
        target_h = h if w <= manifest["width_limit"] else max(1,round(h*target_w/w))
        with Image.open(out_file) as im:
            im.load()
            ensure(im.format == "WEBP" and im.size == (target_w,target_h) and
                   im.mode in ("RGB", "RGBA"), "OPTIMIZED_IMAGE_INVALID")
        ensure((item.get("optimized_width"),item.get("optimized_height"))==(target_w,target_h),
               "OPTIMIZED_DIMENSIONS_MISMATCH")
        registry.append({
            "catalog_id": by_catalog_slug[slug],
            "provider_id": slug,
            "media_version": "v2",
            "private_storage_path": item["storage_path"],
            "sha256": item["optimized_sha256"],
            "bytes": item["optimized_bytes"],
            "width": target_w,
            "height": target_h,
            "mime": "image/webp"
        })
        source_total += raw["bytes"]
        optimized_total += item["optimized_bytes"]
    ensure(source_total == manifest["original_bytes"] and optimized_total == manifest["optimized_bytes"],
           "TOTAL_BYTES_MISMATCH")
    output = {
        "schema": "trainingskompas-movekit-private-poster-registry/1.0",
        "status": "LOCAL_ONLY_NO_UPLOAD_NO_RELEASE",
        "media_version": "v2",
        "count": len(registry),
        "catalog_binding_verified": True,
        "input_bytes": source_total,
        "output_bytes": optimized_total,
        "items": registry
    }
    destination = target / "catalog-poster-registry.json"
    text = json.dumps(output, indent=2) + "\n"
    if destination.exists():
        ensure(destination.read_text(encoding="utf8") == text, "EXISTING_REGISTRY_MISMATCH")
    else:
        staging = target / "catalog-poster-registry.partial.json"
        staging.write_text(text, encoding="utf8")
        os.replace(staging,destination)
    return {"count": len(registry),
            "original_bytes": source_total,
            "webp_bytes": optimized_total,
            "bytes_saved": source_total-optimized_total,
            "status":output["status"],
            "verified_source_sha":True, "verified_webp_sha":True,
            "verified_catalog_binding":True,
            "registry_path":str(destination)}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--source",type=Path,default=OPT.DEFAULT_SOURCE)
    args=p.parse_args()
    report=verify(Path(__file__).resolve().parent.parent,args.source)
    print(json.dumps(report,indent=2))
if __name__=="__main__":
    main()
