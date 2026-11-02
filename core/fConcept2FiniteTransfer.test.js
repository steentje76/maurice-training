'use strict';
const assert=require('node:assert/strict');
const C=require('./concept2Csafe'),I=require('./intervalEngine'),F=require('./concept2FiniteTransfer');
const block=(type,seconds)=>({type,termination:{type:'time',seconds}});
const prescription=I.normalizePrescription({sport:'rowerg',blocks:[{repeat:6,of:[block('work',60),block('recovery',60)]}]});
assert(prescription.geldig);
const ctx={connected:true,deviceId:'pm5-1',generation:7,controlResponseSeq:0,userConfirmed:true,now:1000,
 preflight:{source:'pm5_0x31',workoutState:0,deviceId:'pm5-1',generation:7,observedAt:900}};
const reply=[0xf1,0x81,0x81,0xf2]; // frame status OK, state ready; NOT a workout ACK
const next=()=>new Promise(r=>setImmediate(r));
(async()=>{
 let writes=[];
 const tx=F.createFiniteIntervalTransfer({write:async b=>{writes.push(b);}});
 for(const patch of [
  {userConfirmed:false},{preflight:{...ctx.preflight,observedAt:-20000}},{preflight:{...ctx.preflight,workoutState:4}},
  {deviceId:null},{generation:null}
 ]){
  const res=await tx.start(prescription,{...ctx,...patch});
  assert.equal(res.ok,false);assert.equal(writes.length,0,'failed preflight cannot touch PM5');
 }
 const ongoing=tx.start(prescription,ctx);
 await next();
 const concurrent=await tx.start(prescription,ctx);
 assert.equal(concurrent.reason,'already_pending');
 const frameCount=tx.getDiagnostics().frameCount;
 assert(frameCount>6,'finite workout needs multiple BLE frames');
 let seq=0;
 for(let i=0;i<frameCount;i++){
   assert.equal(tx.getDiagnostics().state,'WAIT_DIRECT');
   assert.equal(writes[i*2].length<=20,true);
   assert.equal(tx.handleControlResponse(reply,{...ctx,generation:6}).handled,false,'ignore stale connection');
   assert.equal(tx.handleControlResponse(reply,{...ctx,deviceId:'pm5-2'}).handled,false,'ignore wrong monitor');
   assert.equal(tx.handleControlResponse([0xf1,0x81,0x82,0xf2],ctx).handled,false,'reject corrupt response');
   assert.equal(tx.getDiagnostics().frameIndex,i);
   assert.equal(tx.handleControlResponse(reply,{...ctx,controlResponseSeq:++seq}).state,'WRITING_ACK');
   await next();
   assert.deepEqual(writes[i*2+1],C.buildGetStatusFrame().frame,'probe each program frame');
   assert.equal(tx.getDiagnostics().state,'WAIT_ACK');
   assert.equal(tx.handleControlResponse(reply,{...ctx,controlResponseSeq:seq}).handled,false,'duplicate status does not advance');
   assert.equal(tx.handleControlResponse(reply,{...ctx,controlResponseSeq:++seq}).handled,true);
   await next();
 }
 const result=await ongoing;
 assert.equal(result.ok,false,'no fabricated workout verification');
 assert.equal(result.transferred,true);
 assert.equal(result.state,'TRANSFERRED_UNVERIFIED');
 assert.equal(result.progress,frameCount);
 assert.equal(writes.length,frameCount*2);
 assert.equal(tx.isPending(),false);
 const rejectWrites=[];
 const rejection=F.createFiniteIntervalTransfer({write:async b=>rejectWrites.push(b)});
 const fail=rejection.start(prescription,ctx);await next();
 rejection.handleControlResponse(reply,{...ctx,controlResponseSeq:1});await next();
 rejection.handleControlResponse([0xf1,0x91,0x91,0xf2],{...ctx,controlResponseSeq:2});
 assert.equal((await fail).state,'FAILED');
 assert.equal(rejectWrites.length,2,'no further write after PM5 reject');
 const disconnect=F.createFiniteIntervalTransfer({write:async ()=>{}});
 const detached=disconnect.start(prescription,ctx);await next();
 disconnect.cancel('disconnect');
 assert.equal((await detached).state,'CANCELLED');
 assert.equal(disconnect.handleControlResponse(reply,ctx).handled,false,'stale response after teardown');
 const rejectedWrite=F.createFiniteIntervalTransfer({write:async()=>({ok:false})});
 const noWrite=await rejectedWrite.start(prescription,ctx);
 assert.equal(noWrite.reason,'frame_write_rejected','resolved write rejection cannot count as BLE success');
 let ackCounter=0;
 const rejectedAck=F.createFiniteIntervalTransfer({write:async()=>++ackCounter===1?{ok:true}:{ok:false}});
 const ackPromise=rejectedAck.start(prescription,ctx);await next();
 rejectedAck.handleControlResponse(reply,{...ctx,controlResponseSeq:1});
 assert.equal((await ackPromise).reason,'ack_probe_write_rejected','rejected follow-up GETSTATUS is a failure');
 const timeout=F.createFiniteIntervalTransfer({write:async()=>{},timeoutMs:10});
 assert.equal((await timeout.start(prescription,ctx)).state,'TIMEOUT');
 const stuckWrite=F.createFiniteIntervalTransfer({write:()=>new Promise(()=>{}),timeoutMs:10});
 const stuck=await stuckWrite.start(prescription,ctx);
 assert.equal(stuck.state,'TIMEOUT');
 assert.equal(stuck.reason,'write_timeout','unresolved BLE writes must time out, not hang forever');
 console.log('TK #579 staged CSAFE BLE: finite 6x60/60, per-frame ACK probe, stale generation, user consent, preflight idle, checksum, reject, cancel, timeout, no false success PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
