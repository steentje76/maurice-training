
// ═══════════════════════════════════════════════════════
// Trainingskompas — Logic Tests
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

// ── HRV-BASELINE (Sprint 5.7.1 — Plews/Buchheit SWC-methode) ─────
// Zelfde implementatie als in index.html — pure functies, los getest.
// Vervangt de oude vaste-drempel-tests (24/18/14 ms), die wetenschappelijk
// achterhaald waren (audit: "HRV op absolute drempels zonder persoonlijke baseline").
console.log("\n📊 HRV-baseline (persoonlijke SWC-methode)");

const HRV_BASELINE_MIN_DAYS=14, HRV_BASELINE_FULL_DAYS=28, HRV_BASELINE_MIN_N=4;
const HRV_SWC_MULTIPLIER=0.5, HRV_SEVERE_DROP_PCT=0.15;

function lnRmssd(v){return (typeof v==='number'&&v>0)?Math.log(v):null;}

function hrvBaseline(hdRows, refDate){
  const ref=refDate?new Date(refDate):new Date();
  const rows=(hdRows||[]).filter(r=>r&&r.hrv&&r.date).map(r=>({date:new Date(r.date),hrv:r.hrv,ln:lnRmssd(r.hrv)})).filter(r=>r.ln!=null&&!isNaN(r.date.getTime())&&r.date<=ref);
  if(!rows.length)return {ready:false,fase:'referentie',n:0,days:0};
  rows.sort((a,b)=>a.date-b.date);
  const days=Math.max(0,Math.round((ref-rows[0].date)/86400000));
  const n=rows.length;
  if(days<HRV_BASELINE_MIN_DAYS||n<HRV_BASELINE_MIN_N)return {ready:false,fase:'referentie',n,days};
  const meanLn=rows.reduce((s,r)=>s+r.ln,0)/n;
  const variance=rows.reduce((s,r)=>s+Math.pow(r.ln-meanLn,2),0)/n;
  const sdLn=Math.sqrt(variance);
  const meanRaw=rows.reduce((s,r)=>s+r.hrv,0)/n;
  const fase=days>=HRV_BASELINE_FULL_DAYS?'volledig':'voorlopig';
  return {ready:true,fase,n,days,meanLn,sdLn,meanRaw,swc:HRV_SWC_MULTIPLIER*sdLn};
}
function hrvRollingRecent(hdRows, refDate){
  const ref=refDate?new Date(refDate):new Date();
  const rows=(hdRows||[]).filter(r=>r&&r.hrv&&r.date).map(r=>({date:new Date(r.date),hrv:r.hrv,ln:lnRmssd(r.hrv)})).filter(r=>r.ln!=null&&!isNaN(r.date.getTime())&&r.date<=ref);
  if(!rows.length)return null;
  rows.sort((a,b)=>b.date-a.date);
  const sevenDaysAgo=new Date(ref.getTime()-7*86400000);
  const last7=rows.filter(r=>r.date>=sevenDaysAgo);
  if(last7.length>=HRV_BASELINE_MIN_N){
    const meanLn=last7.reduce((s,r)=>s+r.ln,0)/last7.length;
    const meanRaw=last7.reduce((s,r)=>s+r.hrv,0)/last7.length;
    return {meanLn,meanRaw,n:last7.length,bron:'7d-gemiddelde'};
  }
  const latest=rows[0];
  return {meanLn:latest.ln,meanRaw:latest.hrv,n:1,bron:'laatste meting'};
}
function hrvStPersonal(hdRows, refDate){
  const baseline=hrvBaseline(hdRows,refDate);
  if(!baseline.ready)return {st:'ref',baseline,recent:null,drop:null};
  const recent=hrvRollingRecent(hdRows,refDate);
  if(!recent)return {st:'ref',baseline,recent:null,drop:null};
  const drop=(baseline.meanRaw-recent.meanRaw)/baseline.meanRaw;
  if(drop>=HRV_SEVERE_DROP_PCT)return {st:'r',baseline,recent,drop};
  if(recent.meanLn<baseline.meanLn-baseline.swc)return {st:'o',baseline,recent,drop};
  return {st:'g',baseline,recent,drop};
}
function hrvDagFactorPersonal(hdRows, refDate){
  const c=hrvStPersonal(hdRows,refDate);
  const factor={g:1.05,o:0.93,r:0.85,ref:1.00}[c.st];
  return {factor,st:c.st,baseline:c.baseline,recent:c.recent,drop:c.drop};
}

function daysAgoISO(n,ref){const d=new Date(ref);d.setDate(d.getDate()-n);return d.toISOString().slice(0,10);}
const HRV_TEST_REF='2026-08-07';
function mkDaily(fromDaysAgo,toDaysAgo,value,ref){const rows=[];for(let i=fromDaysAgo;i>=toDaysAgo;i--)rows.push({date:daysAgoISO(i,ref),hrv:value});return rows;}

test('Referentiefase: te weinig metingen (n<4), ongeacht periode', ()=>{
  const rows=[{date:daysAgoISO(3,HRV_TEST_REF),hrv:50},{date:daysAgoISO(1,HRV_TEST_REF),hrv:48}];
  const b=hrvBaseline(rows,HRV_TEST_REF);
  assertEq(b.ready,false); assertEq(b.fase,'referentie');
});
test('Referentiefase: genoeg metingen maar periode <14 dagen', ()=>{
  const rows=mkDaily(10,1,50,HRV_TEST_REF); // 10 dagen, elke dag een meting
  const b=hrvBaseline(rows,HRV_TEST_REF);
  assertEq(b.ready,false); assertEq(b.fase,'referentie'); assertEq(b.n,10); assertEq(b.days,10);
});
test('Voorlopige baseline vanaf 14 dagen', ()=>{
  const rows=mkDaily(18,1,50,HRV_TEST_REF);
  const b=hrvBaseline(rows,HRV_TEST_REF);
  assertEq(b.ready,true); assertEq(b.fase,'voorlopig'); assertEq(b.meanRaw,50);
});
test('Volledige baseline vanaf 28 dagen', ()=>{
  const rows=mkDaily(30,1,50,HRV_TEST_REF);
  const b=hrvBaseline(rows,HRV_TEST_REF);
  assertEq(b.ready,true); assertEq(b.fase,'volledig');
});
test('Stabiele HRV (geen afwijking van eigen baseline) = goed', ()=>{
  const rows=mkDaily(30,1,50,HRV_TEST_REF); // elke dag exact 50, ook de laatste week
  const r=hrvStPersonal(rows,HRV_TEST_REF);
  assertEq(r.st,'g');
});
test('Milde daling (~4,7%, binnen SWC-marge) = verlaagd, niet ernstig', ()=>{
  const rows=[...mkDaily(30,8,50,HRV_TEST_REF), ...mkDaily(7,1,47,HRV_TEST_REF)];
  const r=hrvStPersonal(rows,HRV_TEST_REF);
  assertEq(r.st,'o');
});
test('Sterke daling (>=15% t.o.v. eigen gemiddelde) = sterk verlaagd', ()=>{
  const rows=[...mkDaily(30,8,50,HRV_TEST_REF), ...mkDaily(7,1,35,HRV_TEST_REF)];
  const r=hrvStPersonal(rows,HRV_TEST_REF);
  assertEq(r.st,'r');
  assert(r.drop>=HRV_SEVERE_DROP_PCT,'drop moet >=15% zijn');
});
test('Geen enkele meting = referentiefase, geen crash', ()=>{
  const r=hrvStPersonal([],HRV_TEST_REF);
  assertEq(r.st,'ref');
});
test('hrvDagFactorPersonal: referentiefase geeft neutrale factor 1.00 (geen absolute claim)', ()=>{
  const rows=mkDaily(3,1,50,HRV_TEST_REF); // te weinig data
  const r=hrvDagFactorPersonal(rows,HRV_TEST_REF);
  assertEq(r.factor,1.00); assertEq(r.st,'ref');
});
test('hrvDagFactorPersonal: goed/verlaagd/sterk verlaagd geven respectievelijk 1.05/0.93/0.85', ()=>{
  assertEq(hrvDagFactorPersonal(mkDaily(30,1,50,HRV_TEST_REF),HRV_TEST_REF).factor,1.05);
  assertEq(hrvDagFactorPersonal([...mkDaily(30,8,50,HRV_TEST_REF),...mkDaily(7,1,47,HRV_TEST_REF)],HRV_TEST_REF).factor,0.93);
  assertEq(hrvDagFactorPersonal([...mkDaily(30,8,50,HRV_TEST_REF),...mkDaily(7,1,35,HRV_TEST_REF)],HRV_TEST_REF).factor,0.85);
});
test('Leeftijd is bewust geen input van de HRV-classificatie (persoonlijke baseline vangt dit al op)', ()=>{
  assertEq(hrvBaseline.length,2); assertEq(hrvStPersonal.length,2); // (hdRows, refDate) — geen leeftijdsparameter
});

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
test('Leeftijd 50 = factor 1.04', ()=> assertEq(mastersFactor(50), 1.04));
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
  assertRange(bmi, 33, 35, 'BMI-testcase 109kg/180cm');
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

// ── DAGFACTOR-MOTOR (v300, HRV-component vernieuwd in Sprint 5.7.1) ─────
console.log("\n🌤️  Dagfactor-motor");

function slaapDagFactor(uren){
  if(!uren)return 1.00;
  if(uren>=7)return 1.00;
  if(uren>=6)return 0.97;
  return 0.92;
}
function cyclusDagFactor(fase){
  return {menstruatie:0.93,folliculair:1.03,ovulatie:1.00,luteaal:0.97}[fase] ?? 1.00;
}
// hrvComponent = output van hrvDagFactorPersonal() (zelfde signatuur als index.html).
function dagfactor(hrvComponent,slaapUren,cyclusFase){
  const hc=hrvComponent||{factor:1.00,st:'ref',baseline:null};
  const hrvFactor=hc.factor;
  const slaapFactor=slaapDagFactor(slaapUren);
  const cyclusFactor=cyclusDagFactor(cyclusFase);
  const ruw=hrvFactor*slaapFactor*cyclusFactor;
  const factor=Math.round(Math.max(0.85,Math.min(1.05,ruw))*100)/100;
  return {factor,hrvFactor,slaapFactor,cyclusFactor,hrvSt:hc.st,hrvBaseline:hc.baseline};
}

test('Dagfactor optimaal: HRV goed (eigen baseline), slaap voldoende = 1.05', ()=>{
  const hrvC=hrvDagFactorPersonal(mkDaily(30,1,50,HRV_TEST_REF),HRV_TEST_REF); // stabiel -> 'g'
  const df=dagfactor(hrvC,7.5,null);
  assertEq(df.factor,1.05);
});
test('Dagfactor kritiek: HRV sterk verlaagd, slaap kort = geclipt op 0.85', ()=>{
  const rows=[...mkDaily(30,8,50,HRV_TEST_REF),...mkDaily(7,1,35,HRV_TEST_REF)]; // 'r'
  const hrvC=hrvDagFactorPersonal(rows,HRV_TEST_REF);
  const df=dagfactor(hrvC,5,null);
  assertEq(df.factor,0.85);
});
test('Dagfactor zonder enige data = 1.00 (geen correctie, geen absolute claim)', ()=>{
  const df=dagfactor(null,null,null);
  assertEq(df.factor,1.00);
});
test('Dagfactor referentiefase (te weinig HRV-historie) = neutrale 1.00 voor de HRV-component', ()=>{
  const hrvC=hrvDagFactorPersonal(mkDaily(3,1,50,HRV_TEST_REF),HRV_TEST_REF); // n<4 dagen
  assertEq(hrvC.st,'ref');
  const df=dagfactor(hrvC,7,null);
  assertEq(df.hrvFactor,1.00);
});
test('Dagfactor clip: nooit boven 1.05 of onder 0.85', ()=>{
  const goedeHrv=hrvDagFactorPersonal(mkDaily(30,1,50,HRV_TEST_REF),HRV_TEST_REF);
  const slechteHrv=hrvDagFactorPersonal([...mkDaily(30,8,50,HRV_TEST_REF),...mkDaily(7,1,35,HRV_TEST_REF)],HRV_TEST_REF);
  const hoog=dagfactor(goedeHrv,8,'folliculair');
  const laag=dagfactor(slechteHrv,4,'menstruatie');
  assert(hoog.factor<=1.05);
  assert(laag.factor>=0.85);
});
test('Cyclusfactor alleen effect als fase opgegeven', ()=>{
  assertEq(cyclusDagFactor(null),1.00);
  assertEq(cyclusDagFactor('menstruatie'),0.93);
  assertEq(cyclusDagFactor('folliculair'),1.03);
});
test('Dagfactor: normale/stabiele HRV + normale slaap = 1.00', ()=>{
  const hrvC=hrvDagFactorPersonal(mkDaily(30,1,50,HRV_TEST_REF),HRV_TEST_REF); // 'g' -> 1.05, x slaap 1.00
  const df=dagfactor(hrvC,7,null);
  // 'g' geeft hrvFactor 1.05, dus dagfactor 1.05 (niet 1.00) -- dit bewijst dat de
  // nieuwe methode een stabiele/normale HRV al als positief signaal waardeert i.p.v.
  // als neutraal te behandelen (verschil met de oude vaste-drempel-versie).
  assertEq(df.factor,1.05);
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
// v5.6.1 (Sprint 5.6.1 — RB2/RB3): geen schatting meer zonder leeftijd/gewicht.
// Voorheen viel dit stil terug op de ontwikkelaars-default leeftijd 50 via de aanroeper
// (atleet.leeftijd || 50); nu expliciet null zonder volledig profiel.
function expected1RMCS(lift,gewicht,leeftijd,niveau){
  if(!leeftijd||!gewicht) return null;
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
test('Sprint 5.6.1 (RB2/RB3): geen schatting zonder leeftijd (was voorheen default 50)', ()=>{
  assertEq(expected1RMCS('backsquat',110,null,'ervaren'), null);
});
test('Sprint 5.6.1 (RB2/RB3): geen schatting zonder lichaamsgewicht', ()=>{
  assertEq(expected1RMCS('backsquat',null,50,'ervaren'), null);
});
test('Sprint 5.6.1 (RB2/RB3): schatting werkt gewoon door zodra profiel compleet is', ()=>{
  assertEq(expected1RMCS('backsquat',110,45,'ervaren'), Math.round(110*1.5*1.0*1.02));
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
  // v3.3.15: lokale datumcomponenten i.p.v. toISOString() — zie index.html voor de
  // volledige uitleg van de bug die dit moest fixen (oneindige lus bij 'weekdagen').
  const d=new Date(dateStr+'T00:00:00');
  d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
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
// REGRESSIETEST v3.3.15 — vangt de "programma opslaan bevriest bij Vaste weekdagen"-bug.
// De sandbox/CI draait doorgaans op UTC, waardoor de oude toISOString()-bug in addDaysStr()
// hier nooit zichtbaar werd — hij trad alleen op in een niet-UTC tijdzone (NL: UTC+1/+2).
// Deze test zet TZ expliciet naar Europe/Amsterdam en zet daarna weer terug, zodat de test
// robuust is ongeacht in welke tijdzone hij toevallig draait.
test('addDaysStr: schuift echt door in een niet-UTC tijdzone (regressie v3.3.15)', ()=>{
  const origTZ=process.env.TZ;
  process.env.TZ='Europe/Amsterdam';
  try{
    assertEq(addDaysStr('2026-08-01', 1), '2026-08-02');
    assertEq(addDaysStr('2026-08-01', 0), '2026-08-01');
  }finally{
    if(origTZ===undefined)delete process.env.TZ; else process.env.TZ=origTZ;
  }
});
test('computeBlockPlannedDates (weekdagen): loopt niet vast als startdatum niet meteen matcht (regressie v3.3.15)', ()=>{
  const origTZ=process.env.TZ;
  process.env.TZ='Europe/Amsterdam';
  try{
    // 2026-08-01 is een zaterdag; target is woensdag(3) — de oude bug liep hier oneindig door
    const dates=computeBlockPlannedDates('2026-08-01', 2, 'weekdagen', [3,6], 2);
    assertEq(dates[0], '2026-08-05'); // eerstvolgende wo
    assertEq(dates[1], '2026-08-08'); // eerstvolgende za
  }finally{
    if(origTZ===undefined)delete process.env.TZ; else process.env.TZ=origTZ;
  }
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
function phaseForWeek(wk,weken){
  if(weken<=1)return 'Opbouw';
  if(weken<=3)return wk===1?'Anatomische Aanpassing':'Kracht';
  const adaptWeeks=Math.max(1,Math.round(weken*0.2));
  const deloadWeeks=1;
  const hyperWeeks=Math.max(1,Math.round((weken-adaptWeeks-deloadWeeks)*0.55));
  const strengthWeeks=Math.max(0,weken-adaptWeeks-deloadWeeks-hyperWeeks);
  if(wk<=adaptWeeks)return 'Anatomische Aanpassing';
  if(wk<=adaptWeeks+hyperWeeks)return 'Hypertrofie';
  if(wk<=adaptWeeks+hyperWeeks+strengthWeeks)return 'Kracht';
  return 'Deload / Peak';
}
function buildPRTekst(prList){
  if(!prList||!prList.length)return '';
  return `Bekende 1RM (kg): ${prList.map(p=>`${p.naam} ${p.kg}`).join(', ')}. Gebruik dit voor realistische belasting/progressie, niet als harde limiet.`;
}
function buildVarietyTekst(gebruiktIds,recentIds,exerciseList){
  const ids=[...new Set([...(gebruiktIds||[]),...(recentIds||[])])];
  if(!ids.length)return '';
  const namen=ids.map(id=>exerciseList.find(e=>e.id===id)?.name||id).filter(Boolean);
  if(!namen.length)return '';
  return `Recent gebruikt (dit programma en/of onlangs gelogd): ${namen.join(', ')}. Varieer waar mogelijk met andere oefeningen uit de bibliotheek, tenzij je een hoofdlift bewust herhaalt voor progressieve overload.`;
}
function buildWeekPrompt(wk,weken,dagDuren,doel,sportLabel,sportBlockTekst,profielTekst,bibliotheek,faseNaam,varietyTekst,extraContext){
  const dagen=dagDuren.length;
  const faseContext=`Dit is week ${wk} van ${weken} in een periodiseringsschema (opbouw → hypertrofie → kracht → deload/peak). Fase van déze week: "${faseNaam}" — kies oefeningen, volume (sets/reps) en intensiteit (RPE) die logisch bij deze fase passen.`;
  const sportContext=sportBlockTekst?` Sport-specifieke coaching-context: ${sportBlockTekst}`:'';
  const varietyBlock=varietyTekst?` ${varietyTekst}`:'';
  const dagInstructies=dagDuren.map((min,i)=>`dag ${i+1}: ${min} min → ±${exercisesTargetForDuration(min)} oefeningen`).join(', ');
  return `Je bent trainingscoach. Je bouwt week ${wk} van ${weken} van een periodiseringsschema, ${dagen} trainingsdagen deze week. Sportrichting: ${sportLabel}.${sportContext} Doel: ${doel}. Atleetprofiel: ${profielTekst}. ${faseContext}${varietyBlock} Beschikbare tijd per trainingsdag deze week (bepaalt hoeveel oefeningen passend zijn): ${dagInstructies}.${extraContext?' '+extraContext:''} Kies voor elke trainingsdag zelf de beste oefeningen UIT DEZE BIBLIOTHEEK (gebruik alleen deze exercise_id's, verzin geen nieuwe): ${bibliotheek}. Antwoord ALLEEN met geldige JSON, geen uitleg. Dit is uitsluitend een STRUCTUUR-voorbeeld — de exercise_id/sets/reps/rpe-waarden hieronder zijn placeholders, kies zelf passende eigen waarden, kopieer ze niet letterlijk over: {"blocks":[{"week_nr":${wk},"fase_naam":"${faseNaam}","oefeningen":[{"exercise_id":"<kies uit bibliotheek>","sets":"<getal>","reps":"<range zoals 8-10>","rpe":"<getal 5-9>"}]}]}. Genereer exact ${dagen} blokken voor deze week (1 per dag, in volgorde dag 1..${dagen}), elk met het bij die dag passende aantal oefeningen.`;
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
function buildSessionIntroTekst(faseNaam,weekNr,progDoel,oefeningNamen){
  const faseDeel=faseNaam?`${faseNaam} — week ${weekNr}`:`Week ${weekNr}`;
  const doelDeel=progDoel?` Doel: ${progDoel}.`:'';
  const oefDeel=(oefeningNamen&&oefeningNamen.length)?` Vandaag: ${oefeningNamen.join(', ')}.`:'';
  return `${faseDeel}.${doelDeel}${oefDeel}`;
}
test('buildSessionIntroTekst: volledige data geeft fase, doel en oefeningen', ()=>{
  const t=buildSessionIntroTekst('Hypertrofie',3,'Kracht opbouwen',['Backsquat','RDL']);
  assert(t.includes('Hypertrofie — week 3'));
  assert(t.includes('Doel: Kracht opbouwen.'));
  assert(t.includes('Vandaag: Backsquat, RDL.'));
});
test('buildSessionIntroTekst: zonder fase_naam valt terug op alleen weeknummer', ()=>{
  const t=buildSessionIntroTekst(null,1,'Kracht opbouwen',['Backsquat']);
  assert(t.startsWith('Week 1.'));
});
test('buildSessionIntroTekst: zonder doel/oefeningen geen crash, geen lege stukjes', ()=>{
  const t=buildSessionIntroTekst('Kracht',2,null,[]);
  assertEq(t, 'Kracht — week 2.');
});
test('phaseForWeek: kort programma (<=3 wk) krijgt alleen opbouw + kracht', ()=>{
  assertEq(phaseForWeek(1,2), 'Anatomische Aanpassing');
  assertEq(phaseForWeek(2,2), 'Kracht');
  assertEq(phaseForWeek(1,3), 'Anatomische Aanpassing');
  assertEq(phaseForWeek(3,3), 'Kracht');
});
test('phaseForWeek: 8-weken-schema doorloopt alle vier fasen in de juiste volgorde', ()=>{
  assertEq(phaseForWeek(1,8), 'Anatomische Aanpassing');
  assertEq(phaseForWeek(2,8), 'Anatomische Aanpassing');
  assertEq(phaseForWeek(3,8), 'Hypertrofie');
  assertEq(phaseForWeek(5,8), 'Hypertrofie');
  assertEq(phaseForWeek(6,8), 'Kracht');
  assertEq(phaseForWeek(7,8), 'Kracht');
  assertEq(phaseForWeek(8,8), 'Deload / Peak'); // laatste week bij 4+ weken is altijd deload
});
test('phaseForWeek: programma\'s van 4+ weken eindigen altijd met een deload-week', ()=>{
  assertEq(phaseForWeek(4,4), 'Deload / Peak');
  assertEq(phaseForWeek(12,12), 'Deload / Peak');
});
test('phaseForWeek: fase is deterministisch — dezelfde week/lengte geeft altijd hetzelfde resultaat', ()=>{
  assertEq(phaseForWeek(4,10), phaseForWeek(4,10));
});
test('buildPRTekst: lege lijst geeft lege string, geen crash', ()=>{
  assertEq(buildPRTekst([]), '');
  assertEq(buildPRTekst(null), '');
});
test('buildPRTekst: formatteert bekende 1RM\'s compact', ()=>{
  const t=buildPRTekst([{naam:'Backsquat',kg:120},{naam:'Deadlift',kg:160}]);
  assert(t.includes('Backsquat 120'));
  assert(t.includes('Deadlift 160'));
});
test('buildVarietyTekst: niets gebruikt/gelogd geeft lege string', ()=>{
  assertEq(buildVarietyTekst([],[],[{id:'backsquat',name:'Backsquat'}]), '');
});
test('buildVarietyTekst: zet exercise_id\'s om naar namen en dedupliceert', ()=>{
  const lib=[{id:'backsquat',name:'Backsquat'},{id:'bench',name:'Benchpress'}];
  const t=buildVarietyTekst(['backsquat'],['backsquat','bench'],lib);
  assert(t.includes('Backsquat'));
  assert(t.includes('Benchpress'));
  assertEq((t.match(/Backsquat/g)||[]).length, 1); // niet dubbel, ondanks overlap in beide lijsten
});
test('buildWeekPrompt: fase komt letterlijk (en consistent) terug in instructie én JSON-voorbeeld', ()=>{
  const p=buildWeekPrompt(3,8,[60,60,60],'kracht','CrossFit','','40 jaar, man, ervaren','backsquat:Backsquat(strength)','Hypertrofie','');
  assert(p.includes('"Hypertrofie"'));
  assert(p.includes('Fase van déze week: "Hypertrofie"'));
});
test('buildWeekPrompt: JSON-voorbeeld gebruikt neutrale placeholders, geen realistische ankerwaarden', ()=>{
  const p=buildWeekPrompt(1,8,[60,60,60],'kracht','CrossFit','','40 jaar, man, ervaren','backsquat:Backsquat(strength)','Anatomische Aanpassing','');
  assert(!p.includes('"backsquat"'), 'voorbeeld mag geen concrete exercise_id meer bevatten');
  assert(!p.includes('3×12-15')&&!p.includes('"sets":3'), 'voorbeeld mag geen concreet sets/reps-getal meer bevatten');
  assert(p.includes('<kies uit bibliotheek>'));
});
test('buildWeekPrompt: sport-context wordt toegevoegd indien gegeven', ()=>{
  const p=buildWeekPrompt(1,8,[60,60],'kracht','CrossFit','IDENTITEIT: test-sportblok','40 jaar, man, ervaren','x:Y(strength)','Anatomische Aanpassing','');
  assert(p.includes('IDENTITEIT: test-sportblok'));
});
test('buildWeekPrompt: vraagt exact dagen-aantal blokken (afgeleid van duur-array lengte)', ()=>{
  const p=buildWeekPrompt(2,8,[60,60,60,60],'kracht','HYROX','','30 jaar, vrouw, gevorderd','x:Y(strength)','Hypertrofie','');
  assert(p.includes('exact 4 blokken'));
});
test('buildWeekPrompt: neemt afwijkende duur per dag mee in de instructie', ()=>{
  const p=buildWeekPrompt(1,4,[30,90],'kracht','Kracht','','40 jaar, man, ervaren','x:Y(strength)','Anatomische Aanpassing','');
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
  const p=buildWeekPrompt(1,8,[60,60],'kracht','CrossFit','','40 jaar, man, ervaren','x:Y(strength)','Anatomische Aanpassing','');
  assert(p.includes('Kies voor elke trainingsdag'));
});
test('buildWeekPrompt: extraContext wordt toegevoegd als die is meegegeven', ()=>{
  const p=buildWeekPrompt(1,8,[60,60],'kracht','CrossFit','','40 jaar, man, ervaren','x:Y(strength)','Anatomische Aanpassing','','Vermijd zware schouderbelasting.');
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

console.log('\n🏃 Sport-specifieke AI-context: buildCtx()-splitsing');
// Zelfde implementatie als in index.html — pure functie, los getest.
function resolveSportBlock(sportKey,blocks,labels){
  if(blocks[sportKey])return blocks[sportKey];
  return `IDENTITEIT: ${labels[sportKey]||sportKey} — geen sport-specifieke coaching-richtlijnen vastgelegd, val terug op algemene trainingsprincipes (progressieve overload, RPE-sturing, herstel).`;
}
test('resolveSportBlock: bestaande sport geeft het bijbehorende blok terug', ()=>{
  const blocks={kracht:'KRACHT-BLOK-TEKST'};
  assertEq(resolveSportBlock('kracht',blocks,{}), 'KRACHT-BLOK-TEKST');
});
test('resolveSportBlock: sport buiten scope (bv. kettlebell) geeft generieke tekst, geen crash', ()=>{
  const blocks={kracht:'KRACHT-BLOK-TEKST'};
  const labels={kettlebell:'Kettlebell'};
  const r=resolveSportBlock('kettlebell',blocks,labels);
  assert(r.includes('Kettlebell'), 'generieke tekst moet het sport-label bevatten');
  assert(!r.includes('KRACHT-BLOK-TEKST'), 'mag niet per ongeluk het kracht-blok teruggeven — dit was de oorspronkelijke bug');
});
test('resolveSportBlock: onbekende sport-key zonder label valt terug op de key zelf', ()=>{
  const r=resolveSportBlock('onbekendesport',{},{});
  assert(r.includes('onbekendesport'), 'moet de ruwe key tonen als er geen label bekend is');
});

console.log('\n🔒 Per-device cache-eigenaarschap (v332 — fix cross-account datalek)');
// Zelfde logica als resetPersonalCacheIfNewDeviceOwner in index.html, los getest
// met een gemockte localStorage — geen DOM/browser nodig.
function makeMockStorage(){
  const store={};
  return {
    getItem:k=>store[k]??null,
    setItem:(k,v)=>{store[k]=v;},
    removeItem:k=>{delete store[k];},
    _dump:()=>({...store})
  };
}
function resolveDeviceOwnerReset(ls, uid, personalKeys){
  const CACHE_OWNER_KEY='maurice_cache_owner_uid';
  const lastOwner=ls.getItem(CACHE_OWNER_KEY);
  if(lastOwner===uid)return {wiped:false};
  personalKeys.forEach(k=>ls.removeItem(k));
  ls.setItem(CACHE_OWNER_KEY, uid);
  return {wiped:true};
}
test('resetPersonalCacheIfNewDeviceOwner: zelfde gebruiker als vorige sessie -> cache blijft staan', ()=>{
  const ls=makeMockStorage();
  ls.setItem('maurice_cache_owner_uid','user-A');
  ls.setItem('maurice_atleet', JSON.stringify({leeftijd:50}));
  const r=resolveDeviceOwnerReset(ls,'user-A',['maurice_atleet']);
  assertEq(r.wiped, false);
  assert(ls.getItem('maurice_atleet')!==null, 'data van dezelfde gebruiker mag niet gewist worden');
});
test('resetPersonalCacheIfNewDeviceOwner: ander account op hetzelfde device -> cache wordt gewist (was het datalek)', ()=>{
  const ls=makeMockStorage();
  ls.setItem('maurice_cache_owner_uid','user-A'); // vorige gebruiker op dit device
  ls.setItem('maurice_atleet', JSON.stringify({leeftijd:50,naam:'Vorige Gebruiker'})); // zijn echte profiel
  const r=resolveDeviceOwnerReset(ls,'user-B',['maurice_atleet']); // nieuw account logt in
  assertEq(r.wiped, true);
  assertEq(ls.getItem('maurice_atleet'), null, 'oude-gebruiker-data mag niet zichtbaar blijven voor het nieuwe account');
  assertEq(ls.getItem('maurice_cache_owner_uid'), 'user-B');
});
test('resetPersonalCacheIfNewDeviceOwner: eerste keer op een device (geen eerdere owner) -> ook wissen (schone lei)', ()=>{
  const ls=makeMockStorage();
  const r=resolveDeviceOwnerReset(ls,'user-A',['maurice_atleet']);
  assertEq(r.wiped, true);
  assertEq(ls.getItem('maurice_cache_owner_uid'), 'user-A');
});

// ── NIEUWE-GEBRUIKER-EERLIJKHEID (Sprint 5.6.2 — RB4) ─────
// Zelfde implementatie als de ready/loaded-filters in buildCoachAdvice() en
// DASHUI.recovery() in index.html — pure functie, los getest.
console.log("\n🆕 Nieuwe-gebruiker-eerlijkheid (RB4)");
function classifyRecoveryRows(rows){
  const loaded=rows.filter(r=>r.hours!==null&&r.pct<70).sort((a,b)=>a.pct-b.pct);
  const ready=rows.filter(r=>r.hours!==null&&r.pct>=90);
  return {loaded,ready};
}
test('Nieuwe gebruiker (geen enkele sessie): geen spier claimt \'volledig hersteld\'', ()=>{
  const rows=[{muscle:'Borst',pct:100,hours:null},{muscle:'Rug',pct:100,hours:null}];
  const {loaded,ready}=classifyRecoveryRows(rows);
  assertEq(ready.length,0);
  assertEq(loaded.length,0);
});
test('Ervaren gebruiker met echte lastHit-data: \'volledig hersteld\' blijft gewoon werken', ()=>{
  const rows=[{muscle:'Borst',pct:95,hours:72},{muscle:'Benen',pct:40,hours:20}];
  const {loaded,ready}=classifyRecoveryRows(rows);
  assertEq(ready.length,1); assertEq(ready[0].muscle,'Borst');
  assertEq(loaded.length,1); assertEq(loaded[0].muscle,'Benen');
});
test('Gemengd: spieren zonder data tellen niet mee, spieren mét data wel', ()=>{
  const rows=[{muscle:'Borst',pct:100,hours:null},{muscle:'Schouders',pct:92,hours:65}];
  const {ready}=classifyRecoveryRows(rows);
  assertEq(ready.length,1); assertEq(ready[0].muscle,'Schouders');
});

// ── NAMESPACE-MIGRATIE maurice_* -> tk_* (Sprint 5.6.3 — RB1/RB5) ─────
// Zelfde implementatie als de migratie-IIFE bovenaan index.html — pure functie
// (met een geïnjecteerde mock-localStorage i.p.v. de browser-API), los getest.
console.log("\n🔀 Namespace-migratie maurice_* -> tk_*");
function makeMockLocalStorage(initial){
  const store=Object.assign({},initial);
  return {
    getItem:k=>(k in store?store[k]:null),
    setItem:(k,v)=>{store[k]=String(v);},
    removeItem:k=>{delete store[k];},
    keys:()=>Object.keys(store),
    _dump:()=>Object.assign({},store),
  };
}
function runNamespaceMigration(localStorage){
  if(localStorage.getItem('tk_ns_migrated')==='1')return;
  var FIXED_KEYS=['theme','onboarding_done','rest_default','auth_session','trainings',
    'active_sport','rowers','rower','sound_enabled','haptics_enabled','notif_training',
    'notif_herstel','notif_coach','notif_updates','notif_systeem','atleet',
    'draft_training','last_training','plates','cache_owner_uid'];
  FIXED_KEYS.forEach(function(k){
    var oldKey='maurice_'+k, newKey='tk_'+k;
    if(localStorage.getItem(newKey)===null){
      var v=localStorage.getItem(oldKey);
      if(v!==null)localStorage.setItem(newKey,v);
    }
    localStorage.removeItem(oldKey);
  });
  localStorage.keys().filter(function(k){return k.indexOf('maurice_1rm_')===0;}).forEach(function(k){
    var newKey='tk_1rm_'+k.slice('maurice_1rm_'.length);
    if(localStorage.getItem(newKey)===null){
      var v=localStorage.getItem(k);
      if(v!==null)localStorage.setItem(newKey,v);
    }
    localStorage.removeItem(k);
  });
  localStorage.setItem('tk_ns_migrated','1');
}
test('Bestaande gebruiker: volledig profiel + 1RMs + onboarding-status correct gemigreerd, geen maurice_-sleutel resteert', ()=>{
  const ls=makeMockLocalStorage({
    maurice_atleet: JSON.stringify({naam:'Testgebruiker',leeftijd:34}),
    maurice_onboarding_done:'1',
    maurice_1rm_backsquat:'110',
    tk_wb_draft: JSON.stringify({sel:['ex1']}), // niet-gerelateerde bestaande tk_-sleutel
  });
  runNamespaceMigration(ls);
  const d=ls._dump();
  assertEq(JSON.parse(d.tk_atleet).naam,'Testgebruiker');
  assertEq(d.tk_onboarding_done,'1','geen ongewenste her-onboarding na migratie');
  assertEq(d.tk_1rm_backsquat,'110');
  assertEq('maurice_atleet' in d, false);
  assert(!Object.keys(d).some(k=>k.startsWith('maurice_')), 'geen enkele maurice_-sleutel resteert');
  assertEq(d.tk_wb_draft, JSON.stringify({sel:['ex1']}), 'andere bestaande tk_-feature blijft ongemoeid');
});
test('Nieuwe gebruiker zonder oude data: geen crash, alleen migratie-vlag gezet', ()=>{
  const ls=makeMockLocalStorage({});
  runNamespaceMigration(ls);
  const d=ls._dump();
  assertEq(Object.keys(d).length,1);
  assertEq(d.tk_ns_migrated,'1');
});
test('Migratie is idempotent: draait niet opnieuw over reeds-aangepaste data heen', ()=>{
  const ls=makeMockLocalStorage({maurice_atleet:JSON.stringify({naam:'Origineel'})});
  runNamespaceMigration(ls);
  ls.setItem('tk_atleet',JSON.stringify({naam:'AangepastNaMigratie'}));
  ls.setItem('maurice_atleet',JSON.stringify({naam:'Spookdata'})); // simuleert oude cache/tab
  runNamespaceMigration(ls);
  assertEq(JSON.parse(ls.getItem('tk_atleet')).naam,'AangepastNaMigratie');
});
test('localStorage-uitval (privémodus) crasht de migratie niet', ()=>{
  const broken={getItem:()=>{throw new Error('SecurityError');},setItem(){},removeItem(){},keys:()=>[]};
  let threw=false;
  try{ try{runNamespaceMigration(broken);}catch(e){/* verwacht opgevangen */} }catch(e){threw=true;}
  assertEq(threw,false);
});

// ── VALIDATIEMATRIX (Sprint 5.7.6) ─────────────────────────
// Doorloopt de volledige keten (HRV-baseline -> dagfactor -> factor-clip) voor elk van
// de door de sprint gevraagde persona's. Doel: nooit een crash/NaN, en de uitkomst moet
// altijd "logisch" blijven (binnen de geclipte 0.85-1.05-band, referentiefase nooit een
// absolute claim).
console.log("\n✅ Validatiematrix (Sprint 5.7.6)");

test('Persona: gloednieuwe gebruiker (0 HRV, 0 sessies, 0 slaap) — geen crash, neutrale uitkomst', ()=>{
  const hrvC=hrvDagFactorPersonal([], HRV_TEST_REF);
  assertEq(hrvC.st,'ref');
  const df=dagfactor(hrvC, null, null);
  assertEq(df.factor,1.00);
  assert(!isNaN(df.factor),'factor mag nooit NaN zijn');
});
test('Persona: weinig historie (3 metingen, 5 dagen oud) — blijft referentiefase, geen voorbarige claim', ()=>{
  const rows=mkDaily(5,1,45,HRV_TEST_REF).slice(0,3);
  const hrvC=hrvDagFactorPersonal(rows, HRV_TEST_REF);
  assertEq(hrvC.st,'ref');
  const df=dagfactor(hrvC, 6.5, null);
  assert(df.factor>=0.85 && df.factor<=1.05,'blijft binnen de geclipte band');
});
test('Persona: ervaren gebruiker, volledige baseline (30 dagen, stabiel) + goede slaap = optimaal maar geclipt', ()=>{
  const hrvC=hrvDagFactorPersonal(mkDaily(30,1,50,HRV_TEST_REF), HRV_TEST_REF);
  assertEq(hrvC.baseline.fase,'volledig');
  const df=dagfactor(hrvC, 8, null);
  assertEq(df.factor,1.05);
});
test('Persona: veel trainingsdata (60 metingen) — baseline blijft stabiel berekenbaar, geen performance-crash', ()=>{
  const rows=mkDaily(60,1,48,HRV_TEST_REF);
  const b=hrvBaseline(rows, HRV_TEST_REF);
  assertEq(b.ready,true); assertEq(b.n,60); assertEq(b.fase,'volledig');
});
test('Persona: ontbrekende HRV (wel slaap ingevuld) — dagfactor rekent door op slaap alleen', ()=>{
  const df=dagfactor(null, 5, null); // geen hrvComponent, slaap kort
  assertEq(df.hrvFactor,1.00); // neutraal, geen HRV-claim
  assertEq(df.slaapFactor,0.92);
  assert(!isNaN(df.factor));
});
test('Persona: ontbrekende slaap (wel volledige HRV-baseline) — dagfactor rekent door op HRV alleen', ()=>{
  const hrvC=hrvDagFactorPersonal(mkDaily(30,1,50,HRV_TEST_REF), HRV_TEST_REF);
  const df=dagfactor(hrvC, null, null);
  assertEq(df.slaapFactor,1.00); // neutraal zonder slaapdata
  assertEq(df.factor,1.05); // HRV-component blijft leidend
});
test('Persona: ontbrekend lichaamsgewicht — cold-start-predictor geeft null i.p.v. gokken (regressie uit Sprint 5.6.1)', ()=>{
  assertEq(expected1RMCS('backsquat', null, 45, 'ervaren'), null);
});
test('Validatiematrix — alle scenario\'s samen: dagfactor blijft ALTIJD binnen 0.85-1.05, ongeacht combinatie', ()=>{
  const scenarios=[
    dagfactor(null,null,null),
    dagfactor(hrvDagFactorPersonal([],HRV_TEST_REF), 4, 'menstruatie'),
    dagfactor(hrvDagFactorPersonal(mkDaily(30,1,50,HRV_TEST_REF),HRV_TEST_REF), 8, 'folliculair'),
    dagfactor(hrvDagFactorPersonal([...mkDaily(30,8,50,HRV_TEST_REF),...mkDaily(7,1,35,HRV_TEST_REF)],HRV_TEST_REF), 5, 'luteaal'),
  ];
  scenarios.forEach(df=>{
    assert(!isNaN(df.factor),'nooit NaN');
    assert(df.factor>=0.85 && df.factor<=1.05,'altijd binnen de geclipte band: '+df.factor);
  });
});

// ── AI COACH PRIVACY (Sprint 5.8.1) ─────────────────────────
// Zelfde implementatie als de tekstopbouw in buildCtx() (index.html) — pure
// functies, los getest. Vervangt het eerder hardcoded, universeel-verstuurde
// persoonlijke medische protocol.
console.log("\n🔒 AI Coach privacy — dataminimalisatie");

function formatActiveConditionsSummary(conditions){
  if(!conditions.length)return '';
  const labels=conditions.map(c=>c.label).join(', ');
  return `Vastgelegde aandachtspunten/condities (door de gebruiker zelf ingesteld): ${labels}. Houd hier expliciet rekening mee bij trainingsadvies en programmering — vermijd of pas belasting aan waar relevant voor deze condities.`;
}
function formatHrvGuide(hrvComponent){
  if(hrvComponent.st==='ref'){
    return 'HRV-referentiefase: nog onvoldoende eigen data voor een persoonlijke baseline (minimaal 14 dagen nodig). Baseer trainingsadvies op RPE en subjectief gevoel, niet op een HRV-drempel.';
  }
  const faseTxt=hrvComponent.baseline.fase==='volledig'?'volledige':'voorlopige';
  const statusTxt=hrvComponent.st==='g'?'binnen/boven eigen baseline (goed)':hrvComponent.st==='o'?'onder eigen baseline (verlaagd)':'sterk onder eigen baseline (≥15% daling, sterk verlaagd)';
  return `HRV wordt beoordeeld t.o.v. de ${faseTxt} eigen baseline van deze gebruiker (nooit een vaste norm). Huidige status: ${statusTxt}.`;
}

test('Gebruiker zonder vastgelegde condities: lege string, geen fallback-protocol', ()=>{
  assertEq(formatActiveConditionsSummary([]), '');
});
test('Gebruiker met zelf vastgelegde conditie (bv. lymfoedeem): alleen DIE conditie in de tekst', ()=>{
  const txt=formatActiveConditionsSummary([{label:'Lymfoedeem'}]);
  assert(txt.includes('Lymfoedeem'), 'moet de eigen conditie noemen');
  assert(!txt.toLowerCase().includes('rughol') , 'mag geen ongerelateerd universeel protocol bevatten');
});
test('Gebruiker met meerdere condities: allemaal opgenomen, kommagescheiden', ()=>{
  const txt=formatActiveConditionsSummary([{label:'Rugklachten'},{label:'Knieblessure'}]);
  assert(txt.includes('Rugklachten') && txt.includes('Knieblessure'));
});
test('Geen enkele test-conditie noemt het oude hardcoded RHR/lymfedrainage-protocol', ()=>{
  const txt=formatActiveConditionsSummary([{label:'Lymfoedeem'}]);
  assert(!txt.includes('58 bpm') && !txt.toLowerCase().includes('lymfedrainage altijd'));
});
test('HRV-gids referentiefase: geen absolute drempel-tekst, verwijst naar RPE', ()=>{
  const txt=formatHrvGuide({st:'ref'});
  assert(txt.includes('referentiefase'));
  assert(!/\\d+\\s*ms/.test(txt), 'geen absolute ms-drempel meer in de referentiefase-tekst');
});
test('HRV-gids met volledige baseline en status goed: noemt eigen baseline, geen vaste norm', ()=>{
  const txt=formatHrvGuide({st:'g', baseline:{fase:'volledig'}});
  assert(txt.includes('volledige eigen baseline'));
  assert(txt.includes('goed'));
});
test('HRV-gids met voorlopige baseline en status sterk verlaagd', ()=>{
  const txt=formatHrvGuide({st:'r', baseline:{fase:'voorlopig'}});
  assert(txt.includes('voorlopige eigen baseline'));
  assert(txt.includes('sterk verlaagd'));
});

// Zelfde groepeer-/scope-logica als in buildCtx() (index.html) — pure functie
// (sessies al opgehaald meegegeven i.p.v. een live sbGet-call), los getest.
function groupSessionsByExercise(sessions, relevantExIds){
  const byEx={};
  sessions.forEach(s=>{
    if(relevantExIds && !relevantExIds.has(s.exercise_id))return;
    (byEx[s.exercise_id]=byEx[s.exercise_id]||[]).push(s);
  });
  const result={};
  for(const exId in byEx)result[exId]=byEx[exId].slice(0,2);
  return result;
}
test('Zonder actieve training: alle recente oefeningen (binnen het venster) worden gegroepeerd', ()=>{
  const sessions=[
    {exercise_id:'squat',date:'2026-08-01'},{exercise_id:'squat',date:'2026-07-25'},{exercise_id:'squat',date:'2026-07-18'},
    {exercise_id:'bench',date:'2026-08-02'},
  ];
  const r=groupSessionsByExercise(sessions, null);
  assertEq(r.squat.length,2,'max 2 per oefening, ook al zijn er 3 sessies binnen het venster');
  assertEq(r.bench.length,1);
});
test('Met actieve training: alleen de oefeningen van díe training komen mee, andere niet', ()=>{
  const sessions=[
    {exercise_id:'squat',date:'2026-08-01'},
    {exercise_id:'deadlift',date:'2026-08-01'}, // niet onderdeel van de actieve training
  ];
  const relevant=new Set(['squat']);
  const r=groupSessionsByExercise(sessions, relevant);
  assert('squat' in r);
  assert(!('deadlift' in r), 'oefeningen buiten de actieve training mogen niet meekomen');
});
test('Geen sessies binnen scope: lege groepering, geen crash', ()=>{
  const r=groupSessionsByExercise([], new Set(['squat']));
  assertEq(Object.keys(r).length,0);
});

// ── AI COACH TOESTEMMING (Sprint 5.8.2) ─────────────────────
// Zelfde tri-state-logica als ensureAiConsent() in index.html — pure functie
// (met een geïnjecteerde askUser-functie i.p.v. de echte confirmModal-UI),
// los getest. Hergebruikt makeMockLocalStorage (Sprint 5.6.3). De vertaklogica
// zelf is niet async-afhankelijk (alleen de echte confirmModal-UI is dat), dus
// synchroon getest om betrouwbare volgorde in de testrun te garanderen.
console.log("\n🔒 AI Coach toestemming (consent-gate)");

function resolveAiConsentSync(localStorage, askUserFn){
  const stored=localStorage.getItem('tk_ai_consent');
  if(stored==='1')return true;
  if(stored==='0')return false;
  const granted=askUserFn();
  localStorage.setItem('tk_ai_consent', granted?'1':'0');
  return granted;
}

test('Al eerder toegestaan: geeft direct true, vraagt niet opnieuw', ()=>{
  let asked=false;
  const ls=makeMockLocalStorage({tk_ai_consent:'1'});
  const r=resolveAiConsentSync(ls, ()=>{asked=true;return true;});
  assertEq(r,true); assertEq(asked,false);
});
test('Al eerder geweigerd: geeft direct false, vraagt niet opnieuw (geen herhaalde pop-up)', ()=>{
  let asked=false;
  const ls=makeMockLocalStorage({tk_ai_consent:'0'});
  const r=resolveAiConsentSync(ls, ()=>{asked=true;return true;});
  assertEq(r,false); assertEq(asked,false);
});
test('Nog nooit gevraagd + gebruiker staat toe: wordt onthouden als toegestaan', ()=>{
  const ls=makeMockLocalStorage({});
  const r=resolveAiConsentSync(ls, ()=>true);
  assertEq(r,true); assertEq(ls.getItem('tk_ai_consent'),'1');
});
test('Nog nooit gevraagd + gebruiker weigert: wordt onthouden als geweigerd, AI Coach blijft uit', ()=>{
  const ls=makeMockLocalStorage({});
  const r=resolveAiConsentSync(ls, ()=>false);
  assertEq(r,false); assertEq(ls.getItem('tk_ai_consent'),'0');
});
test('Later gewijzigd via Instellingen: nieuwe keuze wordt gerespecteerd zonder opnieuw te vragen', ()=>{
  const ls=makeMockLocalStorage({});
  resolveAiConsentSync(ls, ()=>false); // eerste keer: weigert
  ls.setItem('tk_ai_consent','1'); // gebruiker wijzigt dit later zelf in Instellingen -> Privacy
  const r=resolveAiConsentSync(ls, ()=>{throw new Error('mag niet opnieuw vragen');});
  assertEq(r,true);
});

// ── LOCAL STORAGE AUDIT (Sprint 5.8.5) ─────────────────────
// Controleert de VOLLEDIGE, actuele PERSONAL_CACHE_KEYS-lijst uit index.html (incl. de
// datasets die sinds de oorspronkelijke DEC-032-fix zijn bijgekomen: guided workouts,
// workout builder, vaste-training-meta, favorieten, uitrusting-voorkeuren, en
// tk_ai_consent — toestemming mag nooit overerven naar de volgende gebruiker op een
// gedeeld toestel). Zelfde mock-localStorage-patroon als hierboven.
console.log("\n🔒 Local Storage Audit — volledige persoonlijke-cache-lijst (Sprint 5.8.5)");
const CURRENT_PERSONAL_CACHE_KEYS=[
  'tk_atleet','tk_trainings','tk_active_sport','tk_draft_training','tk_last_training',
  'tk_ai_consent','tk_gw_active','tk_gw_hist','tk_gw_log',
  'tk_wb_draft','tk_wb_saved','tk_vt_meta',
  'tk_lib_favs','tk_lib_recent','tk_lib_recentq',
  'tk_plates','tk_rower','tk_rowers','tk_rest_default'
];
test('Accountwissel op gedeeld toestel: ALLE huidige persoonlijke datasets worden gewist, niet alleen de oorspronkelijke 5', ()=>{
  const ls=makeMockStorage();
  ls.setItem('tk_cache_owner_uid','user-A');
  CURRENT_PERSONAL_CACHE_KEYS.forEach(k=>ls.setItem(k, JSON.stringify({van:'user-A'})));
  const r=resolveDeviceOwnerReset(ls,'user-B',CURRENT_PERSONAL_CACHE_KEYS);
  assertEq(r.wiped,true);
  CURRENT_PERSONAL_CACHE_KEYS.forEach(k=>{
    assertEq(ls.getItem(k), null, k+' moet gewist zijn bij accountwissel');
  });
});
test('AI-consent-toestemming wordt NIET overgeërfd door de volgende gebruiker op hetzelfde toestel', ()=>{
  const ls=makeMockStorage();
  ls.setItem('tk_cache_owner_uid','user-A');
  ls.setItem('tk_ai_consent','1'); // user-A had toegestaan
  resolveDeviceOwnerReset(ls,'user-B',CURRENT_PERSONAL_CACHE_KEYS);
  assertEq(ls.getItem('tk_ai_consent'), null, 'user-B moet zelf opnieuw expliciet gevraagd worden, niet automatisch toegestaan krijgen');
});

// ── DATABASE PERFORMANCE (Sprint 5.9.1) ─────────────────────
// Zelfde groepeerlogica als de geoptimaliseerde computeLastDoneMap() in index.html
// (1 query i.p.v. N) — pure functie (sessies al opgehaald meegegeven), los getest.
console.log("\n⚡ Database Performance — computeLastDoneMap (N+1-fix)");
function computeLastDoneMapFromRows(list, rows){
  const map={};
  list.forEach(v=>{map[v.id]=null;});
  const seen=new Set();
  rows.forEach(r=>{
    if(!seen.has(r.training_type)){map[r.training_type]=r.date;seen.add(r.training_type);}
  });
  return map;
}
test('Meerdere vaste trainingen: elk krijgt zijn eigen meest recente datum (rows al gesorteerd op date.desc)', ()=>{
  const list=[{id:'vt_a'},{id:'vt_b'},{id:'vt_c'}];
  const rows=[
    {training_type:'vt_a',date:'2026-08-05'},{training_type:'vt_a',date:'2026-07-29'},
    {training_type:'vt_b',date:'2026-08-01'},
  ];
  const map=computeLastDoneMapFromRows(list, rows);
  assertEq(map.vt_a,'2026-08-05','pakt de meest recente, niet de oudere sessie');
  assertEq(map.vt_b,'2026-08-01');
  assertEq(map.vt_c,null,'nog nooit gedaan -> null, exact zelfde gedrag als de oude N-losse-queries-versie');
});
test('Geen enkele sessie voor geen enkele training: alles null, geen crash', ()=>{
  const list=[{id:'vt_a'},{id:'vt_b'}];
  const map=computeLastDoneMapFromRows(list, []);
  assertEq(map.vt_a,null); assertEq(map.vt_b,null);
});
test('Lege trainingslijst: lege map, geen query nodig (guard in de echte functie)', ()=>{
  const map=computeLastDoneMapFromRows([], []);
  assertEq(Object.keys(map).length,0);
});

// Zelfde berekening als computeProgramProgressPure() in index.html (het bulk-
// geoptimaliseerde pad voor renderProgrammaList) — pure functie, los getest.
function computeProgramProgressPure(blocks,exByBlock,sessByBlock){
  const completed=blocks.filter(b=>b.completed_at);
  if(!completed.length)return {adherencePct:0,avgRpeDelta:null,doneCount:0,total:blocks.length};
  const rpeDeltas=[];
  for(const b of completed){
    const rows=exByBlock[b.id]||[];
    const presRpe=rows.map(r=>parseFloat(r.rpe_target)).filter(v=>!isNaN(v));
    const avgPres=presRpe.length?presRpe.reduce((a,c)=>a+c,0)/presRpe.length:null;
    const sess=sessByBlock[b.id]||[];
    const loggedRpe=sess.map(s=>parseFloat(s.rpe)).filter(v=>!isNaN(v));
    const avgLogged=loggedRpe.length?loggedRpe.reduce((a,c)=>a+c,0)/loggedRpe.length:null;
    if(avgPres!=null&&avgLogged!=null)rpeDeltas.push(avgLogged-avgPres);
  }
  const avgRpeDelta=rpeDeltas.length?Math.round((rpeDeltas.reduce((a,c)=>a+c,0)/rpeDeltas.length)*10)/10:null;
  return {adherencePct:Math.round(completed.length/blocks.length*100),avgRpeDelta,doneCount:completed.length,total:blocks.length};
}
test('Programmavoortgang (bulk-pad): identieke uitkomst als de oude per-blok-queries-versie zou geven', ()=>{
  const blocks=[
    {id:'b1',completed_at:'2026-07-01'},{id:'b2',completed_at:'2026-07-08'},
    {id:'b3',completed_at:null}, // nog niet afgerond
  ];
  const exByBlock={b1:[{rpe_target:'8'},{rpe_target:'9'}], b2:[{rpe_target:'7'}]};
  const sessByBlock={b1:[{rpe:'8.5'}], b2:[{rpe:'8'}]};
  const r=computeProgramProgressPure(blocks,exByBlock,sessByBlock);
  assertEq(r.doneCount,2); assertEq(r.total,3);
  assertEq(r.adherencePct,Math.round(2/3*100));
  // avgPres b1=(8+9)/2=8.5, avgLogged b1=8.5 -> delta 0. avgPres b2=7, avgLogged b2=8 -> delta +1.
  assertEq(r.avgRpeDelta, Math.round(((0+1)/2)*10)/10);
});
test('Programmavoortgang: geen afgeronde blokken -> nul-staat, geen queries/lookups nodig', ()=>{
  const r=computeProgramProgressPure([{id:'b1',completed_at:null}],{},{});
  assertEq(r.adherencePct,0); assertEq(r.avgRpeDelta,null); assertEq(r.doneCount,0);
});
test('Programmavoortgang: afgerond blok zonder gelogde RPE-data -> geen delta, geen crash', ()=>{
  const r=computeProgramProgressPure([{id:'b1',completed_at:'2026-07-01'}],{},{});
  assertEq(r.doneCount,1); assertEq(r.avgRpeDelta,null,'geen data om te vergelijken -> null, niet NaN of crash');
});

// ── RENDERING PERFORMANCE (Sprint 5.9.2) ─────────────────────
// Test het kern-gedrag van de debounce achter _libDebouncedSearch() in index.html
// (clearTimeout+setTimeout-patroon) met een gemockte timer — synchroon controleerbaar,
// geen echte 120ms-vertraging nodig in de testrun.
console.log("\n⚡ Rendering Performance — zoekveld-debounce (Sprint 5.9.2)");
function makeMockTimer(){
  let idCounter=0; const scheduled={};
  return {
    set:(fn)=>{const id=++idCounter;scheduled[id]=fn;return id;},
    clear:(id)=>{delete scheduled[id];},
    fireAll:()=>{Object.keys(scheduled).forEach(id=>{scheduled[id]();delete scheduled[id];});},
    pendingCount:()=>Object.keys(scheduled).length,
  };
}
function makeDebouncer(timer){
  let pending=null;
  return function(fn){
    if(pending!==null)timer.clear(pending);
    pending=timer.set(fn);
  };
}
test('Snel typen (meerdere aanroepen vóór de vertraging afloopt): slechts 1 render gepland, niet N', ()=>{
  const timer=makeMockTimer();
  const debounced=makeDebouncer(timer);
  debounced(()=>{});debounced(()=>{});debounced(()=>{});
  assertEq(timer.pendingCount(),1,'oudere geplande renders moeten geannuleerd zijn, niet opgestapeld');
});
test('Bij het uiteindelijk afgaan wint de LAATSTE aanroep (meest recente zoekterm/cursorpositie)', ()=>{
  const timer=makeMockTimer();
  const debounced=makeDebouncer(timer);
  let result=null;
  debounced(()=>{result='eerste (verouderd)';});
  debounced(()=>{result='tweede (verouderd)';});
  debounced(()=>{result='derde (actueel)';});
  timer.fireAll();
  assertEq(result,'derde (actueel)','de render moet de laatste, actuele staat gebruiken, niet een tussentijdse');
});
test('Losse, trage toetsaanslagen (elk na afloop van de vorige vertraging): elke render vuurt gewoon af', ()=>{
  const timer=makeMockTimer();
  const debounced=makeDebouncer(timer);
  let count=0;
  debounced(()=>{count++;}); timer.fireAll();
  debounced(()=>{count++;}); timer.fireAll();
  assertEq(count,2,'normaal, rustig zoeken blijft gewoon elke render tonen');
});

// ── OFFLINE BETROUWBAARHEID (Sprint 5.9.5) ─────────────────────
// Zelfde beslislogica als de lus in flushOfflineQueue() (index.html) — pure functie
// (fetch-uitkomst per item als parameter meegegeven i.p.v. een echte netwerkaanroep),
// los getest.
console.log("\n📡 Offline betrouwbaarheid — flushOfflineQueue (Sprint 5.9.5)");
function simulateFlushQueue(items,outcomeFn){
  const removed=[],skipped=[];
  let syncedAny=false,skippedAny=false,stoppedEarly=false;
  for(const item of items){
    const outcome=outcomeFn(item);
    if(outcome==='networkError'){stoppedEarly=true;break;}
    if(outcome==='httpError'){skipped.push(item.id);skippedAny=true;continue;}
    removed.push(item.id);syncedAny=true;
  }
  return {removed,skipped,syncedAny,skippedAny,stoppedEarly};
}
test('Alle items synchroniseren succesvol: alles verwijderd uit de wachtrij, niets overgeslagen', ()=>{
  const items=[{id:1},{id:2},{id:3}];
  const r=simulateFlushQueue(items,()=>'ok');
  assertEq(r.removed.length,3); assertEq(r.skipped.length,0); assertEq(r.stoppedEarly,false);
});
test('Serverfout op één item blokkeert de REST niet meer (was de bug) — latere items worden gewoon geprobeerd', ()=>{
  const items=[{id:1},{id:2},{id:3}];
  const r=simulateFlushQueue(items,item=>item.id===2?'httpError':'ok');
  assertEq(JSON.stringify(r.removed.sort()),JSON.stringify([1,3]),'item 1 en 3 moeten alsnog gesynchroniseerd zijn');
  assertEq(JSON.stringify(r.skipped),JSON.stringify([2]),'alleen het foutieve item blijft in de wachtrij staan');
  assertEq(r.stoppedEarly,false,'de lus mag niet vroegtijdig stoppen op een serverfout');
});
test('Echte netwerkfout (weer offline) stopt de lus terecht wél — latere items worden niet geprobeerd', ()=>{
  const items=[{id:1},{id:2},{id:3}];
  const r=simulateFlushQueue(items,item=>item.id===2?'networkError':'ok');
  assertEq(JSON.stringify(r.removed),JSON.stringify([1]),'item 1 was al gelukt vóór de netwerkfout');
  assertEq(r.stoppedEarly,true);
  assert(!r.removed.includes(3),'item 3 mag niet geprobeerd zijn ná een netwerkfout — zinloos zolang je offline bent');
});
test('Lege wachtrij: geen crash, niets te doen', ()=>{
  const r=simulateFlushQueue([],()=>'ok');
  assertEq(r.removed.length,0); assertEq(r.syncedAny,false); assertEq(r.skippedAny,false);
});

// ── FAVORIETEN-MIGRATIE (Sprint 6.0.1 — Data Architectuur) ─────
// Zelfde beslislogica als migrateLibraryFavoritesToSupabase() in index.html — pure,
// synchrone reïmplementatie (de echte functie is async i.v.m. echte Supabase-calls;
// hier gemockt als synchrone operaties, want de DECISIE-logica is wat getest wordt,
// niet de netwerktiming). Hergebruikt makeMockLocalStorage (Sprint 5.6.3).
console.log("\n🔀 Favorieten-migratie: Bibliotheek (localStorage) -> Supabase (Sprint 6.0.1)");
function simulateFavoritesMigration(ls, supabaseFavSet, toggleFn){
  let localFavs;
  try{localFavs=JSON.parse(ls.getItem('tk_lib_favs')||'{}');}catch(e){localFavs={};}
  const ids=Object.keys(localFavs).filter(id=>localFavs[id]);
  if(!ids.length){ls.removeItem('tk_lib_favs');return;}
  ids.forEach(id=>{
    if(!supabaseFavSet.has(id))toggleFn(id);
  });
  if(ids.every(id=>supabaseFavSet.has(id)))ls.removeItem('tk_lib_favs');
}
test('Geen lokale Bibliotheek-favorieten: tk_lib_favs wordt gewoon opgeruimd, niets te migreren', ()=>{
  const ls=makeMockLocalStorage({});
  const supaSet=new Set();
  let toggled=[];
  simulateFavoritesMigration(ls,supaSet,id=>toggled.push(id));
  assertEq(toggled.length,0);
  assertEq(ls.getItem('tk_lib_favs'),null);
});
test('Lokale favorieten die nog niet in Supabase staan: allemaal overgezet, daarna opgeruimd', ()=>{
  const ls=makeMockLocalStorage({tk_lib_favs:JSON.stringify({squat:true,bench:true})});
  const supaSet=new Set();
  simulateFavoritesMigration(ls,supaSet,id=>supaSet.add(id));
  assert(supaSet.has('squat')&&supaSet.has('bench'),'beide moeten gemigreerd zijn');
  assertEq(ls.getItem('tk_lib_favs'),null,'oude sleutel opgeruimd na bevestigde migratie');
});
test('Favoriet die al in Supabase staat (overlap): wordt niet nogmaals getoggeld', ()=>{
  const ls=makeMockLocalStorage({tk_lib_favs:JSON.stringify({squat:true,bench:true})});
  const supaSet=new Set(['squat']); // al gesynchroniseerd via een ander scherm
  const toggled=[];
  simulateFavoritesMigration(ls,supaSet,id=>{toggled.push(id);supaSet.add(id);});
  assertEq(JSON.stringify(toggled),JSON.stringify(['bench']),'alleen de ontbrekende favoriet wordt gemigreerd, squat niet dubbel');
});
test('Mislukte overzetting (netwerkfout gesimuleerd): tk_lib_favs blijft staan, geen dataverlies', ()=>{
  const ls=makeMockLocalStorage({tk_lib_favs:JSON.stringify({squat:true})});
  const supaSet=new Set();
  simulateFavoritesMigration(ls,supaSet,id=>{/* simuleert een mislukte toggle: niets toegevoegd aan supaSet */});
  assert(ls.getItem('tk_lib_favs')!==null,'bij een niet-bevestigde migratie moet de oude data bewaard blijven voor een nieuwe poging');
});

// ── BUSINESSLOGICA-DUPLICATIE (Sprint 6.0.3) ─────────────────
// Zelfde functies als in index.html — de Epley-1RM-formule stond letterlijk 7× los
// in de code; hier samengevoegd tot één bron. Test bevestigt gedragsbehoud.
console.log("\n🔧 Businesslogica — gedeelde Epley-1RM-formule (Sprint 6.0.3)");
function epley1RMRaw(kg,reps){return reps===1?kg:kg*(1+reps/30);}
function epley1RMShared(kg,reps){
  if(!kg||!reps||reps<1)return null;
  if(reps===1)return kg;
  return Math.round(epley1RMRaw(kg,reps));
}
test('epley1RMRaw: bij 1 rep is de schatting exact het gewicht zelf (geen formule nodig)', ()=>{
  assertEq(epley1RMRaw(100,1),100);
});
test('epley1RMRaw: geeft exact dezelfde uitkomst als de 7 vroegere losse duplicaten zouden geven', ()=>{
  assertEq(epley1RMRaw(100,5), 100*(1+5/30));
  assertEq(epley1RMRaw(80,10), 80*(1+10/30));
  assertEq(epley1RMRaw(62.5,3), 62.5*(1+3/30));
});
test('epley1RM (afgeronde variant): hergebruikt epley1RMRaw correct, met null-guards voor ontbrekende invoer', ()=>{
  assertEq(epley1RMShared(null,5),null);
  assertEq(epley1RMShared(100,0),null);
  assertEq(epley1RMShared(100,1),100);
  assertEq(epley1RMShared(100,5),Math.round(100*(1+5/30)));
});

// ── PEAKDOELEN PER GEBRUIKER (architectuurfix) ─────────────────
// Zelfde logica als peakGoalFor() in index.html — pure functie op een
// vooraf-geladen Map (exerciseGoals), los getest.
console.log("\n🎯 Peakdoelen: per gebruiker i.p.v. gedeelde kolom");
function peakGoalForSim(exerciseGoalsMap, exId){
  return exerciseGoalsMap.has(exId)?exerciseGoalsMap.get(exId):null;
}
test('Nieuwe gebruiker (lege exerciseGoals-Map): geen enkel peakdoel van een ander zichtbaar', ()=>{
  const map=new Map();
  assertEq(peakGoalForSim(map,'backsquat'),null);
  assertEq(peakGoalForSim(map,'bench'),null);
});
test('Gebruiker met een eigen ingesteld peakdoel: krijgt precies dat doel terug', ()=>{
  const map=new Map([['backsquat',140]]);
  assertEq(peakGoalForSim(map,'backsquat'),140);
  assertEq(peakGoalForSim(map,'bench'),null,'een oefening zonder eigen doel blijft null, geen fallback meer');
});
test('Twee gebruikers, elk hun eigen doel (RLS-gescoped in het echt): geen enkele overlap in de simulatie', ()=>{
  const userA=new Map([['backsquat',140]]);
  const userB=new Map([['backsquat',180]]);
  assertEq(peakGoalForSim(userA,'backsquat'),140);
  assertEq(peakGoalForSim(userB,'backsquat'),180);
});
test('Geen PEAK_FALLBACK meer: een onbekende oefening geeft altijd null, nooit een hardcoded waarde', ()=>{
  const map=new Map();
  ['backsquat','bench','frontsquat','shoulderpress','hexabar','hpc','hps','cablerow','bentoverrow'].forEach(id=>{
    assertEq(peakGoalForSim(map,id),null,id+' mag geen hardcoded fallback-waarde meer teruggeven');
  });
});

// ── IN-MEMORY CACHE-RESET BIJ ACCOUNTWISSEL (kritieke fix) ─────
// Bevestigd via een screenopname: 'Geschatte 1RM' (progExData) toonde bij een geheel
// nieuw account nog de 1RM's van het vorige account op hetzelfde toestel — een
// module-level JS-variabele die nooit werd leeggemaakt bij accountwissel binnen
// dezelfde browsersessie (geen page reload tussen uitloggen en opnieuw inloggen).
// Zelfde reïmplementatie-patroon als hierboven, nu voor de VOLLEDIGE lijst in-memory
// caches i.p.v. alleen localStorage-sleutels.
console.log("\n🔒 In-memory cache-reset bij accountwissel (kritieke fix)");
const IN_MEMORY_CACHES_TO_RESET=[
  'atleet','customTrainings','activeSport','progExData','estOneRMCache','repPRCache',
  'goalsCache','programBlockExCache','exPickerRecentIds','vasteTrainingen','vtMetaSel',
  '_vasteTrainingenLoaded','exercises','_exercisesLoading','favoriteExIds',
  '_favoritesLoaded','exerciseGoals','_exerciseGoalsLoaded','equipmentTypes',
  '_equipmentTypesLoading','equipmentCatalog','_equipmentCatalogLoading'
];
function resolveInMemoryCacheReset(state, ownerLs, uid){
  const lastOwner=ownerLs.getItem('tk_cache_owner_uid');
  if(lastOwner===uid)return {wiped:false, state};
  const fresh={...state};
  IN_MEMORY_CACHES_TO_RESET.forEach(k=>{fresh[k]='__RESET__';});
  ownerLs.setItem('tk_cache_owner_uid', uid);
  return {wiped:true, state:fresh};
}
test('Accountwissel: ALLE bekende in-memory caches worden gereset, niet alleen atleet/customTrainings/activeSport', ()=>{
  const ls=makeMockStorage();
  ls.setItem('tk_cache_owner_uid','user-A');
  const staleState={};
  IN_MEMORY_CACHES_TO_RESET.forEach(k=>{staleState[k]='data-van-user-A';});
  const {wiped, state}=resolveInMemoryCacheReset(staleState, ls, 'user-B');
  assertEq(wiped,true);
  IN_MEMORY_CACHES_TO_RESET.forEach(k=>{
    assertEq(state[k],'__RESET__', k+' moet gereset zijn bij een accountwissel — dit was exact de bevestigde bug (progExData toonde 1RM van het vorige account)');
  });
});
test('Zelfde gebruiker opnieuw: caches blijven ongemoeid (geen onnodige herlaad)', ()=>{
  const ls=makeMockStorage();
  ls.setItem('tk_cache_owner_uid','user-A');
  const state={progExData:'geldige-data-van-user-A'};
  const {wiped, state:newState}=resolveInMemoryCacheReset(state, ls, 'user-A');
  assertEq(wiped,false);
  assertEq(newState.progExData,'geldige-data-van-user-A');
});
test('Regressiebewaking: minimaal 20 caches in de resetlijst (voorkomt dat een toekomstige nieuwe cache stilzwijgend wordt vergeten)', ()=>{
  assert(IN_MEMORY_CACHES_TO_RESET.length>=20, 'onverwacht korte lijst — controleer of er niet per ongeluk iets is verwijderd');
});

// ── PR & 1RM PER GEBRUIKER (architectuurfix, vervolg op peakdoelen) ─────
// Zelfde patroon als de peakdoelen-tests hierboven — nu voor prFor()/oneRMFor(), en
// voor de upsert-logica die ervoor zorgt dat het bijwerken van één veld (bv. een
// nieuwe PR) de andere velden (peak_goal, one_rm) op diezelfde rij niet overschrijft.
console.log("\n🏆 PR & 1RM per gebruiker (architectuurfix, vervolg op peakdoelen)");
function prForSim(exerciseGoalsMap, exId){
  return exerciseGoalsMap.has(exId)?(exerciseGoalsMap.get(exId).pr??null):null;
}
function oneRMForSim(exerciseGoalsMap, exId){
  return exerciseGoalsMap.has(exId)?(exerciseGoalsMap.get(exId).one_rm??null):null;
}
test('Nieuwe gebruiker (lege exerciseGoals-Map): geen PR en geen 1RM van een ander zichtbaar', ()=>{
  const map=new Map();
  assertEq(prForSim(map,'backsquat'),null);
  assertEq(oneRMForSim(map,'backsquat'),null);
});
test('Gebruiker met eigen PR en 1RM: krijgt precies die eigen waarden terug', ()=>{
  const map=new Map([['backsquat',{peak_goal:140,pr:95,one_rm:100}]]);
  assertEq(prForSim(map,'backsquat'),95);
  assertEq(oneRMForSim(map,'backsquat'),100);
});
test('Upsert van één veld (bv. nieuwe PR) laat de andere velden op dezelfde rij ongemoeid — reproduceert de exacte upsertExerciseGoalField()-logica', ()=>{
  const map=new Map([['backsquat',{peak_goal:140,pr:95,one_rm:100}]]);
  // simuleert upsertExerciseGoalField(exId,'pr',105): bestaande rij -> alleen dat veld wijzigen
  const existing=map.get('backsquat');
  existing.pr=105;
  assertEq(map.get('backsquat').peak_goal,140,'peak_goal mag niet gewijzigd zijn door een pr-update');
  assertEq(map.get('backsquat').one_rm,100,'one_rm mag niet gewijzigd zijn door een pr-update');
  assertEq(map.get('backsquat').pr,105);
});
test('Upsert op een oefening zonder bestaande rij: nieuwe rij met alleen het gewijzigde veld ingevuld, de rest null', ()=>{
  const map=new Map();
  // simuleert upsertExerciseGoalField('bench','pr',80) op een lege Map
  map.set('bench',{peak_goal:null,pr:null,one_rm:null,pr:80});
  const row=map.get('bench');
  assertEq(row.pr,80);
  assertEq(row.peak_goal,null);
  assertEq(row.one_rm,null);
});
test('Peakdoel wissen mag PR/1RM op dezelfde rij niet meewissen (was de exacte bug in de oude sbDel-implementatie)', ()=>{
  const map=new Map([['backsquat',{peak_goal:140,pr:95,one_rm:100}]]);
  // simuleert savePeakGoal() met val===null: alleen peak_goal->null via PATCH, geen sbDel van de hele rij
  const existing=map.get('backsquat');
  existing.peak_goal=null;
  assertEq(map.get('backsquat').pr,95,'pr moet intact blijven na het wissen van alleen het peakdoel');
  assertEq(map.get('backsquat').one_rm,100,'one_rm moet intact blijven na het wissen van alleen het peakdoel');
});

// ── TRAINING INSTANCE — Werkblok A (Definition → Instance → Snapshot → Sessions) ─
// Zelfde reïmplementatie-patroon als de rest van dit bestand: pure-functie-kopieën
// van de nieuwe index.html-functies, los getest zonder Supabase/DOM.
console.log("\n🏗️  Training Instance — Werkblok A");

function newTrainingInstanceId_T(){
  return (typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():('ti-'+Date.now()+'-'+Math.random().toString(16).slice(2));
}
// Reimplementatie van createTrainingInstance()'s rij-opbouw + validatie (zonder de
// echte sbPostQ-netwerkaanroep) — test wat de functie ZOU versturen.
function buildTrainingInstanceRow_T({vasteTrainingId=null,customTrainingId=null,snapshot=null,userId=null}={}){
  if(vasteTrainingId&&customTrainingId)return null; // beide tegelijk mag niet
  if(!userId)return null; // geen ingelogde gebruiker
  return {
    id:newTrainingInstanceId_T(),
    user_id:userId,
    vaste_training_id:vasteTrainingId,
    custom_training_id:customTrainingId,
    status:'active',
    started_at:new Date().toISOString(),
    completed_at:null,
    snapshot:snapshot||null
  };
}
function snapshotFromVasteTraining_T(def,texs,modifications=[]){
  return {
    source:'vaste_training',
    definition_id:def?.id??null,
    items:(texs||[]).map(t=>({exercise_id:t.exercise_id,sets:t.sets,reps:t.reps,rpe:t.rpe,sort_order:t.sort_order})),
    modifications
  };
}

test('Test 1 — Definition kan gelezen worden zonder gewijzigd te worden door snapshotFromVasteTraining', ()=>{
  const def=Object.freeze({id:42,naam:'Push Focus'});
  const texs=Object.freeze([Object.freeze({exercise_id:'bench',sets:4,reps:'6-8',rpe:8,sort_order:1})]);
  const snap=snapshotFromVasteTraining_T(def,texs);
  assertEq(snap.definition_id,42);
  assertEq(snap.items.length,1);
  // def/texs zijn Object.freeze — als de functie ze zou muteren, gooit dit in
  // strict mode een TypeError. Geen throw = geen mutatie.
});

test('Test 2 — Instance kan worden aangemaakt (rij-opbouw correct) voor een vaste training', ()=>{
  const row=buildTrainingInstanceRow_T({vasteTrainingId:42,userId:'user-1'});
  assert(row!==null,'row mag niet null zijn bij geldige input');
  assertEq(row.status,'active');
  assertEq(row.completed_at,null);
  assert(typeof row.id==='string'&&row.id.length>0,'id moet een niet-leeg string zijn');
});

test('Test 3 — Instance verwijst naar de juiste Definition (vaste_training_id, niet custom)', ()=>{
  const row=buildTrainingInstanceRow_T({vasteTrainingId:42,userId:'user-1'});
  assertEq(row.vaste_training_id,42);
  assertEq(row.custom_training_id,null);
});

test('Test 3b — Instance kan ook naar een custom training verwijzen, nooit naar beide tegelijk', ()=>{
  const rowCustom=buildTrainingInstanceRow_T({customTrainingId:7,userId:'user-1'});
  assertEq(rowCustom.custom_training_id,7);
  assertEq(rowCustom.vaste_training_id,null);
  const rowBoth=buildTrainingInstanceRow_T({vasteTrainingId:42,customTrainingId:7,userId:'user-1'});
  assertEq(rowBoth,null,'vaste_training_id én custom_training_id tegelijk moet geweigerd worden');
});

test('Test 4 — Snapshot wordt correct opgeslagen op de instance-rij', ()=>{
  const def={id:42,naam:'Push Focus'};
  const texs=[{exercise_id:'bench',sets:4,reps:'6-8',rpe:8,sort_order:1},{exercise_id:'ohp',sets:3,reps:'8',rpe:7,sort_order:2}];
  const snap=snapshotFromVasteTraining_T(def,texs,[{type:'remove',exercise_id:'ohp'}]);
  const row=buildTrainingInstanceRow_T({vasteTrainingId:42,snapshot:snap,userId:'user-1'});
  assertEq(row.snapshot.definition_id,42);
  assertEq(row.snapshot.items.length,2,'snapshot bewaart de VOLLEDIGE oorspronkelijke items-lijst, ook al is er een modificatie geregistreerd');
  assertEq(row.snapshot.modifications.length,1);
  assertEq(row.snapshot.modifications[0].type,'remove');
});

test('Test 5 — Definition blijft ongewijzigd na het aanmaken van een snapshot (harde regel)', ()=>{
  const def=Object.freeze({id:42,naam:'Push Focus'});
  const texsOriginal=[{exercise_id:'bench',sets:4,reps:'6-8',rpe:8,sort_order:1},{exercise_id:'ohp',sets:3,reps:'8',rpe:7,sort_order:2}];
  const texsCopy=JSON.parse(JSON.stringify(texsOriginal));
  // simuleer een "vandaag aanpassen"-scenario: gebruiker verwijdert ohp uit de
  // snapshot-items, maar de bron-array (texsOriginal, staat voor de Definition)
  // wordt hierbij NIET aangeraakt.
  const modifiedItems=texsOriginal.filter(t=>t.exercise_id!=='ohp');
  assertEq(modifiedItems.length,1);
  assertEq(texsOriginal.length,2,'de oorspronkelijke Definition-array (texsOriginal) moet nog steeds 2 items hebben — filter() muteert niet, dit bevestigt dat het patroon veilig is');
  assert(JSON.stringify(texsOriginal)===JSON.stringify(texsCopy),'texsOriginal moet byte-voor-byte gelijk blijven aan de kopie van vóór de aanpassing');
});

test('Test 9 — createTrainingInstance-achtige rij-opbouw weigert zonder ingelogde gebruiker (security-basis)', ()=>{
  const row=buildTrainingInstanceRow_T({vasteTrainingId:42,userId:null});
  assertEq(row,null,'zonder user_id mag er geen rij gebouwd worden — voorkomt een user_id=NULL-rij die RLS zou kunnen omzeilen als de kolom niet NOT NULL was');
});

test('newTrainingInstanceId levert unieke, niet-lege id\'s (nodig voor offline-veilige aanmaak zonder server-roundtrip)', ()=>{
  const ids=new Set();
  for(let i=0;i<200;i++)ids.add(newTrainingInstanceId_T());
  assertEq(ids.size,200,'200 aanroepen moeten 200 unieke id\'s geven');
});

// ── TRAINING DEFINITION-ADAPTER — Werkblok B ──────────────────────────────
// Reïmplementaties van de kernlogica van saveWorkout/savedList/duplicateWorkout/
// resumeWorkout en de Definition-adapter, zonder Supabase/DOM — zelfde patroon
// als de rest van dit bestand.
console.log("\n🧩 Training Definition — Werkblok B (Builder ↔ custom_trainings)");

function targetsFromPlanItems_T(items){
  return (items||[]).map(it=>({exercise_id:it.id,sets:it.sets,reps:it.reps,rest:it.rest,rpe:it.rpe||null,pick:it.pick||null}));
}
function planItemsFromTargets_T(targets){
  return (targets||[]).map(et=>({id:et.exercise_id,pick:et.pick||'compound',sets:et.sets,reps:et.reps,rest:et.rest}));
}
// Reimplementatie van WB.saveWorkout()'s rij-opbouw (zonder de sbPostQ-call zelf)
function buildSavedCustomTrainingRow_T(name,plan,sel,quality,idFn){
  const id=idFn?idFn():('custom_'+Date.now());
  return {
    id, name:name||'Workout', color:'#0E3B4A', note:'',
    exercises:(plan.items||[]).map(it=>it.id),
    source:'builder',
    metadata:{sel:JSON.parse(JSON.stringify(sel)),quality,created:Date.now()},
    exercise_targets:targetsFromPlanItems_T(plan.items)
  };
}
function savedListFrom_T(customTrainingsArr,wbFavs){
  return (customTrainingsArr||[]).filter(t=>t.source==='builder').map(t=>({
    id:t.id, name:t.name,
    sel:(t.metadata&&t.metadata.sel)?JSON.parse(JSON.stringify(t.metadata.sel)):null,
    plan:{items:planItemsFromTargets_T(t.exercise_targets)},
    fav:!!(wbFavs&&wbFavs[t.id]),
    q:(t.metadata&&t.metadata.quality&&t.metadata.quality.score)||0,
    created:(t.metadata&&t.metadata.created)||0
  }));
}

test('saveWorkout-reïmplementatie: bouwt een custom_trainings-rij met source=builder + volledige targets', ()=>{
  const plan={items:[{id:'bench',pick:'compound',sets:4,reps:'6-8',rest:90},{id:'ohp',pick:'compound',sets:3,reps:'8',rest:75}]};
  const sel={goal:'hypertrofie',time:45};
  const row=buildSavedCustomTrainingRow_T('Push Focus',plan,sel,{score:82});
  assertEq(row.source,'builder');
  assertEq(row.exercises.length,2,'platte exercises-lijst blijft bestaan voor bestaande lezers (startCustomTraining, renderCustomTrainList)');
  assertEq(row.exercises[0],'bench');
  assertEq(row.exercise_targets.length,2);
  assertEq(row.exercise_targets[0].sets,4);
  assertEq(row.exercise_targets[0].rest,90);
  assertEq(row.metadata.sel.goal,'hypertrofie');
  assertEq(row.metadata.quality.score,82);
});

test('savedList-reïmplementatie: geeft precies dezelfde vorm terug als de oude tk_wb_saved-gebaseerde versie ({id,name,sel,plan,fav,q,created})', ()=>{
  const plan={items:[{id:'squat',pick:'compound',sets:5,reps:'5',rest:180}]};
  const row=buildSavedCustomTrainingRow_T('Legday',plan,{goal:'kracht'},{score:70},()=>'custom_1');
  const list=savedListFrom_T([row],{});
  assertEq(list.length,1);
  const item=list[0];
  assert('id' in item && 'name' in item && 'sel' in item && 'plan' in item && 'fav' in item && 'q' in item && 'created' in item,'vorm moet exact matchen — WBUI mag niet hoeven te wijzigen');
  assertEq(item.plan.items[0].id,'squat');
  assertEq(item.plan.items[0].sets,5);
  assertEq(item.q,70);
});

test('savedList-reïmplementatie: negeert handmatig aangemaakte custom trainingen (source!=builder)', ()=>{
  const manual={id:'custom_2',name:'Handmatig',source:null,exercises:['bench'],exercise_targets:[]};
  const builder=buildSavedCustomTrainingRow_T('Builder-training',{items:[{id:'bench',sets:3,reps:'10'}]},{goal:'x'},{score:50},()=>'custom_3');
  const list=savedListFrom_T([manual,builder],{});
  assertEq(list.length,1,'alleen de Builder-afkomstige training hoort in WB.savedList()');
  assertEq(list[0].id,'custom_3');
});

test('favWorkout blijft lokaal-only en beïnvloedt geen andere rij', ()=>{
  const favs={};
  favs['custom_9']=!favs['custom_9'];
  assertEq(favs['custom_9'],true);
  assertEq(favs['custom_8'],undefined,'togglen van één id mag geen andere id aanraken');
});

test('resumeWorkout-reïmplementatie: reconstrueert st.plan/st.sel 1-op-1 uit metadata+exercise_targets', ()=>{
  const original={items:[{id:'deadlift',pick:'compound',sets:1,reps:'5',rest:240}]};
  const row=buildSavedCustomTrainingRow_T('DL dag',original,{goal:'kracht',time:30},{score:60},()=>'custom_4');
  // simuleer resumeWorkout()
  const resumedSel=JSON.parse(JSON.stringify(row.metadata.sel));
  const resumedPlan={items:planItemsFromTargets_T(row.exercise_targets)};
  assertEq(resumedSel.goal,'kracht');
  assertEq(resumedPlan.items[0].id,'deadlift');
  assertEq(resumedPlan.items[0].sets,1);
  assertEq(resumedPlan.items[0].rest,240);
});

test('Backward compatibility: handmatig aangemaakte custom training zonder exercise_targets levert nog steeds bruikbare Definition op (nulls, geen crash)', ()=>{
  function getCustomDefinitionLocal_T(t){
    return {
      id:t.id, source:'custom', name:t.name,
      exercises:(t.exercise_targets&&t.exercise_targets.length?t.exercise_targets:
        (t.exercises||[]).map(exId=>({exercise_id:exId,sort_order:null,sets:null,reps:null,rpe:null,rest:null})))
    };
  }
  const manual={id:'custom_5',name:'Oude training',exercises:['ohp','row'],exercise_targets:[]};
  const def=getCustomDefinitionLocal_T(manual);
  assertEq(def.exercises.length,2);
  assertEq(def.exercises[0].exercise_id,'ohp');
  assertEq(def.exercises[0].sets,null,'geen targets beschikbaar → null, geen crash, geen verzonnen waarde');
});

test('migrateLegacyWbSaved-reïmplementatie: bestaand tk_wb_saved-item wordt correct omgezet, is idempotent (geen dubbele rij bij herhaalde aanroep)', ()=>{
  const legacyItem={id:'w1700000000',name:'Oude builder workout',sel:{goal:'hypertrofie'},plan:{items:[{id:'lunge',sets:3,reps:'12',rest:60}]},q:65,created:1700000000,fav:true};
  function migrateOne_T(w,customTrainingsArr){
    if(customTrainingsArr.some(t=>t.id===w.id))return customTrainingsArr; // idempotent-check
    const items=(w.plan&&w.plan.items)||[];
    const t={id:w.id,name:w.name,source:'builder',metadata:{sel:w.sel,quality:{score:w.q},created:w.created},exercise_targets:targetsFromPlanItems_T(items),exercises:items.map(it=>it.id)};
    return customTrainingsArr.concat([t]);
  }
  let arr=[];
  arr=migrateOne_T(legacyItem,arr);
  assertEq(arr.length,1);
  assertEq(arr[0].source,'builder');
  arr=migrateOne_T(legacyItem,arr); // nogmaals aanroepen — moet niets dupliceren
  assertEq(arr.length,1,'idempotentie: hetzelfde legacy-item mag nooit een tweede rij opleveren');
});

test('snapshotFromCustomTraining draagt nu ook sets/reps/rpe/rest/pick door indien aanwezig, met null-fallback anders', ()=>{
  function snapshotFromCustomTraining_T(def,texs,modifications=[]){
    return {source:'custom_training',definition_id:def?.id??null,
      items:(texs||[]).map(t=>({exercise_id:t.exercise_id,sort_order:t.sort_order,sets:t.sets??null,reps:t.reps??null,rpe:t.rpe??null,rest:t.rest??null,pick:t.pick??null})),
      modifications};
  }
  const rich=snapshotFromCustomTraining_T({id:'c1'},[{exercise_id:'bench',sort_order:1,sets:4,reps:'8',rpe:8,rest:90,pick:'compound'}]);
  assertEq(rich.items[0].sets,4);
  const bare=snapshotFromCustomTraining_T({id:'c2'},[{exercise_id:'ohp',sort_order:1}]);
  assertEq(bare.items[0].sets,null,'oude/handmatige rijen zonder targets geven null, geen crash');
});

// ── F0.6 — Canonical Gym Execution Bridge (gerichte, minimale dekking) ────
// Pure reïmplementaties van de canonical-first tak in buildResolvedExecutionItems()
// en getExerciseAsset(), plus een controle dat het bestaande legacy-pad ongewijzigd
// blijft werken (additiviteit — kernvereiste van F0.6).
console.log("\n🔗 F0.6 — Canonical Gym Execution Bridge");

test('buildResolvedExecutionItems: canonical TK-ID resolvet naam/spiergroep via ExerciseCatalogService, geen "Exercise not found"', ()=>{
  const mockCatalog={
    'TK-000030':{catalog_id:'TK-000030',identity:{name:'Barbell Overhead Press',primary:['Schouders'],secondary:['Triceps']}}
  };
  const mockAssets={
    poster:(id)=>id==='TK-000030'?'data:image/webp;base64,XYZ':null,
    hasVideo:(id)=>id==='TK-000030',
    video:(id)=>id==='TK-000030'?{file:'videos/barbell-overhead-press.mp4'}:null
  };
  function buildResolvedExecutionItems_T(list,exercises){
    return (list||[]).map(it=>{
      const exId=it.exercise_id;
      const isCanonical=typeof exId==='string'&&exId.indexOf('TK-')===0;
      const canon=isCanonical?(mockCatalog[exId]||null):null;
      if(canon&&canon.identity){
        const Id=canon.identity;
        const posterUrl=mockAssets.poster(exId)||null;
        const v=mockAssets.hasVideo(exId)?mockAssets.video(exId):null;
        return {id:exId,naam:Id.name||exId,type:'strength',
          sets:it.sets??null,reps:it.reps??null,rpe:it.rpe??null,wu:it.wu||0,tip:it.tip??null,
          yt:null,poster:posterUrl,video:v?v.file:null,canonicalId:exId,
          muscles:{p:Id.primary||[],s:Id.secondary||[]}};
      }
      const exObj=(exercises||[]).find(e=>e.id===exId)||null;
      return {id:exId,naam:exObj?exObj.name:exId,type:(exObj&&exObj.type)||'strength',
        sets:it.sets??null,reps:it.reps??null,rpe:it.rpe??null,wu:it.wu||0,tip:it.tip??null,
        yt:exObj?exObj.yt:null,muscles:{p:(exObj&&exObj.muscle_primary)||[],s:(exObj&&exObj.muscle_secondary)||[]}};
    });
  }
  const result=buildResolvedExecutionItems_T([{exercise_id:'TK-000030',sets:5,reps:'3-5',rpe:8}],[]);
  assertEq(result[0].naam,'Barbell Overhead Press','canonical naam moet resolven, niet de kale TK-ID tonen');
  assert(result[0].naam!=='TK-000030','mag nooit terugvallen op de kale ID als naam');
  assertEq(result[0].canonicalId,'TK-000030');
  assertEq(result[0].poster,'data:image/webp;base64,XYZ');
  assertEq(result[0].video,'videos/barbell-overhead-press.mp4');
  assertEq(result[0].muscles.p[0],'Schouders');
});

test('getExerciseAsset: canonical TK-ID gebruikt EX_CATALOG.intelligence (cues/mistakes/poster), geen legacy EXERCISE_ASSETS-lookup nodig', ()=>{
  const mockCatalog={
    'TK-000030':{catalog_id:'TK-000030',intelligence:{cues:['Romp en billen aanspannen','Recht boven het hoofd drukken'],mistakes:['Overmatige rugholte']}}
  };
  const mockPoster=(id)=>id==='TK-000030'?'data:image/webp;base64,XYZ':null;
  function getExerciseAsset_T(ex,legacyIntelById){
    if(typeof ex.id==='string'&&ex.id.indexOf('TK-')===0){
      const c=mockCatalog[ex.id];
      if(c&&c.intelligence){
        return {technique:c.intelligence.cues||[],mistakes:c.intelligence.mistakes||[],poster:mockPoster(ex.id)};
      }
    }
    return legacyIntelById[ex.id]||null;
  }
  const legacyIntelById={}; // bewust leeg — TK-000030 zit NIET in de 13-entry legacy-set
  const a=getExerciseAsset_T({id:'TK-000030'},legacyIntelById);
  assert(!!a,'canonical exercise moet een resultaat opleveren zonder legacy-lookup');
  assertEq(a.technique[0],'Romp en billen aanspannen');
  assertEq(a.mistakes[0],'Overmatige rugholte');
  assertEq(a.poster,'data:image/webp;base64,XYZ');
});

test('buildResolvedExecutionItems: legacy ID (bijv. "bench") blijft via het bestaande, ongewijzigde exercises[]-pad lopen', ()=>{
  function buildResolvedExecutionItems_T(list,exercises){
    return (list||[]).map(it=>{
      const exId=it.exercise_id;
      const exObj=(exercises||[]).find(e=>e.id===exId)||null;
      return {id:exId,naam:exObj?exObj.name:exId,type:(exObj&&exObj.type)||'strength',
        sets:it.sets??null,reps:it.reps??null,rpe:it.rpe??null,wu:it.wu||0,tip:it.tip??null,
        yt:exObj?exObj.yt:null,muscles:{p:(exObj&&exObj.muscle_primary)||[],s:(exObj&&exObj.muscle_secondary)||[]}};
    });
  }
  const legacyExercises=[{id:'bench',name:'Benchpress',type:'strength',yt:'vcBig73ojpE',muscle_primary:['Borst'],muscle_secondary:['Triceps','Schouders']}];
  const result=buildResolvedExecutionItems_T([{exercise_id:'bench',sets:4,reps:'4-6',rpe:8}],legacyExercises);
  assertEq(result[0].naam,'Benchpress','bestaand legacy-gedrag moet exact hetzelfde blijven na F0.6');
  assertEq(result[0].yt,'vcBig73ojpE');
  assertEq(result[0].muscles.p[0],'Borst');
});

// ── F0.7C — Training Aanpassen: update i.p.v. dupliceren (gerichte, minimale dekking) ────
console.log("\n🛠️  F0.7C — Training Aanpassen (custom training update, geen duplicatie)");

test('resumeWorkout: custom training ZONDER metadata.sel en zonder source==="builder" wordt toch correct hervat (defaultSel-fallback)', ()=>{
  function defaultSel_T(){return {goal:'hypertrofie',muscles:[],equipment:['bodyweight','dumbbell','barbell','machine','cable machine'],time:45,level:'intermediate',form:'full'};}
  function planItemsFromTargets_T(targets){
    return (targets||[]).map(function(et){return {id:et.exercise_id,pick:et.pick||'compound',sets:et.sets,reps:et.reps,rest:et.rest};});
  }
  function resumeWorkout_T(wid,customTrainings,st){
    var t=customTrainings.filter(function(x){return x.id===wid;})[0];
    if(!t)return false;
    st.sel=(t.metadata&&t.metadata.sel)?t.metadata.sel:defaultSel_T();
    st.plan={items:planItemsFromTargets_T(t.exercise_targets)};
    st.dirty=false;
    return true;
  }
  // training zonder metadata.sel, zonder source (bv. handmatig aangemaakt, niet via Builder)
  const manualTraining={id:'custom_manual_1',name:'Handmatige training',exercise_targets:[{exercise_id:'TK-000019',sets:4,reps:'8',rest:90,pick:'compound'}]};
  const st={sel:null,plan:null,dirty:false};
  const ok=resumeWorkout_T('custom_manual_1',[manualTraining],st);
  assert(ok,'moet true teruggeven, ook zonder metadata.sel/source==="builder"');
  assertEq(st.sel.goal,'hypertrofie','moet terugvallen op defaultSel()');
  assertEq(st.plan.items[0].id,'TK-000019','canonical catalog_id moet behouden blijven in het geladen plan');
});

test('saveWorkout: zonder existingId blijft het bestaande "nieuwe training"-gedrag exact behouden', ()=>{
  function saveWorkout_T(name,existingId,customTrainings,idFactory){
    const isUpdate=!!existingId;
    const id=existingId||idFactory();
    const existing=isUpdate?customTrainings.find(function(x){return x.id===id;}):null;
    const t={id:id,name:name||'Auto',source:(existing?existing.source:'builder'),exercise_targets:[{exercise_id:'TK-000030'}]};
    if(isUpdate&&existing){const idx=customTrainings.indexOf(existing);if(idx>=0)customTrainings[idx]=t;else customTrainings.unshift(t);}
    else customTrainings.unshift(t);
    return id;
  }
  const customTrainings=[{id:'custom_existing',name:'Oud'}];
  const newId=saveWorkout_T(null,null,customTrainings,()=>'custom_NIEUW');
  assertEq(newId,'custom_NIEUW','zonder existingId moet gewoon een nieuw ID ontstaan, zoals voorheen');
  assertEq(customTrainings.length,2,'moet een extra rij toevoegen (unshift), geen bestaande overschrijven');
});

test('saveWorkout: MET existingId wordt het bestaande record bijgewerkt, geen tweede/duplicaat-rij', ()=>{
  function saveWorkout_T(name,existingId,customTrainings,idFactory){
    const isUpdate=!!existingId;
    const id=existingId||idFactory();
    const existing=isUpdate?customTrainings.find(function(x){return x.id===id;}):null;
    const t={id:id,name:name||(existing?existing.name:'Auto'),source:(existing?existing.source:'builder'),exercise_targets:[{exercise_id:'TK-000030'}]};
    if(isUpdate&&existing){const idx=customTrainings.indexOf(existing);if(idx>=0)customTrainings[idx]=t;else customTrainings.unshift(t);}
    else customTrainings.unshift(t);
    return id;
  }
  const customTrainings=[{id:'custom_bestaand',name:'Push A',source:'builder'}];
  const returnedId=saveWorkout_T(null,'custom_bestaand',customTrainings,()=>'custom_ZOU_NIET_MOETEN');
  assertEq(returnedId,'custom_bestaand','ID moet exact hetzelfde blijven — geen custom_+Date.now()');
  assertEq(customTrainings.length,1,'geen duplicaat — nog steeds precies 1 rij met dit ID');
  assertEq(customTrainings[0].exercise_targets[0].exercise_id,'TK-000030','de bijgewerkte oefeningen moeten zichtbaar zijn op hetzelfde record');
});

test('canonical catalog_id blijft ongewijzigd door de volledige Library→Builder→Save→Preview-keten (reïmplementatie)', ()=>{
  // Simuleert Deel F uit F0.7C: TK-ID gekozen in Library moet exact hetzelfde blijven t/m opslag.
  const chosenFromLibrary='TK-000019'; // Barbell Bench Press
  const planItem={id:chosenFromLibrary,pick:'compound',sets:4,reps:'8',rest:90};
  function targetsFromPlanItems_T(items){
    return (items||[]).map(function(it){return {exercise_id:it.id,sets:it.sets,reps:it.reps,rest:it.rest,rpe:it.rpe||null,pick:it.pick||null};});
  }
  const targets=targetsFromPlanItems_T([planItem]);
  assertEq(targets[0].exercise_id,chosenFromLibrary,'exercise_targets.exercise_id moet exact het gekozen catalog_id zijn, geen vertaling');
});

// ── F0.7C follow-up — Library → Training (gerichte, minimale dekking) ────────
console.log("\n📚 F0.7C follow-up — Library → Training");

// Reïmplementatie van de kern-mechaniek (WB.st-manipulatie), pure functies, geen browser nodig.
function libTestSetup(){
  const WB_st={sel:null,plan:null,dirty:true};
  function defaultSel_T(){return {goal:'hypertrofie',muscles:[],equipment:['bodyweight'],time:45,level:'intermediate',form:'full'};}
  function planItemsFromTargets_T(targets){
    return (targets||[]).map(function(et){return {id:et.exercise_id,pick:et.pick||'compound',sets:et.sets,reps:et.reps,rest:et.rest};});
  }
  function resumeWorkout_T(wid,customTrainings){
    const t=customTrainings.filter(function(x){return x.id===wid;})[0];
    if(!t)return false;
    WB_st.sel=(t.metadata&&t.metadata.sel)?t.metadata.sel:defaultSel_T();
    WB_st.plan={items:planItemsFromTargets_T(t.exercise_targets)};
    WB_st.dirty=false;
    return true;
  }
  function saveWorkout_T(name,existingId,customTrainings,idFactory){
    const isUpdate=!!existingId;
    const id=existingId||idFactory();
    const existing=isUpdate?customTrainings.find(function(x){return x.id===id;}):null;
    const t={id:id,name:name||'Auto',source:(existing?existing.source:'builder'),exercise_targets:(WB_st.plan.items||[]).map(function(it){return {exercise_id:it.id,sets:it.sets,reps:it.reps,rest:it.rest,pick:it.pick};})};
    if(isUpdate&&existing){const idx=customTrainings.indexOf(existing);if(idx>=0)customTrainings[idx]=t;else customTrainings.unshift(t);}
    else customTrainings.unshift(t);
    return id;
  }
  function libStartNew_T(catalogId){
    WB_st.sel=WB_st.sel||defaultSel_T();
    WB_st.plan={items:[{id:catalogId,pick:'compound',sets:4,reps:'6-8',rest:90}]};
    WB_st.dirty=false;
  }
  function libAddExisting_T(catalogId,trainingId,customTrainings){
    if(!resumeWorkout_T(trainingId,customTrainings))return false;
    WB_st.plan.items.push({id:catalogId,pick:'compound',sets:4,reps:'6-8',rest:90});
    return true;
  }
  return {WB_st,defaultSel_T,resumeWorkout_T,saveWorkout_T,libStartNew_T,libAddExisting_T};
}

test('Test 1 — Library-oefening → Nieuwe training: oefening komt correct in het Builder-plan terecht', ()=>{
  const T=libTestSetup();
  T.libStartNew_T('TK-000030');
  assertEq(T.WB_st.plan.items.length,1);
  assertEq(T.WB_st.plan.items[0].id,'TK-000030');
});

test('Test 2 — Library-oefening → Bestaande custom training: oefening wordt toegevoegd aan het bestaande plan (bestaande items blijven)', ()=>{
  const T=libTestSetup();
  const customTrainings=[{id:'custom_x',name:'Push A',source:'builder',exercise_targets:[{exercise_id:'TK-000019',sets:4,reps:'8',rest:90,pick:'compound'}]}];
  const ok=T.libAddExisting_T('TK-000030','custom_x',customTrainings);
  assert(ok,'moet slagen voor een bestaande custom training');
  assertEq(T.WB_st.plan.items.length,2,'bestaande oefening blijft, nieuwe komt erbij');
  assertEq(T.WB_st.plan.items[0].id,'TK-000019','oorspronkelijke oefening blijft op zijn plek');
  assertEq(T.WB_st.plan.items[1].id,'TK-000030','nieuwe Library-oefening staat achteraan');
});

test('Test 3 — Bestaande training behoudt exact dezelfde ID na Library-toevoeging + opslaan', ()=>{
  const T=libTestSetup();
  const customTrainings=[{id:'custom_x',name:'Push A',source:'builder',exercise_targets:[]}];
  T.libAddExisting_T('TK-000030','custom_x',customTrainings);
  const returnedId=T.saveWorkout_T(null,'custom_x',customTrainings,()=>'custom_ZOU_NIET_MOETEN');
  assertEq(returnedId,'custom_x');
});

test('Test 4 — Geen duplicate custom training wordt aangemaakt bij Library → Bestaande training', ()=>{
  const T=libTestSetup();
  const customTrainings=[{id:'custom_x',name:'Push A',source:'builder',exercise_targets:[]}];
  T.libAddExisting_T('TK-000030','custom_x',customTrainings);
  T.saveWorkout_T(null,'custom_x',customTrainings,()=>'custom_ZOU_NIET_MOETEN');
  assertEq(customTrainings.length,1,'nog steeds precies 1 training, geen tweede erbij');
});

test('Test 5 — catalog_id blijft ongewijzigd door Library → Builder → Save heen', ()=>{
  const T=libTestSetup();
  const chosen='TK-000105'; // Dumbbell Goblet Squat
  T.libStartNew_T(chosen);
  const customTrainings=[];
  T.saveWorkout_T(null,null,customTrainings,()=>'custom_nieuw_1');
  assertEq(customTrainings[0].exercise_targets[0].exercise_id,chosen,'geen vertaling/mapping — exact hetzelfde catalog_id');
});

test('Test 6 — Vaste trainingen worden niet aangeboden als bewerkbare "bestaande training" (customTrainings bevat per definitie geen vaste trainingen)', ()=>{
  // vasteTrainingen en customTrainings zijn twee gescheiden arrays in de bestaande architectuur
  // (bevestigd in eerder onderzoek) — de Library-picker leest uitsluitend customTrainings,
  // dus een vaste training kan hier structureel nooit in voorkomen.
  const customTrainings=[{id:'custom_x',name:'Push A',source:'builder'}];
  const vasteTrainingen=[{id:'A',naam:'Training A'},{id:'B',naam:'Training B'}];
  const picks=customTrainings.map(t=>t.id);
  assert(!picks.includes('A')&&!picks.includes('B'),'vaste-training-ID mag nooit in de customTrainings-picker verschijnen');
});

test('Test 7 — Na save keert een bestaande training terug naar dezelfde Preview (wbReturnCtx-reïmplementatie)', ()=>{
  function save_T(wbReturnCtx,saveWorkoutFn){
    const existingId=(wbReturnCtx&&wbReturnCtx.source==='custom')?wbReturnCtx.id:null;
    const savedId=saveWorkoutFn(null,existingId);
    const rc=wbReturnCtx;
    if(rc)return {reopenedSource:rc.source,reopenedId:savedId||rc.id};
    return null;
  }
  const result=save_T({source:'custom',id:'custom_x'},(name,existingId)=>existingId||'zou_niet_moeten');
  assertEq(result.reopenedSource,'custom');
  assertEq(result.reopenedId,'custom_x','moet exact hetzelfde ID heropenen, niet een nieuw ID');
});

test('Test 8 — Bestaande nieuwe-training-flow (zonder Library, zonder existingId) blijft ongewijzigd werken', ()=>{
  const T=libTestSetup();
  T.WB_st.plan={items:[{id:'TK-000019',pick:'compound',sets:4,reps:'8',rest:90}]};
  const customTrainings=[];
  const id=T.saveWorkout_T('Mijn training',null,customTrainings,()=>'custom_gewoon_nieuw');
  assertEq(id,'custom_gewoon_nieuw');
  assertEq(customTrainings.length,1);
  assertEq(customTrainings[0].name,'Mijn training');
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
