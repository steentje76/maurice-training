'use strict';
// TK504: the original SINGLE-item content approval is preserved as history.
// A later explicit 15-batch approval is separately recorded, neither is a release grant.
const assert=require('node:assert/strict');
const review=require('../docs/generated/MOVEKIT_V2_OWNER_CONTENT_APPROVAL_TK_000227_20261105.json');
const bulk=require('../docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json');
const inventory=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const posters=require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const release=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');
const catalog=require('../exercise-catalog.json');
const fs=require('node:fs');
const path=require('node:path');
const id='TK-000227';
const r=inventory.items.find(v=>v.catalog_id===id);
const p=posters.items.find(v=>v.catalog_id===id);
let n=0;function check(v,msg){assert.ok(v,msg);n++;}
check(review.schema==='trainingskompas-movekit-v2-owner-content-review/1.0','Schema pinned');
check(review.decision_id==='TK504-20261105-227'&&review.decision_date==='2026-11-05','Review reference');
check(review.decision_status==='OWNER_CONTENT_APPROVED_FOR_SINGLE_ITEM_PILOT','Content-only approval');
check(review.evidence_type==='owner_chat_explicit_not_cryptographically_signed','Do not claim signed identity');
check(review.exercise.catalog_id===id&&review.exercise.provider==='movekit','One canonical ID');
check(review.exercise.provider_id===r.provider_id,'Exact vendor slug');
check(review.exercise.nl_name==='90/90 heupwissels','Reviewed localized display');
check(review.exercise.taxonomy.type==='mobility','Reviewed draft taxonomy');
check(review.approved_sections.length===6,'Approved visible scope only');
check(review.approved_sections.includes('nl_execution_steps')&&review.approved_sections.includes('nl_common_mistakes'),'Displayed description scope');
check(review.non_approved_sections.includes('nl_long_description'),'Long form not silently approved');
check(review.non_approved_sections.includes('all_other_355_exercises'),
      'Historically, this earlier single-item decision excluded the other 355');
check(bulk.scope.content_approved_count===356 &&
      bulk.status==='OWNER_EXPLICIT_BULK_CONTENT_APPROVAL',
      'Later blanket owner content approval separately documented');
check(Object.values(bulk.access_release).every(x=>x===false),
      'Later batch approval still confers no release rights');
check(review.evidence.video_sha256===r.video.sha256,'Golden V2 MP4 evidence');
check(review.evidence.poster_sha256===p.sha256,'Optimized poster evidence');
check(/^[a-f0-9]{64}$/.test(review.evidence.screenshot_sha256),'Screenshot proof pinned');
check(review.access_release.owner_content_approved===true,'Owner approval captured');
const flags=Object.entries(review.access_release).filter(([name])=>name!=='owner_content_approved');
check(flags.length>=8&&flags.every(([,v])=>v===false),'All release gates remain false');
check(release.status==='BLOCKED_NOT_REVIEWED'&&release.entries.length===0,'Production server release gate unchanged');
check(catalog.catalog.length===226&&!catalog.catalog.some(v=>v.catalog_id===id),'No public catalog row published');
check(inventory.items.length===582,'Complete source inventory retained');
check(inventory.items.filter(v=>Number(v.catalog_id.slice(3))>=227).length===356,'356 candidates kept staged');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
check(/const TK504_PRIVATE_MEDIA_RELEASE = false;/.test(html),'Global secure release remains OFF');
const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
check(/const TK504_PRIVATE_MEDIA_CUTOVER = false;/.test(sw),'SW public media cutover remains OFF');
console.log('TK504 historical single-item owner review: '+n+' scope/security checks PASS; later 356-item bulk CONTENT approval recorded separately; production release OFF');
