'use strict';
// TK504 / #603: exact real app helpers in isolated VM. All catalog entries
// are from the public 226 baseline. No live Supabase, owner data or media.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
assert.match(html,/const TK504_TYPED_FK_SESSION_RELEASE = false;/,
 'The real product release flag MUST stay off');
const match=html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(match,'Single current catalog exists');
const catalog=JSON.parse(match[1]).catalog;
assert.equal(catalog.length,226);
const source=new Map(catalog.map(x=>[x.catalog_id,x]));
const id='TK-000038',provider=source.get(id).source.provider_id;
function extract(name){
 const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);
 assert(m,'Missing real function '+name);let depth=0;
 for(let i=html.indexOf('{',m.index);i<html.length;i++){
  if(html[i]==='{')depth++;
  if(html[i]==='}'&&--depth===0)return html.slice(m.index,i+1);
 }
 throw Error('Unterminated '+name);
}
const names=['tk504CatalogSourceRefFromCatalog','tk504CatalogSourceRefFromSelection',
 'tk504ValidateCatalogSourceRef','tk504VerifySessionBinding',
 'tk504RewriteVerifiedSessionRow','tkSessieSchrijfOpts','tkSessieOptsVoor',
 'ensureSessionExerciseRows','writeSessionRow'];
let passes=0;
function ok(val,label){assert(val,label);passes++;}
async function rejects(p,re){await assert.rejects(p,re);passes++;}
function sandbox(on){
 let owner='synthetic-owner-A',rpcCalls=0,shadowCalls=0,writes=[];
 const s=vm.createContext({
  TK504_TYPED_FK_SESSION_RELEASE:on,
  ExerciseCatalogService:{byId:key=>source.get(key)||null},
  tkEigenaarUid:()=>owner,navigator:{onLine:true},
  sbRpc:async(fn,args)=>{
    rpcCalls++;
    assert.equal(fn,'tk504_resolve_catalog_fk');
    assert.equal(args.p_catalog_id,id);
    assert.equal(args.p_provider_id,provider);
    return 'TKC-000038';
  },
  ensureExerciseRowStatus:async()=>{shadowCalls++;return 'queued';},
  sessionLog:{[id]:{sets:[{kg:20,reps:8}]},'own-exercise':{sets:[{kg:40,reps:5}]}},
  sbPostQ:async(table,row,opts)=>{writes.push({table,row,opts});return true;},
  Set,console
 });
 vm.runInContext(names.map(extract).join('\n'),s,{timeout:5000});
 return {s,setOwner:x=>{owner=x;},get rpcCalls(){return rpcCalls;},
  get shadowCalls(){return shadowCalls;},get writes(){return writes;}};
}
(async()=>{
 const a=sandbox(true),ref=a.s.tk504CatalogSourceRefFromSelection(id);
 ok(ref&&ref.kind==='movekit-catalog-v1','real ECS source reference');
 const selected={id,tk504_catalog_ref:ref};
 const b=await a.s.tk504VerifySessionBinding(selected);
 ok(b&&b.fk_id==='TKC-000038'&&b.owner_uid==='synthetic-owner-A',
   'reviewed authenticated RPC exact answer');
 ok(a.rpcCalls===1,'a single authenticated RPC');
 const original={id:'synthetic-uuid',exercise_id:id,user_id:'synthetic-owner-A',
   sets_detail:[{reps:8,kg:20}],note:'preserve my note'};
 const rewritten=a.s.tk504RewriteVerifiedSessionRow(original,b);
 ok(rewritten.exercise_id==='TKC-000038','remaps only FK');
 ok(rewritten.id===original.id&&rewritten.note===original.note&&
    rewritten.sets_detail===original.sets_detail&&original.exercise_id===id,
   'idempotent UUID, sets, original note and original object unchanged');
 await a.s.writeSessionRow(original,{detail:true,queueOnly:false,tk504_binding:b});
 ok(a.writes.length===1&&a.writes[0].table==='sessions',
   'one and only the original sessions writer');
 ok(a.writes[0].row.exercise_id==='TKC-000038','saved row has validated FK');
 const statuses=await a.s.ensureSessionExerciseRows([selected,{id:'own-exercise'}]);
 ok(statuses[id]==='typed-verified'&&statuses['own-exercise']==='queued',
   'catalog requires approved binding, personal keeps legacy queue');
 ok(statuses._tk504Bindings[id].fk_id==='TKC-000038'&&a.shadowCalls===1,
   'new catalog FK never creates a personal shadow');
 const so=a.s.tkSessieOptsVoor(statuses,id);
 ok(so.queueOnly===false&&so.tk504_binding.fk_id==='TKC-000038',
   'normal execution options select the reviewed binding');
 const own=a.s.tkSessieOptsVoor(statuses,'own-exercise');
 ok(own.queueOnly===true&&!own.tk504_binding,'legacy offline queue remains');
 await rejects(Promise.resolve().then(()=>a.s.tkSessieOptsVoor({[id]:'rejected'},id)),/exercise_row_rejected/);
 // Provider identity, catalog source, role and response are checked before any write.
 await rejects(a.s.tk504VerifySessionBinding({...selected,
   tk504_catalog_ref:{...ref,provider_id:'forged'}}),/tk504_catalog_provenance_invalid/);
 a.s.sbRpc=async()=>null;
 await rejects(a.s.tk504VerifySessionBinding(selected),/tk504_catalog_fk_unverified/);
 a.s.sbRpc=async()=> 'TKC-000019';
 await rejects(a.s.tk504VerifySessionBinding(selected),/tk504_catalog_fk_unverified/);
 a.s.navigator.onLine=false;
 await rejects(a.s.tk504VerifySessionBinding(selected),/tk504_typed_fk_offline_unverified/);
 a.s.navigator.onLine=true;
 a.s.sbRpc=async()=>{a.setOwner('synthetic-owner-B');return 'TKC-000038';};
 await rejects(a.s.tk504VerifySessionBinding(selected),/tk504_account_changed/);
 await rejects(Promise.resolve().then(()=>a.s.tk504RewriteVerifiedSessionRow(original,b)),/tk504_session_fk_mapping_denied/);
 a.setOwner('synthetic-owner-A');
 ok(a.s.tk504RewriteVerifiedSessionRow(original,null)===original,'no typed option is byte-equivalent');
 const no=sandbox(false);
 const dref=no.s.tk504CatalogSourceRefFromSelection(id);
 ok(await no.s.tk504VerifySessionBinding({id,tk504_catalog_ref:dref})===null,
  'production stage flag prevents all RPCs');
 ok(no.rpcCalls===0,'disabled mode sends no binding requests');
 await no.s.writeSessionRow(original,{detail:true});
 ok(no.writes.length===1&&no.writes[0].row===original,
  'the real central writer sends the original legacy object without a binding');
 await rejects(Promise.resolve().then(()=>no.s.tk504RewriteVerifiedSessionRow(original,b)),/tk504_session_fk_mapping_denied/);
 const legacy=await no.s.ensureSessionExerciseRows([{id,tk504_catalog_ref:dref}]);
 ok(legacy[id]==='queued'&&no.shadowCalls===1,'existing released-226 logging unchanged');
 const finish=extract('finishSession');
 const guided=extract('doPersist');
 const writer=extract('writeSessionRow');
 ok(writer.includes('tk504RewriteVerifiedSessionRow(row,opts.tk504_binding)'),
  'ONE existing writer owns the only FK remapping');
 ok((finish.match(/tk504RewriteVerifiedSessionRow/g)||[]).length===0,
  'normal cardio and strength do not duplicate the writer mapping');
 ok(guided.includes('tk504VerifySessionBinding(it)')&&guided.includes('tk504_binding:tk504Binding'),
   'guided passes reviewed binding to the same central writer');
 console.log('TK504 typed FK central sessions writer: '+passes+
  ' runtime-contract assertions PASS; online/owner/identity denial, no personal shadow, unchanged legacy/offline fallback, flag OFF');
})().catch(e=>{console.error(e);process.exitCode=1;});
