#!/usr/bin/env python3
"""MoveKit V2: source-evidenced metadata exception review; PRIVATE proposal only."""
import argparse
import hashlib
import json
import re
import unicodedata
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
FACET_REGISTRY_PATH=Path(__file__).resolve().parent/'movekit-v2-owner-facet-proposals.json'
FACET_REGISTRY_SCHEMA='tk504-owner-facet-proposals/1.0'
FACET_SOURCE='OWNER_FEEDBACK_NOT_SUPPLIER_ATTRIBUTE'
FACET_KEY=re.compile(r'^[a-z][a-z0-9]*(_[a-z0-9]+)*$')
ANATOMY_CASE='TK-000539'
ANATOMY_ISSUE='EXACT_LOWER_BACK_TAG'
ANATOMY_STATUS='ANATOMICAL_TAG_NOT_EVIDENCED_REQUIRES_REVIEW'
ANATOMY_EVIDENCE='MOVEMENT_STANCE_NOT_ANATOMICAL_EVIDENCE'
_TOKEN=re.compile(r'[^\W_]+',re.UNICODE)
def tokens(text):
    """Unicode word tokens: NFKC + casefold; every non-alphanumeric code point
    (any hyphen/dash, space, punctuation, underscore) is a separator. Input is never altered."""
    return _TOKEN.findall(unicodedata.normalize('NFKC',str(text)).casefold())
def mentions(evidence_tokens,phrase):
    """True if the phrase occurs as whole consecutive words. Only the LAST word may carry a
    plain plural ('s'/'es'), so 'row' matches 'rows' but never 'Throw'; 'dip' never 'dipped'.
    This proves the supplier text MENTIONS the term, nothing more."""
    want=tokens(phrase)
    if not want: return False
    n=len(want)
    for i in range(len(evidence_tokens)-n+1):
        window=evidence_tokens[i:i+n]
        if window[:-1]!=want[:-1]: continue
        last,got=want[-1],window[-1]
        if got==last or got in (last+'s',last+'es'): return True
    return False
def need(ok,code):
    if not ok: raise ValueError(code)
def sha_file(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def src_sha(r):
    x=json.dumps(r,sort_keys=True,ensure_ascii=False,separators=(',',':'))
    return hashlib.sha256(x.encode('utf8')).hexdigest()
def registry_sha256(registry):
    return src_sha(registry)
def load_facet_registry(path=FACET_REGISTRY_PATH):
    return json.loads(Path(path).read_text(encoding='utf8'))
def validate_facet_registry(registry):
    """Owner-proposal facets: never supplier attributes, never approved, never mapped."""
    need(isinstance(registry,dict) and registry.get('schema')==FACET_REGISTRY_SCHEMA
         and registry.get('version')==1 and registry.get('source')==FACET_SOURCE
         and registry.get('status')=='PROPOSED_NOT_APPROVED'
         and registry.get('approval') is False
         and registry.get('runtime_activation') is False,'FACET_REGISTRY_INVALID')
    facets=registry.get('facets')
    need(isinstance(facets,dict) and facets,'FACET_REGISTRY_INVALID')
    for key,entry in facets.items():
        need(isinstance(key,str) and FACET_KEY.match(key),'FACET_KEY_NOT_SNAKE_CASE:'+str(key))
        need(isinstance(entry,dict) and set(entry)=={'source','approval','canonical_filter_mapping'}
             and entry['source']==FACET_SOURCE and entry['approval'] is False
             and entry['canonical_filter_mapping'] is None,'FACET_ENTRY_INVALID:'+key)
    return True
def facet_registry_record(registry):
    validate_facet_registry(registry)
    return {'schema':registry['schema'],'version':registry['version'],
            'source':registry['source'],'status':registry['status'],
            'facet_count':len(registry['facets']),
            'sha256':registry_sha256(registry)}
def validate_rules_facets(rules,registry):
    validate_facet_registry(registry)
    for cid,(_,_,additions,_) in rules.items():
        for facet in additions:
            need(facet in registry['facets'],'FACET_NOT_IN_OWNER_REGISTRY:'+cid+':'+str(facet))
def reconcile(owner,ledger,supplier,facet_registry=None):
    by_owner={x['catalog_id']:x for x in owner['routes']}
    by_ledger={x['catalog_id']:x for x in ledger['entries']}
    source={x['slug']:x for x in supplier}
    need(len(by_owner)==26 and len(by_ledger)==356 and len(source)==582,
         'INPUT_ID_DUPLICATE_OR_COUNT')
    ids={x['catalog_id'] for x in owner['routes'] if x['owner_choice']=='meta'}
    need(ids==set(RULES),'UNREVIEWED_METADATA_CASES')
    facet_registry=load_facet_registry() if facet_registry is None else facet_registry
    validate_rules_facets(RULES,facet_registry)
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
        fields=[tokens(t) for t in [row.get('name',''),row.get('shortDescription','')]
                +list(row.get('instructions',[]))]
        missing=[word for word in words if not any(mentions(f,word) for f in fields)]
        need(not missing,'SUPPLIER_EVIDENCE_MISSING:'+cid+':'+','.join(missing))
        need(kind!=ANATOMY_ISSUE or cid==ANATOMY_CASE,'ANATOMICAL_ISSUE_ONLY_FOR_'+ANATOMY_CASE)
        need(cid!=ANATOMY_CASE or kind==ANATOMY_ISSUE,'ANATOMICAL_CASE_ISSUE_CHANGED')
        item={
          'catalog_id':cid, 'provider_id':slug,
          'supplier_record_sha256':entry['supplier_record_sha256'],
          'owner_choice':o['owner_choice'],
          'owner_note':o['owner_note'],
          'issue':kind,
          'supporting_supplier_terms':words,
          'evidence_kind':'SUPPLIER_TEXT_TERM_MENTION_ONLY',
          'evidence_note':'Whole-word mention in supplier text; does NOT prove the equipment or movement is required.',
          'suggested_additional_equipment_facets':additions,
          'supplier_equipment_unchanged':row.get('equipment',[]),
          'supplier_primary_muscles_unchanged':row.get('primaryMuscles',[]),
          'supplier_movement_patterns_unchanged':row.get('movementPattern',[]),
          'review_status':'EVIDENCED_CORRECTION_PROPOSAL_NOT_APPROVED',
          'owner_facet_source':FACET_SOURCE,
          'safe_for_automatic_import':False,
        }
        if cid==ANATOMY_CASE:
            item.update({
              'evidence_kind':ANATOMY_EVIDENCE,
              'evidence_note':'Supplier text mentions a movement stance only; it does NOT evidence a lower-back anatomical tag. No anatomical claim is made.',
              'anatomical_tag_claim_valid':False,
              'review_status':ANATOMY_STATUS})
        corrections.append(item)
    return {'schema':'tk504-v2-source-metadata-exceptions/1.0',
            'owner_facet_registry':facet_registry_record(facet_registry),
            'evidence_matching':'unicode_whole_word_mention_only',
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
