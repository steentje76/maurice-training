#!/usr/bin/env python3
"""Combine pinned supplier catalog, AI/owner proposals and exact taxonomy terminology.
PRIVATE REVIEW ONLY. Never writes media, public catalog, DB, grants or live runtime.
"""
import argparse
import copy
import hashlib
import importlib.util
import json
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
def need(ok,code):
    if not ok: raise ValueError(code)
def read(path):
    return json.loads(Path(path).read_text(encoding='utf8'))
def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def load_module(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    m=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m
CAT=load_module('mk_stage',ROOT/'tools/movekit-catalog-stage.py')
TAX=load_module('mk_taxonomy',ROOT/'tools/movekit-v2-taxonomy-preflight.py')
LEDGER=load_module('mk_review_ledger',ROOT/'tools/movekit-review-ledger.py')

def verify_owner_feedback(feedback,reconciled,ai_sha,supplier_sha):
    need(feedback.get('schema')=='tk504-owner-feedback/1.0' and
         feedback.get('scope')=='OWNER_FEEDBACK_NOT_PRODUCTION_APPROVAL',
         'INVALID_RAW_OWNER_FEEDBACK')
    need(feedback.get('source_sha256')==ai_sha and
         feedback.get('supplier_sha256')==supplier_sha,
         'RAW_OWNER_SOURCE_CHANGED')
    source=feedback.get('items')
    routes=reconciled.get('routes')
    need(isinstance(source,list) and isinstance(routes,list) and
         len(source)==len(routes)==26,'OWNER_ITEM_COUNT_CHANGED')
    seen=set()
    by_route={x['catalog_id']:x for x in routes}
    need(len(by_route)==26,'OWNER_ROUTE_DUPLICATE_ID')
    for row in source:
        cid=row['catalog_id']
        need(cid not in seen and cid in by_route,'OWNER_UNEXPECTED_OR_DUPLICATE_ID')
        seen.add(cid)
        match=by_route[cid]
        for a,b in (('provider_id','provider_id'),
                    ('supplier_record_sha256','supplier_record_sha256'),
                    ('decision','owner_choice'),('note','owner_note'),
                    ('updated_at','owner_updated_at')):
            need(row[a]==match[b],'OWNER_REPORT_CHANGED:'+cid+':'+a)
    return True

def compile_private(catalog,inventory,suppliers,ledger,ai,terms,owner,metadata_proof=None):
    """Pure projection; all source records and existing 226 entries remain untouched."""
    need(len(catalog['catalog'])==226,'BASELINE_COUNT')
    need(len(suppliers)==582 and len(inventory['items'])==582,'SUPPLIER_COUNT')
    stage=CAT.build(catalog,inventory,suppliers)
    need(stage['catalog'][:226]==catalog['catalog'],'BASELINE_CHANGED')
    need(stage['_status']=='PRIVATE_LOCAL_REVIEW_ONLY_NOT_ACTIVE','STAGE_RELEASE_BOUNDARY')
    need(len(ledger['entries'])==356,'INVALID_REVIEW_LEDGER')
    need(ai['summary']['counts']=={'accept_ai':245,'defer_ai':111},'AI_COUNTS_CHANGED')
    need(terms['status']=='PRIVATE_PROPOSALS_NO_PRODUCTION_RELEASE' and
         terms['covered_count']==85 and terms['special_count']==26,'TERM_REVIEW_NOT_VALID')
    need(owner['status']=='PRIVATE_VERIFIED_OWNER_FEEDBACK_NOT_AUTHENTICATED_APPROVAL'
         and owner['total']==26 and len(owner['routes'])==26,'OWNER_REVIEW_NOT_VALID')
    source_by_slug={r['slug']:r for r in suppliers}
    need(len(source_by_slug)==582,'SUPPLIER_DUPLICATE')
    by_ledger={r['catalog_id']:r for r in ledger['entries']}
    by_terms={r['catalog_id']:r for r in terms['cases']}
    by_owner={r['catalog_id']:r for r in owner['routes']}
    need(len(by_ledger)==356 and len(by_terms)==85 and len(by_owner)==26,'DUPLICATE_REVIEW_ID')
    need(set(by_terms).isdisjoint(by_owner),'CONFLICTING_REVIEW_GROUPS')
    by_metadata={}
    if metadata_proof is not None:
        need(metadata_proof.get('status')=='PRIVATE_CORRECTIONS_NOT_RELEASED' and
             metadata_proof.get('owner_metadata_cases')==12,
             'INVALID_METADATA_PROOF')
        by_metadata={x['catalog_id']:x for x in metadata_proof['corrections']}
        need(len(by_metadata)==12,'DUPLICATE_METADATA_CASE')
        need(set(by_metadata)=={cid for cid,x in by_owner.items()
              if x['owner_choice']=='meta'},'METADATA_OWNER_ROUTE_MISMATCH')
    need(set(by_ledger)==set(r['catalog_id'] for r in stage['catalog'][226:]),'REVIEW_ID_SET_CHANGED')
    variant_links={}
    if 'possible_duplicate_groups' in owner:
        comparisons=owner['possible_duplicate_groups']
        need(len(comparisons)==3,'VARIANT_PAIR_COUNT')
        by_inventory={x['catalog_id']:x for x in inventory['items']}
        for pair in comparisons:
            ids=pair.get('catalog_ids')
            need(isinstance(ids,list) and len(ids)==2 and ids[0]!=ids[1],
                 'INVALID_VARIANT_PAIR')
            a,b=ids
            need(a in by_owner and b in by_owner and
                 by_owner[a]['owner_choice']==by_owner[b]['owner_choice']=='variant'
                 and a not in variant_links and b not in variant_links,
                 'INVALID_OWNER_VARIANT_PAIR')
            same=by_inventory[a]['video']['sha256']==by_inventory[b]['video']['sha256']
            need(same==pair['same_video_sha256'] and
                 pair['status']=='OWNER_MARKED_VARIANT_NOT_AUTODEDUPED',
                 'VARIANT_VIDEO_INTEGRITY_CHANGED')
            variant_links[a]={'peer_catalog_id':b,'video_bytes_identical':same}
            variant_links[b]={'peer_catalog_id':a,'video_bytes_identical':same}
        need(set(variant_links)=={cid for cid,x in by_owner.items()
             if x['owner_choice']=='variant'},'UNPAIRED_OWNER_VARIANT')
    counts=Counter()
    for item in stage['catalog'][226:]:
        cid=item['catalog_id']
        review=by_ledger[cid]
        slug=item['source']['provider_id']
        need(review['provider_id']==slug,'REVIEW_PROVIDER_CHANGED')
        need(TAX.record_hash(source_by_slug[slug])==review['supplier_record_sha256'],
             'STALE_SUPPLIER_RECORD')
        kind=review['decision']
        need(kind in ('ACCEPT','DEFER'),'UNKNOWN_REVIEW_DECISION')
        if kind=='ACCEPT':
            need(review['review']['kind']=='AI' and isinstance(review['classification'],dict),
                 'AI_PROPOSAL_MISSING')
            need(cid not in by_terms and cid not in by_owner,'ACCEPTED_ID_COLLISION')
            route='AI_PROPOSAL_PENDING_HUMAN_REVIEW'
            evidence={'ai_classification_proposal':copy.deepcopy(review['classification'])}
        elif cid in by_terms:
            source_terms=by_terms[cid]
            need(source_terms['supplier_record_sha256']==review['supplier_record_sha256']
                 and source_terms['provider_id']==slug,'TERM_SOURCE_CHANGED')
            need(source_terms['status']=='TERMS_COVERED_HUMAN_REVIEW_REQUIRED',
                 'TERM_ROUTE_INVALID')
            route='SOURCE_TERM_PROPOSAL_PENDING_HUMAN_REVIEW'
            evidence={'proposed_exact_vocabulary':copy.deepcopy(source_terms['proposed_annotations'])}
        else:
            need(cid in by_owner,'DEFERRED_WITHOUT_OWNER_REVIEW')
            feedback=by_owner[cid]
            need(feedback['provider_id']==slug and
                 feedback['supplier_record_sha256']==review['supplier_record_sha256'],
                 'OWNER_SOURCE_CHANGED')
            need(feedback['owner_choice'] in ('apart','meta','variant','hold','exclude'),
                 'INVALID_OWNER_CHOICE')
            route='OWNER_FEEDBACK_PENDING_CONTENT_REVIEW'
            evidence={'owner_choice':feedback['owner_choice'],
                      'owner_note':feedback['owner_note'],
                      'proposed_route':feedback['suggested_route']}
            if cid in variant_links:
                evidence['variant_pair']={**variant_links[cid],
                    'identity_retained':True,
                    'automated_deduplication_permitted':False,
                    'formal_variant_relation_approved':False}
            if cid in by_metadata:
                meta=by_metadata[cid]
                need(meta['provider_id']==slug and
                     meta['supplier_record_sha256']==review['supplier_record_sha256'] and
                     meta['review_status']=='EVIDENCED_CORRECTION_PROPOSAL_NOT_APPROVED' and
                     meta['supplier_equipment_unchanged']==source_by_slug[slug]['equipment'] and
                     meta['supplier_primary_muscles_unchanged']==source_by_slug[slug]['primaryMuscles'] and
                     meta['supplier_movement_patterns_unchanged']==source_by_slug[slug]['movementPattern'],
                     'SOURCE_METADATA_PROOF_CHANGED')
                evidence['source_metadata_proposal']={
                    'issue':meta['issue'],
                    'supporting_supplier_terms':copy.deepcopy(meta['supporting_supplier_terms']),
                    'suggested_additional_equipment_facets':copy.deepcopy(meta['suggested_additional_equipment_facets']),
                    'approved':False}
        review_block=item['_review']
        need(review_block['status']=='NOT_PUBLISHED','PREVIOUS_RELEASE_DETECTED')
        review_block.update({'integration_status':'HOLD_FOR_HUMAN_AND_RELEASE_GATES',
                             'review_route':route,
                             'source_record_sha256':review['supplier_record_sha256'],
                             'feedback':evidence,
                             'confirmed_by_authenticated_reviewer':False,
                             'supplier_metadata_modified':False})
        need(item['identity']['category']=='pending_review','PREMATURE_CLASSIFICATION')
        need(item['assets']==[],'PREMATURE_MEDIA_RELEASE')
        need(item['intelligence']['fatigue'] is None
             and item['intelligence']['recovery'] is None
             and item['intelligence']['confidence'] is None,
             'INVENTED_TRAINING_CALCULATION')
        counts[route]+=1
    need(counts=={'AI_PROPOSAL_PENDING_HUMAN_REVIEW':245,
                  'SOURCE_TERM_PROPOSAL_PENDING_HUMAN_REVIEW':85,
                  'OWNER_FEEDBACK_PENDING_CONTENT_REVIEW':26},
         'INCOMPLETE_REVIEW_COVERAGE')
    need(stage['catalog'][:226]==catalog['catalog'],'PUBLISHED_EXERCISE_CHANGED')
    stage.update({'_schema':'tk504-private-v2-582-review-projection/1.0',
                  '_status':'PRIVATE_REVIEW_NOT_RELEASED',
                  '_review_counts':dict(counts),
                  '_review_total':356,'_approved_for_import':0,
                  '_media_grants_created':0,'_app_activated':False,
                  '_history_updates':0,'_personal_exercise_updates':0})
    return stage

def run(source,output):
    source=Path(source).resolve()
    private=(source/'.tk-private-review').resolve()
    output=Path(output).resolve()
    need(output.parent==private and output.suffix=='.json'
         and not output.exists(),'PRIVATE_OUTPUT_PATH_REQUIRED')
    sources={
      'supplier':source/'complete-exercise-library-metadata/metadata.json',
      'catalog':ROOT/'exercise-catalog.json',
      'inventory':ROOT/'docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json'}
    ledger=read(private/'TK504-CLASSIFICATION-REVIEW-LEDGER-AI-20261103.json')
    ai_path=private/'TK504-CLASSIFICATION-AI-REVIEW-RESULT-20261103.json'
    terms=read(private/'TK504-V2-TAXONOMY-PREFLIGHT-85-20261103.json')
    owner_path=private/'TK504-EIGENAAR-REVIEW-GECONTROLEERD-20261103.json'
    owner=read(owner_path)
    metadata_proof_path=private/'TK504-V2-OWNER-METADATA-EVIDENCE-12-20261103.json'
    metadata_proof=read(metadata_proof_path)
    for k,p in sources.items():
        need(sha(p)==ledger['source_hashes'][k],'STALE_PINNED_SOURCE:'+k)
    need(terms['supplier_sha256']==sha(sources['supplier']) and
         terms['ai_result_sha256']==sha(ai_path),'STALE_TERM_REPORT')
    need(owner['source_ai_result_sha256']==sha(ai_path)
         and owner['source_supplier_sha256']==sha(sources['supplier']),
         'STALE_OWNER_REVIEW')
    original_feedback=private/'TK504-MOVEKIT-EIGENAAR-BEOORDELINGEN-INGEKOMEN-20261103.json'
    need(owner['source_feedback_sha256']==sha(original_feedback),
         'OWNER_FEEDBACK_FILE_CHANGED')
    verify_owner_feedback(read(original_feedback),owner,sha(ai_path),sha(sources['supplier']))
    need(metadata_proof['source_supplier_sha256']==sha(sources['supplier']) and
         metadata_proof['owner_reconciliation_sha256']==sha(owner_path),
         'STALE_METADATA_PROOF')
    base=read(sources['catalog'])
    inventory=read(sources['inventory'])
    supplier_records=read(sources['supplier'])
    template=LEDGER.make_template(base,inventory,supplier_records,ledger['source_hashes'])
    ledger_validation=LEDGER.validate(ledger,template,base)
    need(ledger_validation['counts']=={'accept_ai':245,'defer_ai':111},
         'INVALID_AI_LEDGER')
    stage=compile_private(base,inventory,supplier_records,ledger,read(ai_path),terms,owner,metadata_proof)
    output.write_text(json.dumps(stage,ensure_ascii=False,indent=2)+'\n',
                      encoding='utf8')
    return {'status':stage['_status'],
            'total':stage['count'],'unchanged_baseline':226,
            'review_count':stage['_review_total'],
            'routes':stage['_review_counts'],
            'output':str(output)}

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--source',default=r'C:\Movikit')
    p.add_argument('--output',required=True)
    a=p.parse_args()
    print(json.dumps(run(a.source,a.output),ensure_ascii=False,indent=2))
