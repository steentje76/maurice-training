#!/usr/bin/env python3
"""Preview exact MoveKit V2 supplier terms; never approve or change catalogue."""
import argparse
import hashlib
import json
import re
from pathlib import Path

def require(valid,message):
    if not valid:
        raise ValueError(message)

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def record_hash(record):
    raw = json.dumps(record,sort_keys=True,ensure_ascii=False,separators=(',',':'))
    return hashlib.sha256(raw.encode('utf8')).hexdigest()

def annotate(deferred, ledger, suppliers, taxonomy):
    by_id = {r['catalog_id']:r for r in ledger}
    by_slug = {r['slug']:r for r in suppliers}
    require(len(by_id)==len(ledger) and len(by_slug)==len(suppliers), 'DUPLICATE_SOURCE_ID')
    seen=set()
    cases=[]
    others=[]
    for r in deferred:
        cid=r['catalog_id']
        require(cid not in seen, 'DUPLICATE_ID')
        seen.add(cid)
        reason=r['reason']
        if not reason.startswith(('primary:','secondary:','equipment:')):
            others.append(cid)
            continue
        entry=by_id[cid]
        require(entry['decision']=='DEFER', 'UNEXPECTED_LEDGER_STATUS')
        source=by_slug[entry['provider_id']]
        require(record_hash(source)==entry['supplier_record_sha256'], 'SUPPLIER_RECORD_CHANGED')
        annotations=[]
        for segment in reason.split('; '):
            found=re.fullmatch(r'(primary|secondary):(.+?) ontbreekt exacte goedgekeurde mapping',segment)
            if found:
                field,term=found.groups()
                key={'primary':'primaryMuscles','secondary':'secondaryMuscles'}[field]
                table=taxonomy['muscles']
            else:
                found=re.fullmatch(r'equipment:(.+?) ontbreekt canonieke code',segment)
                require(bool(found), 'UNSUPPORTED_REASON: '+segment)
                term=found.group(1)
                key='equipment'
                table=taxonomy['equipment']
            require(term in source[key], 'SOURCE_TERM_NOT_FOUND')
            require(term in table, 'TERM_NOT_REVIEWED: '+term)
            annotations.append({'source_field':key,'source_term':term,
                                'proposed':table[term], 'approved':False})
        cases.append({'catalog_id':cid,'provider_id':entry['provider_id'],
                      'supplier_record_sha256':entry['supplier_record_sha256'],
                      'original_primary':source['primaryMuscles'],
                      'original_secondary':source['secondaryMuscles'],
                      'original_equipment':source['equipment'],
                      'proposed_annotations':annotations,
                      'status':'TERMS_COVERED_HUMAN_REVIEW_REQUIRED'})
    return {'schema':'tk504-v2-taxonomy-preflight/1.0',
            'status':'PRIVATE_PROPOSALS_NO_PRODUCTION_RELEASE',
            'covered_count':len(cases),'special_count':len(others),
            'cases':cases,'special_ids':others,
            'raw_supplier_records_mutated':False,'db_writes':False,
            'human_approved':False,'app_activated':False}

def main(repo,private,output):
    repo,private,output=map(lambda x:Path(x).resolve(),(repo,private,output))
    require(output.parent==private, 'OUTPUT_MUST_STAY_PRIVATE')
    supplier=private.parent/'complete-exercise-library-metadata'/'metadata.json'
    catalog=repo/'exercise-catalog.json'
    inventory=repo/'docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json'
    ledger_path=private/'TK504-CLASSIFICATION-REVIEW-LEDGER-AI-20261103.json'
    ai_path=private/'TK504-CLASSIFICATION-AI-REVIEW-RESULT-20261103.json'
    read=lambda p:json.loads(p.read_text(encoding='utf8'))
    ledger=read(ledger_path)
    ai=read(ai_path)
    mapping=read(repo/'tools/movekit-v2-taxonomy-map.json')
    require(mapping['status']=='PROPOSED_NOT_APPROVED', 'MAP_STATUS_INVALID')
    for key,path in (('supplier',supplier),('catalog',catalog),('inventory',inventory)):
        require(digest(path)==ledger['source_hashes'][key], 'STALE_SOURCE: '+key)
    require(len(ledger['entries'])==356 and ai['summary']['counts']=={'accept_ai':245,'defer_ai':111}, 'UNEXPECTED_REVIEW_COUNTS')
    deferred_ids=[x['catalog_id'] for x in ai['deferred']]
    expected_ids=[x['catalog_id'] for x in ledger['entries'] if x['decision']=='DEFER']
    require(len(deferred_ids)==111 and len(set(deferred_ids))==111 and
            set(deferred_ids)==set(expected_ids), 'AI_LEDGER_DEFERRED_MISMATCH')
    result=annotate(ai['deferred'],ledger['entries'],read(supplier),mapping)
    require(result['covered_count']==85 and result['special_count']==26, 'REVIEW_COVERAGE_CHANGED')
    result['supplier_sha256']=digest(supplier)
    result['ai_result_sha256']=digest(ai_path)
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'status':'PASS_STAGING_ONLY','term_cases':85,'content_cases':26,
                      'term_definitions':len(mapping['muscles'])+len(mapping['equipment']),
                      'output':str(output)},ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--private',required=True)
    p.add_argument('--output',required=True)
    p.add_argument('--repo',default=str(Path(__file__).resolve().parent.parent))
    a=p.parse_args()
    main(a.repo,a.private,a.output)
