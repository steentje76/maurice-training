'use strict';
// Fail-closed BLE write size: official Concept2 PM5 control value is up to 20 bytes.
// Synthetic transport test: does not assert real PM5 firmware support.
const assert=require('node:assert/strict');
const T=require('../native/src/nativeConcept2BleTransport');
const L=require('./concept2Live');
const C=require('./concept2Csafe');
const I=require('./intervalEngine');
let writes=0;
const gateway={
  connect:()=>Promise.resolve(), getServices:()=>Promise.resolve([]),
  startNotifications:()=>Promise.resolve(),
  write:()=>{writes++;return Promise.resolve();}
};
async function run(){
  const t=T.makeNativeConcept2BleTransport({gateway,concept2Live:L});
  await t.connect('rowerg','synthetic-pm5');
  const prescription=I.normalizePrescription({sport:'rowerg',blocks:[{repeat:6,of:[
    {type:'work',termination:{type:'time',seconds:60}},
    {type:'recovery',termination:{type:'time',seconds:60}}
  ]}]});
  const built=C.compileFiniteIntervalPrescription(prescription);
  assert(built.ok);assert(built.frames.some(f=>f.length>20),'known oversize fixture');
  await assert.rejects(t.writeControlFrame(built.frames[0]),/csafe_frame_exceeds_ble_characteristic_limit/);
  assert.equal(writes,0,'must not attempt unsafe BLE write');
  await assert.rejects(t.writeControlFrame(new Array(21).fill(0)),/csafe_frame_exceeds_ble_characteristic_limit/);
  assert.equal(writes,0);
  const valid=C.buildFixedDistanceWorkout(1000).frame;
  assert(valid.length<=20);
  await t.writeControlFrame(valid);
  assert.equal(writes,1,'existing valid fixed-distance write remains allowed');
  console.log('PM5 BLE control max-20 write gate: PASS');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
