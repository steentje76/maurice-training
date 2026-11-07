'use strict';
// Actual app functions and Guided module; serialized VM restart, NOT Android/browser proof.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const catalog=JSON.parse(html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m)[1]).catalog;
const c1=catalog.find(x=>x.catalog_id==='TK-000038'),c2=catalog.find(x=>x.catalog_id==='TK-000039');
const ref=c=>({kind:'movekit-catalog-v1',catalog_id:c.catalog_id,provider_id:c.source.provider_id});
function extract(name){const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);assert(m,name);let d=0;for(let i=html.indexOf('{',m.index);i<html.length;i++){if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(m.index,i+1);}throw Error('unclosed '+name);}
function store(){const map=new Map([['tk_cache_owner_uid','owner-A']]);return {map,getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
const serial=x=>JSON.parse(JSON.stringify(x));
function normal(storage=store()){
 const state={owner:'owner-A',rendered:[]};
 const dummy={classList:{add(){},remove(){}},style:{}};
 const s=vm.createContext({console,localStorage:storage,TK504_TYPED_FK_SESSION_RELEASE:true,
  tkEigenaarUid:()=>state.owner,curT:null,sessionLog:{},sessionExtra:[],resolvedWorkout:null,activeInstanceId:null,
  execFocus:{},execSkipped:{},sessionRxAdj:{},trainStart:0,trainPaused:false,pausedAccumMs:0,pausedAt:0,lastSetDoneAt:{},saveState:'saved',lastSaveTs:null,
  TRAIN_CFG:{A:[{id:c1.catalog_id,naam:'personal same-number base',sets:3}]},pctSelection:{},rpeManual:{},warmupState:{},cardioSplitMode:{},cardioSplits:{},manualKgSets:{},
  newClientRowId:()=> '00000000-0000-4000-8000-000000000001',
  updateSaveIndicator(){},toast(){},cleanupOtherTrainScreens(){},ensureVasteTrainingScreenExists:async()=>{},
  document:{querySelectorAll:()=>[],getElementById:()=>dummy},consumeHomeResumeIntent:()=>true,isSameLocalDay:()=>true,
  confirmModal:async()=>true,getExerciseMuscles:()=>[],recoveryAdjustmentForToday:async()=>({setsDelta:0,rpeDelta:0}),recoveryAdjustToast(){},
  renderTrainScreen:async()=>{state.rendered=serial(s.getSessionExs('A'));},restoreSessionLogToDom(){},startTrainTimer(){},
  applySessionRecovery:(t,list)=>list,tk504ValidateCatalogSourceRef:(id,r)=>r?.catalog_id===id?r:null,
  window:{},Date,Object,JSON
 });
 for(const name of ['currentWorkoutElapsedMs','persistTrainingDraft','restoreTrainingDraft','getSessionExs','tk504StableSessionId','startT'])vm.runInContext(extract(name),s);
 if(html.includes('function tk603DraftOwnerMatches('))vm.runInContext(extract('tk603DraftOwnerMatches'),s);
 return {s,state,storage};
}
function guided(storage=store()){
 const state={owner:'owner-A',writes:[],bindingCalls:0,ok:false,generated:0};
 const s=vm.createContext({console,localStorage:storage,TK504_TYPED_FK_SESSION_RELEASE:true,
  tkEigenaarUid:()=>state.owner,ExerciseCatalogService:{byId:id=>catalog.find(c=>c.catalog_id===id)},
  tk504ValidateCatalogSourceRef:(id,r)=>r?.catalog_id===id&&r.provider_id===catalog.find(c=>c.catalog_id===id)?.source.provider_id?r:null,
  tk504CatalogSourceRefFromCatalog:c=>c?ref(c):null,
  tk504VerifySessionBinding:async it=>{state.bindingCalls++;if(!s.tk504ValidateCatalogSourceRef(it.id,it.tk504_catalog_ref))throw Error('unverified');return {owner_uid:state.owner,fk_id:'TKC-'+it.id.slice(3)};},
  buildStrengthSessionRow:(id,sets,opts)=>({row:{exercise_id:id,weight:sets[0]?.kg,sets_detail:sets,...opts}}),
  writeSessionRow:async(row,opts)=>{state.writes.push({row:serial(row),opts:serial(opts),snapshot:JSON.parse(storage.getItem('tk_gw_active')||'null')});return {status:state.ok?'confirmed':'failed'};},
  newClientRowId:()=> '00000000-0000-4000-8000-'+String(++state.generated).padStart(12,'0'),
  td:()=> '2026-11-07',strengthBasisCache:{},resolveWorkingWeight:()=>({suggested:null}),
  canonicalNewExerciseItem:async(id,intent)=>({suggestedWeight:null,_detrain:null,_weightOverride:false}),
  loadStrengthBasis:async()=>({recent:null}),window:{},JSON,Date,Math
 });
 s.window.ExerciseCatalogService=s.ExerciseCatalogService;
 if(html.includes('function tk603DraftOwnerMatches('))vm.runInContext(extract('tk603DraftOwnerMatches'),s);
 const start=html.indexOf('var GW=(function(){'),end=html.indexOf('\n})();',start);
 assert(start>0&&end>start);vm.runInContext(html.slice(start,end+6),s,{timeout:6000});
 return {s,state,storage,gw:s.GW};
}
const tests=[];function test(name,fn){tests.push({name,fn});}
test('normal Preview execution source and swap survive serialized app restart',async()=>{
 const a=normal();a.s.curT='A';a.s.activeInstanceId='synthetic-instance';
 a.s.sessionLog={[c2.catalog_id]:{sets:[{kg:31.5,reps:8,rpe:8,done:true}],exNote:'synthetic note'}};
 a.s.resolvedWorkout={t:'A',instanceId:'synthetic-instance',items:[{id:c2.catalog_id,tk504_catalog_ref:ref(c2),sets:3}]};
 a.s.persistTrainingDraft(true);
 const b=normal(a.storage);await b.s.startT('A');
 assert.equal(b.state.rendered[0].id,c2.catalog_id,'resolved Preview swap must not revert to original/personal TRAIN_CFG item');
 assert.deepEqual(b.state.rendered[0].tk504_catalog_ref,ref(c2));
 assert.equal(b.s.sessionLog[c2.catalog_id].sets[0].kg,31.5);assert.equal(b.s.sessionLog[c2.catalog_id].exNote,'synthetic note');
 assert.equal(b.s.activeInstanceId,'synthetic-instance');
});
test('normal stable UUID is durable before network can commit',()=>{
 const a=normal();a.s.curT='A';a.s.sessionLog={[c1.catalog_id]:{sets:[{kg:24,reps:8}]}};a.s.persistTrainingDraft(true);
 const id=a.s.tk504StableSessionId(a.s.sessionLog[c1.catalog_id]);
 const b=normal(a.storage),draft=b.s.restoreTrainingDraft();assert.equal(draft.sessionLog[c1.catalog_id]._tk504StableSessionId,id,'kill after POST cannot generate new UUID');
 assert.equal(b.s.tk504StableSessionId(draft.sessionLog[c1.catalog_id]),id);
});
test('draft owner mismatch never returns previous owner data',()=>{
 const a=normal();a.s.curT='A';a.s.sessionLog={[c1.catalog_id]:{sets:[{kg:24,reps:8}]}};a.s.persistTrainingDraft(true);
 a.state.owner='owner-B';assert.equal(a.s.restoreTrainingDraft(),null);
});
test('untagged old draft accepted only with matching device cache owner',()=>{
 const a=normal();a.storage.setItem('tk_draft_training',JSON.stringify({t:'A',sessionLog:{x:{sets:[{kg:2,reps:3}]}},ts:1}));
 assert(a.s.restoreTrainingDraft());a.storage.setItem('tk_cache_owner_uid','owner-B');assert.equal(a.s.restoreTrainingDraft(),null);
});
test('Guided catalog source never inherits same-id personal local history',()=>{
 const a=guided();a.storage.setItem('tk_gw_hist',JSON.stringify({[c1.catalog_id]:{weight:199,reps:'3',at:1}}));
 a.gw.start({items:[{id:c1.catalog_id,pick:'compound',sets:1,tk504_catalog_ref:ref(c1)}]},{goal:'kracht'});
 assert.equal(a.gw.cur().weight,null);assert.equal(a.gw.cur().prev,null);
 a.gw.setWeight(32);a.gw.rateSet('goed',8);
 const h=JSON.parse(a.storage.getItem('tk_gw_hist'));assert.equal(h[c1.catalog_id].weight,199,'typed set must never overwrite personal key');
});
test('Guided failed write retains source, sets and exact UUID through serialized restart',async()=>{
 const a=guided();a.gw.start({items:[{id:c1.catalog_id,pick:'compound',sets:1,tk504_catalog_ref:ref(c1)}]},{goal:'kracht'});
 a.gw.setWeight(32);a.gw.rateSet('goed',8);await a.gw.finish();
 assert.equal(a.state.writes.length,1);const first=a.state.writes[0];
 assert.equal(first.snapshot.items[0]._rowId,first.row.id,'Guided ID stored before request');
 const b=guided(a.storage);assert(b.gw.resume());assert.deepEqual(serial(b.gw.cur().tk504_catalog_ref),ref(c1));assert.equal(b.gw.cur().setsDone[0].reps,8);
 b.state.ok=true;await b.gw.retrySave();assert.equal(b.state.writes[0].row.id,first.row.id);assert.equal(b.storage.getItem('tk_gw_active'),null);
});
test('Guided snapshot cannot resume or save under another owner',async()=>{
 const a=guided();a.gw.start({items:[{id:c1.catalog_id,pick:'compound',sets:1,tk504_catalog_ref:ref(c1)}]},{goal:'kracht'});a.gw.rateSet('goed',8);
 const b=guided(a.storage);b.state.owner='owner-B';assert.equal(b.gw.resume(),false);
 a.state.owner='owner-B';await a.gw.finish();assert.equal(a.state.writes.length,0);
});
test('Guided explicit replacement keeps new source and never reuses old source claim',async()=>{
 const a=guided();a.gw.start({items:[{id:c1.catalog_id,pick:'compound',sets:1,tk504_catalog_ref:ref(c1)}]},{goal:'kracht'});
 assert(await a.gw.replaceExAsync(c2.catalog_id,ref(c2)));assert.equal(a.gw.cur().id,c2.catalog_id);assert.deepEqual(serial(a.gw.cur().tk504_catalog_ref),ref(c2));
});
test('pre-fix Guided draft resumes only for proven same device owner',()=>{
 const a=guided();a.gw.start({items:[{id:c1.catalog_id,pick:'compound',sets:1}]},{goal:'kracht'});
 const old=JSON.parse(a.storage.getItem('tk_gw_active'));delete old.owner_uid;a.storage.setItem('tk_gw_active',JSON.stringify(old));
 const b=guided(a.storage);assert(b.gw.resume());b.storage.setItem('tk_cache_owner_uid','owner-B');assert.equal(b.gw.resume(),false);
});
test('Guided unverified explicit source remains blocked instead of downgrading to personal',async()=>{
 const a=guided(),bad={...ref(c1),provider_id:'unverified-provider'};
 a.storage.setItem('tk_gw_hist',JSON.stringify({[c1.catalog_id]:{weight:199,reps:'3',at:1}}));
 a.gw.start({items:[{id:c1.catalog_id,pick:'compound',sets:1,tk504_catalog_ref:bad}]},{goal:'kracht'});
 assert.deepEqual(serial(a.gw.cur().tk504_catalog_ref),bad);assert.equal(a.gw.cur().weight,null);
 a.gw.rateSet('goed',8);await a.gw.finish();assert.equal(a.state.writes.length,0);assert(a.storage.getItem('tk_gw_active'));
});
test('Guided refuses typed write when retry UUID cannot be persisted',async()=>{
 const a=guided();a.gw.start({items:[{id:c1.catalog_id,pick:'compound',sets:1,tk504_catalog_ref:ref(c1)}]},{goal:'kracht'});a.gw.rateSet('goed',8);
 a.storage.setItem=()=>{throw Error('disk unavailable');};await a.gw.finish();assert.equal(a.state.writes.length,0);
});
test('normal UUID persistence failure refuses to reach a request',()=>{
 const a=normal();a.s.curT='A';a.s.sessionLog={[c1.catalog_id]:{sets:[{kg:24,reps:8}]}};
 a.storage.setItem=()=>{throw Error('disk unavailable');};
 assert.throws(()=>a.s.tk504StableSessionId(a.s.sessionLog[c1.catalog_id]),/not_durable/);
});
(async()=>{let failed=0;for(const t of tests){try{await t.fn();console.log('PASS '+t.name);}catch(e){failed++;console.error('FAIL '+t.name+': '+e.message);}}console.log('TK603 serialized VM restart: '+(tests.length-failed)+'/'+tests.length+' scenarios PASS; no real Android/browser or live account test');if(failed)process.exitCode=1;})();
