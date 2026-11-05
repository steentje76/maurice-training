/* TK-REL-SEC-01: onafhankelijk regressiebewijs: fail-closed sync en account-isolatie.
 * Draai op baseline voor RED, na herstel voor GREEN. Geen database-/productiecontact. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const block=(start,end)=>{const a=html.indexOf(start);const b=html.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'brongrenzen niet gevonden '+start);return html.slice(a,b);};
const sync=block('async function syncCustomTrainingsFromSupabase(){','// UX-EXEC-01 (B1/B3)');
const flush=block('async function flushOfflineQueue(){','function updateOfflineBadge(){');
function check(label,ok){assert(ok,label);console.log('PASS',label);}
async function checkSyncReadFailure(){
  const ctx={customTrainings:[],navigator:{onLine:true},sbGet:async()=>[{id:'old',naam:'server'}],
    offlineQueueAll:async()=>[],tkLeesWachtrijStrikt:async()=>{throw Error('IDB transaction aborted');},
    tkHuidigeUid:()=> 'A',tkTrainingenOnbevestigd:()=>[],localStorage:{setItem:()=>{throw Error('mutation');}},
    renderCustomTrainBtns:()=>{throw Error('render');},renderCustomTrainList:()=>{throw Error('render');},
    migrateLegacyWbSaved:async()=>{throw Error('migration');},console};
  vm.createContext(ctx);vm.runInContext(sync,ctx);
  await ctx.syncCustomTrainingsFromSupabase();
  check('IDB abort voorkomt resurrectie van lokaal verwijderde servertraining',ctx.customTrainings.length===0);
}
async function scenario(items,opts={}){
  let sent=[],removed=[],badges=0;const ctx={
    navigator:{onLine:true},authSession:{user:{id:'A'}},_flushBezig:false,
    offlineQueueAll:async()=>items,tkLeesWachtrijStrikt:async()=>items,
    tkHuidigeUid:()=>ctx.authSession.user.id,
    sbFetch:async(url,o)=>{sent.push({url,user:ctx.authSession.user.id});
      if(opts.switchOnSend&&sent.length===1)ctx.authSession={user:{id:'B'}};
      if(opts.networkLost)throw Error('lost response');
      return {ok:true,status:201,text:async()=>''};},
    offlineQueueRemove:async id=>{if(opts.removeFails)return false;removed.push(id);return true;},
    updateOfflineBadge:()=>{badges++},renderOfflineQueueModal:()=>{},
    document:{getElementById:()=>null},tkOuderSleutels:()=>[],
    tkLogRpcOffline:()=>{},tkFoutcode:()=>'',toast:()=>{},console,
    SB_URL:'https://example.invalid',IDEMPOTENT_TABELLEN_MET_CLIENT_ID:{sessions:true},
    syncCustomTrainingsFromSupabase:async()=>{}
  };
  vm.createContext(ctx);vm.runInContext(flush,ctx);
  await ctx.flushOfflineQueue();
  return {sent,removed,badges};
}
(async()=>{
  await checkSyncReadFailure();
  const row=(id,owner_uid)=>({id,owner_uid,method:'POST',table:'sessions',body:{id:'session-'+id,exercise_id:'ex-'+id}});
  let r=await scenario([row(1,undefined)]);
  check('Legacy item zonder owner blijft in quarantaine',r.sent.length===0&&r.removed.length===0);
  r=await scenario([row(1,'B')]);
  check('Andere eigenaar wordt niet verzonden',r.sent.length===0&&r.removed.length===0);
  r=await scenario([row(1,'A'),row(2,'A')],{switchOnSend:true});
  check('Accountwissel in-flight stopt replay en verwijdert geen onbevestigde writes',r.sent.length===1&&r.removed.length===0);
  r=await scenario([row(1,'A'),row(2,'A')]);
  check('Zelfde eigenaar mag 2 keer bevestigen',r.sent.length===2&&r.removed.length===2);
  r=await scenario([row(1,'A')],{networkLost:true});
  check('Verloren serverantwoord behoudt queue-item',r.removed.length===0);
  r=await scenario([row(1,'A'),row(2,'A')],{removeFails:true});
  check('IDB queue-deletefout mag geen volgende item versturen',r.sent.length===1&&r.removed.length===0);
  const strict=block('async function tkLeesWachtrijStrikt(){','async function tkUpdateGereedheid(){');
  const request={result:null,error:null},tx={objectStore:()=>({getAll:()=>request}),error:null};
  const src={offlineDb:async()=>({transaction:()=>tx}),OFFLINE_STORE:'queue'};
  vm.createContext(src);vm.runInContext(strict,src);
  const pending=src.tkLeesWachtrijStrikt();
  await new Promise(resolve=>setImmediate(resolve));
  request.onsuccess();tx.oncomplete();
  let rejected=false;try{await pending;}catch(_){rejected=true;}
  check('IDB completed zonder geldig getAll-resultaat is onbekend',rejected);
  console.log('TK-REL-SEC-01: 8/8');
})().catch(e=>{console.error('FAIL',e.stack||e);process.exitCode=1;});
