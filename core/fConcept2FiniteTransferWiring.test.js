'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function takeFunction(name){
 const re=new RegExp('(?:async )?function '+name+'\\([^)]*\\)\\s*\\{');
 const m=re.exec(html);assert(m,'missing '+name);
 let depth=0,ending=-1;
 for(let i=html.indexOf('{',m.index);i<html.length;i++){
  if(html[i]==='{')depth++;
  else if(html[i]==='}'&&--depth===0){ending=i+1;break;}
 }
 assert(ending>m.index);
 return html.slice(m.index,ending);
}
const fn=takeFunction('tkErgSendFiniteTest');
const make=extra=>{
 let called=0,consent=0,normalized=0,sent=null,msg=[];
 const rt={ownerUid:'owner-A',finiteTx:{isPending:()=>false,
   start:async value=>{called++;sent=value;return {transferred:true,state:'TRANSFERRED_UNVERIFIED'};}},
   prog:{isPending:()=>false},finitePreflight:{source:'pm5_0x31',workoutState:0,
     observedAt:Date.now(),deviceId:'pm5-A',generation:4}};
 const env={
  _c2pair:{EX:{connected:true}},tkDeviceTransport:()=>({getControlContext:()=>({connected:true,deviceId:'pm5-A',generation:4})}),
  _c2rtGet:()=>rt,tkEigenaarUid:()=> 'owner-A',_ivExec:null,_tkErgPending:null,
  buildIntervalPrescriptionFromForm:()=>{normalized++;return {geldig:true,blocks:[]};},
  window:{confirm:()=>{consent++;return true;}},toast:x=>msg.push(x),Date,...extra
 };
 const exec=new Function(...Object.keys(env),takeFunction('tkErgResolveIntervalPrescription')+'\n'+fn+'\nreturn tkErgSendFiniteTest;')(...Object.values(env));
 return {exec,rt,msg,get called(){return called;},get consent(){return consent;},get normalized(){return normalized;},get sent(){return sent;}};
};
(async()=>{
 assert(html.includes('core/concept2FiniteTransfer.js'),'browser loads core');
 assert(html.includes('runtime.finiteTx.handleControlResponse(bytes,ctx)'),'BLE CE060022 routes to transfer');
 assert(html.includes("new Error('stale_device_lease')"),'every frame write checks current device, generation and account');
 assert(html.includes('r.finiteTx.cancel(reason||\'teardown\')'),'disconnect cancels transfer');
 assert(html.includes("_vctx.packetId==='0x31'"),'only raw 0x31 allows idle preflight');
 assert(html.includes("source:'pm5_0x31'"),'hardware status tagged');
 assert(html.includes('_rawPm5.workoutState!=null&&Number(_rawPm5.workoutState)===0'),'missing PM5 state cannot be mistaken for WAITTOBEGIN');
 assert(html.includes("tkErgSendFiniteTest('${exId}','${cardioType}')"),'button wires explicit click');
 assert(!/tkErgSendFiniteTest\(/.test(takeFunction('startIntervalExecution')),'normal start remains app-only');
 const okay=make();await okay.exec('EX','rowing');
 assert.equal(okay.called,1);assert.equal(okay.consent,1);assert(okay.msg.at(-1).includes('nog niet bevestigd'));
 const frozen={geldig:true,sport:'rowerg',blocks:[{type:'work',termination:{type:'time',seconds:90}}]};
 const fromProgram=make({_tkErgPending:{exId:'EX',instanceId:'program-instance',sport:'rowerg',prescription:frozen}});
 await fromProgram.exec('EX','rowing');
 assert.strictEqual(fromProgram.sent,frozen,'PM5 must send the actual canonical program prescription');
 assert.equal(fromProgram.normalized,0,'canonical program must not read mutable form defaults');
 const noOwner=make({tkEigenaarUid:()=> 'owner-B'});await noOwner.exec('EX','rowing');
 assert.equal(noOwner.called,0);assert.equal(noOwner.consent,0);
 const noHardware=make({tkDeviceTransport:()=>null});await noHardware.exec('EX','rowing');
 assert.equal(noHardware.called,0);
 for(const context of [null,{connected:false,deviceId:'pm5-A',generation:4},
   {connected:true,deviceId:null,generation:4},{connected:true,deviceId:'pm5-A',generation:null}]){
   const unavailable=make({tkDeviceTransport:()=>({getControlContext:()=>context})});
   await unavailable.exec('EX','rowing');
   assert.equal(unavailable.called,0,'missing or disconnected BLE lease must not write');
   assert.equal(unavailable.consent,0,'missing or disconnected BLE lease must not ask for a write');
   assert(unavailable.msg.at(-1).includes('niet meer actief'));
 }
 const thrown=make({tkDeviceTransport:()=>({getControlContext:()=>{throw new Error('BLE disconnected');}})});
 await thrown.exec('EX','rowing');
 assert.equal(thrown.called,0,'BLE context exceptions must fail closed');
 assert.equal(thrown.consent,0);
 const refuse=make({window:{confirm:()=>false}});await refuse.exec('EX','rowing');
 assert.equal(refuse.called,0);
 const busy=make();busy.rt.finiteTx.isPending=()=>true;await busy.exec('EX','rowing');
 assert.equal(busy.called,0);assert.equal(busy.consent,0);
 const stale=make();stale.rt.finitePreflight.observedAt=Date.now()-30000;await stale.exec('EX','rowing');
 assert.equal(stale.called,0);assert.equal(stale.consent,0);
 console.log('TK #579 real interval UI entry: owner, idle preflight, confirmed user action, busy, cancellation, dev-test label PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
