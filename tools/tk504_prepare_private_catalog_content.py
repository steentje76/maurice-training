#!/usr/bin/env python3
"""TK504: prepare PRIVATE 356-row staging JSON from exact owner-approved content.

Never publish, create grants, update Supabase, or copy licensed text into Git.
The 15 already-approved batch fingerprints are authoritative for DISPLAYED
fields only; non-reviewed scientific/taxonomic fields stay flagged separately.
"""
import argparse
import hashlib
import json
import pathlib
import sys
from tk504_owner_approval_reconcile import reconcile, outside, digest
from tk504_bulk_owner_review import display_entry, START, END

def require(ok,code):
    if not ok: raise ValueError("TK504_PRIVATE_PUBLICATION_STAGING_BLOCKED: "+code)

def safe_text(v,max_len=400):
    return isinstance(v,str) and 0<len(v.strip())<=max_len and not any(
      ord(ch)<32 or ch in "<>" for ch in v)

def safe_array(a):
    return isinstance(a,list) and len(a)<=40 and all(safe_text(x) for x in a)

def stage_content(stage,translation,approval,ecs=None):
    report=reconcile(stage,translation,approval,ecs)
    require(report["status"]=="EXACT_OWNER_APPROVED_DISPLAY_FIELDS",
            "EXACT_OWNER_BATCH_DISPLAY_FINGERPRINT_NOT_MATCHED")
    by_stage={x["catalog_id"]:x for x in stage}
    by_trans={x["catalog_id"]:x for x in translation}
    records=[]
    for i in range(START,END+1):
        cid=f"TK-{i:06d}"
        src=by_stage[cid]
        seen=display_entry(cid,by_stage,by_trans,i==START)
        I=src.get("identity",{})
        provider=seen["provider_id"]
        require(src.get("_review",{}).get("status")=="NOT_PUBLISHED",
                "SOURCE_IS_NOT_UNPUBLISHED")
        require(src["source"]["provider"]=="movekit" and
                src["source"]["provider_id"]==provider,
                "CANONICAL_PROVIDER_MISMATCH")
        approved_name=seen["name_nl"]
        short=seen["short_description_nl"]
        cues=seen["instructions_nl"]
        mistakes=seen["common_mistakes_nl"]
        category=seen["proposed_category"]
        difficulty=seen["difficulty"]
        require(all(safe_text(x) for x in
            (approved_name,short,category,difficulty,I.get("name"),
             I.get("type"),I.get("family"),I.get("pattern"))),
            "UNSAFE_OR_MISSING_TEXT")
        require(safe_array(cues) and safe_array(mistakes) and
          len(cues)>=1,"UNSAFE_OR_MISSING_EXECUTION_STEPS")
        require(all(safe_array(I.get(k)) for k in
          ("primary","secondary","equipment","goals")),
          "INVALID_SOURCE_TAXONOMY")
        # The EXISTING app consumes this SAME canonical metadata shape.
        # Scientific scores/inferences, alternate exercises and injury flags
        # are NOT invented. Only cues, mistakes and short copy were approved.
        metadata={
          "catalog_id":cid,
          "source":{"provider":"movekit","provider_id":provider},
          "identity":{
             "name":I["name"],"nl":approved_name,
             "category":category,"family":I["family"],
             "pattern":I["pattern"],"type":I["type"],
             "difficulty":difficulty,
             "primary":I["primary"],"secondary":I["secondary"],
             "equipment":I["equipment"],"goals":I["goals"]
          },
          "intelligence":{
              "cues":list(cues),"mistakes":list(mistakes),
              "shortDescription_nl":short
          },
          "relations":{"alternatives":[],"progressions":[],"regressions":[]},
          "flags":{"home_gym_ready":False,"travel_ready":False,
                   "injury_flags":[]},
          "assets":[],
          "provenance":{
              "owner_display_approval":approval["decision_id"],
              "approved_item_fingerprint":digest(seen),
              "unreviewed_taxonomy_metadata":True,
              "unreviewed_scientific_claims_excluded":True,
              "media_rights_not_granted":True
          }
        }
        records.append({
          "catalog_id":cid,"provider_id":provider,
          "metadata":metadata,"status":"staged",
          "reviewed_at":None,"approved_at":None,"published_at":None
        })
    require(len(records)==356 and len({r["provider_id"] for r in records})==356,
            "NOT_EXACTLY_356_UNIQUE_PROVIDER_RECORDS")
    return {
      "schema":"tk504-private-approved-content-staging/1.0",
      "status":"STAGED_ONLY_NO_PUBLICATION_AUTHORITY",
      "owner_decision":approval["decision_id"],
      "approved_display_sha256":report["decision_display_sha256"],
      "count":356,"start":"TK-000227","end":"TK-000582",
      "publication_authorized":False,"media_entitlements_created":False,
      "db_writes":False,
      "records":records
    }

def main(argv):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--stage",type=pathlib.Path,required=True)
    ap.add_argument("--translations",type=pathlib.Path,required=True)
    ap.add_argument("--decision",type=pathlib.Path,required=True)
    ap.add_argument("--ecs-translations",type=pathlib.Path)
    ap.add_argument("--out",type=pathlib.Path,required=True)
    a=ap.parse_args(argv)
    for path in (a.stage,a.translations,a.ecs_translations,a.out):
        if path is not None: require(path.is_absolute() and outside(path),
               "PRIVATE_PATH_OUTSIDE_GIT_REQUIRED")
    require(a.out.parent.is_dir(),"PRIVATE_OUTPUT_DIRECTORY_NOT_FOUND")
    stage=json.loads(a.stage.read_text(encoding="utf-8-sig"))
    translated=json.loads(a.translations.read_text(encoding="utf-8-sig"))
    owner=json.loads(a.decision.read_text(encoding="utf-8-sig"))
    ec=json.loads(a.ecs_translations.read_text(encoding="utf-8-sig")) if a.ecs_translations else None
    ecs_by={i["catalog_id"]:i for i in ec["items"]} if ec else None
    plan=stage_content(stage["catalog"],translated["items"],owner,ecs_by)
    # No stdout licensed data. Private file exclusively created, never replaced.
    with a.out.open("x",encoding="utf-8") as stream:
        json.dump(plan,stream,ensure_ascii=False,sort_keys=True,
                  separators=(",",":"))
        stream.write("\n")
    print(json.dumps({
      "status":plan["status"],"count":plan["count"],
      "approved_display_sha256":plan["approved_display_sha256"],
      "output_sha256":hashlib.sha256(a.out.read_bytes()).hexdigest(),
      "db_writes":False,"release":False}))
    return 0

if __name__=="__main__":
    try:sys.exit(main(sys.argv[1:]))
    except (ValueError,KeyError,TypeError,FileNotFoundError,FileExistsError) as exc:
        print("TK504_PRIVATE_STAGING_FAILED: "+str(exc)[:180],file=sys.stderr)
        sys.exit(1)
