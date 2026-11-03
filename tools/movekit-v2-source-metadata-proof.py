#!/usr/bin/env python3
"""MoveKit V2: source-evidenced metadata exception review; PRIVATE proposal only."""
import argparse
import hashlib
import json
from pathlib import Path

# Minimal generic evidence tokens; licensed source text is read only from private files.
# Source attributes MUST NOT be silently changed on these proposals.
RULES={
 'TK-000381':('jump-rope',['rope'],['jump_rope'],'EQUIPMENT'),
 'TK-000402':('lunge-sprint',['lunge','no jump'],[],'MOVEMENT_EXECUTION'),
 'TK-000403':('lying-cambered-barbell-row',['cambered','bench'],['bench','cambered_bar'],'EQUIPMENT'),
 'TK-000418':('man-maker',['push-up','row','squat','press'],[],'MULTIPHASE_MOVEMENT'),
 'TK-000421':('muscle-up',['pull-up','dip'],['pull_up_bar'],'MULTIPHASE_MOVEMENT'),
 'TK-000423':('neck-extension',['neck extensors'],['bench'],'SOURCE_MUSCLE_CONFLICT'),
 'TK-000434':('pike-push-up',['pike','inverted v'],[],'SOURCE_NAME_VARIANT'),
 'TK-000539':('sumo-deadlift',['wide-stance'],[],'EXACT_LOWER_BACK_TAG'),
 'TK-000552':('trap-bar-carry',['trap bar'],['trap_bar'],'EQUIPMENT'),
 'TK-000553':('trap-bar-deadlift',['trap bar'],['trap_bar'],'EQUIPMENT'),
 'TK-000566':('wall-ball',['wall target','ball'],['medicine_ball','wall_target'],'EQUIPMENT'),
 'TK-000568':('weighted-pull-ups',['dip belt','extra weight'],['dip_belt'],'EQUIPMENT'),
}
def need(ok,code):
    if not ok: raise ValueError(code)
def sha_file(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def src_sha(r):
    x=json.dumps(r,sort_keys=True,ensure_ascii=False,separators=(',',':'))
    return hashlib.sha256(x.encode('utf8')).hexdigest()
def reconcile(owner,ledger,supplier):
    by_owner={x['catalog_id']:x for x in owner['routes']}
    by_ledger={x['catalog_id']:x for x in ledger['entries']}
    source={x['slug']:x for x in supplier}
    need(len(by_owner)==26 and len(by_ledger)==356 and len(source)==582,
         'INPUT_ID_DUPLICATE_OR_COUNT')
    ids={x['catalog_id'] for x in owner['routes'] if x['owner_choice']=='meta'}
    need(ids==set(RULES),'UNREVIEWED_METADATA_CASES')
    corrections=[]
    for cid,(slug,words,additions,kind) in RULES.items():
        o=by_owner[cid]
        entry=by_ledger[cid]
        need(o['provider_id']==slug==entry['provider_id'],
             'PROVIDER_REFERENCE_CHANGED:'+cid)
        need(o['supplier_record_sha256']==entry['supplier_record_sha256'],
             'OWNER_RECORD_REFERENCE_CHANGED:'+cid)
        row=source[slug]
        need(src_sha(row)==entry['supplier_record_sha256'],
             'SUPPLIER_RECORD_CHANGED:'+cid)
        evidence=' '.join([row.get('name',''),row.get('shortDescription','')]
                          +row.get('instructions',[])).casefold()
        missing=[word for word in words if word not in evidence]
        need(not missing,'SUPPLIER_EVIDENCE_MISSING:'+cid+':'+','.join(missing))
        corrections.append({
          'catalog_id':cid, 'provider_id':slug,
          'supplier_record_sha256':entry['supplier_record_sha256'],
          'owner_choice':o['owner_choice'],
          'owner_note':o['owner_note'],
          'issue':kind,
          'supporting_supplier_terms':words,
          'suggested_additional_equipment_facets':additions,
          'supplier_equipment_unchanged':row.get('equipment',[]),
          'supplier_primary_muscles_unchanged':row.get('primaryMuscles',[]),
          'supplier_movement_patterns_unchanged':row.get('movementPattern',[]),
          'review_status':'EVIDENCED_CORRECTION_PROPOSAL_NOT_APPROVED',
          'safe_for_automatic_import':False,
        })
    return {'schema':'tk504-v2-source-metadata-exceptions/1.0',
            'status':'PRIVATE_CORRECTIONS_NOT_RELEASED',
            'owner_metadata_cases':len(corrections),
            'original_supplier_rows_modified':False,
            'existing_exercise_rows_modified':False,
            'app_activated':False,'corrections':corrections}

def run(source,repo,output):
    source=Path(source).resolve()
    repo=Path(repo).resolve()
    private=(source/'.tk-private-review').resolve()
    output=Path(output).resolve()
    need(output.parent==private and output.suffix=='.json' and not output.exists(),
         'OUTPUT_MUST_BE_NEW_PRIVATE_JSON')
    raw=source/'complete-exercise-library-metadata/metadata.json'
    ledger_path=private/'TK504-CLASSIFICATION-REVIEW-LEDGER-AI-20261103.json'
    owner_path=private/'TK504-EIGENAAR-REVIEW-GECONTROLEERD-20261103.json'
    read=lambda p:json.loads(p.read_text(encoding='utf8'))
    owner,ledger=read(owner_path),read(ledger_path)
    need(sha_file(raw)==ledger['source_hashes']['supplier']
         ==owner['source_supplier_sha256'],'STALE_SUPPLIER_SOURCE')
    result=reconcile(owner,ledger,read(raw))
    result['source_supplier_sha256']=sha_file(raw)
    result['owner_reconciliation_sha256']=sha_file(owner_path)
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    return {'status':result['status'],'evidenced_cases':result['owner_metadata_cases'],
            'source_unchanged':True,'output':str(output)}

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--source',default=r'C:\Movikit')
    ap.add_argument('--repo',default=str(Path(__file__).resolve().parent.parent))
    ap.add_argument('--output',required=True)
    a=ap.parse_args()
    print(json.dumps(run(a.source,a.repo,a.output),ensure_ascii=False,indent=2))
