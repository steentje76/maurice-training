#!/usr/bin/env python3
"""Synthetic-only regressions: private 582-item MoveKit review projection."""
import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path
sys.dont_write_bytecode = True
ROOT=Path(__file__).resolve().parent
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    obj=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj
M=load('mk_private_review',ROOT/'movekit-v2-private-reviewed-stage.py')
F=load('mk_fixture',ROOT/'test_movekit_catalog_stage.py')
def fixture():
    catalog,inventory,suppliers=F.fixtures()
    new_ids=[f'TK-{i:06d}' for i in range(227,583)]
    new_by_id={row['catalog_id']:row for row in inventory['items']}
    source_by_slug={row['slug']:row for row in suppliers}
    ledger=[]
    terms=[]
    owner=[]
    deferred=[]
    registry={'schema':'tk504-movekit-v2-terminology/1.0','status':'PROPOSED_NOT_APPROVED',
              'muscles':{'Legs':{'code':'movekit:muscle:legs','label_nl':'Benen'}},'equipment':{}}
    choices=['apart']*8+['meta']*12+['variant']*6
    for i,cid in enumerate(new_ids):
        slug=new_by_id[cid]['provider_id']
        source=source_by_slug[slug]
        rec_sha=M.TAX.record_hash(source)
        accepted=i<245
        ledger.append({
           'catalog_id':cid,'provider_id':slug,'supplier_record_sha256':rec_sha,
           'decision':'ACCEPT' if accepted else 'DEFER',
           'classification':{'category':'strength','type':'strength'} if accepted else None,
           'review':{'kind':'AI'} if accepted else None})
        if accepted: continue
        if i<330:
            deferred.append({'catalog_id':cid,
                             'reason':'primary:Legs ontbreekt exacte goedgekeurde mapping'})
        else:
            deferred.append({'catalog_id':cid,'reason':'variants need content review'})
            owner.append({'catalog_id':cid,'provider_id':slug,
                          'supplier_record_sha256':rec_sha,
                          'owner_choice':choices[i-330],
                          'owner_note':'',
                          'suggested_route':'KEEP_DISTINCT_PROVISIONAL'})
    ai={'summary':{'counts':{'accept_ai':245,'defer_ai':111}},'deferred':deferred}
    report=M.TAX.annotate(deferred,ledger,suppliers,registry)
    terms=report
    assert len(terms['cases'])==85 and len(owner)==26
    metas=[]
    for r in owner:
        if r['owner_choice']!='meta': continue
        src=source_by_slug[r['provider_id']]
        metas.append({'catalog_id':r['catalog_id'],'provider_id':r['provider_id'],
                      'supplier_record_sha256':r['supplier_record_sha256'],
                      'owner_choice':'meta','issue':'EQUIPMENT',
                      'supporting_supplier_terms':['supplier'],
                      'evidence_kind':'SUPPLIER_TEXT_TERM_MENTION_ONLY',
                      'suggested_additional_equipment_facets':[],
                      'supplier_equipment_unchanged':src['equipment'],
                      'supplier_primary_muscles_unchanged':src['primaryMuscles'],
                      'supplier_movement_patterns_unchanged':src['movementPattern'],
                      'review_status':'EVIDENCED_CORRECTION_PROPOSAL_NOT_APPROVED',
                      'owner_facet_source':'OWNER_FEEDBACK_NOT_SUPPLIER_ATTRIBUTE',
                      'safe_for_automatic_import':False})
    proof={'status':'PRIVATE_CORRECTIONS_NOT_RELEASED','owner_metadata_cases':12,
           'evidence_matching':'unicode_whole_word_mention_only',
           'owner_facet_registry':M.PROOF.facet_registry_record(M.PROOF.load_facet_registry()),
           'corrections':metas}
    variants=[r['catalog_id'] for r in owner if r['owner_choice']=='variant']
    inv_by_id={x['catalog_id']:x for x in inventory['items']}
    for cid in variants: inv_by_id[cid]['video']={'sha256':'v'+cid}
    pairs=[{'catalog_ids':variants[k:k+2],'same_video_sha256':False,
            'status':'OWNER_MARKED_VARIANT_NOT_AUTODEDUPED'} for k in (0,2,4)]
    return (catalog,inventory,suppliers,
            {'entries':ledger},ai,terms,
            {'status':'PRIVATE_VERIFIED_OWNER_FEEDBACK_NOT_AUTHENTICATED_APPROVAL',
             'total':26,'routes':owner,'possible_duplicate_groups':pairs},
            proof,registry)

class PrivateReviewedStageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=fixture()
    def setUp(self):
        self.data=copy.deepcopy(self.source)
    def build(self):
        return M.compile_private(*self.data)
    def test_582_and_exact_review_split(self):
        result=self.build()
        self.assertEqual(result['count'],582)
        self.assertEqual(result['_review_total'],356)
        self.assertEqual(list(result['_review_counts'].values()),[245,85,26])
        self.assertEqual(result['_approved_for_import'],0)
        self.assertEqual(result['_media_grants_created'],0)
        self.assertFalse(result['_app_activated'])
    def test_baseline_226_immutable_even_after_compilation(self):
        original=json.dumps(self.data[0]['catalog'],sort_keys=True)
        result=self.build()
        self.assertEqual(json.dumps(result['catalog'][:226],sort_keys=True),original)
        self.assertEqual(json.dumps(self.data[0]['catalog'],sort_keys=True),original)
    def test_all_new_hold_no_video_or_made_up_science(self):
        new=self.build()['catalog'][226:]
        self.assertEqual(len(new),356)
        self.assertTrue(all(x['identity']['category']=='pending_review' for x in new))
        self.assertTrue(all(x['assets']==[] for x in new))
        self.assertTrue(all(x['intelligence']['fatigue'] is None
                            and x['intelligence']['recovery'] is None for x in new))
        self.assertTrue(all(x['_review']['confirmed_by_authenticated_reviewer'] is False for x in new))
    def test_ai_feedback_is_proposal_only(self):
        x=self.build()['catalog'][226]
        self.assertEqual(x['_review']['review_route'],'AI_PROPOSAL_PENDING_HUMAN_REVIEW')
        self.assertEqual(x['_review']['feedback']['ai_classification_proposal']['category'],'strength')
        self.assertEqual(x['identity']['category'],'pending_review')
    def test_terms_remain_source_first_and_separate(self):
        x=self.build()['catalog'][226+245]
        self.assertEqual(x['_review']['review_route'],'SOURCE_TERM_PROPOSAL_PENDING_HUMAN_REVIEW')
        self.assertFalse(x['_review']['supplier_metadata_modified'])
        self.assertEqual(x['identity']['primary'],['Legs'])
        notes=x['_review']['feedback']['proposed_exact_vocabulary']
        self.assertEqual([n['source_term'] for n in notes],['Legs'])
        self.assertFalse(notes[0]['approved'])
    def test_owner_feedback_does_not_authorize_import(self):
        x=self.build()['catalog'][-1]
        self.assertEqual(x['_review']['review_route'],'OWNER_FEEDBACK_PENDING_CONTENT_REVIEW')
        self.assertEqual(x['_review']['feedback']['owner_choice'],'variant')
        self.assertEqual(x['identity']['category'],'pending_review')
    def test_stale_supplier_record_rejected(self):
        self.data[2][-1]['name']='Changed without review'
        with self.assertRaisesRegex(ValueError,'SOURCE_NAME_MISMATCH'):
            self.build()
    def test_provider_or_identity_mismatch_rejected(self):
        self.data[3]['entries'][0]['provider_id']='someone-else'
        with self.assertRaisesRegex(ValueError,'REVIEW_PROVIDER_CHANGED'):
            self.build()
    def test_missing_owner_case_rejected(self):
        self.data[6]['routes'].pop()
        with self.assertRaisesRegex(ValueError,'OWNER_REVIEW_NOT_VALID'):
            self.build()
    def test_wrong_owner_source_sha_rejected(self):
        self.data[6]['routes'][0]['supplier_record_sha256']='f'*64
        with self.assertRaisesRegex(ValueError,'OWNER_SOURCE_CHANGED'):
            self.build()
    def test_duplicate_or_conflicting_term_ids_rejected(self):
        self.data[5]['cases'][0]['catalog_id']=self.data[6]['routes'][0]['catalog_id']
        with self.assertRaisesRegex(ValueError,'CONFLICTING_REVIEW_GROUPS'):
            self.build()
    def test_legacy_substring_metadata_proof_rejected(self):
        self.data[7].pop('evidence_matching')
        with self.assertRaisesRegex(ValueError,'UNVERIFIED_METADATA_EVIDENCE_MATCHING'):
            self.build()
    def test_metadata_annotation_without_whole_term_evidence_rejected(self):
        self.data[7]['corrections'][0]['evidence_kind']='UNVERIFIED'
        with self.assertRaisesRegex(ValueError,'SOURCE_METADATA_PROOF_CHANGED'):
            self.build()
    def test_old_catalog_change_breaks_golden_inventory(self):
        self.data[0]['catalog'].pop()
        with self.assertRaisesRegex(ValueError,'BASELINE_COUNT'):
            self.build()

if __name__=='__main__':
    unittest.main()
