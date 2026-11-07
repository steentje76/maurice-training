'use strict';
// Real product gate for the PRIVATE-only 356 Dutch content staging generator.
// Uses 582 SYNTHETIC supplier rows and the existing 15-batch hash fixture.
// Never connects to Supabase or reads private licensed source files.
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const python=process.platform==='win32'?'python':'python3';
const code=[
 'import sys',
 "sys.path.insert(0, 'tools')",
 'import test_tk504_owner_approval_reconcile as sample',
 'from tk504_prepare_private_catalog_content import stage_content',
 // The synthetic hash fixture intentionally keeps only the approved display
 // fields; add unapproved supplier structure solely for metadata-shape tests.
 "for row in sample.stage:",
 "    row['identity'].update({'name':'Synthetic supplier movement',",
 "      'type':'compound','family':'press','pattern':'push',",
 "      'primary':['Borst'],'secondary':[],'equipment':['barbell'],",
 "      'goals':['strength']})",
 'plan=stage_content(sample.stage,sample.translations,sample.decision)',
 "assert plan['status']=='STAGED_ONLY_NO_PUBLICATION_AUTHORITY'",
 "assert plan['count']==356 and len(plan['records'])==356",
 "assert plan['records'][0]['catalog_id']=='TK-000227'",
 "assert plan['records'][-1]['catalog_id']=='TK-000582'",
 "assert plan['records'][0]['metadata']['identity']['nl']==sample.translations[226]['translations']['name_nl']",
 "assert plan['records'][0]['metadata']['intelligence']['cues']==sample.translations[226]['translations']['instructions_nl']",
 "assert plan['records'][0]['metadata']['intelligence']['mistakes']==sample.translations[226]['translations']['commonMistakes_nl']",
 "assert plan['records'][0]['metadata']['assets']==[]",
 "assert plan['records'][0]['metadata']['relations']['alternatives']==[]",
 "assert plan['records'][0]['metadata']['provenance']['unreviewed_taxonomy_metadata']",
 // #504: every staged row carries the approval of ITS package (server-checked).
 "fp=sample.decision['content_fingerprint']['batches']",
 "for i,want in ((0,1),(24,1),(25,2),(349,14),(350,15),(355,15)):",
 "    p=plan['records'][i]['metadata']['provenance']",
 "    assert p['approved_batch']==want, (i,p)",
 "    assert p['approved_batch_display_sha256']==fp[want-1]['display_sha256']",
 "    assert p['owner_display_approval']==sample.decision['decision_id']",
 "assert not plan['publication_authorized'] and not plan['media_entitlements_created'] and not plan['db_writes']",
 "assert all(r['status']=='staged' and r['approved_at'] is None for r in plan['records'])",
 'print("TK504 356 owner-approved content staging: deterministic synthetic PASS; zero release rights")'
].join('\n');
const result=spawnSync(python,['-c',code],{
 cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:120000,
 env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}
});
assert.ifError(result.error);
assert.equal(result.status,0,(result.stderr||'')+'\n'+(result.stdout||''));
assert.match(result.stdout,/deterministic synthetic PASS/);
console.log(result.stdout.trim());
