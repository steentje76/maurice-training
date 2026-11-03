'use strict';
const assert=require('node:assert/strict');
const {plan}=require('./movekitV2ImportPlan.js');
const catalog=require('../exercise-catalog.json');
const first=catalog.catalog[0],cid=first.catalog_id;
const personal={id:cid,name:first.identity.name,scope:'personal',user_id:'owner-A'};
const rows=[personal,{id:'legacy',name:'legacy global',scope:'global'}];
const before=JSON.stringify(rows);
const a=plan(catalog,rows);
assert.equal(a.operations.length,226);
assert.equal(a.operations[0].exercise_id,'movekit-v2-'+cid);
assert.equal(a.operations[0].action,'PROPOSE_NEW_GLOBAL');
assert.equal(JSON.stringify(rows),before);
assert.deepEqual(plan(catalog,rows),a);
assert.equal(a.executable,false);
assert.equal(a.historical_updates+a.personal_updates+a.grant_writes,0);
const binding={catalog_id:cid,exercise_id:'legacy',provider_id:first.source.provider_id,status:'approved',review_ref:'review/synthetic'};
assert.equal(plan(catalog,rows,[binding]).operations[0].action,'KEEP_REVIEWED_BINDING');
for(const patch of [
 {exercise_id:cid},{provider_id:'wrong'},{status:'proposed'},{review_ref:''},{catalog_id:'TK-999999'}
])assert.throws(()=>plan(catalog,rows,[{...binding,...patch}]),/UNSAFE_APPROVED_BINDING/);
assert.throws(()=>plan(catalog,[...rows,{...rows[1]}]),/DUPLICATE_DATABASE_ID/);
assert.throws(()=>plan(catalog,rows,[binding,binding]),/UNSAFE_APPROVED_BINDING/);
assert.throws(()=>plan(catalog,[personal,{...rows[1],user_id:'owner-B'}],[binding]),/UNSAFE_APPROVED_BINDING/);
assert.throws(()=>plan(catalog,[personal,{...rows[1],created_by:'owner-B'}],[binding]),/UNSAFE_APPROVED_BINDING/);
const collision=plan(catalog,[...rows,{id:'movekit-v2-'+cid,name:'Unrelated',scope:'personal'}]);
assert.equal(collision.operations[0].action,'HOLD_DATABASE_ID_COLLISION');
assert.equal(JSON.stringify(a).includes('owner-A'),false);
console.log('MoveKit import plan: identity collision, immutable input, repeatability and reviewed crosswalk checks PASS');

const staged={catalog:[...catalog.catalog,...Array.from({length:356},(_,i)=>({
 catalog_id:'TK-'+String(i+227).padStart(6,'0'),
 source:{provider:'movekit',provider_id:'synthetic-'+(i+227)}
}))]};
const full=plan(catalog,rows,[],staged);
assert.equal(full.operations.length,582);
assert.equal(full.operations.filter(x=>x.action==='HOLD_CLASSIFICATION_REVIEW').length,356);
assert.throws(()=>plan(catalog,rows,[],{catalog:staged.catalog.slice(1)}),/INVALID_STAGED_CATALOG/);
const changed=JSON.parse(JSON.stringify(staged));changed.catalog[0].identity.name='changed';
assert.throws(()=>plan(catalog,rows,[],changed),/PUBLISHED_CATALOG_CHANGED/);
console.log('582-identity plan: 226 preserved, 356 review holds PASS');

const newCollision=plan(catalog,[...rows,{id:'movekit-v2-TK-000227',name:'Unrelated',scope:'personal'}],[],staged);
assert.deepEqual(newCollision.operations[226].hold_reasons,['CLASSIFICATION_REVIEW','DATABASE_ID_COLLISION']);
assert.throws(()=>plan(catalog,[personal,{...rows[1],has_owner:true}],[binding]),/UNSAFE_APPROVED_BINDING/);
console.log('Review fixes: new-candidate collisions and ownership flags PASS');
