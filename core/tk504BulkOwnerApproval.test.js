'use strict';
// Owner's 15-batch bulk content approval is auditable and separate from release.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const r=require('../docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json');
const old=require('../docs/generated/MOVEKIT_V2_OWNER_CONTENT_APPROVAL_TK_000227_20261105.json');
const golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const release=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
const catalog=require('../exercise-catalog.json');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let n=0;function check(v,m){assert.ok(v,m);n++}
check(r.schema==='trainingskompas-movekit-v2-batch-owner-content-review/1.0','Schema pinned');
check(r.decision_id==='TK504-20261105-OWNER-BATCHES-01-15','Decision ID');
check(r.decision_date==='2026-11-05','Decision date');
check(r.decision_utterance==='ik keur batch 1 tm 15 goed','Exact user approval scope');
check(r.status==='OWNER_EXPLICIT_BULK_CONTENT_APPROVAL','Content-only approval');
check(r.review_evidence_type==='owner_bulk_instruction_not_356_separate_per_item_signatures',
      'No invented per-item individual approvals');
check(r.scope.first_catalog_id==='TK-000227'&&r.scope.last_catalog_id==='TK-000582','Correct bounds');
check(r.scope.content_approved_count===356&&r.scope.batch_count===15,'Exactly 356 content records');
check(r.scope.batch_size===25&&r.scope.last_batch_size===6,'Batch split 14x25+6');
check(r.scope.approved_display_sections.includes('nl_execution_steps')&&
      r.scope.approved_display_sections.includes('nl_common_mistakes'),'Displayed scope');
check(r.scope.excluded_sections.includes('trainability')&&
      r.scope.excluded_sections.includes('scientific_inferences'),'Not training rules');
const batch=r.content_fingerprint.batches;
check(batch.length===15,'15 complete fingerprint records');
check(batch.slice(0,14).every(x=>x.count===25)&&batch[14].count===6,'14 batches of 25 then 6');
check(batch[0].from==='TK-000227'&&batch[14].through==='TK-000582','Complete range');
check(batch.reduce((s,x)=>s+x.count,0)===356,'No lost/extra items');
check(batch.every(x=>/^[0-9a-f]{64}$/.test(x.display_sha256)),
      'Every reviewed batch bound to its displayed source fields');
check(/^[a-f0-9]{64}$/.test(r.content_fingerprint.display_sha256),'Global source digest');
check(Object.keys(r.access_release).length>=7&&
      Object.values(r.access_release).every(x=>x===false),'No release rights inferred');
check(old.exercise.catalog_id==='TK-000227'&&old.decision_status==='OWNER_CONTENT_APPROVED_FOR_SINGLE_ITEM_PILOT',
      'Original individual approval still exists');
check(golden.items.length===582&&golden.items.slice(226).length===356,'Golden source inventory intact');
check(catalog.count===226&&catalog.catalog.length===226,'Production catalog still 226');
check(!catalog.catalog.some(x=>Number(x.catalog_id.slice(3))>=227),
      'Zero unpublished rows in production catalog');
check(release.status==='RELEASE_APPROVED'&&release.entries.length===1164&&
      release.released_batches?.length===15,'Central release only uses the exact owner-approved 582 pairs');
check(/const TK504_PRIVATE_MEDIA_RELEASE = false;/.test(html),'Private playback release stays off');
check(/const TK504_PRIVATE_MEDIA_CUTOVER = false;/.test(sw),'Service-worker cutover stays off');
console.log('TK504 bulk owner approval: '+n+
  ' scope/security checks PASS; 356 content-approved / 356 not yet published');
