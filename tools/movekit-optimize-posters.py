#!/usr/bin/env python3
"""Locally optimize licensed MoveKit posters for mobile, without publishing assets.

Golden input is immutable; outputs stay in the source-owned private review folder.
WebP needs Pillow, installed separately from this PUBLIC repository. Never run
this script as part of a public CI job, Netlify deployment or app asset bundle.
"""
import argparse
import hashlib
import json
import re
import struct
import os
from pathlib import Path

EXPECTED = 582
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
SCHEMA = "trainingskompas-movekit-golden-inventory/2.0"
DEFAULT_SOURCE = Path(r"C:\Movikit")


def require(condition, code):
    if not condition:
        raise ValueError(code)


def sha256(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def png_header(path):
    with Path(path).open("rb") as f:
        data = f.read(29)
    require(len(data) == 29 and data[:8] == b"\x89PNG\r\n\x1a\n" and
            data[12:16] == b"IHDR", "INVALID_PNG_HEADER")
    width, height, depth, color, compress, filtering, interlace = struct.unpack(">IIBBBBB", data[16:29])
    require(16 <= width <= 10000 and 16 <= height <= 10000 and
            depth == 8 and color in (2, 6) and compress == 0 and filtering == 0 and
            interlace == 0, "UNSUPPORTED_PNG")
    return (width, height)


def preflight(repo, source, mode):
    repo = Path(repo).resolve()
    source = Path(source).resolve()
    require(repo != source and repo not in source.parents, "SOURCE_INSIDE_PUBLIC_REPO")
    inv = json.loads((repo / "docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json").read_text(encoding="utf8"))
    require(inv.get("schema") == SCHEMA and inv.get("status") == "STAGING_ONLY_DO_NOT_ACTIVATE",
            "INVALID_GOLDEN_INVENTORY")
    items = inv.get("items")
    require(isinstance(items, list) and len(items) == EXPECTED, "INVALID_POSTER_COUNT")
    dirs = sorted(p for p in source.iterdir() if p.is_dir() and
                  p.name.startswith("complete-exercise-library-posters-golden-release-"))
    require(len(dirs) == 1, "INVALID_POSTER_SOURCE_DIR")
    poster_dir = dirs[0] / "posters"
    require(poster_dir.is_dir(), "POSTER_SOURCE_NOT_FOUND")
    slugs = set()
    records = []
    for item in items:
        require(isinstance(item, dict), "INVALID_ITEM")
        slug = item.get("provider_id")
        require(isinstance(slug, str) and SLUG.fullmatch(slug) and slug not in slugs,
                "DUPLICATE_OR_INVALID_SLUG")
        slugs.add(slug)
        raw = item.get("poster")
        require(isinstance(raw, dict) and raw.get("path") == f"movekit/v2/poster/{slug}.png" and
                isinstance(raw.get("bytes"), int) and raw["bytes"] > 0 and
                isinstance(raw.get("sha256"), str) and
                re.fullmatch("[0-9a-f]{64}", raw["sha256"]),
                "INVALID_POSTER_DESCRIPTOR")
        path = poster_dir / (slug + ".png")
        require(path.is_file() and path.stat().st_size == raw["bytes"],
                "SOURCE_POSTER_SIZE_OR_PATH_MISMATCH")
        width, height = png_header(path)
        records.append((slug, path, raw, width, height))
    require({p.stem for p in poster_dir.glob("*.png")} == slugs, "UNEXPECTED_POSTER_FILES")
    target = (source / ".tk-private-review" /
              ("posters-webp-smoke" if mode == "smoke" else "posters-webp-v2")).resolve()
    private = (source / ".tk-private-review").resolve()
    require(target.parent == private and repo not in target.parents, "UNSAFE_OUTPUT_PATH")
    return records, target


def encode(records, target, width_limit=1280, quality=82, mode="all"):
    from PIL import Image, __version__ as pillow_version
    require(512 <= width_limit <= 1600 and 60 <= quality <= 95, "INVALID_QUALITY_SETTINGS")
    selected = records[:3] if mode == "smoke" else records
    target.mkdir(parents=True, exist_ok=True)
    prior_file = target / "manifest.json"
    # Prevent carrying a previous manifest into a new run with changed settings.
    if prior_file.exists():
        old = json.loads(prior_file.read_text(encoding="utf8"))
        require(old.get("width_limit") == width_limit and old.get("quality") == quality and
                old.get("pillow_version") == pillow_version, "OUTPUT_CONFIG_MISMATCH")
    indexed = []
    saved = 0
    for index, (slug, src, desc, width, height) in enumerate(selected, 1):
        require(sha256(src) == desc["sha256"], "SOURCE_POSTER_SHA_MISMATCH")
        out_file = target / f"{slug}.webp"
        tmp_file = target / f"{slug}.partial.webp"
        try:
            with Image.open(src) as im:
                im.load()
                require(im.format == "PNG" and im.size == (width, height), "PNG_DECODE_MISMATCH")
                if im.mode not in ("RGB", "RGBA"):
                    im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
                if width > width_limit:
                    new_size = (width_limit, max(1, round(height * width_limit / width)))
                    im = im.resize(new_size, Image.Resampling.LANCZOS)
                target_size = im.size
                im.save(tmp_file, "WEBP", quality=quality, method=5)
            with Image.open(tmp_file) as check:
                check.load()
                require(check.format == "WEBP" and check.size == target_size,
                        "OUTPUT_WEBP_DECODE_FAILED")
            os.replace(tmp_file, out_file)
        finally:
            if tmp_file.exists():
                tmp_file.unlink()
        output_size = out_file.stat().st_size
        saved += desc["bytes"] - output_size
        indexed.append({
            "provider_id": slug, "storage_path": f"movekit/v2/poster-optimized/{slug}.webp",
            "original_sha256": desc["sha256"], "original_bytes": desc["bytes"],
            "optimized_sha256": sha256(out_file), "optimized_bytes": output_size,
            "optimized_width": target_size[0], "optimized_height": target_size[1],
            "mime": "image/webp"
        })
        if index % 100 == 0:
            print(f"PROGRESS verified={index}/{len(selected)}",flush=True)
    manifest = {
        "schema": "trainingskompas-movekit-poster-optimized/1.0",
        "status": "PRIVATE_LOCAL_STAGING_NOT_UPLOADED",
        "complete": len(selected) == EXPECTED,
        "width_limit": width_limit, "quality": quality, "pillow_version": pillow_version,
        "count": len(selected),
        "original_bytes": sum(x["original_bytes"] for x in indexed),
        "optimized_bytes": sum(x["optimized_bytes"] for x in indexed),
        "saved_bytes": saved,
        "items": indexed
    }
    tmp = target / "manifest.partial.json"
    tmp.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
    os.replace(tmp, prior_file)
    return {k: v for k, v in manifest.items() if k != "items"}


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    p.add_argument("--mode", choices=("audit", "smoke", "all"), default="audit")
    p.add_argument("--width", type=int, default=1280)
    p.add_argument("--quality", type=int, default=82)
    args = p.parse_args()
    repo = Path(__file__).resolve().parent.parent
    records, target = preflight(repo, args.source, args.mode)
    if args.mode == "audit":
        print(json.dumps({"mode": "audit", "verified_header_count": len(records),
                          "source_bytes": sum(x[2]["bytes"] for x in records),
                          "dimensions": sorted({f"{x[3]}x{x[4]}" for x in records}),
                          "raw_media_copied": False}, indent=2))
        return
    report = encode(records, target, width_limit=args.width, quality=args.quality, mode=args.mode)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
