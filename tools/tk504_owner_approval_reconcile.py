#!/usr/bin/env python3
"""TK504: deterministic comparison of REAL 356 approved fields to owner-pinned batches.

Runs only against authorized PRIVATE licensed material, passed as explicit paths.
No publication, permissions, Supabase, Netlify, APK, media, or GitHub content dump.
Existing 15-batch content approval is sufficient when its exact reviewed fields match.
Other draft/unreviewed fields are never silently promoted by this check.
"""
import argparse
import hashlib
import json
import pathlib
import sys
from tk504_bulk_owner_review import material, display_entry, START, END

ROOT=pathlib.Path(__file__).resolve().parents[1]
APPROVAL_ID="TK504-20261105-OWNER-BATCHES-01-15"
FIELDS=("name_nl","short_description_nl","instructions_nl",
        "common_mistakes_nl","proposed_category","difficulty")

def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,
        sort_keys=True,separators=(",",":")).encode("utf-8")).hexdigest()

def guard(condition,reason):
    if not condition: raise ValueError("TK504_APPROVAL_RECONCILE_BLOCKED: "+reason)

def reconcile(stage,translations,decision,ecs=None):
    guard(isinstance(stage,list) and len(stage)==582,"stage inventory")
    guard(isinstance(translations,list) and len(translations)==582,"translation inventory")
    guard(decision.get("decision_id")==APPROVAL_ID and
          decision.get("status")=="OWNER_EXPLICIT_BULK_CONTENT_APPROVAL" and
          all(v is False for v in decision.get("access_release",{}).values()) and
          len(decision.get("access_release",{}))>=7,
          "approval must not be release")
    lookup={row["catalog_id"]:row for row in stage}
    texts={row["catalog_id"]:row for row in translations}
    guard(len(lookup)==582 and len(texts)==582,"duplicates")
    guard(all(lookup[f"TK-{i:06d}"]["source"]["provider_id"]==
              texts[f"TK-{i:06d}"]["source"]["provider_id"]
              for i in range(START,END+1)), "vendor-source crosswalk")
    current=material(stage,translations)
    approved=decision["content_fingerprint"]
    exact_batch=[]
    for current_batch,approved_batch in zip(current["batches"],approved["batches"]):
        guard(current_batch["batch"]==approved_batch["batch"] and
              current_batch["from"]==approved_batch["from"] and
              current_batch["through"]==approved_batch["through"] and
              current_batch["count"]==approved_batch["count"],
              "batch boundary changed")
        exact_batch.append(current_batch["display_sha256"]==approved_batch["display_sha256"])
    exact_global=current["display_sha256"]==approved["display_sha256"]
    guard(exact_global==all(exact_batch),
          "inconsistent batch/global decision fingerprint")
    differences=[]
    if not exact_global:
        # Do not fabricate which individual items were approved:
        # only the 15 existing batch digests are part of the owner record.
        differences=[n+1 for n,ok in enumerate(exact_batch) if not ok]
    projection_mismatch=[]
    variant_count=0
    for i in range(START,END+1):
        cid=f"TK-{i:06d}"
        rec=texts[cid]
        if ecs is not None:
            ec=ecs[cid]
            guard(ec["source"]["provider_id"]==rec["source"]["provider_id"],
                  "ECS projection source mismatch")
            if any(ec.get("translations",{}).get(key)!=rec.get("translations",{}).get(key)
                   for key in ("name_nl","shortDescription_nl","instructions_nl","commonMistakes_nl")):
                projection_mismatch.append(cid)
            variant_count+=ec.get("name_variant_requires_review") is True
        else:
            variant_count+=rec.get("name_variant_requires_review") is True
    # Separate owner-reviewed fields from overlay draft aliases, long-form,
    # claims, evidence/taxonomy and scientific inferences.
    status=("EXACT_OWNER_APPROVED_DISPLAY_FIELDS" if exact_global and
            not projection_mismatch else "BLOCKED_MISMATCH_WITH_APPROVED_CONTENT")
    return {
      "schema":"tk504-owner-approved-display-reconcile/1.0",
      "decision_id":APPROVAL_ID,
      "status":status,
      "source_counts":{"existing":226,"candidate":356,"batches":15},
      "decision_display_sha256":approved["display_sha256"],
      "observed_display_sha256":current["display_sha256"],
      "batch_matches":sum(exact_batch),
      "mismatched_batches":differences,
      "ecs_approved_field_mismatch_count":len(projection_mismatch),
      "ecs_approved_field_mismatch_ids":projection_mismatch,
      "nl_variant_review_indicators":variant_count,
      "approved_fields":list(FIELDS),
      "excluded_fields":["longDescription_nl","benefits_nl","useCases_nl",
         "all_unshown_metadata","AI_suggestions","media_rights","execution_release"],
      "publication_authorized":False,
      "media_entitlements_created":False,
      "database_writes":False,
      "release_flags_changed":False
    }

def outside(path):
    p=path.resolve()
    return p!=ROOT and ROOT not in p.parents

def main(argv):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--stage",type=pathlib.Path,required=True)
    ap.add_argument("--translations",type=pathlib.Path,required=True)
    ap.add_argument("--ecs-translations",type=pathlib.Path)
    ap.add_argument("--decision",type=pathlib.Path,required=True)
    ap.add_argument("--out",type=pathlib.Path)
    x=ap.parse_args(argv)
    for f in (x.stage,x.translations,x.ecs_translations):
        if f is not None:guard(f.is_absolute() and outside(f),
                             "licensed source must be outside Git")
    stage=json.loads(x.stage.read_text(encoding="utf-8-sig"))
    trans=json.loads(x.translations.read_text(encoding="utf-8-sig"))
    decision=json.loads(x.decision.read_text(encoding="utf-8-sig"))
    ecs=json.loads(x.ecs_translations.read_text(encoding="utf-8-sig")) if x.ecs_translations else None
    ecs_by={r["catalog_id"]:r for r in ecs["items"]} if ecs else None
    report=reconcile(stage["catalog"],trans["items"],decision,ecs_by)
    if x.out:
        guard(x.out.is_absolute() and outside(x.out) and x.out.parent.exists(),
              "private destination outside repository required")
        # Exclusive file creation; never overwrite another review or approval.
        with x.out.open("x",encoding="utf-8") as stream:
            json.dump(report,stream,ensure_ascii=False,indent=2)
            stream.write("\n")
    safe={k:v for k,v in report.items() if k not in
          ("ecs_approved_field_mismatch_ids",)}
    print(json.dumps(safe,ensure_ascii=False))
    return 0 if report["status"]=="EXACT_OWNER_APPROVED_DISPLAY_FIELDS" else 2

if __name__=="__main__":
    try:sys.exit(main(sys.argv[1:]))
    except (ValueError,KeyError,TypeError,FileNotFoundError,FileExistsError) as exc:
        print("TK504_PRIVATE_APPROVAL_RECONCILE_FAILED: "+
              str(exc).splitlines()[0][:180],file=sys.stderr)
        sys.exit(1)