'use strict';
/* Synthetic-only and real ECS implementation from index.html: no licensed
 * translation text or production writes; V2 content remains unselectable. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Bridge=require('./movekitNlCatalogPreview.js');
const ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const match=html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(match,'embedded EX_CATALOG must be present');
const published=JSON.parse(match[1]);
assert.equal(published.catalog.length,226);
const start=html.indexOf('var ExerciseCatalogService=(function(){');
const stop=html.indexOf('})();',start);
assert(start>0&&stop>start);
function realEcs(){
  const box={EX_CATALOG:JSON.parse(JSON.stringify(published)),
    localStorage:{getItem:()=>null,setItem(){}},
    favoriteExIds:new Set(),Date,Math,Array,Map,Set,JSON,performance:{now:()=>0},console};
  vm.runInNewContext(html.slice(start,stop+5),box,{timeout:3000});
  return box.ExerciseCatalogService;
}
const sha='a'.repeat(64);
const fields=Bridge.FIELDS;
const cid=i=>'TK-'+String(i).padStart(6,'0');
const srcIds=published.catalog.map(x=>x.source.provider_id);
function item(i){
 const pending=i>226;
 const source=pending?'synthetic-'+i:srcIds[i-1];
 const id=cid(i);
 const translated=Object.fromEntries(fields.map(f=>[f,f==='name_nl'?'Nederlandse titel '+i:'']));
 return {
   catalog_id:id,source:{provider:'movekit',provider_id:source},
   group:pending?'UNRELEASED_CANDIDATE':'EXISTING_CATALOG_BASELINE',
   translation_status:'DRAFT_NOT_HUMAN_REVIEWED_NOT_PUBLISHED',
   display_name_nl_draft:'nlzoekterm'+String(i).padStart(6,'0'),
   translations:translated
 };
}
const good=()=>({
 schema:Bridge.SCHEMA,status:Bridge.STATUS,
 metadata_source_sha256:sha,total:582,existing_baseline:226,
 new_unreleased:356,approved_new_exercises:0,db_writes:0,
 grants_created:0,app_enabled:false,
 items:Array.from({length:582},(_,i)=>item(i+1))
});
const make=(ecs,overlay,extra)=>Bridge.create({
 catalogService:ecs,overlay,expectedSourceSha256:sha,
 mode:Bridge.PREVIEW_ONLY,...extra
});
let count=0;
function check(title,fn){
 try{fn();count++;console.log('PASS',title)}
 catch(error){console.error('FAIL',title,error.stack);process.exitCode=1}
}
check('module is inert unless explicitly called for local editorial preview',()=>{
 assert.equal(Bridge.PREVIEW_ONLY,'PRIVATE_LOCAL_EDITORIAL_PREVIEW');
 assert.throws(()=>Bridge.create({}),/TK504_NL_PREVIEW_MODE_REQUIRED/);
 assert.equal(html.includes('movekitNlCatalogPreview.js'),false);
 assert(Object.isFrozen(Bridge));
});
check('real live ECS 226 baseline binds exact provider IDs, including divergent row order',()=>{
 const s=realEcs();
 const c=make(s,good());
 assert.equal(s.count(),226);
 assert.equal(c.appActive,false);assert.equal(c.canCreateExercise,false);
 assert.equal(c.canSignMedia,false);assert.equal(c.canApprove,false);
 assert.equal(c.existingName(cid(1)),'nlzoekterm000001');
 assert.equal(c.existingName(cid(227)),null);
 assert.equal(c.review(cid(1)).status,'DRAFT_ONLY');
 assert.equal(c.review(cid(1)).selectable,false);
 assert.equal(c.review(cid(227)).status,'NOT_PUBLISHED');
 assert.equal(c.review(cid(227)).trainable,false);
 assert.equal(c.review(cid(582)).signedMediaAvailable,false);
 assert.equal(c.review('TK-999999'),null);
 assert.equal(c.review('__proto__'),null);
 assert.equal(c.installed,false);
});
check('Dutch names use the SINGLE existing ECS inverted index; rollback clean',()=>{
 const service=realEcs(), first=service.byId(cid(1));
 const oldEnglish=first.identity.name, before=service.search('nlzoekterm000001');
 assert.equal(before.length,0);
 const bridge=make(service,good());
 const result=bridge.installDutchSearchForLocalReview();
 assert.equal(result.indexedDutchNames,226);
 assert.equal(result.pendingIndexed,0);
 assert.equal(result.authorizedForRelease,false);
 assert.equal(service.byId(cid(1)),first);
 assert.equal(first.identity.name,oldEnglish);
 assert.equal(first.identity.nl,'nlzoekterm000001');
 assert.equal(service.search('nlzoekterm000001').length,1);
 assert.equal(service.search('nlzoekterm000001')[0].catalog_id,cid(1));
 assert.equal(service.search('nlzoekterm000226').length,1);
 assert(service.search('nlzoekterm000227').every(x=>Number(x.catalog_id.slice(3))<=226));
 assert(service.search('nlzoekterm000582').every(x=>Number(x.catalog_id.slice(3))<=226));
 assert.equal(service.count(),226);
 assert.throws(()=>bridge.installDutchSearchForLocalReview(),/ALREADY_INSTALLED/);
 assert.equal(bridge.restoreEnglishBaseline(),true);
 assert.equal(first.identity.nl,null);
 assert.equal(service.search('nlzoekterm000001').length,0);
 assert.equal(service.count(),226);
 assert.equal(bridge.installed,false);
 assert.equal(bridge.restoreEnglishBaseline(),false);
});
check('unknown IDs or changed provider never mapped by name, row or DB id',()=>{
 const all=good(),ecs=realEcs();
 all.items[0].source.provider_id='synthetic-unknown';
 assert.throws(()=>make(ecs,all),/BASELINE_IDENTITY_DRIFT/);
 const altered=good();altered.items[1].source.provider_id=altered.items[0].source.provider_id;
 assert.throws(()=>make(ecs,altered),/BAD_CANONICAL_BINDING/);
 const ids=good();ids.items[226].catalog_id='TK-000001';
 assert.throws(()=>make(ecs,ids),/BAD_CANONICAL_BINDING/);
});
check('356 pending can never be inserted through the staging bridge',()=>{
 const ecs=realEcs(),bad=good();
 bad.items[226].group='EXISTING_CATALOG_BASELINE';
 assert.throws(()=>make(ecs,bad),/BAD_CANONICAL_BINDING/);
 const bad2=good();bad2.items[100].group='UNRELEASED_CANDIDATE';
 assert.throws(()=>make(ecs,bad2),/BAD_CANONICAL_BINDING/);
 const bad3=good();bad3.approved_new_exercises=356;
 assert.throws(()=>make(ecs,bad3),/UNTRUSTED_PRIVATE_DRAFT/);
});
check('missing, extra, malformed or executable translations fail closed',()=>{
 const ecs=realEcs();
 const a=good();delete a.items[0].translations.instructions_nl;
 assert.throws(()=>make(ecs,a),/INCOMPLETE_TRANSLATION/);
 const b=good();b.items[0].translations.instructions_nl='<b>\u0000</b>';
 assert.throws(()=>make(ecs,b),/INVALID_TEXT/);
 const c=good();c.items[0].display_name_nl_draft='';
 assert.throws(()=>make(ecs,c),/EMPTY_NAME/);
 const d=good();d.items[0].translations.extra='X';
 assert.throws(()=>make(ecs,d),/INCOMPLETE_TRANSLATION/);
});
check('untrusted source hash and stale catalog count deny all review surfaces',()=>{
 const ecs=realEcs(),itemSet=good();
 assert.throws(()=>make(ecs,itemSet,{expectedSourceSha256:'b'.repeat(64)}),/UNTRUSTED_PRIVATE_DRAFT/);
 const omitted=good();omitted.items.pop();
 assert.throws(()=>make(ecs,omitted),/UNTRUSTED_PRIVATE_DRAFT/);
 const badService={...ecs,all:()=>ecs.all().slice(1)};
 assert.throws(()=>make(badService,good()),/BASELINE_COUNT_CHANGED/);
});
check('no partial mutation if baseline moves before install; no draft overwritten',()=>{
 const service=realEcs(),bridge=make(service,good()),e=service.byId(cid(200));
 e.identity.nl='menselijk-bewaarde-vertaling';
 assert.throws(()=>bridge.installDutchSearchForLocalReview(),/BASELINE_CHANGED/);
 assert.equal(service.byId(cid(1)).identity.nl,null);
 assert.equal(e.identity.nl,'menselijk-bewaarde-vertaling');
 assert.equal(service.count(),226);
});
check('browser global supported without require/module',()=>{
 const context=vm.createContext({});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'movekitNlCatalogPreview.js'),'utf8'),context);
 assert.equal(typeof context.MoveKitNlCatalogPreview.create,'function');
 assert.equal(context.MoveKitNlCatalogPreview.PREVIEW_ONLY,Bridge.PREVIEW_ONLY);
});
console.log('MoveKit NL: '+count+' private-only synthetic canonical ECS integration checks '+(process.exitCode?'FAILED':'PASS'));
