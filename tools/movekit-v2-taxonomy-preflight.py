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

FIELDS=(('primaryMuscles','muscles'),('secondaryMuscles','muscles'),('equipment','equipment'))
REASON_KEY={'primary':'primaryMuscles','secondary':'secondaryMuscles'}
PREFLIGHT_SCHEMA='tk504-v2-taxonomy-preflight/1.1'
AUTO_MARK='auto_completed_from_source_not_approved'

def canonical_sha(value):
    raw=json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':'))
    return hashlib.sha256(raw.encode('utf8')).hexdigest()

def registry_sha256(taxonomy):
    """Canonical digest of the whole PROPOSED registry (key order independent)."""
    return canonical_sha(taxonomy)

def source_term_set(source, taxonomy):
    """Exact (field,term) pairs of the 3 supplier fields that belong to the registry.
    Derived ONLY from supplier record + registry, never from AI rationale. Each pair once."""
    pairs=[]
    for key,table in FIELDS:
        values=source.get(key,[])
        require(isinstance(values,list) and all(isinstance(v,str) for v in values),
                'SOURCE_FIELD_INVALID: '+key)
        for term in values:
            if term in taxonomy[table] and (key,term) not in pairs:
                pairs.append((key,term))
    return pairs

def parse_reason(reason, source, taxonomy):
    listed=[]
    for segment in reason.split('; '):
        found=re.fullmatch(r'(primary|secondary):(.+?) ontbreekt exacte goedgekeurde mapping',segment)
        if found:
            field,term=found.groups()
            key=REASON_KEY[field]
            table=taxonomy['muscles']
        else:
            found=re.fullmatch(r'equipment:(.+?) ontbreekt canonieke code',segment)
            require(bool(found), 'UNSUPPORTED_REASON: '+segment)
            term=found.group(1)
            key='equipment'
            table=taxonomy['equipment']
        require(term in source.get(key,[]), 'SOURCE_TERM_NOT_FOUND')
        require(term in table, 'TERM_NOT_REVIEWED: '+term)
        require((key,term) not in listed, 'DUPLICATE_REASON_TERM: '+key+':'+term)
        listed.append((key,term))
    return listed

def annotate(deferred, ledger, suppliers, taxonomy):
    require(taxonomy.get('status')=='PROPOSED_NOT_APPROVED', 'MAP_STATUS_INVALID')
    by_id = {r['catalog_id']:r for r in ledger}
    by_slug = {r['slug']:r for r in suppliers}
    require(len(by_id)==len(ledger) and len(by_slug)==len(suppliers), 'DUPLICATE_SOURCE_ID')
    seen=set()
    cases=[]
    others=[]
    digest_rows=[]
    auto_total=0
    for r in deferred:
        cid=r['catalog_id']
        require(cid not in seen, 'DUPLICATE_ID')
        seen.add(cid)
        reason=r['reason']
        if not reason.startswith(('primary:','secondary:','equipment:')):
            others.append(cid)
            continue
        require(cid in by_id, 'LEDGER_ID_MISSING')
        entry=by_id[cid]
        require(entry['decision']=='DEFER', 'UNEXPECTED_LEDGER_STATUS')
        require(entry['provider_id'] in by_slug, 'SUPPLIER_ROW_MISSING')
        source=by_slug[entry['provider_id']]
        require(record_hash(source)==entry['supplier_record_sha256'], 'SUPPLIER_RECORD_CHANGED')
        listed=parse_reason(reason,source,taxonomy)
        expected=source_term_set(source,taxonomy)
        require(set(listed)<=set(expected), 'REASON_TERM_OUTSIDE_SOURCE_SET')
        annotations=[]
        for key,term in expected:
            table=taxonomy[dict(FIELDS)[key]]
            auto=(key,term) not in listed
            auto_total+=auto
            digest_rows.append([cid,key,term])
            note={'source_field':key,'source_term':term,
                  'proposed':table[term], 'approved':False,
                  'provenance':AUTO_MARK if auto else 'ai_reason_confirmed_against_source'}
            annotations.append(note)
        cases.append({'catalog_id':cid,'provider_id':entry['provider_id'],
                      'supplier_record_sha256':entry['supplier_record_sha256'],
                      'original_primary':source['primaryMuscles'],
                      'original_secondary':source['secondaryMuscles'],
                      'original_equipment':source['equipment'],
                      'proposed_annotations':annotations,
                      'status':'TERMS_COVERED_HUMAN_REVIEW_REQUIRED'})
    return {'schema':PREFLIGHT_SCHEMA,
            'status':'PRIVATE_PROPOSALS_NO_PRODUCTION_RELEASE',
            'registry_sha256':registry_sha256(taxonomy),
            'expected_source_term_count':len(digest_rows),
            'expected_source_term_set_sha256':canonical_sha(digest_rows),
            'auto_completed_annotation_count':auto_total,
            'covered_count':len(cases),'special_count':len(others),
            'cases':cases,'special_ids':others,
            'raw_supplier_records_mutated':False,'db_writes':False,
            'human_approved':False,'app_activated':False}

def main(repo,private,output):
    repo,private,output=map(lambda x:Path(x).resolve(),(repo,private,output))
    require(output.parent==private and not output.exists(), 'OUTPUT_MUST_BE_NEW_PRIVATE_FILE')
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
                      'auto_completed_annotations':result['auto_completed_annotation_count'],
                      'registry_sha256':result['registry_sha256'],
                      'output':str(output)},ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--private',required=True)
    p.add_argument('--output',required=True)
    p.add_argument('--repo',default=str(Path(__file__).resolve().parent.parent))
    a=p.parse_args()
    main(a.repo,a.private,a.output)
