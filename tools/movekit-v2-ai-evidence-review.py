#!/usr/bin/env python3
"""TK504: read-only source-vs-AI evidence reconciliation. Never approval/import/activation.

All outputs local private drafts. Baseline agreement and equipment correspondence
are *review hints*, never scientific truth or automatic classification.
"""
import argparse
import collections
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
HERE=Path(__file__).resolve().parent

def load_py(name, file):
    spec=importlib.util.spec_from_file_location(name,HERE/file)
    m=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m

LEDGER=load_py('tk504_source_audit_ledger','movekit-review-ledger.py')
TAX=load_py('tk504_source_audit_tax','movekit-classification-review.py')
SCHEMA='tk504-movekit-ai-evidence-review/1.0'
EQUIP_MIN_SUPPORT=3

def need(condition, message):
    if not condition:raise ValueError(message)

def fingerprint(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,
            separators=(',',':')).encode('utf8')).hexdigest()

def strong_equipment_pairs(catalog, supplier):
    """Strictly observed 1-source-term : 1-app-term, at least 3 UNANIMOUS published cases.
    This is historical agreement, NOT a reviewed translation or proof of required equipment.
    """
    by_slug={r['slug']:r for r in supplier}
    counts=collections.defaultdict(collections.Counter)
    for row in catalog['catalog']:
        source=row['source']
        need(source['provider']=='movekit' and source['provider_id'] in by_slug,
             'UNBOUND_PUBLISHED_SOURCE')
        raw=by_slug[source['provider_id']].get('equipment')
        app=row.get('identity',{}).get('equipment')
        if (isinstance(raw,list) and len(raw)==1 and isinstance(raw[0],str)
                and isinstance(app,list) and len(app)==1 and isinstance(app[0],str)):
            counts[raw[0]][app[0]]+=1
    return {term:{'app_tag':list(counter)[0],'published_support':sum(counter.values())}
            for term,counter in counts.items()
            if sum(counter.values())>=EQUIP_MIN_SUPPORT and len(counter)==1}

def summarize(catalog, inventory, supplier, ledger):
    need(isinstance(catalog,dict) and len(catalog.get('catalog',[]))==226,
         'BASELINE_NOT_226')
    need(isinstance(supplier,list) and len(supplier)==582,'SUPPLIER_NOT_582')
    need(isinstance(inventory,dict) and len(inventory.get('items',[]))==582,
         'INVENTORY_NOT_582')
    by_slug={r.get('slug'):r for r in supplier}
    need(len(by_slug)==582,'DUPLICATE_SUPPLIER_SLUG')
    template=LEDGER.make_template(catalog,inventory,supplier,ledger['source_hashes'])
    result=LEDGER.validate(ledger,template,catalog)
    need(result['counts']=={'accept_ai':245,'defer_ai':111},'EXPECTED_245_111_MISSING')
    mapping=strong_equipment_pairs(catalog,supplier)
    count=collections.Counter()
    cases=[]
    exceptions=collections.defaultdict(list)
    for entry in ledger['entries']:
        cid=entry['catalog_id']
        if entry['decision']!='ACCEPT':
            need(entry['decision']=='DEFER','UNEXPECTED_AI_DECISION')
            count['deferred_ai']+=1
            continue
        classification=entry['classification']
        suggestion=entry['suggestion']
        slug=entry['provider_id']
        source=by_slug[slug]
        need(LEDGER.digest(source)==entry['supplier_record_sha256'],'SOURCE_RECORD_CHANGED')
        baseline_status=suggestion['status']
        supporter_count=len(suggestion['supporting_catalog_ids'])
        if baseline_status=='SUGGESTED_UNVERIFIED':
            equal=(classification['category']==suggestion['proposed_category'] and
                   classification['type']==suggestion['proposed_type'])
            comparison='CATEGORY_TYPE_MATCH' if equal else 'CATEGORY_TYPE_DIFFER'
        elif baseline_status=='CONFLICT_REVIEW_REQUIRED':
            comparison='CONFLICTING_PUBLISHED_BASELINE'
        else:
            need(baseline_status=='NO_BASELINE_MATCH','UNKNOWN_SUGGESTION_STATUS')
            comparison='NO_PUBLISHED_BASELINE'
        count[comparison]+=1
        equipment_status='NO_STRONG_EXACT_SINGLE_EQUIPMENT_BASIS'
        equipment_support=0
        target=None
        eq=source.get('equipment')
        if isinstance(eq,list) and len(eq)==1 and eq[0] in mapping:
            target=mapping[eq[0]]['app_tag']
            equipment_support=mapping[eq[0]]['published_support']
            equipment_status=('MATCHES_STRONG_PUBLISHED_EQUIPMENT' if target in
                              classification['equipment'] else
                              'DIFFERS_STRONG_PUBLISHED_EQUIPMENT')
        count[equipment_status]+=1
        identifier=source['slug']
        sig=TAX.signature(source,'pattern+primary')
        need(sig is not None,'NO_SOURCE_SIGNATURE')
        case={'catalog_id':cid,'provider_id':identifier,
              'supplier_record_sha256':entry['supplier_record_sha256'],
              'baseline_comparison':comparison,
              'suggestion_status':baseline_status,
              'supporter_count':supporter_count,
              'equipment_agreement':equipment_status,
              'equipment_supporter_count':equipment_support,
              'equipment_app_tag_historical':target,
              'provisional_only':True,'formal_approval':False}
        cases.append(case)
        if comparison!='CATEGORY_TYPE_MATCH':
            exceptions[sig].append(cid)
    need(count['deferred_ai']==111 and len(cases)==245,'REVIEW_COUNTS_CHANGED')
    # Use canonical, source-only signature for stable group IDs; never descriptions/media.
    grouped=[]
    for signature,cids in sorted(exceptions.items(),key=lambda x:repr(x[0])):
        grouped.append({'source_signature_sha256':fingerprint(signature),
                        'count':len(cids),'catalog_ids':sorted(cids)})
    need(sum(g['count'] for g in grouped)==245-count['CATEGORY_TYPE_MATCH'],
         'EXCEPTION_GROUP_COUNT_CHANGED')
    report={'schema':SCHEMA,'status':'PRIVATE_REVIEW_HINT_NOT_APPROVED',
       'baseline_unchanged':226,'accepted_ai_proposals':245,'deferred_ai_proposals':111,
       'counts':dict(sorted(count.items())),
       'strong_equipment_pair_count':len(mapping),
       'historical_equipment_pairs':mapping,
       'exception_source_groups':grouped,'source_signature_group_count':len(grouped),
       'cases':sorted(cases,key=lambda x:x['catalog_id']),
       'classification_approved':False,'entitlement_granted':False,
       'runtime_activation':False,'db_writes':False,
       'warning':'Catalog similarity/equipment co-occurrence are review hints, not scientific proof or owner approval.'}
    return report

def run(source_root,output):
    root=Path(source_root).resolve(strict=True)
    private=(root/'.tk-private-review').resolve(strict=True)
    output=Path(output)
    need(output.parent.resolve()==private and output.suffix.lower()=='.json' and
         not output.exists(),'OUTPUT_MUST_BE_NEW_PRIVATE_JSON')
    supplier= root/'complete-exercise-library-metadata/metadata.json'
    catalog= ROOT/'exercise-catalog.json'
    inventory= ROOT/'docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json'
    ledger_path= private/'TK504-CLASSIFICATION-REVIEW-LEDGER-AI-20261103.json'
    ledger=json.loads(ledger_path.read_text(encoding='utf8'))
    for name,path in (('supplier',supplier),('catalog',catalog),('inventory',inventory)):
        need(hashlib.sha256(path.read_bytes()).hexdigest()==ledger['source_hashes'][name],
             'STALE_PINNED_'+name.upper())
    data=summarize(json.loads(catalog.read_text(encoding='utf8')),
       json.loads(inventory.read_text(encoding='utf8')),
       json.loads(supplier.read_text(encoding='utf8')),ledger)
    data['bound_sources_sha256']=dict(ledger['source_hashes'])
    # Exclusive creation prevents overwriting any previous private report.
    with output.open('x',encoding='utf8',newline='\n') as f:
        f.write(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    return {'status':data['status'],'output':str(output),'counts':data['counts'],
            'source_signature_group_count':len(data['exception_source_groups']),
            'equivalence_is_not_approval':True}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root',default=r'C:\Movikit')
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    print(json.dumps(run(args.source_root,args.output),ensure_ascii=False,indent=2))
