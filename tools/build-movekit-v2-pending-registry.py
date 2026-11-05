#!/usr/bin/env python3
"""TK504 source-attested 356-candidate ID registry. No content or media.
This script is deliberately OFFLINE and expects the staged Golden inventory
as a local file argument; CI validates the checked-in candidate-only JSON.
"""
import argparse
import hashlib
import json
import pathlib
import re
import sys

def build(source_bytes, published_ids):
    inventory=json.loads(source_bytes.decode("utf-8-sig"))
    if inventory.get("schema")!="trainingskompas-movekit-golden-inventory/2.0" or \
       inventory.get("status")!="STAGING_ONLY_DO_NOT_ACTIVATE" or \
       inventory.get("existing_catalog_entries")!=226 or \
       inventory.get("new_catalog_candidates")!=356:
        raise ValueError("INVALID_GOLDEN_INVENTORY")
    entries=inventory.get("items")
    if not isinstance(entries,list) or len(entries)!=582:raise ValueError("INVALID_582_COUNT")
    published=set(published_ids)
    if len(published)!=226:raise ValueError("PUBLISHED_BASELINE_NOT_226")
    ids=set()
    providers=set()
    candidates=[]
    existing=[]
    for row in entries:
        cid=row.get("catalog_id")
        provider=row.get("provider_id")
        status=row.get("status")
        if not isinstance(cid,str) or re.fullmatch(r"TK-\d{6}",cid) is None \
            or not isinstance(provider,str) \
            or re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",provider) is None \
            or cid in ids or provider in providers:
            raise ValueError("INVALID_OR_DUPLICATE_CANONICAL_ID")
        ids.add(cid);providers.add(provider)
        number=int(cid.split("-")[1])
        if number<=226:
            if status!="existing-id" or cid not in published:
                raise ValueError("PUBLISHED_BASELINE_DRIFT")
            existing.append(cid)
            continue
        if number>582 or status!="proposed-new" or cid in published:
            raise ValueError("UNRELEASED_CANDIDATE_DRIFT")
        # Reject source inventory that is missing evidence, but never
        # include supplier media paths, hashes or license text in output.
        for field in ("video","poster"):
            obj=row.get(field)
            if not isinstance(obj,dict) or \
               not re.fullmatch(r"[0-9a-f]{64}",obj.get("sha256","")) or \
               not isinstance(obj.get("bytes"),int) or obj["bytes"]<=0:
                raise ValueError("INVALID_SUPPLIER_MEDIA_EVIDENCE")
        candidates.append({
            "catalog_id":cid,
            "source_provider":"movekit",
            "provider_id":provider,
            "status":"NOT_PUBLISHED",
            "content_review":"HUMAN_REVIEW_PENDING",
            "selectable":False,
            "trainable":False,
            "media_access":False,
        })
    expected={"TK-"+str(i).zfill(6) for i in range(227,583)}
    if set(x["catalog_id"] for x in candidates)!=expected \
       or len(existing)!=226 or len(candidates)!=356:
        raise ValueError("INVALID_356_RANGE")
    candidates.sort(key=lambda x:x["catalog_id"])
    return {
        "schema":"tk504-unreleased-candidate-identity-registry/1.0",
        "status":"STAGED_IN_MAIN_NOT_IN_APP_RUNTIME",
        "content_origin":"GOLDEN_V2_LICENSED_SOURCE_IDENTITY_ONLY",
        "source_inventory_sha256":hashlib.sha256(source_bytes).hexdigest(),
        "existing_published_catalog_ids_unchanged":226,
        "new_candidate_ids":356,
        "human_approved_candidates":0,
        "global_media_grants_created":0,
        "runtime_import_enabled":False,
        "records":candidates
    }

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--golden",type=pathlib.Path,required=True)
    p.add_argument("--public-catalog",type=pathlib.Path,required=True)
    p.add_argument("--output",type=pathlib.Path,required=True)
    args=p.parse_args()
    if not args.golden.is_file():raise ValueError("MISSING_PRIVATE_GOLDEN_SOURCE")
    import re as _re
    html=args.public_catalog.read_text(encoding="utf-8")
    catalog_match=_re.search(r"^const EX_CATALOG = (\{.*\});?\s*$",html,_re.M)
    if not catalog_match:raise ValueError("MISSING_REAL_PUBLIC_CATALOG")
    existing=json.loads(catalog_match.group(1))
    published_ids=[x["catalog_id"] for x in existing["catalog"]]
    if existing.get("count")!=226:raise ValueError("PUBLISHED_COUNT_CHANGED")
    manifest=build(args.golden.read_bytes(),published_ids)
    if args.output.exists():raise ValueError("REFUSE_OVERWRITE")
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({"status":manifest["status"],"candidates":356,
          "published_unchanged":226,"output":str(args.output)},ensure_ascii=False))
if __name__=="__main__":
    try:main()
    except Exception as exc:
        print("BLOCKED:",type(exc).__name__,str(exc),file=sys.stderr)
        raise SystemExit(2)
