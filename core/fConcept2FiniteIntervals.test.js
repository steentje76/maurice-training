'use strict';
// Synthetic protocol tests, not hardware acceptance. Official PM CSAFE PDF (2026-03), p96 golden vector.
const assert=require('assert'),C=require('./concept2Csafe'),I=require('./intervalEngine');
assert.equal(typeof C.compileFiniteIntervalPrescription,'function');
const hex=s=>s.trim().split(/\s+/).map(x=>parseInt(x,16));
const golden=hex('F1 76 6F 18 01 00 01 01 08 17 01 01 03 05 80 00 00 01 F4 04 02 00 3C 06 04 00 00 27 10 14 01 01 18 01 01 17 01 00 03 05 00 00 00 46 50 04 02 00 00 06 04 00 00 27 10 14 01 01 18 01 02 17 01 01 03 05 80 00 00 03 E8 04 02 00 00 06 04 00 00 27 10 14 01 01 18 01 03 17 01 00 03 05 00 00 00 75 30 04 02 00 78 06 04 00 00 27 10 14 01 01 13 02 01 01 C6 F2');
const sample=C.buildVariableIntervals([
 {durationType:128,duration:500,restSeconds:60,targetPaceCentiseconds:10000},
 {durationType:0,duration:18000,restSeconds:0,targetPaceCentiseconds:10000},
 {durationType:128,duration:1000,restSeconds:0,targetPaceCentiseconds:10000},
 {durationType:0,duration:30000,restSeconds:120,targetPaceCentiseconds:10000}
]);
assert(sample.ok);assert.equal(sample.frames.length,1);assert.deepEqual(sample.frames[0].slice(0,-2),golden.slice(0,-2),'byte-exact official command payload');
// Verified visually on printed p96: example prints C6, while XOR of its exact contents is 09.
// Preserve this erratum; never change the encoder to emit the inconsistent printed checksum.
assert.equal(golden.at(-2),0xC6);assert.equal(C.checksum(golden.slice(1,-2)),0x09);
assert.equal(sample.frames[0].at(-2),0x09);assert.notEqual(C.checksum(golden.slice(1,-2)),golden.at(-2));
const block=(type,seconds)=>({type,termination:{type:'time',seconds}});
for(const sport of ['rowing','rowerg','skierg','bikeerg']){
 const raw={sport,blocks:[block('warmup',300),{repeat:6,of:[block('work',60),block('recovery',60)]},block('cooldown',180)]};
 const norm=I.normalizePrescription(raw),before=JSON.stringify(norm),r=C.compileFiniteIntervalPrescription(norm);
 assert(r.ok);assert(r.finite);assert.equal(r.workoutType,8);assert.equal(r.intervalCount,8,'warmup + exactly six work bouts + cooldown');
 assert.equal(JSON.stringify(norm),before,'canonical input unchanged');
 assert.deepEqual(r.expected.map(x=>x.duration),[30000,6000,6000,6000,6000,6000,6000,18000]);
 assert.deepEqual(r.expected.map(x=>x.restSeconds),[0,60,60,60,60,60,60,0]);
 assert.deepEqual(r.blockMapping.map(x=>x.blockIndex),[0,1,3,5,7,9,11,13]);
 assert.equal(r.physicallyVerified,false);assert(r.verificationRequired.includes('complete_interval_structure_readback'));
 assert(r.frames.length>1,'finite program can span bounded frames');
 for(const f of r.frames){assert(f.length<=120);assert.equal(f[0],0xF1);assert.equal(f.at(-1),0xF2);const u=C.unstuff(f.slice(1,-1));assert.equal(C.checksum(u.slice(0,-1)),u.at(-1));}
}
const invalid=[
 {sport:'running',blocks:[block('work',60)]},
 {sport:'rowerg',blocks:[block('recovery',60),block('work',60)]},
 {sport:'rowerg',blocks:[block('work',60),block('recovery',30),block('recovery',30)]},
 {sport:'rowerg',blocks:[block('work',19)]},
 {sport:'rowerg',blocks:[block('work',60),block('recovery',596)]},
 {sport:'rowerg',blocks:[{type:'work',termination:{type:'manual'}}]},
 {sport:'rowerg',blocks:[{...block('work',60),target:{power:200}}]},
 {sport:'rowerg',blocks:[{repeat:51,of:[block('work',60),block('recovery',60)]}]}
];
for(const raw of invalid){const r=C.compileFiniteIntervalPrescription(I.normalizePrescription(raw));assert.equal(r.ok,false,JSON.stringify(raw));assert.deepEqual(r.frames,[],'invalid plan must not produce partial writes');}
for(const it of [{durationType:128,duration:99,restSeconds:0},{durationType:0,duration:2000,restSeconds:-1},{durationType:0,duration:2000,restSeconds:0,targetPaceCentiseconds:Infinity}]){
 assert.equal(C.buildVariableIntervals([it]).ok,false);
}
const fifty=C.buildVariableIntervals(Array.from({length:50},()=>({durationType:128,duration:0xF1F2,restSeconds:0xF3})));
assert(fifty.ok);assert(fifty.frames.every(f=>f.length<=120),'stuffing counted in frame bounds');
console.log('Finite PM5 compiler: official payload + explicit printed-checksum erratum, exact 6x60/60 + warmup/cooldown, all three machines, frame/checksum/stuffing and fail-closed inputs PASS; hardware/readback NOT accepted');
