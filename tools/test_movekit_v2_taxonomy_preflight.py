#!/usr/bin/env python3
"""Synthetic fail-closed MoveKit source-first taxonomy preflight tests."""
import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path
sys.dont_write_bytecode = True

PATH = Path(__file__).with_name('movekit-v2-taxonomy-preflight.py')
SPEC = importlib.util.spec_from_file_location('tk504_vocab', PATH)
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
TAXONOMY = json.loads(PATH.with_name('movekit-v2-taxonomy-map.json').read_text(encoding='utf8'))

class SourceFirstTests(unittest.TestCase):
    def setUp(self):
        self.supplier={'slug':'sample','primaryMuscles':['Lower Back'],
                       'secondaryMuscles':['Forearms'],'equipment':['Bench']}
        self.ledger={'catalog_id':'TK-000227','provider_id':'sample',
                     'supplier_record_sha256':M.record_hash(self.supplier),
                     'decision':'DEFER'}
        self.deferred={'catalog_id':'TK-000227',
                       'reason':('primary:Lower Back ontbreekt exacte goedgekeurde mapping; '
                                 'secondary:Forearms ontbreekt exacte goedgekeurde mapping; '
                                 'equipment:Bench ontbreekt canonieke code')}
    def run_preview(self):
        return M.annotate([self.deferred],[self.ledger],[self.supplier],TAXONOMY)
    def test_exact_source_fields_are_preserved(self):
        original=copy.deepcopy(self.supplier)
        result=self.run_preview()
        self.assertEqual(self.supplier,original)
        self.assertEqual(result['covered_count'],1)
        self.assertEqual(result['special_count'],0)
        annotations=result['cases'][0]['proposed_annotations']
        self.assertEqual([x['source_term'] for x in annotations],
                         ['Lower Back','Forearms','Bench'])
        self.assertEqual([x['proposed']['code'] for x in annotations],
                         ['movekit:muscle:lower_back','movekit:muscle:forearms',
                          'movekit:equipment:bench'])
        self.assertTrue(all(x['approved'] is False for x in annotations))
        self.assertFalse(result['human_approved'])
        self.assertFalse(result['app_activated'])
        self.assertFalse(result['db_writes'])
    def test_unrelated_special_reason_stays_special(self):
        self.deferred['reason']='Different exercise variants require review'
        result=self.run_preview()
        self.assertEqual((result['covered_count'],result['special_count']),(0,1))
    def test_absent_supplier_tag_is_not_fabricated(self):
        self.supplier['primaryMuscles']=['Core']
        self.ledger['supplier_record_sha256']=M.record_hash(self.supplier)
        with self.assertRaises(ValueError):
            self.run_preview()
    def test_stale_supplier_hash_rejected(self):
        self.supplier['primaryMuscles'].append('Core')
        with self.assertRaises(ValueError):
            self.run_preview()
    def test_unmapped_term_is_rejected(self):
        self.supplier['primaryMuscles']=['UnknownBodyPart']
        self.ledger['supplier_record_sha256']=M.record_hash(self.supplier)
        self.deferred['reason']='primary:UnknownBodyPart ontbreekt exacte goedgekeurde mapping'
        with self.assertRaises(ValueError):
            self.run_preview()
    def test_wrong_decision_rejected(self):
        self.ledger['decision']='ACCEPT'
        with self.assertRaises(ValueError):
            self.run_preview()
    def test_duplicate_ids_rejected(self):
        with self.assertRaises(ValueError):
            M.annotate([self.deferred,self.deferred],[self.ledger],[self.supplier],TAXONOMY)
    def test_malformed_reason_rejected(self):
        self.deferred['reason']='primary:Lower Back arbitrary replacement'
        with self.assertRaises(ValueError):
            self.run_preview()
    def test_mapping_never_conflates_forearms_grip_or_back(self):
        self.assertNotEqual(TAXONOMY['muscles']['Forearms']['code'],'Grip')
        self.assertNotEqual(TAXONOMY['muscles']['Lower Back']['code'],'Rug')
        self.assertEqual(len(TAXONOMY['muscles']),5)
        self.assertEqual(len(TAXONOMY['equipment']),13)
    def test_blank_review_does_not_grant_status(self):
        result=self.run_preview()
        self.assertEqual(result['status'],'PRIVATE_PROPOSALS_NO_PRODUCTION_RELEASE')

if __name__=='__main__':
    unittest.main()
