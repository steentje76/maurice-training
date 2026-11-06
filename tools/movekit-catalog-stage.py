#!/usr/bin/env python3
"""Build a LOCAL-ONLY review candidate for MoveKit Golden V2.

No production writes, media copying, remote requests, entitlement, or claims.
Licensed descriptions/instructions MUST NOT enter the public Git repository.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

ID = re.compile(r"TK-\d{6}\Z")
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
STAGE_SCHEMA = "trainingskompas-movekit-catalog-stage/2.0"


def require(ok, code):
    if not ok:
        raise ValueError(code)


def digest_file(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def text_field(row, key, maximum=500):
    value = row.get(key)
    require(isinstance(value, str) and 0 < len(value) <= maximum, "INVALID_" + key.upper())
    return value


def text_array(row, key, limit=30, maximum=500):
    value = row.get(key)
    require(isinstance(value, list) and len(value) <= limit, "INVALID_" + key.upper())
    require(all(isinstance(x, str) and 0 < len(x) <= maximum for x in value), "INVALID_" + key.upper())
    return list(value)


def new_candidate(info, source):
    """Copy supplier-verified facts; never infer fatigue, recovery or confidence."""
    slug = info["provider_id"]
    require(info["status"] == "proposed-new", "NOT_A_NEW_CANDIDATE")
    require(SLUG.fullmatch(slug) and ID.fullmatch(info["catalog_id"]), "INVALID_NEW_ID")
    require(source.get("slug") == slug, "SOURCE_ID_MISMATCH")
    require(source.get("name") == info["name"], "SOURCE_NAME_MISMATCH")
    require(source.get("videoFile") == slug + ".mp4", "VIDEO_REFERENCE_MISMATCH")
    require(Path(str(source.get("posterFile", "")).replace("\\", "/")).name == slug + ".png", "POSTER_REFERENCE_MISMATCH")
    name = text_field(source, "name", 180)
    difficulty = text_field(source, "difficulty", 100)
    primary = text_array(source, "primaryMuscles", 20, 100)
    secondary = text_array(source, "secondaryMuscles", 20, 100)
    equipment = text_array(source, "equipment", 20, 100)
    patterns = text_array(source, "movementPattern", 20, 100)
    cues = text_array(source, "instructions", 20, 500)
    mistakes = text_array(source, "commonMistakes", 20, 500)
    return {
        "catalog_id": info["catalog_id"],
        "source": {"provider": "movekit", "provider_id": slug},
        "identity": {
            "name": name, "nl": None, "category": "pending_review",
            "family": "pending_review", "pattern": "pending_review",
            "primary": primary, "secondary": secondary, "equipment": equipment,
            "difficulty": difficulty, "type": "pending_review", "goals": [],
        },
        "intelligence": {
            "cues": cues, "mistakes": mistakes,
            "fatigue": None, "recovery": None, "fatigue_cost": None,
            "confidence": None, "why": {},
        },
        "relations": {"alternatives": [], "progressions": [], "regressions": []},
        "assets": [],  # Private V2 media NOT uploaded, no public URL activation.
        "flags": {"favorite": False, "custom": False,
                  "home_gym_ready": False, "travel_ready": False, "injury_flags": []},
        "_review": {
            "status": "NOT_PUBLISHED",
            "movement_patterns_supplied": patterns,
            "video_version": "v2",
            "media_entitlement_status": "NOT_VERIFIED",
            "scientific_inference_status": "NONE",
        }
    }


def build(catalog, inventory, rows):
    require(isinstance(catalog, dict) and isinstance(catalog.get("catalog"), list), "INVALID_CATALOG")
    require(isinstance(inventory, dict) and inventory.get("schema") ==
            "trainingskompas-movekit-golden-inventory/2.0" and
            inventory.get("status") == "STAGING_ONLY_DO_NOT_ACTIVATE", "INVALID_INVENTORY")
    require(isinstance(rows, list), "INVALID_SOURCE")
    old = catalog["catalog"]
    items = inventory.get("items")
    require(isinstance(items, list) and len(items) == 582 and len(rows) == 582, "SOURCE_COUNT_MISMATCH")
    require(len(old) == 226 and catalog.get("count") == 226, "BASE_CATALOG_CHANGED")
    known_ids = set()
    known_slugs = set()
    for item in old:
        require(isinstance(item, dict), "INVALID_BASE_ENTRY")
        cid = item.get("catalog_id")
        src = item.get("source")
        require(isinstance(cid, str) and ID.fullmatch(cid) and isinstance(src, dict) and
                src.get("provider") == "movekit", "INVALID_BASE_ENTRY")
        slug = src.get("provider_id")
        require(isinstance(slug, str) and SLUG.fullmatch(slug), "INVALID_BASE_SLUG")
        require(cid not in known_ids and slug not in known_slugs, "BASE_DUPLICATE")
        known_ids.add(cid)
        known_slugs.add(slug)
    by_source = {}
    for row in rows:
        require(isinstance(row, dict), "INVALID_SOURCE_ROW")
        slug = row.get("slug")
        require(isinstance(slug, str) and SLUG.fullmatch(slug) and slug not in by_source, "DUPLICATE_SOURCE_SLUG")
        by_source[slug] = row
    by_inventory = {}
    inv_ids = set()
    for info in items:
        require(isinstance(info, dict), "INVALID_INVENTORY_ENTRY")
        slug, cid = info.get("provider_id"), info.get("catalog_id")
        require(isinstance(slug, str) and SLUG.fullmatch(slug) and slug not in by_inventory and
                isinstance(cid, str) and ID.fullmatch(cid) and cid not in inv_ids, "DUPLICATE_INVENTORY")
        by_inventory[slug] = info
        inv_ids.add(cid)
    require(set(by_source) == set(by_inventory), "INVENTORY_SOURCE_MISMATCH")
    require(len(inv_ids) == 582 and len(known_ids) == 226, "COUNT_MISMATCH")
    for item in old:
        info = by_inventory[item["source"]["provider_id"]]
        require(info["catalog_id"] == item["catalog_id"] and info["status"] == "existing-id",
                "EXISTING_ID_REASSIGNED")
    require(len(by_inventory) - len(known_slugs) == 356, "NEW_COUNT_MISMATCH")
    new = [new_candidate(info, by_source[slug]) for slug, info in sorted(by_inventory.items())
           if slug not in known_slugs]
    require(len(new) == 356 and all(x["catalog_id"] not in known_ids for x in new),
            "NEW_IDS_COLLIDE")
    result = {
        "_schema": STAGE_SCHEMA,
        "_status": "PRIVATE_LOCAL_REVIEW_ONLY_NOT_ACTIVE",
        "_base_count": 226,
        "_new_count": 356,
        "count": 582,
        "catalog": old + sorted(new, key=lambda e: e["catalog_id"]),
    }
    return result


def output_allowed(path, repo, source):
    candidate = Path(path).expanduser().resolve()
    root = Path(repo).resolve()
    private_stage = (Path(source).resolve() / ".tk-private-review").resolve()
    require(candidate.suffix.lower() == ".json", "OUTPUT_MUST_BE_JSON")
    require(candidate != root and root not in candidate.parents, "PUBLIC_REPO_OUTPUT_BLOCKED")
    # Strict containment: no material derived from the licensed supplier text may
    # land in Git, web roots, shared directories or arbitrary caller-chosen paths.
    require(candidate.parent == private_stage, "OUTPUT_OUTSIDE_PRIVATE_STAGE")
    require(not candidate.exists(), "OUTPUT_ALREADY_EXISTS")
    return candidate


def main():
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description="Stage 356 new MoveKit exercises without publishing data")
    parser.add_argument("--source", type=Path, default=Path(r"C:\movikit"))
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    source_file = args.source / "complete-exercise-library-metadata" / "metadata.json"
    catalog_file = root / "exercise-catalog.json"
    inventory_file = root / "docs" / "generated" / "MOVEKIT_GOLDEN_V2_INVENTORY.json"
    catalog = json.loads(catalog_file.read_text(encoding="utf-8"))
    inventory = json.loads(inventory_file.read_text(encoding="utf-8"))
    rows = json.loads(source_file.read_text(encoding="utf-8"))
    stage = build(catalog, inventory, rows)
    report = {
        "status": stage["_status"],
        "existing_ids_preserved": 226,
        "new_candidates": stage["_new_count"],
        "total": stage["count"],
        "base_catalog_sha256": digest_file(catalog_file),
        "source_metadata_sha256": digest_file(source_file),
        "raw_media_copied": False,
        "app_activated": False,
    }
    if args.output:
        out = output_allowed(args.output, root, args.source)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(stage, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        report["local_private_output"] = str(out)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
