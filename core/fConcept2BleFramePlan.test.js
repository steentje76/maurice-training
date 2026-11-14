'use strict';
// Byte-exact BLE planning test only; no claim about PM5 acceptance across frames.
const assert=require('node:assert/strict');
const C=require('./concept2Csafe'),I=require('./intervalEngine');
assert.equal(typeof C.planBleCharacteristicFrames,'function','BLE-safe CSAFE planner must exist');
function commandStream(frames) {
 const commands=[];
 for(const frame of frames){
  assert.equal(frame[0],0xf1);assert.equal(frame.at(-1),0xf2);
  const b=C.unstuff(frame.slice(1,-1));
  assert(b);assert.equal(C.checksum(b.slice(0,-1)),b.at(-1));
  const data=b.slice(0,-1);
  assert.equal(data[0],0x76);assert.equal(data[1],data.length-2);
  let i=2;
  while(i<data.length){
   const start=i; const op=data[i++];
   if(op<0x80){assert(i<data.length);const n=data[i++];assert(i+n<=data.length);i+=n;}
   commands.push(data.slice(start,i));
  }
 }
 return commands;
}
const block=(type,seconds)=>({type,termination:{type:'time',seconds}});
for(const sport of ['rowing','rowerg','bikeerg','skierg']){
 const normalized=I.normalizePrescription({sport,blocks:[
  block('warmup',300),{repeat:6,of:[block('work',60),block('recovery',60)]},block('cooldown',180)
 ]});
 const compiled=C.compileFiniteIntervalPrescription(normalized);
 assert(compiled.ok);
 const planned=C.planBleCharacteristicFrames(compiled);
 assert(planned.ok,JSON.stringify(planned));
 assert(planned.frames.length>compiled.frames.length);
 assert(planned.frames.every(f=>f.length<=20));
 assert.deepEqual(commandStream(planned.frames),commandStream(compiled.frames),'identical whole-command order and bytes');
 assert.equal(planned.deviceVerified,false);
 assert.equal(planned.requiresSequentialAck,true);
 assert(planned.verificationRequired.includes('complete_interval_structure_readback'));
 assert.equal(commandStream(planned.frames).filter(c=>c[0]===0x18).length,8);
}
const baseline=C.compileFiniteIntervalPrescription(I.normalizePrescription({
 sport:'rowerg',blocks:[{repeat:6,of:[block('work',60),block('recovery',60)]}]
}));
const tampered=baseline.frames.map(f=>f.slice());tampered[0][10]^=1;
const rejected=C.planBleCharacteristicFrames({...baseline,frames:tampered});
assert.equal(rejected.ok,false);
assert.deepEqual(rejected.frames,[]);
const stuffed=C.buildVariableIntervals(Array.from({length:50},()=>({
 durationType:128,duration:0xF1F2,restSeconds:0xF3
})));
assert(stuffed.ok);
const stuffedPlan=C.planBleCharacteristicFrames(stuffed);
assert(stuffedPlan.ok);
assert(stuffedPlan.frames.every(f=>f.length<=20),'stuffed-byte frames fit actual BLE limit');
assert.deepEqual(commandStream(stuffedPlan.frames),commandStream(stuffed.frames),'stuffed data unmodified');
const oversize=[C.encodeStandardFrame(C.encodeC2Wrapper(C.encodeCommand(0x20,Array(17).fill(1))))];
const rejectedCommand=C.planBleCharacteristicFrames({ok:true,frames:oversize});
assert.equal(rejectedCommand.ok,false);
assert.deepEqual(rejectedCommand.frames,[]);
console.log('PM5 BLE whole-command frame planning PASS; device transfer deliberately unverified');
