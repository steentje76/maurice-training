'use strict';
// P1 safety regression: CSAFE control ACK and readback require an explicit owner identity.
// Synthetic controller test only; not physical PM5 acceptance.
const assert = require('node:assert/strict');
const C = require('./concept2Csafe');
const P = require('./concept2Programming');
const L = require('./concept2Live');
const CTX = {connected:true, generation:4, deviceId:'PM5-A'};
const response = (status=1) => [C.FLAG.STANDARD_START, status, C.checksum([status]), C.FLAG.STOP];
function setup() {
  const writes=[];
  const c=P.createProgrammingController({
    write:b=>{writes.push(b);return Promise.resolve();},
    now:()=>1234,setTimeoutFn:()=>1,clearTimeoutFn:()=>{}
  });
  return {c,writes};
}
async function run() {
  const h=setup();
  const operation=h.c.programFixedDistance(1000,CTX);
  await Promise.resolve();await Promise.resolve();
  for (const ctx of [{}, {connected:true,deviceId:'PM5-A'}, {connected:true,generation:4}]) {
    const r=h.c.handleControlResponse(response(),ctx);
    assert.equal(r.handled,false,'unattributed direct response must be ignored');
    assert.equal(h.c.getState(),P.STATE.WAITING_RESPONSE);
    assert.equal(h.writes.length,1,'must not send GETSTATUS for missing identity');
  }
  assert.equal(h.c.handleControlResponse(response(),CTX).state,P.STATE.AWAITING_ACK);
  await Promise.resolve();
  for (const ctx of [{}, {connected:true,deviceId:'PM5-A'}, {connected:true,generation:4}]) {
    const r=h.c.handleControlResponse(response(),ctx);
    assert.equal(r.handled,false,'unattributed GETSTATUS response must be ignored');
    assert.equal(h.c.getState(),P.STATE.AWAITING_ACK);
  }
  assert.equal(h.c.handleControlResponse(response(),{...CTX,muxSeq:50}).state,P.STATE.VERIFYING);
  const rb=L.pm5RawToCanonical({workoutType:2,workoutDuration:1000,workoutDurationType:0x80});
  for (const ctx of [{packetId:'0x31',packetSeq:51},{generation:4,packetId:'0x31',packetSeq:51},{deviceId:'PM5-A',packetId:'0x31',packetSeq:51}]) {
    const r=h.c.verifyFromTelemetry(rb,ctx);
    assert.equal(r.verified,false,'unattributed readback must not confirm programming');
    assert.equal(h.c.getState(),P.STATE.VERIFYING);
  }
  assert.equal(h.c.verifyFromTelemetry(rb,{...CTX,packetId:'0x31',packetSeq:51}).verified,true);
  assert.equal((await operation).state,P.STATE.PROGRAMMED);
  console.log('PM5 strict ACK/readback identity: PASS');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
