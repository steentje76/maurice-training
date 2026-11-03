#!/usr/bin/env python3
"""Private, source-bound review ledger. Valid review is NEVER production approval.

Inputs and review attestations remain untrusted administrative workflow data.
No media, DB, entitlement, catalog or runtime configuration writes are performed.
"""
import argparse
import collections
import hashlib
import importlib.util
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location(
    "tk504_review_hints", Path(__file__).with_name("movekit-classification-review.py"))
HINTS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HINTS)
SCHEMA = "trainingskompas-movekit-review-ledger/1.0"
HASH = re.compile(r"[0-9a-f]{64}\Z")
CLASS_FIELDS = ("category", "type", "primary", "secondary", "equipment", "pattern", "goals")


def require(ok, message):
    if not ok:
        raise ValueError(message)


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                    separators=(",", ":")).encode("utf8")).hexdigest()


def make_template(catalog, inventory, rows, source_hashes):
    require(isinstance(source_hashes, dict) and set(source_hashes) ==
            {"supplier", "catalog", "inventory"} and
            all(isinstance(v, str) and HASH.fullmatch(v) for v in source_hashes.values()),
            "INVALID_SOURCE_HASHES")
    suggestions = HINTS.recommend(catalog, inventory, rows)
    by_slug = {r["slug"]: r for r in rows}
    return {
        "schema": SCHEMA, "status": "PRIVATE_REVIEW_NOT_RELEASE",
        "source_hashes": dict(source_hashes),
        "entries": [{
            "catalog_id": item["catalog_id"], "provider_id": item["provider_id"],
            "supplier_record_sha256": digest(by_slug[item["provider_id"]]),
            "suggestion": item, "decision": "PENDING",
            "classification": None, "review": None,
        } for item in suggestions["candidates"]],
    }


def vocabulary(catalog):
    result = {field: set() for field in CLASS_FIELDS}
    for entry in catalog["catalog"]:
        identity = entry.get("identity", {})
        for field in CLASS_FIELDS:
            value = identity.get(field)
            for tag in (value if isinstance(value, list) else [value]):
                if isinstance(tag, str) and tag.strip() and tag != "pending_review":
                    result[field].add(tag)
    return result


def validate(ledger, template, catalog):
    require(isinstance(ledger, dict) and set(ledger) == set(template) and
            ledger.get("schema") == SCHEMA and
            ledger.get("status") == "PRIVATE_REVIEW_NOT_RELEASE", "INVALID_LEDGER")
    require(ledger.get("source_hashes") == template["source_hashes"], "STALE_SOURCE_HASH")
    entries = ledger.get("entries")
    require(isinstance(entries, list) and len(entries) == 356, "INCOMPLETE_LEDGER")
    expected = {e["catalog_id"]: e for e in template["entries"]}
    seen = set()
    vocab = vocabulary(catalog)
    counts = collections.Counter()
    for entry in entries:
        require(isinstance(entry, dict), "INVALID_ENTRY")
        cid = entry.get("catalog_id")
        require(isinstance(cid, str) and cid in expected and cid not in seen,
                "DUPLICATE_OR_UNKNOWN_ID")
        seen.add(cid)
        original = expected[cid]
        require(set(entry) == set(original), "UNKNOWN_ENTRY_FIELD")
        for field in ("provider_id", "supplier_record_sha256", "suggestion"):
            require(entry[field] == original[field], "STALE_OR_CHANGED_SOURCE")
        decision = entry.get("decision")
        require(decision in ("PENDING", "ACCEPT", "REJECT", "DEFER"), "INVALID_DECISION")
        review = entry.get("review")
        classification = entry.get("classification")
        if decision == "PENDING":
            require(review is None and classification is None, "PENDING_HAS_REVIEW")
            counts["pending"] += 1
            continue
        require(isinstance(review, dict) and set(review) ==
                {"kind", "reviewer", "reference", "reviewed_at", "rationale", "source_refs"},
                "INCOMPLETE_REVIEW_PROVENANCE")
        require(review["kind"] in ("AI", "HUMAN_ATTESTED"), "INVALID_REVIEW_KIND")
        for field in ("reviewer", "reference", "rationale"):
            require(isinstance(review[field], str) and 0 < len(review[field].strip()) <= 2000,
                    "INCOMPLETE_REVIEW_PROVENANCE")
        stamp = review["reviewed_at"]
        require(isinstance(stamp, str) and stamp.endswith("Z"), "INVALID_REVIEW_TIMESTAMP")
        try:
            datetime.fromisoformat(stamp[:-1] + "+00:00")
        except ValueError as error:
            raise ValueError("INVALID_REVIEW_TIMESTAMP") from error
        require(review["source_refs"] == [
            "supplier-sha256:" + original["supplier_record_sha256"]],
            "MISSING_EXACT_SUPPLIER_REFERENCE")
        if decision == "ACCEPT":
            require(isinstance(classification, dict) and set(classification) ==
                    set(CLASS_FIELDS), "INCOMPLETE_CLASSIFICATION")
            for field in CLASS_FIELDS:
                value = classification[field]
                if field in ("category", "type", "pattern"):
                    require(isinstance(value, str) and value in vocab[field],
                            "UNKNOWN_CLASSIFICATION_" + field.upper())
                else:
                    require(isinstance(value, list) and len(value) == len(set(
                        x for x in value if isinstance(x, str))) and
                        all(isinstance(x, str) and x in vocab[field] for x in value),
                        "UNKNOWN_CLASSIFICATION_" + field.upper())
            require(bool(classification["primary"]), "MISSING_PRIMARY_MUSCLE")
        else:
            require(classification is None, "NON_ACCEPTED_CLASSIFICATION")
        counts[decision.lower() + "_" + review["kind"].lower()] += 1
    require(seen == set(expected), "INCOMPLETE_LEDGER")
    return {
        "schema": SCHEMA, "status": "VALID_PRIVATE_REVIEW_NOT_RELEASE",
        "entries": 356, "counts": dict(sorted(counts.items())),
        "human_identity_verified": False,
        "app_activated": False, "db_writes": False, "release_approved": False,
        "note": "HUMAN_ATTESTED is supplied provenance, not verified identity or authorization.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("template", "validate"))
    parser.add_argument("--source", type=Path, default=Path(r"C:\Movikit"))
    parser.add_argument("--ledger", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    paths = {
        "supplier": args.source / "complete-exercise-library-metadata/metadata.json",
        "catalog": ROOT / "exercise-catalog.json",
        "inventory": ROOT / "docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json",
    }
    data = {key: json.loads(path.read_text(encoding="utf8")) for key, path in paths.items()}
    template = make_template(data["catalog"], data["inventory"], data["supplier"],
                             {key: HINTS.sha256(path) for key, path in paths.items()})
    if args.command == "template":
        require(args.output is not None and args.ledger is None, "TEMPLATE_OUTPUT_REQUIRED")
        output = HINTS.CATALOG_STAGE.output_allowed(args.output, ROOT, args.source)
        output.parent.mkdir(parents=True, exist_ok=True)
        # Exclusive create avoids clobbering an existing reviewed ledger.
        with output.open("x", encoding="utf8", newline="\n") as writer:
            writer.write(json.dumps(template, ensure_ascii=False, indent=2) + "\n")
        report = {"status": template["status"], "entries": 356, "approved": 0}
    else:
        require(args.ledger is not None and args.output is None, "VALIDATE_LEDGER_REQUIRED")
        ledger_path = args.ledger.resolve()
        require(ledger_path.parent == (args.source / ".tk-private-review").resolve(),
                "LEDGER_OUTSIDE_PRIVATE_STAGE")
        report = validate(json.loads(ledger_path.read_text(encoding="utf8")),
                          template, data["catalog"])
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
