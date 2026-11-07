'use strict';
// #603: exercise *selection* -> loose logger -> SAME central write, tested in
// actual original app functions under synthetic JWT/DB stubs. No personal data.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const match=html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(match,'original embedded ECS required');
const catalog=JSON.parse(match[1]).catalog;
assert.equal(catalog.length,226);
const canonical=catalog.find(c=>c.catalog_id==='TK-000038');
assert(canonical&&canonical.source.provider_id);
const id=canonical.catalog_id,provider=canonical.source.provider_id;
function extract(name){
 const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);
 assert(m,'missing original app function '+name);
 let depth=0;
 for(let j=html.indexOf('{',m.index);j<html.length;j++){
  if(html[j]==='{')depth++;
  if(html[j]==='}'&&--depth===0)return html.slice(m.index,j+1);
 }
 throw Error('unclosed '+name);
}
const funcs=['tk603LosConfirmDiscard','tk603LosOfferDiscard',"tk603LosOwner","tk603LosContext","tk603LosCurrent","tk603LosReset","tk603LosReadPending","tk603LosStorePending","tk603LosFreezePending","tk603LosWritePending","tk603LosRemoveConfirmed","tk603LosReplayPending","tk603LosRestorePending"].concat(['catalogToPickerEx','tk504CatalogSourceRefFromCatalog',
 'tk504CatalogSourceRefFromSelection','tk603CatalogRefFromPickerSelection',
 'tk504ValidateCatalogSourceRef','tk504VerifySessionBinding',
 'tk504RewriteVerifiedSessionRow','tk504StableSessionId','tk603CanUpdatePersonalRecord','writeSessionRow','saveLosOefening']);
function world({release=true,personal=false,spoof=false}={}){
 const state={owner:'synthetic-A',online:true,mode:'ok',committed:0,uuidCount:0,
  writes:[],rpcs:[],shadow:0,cleanup:0,complete:0,toasts:[],
  selected:null};
 const personalRow={id,name:'Mine not Movekit',scope:'personal',type:'strength'};
 const ex=personal?(spoof?{...personalRow,_catalog:true,catalog_id:id}:personalRow):
  {id,name:canonical.identity.name,type:'strength',_catalog:true,catalog_id:id};
 state.selected=ex;
 const s=vm.createContext({
   TK603_LOS_PENDING_KEY:'tk603_los_pending_v1',tk603LosEpoch:0,tk603LosPending:null,tk603LosBusy:null,
   localStorage:(()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};})(),
   ExerciseCatalogService:{byId:k=>k===id?canonical:null},
   TK504_TYPED_FK_SESSION_RELEASE:release,
   navigator:{get onLine(){return state.online;}},
   tkEigenaarUid:()=>state.owner,
   sbRpc:async(fn,args)=>{
     state.rpcs.push({fn,args});
     if(state.mode==='owner-change'){state.owner='synthetic-B';return 'TKC-000038';}
     if(state.mode==='wrong-binding')return 'TKC-000019';
     if(state.mode==='no-binding')return null;
     return 'TKC-000038';
   },
   sbPostQ:async(table,row,opts)=>{
     state.writes.push({table,row:structuredClone(row),opts});
     return state.mode==='write-fails'?false:true;
   },
   writeActions:[],
   ensureExerciseRow:async()=>{state.shadow++;return true;},
   losSelectedExId:id,losCurEx:ex,LOS_DOMID:'los',sessionLog:{},
   newClientRowId:()=>('00000000-0000-4000-8000-'+String(++state.uuidCount).padStart(12,'0')),
   exercises:[personalRow], // deliberate same-ID real personal row
   resolvePickerEx:()=>personalRow,
   resolveCardioType:()=>null,
   collectWorkSets:()=>[{kg:42,effKg:42,reps:8,rpe:8}],
   collectWuSets:()=>[],
   document:{getElementById:()=>({value:'',style:{},textContent:''}),
             querySelectorAll:()=>[]},
   td:()=> '2026-11-06',
   DecisionCore:{releaseRecord:()=>({isRecord:false})},
   prFor:()=>null,upsertExerciseGoalField:async()=>{},
   completeTrainingInstance:async()=>{state.complete++;},
   closeModal:()=>{},
   resetLosAllState:()=>{state.cleanup++;},
   toast:x=>state.toasts.push(x),
   console
 });
 vm.runInContext(funcs.map(extract).join('\n'),s,{timeout:6000});
 return {s,state,ex};
}
let passed=0;
function ok(condition,label){assert(condition,label);passed++;}
async function caseRun(opts,change){
 const w=world(opts);
 if(change)change(w);
 const button={disabled:false};
 await w.s.saveLosOefening(button);
 ok(w.state.owner!=='synthetic-A'||button.disabled===false,'button restored on same-owner save/fail; stale owner cannot mutate next account controls');
 return w;
}
(async()=>{
 const valid=await caseRun();
 ok(valid.state.rpcs.length===1,'catalog tile calls exactly one server binding RPC');
 ok(valid.state.rpcs[0].args.p_provider_id===provider,'RPC uses ECS provider identity');
 ok(valid.state.shadow===0,'catalog tile never creates personal FK shadow');
 ok(valid.state.writes.length===1,'catalog tile reaches only one session writer');
 ok(valid.state.writes[0].row.id==='00000000-0000-4000-8000-000000000001',
   'catalog row gets a valid stable client UUID');
 ok(valid.state.writes[0].table==='sessions'&&valid.state.writes[0].row.exercise_id==='TKC-000038',
   'existing writer maps only canonical FK to reserved typed alias');
 ok(valid.state.writes[0].row.sets===1&&valid.state.writes[0].row.weight===42,
   'sets, volume and weight remain original, not recalculated');
 ok(valid.state.cleanup===1,'successful save resets only after writer confirmed');
 const offline=await caseRun({},w=>{w.state.online=false;});
 ok(offline.state.rpcs.length===0&&offline.state.writes.length===0,
   'offline canonical selection fails before RPC and before any write');
 ok(offline.state.shadow===0&&offline.state.cleanup===0,'offline never shadows, clears or fakes a save');
 const changed=await caseRun({},w=>{w.state.mode='owner-change';});
 ok(changed.state.rpcs.length===1&&changed.state.writes.length===0,
   'account switch before RPC response fails without cross-owner write');
 ok(changed.state.cleanup===0,'account switch preserves unsubmitted workout');
 const wrong=await caseRun({},w=>{w.state.mode='wrong-binding';});
 ok(wrong.state.writes.length===0&&wrong.state.shadow===0,
   'wrong server FK is rejected, no shadow fallback');
 const noBinding=await caseRun({},w=>{w.state.mode='no-binding';});
 ok(noBinding.state.writes.length===0&&noBinding.state.cleanup===0,
   'revoked / unreviewed alias fails closed');
 const personal=await caseRun({personal:true});
 ok(personal.state.rpcs.length===0&&personal.state.shadow===1,
   'same TK ID personal selection never auto-claims Movekit');
 ok(personal.state.writes.length===1&&personal.state.writes[0].row.exercise_id===id,
   'personal selection retains original legacy ID without typed rewrite');
 const spoof=await caseRun({personal:true,spoof:true});
 ok(spoof.state.rpcs.length===0&&spoof.state.writes.length===0,
   'personal scope plus spoofed catalog flag is fail-closed');
 ok(spoof.state.shadow===0&&spoof.state.cleanup===0,
   'spoof cannot write, create FK shadow or erase user fields');
 const disabled=await caseRun({release:false});
 ok(disabled.state.rpcs.length===0&&disabled.state.shadow===1,
   'not-yet-released mode preserves existing legacy FK path');
 ok(disabled.state.writes.length===1&&disabled.state.writes[0].row.exercise_id===id,
   'release flag off never writes reserved FK');
 const failed=await caseRun({},w=>{w.state.mode='write-fails';});
 ok(failed.state.writes.length===1&&failed.state.cleanup===0,
   'writer failure does not reset completed input');
 const retry=world();retry.state.mode='write-fails';
 const btn={disabled:false};
 await retry.s.saveLosOefening(btn);
 ok(btn.disabled===false&&retry.state.cleanup===0,'failed save can be retried');
 retry.state.mode='ok';
 await retry.s.saveLosOefening(btn);
 ok(retry.state.writes.length===2&&retry.state.cleanup===1,
   'retry only cleans up on confirmed save');
 ok(retry.state.writes[0].row.id===retry.state.writes[1].row.id,
   'lost response retry reuses the exact same UUID to prevent duplicate rows');
 ok(retry.state.uuidCount===1,'UUID generation occurs once per form attempt');
 console.log('TK603 original loose logger typed/legacy/offline/account-switch/spoof/retry: '+passed+' assertions PASS; no real account/DB');
})().catch(e=>{console.error(e);process.exitCode=1;});
