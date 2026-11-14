'use strict';
// #603 — source provenance through the ORIGINAL Builder/Definition/Preview/Normal/Guided.
// Existing public 226 catalog only; no licensed 356 records, DB writes or media grants.
(async()=>{
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const m=html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(m,'original single catalog exists');
const catalog=JSON.parse(m[1]);
assert.equal(catalog.catalog.length,226);
const byId=new Map(catalog.catalog.map(c=>[c.catalog_id,c]));
const cid='TK-000038',other='TK-000019';
const uid=byId.get(cid),otherRec=byId.get(other),candidateRec=byId.get('TK-000001');
assert(uid&&otherRec&&candidateRec);
function take(name){
 const match=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);
 assert(match,'Missing original function '+name);
 let dep=0;
 for(let i=html.indexOf('{',match.index);i<html.length;i++){
  if(html[i]==='{')dep++;
  if(html[i]==='}'&&--dep===0)return html.slice(match.index,i+1);
 }
 throw Error('Unclosed original function '+name);
}
const names=['tk504CatalogSourceRefFromCatalog','tk504CatalogSourceRefFromSelection',
 'tk504ValidateCatalogSourceRef','tk504BuilderRefsFromPlan','tk504AttachSavedCatalogRefs',
 'snapshotFromVasteTraining','snapshotFromCustomTraining','getTrainingDefinition',
 'previewDefinitionItems','previewWorkingList','previewRenderSwapPicker','previewApplySwap','previewBuildModifications',
 'buildResolvedExecutionItems','buildGuidedWorkoutPlan'];
const script=names.map(take).join('\n');
let renders=0;
const ctx=vm.createContext({
  ExerciseCatalogService:{byId:id=>byId.get(id)||null,all:()=>catalog.catalog,count:()=>226},
  DecisionCore:{Evidence:{decisionRulesSnapshot:()=>({version:'synthetic-deterministic'})}},
  IntervalEngineCore:{normalizePrescription:()=>null},
  DETRAINING_RULES:null,
  customTrainings:[],
  sbGet:async(table)=>{
    if(table==='custom_trainings')return ctx.remoteRows;
    if(table==='custom_training_exercises')return ctx.remoteTargets;
    return [];
  },remoteRows:[],remoteTargets:[],
  previewCtx:null,WB:{altList:()=>[candidateRec]},applyAthleteConstraintsCatalog:items=>items,
  escHtml:x=>String(x),previewExerciseName:id=>id,
  previewRoleLabel:()=>'',previewResolveItemWeight:()=>42,
  previewResolveItemDetrain:()=>null,renderTrainingPreview:()=>{renders++;},
  ExerciseAssetProvider:{poster:()=>null,hasVideo:()=>false},
  exercises:[],resolveCardioType:()=>null,Set,console,
  // #587 Preview swap guards resolve the picked object and load its own history.
  resolvePickerEx:id=>byId.get(id)?{id,name:id,active:true,_catalog:true,catalog_id:id}:{id,name:id,active:true},
  loadPrevPerformance:async()=>null,toast:()=>{}
});
vm.runInContext(script,ctx,{timeout:3500});
const explicit=ctx.tk504CatalogSourceRefFromCatalog(uid);
assert(explicit&&explicit.catalog_id===cid&&explicit.kind==='movekit-catalog-v1');
assert.equal(explicit.provider_id,uid.source.provider_id);
const fromUi=ctx.tk504CatalogSourceRefFromSelection(cid);
assert.equal(fromUi.provider_id,explicit.provider_id);
assert.equal(ctx.tk504CatalogSourceRefFromSelection('TK-000999'),null);
assert.equal(ctx.tk504ValidateCatalogSourceRef(cid,{...explicit,catalog_id:other}),null);
assert.equal(ctx.tk504ValidateCatalogSourceRef(cid,{...explicit,provider_id:'wrong-provider'}),null);
assert.equal(ctx.tk504ValidateCatalogSourceRef(cid,{catalog_id:cid,provider_id:explicit.provider_id}),null);
assert.equal(ctx.tk504ValidateCatalogSourceRef(other,explicit),null);
const pending={catalog_id:'TK-000227',source:{provider:'movekit',provider_id:'private-not-released'},
 identity:{name:'Private synthetic'},_review:{status:'NOT_PUBLISHED'}};
assert.equal(ctx.tk504CatalogSourceRefFromCatalog(pending),null);
assert.equal(ctx.tk504CatalogSourceRefFromCatalog({...uid,catalog_id:'TK-000583'}),null,
 'unlicensed IDs outside 1..582 must not receive a source reference');
const forgedPersonal={id:cid,scope:'personal',name:'Owner-created exercise',catalog_id:cid};
assert.equal(ctx.tk504ValidateCatalogSourceRef(cid,forgedPersonal),null);
const plan=[{id:cid,tk504_catalog_ref:explicit,sets:3,reps:8},
 {id:other,sets:2},{id:'personal-1',tk504_catalog_ref:explicit,sets:4}];
const savedRefs=ctx.tk504BuilderRefsFromPlan(plan);
assert.equal(Object.keys(savedRefs).length,1,'only EXPLICIT matching catalog selection persists');
assert.equal(savedRefs[cid].provider_id,explicit.provider_id);
assert.equal(savedRefs[other],undefined,'no ID-based backfill from old bare target');
const targets=[{exercise_id:cid,sets:3,reps:8},{exercise_id:other,sets:2},
 {exercise_id:'personal-1',sets:4}];
const meta={tk504_catalog_refs:savedRefs};
const annotated=ctx.tk504AttachSavedCatalogRefs(targets,meta);
assert.equal(annotated[0].tk504_catalog_ref.catalog_id,cid);
assert(!Object.hasOwn(annotated[1],'tk504_catalog_ref'));
assert(!Object.hasOwn(annotated[2],'tk504_catalog_ref'));
const restored=ctx.tk504AttachSavedCatalogRefs(targets,{tk504_catalog_refs:{[cid]:{...explicit,provider_id:'spoof'}}});
assert(!Object.hasOwn(restored[0],'tk504_catalog_ref'),'invalid saved metadata is ignored');
const custom=ctx.snapshotFromCustomTraining({id:'synthetic',intervalPrescription:null},annotated,[]);
assert.equal(custom.items[0].tk504_catalog_ref.catalog_id,cid);
assert(!Object.hasOwn(custom.items[1],'tk504_catalog_ref'));
assert.equal(custom.items[0].exercise_id,cid,'snapshot retains catalog domain identity');
const fixed=ctx.snapshotFromVasteTraining({id:'synthetic'},targets,[]);
assert(!Object.hasOwn(fixed.items[0],'tk504_catalog_ref'),'old fixed-plan TK-looking IDs are NOT inferred');
ctx.customTrainings=[{id:'save-1',name:'Synthetic saved workout',
 exercise_targets:targets,source:'builder',metadata:meta}];
let def=await (async()=>ctx.getTrainingDefinition('custom','save-1'))();
assert.equal(def.exercises[0].tk504_catalog_ref.catalog_id,cid);
assert(!Object.hasOwn(def.exercises[1],'tk504_catalog_ref'));
ctx.customTrainings=[];
ctx.remoteRows=[{id:'save-2',naam:'Synthetic server workout',source:'builder',metadata:meta}];
ctx.remoteTargets=targets.map((t,i)=>({...t,sort_order:i}));
def=await ctx.getTrainingDefinition('custom','save-2');
assert.equal(def.exercises[0].tk504_catalog_ref.provider_id,explicit.provider_id,
 'server metadata survives definition read');
const _ctx={
 def:{id:'save-2',exercises:annotated},source:'custom',order:[cid,other],
 removedIds:new Set(),swaps:{},swapRefs:{},overrides:{}
};
ctx.previewCtx=_ctx;
const current=ctx.previewWorkingList();
assert.equal(current[0].tk504_catalog_ref.catalog_id,cid);
assert(!Object.hasOwn(current[1],'tk504_catalog_ref'));
const normal=ctx.buildResolvedExecutionItems(current);
assert.equal(normal[0].tk504_catalog_ref.catalog_id,cid);
assert(!Object.hasOwn(normal[1],'tk504_catalog_ref'),
 'a bare catalog-looking ID cannot silently inherit provenance');
const guided=ctx.buildGuidedWorkoutPlan(current);
assert.equal(guided.items[0].tk504_catalog_ref.catalog_id,cid);
assert(!Object.hasOwn(guided.items[1],'tk504_catalog_ref'));
const candidateId=candidateRec.catalog_id;
ctx.previewApplySwap(cid,candidateId);
assert.equal(renders,1);
assert(!Object.hasOwn(ctx.previewWorkingList()[0],'tk504_catalog_ref'),
 'bare replacement ID without an offered catalog source is never promoted');
ctx.previewCtx.swaps={};ctx.previewCtx.swapRefs={};
ctx.previewCtx.swapPickerFor=cid;
const offered=ctx.previewRenderSwapPicker();
assert(offered.includes(candidateId));
assert.equal(ctx.previewCtx.swapCandidateRefs[candidateId].provider_id,candidateRec.source.provider_id);
ctx.previewApplySwap(cid,candidateId);
assert.equal(renders,2);
const swapped=ctx.previewWorkingList()[0];
assert.equal(swapped.exercise_id,candidateId);
assert.equal(swapped.tk504_catalog_ref.catalog_id,candidateId);
const mods=ctx.previewBuildModifications();
assert.equal(mods[0].type,'swap');
assert.equal(mods[0].tk504_catalog_ref.catalog_id,candidateId);
const damaged={...ctx.previewCtx.swapRefs[cid],provider_id:'not-original'};
ctx.previewCtx.swapRefs[cid]=damaged;
assert(!Object.hasOwn(ctx.previewWorkingList()[0],'tk504_catalog_ref'),
 'forged swap reference does not inherit previous exercise identity');
ctx.previewCtx.swapRefs[cid]=null;
assert(!Object.hasOwn(ctx.previewWorkingList()[0],'tk504_catalog_ref'));
// A Preview object restored from an older local draft may lack the new field.
ctx.previewCtx.swapRefs=undefined;
ctx.previewCtx.swapCandidateFor=null;
ctx.previewCtx.swapCandidateRefs={};
ctx.previewApplySwap(cid,candidateId);
assert(ctx.previewCtx.swapRefs&&ctx.previewCtx.swapRefs[cid]===null,
 'older in-memory Preview contexts are upgraded without claiming identity');
assert(html.includes('tk504_catalog_refs:refs')&&html.includes('tk504CatalogSourceRefFromCatalog(ex)'),
 'original Builder save and generator connect explicit provenance');
assert(html.includes('tk504_catalog_ref:tk504ValidateCatalogSourceRef(it.id,it.tk504_catalog_ref)'),
 'original guided start serializes the reference into its resumable active item');
assert(html.includes('...tk504AttachSavedCatalogRefs')===false,
 'no unexpected second Builder database mapper');
console.log('TK504 original Builder/Definition/Preview/Normal/Guided provenance contract PASS (226 catalog baseline, untagged personal and legacy remain separate)');
})().catch(err=>{console.error(err);process.exitCode=1;});
