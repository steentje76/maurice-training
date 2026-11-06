"""Synthetic contract test for the 15-batch owner-approved content fingerprint."""
import copy
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from tk504_owner_approval_reconcile import reconcile
from tk504_bulk_owner_review import create_manifest

stage=[]
translations=[]
for i in range(1,583):
    cid=f"TK-{i:06d}"
    stage.append({
       "catalog_id":cid,
       "source":{"provider":"movekit","provider_id":f"synthetic-provider-{i:06d}"},
       "identity":{"difficulty":"beginner","category":"strength"},
       "_review":{"status":"NOT_PUBLISHED" if i>=227 else "PUBLISHED",
                  "feedback":{"ai_classification_proposal":{"category":"strength"}}}
    })
    translations.append({
       "catalog_id":cid,
       "source":{"provider":"movekit","provider_id":f"synthetic-provider-{i:06d}"},
       "group":"UNRELEASED_CANDIDATE" if i>=227 else "BASELINE",
       "translation_status":"DRAFT_NOT_HUMAN_REVIEWED_NOT_PUBLISHED",
       "translations":{
          "name_nl":f"Synthetische oefening {i:06d}",
          "shortDescription_nl":"Synthetische omschrijving",
          "instructions_nl":["Stap 1","Stap 2"],
          "commonMistakes_nl":["Synthetische fout"]
       }
    })
decision=create_manifest(stage,translations)
tests=0
def check(condition,message):
    global tests
    assert condition,message
    tests+=1
report=reconcile(stage,translations,decision)
check(report["status"]=="EXACT_OWNER_APPROVED_DISPLAY_FIELDS","exact match")
check(report["batch_matches"]==15,"all batches")
check(report["source_counts"]["candidate"]==356,"356 exact")
check(report["publication_authorized"] is False,"owner content cannot publish")
check(report["media_entitlements_created"] is False,"owner content cannot grant videos")
check(report["database_writes"] is False,"read only")
by_id={row["catalog_id"]:copy.deepcopy(row) for row in translations}
check(reconcile(stage,translations,decision,by_id)["status"]==
      "EXACT_OWNER_APPROVED_DISPLAY_FIELDS","ECS projection matches approved fields")
by_id["TK-000227"]["translations"]["instructions_nl"][0]="changed"
result=reconcile(stage,translations,decision,by_id)
check(result["status"]=="BLOCKED_MISMATCH_WITH_APPROVED_CONTENT","ECS content mismatch blocked")
check(result["ecs_approved_field_mismatch_ids"]==["TK-000227"],"exact suspect record")
modified=copy.deepcopy(translations)
modified[226]["translations"]["name_nl"]="unapproved"
result=reconcile(stage,modified,decision)
check(result["mismatched_batches"]==[1] and result["batch_matches"]==14,
      "only original batch 1 invalidated")
modified=copy.deepcopy(translations)
modified[581]["translations"]["commonMistakes_nl"].append("extra")
result=reconcile(stage,modified,decision)
check(result["mismatched_batches"]==[15],"last batch invalidated")
modified=copy.deepcopy(translations)
modified[280]["translations"]["longDescription_nl"]="outside reviewed scope"
result=reconcile(stage,modified,decision)
check(result["status"]=="EXACT_OWNER_APPROVED_DISPLAY_FIELDS",
      "unshown field cannot invalidate owner-approved displayed fields")
check("longDescription_nl" in result["excluded_fields"],"unshown field still excluded")
revoked=copy.deepcopy(decision)
revoked["access_release"]["production_release_authorized"]=True
try:reconcile(stage,translations,revoked)
except ValueError:tests+=1
else:raise AssertionError("release flag unexpectedly permitted")
forged=copy.deepcopy(stage)
forged[227]["source"]["provider_id"]="changed"
try:reconcile(forged,translations,decision)
except ValueError:tests+=1
else:raise AssertionError("provider source mismatch unexpectedly permitted")
print(f"TK504 owner-approved displayed fields: {tests} deterministic synthetic assertions PASS")
