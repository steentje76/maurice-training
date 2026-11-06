#!/usr/bin/env python3
"""PRIVATE MoveKit V2 taxonomy suggestions, never production classification.

Baseline means existing 226 canonical catalog records. This program only reports
unanimous category/type matches from supplier-supplied movement, primary-muscle
and equipment tags. Such matches are REVIEW HINTS, not scientific evidence or
approved classifications; all 356 new exercise identities remain pending.
"""
import argparse
import collections
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAGE_PATH = Path(__file__).with_name("movekit-catalog-stage.py")
SPEC = importlib.util.spec_from_file_location("tk504_catalog_stage", STAGE_PATH)
CATALOG_STAGE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CATALOG_STAGE)

LEVELS = ("pattern+primary+equipment", "pattern+primary")


def signature(row, level):
    def normalized(key):
        values = row.get(key)
        if not isinstance(values, list):
            raise ValueError("INVALID_TAGS_" + key)
        if not all(isinstance(v, str) and v.strip() for v in values):
            raise ValueError("INVALID_TAGS_" + key)
        return tuple(sorted({v.strip().casefold() for v in values}))
    pattern = normalized("movementPattern")
    primary = normalized("primaryMuscles")
    equipment = normalized("equipment")
    if not pattern or not primary:
        return None
    return (pattern, primary, equipment) if level == LEVELS[0] else (pattern, primary)


def recommend(catalog, inventory, rows):
    # Reuse identity, count and source-reference contract from the prior stage.
    stage = CATALOG_STAGE.build(catalog, inventory, rows)
    existing = catalog["catalog"]
    by_source = {r["slug"]: r for r in rows}
    by_slug = {e["provider_id"]: e for e in inventory["items"]}
    baseline = [e for e in existing if e["source"]["provider"] == "movekit"]
    indexes = {level: collections.defaultdict(list) for level in LEVELS}
    for entry in baseline:
        slug = entry["source"]["provider_id"]
        identity = entry.get("identity", {})
        category = identity.get("category")
        kind = identity.get("type")
        if not isinstance(category, str) or not isinstance(kind, str) or not category or not kind:
            raise ValueError("INVALID_BASELINE_TAXONOMY")
        for level in LEVELS:
            key = signature(by_source[slug], level)
            if key is not None:
                indexes[level][key].append((category, kind, entry["catalog_id"]))
    result = []
    for candidate in stage["catalog"][226:]:
        cid = candidate["catalog_id"]
        slug = candidate["source"]["provider_id"]
        if by_slug[slug]["catalog_id"] != cid:
            raise ValueError("INVENTORY_MAPPING_CHANGED")
        classification = {
            "catalog_id": cid,
            "provider_id": slug,
            "review_required": True,
            "status": "NO_BASELINE_MATCH",
            "proposed_category": None,
            "proposed_type": None,
            "matching_basis": None,
            "supporting_catalog_ids": [],
            "evidence_note": "CATALOG_SIMILARITY_ONLY_NOT_SCIENTIFIC_EVIDENCE",
        }
        for level in LEVELS:
            key = signature(by_source[slug], level)
            if key is None:
                break
            candidates = indexes[level].get(key, [])
            if not candidates:
                continue
            pairs = {(category, kind) for category, kind, _ in candidates}
            if len(pairs) == 1:
                category, kind = next(iter(pairs))
                classification.update(
                    status="SUGGESTED_UNVERIFIED",
                    proposed_category=category,
                    proposed_type=kind,
                    matching_basis=level,
                    supporting_catalog_ids=sorted({cid for _, _, cid in candidates}),
                )
            else:
                # More specific conflicting evidence must NOT be replaced by
                # a less specific apparent consensus.
                classification.update(
                    status="CONFLICT_REVIEW_REQUIRED",
                    matching_basis=level,
                    supporting_catalog_ids=sorted({cid for _, _, cid in candidates}),
                )
            break
        result.append(classification)
    if len(result) != 356 or len({r["catalog_id"] for r in result}) != 356:
        raise ValueError("CANDIDATE_COUNT_CHANGED")
    counts = collections.Counter((r["status"], r["matching_basis"]) for r in result)
    return {
        "schema": "trainingskompas-movekit-taxonomy-review/1.0",
        "status": "PRIVATE_LOCAL_REVIEW_ONLY",
        "total": 582,
        "baseline_unchanged": 226,
        "candidate_count": len(result),
        "suggestions_not_approved": sum(r["status"] == "SUGGESTED_UNVERIFIED" for r in result),
        "review_outcomes": [
            {"status": s, "matching_basis": b, "count": v}
            for (s, b), v in sorted(counts.items(), key=lambda x: str(x[0]))
        ],
        "candidates": sorted(result, key=lambda e: e["catalog_id"]),
    }


def sha256(path):
    obj = hashlib.sha256()
    with Path(path).open("rb") as reader:
        for block in iter(lambda: reader.read(1024 * 1024), b""):
            obj.update(block)
    return obj.hexdigest()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--source", type=Path, default=Path(r"C:\Movikit"))
    p.add_argument("--output", type=Path)
    args = p.parse_args()
    catalog_path = ROOT / "exercise-catalog.json"
    inventory_path = ROOT / "docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json"
    source_path = args.source / "complete-exercise-library-metadata/metadata.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf8"))
    inventory = json.loads(inventory_path.read_text(encoding="utf8"))
    rows = json.loads(source_path.read_text(encoding="utf8"))
    result = recommend(catalog, inventory, rows)
    report = {
        "status": result["status"], "candidates": result["candidate_count"],
        "suggestions_require_review": result["suggestions_not_approved"],
        "outcomes": result["review_outcomes"],
        "source_sha256": sha256(source_path),
        "catalog_sha256": sha256(catalog_path),
        "manifest_sha256": sha256(inventory_path),
        "app_classification_modified": False, "raw_media_copied": False,
    }
    if args.output:
        output = CATALOG_STAGE.output_allowed(args.output, ROOT, args.source)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
        report["private_output"] = str(output)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
