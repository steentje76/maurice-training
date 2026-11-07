'use strict';
// TK #603: original application read functions. No live data, no untyped
// TK-ID -> TKC promotion, no mixed personal and vendor-session metrics.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const match=html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(match,'actual embedded 226 exercise catalog required');
const catalog=JSON.parse(match[1]).catalog;
assert.equal(catalog.length,226);
const c=catalog.find(x=>x.catalog_id==='TK-000038');
assert(c&&c.source.provider_id);
let checked=0;
const ok=(x,why)=>{assert(x,why);checked++};
function extract(name){
 const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);
 assert(m,'original app function missing: '+name);
 let depth=0;for(let i=html.indexOf('{',m.index);i<html.length;i++){
  if(html[i]==='{')depth++;
  if(html[i]==='}'&&--depth===0)return html.slice(m.index,i+1);
 }
 throw Error('unclosed '+name);
}
const functions=['tk504CatalogSourceRefFromCatalog','tk504CatalogSourceRefFromSelection',
 'tk504ValidateCatalogSourceRef','tk504VerifySessionBinding',
 'tk504HistoricalSourceForSession','tk603OwnRows','tk603ReadExerciseSessions','tk603PickerSourceKey',
 'tk603RecentPickerSourceKeys','loadStrengthBasis','canonicalNewExerciseItem'];
function env(){
 const state={owner:'A',online:true,release:true, mode:'ok',queries:[],
   rpcs:[], calcCalls:[],working:[], estCache:{},basisCache:{}};
 const legacy={id:'TK-000038',exercise_id:'TK-000038',user_id:'A',date:'2026-09-20',weight:31,reps:8};
 const typed={id:'TKC-000038',exercise_id:'TKC-000038',user_id:'A',date:'2026-11-06',weight:72,reps:8};
 const foreign={id:'TKC-000019',exercise_id:'TKC-000019',user_id:'B',date:'2026-11-06',weight:300,reps:1};
 const s=vm.createContext({
  get TK504_TYPED_FK_SESSION_RELEASE(){return state.release;},
  navigator:{get onLine(){return state.online;}},
  tkEigenaarUid:()=>state.owner,
  ExerciseCatalogService:{byId:id=>catalog.find(x=>x.catalog_id===id)||null},
  sbRpc:async(fn,args)=>{
   state.rpcs.push({fn,args});
   if(state.mode==='switched-rpc'){state.owner='B';return 'TKC-000038';}
   if(state.mode==='no-rpc')return null;
   if(fn==='tk504_resolve_catalog_fk')return args.p_provider_id===c.source.provider_id?'TKC-000038':null;
   if(fn==='tk504_historical_catalog_id')return args.p_exercise_id==='TKC-000038'?'TK-000038':null;
   throw Error('unexpected RPC '+fn);
  },
  sbGet:async(table,query)=>{
   assert.equal(table,'sessions');
   state.queries.push(query);
   if(query.includes('exercise_id=not.is.null'))return [
    typed,legacy,{exercise_id:'TKC-000227',user_id:'B'},foreign,typed];
   if(state.mode==='switched-query'){state.owner='B';}
   if(query.includes('exercise_id=eq.TKC-000038'))return [typed,legacy,foreign];
   if(query.includes('exercise_id=eq.TK-000038'))return [legacy];
   return [];
  },
  CalcCore:{selectStrengthBasis:(rows,opts)=>{
   state.calcCalls.push({rows,opts});
   return {recent:rows.length?{date:rows[0].date,e1rm:rows[0].weight*2}:null,
     prev:rows.length?{date:rows[0].date,weight:rows[0].weight}:null};
  }},
  strengthBasisCache:state.basisCache,estOneRMCache:state.estCache,
  isFinite,parseFloat,
  repsPrefillFromRange:x=>String(x||'').match(/\d+/)?.[0]||'',
  resolveWorkingWeight:(eid,opts)=>{
   state.working.push({eid,opts});
   return {suggested:opts.sourceBound?(opts.oneRM==null?null:opts.oneRM):111,
     days:null,factor:1,reason:opts.oneRM==null?'no-base':'baseline',
     ruleId:'test-decision',ruleVersion:'test',strengthBasis:null};
  },
  console
 });
 vm.runInContext(functions.map(extract).join('\n'),s,{timeout:6000});
 const ref=s.tk504CatalogSourceRefFromSelection('TK-000038');
 assert(ref);
 return {s,state,ref,legacy,typed};
}
(async()=>{
 const a=env();
 const [typedRows,legacyRows]=await Promise.all([
  a.s.tk603ReadExerciseSessions('TK-000038',a.ref),
  a.s.tk603ReadExerciseSessions('TK-000038')]);
 ok(typedRows.length===1&&typedRows[0].exercise_id==='TKC-000038',
   'explicit canonical reads ONLY owner-verified typed FK, filters cross-FK responses');
 ok(legacyRows.length===1&&legacyRows[0].exercise_id==='TK-000038',
   'same-ID personal record is never overwritten/merged');
 ok(a.state.rpcs.length===1&&a.state.rpcs[0].args.p_provider_id===c.source.provider_id,
   'exact provider bound in server RPC');
 ok(a.state.queries.some(q=>q.includes('exercise_id=eq.TKC-000038'))&&
   a.state.queries.some(q=>q.includes('exercise_id=eq.TK-000038')),
   'typed and personal queries are separate; no OR/name query');
 a.state.queries=[];
 ok((await a.s.tk603ReadExerciseSessions('TK-000038',{...a.ref,provider_id:'spoof'})).length===0,
   'forged source ref fails closed');
 ok(a.state.queries.length===0,'forged ref never falls back to personal read');
 a.state.online=false;
 ok((await a.s.tk603ReadExerciseSessions('TK-000038',a.ref)).length===0,'offline catalog read fails closed');
 a.state.online=true;a.state.mode='no-rpc';
 ok((await a.s.tk603ReadExerciseSessions('TK-000038',a.ref)).length===0,
   'revoked/unreviewed catalog binding cannot fall back to personal metrics');
 a.state.mode='switched-rpc';
 ok((await a.s.tk603ReadExerciseSessions('TK-000038',a.ref)).length===0,
   'auth owner switch mid-RPC discards result');
 a.state.owner='A';a.state.mode='switched-query';
 ok((await a.s.tk603ReadExerciseSessions('TK-000038',a.ref)).length===0,
   'auth owner switch mid-session response discards result');
 a.state.owner='A';a.state.mode='ok';
 a.state.release=false;
 const old=await a.s.tk603ReadExerciseSessions('TK-000038',a.ref);
 ok(old.length===1&&old[0].exercise_id==='TK-000038',
   'unreleased feature retains original personal/session query contract');
 a.state.release=true;
 const legacyB=await a.s.loadStrengthBasis('TK-000038');
 const canonicalB=await a.s.loadStrengthBasis('TK-000038',a.ref);
 ok(legacyB.recent.e1rm===62&&canonicalB.recent.e1rm===144,
   'same numerical core sees only correct source rows');
 ok(a.state.estCache['TK-000038']===62&&
   a.state.basisCache['TK-000038']===legacyB&&
   a.state.basisCache['catalog:A:TK-000038']===canonicalB,
   'canonical basis never overwrites personal e1rm/basis caches');
 ok(a.state.calcCalls.every(x=>x.opts.maxReps===10),
   'CALC-STR-006 existing rule invoked unchanged');
 a.state.owner='B';a.state.mode='no-rpc';
 const emptyB=await a.s.loadStrengthBasis('TK-000038',a.ref);
 ok(emptyB.recent===null&&a.state.basisCache['catalog:B:TK-000038'].recent===null&&
   a.state.basisCache['catalog:A:TK-000038']===canonicalB,
   'owner B cannot receive/corrupt the cached typed performance of owner A');
 a.state.owner='A';
 a.state.mode='no-rpc';
 const blocked=await a.s.canonicalNewExerciseItem('TK-000038',
   {reps:'6-8',rpe:'8',tk504_catalog_ref:a.ref});
 ok(blocked.suggestedWeight===null&&a.state.working.at(-1).opts.oneRM===null&&
   a.state.working.at(-1).opts.sourceBound===true,
   'unverified catalog basis supplies NO personal 1RM to resolver');
 a.state.mode='ok';
 const live=await a.s.canonicalNewExerciseItem('TK-000038',
   {reps:'6-8',rpe:'8',tk504_catalog_ref:a.ref});
 ok(live.suggestedWeight===144&&a.state.working.at(-1).opts.oneRM===144,
   'verified catalog basis can feed existing prescription route');
 ok(!a.state.working.at(-1).opts.prev||
   a.state.working.at(-1).opts.prev.weight===72,
   'verified prior weight must derive only from catalog typed history');
 const selectedCatalog={id:'TK-000038',_catalog:true,catalog_id:'TK-000038'};
 const selectedPersonal={id:'TK-000038',scope:'personal',name:'own'};
 ok(a.s.tk603PickerSourceKey(selectedCatalog)==='catalog:TK-000038'&&
   a.s.tk603PickerSourceKey(selectedPersonal)==='legacy:TK-000038',
   'picker source identities distinct despite same public id');
 ok(a.s.tk603PickerSourceKey({...selectedPersonal,_catalog:true,catalog_id:'TK-000038'})==='legacy:TK-000038',
   'spoofed personal row cannot join catalog recents');
 const rec=await a.s.tk603RecentPickerSourceKeys();
 ok(JSON.stringify(Array.from(rec))===JSON.stringify(['catalog:TK-000038','legacy:TK-000038']),
   'recent picker maps only owner-verified TKC and separately keeps personal TK');
 a.state.mode='switched-rpc';a.state.owner='A';
 const switched=await a.s.tk603RecentPickerSourceKeys();
 ok(switched.length===0,'owner switch invalidates entire pending recents response');
 ok(html.includes('exPickerRecentSourceKeys.includes(tk603PickerSourceKey(e))'),
   'original picker recent filter is explicitly source-qualified');
 console.log('TK603 typed read, e1RM source isolation and recents: '+checked+
   ' original-code assertions PASS; no real user data or production release');
})().catch(e=>{console.error(e);process.exitCode=1;});
