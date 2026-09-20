/* Gate B — pure CSAFE core. Bron: Concept2 PM CSAFE Communication Definition rev. 0.31. */
const path=require('path');
const S=require(path.resolve('core/concept2Csafe.js'));
let p=0,f=0;
const ok=(c,m)=>{c?p++:(f++,console.log('MISLUKT: '+m));};
const eq=(a,b,m)=>ok(a===b,m+' (verwacht '+b+', kreeg '+a+')');
const hex=a=>a.map(b=>(b<16?'0':'')+b.toString(16)).join(' ');

// ── OFFICIAL_VECTOR: rev. 0.31 voorbeeldframe ───────────────────────────────
// F1 76 07 01 01 01 13 02 01 01 61 F2
const OFFICIAL = [0xF1,0x76,0x07,0x01,0x01,0x01,0x13,0x02,0x01,0x01,0x61,0xF2];
const contents = [0x76,0x07,0x01,0x01,0x01,0x13,0x02,0x01,0x01];
eq(S.checksum(contents),0x61,'OFFICIAL_VECTOR: checksum = XOR frame contents = 0x61');
eq(hex(S.encodeStandardFrame(contents)),hex(OFFICIAL),'OFFICIAL_VECTOR: frame byte-exact gereproduceerd');
// wrapper + commando-encoding reproduceert dezelfde contents
const cmds=[].concat(S.encodeCommand(0x01,[0x01])).concat(S.encodeCommand(0x13,[0x01,0x01]));
eq(hex(S.encodeC2Wrapper(cmds)),hex(contents),'OFFICIAL_VECTOR: wrapper + byte counts kloppen');

// ── BIG-ENDIAN HARD GATE (§7) ───────────────────────────────────────────────
// DERIVED_TEST_VECTOR, afgeleid van de officiele veldvolgorde Byte1=MSB..Byte4=LSB
[[100,'00 00 00 64'],[1000,'00 00 03 e8'],[2000,'00 00 07 d0'],
 [5000,'00 00 13 88'],[999999,'00 0f 42 3f']].forEach(function(t){
  eq(hex(S.encodeDistanceBE32(t[0])),t[1],'DERIVED_TEST_VECTOR: '+t[0]+' m big-endian');
});
// een little-endian implementatie kan dit niet halen:
ok(hex(S.encodeDistanceBE32(1000))!=='e8 03 00 00','BE-gate: 1000 m is NIET little-endian');
ok(hex(S.encodeDistanceBE32(2000))!=='d0 07 00 00','BE-gate: 2000 m is NIET little-endian');
// de duration-payload in het echte frame draagt dezelfde volgorde
const w=S.buildFixedDistanceWorkout(2000);
const i=w.frame.indexOf(0x03);
eq(hex(w.frame.slice(i,i+7)),'03 05 80 00 00 07 d0','2000 m: SET_WORKOUTDURATION len 5, type 0x80, BE32');

// ── FIXED-DISTANCE BUILDER (§6) ─────────────────────────────────────────────
[100,500,1000,2000,5000,50000,999999].forEach(function(d){
  const r=S.buildFixedDistanceWorkout(d);
  ok(r.ok===true,'geldig: '+d+' m');
  eq(r.workoutType,2,d+' m -> FIXEDDIST_NOSPLITS');
  eq(r.durationType,0x80,d+' m -> duration type distance');
  eq(r.frame[0],0xF1,d+' m: standard start flag');
  eq(r.frame[r.frame.length-1],0xF2,d+' m: stop flag');
  ok(r.frame.length<=S.MAX_FRAME_BYTES,d+' m: binnen framelimiet');
});
[[99,'distance_below_minimum'],[0,'distance_below_minimum'],[-1,'distance_below_minimum'],
 [1000000,'distance_above_maximum'],[NaN,'distance_not_finite'],[Infinity,'distance_not_finite'],
 [null,'distance_required'],[undefined,'distance_required'],[1000.5,'distance_not_integer']].forEach(function(t){
  const r=S.buildFixedDistanceWorkout(t[0]);
  ok(r.ok===false,'afgewezen: '+String(t[0]));
  eq(r.error,t[1],'reden voor '+String(t[0]));
  ok(!('frame' in r),'geen frame bij ongeldige invoer '+String(t[0]));
});
// 1000 m is geen special case: zelfde vorm als andere afstanden
const a=S.buildFixedDistanceWorkout(1000), b=S.buildFixedDistanceWorkout(2000);
eq(a.frame.length,b.frame.length,'1000 m heeft geen afwijkende framelengte');
eq(a.workoutType,b.workoutType,'1000 m gebruikt hetzelfde workout type');
// splits-optie kiest het andere officiele type
eq(S.buildFixedDistanceWorkout(1000,{splits:true}).workoutType,3,'expliciete splits -> FIXEDDIST_SPLITS');

// ── STUFFING (§5) ───────────────────────────────────────────────────────────
eq(hex(S.stuff([0xF0])),'f3 00','F0 -> F3 00');
eq(hex(S.stuff([0xF1])),'f3 01','F1 -> F3 01');
eq(hex(S.stuff([0xF2])),'f3 02','F2 -> F3 02');
eq(hex(S.stuff([0xF3])),'f3 03','F3 -> F3 03');
eq(hex(S.stuff([0x01,0xF1,0x02,0xF2])),'01 f3 01 02 f3 02','meerdere stuffing-bytes');
eq(hex(S.unstuff(S.stuff([0xF0,0xF1,0xF2,0xF3,0x42]))),'f0 f1 f2 f3 42','unstuff is de inverse');
ok(S.unstuff([0xF3])===null,'afgekapte stuffing-sequentie afgewezen');
ok(S.unstuff([0xF3,0x09])===null,'ongeldige stuffing-waarde afgewezen');
// framelimiet
let boom=false; try{ S.encodeStandardFrame(new Array(130).fill(0x01)); }catch(e){ boom=true; }
ok(boom,'overlong frame wordt afgewezen');

// ── RESPONSE PARSER + CONFIRMED-SEMANTIEK (§10, Table 9) ────────────────────
function resp(status,extra){ const c=[status].concat(extra||[]); return S.encodeStandardFrame(c); }
const okR=S.parseResponseFrame(resp(0x01));           // prev=0x00 Ok, state=0x01 Ready
ok(okR.ok===true,'geldige response geparst');
eq(okR.previousFrameLabel,'ok','Previous Frame Status 0x00 = ok');
eq(okR.stateMachineLabel,'ready','State Machine State 0x01 = ready');
ok(S.isProgrammingConfirmed(okR),'CONFIRMED alleen bij Previous Frame Status Ok');
[[0x11,'reject'],[0x21,'bad'],[0x31,'not_ready']].forEach(function(t){
  const r=S.parseResponseFrame(resp(t[0]));
  eq(r.previousFrameLabel,t[1],'status 0x'+t[0].toString(16)+' -> '+t[1]);
  ok(!S.isProgrammingConfirmed(r),t[1]+' bevestigt NIET');
});
eq(S.parseResponseFrame(resp(0x81)).frameToggle,1,'frame toggle bit gelezen');
ok(S.isProgrammingConfirmed(S.parseResponseFrame(resp(0x81))),'toggle beinvloedt confirmation niet');
// negatieve gevallen bevestigen nooit
[[[],'empty'],[[0x00,0x01,0xF2],'no_start_flag'],[[0xF1,0x01,0x00],'no_stop_flag']].forEach(function(t){
  const r=S.parseResponseFrame(t[0]); eq(r.error,t[1],'afgewezen: '+t[1]); ok(!S.isProgrammingConfirmed(r),t[1]+' bevestigt niet');
});
const bad=resp(0x01).slice(); bad[bad.length-2]^=0xFF;
eq(S.parseResponseFrame(bad).error,'bad_checksum','ongeldige checksum afgewezen');
ok(!S.isProgrammingConfirmed(S.parseResponseFrame(bad)),'ongeldige checksum bevestigt niet');
eq(S.parseResponseFrame([0xF1,0x01,0xF2]).error,'truncated','te kort frame afgewezen');
ok(!S.isProgrammingConfirmed(null),'null bevestigt niet');
ok(!S.isProgrammingConfirmed({ok:false}),'mislukte parse bevestigt niet');

console.log('Concept2 CSAFE core: '+p+' geslaagd, '+f+' mislukt');
process.exit(f?1:0);
