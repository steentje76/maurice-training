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
// ── PUBLIEKE FIXED-DISTANCE SEQUENCE (OFFICIAL_CONFIRMED, CSAFE rev. 0.31) ──
// De oude proprietary route (wrapper 0x76 + SET_WORKOUTTYPE/SET_WORKOUTDURATION/
// CONFIGURE_WORKOUT) is op echte hardware GEFAALD: de PM5 antwoordde Previous Frame
// Status Ok maar configureerde geen workout. De officiele gewerkte sample gebruikt het
// PUBLIEKE pad: SETHORIZONTAL (0x21, 2-byte LITTLE-endian + units 0x21) gevolgd door
// SETPROGRAM (0x24, WORKOUTNUMBER_PROGRAMMED). Bereik Table 19: 100-50.000 m.
const GOLDEN = {
  100:   'f1 21 03 64 00 21 24 02 00 00 41 f2',
  500:   'f1 21 03 f4 01 21 24 02 00 00 d0 f2',
  1000:  'f1 21 03 e8 03 21 24 02 00 00 ce f2',
  2000:  'f1 21 03 d0 07 21 24 02 00 00 f3 02 f2',
  50000: 'f1 21 03 50 c3 21 24 02 00 00 b6 f2'
};
Object.keys(GOLDEN).forEach(function(k){
  const d=Number(k), r=S.buildFixedDistanceWorkout(d);
  ok(r.ok===true,'GOLDEN_VECTOR: '+d+' m bouwt');
  eq(hex(r.frame),GOLDEN[k],'GOLDEN_VECTOR: '+d+' m byte-exact volgens de officiele publieke sequence');
});
// commandostructuur expliciet, niet alleen het totaalframe
const g1000=S.buildFixedDistanceWorkout(1000);
eq(hex(g1000.frame.slice(1,6)),'21 03 e8 03 21','1000 m: SETHORIZONTAL len 3, distance LITTLE-endian, units 0x21');
eq(hex(g1000.frame.slice(6,10)),'24 02 00 00','1000 m: SETPROGRAM len 2, WORKOUTNUMBER_PROGRAMMED, unused');
ok(g1000.frame.indexOf(0x76)===-1,'1000 m: geen proprietary wrapper 0x76 meer in het publieke pad');
// LE-gate: een big-endian implementatie kan dit niet halen
ok(hex(g1000.frame.slice(3,5))==='e8 03','LE-gate: 1000 m is little-endian (e8 03), niet 03 e8');
// 2000 m: verplichte stuffing-invariant. Logische checksum = F2 -> verzonden als F3 02.
const c2000=[0x21,0x03,0xd0,0x07,0x21,0x24,0x02,0x00,0x00];
eq(S.checksum(c2000),0xF2,'2000 m: logische XOR-checksum is exact F2');
const f2000=S.buildFixedDistanceWorkout(2000).frame;
eq(hex(f2000.slice(f2000.length-3)),'f3 02 f2','2000 m: checksum F2 wordt gestuffed verzonden als F3 02 voor de stopflag');
ok(f2000.length===13,'2000 m: stuffing maakt het frame een byte langer dan de overige vectoren');

// ── FIXED-DISTANCE BUILDER (§6) ─────────────────────────────────────────────
[100,500,1000,2000,5000,50000].forEach(function(d){
  const r=S.buildFixedDistanceWorkout(d);
  ok(r.ok===true,'geldig: '+d+' m');
  eq(r.workoutType,2,d+' m -> FIXEDDIST_NOSPLITS');
  eq(r.durationType,0x80,d+' m -> duration type distance');
  eq(r.frame[0],0xF1,d+' m: standard start flag');
  eq(r.frame[r.frame.length-1],0xF2,d+' m: stop flag');
  ok(r.frame.length<=S.MAX_FRAME_BYTES,d+' m: binnen framelimiet');
});
[[99,'distance_below_minimum'],[0,'distance_below_minimum'],[-1,'distance_below_minimum'],
 [50001,'distance_above_maximum'],[NaN,'distance_not_finite'],[Infinity,'distance_not_finite'],
 [null,'distance_required'],[undefined,'distance_required'],[1000.5,'distance_not_integer']].forEach(function(t){
  const r=S.buildFixedDistanceWorkout(t[0]);
  ok(r.ok===false,'afgewezen: '+String(t[0]));
  eq(r.error,t[1],'reden voor '+String(t[0]));
  ok(!('frame' in r),'geen frame bij ongeldige invoer '+String(t[0]));
});
// 1000 m is geen special case: identieke commandostructuur als 500 m.
// (2000 m wijkt alleen in LENGTE af doordat zijn checksum F2 gestuffed wordt.)
const a=S.buildFixedDistanceWorkout(1000), b=S.buildFixedDistanceWorkout(500);
eq(a.frame.length,b.frame.length,'1000 m heeft geen afwijkende framelengte t.o.v. 500 m');
eq(hex(a.frame.slice(1,3)),hex(b.frame.slice(1,3)),'1000 m gebruikt hetzelfde SETHORIZONTAL-commando');
eq(hex(a.frame.slice(6,10)),hex(b.frame.slice(6,10)),'1000 m gebruikt hetzelfde SETPROGRAM-commando');
eq(a.workoutType,b.workoutType,'1000 m gebruikt hetzelfde workout type');
eq(a.commandSequence.join(','),'CSAFE_SETHORIZONTAL_CMD,CSAFE_SETPROGRAM_CMD','publieke sequence expliciet benoemd');
// De publieke fixed-distance sequence kent GEEN splitsvariant: splits zouden
// CSAFE_PM_SET_SPLITDURATION vereisen en vallen buiten Gate B.2. De builder mag
// daarom nooit stilzwijgend een ander workout type claimen op basis van options.
eq(S.buildFixedDistanceWorkout(1000,{splits:true}).workoutType,2,'splits-optie verandert het type NIET in het publieke pad');
eq(hex(S.buildFixedDistanceWorkout(1000,{splits:true}).frame),GOLDEN[1000],'splits-optie levert hetzelfde officiele frame');

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
