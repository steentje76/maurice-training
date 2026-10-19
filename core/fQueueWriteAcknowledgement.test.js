/* TK-REL-SEC-05: PATCH/DELETE/RPC must never report "saved" when IndexedDB queue did not commit.
 * Tests execute actual production functions extracted from index.html; no network/database access.
 * A pending promise must fail the test process instead of silently exiting with code 0. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const a=html.indexOf('async function sbPatchQ(t,f,d,opts){');
const b=html.indexOf('// Speelt de queue in volgorde af;',a);
assert(a>0&&b>a,'Actual write functions not found');
const code=html.slice(a,b);
let completed=false,passed=0;
process.on('exit',()=>{if(!completed){console.error('FAIL: pending test suite / never completed');process.exitCode=1;}});
const eq=(actual,expected,msg)=>{assert.strictEqual(actual,expected,msg);passed++;};
const cases=['PATCH','DELETE','RPC'];
function sandbox({online,queueResult,owner='user-A',response,networkError}){
  let added=0,requests=0;const events=[];
  const context={
    console:{warn(){},error(){},log(){}},navigator:{onLine:online},SB_URL:'https://invalid.example',ObservabilityCore:{tkLog:(...xs)=>events.push(xs)},
    tkEigenaarUid:()=>owner,updateOfflineBadge(){},
    offlineQueueAdd:async(item,ownerUid)=>{added++;assert.strictEqual(ownerUid,owner);return queueResult;},
    sbRetryable:s=>[401,408,429,500,503].includes(s),
    sbFetch:async()=>{requests++;if(networkError)throw new Error('network');return response||{ok:true,status:200,json:async()=>({value:99}),text:async()=>''};},
  };
  vm.createContext(context);vm.runInContext(code,context);
  return {context,events,get added(){return added;},get requests(){return requests;}};
}
function reply(ok,status){return{ok,status,text:async()=> 'temporary failure',json:async()=>({value:99})};}
async function execute(s,kind,opts){const c=s.context;return kind==='PATCH'?c.sbPatchQ('sessions','id=eq.x',{reps:8},opts):kind==='DELETE'?c.sbDelQ('sessions','id=eq.x'):c.sbRpcQ('schedule_my_training',{p_occurrence_id:'occ-1'});}
async function main(){
  for(const kind of cases){
    const failedOffline=sandbox({online:false,queueResult:false});
    const rv=await execute(failedOffline,kind,kind==='PATCH'?{returnRows:true}:undefined);
    eq(kind==='PATCH'?rv.ok:rv,false,kind+' offline queue rejection must NOT succeed');
    eq(failedOffline.requests,0,kind+' offline must not contact server');
    eq(failedOffline.added,1,kind+' offline should attempt one durable enqueue');
    const okOffline=sandbox({online:false,queueResult:true});
    const okRv=await execute(okOffline,kind,kind==='PATCH'?{returnRows:true}:undefined);
    eq(kind==='PATCH'?okRv.ok:okRv,true,kind+' confirmed queue commit should succeed');
    const retryFail=sandbox({online:true,queueResult:false,response:reply(false,503)});
    eq(await execute(retryFail,kind),false,kind+' 503 and failed queue commit must fail');
    const networkFail=sandbox({online:true,queueResult:false,networkError:true});
    eq(await execute(networkFail,kind),false,kind+' network error and failed queue commit must fail');
    const noOwner=sandbox({online:false,queueResult:true,owner:null});
    eq(await execute(noOwner,kind),false,kind+' ownerless operation must be refused');
    eq(noOwner.added,0,kind+' ownerless operation must not enqueue');
    const online=sandbox({online:true,queueResult:false});
    const direct=await execute(online,kind);
    eq(kind==='RPC'?direct.value:direct,kind==='RPC'?99:true,kind+' successful server request unchanged');
    eq(online.added,0,kind+' successful direct server request not queued');
    if(kind==='RPC'){
      eq(failedOffline.events.some(e=>e[1]==='rpc_offline_queued'),false,'failure must not emit rpc_offline_queued');
      eq(failedOffline.events.some(e=>e[1]==='rpc_queue_failed'),true,'failure should emit safe rpc_queue_failed');
    }
  }
  const patchOffline=sandbox({online:false,queueResult:false});
  eq(await execute(patchOffline,'PATCH'),false,'PATCH default boolean false on queue rejection');
  const patchRetryRows=sandbox({online:true,queueResult:false,response:reply(false,503)});
  eq((await execute(patchRetryRows,'PATCH',{returnRows:true})).ok,false,'PATCH returnRows contract reports failed queue');
  completed=true;console.log('TK-REL-SEC-05:',passed+'/'+passed,'assertions OK');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
