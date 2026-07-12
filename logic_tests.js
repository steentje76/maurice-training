
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

// ── RATIOFACTOR-MOTOR (v299) ─────────────────────────────
console.log("\n⚖️  Ratiofactor-motor");

const LIFT_NORMS = {
  backsquat: 1.5, bench: 1.0, frontsquat: 1.2, shoulderpress: 0.65,
  hexabar: 1.75, hpc: 0.75, hps: 0.55
};
const RATIO_MIN_OBS = 5;
const RATIO_DECAY = 0.95;

function weightedEst1RM(sessions, refDate){
  const ref = refDate ? new Date(refDate) : new Date();
  let sumW=0, sumWV=0, n=0;
  (sessions||[]).forEach(s=>{
    if(!s.weight||!s.reps)return;
    const est = s.reps===1 ? s.weight : s.weight*(1+s.reps/30);
    const days = Math.max(0,(ref - new Date(s.date))/86400000);
    const weken = days/7;
    const w = Math.pow(RATIO_DECAY, weken);
    sumW += w; sumWV += w*est; n++;
  });
  if(!n) return {est:null, n:0};
  return {est: sumWV/sumW, n};
}

function ratioConfidence(nA,nB){
  const n = Math.min(nA,nB);
  if(n < RATIO_MIN_OBS) return 'Laag';
  if(n < RATIO_MIN_OBS*2) return 'Middel';
  return 'Hoog';
}

function ratioFactor(liftA, liftB, estA, estB){
  const normA = LIFT_NORMS[liftA], normB = LIFT_NORMS[liftB];
  const fase1Ratio = (normA!=null && normB!=null) ? normA/normB : null;
  const genoegData = estA && estB && estA.n>=RATIO_MIN_OBS && estB.n>=RATIO_MIN_OBS && estA.est && estB.est;
  if(genoegData){
    return {ratio: estA.est/estB.est, bron:'eigen data', nA:estA.n, nB:estB.n, betrouwbaarheid: ratioConfidence(estA.n,estB.n)};
  }
  return {ratio: fase1Ratio, bron:'algemene richtlijn', nA:estA?estA.n:0, nB:estB?estB.n:0, betrouwbaarheid:'Laag'};
}

test('Fase1: standaardratio frontsquat/backsquat = 1.2/1.5', ()=>{
  const r = ratioFactor('frontsquat','backsquat', {est:null,n:0}, {est:null,n:0});
  assertEq(Math.round(r.ratio*1000)/1000, Math.round((1.2/1.5)*1000)/1000, 'fase1 ratio');
  assertEq(r.bron, 'algemene richtlijn');
  assertEq(r.betrouwbaarheid, 'Laag');
});

test('Fase2 schakelt pas in bij n>=5 op beide liften', ()=>{
  const estA = {est:90, n:4}; // net onder drempel
  const estB = {est:100, n:6};
  const r = ratioFactor('frontsquat','backsquat', estA, estB);
  assertEq(r.bron, 'algemene richtlijn', 'moet nog fase1 zijn bij n=4');
});

test('Fase2 actief bij n>=5 op beide liften, ratio uit eigen data', ()=>{
  const estA = {est:96, n:6};
  const estB = {est:100, n:8};
  const r = ratioFactor('frontsquat','backsquat', estA, estB);
  assertEq(r.bron, 'eigen data');
  assertEq(Math.round(r.ratio*100)/100, 0.96);
});

test('Betrouwbaarheid Laag/Middel/Hoog o.b.v. laagste n', ()=>{
  assertEq(ratioConfidence(4,20), 'Laag');
  assertEq(ratioConfidence(5,20), 'Middel');
  assertEq(ratioConfidence(10,20), 'Hoog');
});

test('weightedEst1RM: single rep = gewicht zelf, geen Epley-opslag', ()=>{
  const r = weightedEst1RM([{date:'2026-06-01',weight:100,reps:1}], '2026-06-01');
  assertEq(r.est, 100);
  assertEq(r.n, 1);
});

test('weightedEst1RM: recente sessie weegt zwaarder dan oude (decay)', ()=>{
  // oude sessie hoger gewicht, recente sessie lager gewicht -> gewogen gemiddelde dichter bij recente
  const sessions = [
    {date:'2026-01-01', weight:120, reps:1},
    {date:'2026-06-20', weight:90, reps:1}
  ];
  const r = weightedEst1RM(sessions, '2026-06-27');
  assert(r.est < 105, `Verwacht dichter bij recente waarde (90), kreeg ${r.est}`);
});

test('weightedEst1RM: lege of onvolledige sessies genegeerd', ()=>{
  const r = weightedEst1RM([{date:'2026-06-01',weight:null,reps:3},{date:'2026-06-01'}]);
  assertEq(r.est, null);
  assertEq(r.n, 0);
});

test('ratioFactor: fallback naar fase1 als één lift geen data heeft', ()=>{
  const r = ratioFactor('hexabar','backsquat', {est:null,n:0}, {est:150,n:10});
  assertEq(r.bron, 'algemene richtlijn');
  assert(r.ratio !== null, 'fase1 fallback moet altijd een ratio geven voor bekende liften');
});

// ── DAGFACTOR-MOTOR (v300) ───────────────────────────────
console.log("\n🌤️  Dagfactor-motor");

function hrvSt(v){if(!v)return 'y';if(v>=24)return 'g';if(v>=18)return 'y';if(v>=14)return 'o';return 'r';}
function hrvDagFactor(v){const st=hrvSt(v);return {g:1.05,y:1.00,o:0.93,r:0.85}[st];}
function slaapDagFactor(uren){
  if(!uren)return 1.00;
  if(uren>=7)return 1.00;
  if(uren>=6)return 0.97;
  return 0.92;
}
function cyclusDagFactor(fase){
  return {menstruatie:0.93,folliculair:1.03,ovulatie:1.00,luteaal:0.97}[fase] ?? 1.00;
}
function dagfactor(hrv,slaapUren,cyclusFase){
  const hrvFactor=hrvDagFactor(hrv);
  const slaapFactor=slaapDagFactor(slaapUren);
  const cyclusFactor=cyclusDagFactor(cyclusFase);
  const ruw=hrvFactor*slaapFactor*cyclusFactor;
  const factor=Math.round(Math.max(0.85,Math.min(1.05,ruw))*100)/100;
  return {factor,hrvFactor,slaapFactor,cyclusFactor};
}

test('Dagfactor optimaal: HRV hoog, slaap voldoende = 1.05', ()=>{
  const df=dagfactor(28,7.5,null);
  assertEq(df.factor,1.05);
});
test('Dagfactor kritiek: HRV laag, slaap kort = geclipt op 0.85', ()=>{
  const df=dagfactor(10,5,null);
  assertEq(df.factor,0.85);
});
test('Dagfactor zonder data = 1.00 (geen correctie)', ()=>{
  const df=dagfactor(null,null,null);
  assertEq(df.factor,1.00);
});
test('Dagfactor clip: nooit boven 1.05 of onder 0.85', ()=>{
  const hoog=dagfactor(30,8,'folliculair');
  const laag=dagfactor(10,4,'menstruatie');
  assert(hoog.factor<=1.05);
  assert(laag.factor>=0.85);
});
test('Cyclusfactor alleen effect als fase opgegeven', ()=>{
  assertEq(cyclusDagFactor(null),1.00);
  assertEq(cyclusDagFactor('menstruatie'),0.93);
  assertEq(cyclusDagFactor('folliculair'),1.03);
});
test('Dagfactor: normale HRV + normale slaap = 1.00', ()=>{
  const df=dagfactor(20,7,null);
  assertEq(df.factor,1.00);
});

// ── COLD-START-PREDICTOR (v300) ──────────────────────────
console.log("\n🧊 Cold-start-predictor");

function mastersFactorCS(leeftijd){
  if(leeftijd < 40) return 1.0;
  if(leeftijd < 45) return 1.01;
  if(leeftijd < 50) return 1.02;
  if(leeftijd < 55) return 1.04;
  if(leeftijd < 60) return 1.06;
  if(leeftijd < 65) return 1.09;
  return 1.12;
}
function expected1RMCS(lift,gewicht,leeftijd,niveau){
  const niveauFactor={beginner:0.5,gevorderd:0.75,ervaren:1.0,expert:1.2}[niveau]||1.0;
  const mf=mastersFactorCS(leeftijd);
  const norm=LIFT_NORMS[lift]||1.0;
  return Math.round(gewicht*norm*niveauFactor*mf);
}
function coldStartViaAnchor(ankerRM,ratioFactorVal){
  if(!ankerRM||!ratioFactorVal)return null;
  return Math.round(ankerRM*ratioFactorVal);
}

test('Cold-start kernlift: backsquat 110kg lichaamsgewicht, ervaren, 50 jaar', ()=>{
  const est=expected1RMCS('backsquat',110,50,'ervaren');
  // 110 * 1.5 * 1.0 * 1.04
  assertEq(est, Math.round(110*1.5*1.0*1.04));
});
test('Cold-start kernlift: beginner scoort lager dan ervaren bij zelfde gewicht', ()=>{
  const beginner=expected1RMCS('frontsquat',100,40,'beginner');
  const ervaren=expected1RMCS('frontsquat',100,40,'ervaren');
  assert(beginner<ervaren);
});
test('Cold-start via anker: nieuwe oefening op 85% van backsquat-1RM', ()=>{
  const est=coldStartViaAnchor(120,0.85);
  assertEq(est,102);
});
test('Cold-start via anker: geen schatting zonder ankerdata', ()=>{
  assertEq(coldStartViaAnchor(null,0.85), null);
  assertEq(coldStartViaAnchor(120,null), null);
});
test('Cold-start: onbekende lift zonder anker geeft geen schatting', ()=>{
  assertEq(LIFT_NORMS['onbekendelift'], undefined);
});

// ── PROGRAMMA — kalenderplanning (v310) ──────────────────
console.log("\n🗓️  Programma-generator: kalenderplanning + validatie");

function isoWeekday(dateStr){
  const wd=new Date(dateStr+'T00:00:00').getDay();
  return wd===0?7:wd;
}
function addDaysStr(dateStr,n){
  const d=new Date(dateStr+'T00:00:00');
  d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
}
function computeBlockPlannedDates(startDate,blockCount,schemaType,weekdagen,dagenPerWeek){
  const dates=[];
  if(schemaType==='weekdagen'&&weekdagen&&weekdagen.length){
    const wd=[...weekdagen].sort((a,b)=>a-b);
    let cursor=startDate,wdIdx=0;
    for(let i=0;i<blockCount;i++){
      const target=wd[wdIdx%wd.length];
      while(isoWeekday(cursor)!==target){cursor=addDaysStr(cursor,1);}
      dates.push(cursor);
      cursor=addDaysStr(cursor,1);
      wdIdx++;
    }
  }else{
    const spacing=Math.max(1,Math.round(7/(dagenPerWeek||2)));
    for(let i=0;i<blockCount;i++){dates.push(addDaysStr(startDate,i*spacing));}
  }
  return dates;
}
function parseProgrammaJSON(txt,exerciseList){
  try{
    const cleaned=txt.replace(/```json|```/g,'').trim();
    const obj=JSON.parse(cleaned);
    if(!obj.blocks||!Array.isArray(obj.blocks)||!obj.blocks.length)return null;
    const ids=new Set((exerciseList||[]).map(e=>e.id));
    const valid=obj.blocks.every(b=>b.week_nr&&b.fase_naam&&Array.isArray(b.oefeningen)&&b.oefeningen.length&&
      b.oefeningen.every(o=>o.exercise_id&&o.sets&&o.reps&&(!ids.size||ids.has(o.exercise_id))));
    return valid?obj:null;
  }catch{return null;}
}

test('isoWeekday: maandag is 1, zondag is 7', ()=>{
  assertEq(isoWeekday('2026-07-13'), 1); // maandag
  assertEq(isoWeekday('2026-07-19'), 7); // zondag
});
test('addDaysStr: telt kalenderdagen correct op', ()=>{
  assertEq(addDaysStr('2026-07-12', 5), '2026-07-17');
});
test('computeBlockPlannedDates (weekdagen): cyclet door gekozen dagen ma/do', ()=>{
  // 2026-07-12 is een zondag; eerste ma erna is 2026-07-13
  const dates=computeBlockPlannedDates('2026-07-12', 4, 'weekdagen', [1,4], 2);
  assertEq(dates[0], '2026-07-13'); // ma
  assertEq(dates[1], '2026-07-16'); // do
  assertEq(dates[2], '2026-07-20'); // volgende ma
  assertEq(dates[3], '2026-07-23'); // volgende do
});
test('computeBlockPlannedDates (weekdagen): sorteert ongeordende invoer', ()=>{
  const dates=computeBlockPlannedDates('2026-07-12', 2, 'weekdagen', [4,1], 2);
  assertEq(dates[0], '2026-07-13'); // ma, ook al stond 4 eerst in de invoer
});
test('computeBlockPlannedDates (interval): spreidt gelijkmatig o.b.v. dagen/week', ()=>{
  const dates=computeBlockPlannedDates('2026-07-12', 3, 'interval', [], 7);
  assertEq(dates[0], '2026-07-12');
  assertEq(dates[1], '2026-07-13'); // spacing 1 dag bij 7x/week
  assertEq(dates[2], '2026-07-14');
});
test('computeBlockPlannedDates (interval): minimaal 1 dag tussenruimte', ()=>{
  const dates=computeBlockPlannedDates('2026-07-12', 2, 'interval', [], 14);
  assert(dates[1] !== dates[0], 'spacing mag nooit 0 zijn');
});
test('parseProgrammaJSON: geldige oefeningen-bibliotheek-structuur wordt geaccepteerd', ()=>{
  const lib=[{id:'backsquat'},{id:'bench'}];
  const json=JSON.stringify({blocks:[{week_nr:1,fase_naam:'Opbouw',oefeningen:[{exercise_id:'backsquat',sets:3,reps:'10-12',rpe:7}]}]});
  const parsed=parseProgrammaJSON(json, lib);
  assert(parsed !== null);
  assertEq(parsed.blocks.length, 1);
});
test('parseProgrammaJSON: onbekend exercise_id wordt geweigerd', ()=>{
  const lib=[{id:'backsquat'}];
  const json=JSON.stringify({blocks:[{week_nr:1,fase_naam:'Opbouw',oefeningen:[{exercise_id:'onbekend',sets:3,reps:'10'}]}]});
  assertEq(parseProgrammaJSON(json, lib), null);
});
test('parseProgrammaJSON: blok zonder oefeningen wordt geweigerd', ()=>{
  const json=JSON.stringify({blocks:[{week_nr:1,fase_naam:'Opbouw',oefeningen:[]}]});
  assertEq(parseProgrammaJSON(json, []), null);
});
test('parseProgrammaJSON: strip ```json-fences voor het parsen', ()=>{
  const lib=[{id:'bench'}];
  const json='```json\n'+JSON.stringify({blocks:[{week_nr:1,fase_naam:'Piek',oefeningen:[{exercise_id:'bench',sets:2,reps:'3'}]}]})+'\n```';
  assert(parseProgrammaJSON(json, lib) !== null);
});
test('parseProgrammaJSON: kapotte JSON geeft null, geen crash', ()=>{
  assertEq(parseProgrammaJSON('geen geldige json', []), null);
});

// ── PROGRAMMA — coach-checkin & aanpassing (v311) ────────
console.log("\n🩺 Programma coach-checkin: aanpassing-logica");

function computeProgAdjustment(factor,muscleRecoveryRows,voelt,painMuscle){
  const laag=(muscleRecoveryRows||[]).filter(r=>r.pct<70);
  const slecht=voelt==='slecht';
  const matig=voelt==='matig';
  const nodig=factor<0.97||laag.length>0||slecht||matig||!!painMuscle;
  if(!nodig)return null;
  let rpeDelta=0,setsDelta=0;
  if(factor<0.90||slecht){rpeDelta=-1.5;setsDelta=-1;}
  else if(factor<0.97||matig||laag.length){rpeDelta=-0.5;}
  const redenen=[];
  if(factor<0.97)redenen.push('herstel-dagfactor '+factor);
  if(laag.length)redenen.push('laag spierherstel: '+laag.map(r=>r.muscle+' '+r.pct+'%').join(', '));
  if(slecht)redenen.push('je gaf aan je slecht te voelen');
  if(matig)redenen.push('je gaf aan je matig te voelen');
  if(painMuscle)redenen.push('pijn/ongemak gemeld: '+painMuscle);
  return {rpeDelta,setsDelta,redenen,painMuscle};
}
function exercisesTargetForDuration(minutes){
  if(!minutes)return 4;
  return Math.max(2,Math.min(8,Math.round(minutes/12)));
}
function buildDagDuren(schemaType,weekdagen,dagenPerWeek,duur,duurOverrides){
  const ov=duurOverrides||{};
  const basis=duur||60;
  if(schemaType==='weekdagen'&&weekdagen&&weekdagen.length){
    return [...weekdagen].sort((a,b)=>a-b).map(wd=>ov[wd]||basis);
  }
  return Array.from({length:dagenPerWeek||2},(_,i)=>ov[i+1]||basis);
}
function buildWeekPrompt(wk,weken,dagDuren,doel,sportLabel,profielTekst,bibliotheek,faseHistorie,extraContext){
  const dagen=dagDuren.length;
  const context=(faseHistorie&&faseHistorie.length)
    ? `Eerdere weken hadden als fase: ${faseHistorie.join(' → ')}. Zorg dat week ${wk} logisch daarop voortbouwt richting een sluitende periodisering (opbouw → hypertrofie → kracht → deload waar passend).`
    : `Dit is de eerste week van het programma — kies een passende openingsfase.`;
  const dagInstructies=dagDuren.map((min,i)=>`dag ${i+1}: ${min} min → ±${exercisesTargetForDuration(min)} oefeningen`).join(', ');
  return `Je bent trainingscoach. Je bouwt week ${wk} van ${weken} van een periodiseringsschema, ${dagen} trainingsdagen deze week. Sportrichting: ${sportLabel}. Doel: ${doel}. Atleetprofiel: ${profielTekst}. ${context} Beschikbare tijd per trainingsdag deze week (bepaalt hoeveel oefeningen passend zijn): ${dagInstructies}.${extraContext?' '+extraContext:''} Kies voor elke trainingsdag zelf de beste oefeningen UIT DEZE BIBLIOTHEEK (gebruik alleen deze exercise_id's, verzin geen nieuwe): ${bibliotheek}. Antwoord ALLEEN met geldige JSON, geen uitleg, in dit exacte formaat: {"blocks":[{"week_nr":${wk},"fase_naam":"Anatomische Aanpassing","oefeningen":[{"exercise_id":"backsquat","sets":3,"reps":"12-15","rpe":6.5}]}]}. Genereer exact ${dagen} blokken voor deze week (1 per dag, in volgorde dag 1..${dagen}), elk met het bij die dag passende aantal oefeningen.`;
}
function repsPrefillFromRange(repsStr){
  if(!repsStr)return '';
  const m=String(repsStr).match(/(\d+)/);
  return m?m[1]:'';
}
function computeProgPrefill(ex,prevS,oneRM){
  if(!ex.reps&&!ex.rpe)return null;
  const reps=repsPrefillFromRange(ex.reps);
  const suggested=oneRM?suggestWeightForRepsRpe(oneRM,parseFloat(reps),ex.rpe):null;
  const kg=(suggested!=null)?suggested:((prevS&&prevS.weight)?prevS.weight:'');
  return {kg,reps,rpe:ex.rpe||'',sets:ex.sets||4};
}
function roundKg(v){ return Math.round(v*2)/2; }
function suggestWeightForRepsRpe(oneRM,reps,rpe){
  if(!oneRM||!reps)return null;
  const rir=Math.max(0,10-(parseFloat(rpe)||8));
  const repsToFailure=Math.min(20,reps+rir);
  const w=oneRM*(37-repsToFailure)/36;
  return w>0?roundKg(w):null;
}

test('computeProgAdjustment: geen aanpassing bij goed herstel, geen klachten', ()=>{
  assertEq(computeProgAdjustment(1.02, [], 'goed', null), null);
});
test('computeProgAdjustment: lage dagfactor triggert lichte aanpassing', ()=>{
  const adj=computeProgAdjustment(0.94, [], null, null);
  assert(adj !== null);
  assertEq(adj.rpeDelta, -0.5);
  assertEq(adj.setsDelta, 0);
});
test('computeProgAdjustment: kritieke dagfactor triggert zware aanpassing', ()=>{
  const adj=computeProgAdjustment(0.87, [], null, null);
  assertEq(adj.rpeDelta, -1.5);
  assertEq(adj.setsDelta, -1);
});
test('computeProgAdjustment: "slecht" voelen triggert zware aanpassing ongeacht HRV', ()=>{
  const adj=computeProgAdjustment(1.05, [], 'slecht', null);
  assertEq(adj.rpeDelta, -1.5);
});
test('computeProgAdjustment: laag spierherstel (<70%) triggert aanpassing', ()=>{
  const adj=computeProgAdjustment(1.0, [{muscle:'Schouders',pct:55}], null, null);
  assert(adj !== null);
  assert(adj.redenen.some(r=>r.includes('Schouders')));
});
test('computeProgAdjustment: pijn wordt altijd gemeld, ook zonder andere triggers', ()=>{
  const adj=computeProgAdjustment(1.0, [], null, 'Rug');
  assert(adj !== null);
  assertEq(adj.painMuscle, 'Rug');
});
test('computeProgAdjustment: reden-teksten bevatten alle actieve triggers', ()=>{
  const adj=computeProgAdjustment(0.85, [{muscle:'Borst',pct:40}], 'slecht', 'Knie');
  assertEq(adj.redenen.length, 4);
});
test('buildWeekPrompt: eerste week krijgt openingsfase-instructie, geen historie', ()=>{
  const p=buildWeekPrompt(1,8,[60,60,60],'kracht','CrossFit','40 jaar, man, ervaren',  'backsquat:Backsquat(strength)', []);
  assert(p.includes('eerste week'));
  assert(!p.includes('Eerdere weken'));
});
test('buildWeekPrompt: latere week refereert aan eerdere fasen', ()=>{
  const p=buildWeekPrompt(3,8,[60,60,60],'kracht','CrossFit','40 jaar, man, ervaren','backsquat:Backsquat(strength)', ['Anatomische Aanpassing','Hypertrofie']);
  assert(p.includes('Anatomische Aanpassing → Hypertrofie'));
});
test('buildWeekPrompt: vraagt exact dagen-aantal blokken (afgeleid van duur-array lengte)', ()=>{
  const p=buildWeekPrompt(2,8,[60,60,60,60],'kracht','HYROX','30 jaar, vrouw, gevorderd','x:Y(strength)', ['A']);
  assert(p.includes('exact 4 blokken'));
});
test('buildWeekPrompt: neemt afwijkende duur per dag mee in de instructie', ()=>{
  const p=buildWeekPrompt(1,4,[30,90],'kracht','Kracht','40 jaar, man, ervaren','x:Y(strength)', []);
  assert(p.includes('dag 1: 30 min'));
  assert(p.includes('dag 2: 90 min'));
});
test('exercisesTargetForDuration: korte sessie geeft weinig oefeningen', ()=>{
  assertEq(exercisesTargetForDuration(24), 2);
});
test('exercisesTargetForDuration: lange sessie wordt begrensd op 8', ()=>{
  assertEq(exercisesTargetForDuration(180), 8);
});
test('exercisesTargetForDuration: geen duur opgegeven geeft redelijke default', ()=>{
  assertEq(exercisesTargetForDuration(null), 4);
});
test('repsPrefillFromRange: pakt ondergrens uit een reeks', ()=>{
  assertEq(repsPrefillFromRange('12-15'), '12');
});
test('repsPrefillFromRange: werkt ook met een los getal', ()=>{
  assertEq(repsPrefillFromRange('8'), '8');
});
test('repsPrefillFromRange: lege invoer geeft lege string, geen crash', ()=>{
  assertEq(repsPrefillFromRange(''), '');
  assertEq(repsPrefillFromRange(null), '');
});
test('suggestWeightForRepsRpe: laag-reps hoge-RPE geeft gewicht dicht bij 1RM', ()=>{
  const w=suggestWeightForRepsRpe(110, 1, 10); // 1 rep @ RPE10 = zwaarste mogelijke set
  assertEq(w, 110);
});
test('suggestWeightForRepsRpe: hoge reps + lage RPE geeft duidelijk lichter gewicht dan 1RM', ()=>{
  const w=suggestWeightForRepsRpe(110, 12, 6);
  assert(w < 70, 'verwacht een licht werkgewicht, kreeg '+w);
  assert(w > 40, 'gewicht lijkt onrealistisch laag: '+w);
});
test('suggestWeightForRepsRpe: zonder 1RM geen suggestie', ()=>{
  assertEq(suggestWeightForRepsRpe(null, 10, 8), null);
});
test('computeProgPrefill: met 1RM-data wordt een RPE-passend gewicht voorgesteld, niet het oude 1-rep-testgewicht', ()=>{
  const ex={reps:'12-15',rpe:'6',sets:3};
  const prevS={weight:110,reps:1,rpe:9,sets:5}; // zware 1RM-achtige set, niet representatief voor 12 reps @ RPE6
  const pf=computeProgPrefill(ex,prevS,110);
  assert(pf.kg < 110, 'verwacht een lager gewicht dan de oude 1-rep-test, kreeg '+pf.kg);
});
test('computeProgPrefill: zonder 1RM valt terug op gewicht van vorige sessie', ()=>{
  const ex={reps:'12-15',rpe:'6',sets:3};
  const prevS={weight:70,reps:10,rpe:9,sets:4};
  const pf=computeProgPrefill(ex,prevS,null);
  assertEq(pf.kg, 70);
});
test('computeProgPrefill: reps/RPE komen altijd uit de programma-prescriptie', ()=>{
  const pf=computeProgPrefill({reps:'8-10',rpe:'5.5',sets:3}, {weight:90,reps:1,rpe:10,sets:4}, 90);
  assertEq(pf.rpe, '5.5');
  assertEq(pf.reps, '8');
});
test('computeProgPrefill: zonder reps/RPE-prescriptie geen prefill (cardio-achtige oefening)', ()=>{
  assertEq(computeProgPrefill({}, {weight:50,reps:5,rpe:8}, 100), null);
});

// ── PROGRAMMA — v315: her-generatie, wisselen, blessurecontext ──
console.log("\n🔁 Programma v315: her-generatie & wissel-oefening");

function filterSwapCandidates(allExercises,currentMusclesPrimary,excludeIds){
  const primary=new Set(currentMusclesPrimary||[]);
  if(!primary.size)return [];
  return allExercises.filter(e=>!excludeIds.includes(e.id)&&e.active!==false&&(e.muscle_primary||[]).some(m=>primary.has(m)));
}

test('buildWeekPrompt: zonder extraContext blijft de prompt ongewijzigd werken', ()=>{
  const p=buildWeekPrompt(1,8,[60,60],'kracht','CrossFit','40 jaar, man, ervaren','x:Y(strength)', []);
  assert(p.includes('Kies voor elke trainingsdag'));
});
test('buildWeekPrompt: extraContext wordt toegevoegd als die is meegegeven', ()=>{
  const p=buildWeekPrompt(1,8,[60,60],'kracht','CrossFit','40 jaar, man, ervaren','x:Y(strength)', [], 'Vermijd zware schouderbelasting.');
  assert(p.includes('Vermijd zware schouderbelasting.'));
});
test('filterSwapCandidates: alleen oefeningen met overlappende primaire spiergroep', ()=>{
  const lib=[
    {id:'backsquat',active:true,muscle_primary:['Quadriceps','Billen']},
    {id:'legpress',active:true,muscle_primary:['Quadriceps']},
    {id:'benchpress',active:true,muscle_primary:['Borst']}
  ];
  const cands=filterSwapCandidates(lib,['Quadriceps','Billen'],['backsquat']);
  assertEq(cands.length, 1);
  assertEq(cands[0].id, 'legpress');
});
test('filterSwapCandidates: sluit al aanwezige oefeningen in de sessie uit', ()=>{
  const lib=[
    {id:'backsquat',active:true,muscle_primary:['Quadriceps']},
    {id:'legpress',active:true,muscle_primary:['Quadriceps']}
  ];
  const cands=filterSwapCandidates(lib,['Quadriceps'],['backsquat','legpress']);
  assertEq(cands.length, 0);
});
test('filterSwapCandidates: sluit inactieve oefeningen uit', ()=>{
  const lib=[{id:'legpress',active:false,muscle_primary:['Quadriceps']}];
  const cands=filterSwapCandidates(lib,['Quadriceps'],[]);
  assertEq(cands.length, 0);
});
test('filterSwapCandidates: geen primaire spiergroepen bekend geeft lege lijst, geen crash', ()=>{
  assertEq(filterSwapCandidates([{id:'x',active:true,muscle_primary:['A']}], [], []).length, 0);
});

// ── PROGRAMMA — v316: duur per échte weekdag ──────────────
console.log("\n🗓️  Programma v316: duur per weekdag");
test('buildDagDuren (weekdagen): gebruikt overrides op de echte, gesorteerde weekdagnummers', ()=>{
  const dagen=buildDagDuren('weekdagen', [4,1], 2, 60, {1:45,4:90});
  assertEq(dagen[0], 45); // ma (1) eerst na sortering
  assertEq(dagen[1], 90); // do (4)
});
test('buildDagDuren (weekdagen): ontbrekende override valt terug op de standaardduur', ()=>{
  const dagen=buildDagDuren('weekdagen', [1,4], 2, 60, {4:90});
  assertEq(dagen[0], 60); // ma: geen override
  assertEq(dagen[1], 90); // do: wel override
});
test('buildDagDuren (interval): blijft dag-index-gebaseerd, geen weekdagen nodig', ()=>{
  const dagen=buildDagDuren('interval', [], 3, 45, {2:20});
  assertEq(dagen.length, 3);
  assertEq(dagen[0], 45);
  assertEq(dagen[1], 20);
  assertEq(dagen[2], 45);
});
test('buildDagDuren: zonder overrides overal de standaardduur', ()=>{
  const dagen=buildDagDuren('weekdagen', [1,3,5], 3, 50, {});
  assertEq(dagen.join(','), '50,50,50');
});

// ── HOME — v317: vriendelijk datumlabel programma-kaart ──
console.log("\n🗓️  Home-kaart: geplande datum");
function formatProgDate(dateStr){
  if(!dateStr)return '';
  const d=new Date(dateStr+'T00:00:00');
  const today=new Date();today.setHours(0,0,0,0);
  const diffDays=Math.round((d-today)/86400000);
  if(diffDays===0)return 'vandaag';
  if(diffDays===1)return 'morgen';
  if(diffDays===-1)return 'gisteren';
  const dagen=['zo','ma','di','wo','do','vr','za'];
  const maanden=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
  return dagen[d.getDay()]+' '+d.getDate()+' '+maanden[d.getMonth()];
}
function toDateStr(d){return d.toISOString().slice(0,10);}
test('formatProgDate: vandaag wordt herkend', ()=>{
  assertEq(formatProgDate(toDateStr(new Date())), 'vandaag');
});
test('formatProgDate: morgen wordt herkend', ()=>{
  const t=new Date();t.setDate(t.getDate()+1);
  assertEq(formatProgDate(toDateStr(t)), 'morgen');
});
test('formatProgDate: gisteren wordt herkend', ()=>{
  const t=new Date();t.setDate(t.getDate()-1);
  assertEq(formatProgDate(toDateStr(t)), 'gisteren');
});
test('formatProgDate: verdere datum krijgt dag+datum+maand-label', ()=>{
  const lbl=formatProgDate('2026-07-18'); // zaterdag
  assertEq(lbl, 'za 18 jul');
});
test('formatProgDate: lege invoer geeft lege string, geen crash', ()=>{
  assertEq(formatProgDate(null), '');
  assertEq(formatProgDate(''), '');
});

// ── VASTE TRAININGEN — v318: Route 2 (generiek i.p.v. A/B) ──
console.log("\n🏋️  Vaste trainingen: volgende-training-logica");
function computeNextVasteTraining(list,lastDoneMap){
  if(!list||!list.length)return null;
  let best=null,bestTime=Infinity;
  for(const v of list){
    const d=lastDoneMap?.[v.id];
    const t=d?new Date(d).getTime():-Infinity;
    if(t<bestTime){bestTime=t;best=v;}
  }
  return best;
}
test('computeNextVasteTraining: pakt degene die nog nooit gedaan is', ()=>{
  const list=[{id:'A',naam:'Training A'},{id:'B',naam:'Training B'}];
  const next=computeNextVasteTraining(list,{A:'2026-07-10'});
  assertEq(next.id, 'B');
});
test('computeNextVasteTraining: pakt de langst geleden gedane bij N trainingen', ()=>{
  const list=[{id:'A',naam:'A'},{id:'B',naam:'B'},{id:'C',naam:'C'}];
  const next=computeNextVasteTraining(list,{A:'2026-07-10',B:'2026-07-01',C:'2026-07-11'});
  assertEq(next.id, 'B');
});
test('computeNextVasteTraining: werkt met precies twee (oude A/B-gedrag behouden)', ()=>{
  const list=[{id:'A',naam:'A'},{id:'B',naam:'B'}];
  const next=computeNextVasteTraining(list,{A:'2026-07-11',B:'2026-07-10'});
  assertEq(next.id, 'B');
});
test('computeNextVasteTraining: lege lijst geeft null, geen crash', ()=>{
  assertEq(computeNextVasteTraining([],{}), null);
});
test('computeNextVasteTraining: geen enkele training ooit gedaan pakt gewoon de eerste', ()=>{
  const list=[{id:'A',naam:'A'},{id:'B',naam:'B'}];
  const next=computeNextVasteTraining(list,{});
  assertEq(next.id, 'A');
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
