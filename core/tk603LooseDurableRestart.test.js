'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const catalog=JSON.parse(html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m)[1]).catalog;
const canonical=catalog.find(x=>x.catalog_id==='TK-000038');
const KEY='tk603_los_pending_v1';
function take(name){const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);assert(m,name);for(let e=html.indexOf('}',m.index);e>=0;e=html.indexOf('}',e+1)){const s=html.slice(m.index,e+1);try{new vm.Script(s);return s;}catch{}}throw Error(name);}
const funcs=['tk603LosHasPending','authSignOut','tk603LosConfirmDiscard','tk603LosOfferDiscard','losHasUnsavedData','losRequestLeave','onLosWuChange','tk603LosOwner','tk603LosContext','tk603LosCurrent','tk603LosReset','tk603LosReadPending','tk603LosStorePending','tk603LosFreezePending','tk603LosWritePending','tk603LosRemoveConfirmed','tk603LosReplayPending','tk603LosRestorePending',
 'tk504CatalogSourceRefFromCatalog','tk504CatalogSourceRefFromSelection','tk504ValidateCatalogSourceRef','tk603CatalogRefFromPickerSelection','tk504VerifySessionBinding','tk504RewriteVerifiedSessionRow',
 'tkSchrijfUitkomst','sbPostQ','writeSessionRow','catalogToPickerEx','openLosOefening','saveLosOefening','renderLosBody',
 'clearLosSessionState','resetLosExerciseSelection','resetLosAllState','tk603CanUpdatePersonalRecord'];
function world({memory=new Map(),server=new Map(),typed=true,personal=false}={}){
 const st={owner:'A',mode:'ok',online:true,storageFails:false,renderMode:null,sets:[{kg:42.5,effKg:42.5,reps:8,rpe:8}],requests:[],rpcs:0,queue:0,uuid:0,cleanup:0,complete:0,toasts:[],prompts:0,domWrites:0};
 const elements={};function element(id){
  if(!elements[id])elements[id]={id,value:id==='los-ex-new-type'?'strength':'',style:{},className:'',textContent:'',disabled:false,classList:{add(){},remove(){}},
   _html:'',get innerHTML(){return this._html;},set innerHTML(v){st.domWrites++;this._html=v;},
   querySelectorAll:()=>[],prepend:()=>{}};
  return elements[id];
 }
 const ex=personal?{id:canonical.catalog_id,type:'strength',scope:'personal',name:'my own'}:{id:canonical.catalog_id,catalog_id:canonical.catalog_id,_catalog:true,type:'strength',name:canonical.identity.name};
 const c=vm.createContext({console,Date,Math,JSON,Object,Map,Set,Array,Number,parseFloat,parseInt,isFinite,encodeURIComponent,
  TK603_LOS_PENDING_KEY:KEY,tk603LosEpoch:0,tk603LosPending:null,tk603LosBusy:null,
  get TK504_TYPED_FK_SESSION_RELEASE(){return typed;},tkEigenaarUid:()=>st.owner,tk603LiveSource:{},
  ExerciseCatalogService:{byId:id=>catalog.find(x=>x.catalog_id===id)||null},
  navigator:{get onLine(){return st.online;}},
  localStorage:{getItem:k=>{if(st.storageFails)throw Error('unavailable');return st.readbackFail&&memory.has(k)?null:memory.get(k)||null;},setItem:(k,v)=>{if(st.storageFails||st.setFail)throw Error('quota');memory.set(k,v);},removeItem:k=>{if(st.storageFails||st.removeFail)throw Error('quota');memory.delete(k);}},
  losSelectedExId:ex.id,losCurEx:ex,LOS_DOMID:'los',sessionLog:{},curT:null,
  exercises:personal?[ex]:[],resolvePickerEx:()=>ex,tkPickerDisplayName:x=>x.name,
  newClientRowId:()=>{st.uuid++;return crypto.randomUUID();},
  resolveCardioType:()=>null,collectWorkSets:()=>st.sets,collectWuSets:()=>[],td:()=> '2026-11-07',
  document:{getElementById:id=>id==='tk603-los-pending-note'?null:element(id),querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>({})},
  buildExerciseBody:()=>'<inputs>',ensureExercisesLoaded:async()=>{if(st.mode==='open-owner')st.owner='B';},
  ensureEquipmentTypesLoaded:async()=>{if(st.renderMode==='switch'){st.owner='B';st.domWrites=0;}},
  loadRepPRs:async()=>{},loadStrengthBasis:async()=>{},loadEstOneRM:async()=>{},loadEquipment:async()=>[],
  tk603SetLiveSource:()=>{},tk603LiveIsCatalog:()=>true,BARBELL_EXERCISES:new Set(),buildVideoMuscle:()=>'',buildEquipmentPanel:()=>'',buildRmPanel:()=>'',
  DecisionCore:{releaseRecord:()=>({isRecord:false})},prFor:()=>null,upsertExerciseGoalField:async()=>{},
  tkC2ExecutionCleanup:()=>{st.cleanup++;},cardioSplitMode:{},cardioSplits:{},warmupState:{},pctSelection:{},manualKgSets:{},rpeManual:{},
  openModal:()=>{},closeModal:()=>{},completeTrainingInstance:async()=>{st.complete++;},
  confirmModal:async(question)=>{st.lastQuestion=question;st.prompts++;if(st.answers&&st.answers.length)return st.answers.shift();if(st.mode==='confirm-owner')st.owner='B';return st.mode!=='later';},
  toast:t=>st.toasts.push(t),
  tkNormalizeSessionsRow:x=>x,IDEMPOTENT_TABELLEN_MET_CLIENT_ID:{sessions:true},TK_IDEMPOTENT_ZONDER_UPDATE:{},TK_WACHTRIJ_OUDERS:{},
  TK_SCHRIJF_TIMEOUT_MS:1000,SB_URL:'http://synthetic.invalid',tkMetTimeout:async p=>await p,tkLogSchrijf:()=>{},tkFoutcode:()=>null,sbRetryable:n=>n>=500,
  offlineQueueAdd:async()=>{st.queue++;return true;},updateOfflineBadge:()=>{},
  ensureExerciseRow:async()=>{},
  sbRpc:async()=>{st.rpcs++;if(st.mode==='binding-owner')st.owner='B';if(st.mode==='revoke')return null;if(st.bindingWait)await st.bindingWait;return 'TKC-000038';},
  sbFetch:async(url,o)=>{
   st.requests.push(structuredClone(o.body));server.set(o.body.id,structuredClone(o.body));
   if(st.mode==='lost-ack')throw Error('after commit');
   if(st.mode==='write-owner'){
    st.owner='B';memory.set(KEY,JSON.stringify({v:1,owner_uid:'B',selected_id:ex.id,source_ref:{kind:'movekit-catalog-v1',catalog_id:ex.id,provider_id:canonical.source.provider_id},row:{id:'00000000-0000-4000-8000-000000000002',exercise_id:ex.id,note:'B pending'}}));
   }
   if(st.mode==='discard-inflight'){c.clearLosSessionState();c.losSelectedExId='another';}
   return {ok:true,status:201};
  }
 });
 vm.runInContext(funcs.map(take).join('\n'),c);
 return {c,st,memory,server,ex,elements};
}
let n=0;function ok(v,label){assert(v,label);n++;}
(async()=>{
 let w=world(),button={disabled:false};w.st.mode='lost-ack';
 await w.c.saveLosOefening(button);
 ok(w.server.size===1&&w.memory.has(KEY),'lost ACK leaves a committed row and durable pending data');
 const pending=JSON.parse(w.memory.get(KEY)),original=w.memory.get(KEY);
 ok(pending.row.id===w.st.requests[0].id&&w.st.uuid===1,'the real loose save persists its generated UUID before POST');
 ok(w.st.queue===0&&w.st.cleanup===0&&!button.disabled,'typed ACK loss is not queued or cleaned and permits retry');
 // New VM: no live source, UUID counter, pending pointer or binding survives.
 const resumed=world({memory:w.memory,server:w.server});resumed.c.losSelectedExId=null;resumed.c.losCurEx=null;
 await resumed.c.openLosOefening();
 ok(resumed.st.prompts===1&&resumed.c.losSelectedExId===pending.selected_id,'actual open caller offers and restores same-owner pending attempt');
 resumed.st.sets=[{kg:999,effKg:999,reps:1,rpe:10}];
 await resumed.c.saveLosOefening({disabled:false});
 ok(resumed.server.size===1&&!resumed.memory.has(KEY),'restart and retry confirms one existing row and clears only confirmed draft');
 ok(resumed.st.requests[0].id===pending.row.id&&resumed.st.requests[0].weight===42.5&&resumed.st.requests[0].reps===8,'fresh VM replays original UUID and frozen payload despite changed inputs');
 ok(resumed.st.uuid===0&&resumed.st.rpcs===1,'restart reauthorizes but never generates another UUID');
 w=world();w.memory.set('tk_draft_training','normal sentinel');w.c.curT='normal-active';w.st.mode='lost-ack';
 await w.c.saveLosOefening({disabled:false});
 ok(w.memory.get('tk_draft_training')==='normal sentinel','loose persistence never modifies a normal training draft');
 w=world();w.st.storageFails=true;await w.c.saveLosOefening({disabled:false});
 ok(w.st.requests.length===0&&w.st.rpcs===0,'storage failure blocks before network authority or session POST');
 w=world();w.st.online=false;await w.c.saveLosOefening({disabled:false});
 ok(w.memory.has(KEY)&&w.st.requests.length===0&&w.st.queue===0,'offline attempt remains durable without a typed queue or POST');
 w.st.online=true;w.st.mode='revoke';await w.c.saveLosOefening({disabled:false});
 ok(w.memory.has(KEY)&&w.st.requests.length===0,'revoked binding retains pending payload and cannot fall back');
 w=world();w.st.mode='binding-owner';await w.c.saveLosOefening({disabled:false});
 ok(w.st.requests.length===0&&w.st.cleanup===0,'owner switch during binding cannot submit or clear another account');
 w=world();w.st.mode='write-owner';await w.c.saveLosOefening({disabled:false});
 ok(JSON.parse(w.memory.get(KEY)).owner_uid==='B'&&w.st.cleanup===0,'old A response cannot delete B pending data or reset B form');
 w=world();w.st.mode='discard-inflight';await w.c.saveLosOefening({disabled:false});
 ok(w.c.losSelectedExId==='another'&&w.st.toasts.every(t=>t!=='Opgeslagen'),'explicit new selection invalidates pending save continuation');
 w=world({personal:true});await w.c.saveLosOefening({disabled:false});
 ok(w.st.rpcs===0&&!w.memory.has(KEY)&&w.st.requests[0].exercise_id===canonical.catalog_id,'personal same-ID exercise stays on legacy route');
 w=world({typed:false});await w.c.saveLosOefening({disabled:false});
 ok(w.st.rpcs===0&&!w.memory.has(KEY)&&w.st.requests[0].exercise_id===canonical.catalog_id,'release-off route keeps original legacy FK');
 w=world();w.st.mode='lost-ack';await w.c.saveLosOefening({disabled:false});
 const tampered=JSON.parse(w.memory.get(KEY));tampered.source_ref.provider_id='tampered';w.memory.set(KEY,JSON.stringify(tampered));
 const invalid=world({memory:w.memory});invalid.c.losSelectedExId=null;invalid.st.answers=[true,false];await invalid.c.openLosOefening();
 ok(invalid.st.requests.length===0&&invalid.memory.has(KEY)&&invalid.c.losSelectedExId===null,'invalid persisted provenance is blocked without personal fallback or deletion');
 w=world();w.st.renderMode='switch';await w.c.renderLosBody(w.ex);
 ok(w.st.domWrites===0,'render continuation cannot paint A fields after owner switch');
 w=world();let release;w.st.bindingWait=new Promise(r=>release=r);
 const first=w.c.saveLosOefening({disabled:false});await Promise.resolve();await w.c.saveLosOefening({disabled:false});
 ok(w.st.rpcs===1,'overlapping saves share one active attempt');release();await first;
 ok(w.server.size===1,'overlapping saves create one UUID/row');

 // Review B1: pending state has a real, immutable summary and no editable body.
 w=world();w.st.mode='lost-ack';await w.c.saveLosOefening({disabled:false});
 const text=w.elements['los-body'].textContent;
 ok(text.includes('42.5')&&text.includes('Herhalingen: 8')&&w.elements['los-wu-count'].disabled,'pending summary shows the actual saved row and disables external warm-up control');
 w.elements['los-wu-count'].value='99';w.c.onLosWuChange();await w.c.renderLosBody(w.ex);
 ok(w.elements['los-body'].textContent===text&&w.elements['los-body'].innerHTML==='','warm-up event and re-render cannot expose fresh editable inputs or remove saved-data notice');
 // Review B2: restored empty/non-strength body still requires confirmation.
 const data=JSON.parse(w.memory.get(KEY));delete data.row.sets_detail;delete data.row.weight;delete data.row.reps;data.row.time_str='03:21';data.row.distance=1000;
 w.memory.set(KEY,JSON.stringify(data));const cardio=world({memory:w.memory});await cardio.c.openLosOefening();
 ok(cardio.elements['los-body'].textContent.includes('03:21')&&cardio.elements['los-body'].textContent.includes('1000')&&cardio.c.losHasUnsavedData(),'pending cardio payload is visible and counts as unsaved without input fields');
 let left=0;cardio.st.answers=[false];await cardio.c.losRequestLeave(()=>left++);
 ok(left===0&&cardio.memory.has(KEY),'Back/Cancel with keep choice cannot silently remove a pending registration');
 cardio.st.answers=[true];await cardio.c.losRequestLeave(()=>left++);
 ok(left===1,'explicit warned discard permits the selected leave action');
 // Review B3: malformed data can be kept or explicitly discarded; no permanent lock.
 w=world({memory:new Map([[KEY,'{corrupt']])});w.st.answers=[false];await w.c.openLosOefening();
 ok(w.memory.has(KEY)&&w.st.requests.length===0,'corrupt draft stays private and retained when user chooses keep');
 w.st.answers=[true];await w.c.openLosOefening();
 ok(!w.memory.has(KEY)&&w.c.losSelectedExId===null,'explicit discard of corrupt draft unlocks the existing modal');
 // Review B4: entering B's own modal resets the actual shared Save button.
 w=world();const sharedButton=w.c.document.getElementById('los-save-btn');w.st.mode='write-owner';
 await w.c.saveLosOefening(sharedButton);await w.c.openLosOefening();
 ok(w.st.owner==='B'&&sharedButton.disabled===false,'new owner recovery resets the shared save control without old continuation mutating it');
 // Flag rollback retains a previous typed pending entry until explicit discard.
 const rollback=world({memory:new Map([[KEY,original]]),typed:false});rollback.st.answers=[false];await rollback.c.openLosOefening();
 ok(rollback.memory.get(KEY)===original&&rollback.st.requests.length===0,'flag-off open preserves typed pending data and cannot replay it as personal');
 // Storage faults at each durable boundary fail before POST or retain retry data.
 w=world();w.st.setFail=true;await w.c.saveLosOefening({disabled:false});
 ok(w.st.requests.length===0&&w.st.rpcs===0,'setItem quota failure blocks POST before binding');
 w=world();w.st.readbackFail=true;await w.c.saveLosOefening({disabled:false});
 ok(w.st.requests.length===0&&w.st.rpcs===0,'readback mismatch blocks POST before binding');
 w=world();w.st.removeFail=true;await w.c.saveLosOefening({disabled:false});
 ok(w.server.size===1&&w.memory.has(KEY)&&w.st.toasts.some(t=>t.includes('Bevestiging')),'remove failure after real confirmation retains exact attempt and gives an honest retry message');
 const competing=world({memory:new Map([[KEY,original]])});await competing.c.saveLosOefening({disabled:false});
 ok(competing.st.requests.length===0&&competing.memory.get(KEY)===original,'existing same-source entry from another tab is never silently substituted for fresh inputs');
 w=world();w.st.mode='lost-ack';await w.c.saveLosOefening({disabled:false});
 w.c.CACHE_OWNER_KEY='tk_cache_owner_uid';
 const listStart=html.indexOf('const PERSONAL_CACHE_KEYS=[')+'const PERSONAL_CACHE_KEYS=['.length; const keyList=html.slice(listStart,html.indexOf('];',listStart));
 // Load the actual key list and actual wipe, not a duplicated key fixture.
 vm.runInContext('const PERSONAL_CACHE_KEYS=['+keyList+'];'+take('wipePersonalCache'),w.c);
 w.c.wipePersonalCache();
 ok(!w.memory.has(KEY)&&w.c.tk603LosPending===null&&w.c.losSelectedExId===null&&w.elements['los-body'].textContent==='','actual logout wipe clears pending disk/memory, selection and visible saved-data summary');

 function loadLogout(w){
  const begin=html.indexOf('const PERSONAL_CACHE_KEYS=[')+'const PERSONAL_CACHE_KEYS=['.length;
  const keys=html.slice(begin,html.indexOf('];',begin));
  vm.runInContext('const PERSONAL_CACHE_KEYS=['+keys+'];'+take('wipePersonalCache'),w.c);
  w.c.CACHE_OWNER_KEY='tk_cache_owner_uid';w.c.window={};
  w.c.clearAuthSession=()=>{w.st.owner=null;};
 }
 w=world();w.st.mode='lost-ack';await w.c.saveLosOefening({disabled:false});loadLogout(w);
 w.st.mode='ok';w.st.answers=[false];await w.c.authSignOut();
 ok(w.st.lastQuestion.includes('Uitloggen verwijdert')&&w.st.owner==='A'&&w.memory.has(KEY),'logout explicitly warns that pending data is discarded; cancel retains it');
 w.st.answers=[true];await w.c.authSignOut();
 ok(w.st.owner===null&&!w.memory.has(KEY)&&w.c.tk603LosPending===null,'confirmed warned logout clears private disk and memory state');
 w=world();w.st.mode='lost-ack';await w.c.saveLosOefening({disabled:false});loadLogout(w);
 w.st.mode='confirm-owner';await w.c.authSignOut();
 ok(w.st.owner==='B'&&w.memory.has(KEY),'an old logout dialog cannot sign out or clear the next owner');
 // Key is part of actual logout/account-switch cache wipe contract.
 ok(/'tk603_los_pending_v1'/.test(html.slice(html.indexOf('const PERSONAL_CACHE_KEYS='),html.indexOf('function wipePersonalCache'))),'pending key is removed by the real personal-cache wipe');
 console.log('TK603 loose durable restart: '+n+' actual-function assertions PASS; synthetic DOM/HTTP/storage, no real device');
})().catch(e=>{console.error(e);process.exitCode=1;});
