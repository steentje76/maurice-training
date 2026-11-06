#!/usr/bin/env python3
"""Deterministic inventory of licensed MoveKit Golden 20261004 inputs.
Read-only source; emits metadata/hash evidence only, never licensed video/poster bytes or license IDs.
"""
import argparse, hashlib, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = Path(r"C:\movikit")
DEFAULT_DEST = ROOT / "docs" / "generated" / "MOVEKIT_GOLDEN_V2_INVENTORY.json"
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()

def build(source):
    metadata_file = source / "complete-exercise-library-metadata" / "metadata.json"
    rows = json.loads(metadata_file.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise ValueError("expected metadata array")
    vdirs = sorted(p for p in source.iterdir() if p.is_dir() and p.name.startswith("complete-exercise-library-golden-release-"))
    pdirs = sorted(p for p in source.iterdir() if p.is_dir() and p.name.startswith("complete-exercise-library-posters-golden-release-"))
    if len(vdirs) != 1 or len(pdirs) != 1:
        raise ValueError("require exactly one video and one poster release")
    video_dir, poster_dir = vdirs[0], pdirs[0] / "posters"
    old = json.loads((ROOT / "docs" / "generated" / "MOVEKIT_MEDIA_MANIFEST_V1.json").read_text(encoding="utf-8"))
    catalog = json.loads((ROOT / "exercise-catalog.json").read_text(encoding="utf-8"))
    by_slug = {e["provider_id"]: e for e in old["items"]}
    catalog_ids = {e["catalog_id"] for e in catalog["catalog"]}
    if len(by_slug) != len(old["items"]) or len(catalog_ids) != len(catalog["catalog"]):
        raise ValueError("duplicate existing catalog identity")
    expected = {r["slug"] for r in rows}
    if len(expected) != len(rows) or not all(SLUG_RE.fullmatch(s) for s in expected):
        raise ValueError("invalid or duplicate supplier slugs")
    if not set(by_slug).issubset(expected):
        raise ValueError("existing MoveKit slug missing from supplier release")
    actual_v = {p.stem for p in video_dir.glob("*.mp4")}
    actual_p = {p.stem for p in poster_dir.glob("*.png")}
    if actual_v != expected or actual_p != expected:
        raise ValueError("incomplete or unexpected videos/posters")
    pending = sorted(expected - set(by_slug))
    reserved = set(catalog_ids)
    new_ids = {}
    next_id = max(int(s[3:]) for s in reserved if re.fullmatch(r"TK-\d{6}", s)) + 1
    for slug in pending:
        while "TK-%06d" % next_id in reserved: next_id += 1
        new_ids[slug] = "TK-%06d" % next_id
        reserved.add(new_ids[slug])
        next_id += 1
    details = {r["slug"]: r for r in rows}
    entries = []
    changed = 0
    for slug in sorted(expected):
        video, poster = video_dir / (slug + ".mp4"), poster_dir / (slug + ".png")
        row = details[slug]
        if Path(row.get("videoFile", "").replace("\\", "/")).name != video.name:
            raise ValueError("supplier video reference mismatch: " + slug)
        if Path(row.get("posterFile", "").replace("\\", "/")).name != poster.name:
            raise ValueError("supplier poster reference mismatch: " + slug)
        video_sha = sha256_file(video)
        new = slug not in by_slug
        if not new and video_sha != by_slug[slug]["sha256"]:
            changed += 1
        entries.append({
            "catalog_id": new_ids[slug] if new else by_slug[slug]["catalog_id"],
            "status": "proposed-new" if new else "existing-id",
            "provider_id": slug,
            "name": row.get("name", ""),
            "video": {"path": "movekit/v2/video/" + slug + ".mp4",
                      "sha256": video_sha, "bytes": video.stat().st_size, "mime": "video/mp4"},
            "poster": {"path": "movekit/v2/poster/" + slug + ".png",
                       "sha256": sha256_file(poster), "bytes": poster.stat().st_size, "mime": "image/png"}
        })
    return {
        "schema": "trainingskompas-movekit-golden-inventory/2.0",
        "release": "complete-exercise-library-golden-release-20261004",
        "status": "STAGING_ONLY_DO_NOT_ACTIVATE",
        "offline_video_licence_clearance": "REQUIRED",
        "source_catalog_preserved": True,
        "existing_catalog_entries": len(by_slug),
        "new_catalog_candidates": len(pending),
        "golden_videos_changed_vs_v1": changed,
        "video_total_bytes": sum(e["video"]["bytes"] for e in entries),
        "poster_total_bytes": sum(e["poster"]["bytes"] for e in entries),
        "items": entries
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--output", type=Path, default=DEFAULT_DEST)
    opts = ap.parse_args()
    inv = build(opts.source)
    doc = json.dumps(inv, ensure_ascii=False, indent=2) + "\n"
    if opts.write:
        opts.output.parent.mkdir(parents=True, exist_ok=True)
        opts.output.write_text(doc, encoding="utf-8")
    else:
        if not opts.output.exists() or opts.output.read_text(encoding="utf-8") != doc:
            raise ValueError("inventory absent or stale: re-run --write and review")
    print(json.dumps({k: v for k, v in inv.items() if k != "items"}, indent=2))
    print("items", len(inv["items"]), "mode", "WRITTEN" if opts.write else "MATCH")
if __name__ == "__main__":
    main()
