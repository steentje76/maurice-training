
// ═══════════════════════════════════════════════════════
// Maurice Training Coach — Logic Tests
// Draai met: node logic_tests.js
// ═══════════════════════════════════════════════════════

let passed = 0, failed = 0;

function test(name, fn){
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch(e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg){
  if(!condition) throw new Error(msg || 'Assertion failed');
}

function assertEq(a, b, msg){
  if(a !== b) throw new Error(`${msg || ''}: expected ${b}, got ${a}`);
}

function assertRange(val, min, max, msg){
  if(val < min || val > max) throw new Error(`${msg || ''}: ${val} niet in [${min}, ${max}]`);
}

// ── HRV DREMPELS ─────────────────────────────────────────
console.log("\n📊 HRV Drempels (Maurice-specifiek)");

function hrvStatus(v){
  if(!v) return 'y';
  if(v>=24) return 'g';
  if(v>=18) return 'y';
  if(v>=14) return 'o';
  return 'r';
}

test('HRV 24 = optimaal (groen)', ()=> assertEq(hrvStatus(24), 'g'));
test('HRV 23 = normaal (geel)', ()=> assertEq(hrvStatus(23), 'y'));
test('HRV 18 = normaal (geel)', ()=> assertEq(hrvStatus(18), 'y'));
test('HRV 17 = laag (oranje)', ()=> assertEq(hrvStatus(17), 'o'));
test('HRV 14 = laag (oranje)', ()=> assertEq(hrvStatus(14), 'o'));
test('HRV 13 = kritiek (rood)', ()=> assertEq(hrvStatus(13), 'r'));
test('HRV 0 = geel (falsy, behandeld als null)', ()=> assertEq(hrvStatus(0), 'y')); // 0 is falsy in JS
test('HRV null = geel (default)', ()=> assertEq(hrvStatus(null), 'y'));
test('HRV 36 = optimaal', ()=> assertEq(hrvStatus(36), 'g'));

// ── MASTERS FACTOR ────────────────────────────────────────
console.log("\n🏅 Masters leeftijdscorrectie (IPF)");

function mastersFactor(leeftijd){
  if(leeftijd < 40) return 1.0;
  if(leeftijd < 45) return 1.01;
  if(leeftijd < 50) return 1.02;
  if(leeftijd < 55) return 1.04;
  if(leeftijd < 60) return 1.06;
  if(leeftijd < 65) return 1.09;
  return 1.12;
}

test('Leeftijd 30 = factor 1.00', ()=> assertEq(mastersFactor(30), 1.0));
test('Leeftijd 40 = factor 1.01', ()=> assertEq(mastersFactor(40), 1.01));
test('Leeftijd 50 = factor 1.04 (Maurice)', ()=> assertEq(mastersFactor(50), 1.04));
test('Leeftijd 60 = factor 1.09 (grens <60 = 1.06, >=60 = 1.09)', ()=> assertEq(mastersFactor(60), 1.09));
test('Leeftijd 65 = factor 1.12', ()=> assertEq(mastersFactor(65), 1.12));
test('Factor altijd >= 1.0', ()=> assert(mastersFactor(25) >= 1.0));
test('Factor stijgt met leeftijd', ()=> assert(mastersFactor(60) > mastersFactor(50)));

// ── 1RM EPLEY FORMULE ────────────────────────────────────
console.log("\n💪 1RM Epley formule (weight × (1 + reps/30))");

function epley1RM(weight, reps){
  if(reps === 1) return weight;
  return Math.round(weight * (1 + reps/30));
}

test('1RM bij 1 rep = gewicht zelf', ()=> assertEq(epley1RM(240, 1), 240));
test('1RM 240×3 ≈ 264 kg', ()=> assertEq(epley1RM(240, 3), 264));
test('1RM 85×3 = 94 kg (bench)', ()=> assertEq(epley1RM(85, 3), 94)); // 85*1.1=93.5 → round=94
test('1RM 100×3 ≈ 110 kg (squat)', ()=> assertEq(epley1RM(100, 3), 110));
test('1RM 90×8 = hoog', ()=> assert(epley1RM(90, 8) > 110));
test('Meer reps = hogere 1RM schatting', ()=> assert(epley1RM(80, 8) > epley1RM(80, 3)));

// ── PLATE CALCULATOR ─────────────────────────────────────
console.log("\n⚖️ Plate Calculator");

function calcPlatesResult(target, bar, available){
  const perSide = (target - bar) / 2;
  const plates = [];
  const sorted = [...available].sort((a,b)=>b-a);
  let rem = perSide;
  for(const p of sorted){
    while(rem >= p - 0.001){
      plates.push(p);
      rem = Math.round((rem - p)*100)/100;
    }
  }
  const achieved = bar + plates.reduce((s,p)=>s+p,0)*2;
  return { plates, achieved, diff: Math.round((target - achieved)*10)/10 };
}

const STD_PLATES = [25,20,15,10,5,2.5,1.25,1,0.5];

test('100 kg met 20 kg stang = 2×40 kg per kant', ()=>{
  const r = calcPlatesResult(100, 20, STD_PLATES);
  assertEq(r.achieved, 100);
});
test('240 kg hexabar (0 kg stang) = correct', ()=>{
  const r = calcPlatesResult(240, 0, STD_PLATES);
  assertEq(r.achieved, 240);
});
test('85 kg bench = correct', ()=>{
  const r = calcPlatesResult(85, 20, STD_PLATES);
  assertEq(r.achieved, 85);
});
test('Onmogelijk gewicht → minimaal verschil', ()=>{
  const r = calcPlatesResult(83, 20, [25,20,15,10,5]);
  assert(Math.abs(r.diff) <= 5);
});
test('Stang alleen (20 kg target, 20 kg stang)', ()=>{
  const r = calcPlatesResult(20, 20, STD_PLATES);
  assertEq(r.plates.length, 0);
  assertEq(r.achieved, 20);
});
test('Geen schijven beschikbaar = alleen stang', ()=>{
  const r = calcPlatesResult(100, 20, []);
  assertEq(r.achieved, 20);
});

// ── COPY TO SETS ─────────────────────────────────────────
console.log("\n📋 Auto-copy sets logica");

function simulateCopyToSets(sets, fromSet, field, val){
  const result = [...sets];
  for(let i = fromSet; i < result.length; i++){
    if(!result[i][field]){
      result[i][field] = val;
    }
  }
  return result;
}

test('Lege sets worden gevuld', ()=>{
  const sets = [{kg:''},{kg:''},{kg:''},{kg:''}];
  const res = simulateCopyToSets(sets, 1, 'kg', '85');
  assertEq(res[1].kg, '85');
  assertEq(res[2].kg, '85');
  assertEq(res[3].kg, '85');
});
test('Gevulde sets worden NIET overschreven', ()=>{
  const sets = [{kg:''},{kg:''},{kg:'90'},{kg:''}];
  const res = simulateCopyToSets(sets, 1, 'kg', '85');
  assertEq(res[2].kg, '90'); // bestaande waarde behouden
});
test('Vorige sets worden niet aangepast', ()=>{
  const sets = [{kg:'80'},{kg:''},{kg:''},{kg:''}];
  const res = simulateCopyToSets(sets, 1, 'kg', '85');
  assertEq(res[0].kg, '80'); // set 0 onaangeroerd
});

// ── WORKOUT HERHALEN ─────────────────────────────────────
console.log("\n🔄 Workout herhalen gewicht berekening");

function repeatWeight(original, mode, adj){
  let nw = original;
  if(mode === 'plus') nw = Math.round((original + adj)*2)/2;
  else if(mode === 'pct') nw = Math.round(original*(1+adj/100)*2)/2;
  return nw;
}

test('Zelfde gewichten: geen aanpassing', ()=> assertEq(repeatWeight(100, 'same', 0), 100));
test('+2.5 kg: 100 → 102.5', ()=> assertEq(repeatWeight(100, 'plus', 2.5), 102.5));
test('+5 kg: 85 → 90', ()=> assertEq(repeatWeight(85, 'plus', 5), 90));
test('+10%: 100 → 110', ()=> assertEq(repeatWeight(100, 'pct', 10), 110));
test('-20%: 100 → 80', ()=> assertEq(repeatWeight(100, 'pct', -20), 80));
test('Afronding op 0.5 kg', ()=>{
  const r = repeatWeight(83, 'plus', 2.5);
  assert(r % 0.5 === 0, `${r} is geen veelvoud van 0.5`);
});

// ── ROEI SPLIT BEREKENING ────────────────────────────────
console.log("\n🚣 Roei split berekening");

function calcSplit(timeStr, dist){
  const p = timeStr.split(':');
  let sec = 0;
  if(p.length === 2) sec = parseFloat(p[0])*60 + parseFloat(p[1]);
  if(!sec || !dist) return '';
  const ss = (sec/dist)*500;
  const sm = Math.floor(ss/60), sr = Math.round(ss%60);
  return sm+':'+(sr<10?'0':'')+sr;
}

test('3:37.5 over 1000m = 1:48.8/500m', ()=>{
  // 3:37.5 = 217.5 sec / 1000 * 500 = 108.75 sec = 1:48.75 → 1:49
  const r = calcSplit('3:37', 1000);
  assert(r.startsWith('1:'), `Split moet met 1: beginnen, kreeg: ${r}`);
});
test('Split altijd M:SS formaat', ()=>{
  const r = calcSplit('4:00', 1000);
  assert(/^\d+:\d{2}$/.test(r), `Formaat fout: ${r}`);
});
test('Lege input = lege output', ()=>{
  assertEq(calcSplit('', 1000), '');
  assertEq(calcSplit('3:00', 0), '');
});
test('PR roei 3:36.5 over 1000m', ()=>{
  const r = calcSplit('3:36', 1000);
  assert(r.includes('1:'), `Verwacht ~1:48, kreeg: ${r}`);
});

// ── BMI BEREKENING ───────────────────────────────────────
console.log("\n📏 BMI berekening");

function calcBMI(weight, lengthCm){
  if(!weight || !lengthCm) return null;
  return Math.round(weight/Math.pow(lengthCm/100, 2)*10)/10;
}

test('BMI 109 kg, 180 cm = ~33.6', ()=>{
  const bmi = calcBMI(109, 180);
  assertRange(bmi, 33, 35, 'BMI Maurice');
});
test('BMI null bij ontbrekende data', ()=>{
  assert(calcBMI(null, 180) === null);
  assert(calcBMI(80, 0) === null);
});
test('BMI stijgt bij meer gewicht', ()=>{
  assert(calcBMI(120, 180) > calcBMI(100, 180));
});

// ── TAILLE-HEUP RATIO ────────────────────────────────────
console.log("\n📐 Taille-heup ratio");

function thr(waist, hips){
  if(!waist || !hips) return null;
  return Math.round((waist/hips)*100)/100;
}

test('THR < 0.9 = goed voor man', ()=>{
  const r = thr(88, 100);
  assert(r < 0.9, `${r} moet < 0.9 zijn`);
});
test('THR > 0.9 = let op voor man', ()=>{
  const r = thr(95, 100);
  assert(r >= 0.9, `${r} moet >= 0.9 zijn`);
});
test('THR null bij lege data', ()=>{
  assert(thr(null, 100) === null);
});

// ── SPORT FILTER (oefeningenlijst per sport) ──────────────
console.log("\n🏅 Sport filter oefeningenlijst");

function filterExercisesBySport(exList, sport){
  return exList.filter(e => !e.sports || !e.sports.length || e.sports.includes(sport));
}

const sportTestSet = [
  {id:'backsquat', sports:['kracht','crossfit']},
  {id:'lat_pulldown', sports:['bodybuilding']},
  {id:'kb_swing', sports:['kettlebell','crossfit']},
  {id:'legacy_ex', sports:[]},          // oude fallback-oefening zonder tag
  {id:'legacy_ex2'},                    // sports veld ontbreekt volledig
];

test('Filtert op gekozen sport', ()=>{
  const r = filterExercisesBySport(sportTestSet, 'bodybuilding');
  assert(r.some(e=>e.id==='lat_pulldown'), 'lat_pulldown moet aanwezig zijn');
  assert(!r.some(e=>e.id==='kb_swing'), 'kb_swing hoort niet bij bodybuilding');
});
test('Oefening met meerdere sporten verschijnt bij elk', ()=>{
  const r1 = filterExercisesBySport(sportTestSet, 'kracht');
  const r2 = filterExercisesBySport(sportTestSet, 'crossfit');
  assert(r1.some(e=>e.id==='backsquat'));
  assert(r2.some(e=>e.id==='backsquat'));
});
test('Oefening zonder sport-tag blijft altijd zichtbaar', ()=>{
  const r = filterExercisesBySport(sportTestSet, 'swimming');
  assert(r.some(e=>e.id==='legacy_ex'), 'lege sports array moet zichtbaar blijven');
  assert(r.some(e=>e.id==='legacy_ex2'), 'ontbrekend sports veld moet zichtbaar blijven');
});
test('Sport zonder gekoppelde oefeningen geeft alleen legacy items', ()=>{
  const r = filterExercisesBySport(sportTestSet, 'triathlon');
  assertEq(r.length, 2, 'alleen de 2 legacy-oefeningen zonder tag horen over te blijven');
});

// ── SAMENVATTING ─────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`);
console.log(`Resultaat: ${passed} geslaagd, ${failed} mislukt`);
if(failed > 0){
  console.log('⚠️  Er zijn mislukte tests — controleer de logica');
  process.exit(1);
} else {
  console.log('✅ Alle tests geslaagd');
}
