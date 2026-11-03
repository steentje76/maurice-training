'use strict';
/* Synthetic-only contract test: exercise review adapter uses REAL existing
 * ExerciseCatalogService engine, with full 582 synthetic catalog in a VM.
 * No live browser, DB, media, Supabase, entitlements or licensed supplier bytes.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createReviewSearch, FILTERS } = require('./movekitV2EcsReviewAdapter.js');
const ROOT = path.join(__dirname,'..');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT,'tools/movekit-v2-taxonomy-map.json'),'utf8'));
const html = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

function freshStage() {
  const catalog=[];
  for(let i=1;i<=582;i++) {
    const cid='TK-'+String(i).padStart(6,'0');
    const newItem=i>226;
    const muscle=i===227?'Forearms':i===228?'Lower Back':i===229?'Adductors':i===230?'Grip':(newItem?'Quadriceps':'Grip');
    const equipment=i===227?'Bench':i===228?'TRX':i===229?'Sled':'bodyweight';
    const entry = {
      catalog_id:cid,
      source:{provider:'movekit',provider_id:'synthetic-'+String(i)},
      identity:{name:i===227?'Synthetic Forearms Case':i===228?'Synthetic Lower Back Case':
        i===229?'Synthetic Adductor Case':('Synthetic Exercise '+String(i)),
        nl:null, category:newItem?'pending_review':'strength',
        family:newItem?'pending_review':'strength',
        pattern:newItem?'pending_review':'hinge',
        primary:[muscle],secondary:[],
        equipment:[equipment],difficulty:'beginner',
        type:newItem?'pending_review':'compound',goals:[]},
      intelligence:{fatigue:null,recovery:null,confidence:null},
      flags:{favorite:false,home_gym_ready:false,travel_ready:false,injury_flags:[]},
      relations:{alternatives:[],progressions:[],regressions:[]},
      assets:[],
    };
    if(newItem){
      const route=i<=471?'AI_PROPOSAL_PENDING_HUMAN_REVIEW':
        i<=556?'SOURCE_TERM_PROPOSAL_PENDING_HUMAN_REVIEW':
        'OWNER_FEEDBACK_PENDING_CONTENT_REVIEW';
      entry._review={status:'NOT_PUBLISHED',integration_status:'HOLD_FOR_HUMAN_AND_RELEASE_GATES',
        review_route:route,confirmed_by_authenticated_reviewer:false};
    }
    catalog.push(entry);
  }
  return {_schema:'tk504-private-v2-582-review-projection/1.0',
    _status:'PRIVATE_REVIEW_NOT_RELEASED',
    _base_count:226,_new_count:356,count:582,
    _approved_for_import:0,_app_activated:false,_media_grants_created:0,_review_total:356,
    _review_counts:{AI_PROPOSAL_PENDING_HUMAN_REVIEW:245,
      SOURCE_TERM_PROPOSAL_PENDING_HUMAN_REVIEW:85,
      OWNER_FEEDBACK_PENDING_CONTENT_REVIEW:26},
    catalog};
}
function realEcs(stage){
  const start=html.indexOf('var ExerciseCatalogService=(function(){');
  assert(start>0,'real ExerciseCatalogService present');
  const stop=html.indexOf('})();',start);
  assert(stop>start,'real ExerciseCatalogService closure found');
  const script=html.slice(start,stop+5);
  const sandbox={EX_CATALOG:JSON.parse(JSON.stringify(stage)), localStorage:{
    getItem:()=>null,setItem:()=>{}}, favoriteExIds:new Set(),performance:{now:()=>0},
    console:{log:()=>{}},Date,Math,JSON,Array,Set,Map};
  vm.runInNewContext(script,sandbox,{filename:'index.html:ExerciseCatalogService',timeout:2500});
  const svc=sandbox.ExerciseCatalogService;
  assert.equal(svc.count(),582);
  return svc;
}
let pass=0;
function test(name,fn){
  try {fn();pass++;console.log('PASS '+name);}
  catch(err){console.error('FAIL '+name+'\n'+err.stack);process.exitCode=1;}
}
let stage=freshStage(),engine=realEcs(stage);
test('existing actual ExerciseCatalogService counts 582 synthetic items',()=>{
  assert.equal(engine.count(),582);
  assert.equal(engine.search('',{},'name').length,582);
  assert.equal(engine.byId('TK-000582').catalog_id,'TK-000582');
});
const bridge=createReviewSearch({stage,catalogService:engine,registry});
test('review bridge exposes explicit filter semantics and NO activation',()=>{
  assert.equal(bridge.status,'REVIEW_ONLY_NOT_ACTIVATED');
  assert.equal(bridge.total,582); assert.equal(bridge.registryTerms,18);
  assert.equal(bridge.productionEnabled,false); assert.equal(bridge.approved,false);
  assert.equal(bridge.choices.muscles.length,5);
  assert.equal(bridge.choices.equipment.length,13);
  assert(Object.isFrozen(bridge)); assert(Object.isFrozen(bridge.choices.muscles));
});
test('existing canonical search remains one source for query and sorting',()=>{
  assert.equal(bridge.search('').length,582);
  assert.equal(bridge.search('Synthetic Forearms Case').length,1);
  assert.equal(bridge.search('synthetic',{},'name').length,582);
});
test('Forearms exact source muscle filter does NOT include legacy Grip',()=>{
  const rows=bridge.search('',{[FILTERS.muscle]:'movekit:muscle:forearms'});
  assert.deepEqual(Array.from(rows,x=>x.catalog_id),['TK-000227']);
  assert(!rows.some(x=>x.catalog_id==='TK-000001'));
  assert.equal(bridge.sourceFacets('TK-000227').muscles[0].code,'movekit:muscle:forearms');
  assert.equal(bridge.sourceFacets('TK-000230').muscles[0].code,null);
});
test('Lower Back exact source muscle filter does NOT become generic Rug',()=>{
  const rows=bridge.search('',{[FILTERS.muscle]:'movekit:muscle:lower_back'});
  assert.deepEqual(Array.from(rows,x=>x.catalog_id),['TK-000228']);
});
test('all filters are AND; no supplier content fabricated',()=>{
  const yes=bridge.search('',{[FILTERS.muscle]:'movekit:muscle:forearms',
    [FILTERS.equipment]:'movekit:equipment:bench'});
  const no=bridge.search('',{[FILTERS.muscle]:'movekit:muscle:forearms',
    [FILTERS.equipment]:'movekit:equipment:trx'});
  assert.deepEqual(Array.from(yes,x=>x.catalog_id),['TK-000227']);
  assert.equal(no.length,0);
});
test('regular ExerciseCatalogService filters still work',()=>{
  const first=bridge.search('',{category:'strength'});
  assert.equal(first.length,226);
  const onlyReview=bridge.search('',{category:'pending_review'});
  assert.equal(onlyReview.length,356);
});
test('unknown typed filter is fail-closed',()=>{
  for(const f of [{[FILTERS.muscle]:'m:grip'}, {[FILTERS.muscle]:'Grip'},
    {[FILTERS.equipment]:'movekit:equipment:not-registered'}]){
    assert.throws(()=>bridge.search('',f),/UNKNOWN_SOURCE_FACET_FILTER/);
  }
});
test('typed adapter has no permission to publish media, grant or write',()=>{
  assert.equal(bridge.productionEnabled,false);
  assert.equal(bridge.search('Synthetic Forearms Case')[0].assets.length,0);
  assert.equal(bridge.sourceFacets('TK-000900'),null);
  assert(!('activate' in bridge));assert(!('save' in bridge));
});
test('stage must be full private source-pinned 582 stage, not published 226',()=>{
  const x=freshStage();x.catalog=x.catalog.slice(0,226);
  assert.throws(()=>createReviewSearch({stage:x,catalogService:engine,registry}),/NOT_VERIFIED_PRIVATE_STAGE/);
});
test('fail closed against accidental import approval or activation',()=>{
  for(const [field,value] of [['_approved_for_import',1],['_app_activated',true],
    ['_media_grants_created',2],['_review_total',355]]){
    const s=freshStage();s[field]=value;
    assert.throws(()=>createReviewSearch({stage:s,catalogService:engine,registry}),/NOT_VERIFIED_PRIVATE_STAGE/);
  }
});
test('wrong provider or source metadata is rejected before display',()=>{
  const s=freshStage();s.catalog[227].source.provider_id='tampered';
  assert.throws(()=>createReviewSearch({stage:s,catalogService:engine,registry}),/SEARCH_CATALOG_SOURCE_MISMATCH/);
});
test('invalid or activated registry cannot become a filter',()=>{
  const s=freshStage(),r=JSON.parse(JSON.stringify(registry));
  r.runtime_activation=true;
  assert.throws(()=>createReviewSearch({stage:s,catalogService:engine,registry:r}),/INVALID_UNAPPROVED_TERM_REGISTRY/);
});
test('review bridge is not imported in index.html nor production config',()=>{
  assert(!html.includes('movekitV2EcsReviewAdapter'));
});
const mk=(s)=>()=>createReviewSearch({stage:s,catalogService:engine,registry});
test('duplicate catalog ids are rejected',()=>{
  const s=freshStage();s.catalog[300].catalog_id=s.catalog[299].catalog_id;
  assert.throws(mk(s),/SEARCH_CATALOG_SOURCE_MISMATCH/);
});
test('malformed stage/entries fail closed with controlled errors',()=>{
  for(const bad of [null,undefined,[],'x',{}]) {
    assert.throws(()=>createReviewSearch({stage:bad,catalogService:engine,registry}),/NOT_VERIFIED_PRIVATE_STAGE/);
  }
  assert.throws(()=>createReviewSearch(),/NOT_VERIFIED_PRIVATE_STAGE/);
  const a=freshStage();a.catalog[10]=null;
  assert.throws(mk(a),/SEARCH_CATALOG_SOURCE_MISMATCH/);
  const b=freshStage();b.catalog[10].catalog_id='tk-10';
  assert.throws(mk(b),/SEARCH_CATALOG_SOURCE_MISMATCH/);
  const c=freshStage();c.catalog[300].identity.primary='Forearms';
  assert.throws(mk(c),/SEARCH_CATALOG_SOURCE_MISMATCH/);
  assert.throws(()=>createReviewSearch({stage:freshStage(),catalogService:{search(){}},registry}),/INCOMPATIBLE_CANONICAL_SEARCH/);
});
test('altered provider slug or provider name is rejected',()=>{
  for(const p of ['MoveKit','other','']) {
    const s=freshStage();s.catalog[300].source.provider=p;
    assert.throws(mk(s),/SEARCH_CATALOG_SOURCE_MISMATCH/);
  }
});
test('stale or tampered review status on pending items is rejected',()=>{
  const muts=[
    e=>{e._review.status='PUBLISHED';},
    e=>{e._review.confirmed_by_authenticated_reviewer=true;},
    e=>{e._review.integration_status='APPROVED';},
    e=>{delete e._review;},
    e=>{e.identity.category='strength';},
    e=>{e.assets=[{type:'video'}];},
  ];
  for(const m of muts){const s=freshStage();m(s.catalog[400]);
    assert.throws(mk(s),/NEW_CATALOG_ITEM_PREMATURE_RELEASE/);}
});
test('changed review route counts are rejected',()=>{
  const s=freshStage();s._review_counts.OWNER_FEEDBACK_PENDING_CONTENT_REVIEW=25;
  assert.throws(mk(s),/STAGE_REVIEW_COUNTS_CHANGED/);
});
test('mutating stage/registry after creation cannot change the view',()=>{
  const s=freshStage(),r=JSON.parse(JSON.stringify(registry));
  const b=createReviewSearch({stage:s,catalogService:engine,registry:r});
  s.count=1;s._app_activated=true;s.catalog[226].identity.primary=['Grip'];
  r.muscles.Forearms.code='movekit:muscle:hacked';
  assert.equal(b.total,582);
  assert.equal(b.sourceFacets('TK-000227').muscles[0].code,'movekit:muscle:forearms');
  assert.equal(b.sourceFacets('TK-000227').approved,false);
  assert.deepEqual(Array.from(b.search('',{[FILTERS.muscle]:'movekit:muscle:forearms'}),x=>x.catalog_id),['TK-000227']);
  assert.equal(b.sourceFacets({}),null);
});
test('activation/media attempts on the view are impossible',()=>{
  for(const k of ['productionEnabled','approved','status','displayOnly']) {
    assert.throws(()=>{bridge[k]=k==='status'?'ACTIVE':true;},TypeError);
  }
  assert.throws(()=>{bridge.activate=()=>{};},TypeError);
  assert.throws(()=>{bridge.filterKeys.muscle='x';},TypeError);
  for(const k of Object.keys(bridge)) assert(!/sign|media|grant|url|write|save|import/i.test(k),k);
  assert.equal(bridge.sourceFacets('TK-000227').runtimeActivation,false);
});
test('private stage still yields zero media-signing identities',()=>{
  const media=require('./movekitV2ExerciseMediaBridge.js');
  let calls=0;
  const mb=media.create({catalog:freshStage(),mediaClient:{get(){calls++;},invalidate(){calls++;}}});
  assert.equal(mb.registeredMoveKitExercises,0);
  assert.equal(mb.resolve({catalog_id:'TK-000001'}),null);
  assert.equal(calls,0);
});
console.log('MoveKit V2 real-ECS review search: '+pass+' checks, exit '+(process.exitCode||0));
