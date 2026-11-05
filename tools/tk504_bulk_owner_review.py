#!/usr/bin/env python3
"""TK504 explicit owner batch CONTENT approval; never a production release.

An owner instruction authorizes the displayed content of 15 review batches,
not evidence of 356 individual reviews, rights, entitlements, or activation.
The material signature pins the exact *displayed* Dutch fields, supplier IDs,
proposal categories and difficulties. Raw licensed source text stays private.
"""
import argparse
import hashlib
import json
from pathlib import Path

START = 227
END = 582
COUNT = END - START + 1
BATCH = 25
BATCHES = 15
SCHEMA = "trainingskompas-movekit-v2-batch-owner-content-review/1.0"
STATUS = "OWNER_EXPLICIT_BULK_CONTENT_APPROVAL"
UTTERANCE = "ik keur batch 1 tm 15 goed"
RELEASE_FLAGS = (
    "production_release_authorized",
    "server_entitlement_approved",
    "grant_migration_authorized",
    "signed_url_production_tested",
    "android_physical_device_tested",
    "public_media_cutover_authorized",
    "batch_356_release_authorized",
)


def digest(value):
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
                  ).encode("utf-8")
    ).hexdigest()


def require(test, reason):
    if not test:
        raise ValueError("TK504_OWNER_APPROVAL_BLOCKED: " + reason)


def display_entry(catalog_id, stage, translation, first):
    row = stage[catalog_id]
    tr = translation[catalog_id]
    source = row["source"]
    require(source["provider"] == "movekit", "Source provider mismatch")
    require(tr["group"] == "UNRELEASED_CANDIDATE", "Only staged candidates allowed")
    require(tr["translation_status"] ==
            "DRAFT_NOT_HUMAN_REVIEWED_NOT_PUBLISHED",
            "Unexpected draft translation state")
    require(row["_review"]["status"] == "NOT_PUBLISHED", "Released row rejected")
    proposal = row["_review"].get("feedback",{}).get("ai_classification_proposal",{})
    category = "mobility" if catalog_id == "TK-000227" else proposal.get(
        "category") or row["identity"]["category"]
    t = tr["translations"]
    return {
        "catalog_id": catalog_id,
        "provider_id": source["provider_id"],
        "name_nl": t["name_nl"],
        "short_description_nl": t["shortDescription_nl"],
        "instructions_nl": t["instructions_nl"],
        "common_mistakes_nl": t["commonMistakes_nl"],
        "proposed_category": category,
        "difficulty": row["identity"]["difficulty"],
    }


def material(stage_items, translation_items):
    stage = {x["catalog_id"]: x for x in stage_items}
    translation = {x["catalog_id"]: x for x in translation_items}
    require(len(stage)==len(stage_items), "Duplicate staged canonical IDs")
    require(len(translation)==len(translation_items), "Duplicate translation IDs")
    require(len(translation)==582, "Translation inventory must contain 582")
    selected=[]
    for i in range(START, END+1):
        cid=f"TK-{i:06d}"
        require(cid in stage and cid in translation, "Missing reviewed material " + cid)
        selected.append(display_entry(cid, stage, translation, i==START))
    ranges=[]
    for idx in range(BATCHES):
        offset=idx*BATCH
        chunk=selected[offset:offset+BATCH]
        start=START+offset
        ranges.append({
            "batch":idx+1,
            "from":f"TK-{start:06d}",
            "through":chunk[-1]["catalog_id"],
            "count":len(chunk),
            "display_sha256":digest(chunk),
        })
    require(len(selected)==COUNT
            and len(ranges)==BATCHES
            and sum(x["count"] for x in ranges)==COUNT
            and ranges[-1]["count"]==6, "Wrong batch coverage")
    return {"display_sha256":digest(selected), "batches":ranges}


def create_manifest(stage_items, translation_items):
    pinned=material(stage_items,translation_items)
    return {
        "schema": SCHEMA,
        "decision_id": "TK504-20261105-OWNER-BATCHES-01-15",
        "decision_date": "2026-11-05",
        "status": STATUS,
        "decision_utterance": UTTERANCE,
        "decision_origin": "explicit product owner ChatGPT approval after accessible 15-batch local review",
        "review_evidence_type": "owner_bulk_instruction_not_356_separate_per_item_signatures",
        "scope": {
            "first_catalog_id":"TK-000227",
            "last_catalog_id":"TK-000582",
            "content_approved_count":COUNT,
            "batch_count":BATCHES,
            "batch_size":25,
            "last_batch_size":6,
            "approved_display_sections":[
                "nl_display_name","nl_short_description","nl_execution_steps",
                "nl_common_mistakes","displayed_ai_proposed_category",
                "displayed_difficulty","local_review_ux"
            ],
            "excluded_sections":[
                "unshown_long_descriptions","unshown_benefits",
                "unshown_use_cases","scientific_inferences",
                "trainability","training_prescriptions",
                "calculation_engine_changes","supplier_media_license",
                "live_account_entitlements","release_authorization"
            ],
        },
        "content_fingerprint": pinned,
        "access_release": {name:False for name in RELEASE_FLAGS},
        "warnings":[
            "A single blanket content approval is not evidence that each of 356 exercises was individually inspected.",
            "AI category proposals remain subject to correctness/validation tests beyond owner-visible content approval.",
            "Status is for the local review and evidence record, not for live publishing.",
            "Existing individual TK-000227 approval remains separately recorded.",
        ],
    }


def verify(manifest, stage_items, translation_items):
    expected=create_manifest(stage_items,translation_items)
    require(manifest==expected,"Decision status, scope, or reviewed display content differs")
    require(all(v is False for v in manifest["access_release"].values()),
            "Release flag must be false")
    return True


def cli():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--stage",required=True,type=Path)
    p.add_argument("--translations",required=True,type=Path,
                   help="Only the PRIVATE NL overlay extracted from the licensed ZIP in memory")
    p.add_argument("--output",required=True,type=Path)
    p.add_argument("--record-exact-owner-utterance",required=True)
    args=p.parse_args()
    require(args.record_exact_owner_utterance==UTTERANCE,
            "No matching explicit owner instruction")
    import zipfile
    stage=json.loads(args.stage.read_text(encoding="utf-8-sig"))
    with zipfile.ZipFile(args.translations) as z:
        translation=json.loads(z.read(
            "TK504-NL-CANONICAL-OVERLAY-582-20261105.json"))
    m=create_manifest(stage["catalog"],translation["items"])
    require(args.output.parent.is_dir(), "Output directory does not exist")
    args.output.write_text(json.dumps(m,ensure_ascii=False,indent=2)+"\n",
                           encoding="utf-8")
    print("TK504_BULK_OWNER_CONTENT_RECORDED "+str({
      "batches":BATCHES,"items":COUNT,
      "release_flags":{k:v for k,v in m["access_release"].items()},
      "source_data_emitted":False,
    }))


if __name__=="__main__":
    cli()
