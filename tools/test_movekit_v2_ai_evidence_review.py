#!/usr/bin/env python3
"""Synthetic-only TK504 AI/source agreement contract. No MoveKit files, media, DB or network."""
import copy
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode=True
TOOLS=Path(__file__).resolve().parent
sys.path.insert(0,str(TOOLS))
from test_movekit_classification_review import sample

spec=importlib.util.spec_from_file_location('tk504_ai_evidence_review',
    TOOLS/'movekit-v2-ai-evidence-review.py')
MOD=importlib.util.module_from_spec(spec)
spec.loader.exec_module(MOD)

class PrivateAiEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        catalog,inventory,rows=sample()
        for entry in catalog['catalog']:
            entry['identity'].update({
               'category':'mobility','type':'mobility','pattern':'mobility',
               'primary':['Legs'],'secondary':['Core'],'equipment':['bodyweight'],
               'goals':['mobility']
            })
        # Add exactly one OTHER valid app category and equipment tag without
        # disturbing 225 source Bodyweight => bodyweight published exemplars.
        catalog['catalog'][0]['identity'].update(
            category='upper_body_pull',equipment=['barbell'])
        rows[0]['equipment']=['Barbell']
        hashes={'supplier':'a'*64,'catalog':'b'*64,'inventory':'c'*64}
        ledger=MOD.LEDGER.make_template(catalog,inventory,rows,hashes)
        for i,row in enumerate(ledger['entries']):
            row['decision']='ACCEPT' if i<245 else 'DEFER'
            row['review']={
             'kind':'AI','reviewer':'synthetic','reference':'synthetic',
             'reviewed_at':'2026-11-04T00:00:00Z','rationale':'synthetic_only',
             'source_refs':['supplier-sha256:'+row['supplier_record_sha256']]
            }
            row['classification']=({
             'category':'mobility','type':'mobility','pattern':'mobility',
             'primary':['Legs'],'secondary':['Core'],'equipment':['bodyweight'],
             'goals':['mobility']
            } if i<245 else None)
        cls.fixture=(catalog,inventory,rows,ledger)

    def setUp(self):
        self.catalog,self.inventory,self.rows,self.ledger=copy.deepcopy(self.fixture)

    def result(self):
        return MOD.summarize(self.catalog,self.inventory,self.rows,self.ledger)

    def test_full_245_agree_but_release_false(self):
        report=self.result()
        self.assertEqual(report['accepted_ai_proposals'],245)
        self.assertEqual(report['counts']['CATEGORY_TYPE_MATCH'],245)
        self.assertEqual(report['counts']['MATCHES_STRONG_PUBLISHED_EQUIPMENT'],245)
        self.assertEqual(report['source_signature_group_count'],0)
        self.assertEqual(report['strong_equipment_pair_count'],1)
        self.assertEqual(report['historical_equipment_pairs']['Bodyweight']['app_tag'],
                         'bodyweight')
        for x in ('classification_approved','entitlement_granted',
                  'runtime_activation','db_writes'):
            self.assertIs(report[x],False)
        self.assertTrue(all(x['provisional_only'] is True and
                            x['formal_approval'] is False for x in report['cases']))

    def test_source_equipment_contradiction_is_detected_not_auto_fixed(self):
        item=self.ledger['entries'][0]['classification']
        item['equipment']=['barbell']
        report=self.result()
        self.assertEqual(report['counts']['DIFFERS_STRONG_PUBLISHED_EQUIPMENT'],1)
        flagged=next(x for x in report['cases'] if x['catalog_id']=='TK-000227')
        self.assertEqual(flagged['equipment_agreement'],
                         'DIFFERS_STRONG_PUBLISHED_EQUIPMENT')
        self.assertFalse(flagged['formal_approval'])
        self.assertEqual(item['equipment'],['barbell'])

    def test_ai_category_disagreement_is_not_accepted_as_verified(self):
        self.ledger['entries'][0]['classification']['category']='upper_body_pull'
        report=self.result()
        self.assertEqual(report['counts']['CATEGORY_TYPE_DIFFER'],1)
        self.assertEqual(report['counts']['CATEGORY_TYPE_MATCH'],244)
        self.assertEqual(report['source_signature_group_count'],1)
        self.assertEqual(report['exception_source_groups'][0]['catalog_ids'],
                         ['TK-000227'])

    def test_stale_supplier_sha_rejected(self):
        self.rows[226]['equipment']=['SyntheticFiction']
        with self.assertRaisesRegex(ValueError,'STALE_OR_CHANGED_SOURCE'):
            self.result()

    def test_no_fabricated_accepted_count(self):
        self.ledger['entries'][0]['decision']='DEFER'
        self.ledger['entries'][0]['classification']=None
        with self.assertRaisesRegex(ValueError,'EXPECTED_245_111_MISSING'):
            self.result()

    def test_no_source_write_or_automatic_mapping_mutation(self):
        original=json.dumps([self.catalog,self.inventory,self.rows,self.ledger],
                            sort_keys=True)
        self.result()
        self.assertEqual(original,json.dumps(
              [self.catalog,self.inventory,self.rows,self.ledger],sort_keys=True))

    def test_reject_output_outside_private_before_access(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t)
            (root/'.tk-private-review').mkdir()
            with self.assertRaisesRegex(ValueError,'OUTPUT_MUST_BE_NEW_PRIVATE_JSON'):
                MOD.run(root,root/'unsafe-public.json')

    def test_no_existing_report_overwrite(self):
        with tempfile.TemporaryDirectory() as t:
            root=Path(t)
            folder=root/'.tk-private-review';folder.mkdir()
            old=folder/'previous.json';old.write_text('unchanged',encoding='utf8')
            with self.assertRaisesRegex(ValueError,'OUTPUT_MUST_BE_NEW_PRIVATE_JSON'):
                MOD.run(root,old)
            self.assertEqual(old.read_text(encoding='utf8'),'unchanged')

if __name__=='__main__':
    unittest.main()
