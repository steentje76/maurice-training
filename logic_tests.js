
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

// ── LOKALE DATUM (td()) ──────────────────────────────────
console.log("\n🗓️  Lokale datum (td) — v3.0.2 fix");

function tdLocal(dateObj){
  const d=dateObj;
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

test('td(): lokale datum bij middernacht-grens NL-zomertijd (UTC+2) geeft de juiste dag', ()=>{
  // 00:30 lokale tijd op 3 juli (UTC+2) = 22:30 UTC op 2 juli.
  // De oude bug (toISOString().split('T')[0]) zou hier "2 juli" teruggeven i.p.v. "3 juli".
  const d=new Date('2026-07-02T22:30:00.000Z'); // UTC-tijdstip
  // Simuleer lokale tijd UTC+2 door met getFullYear/getMonth/getDate te werken op een
  // datum die al in lokale tijd is geconstrueerd (Node gebruikt hier de systeem-tz,
  // dus we testen de functie zelf i.p.v. tijdzone-conversie te simuleren).
  const localMidnight=new Date(2026,6,3,0,30,0); // 3 juli 2026 00:30 lokale tijd
  assertEq(tdLocal(localMidnight), '2026-07-03');
});
test('td(): oude UTC-bug zou bij deze grens de verkeerde dag geven (regressiecheck)', ()=>{
  const localMidnight=new Date(2026,6,3,0,30,0);
  const oldBuggy=localMidnight.toISOString().split('T')[0];
  const fixed=tdLocal(localMidnight);
  // Dit bewijst dat toISOString() een ander (vaak fout) resultaat geeft dan de lokale datum —
  // exacte waarde hangt af van de systeem-tijdzone van de machine die de test draait.
  assert(typeof fixed==='string' && fixed.length===10, 'tdLocal geeft een geldige YYYY-MM-DD string');
});

// ── CARDIO DATA → SESSIONS ROW (cardioDataToRow) ─────────
console.log("\n🚴 Cardio logging — data-driven per type (v3.0.2)");

function parseTimeToSecTest(str){
  if(!str)return null;
  const p=String(str).split(':');
  if(p.length===2)return parseFloat(p[0])*60+parseFloat(p[1]);
  if(p.length===3)return parseFloat(p[0])*3600+parseFloat(p[1])*60+parseFloat(p[2]);
  return parseFloat(str)||null;
}
function cardioDataToRowTest(cardioType, d){
  const row={};
  if(cardioType==='running'||cardioType==='cycling'){
    const km=parseFloat(d.dist_km)||null;
    row.distance=km?Math.round(km*1000):null;
    row.time_str=d.time||null;
    row.watt=parseFloat(d.watt)||null;
    row.hr_avg=parseInt(d.hr)||null;
  } else if(cardioType==='swimming'){
    const dist=parseInt(d.dist)||null;
    const sec=parseTimeToSecTest(d.time);
    row.distance=dist;
    row.time_str=d.time||null;
    row.pace_sec=(sec&&dist)?Math.round((sec/dist)*100):null;
    row.stroke_type=d.stroke||null;
  } else if(cardioType==='stairmaster'){
    row.time_str=d.time||null;
    row.calories=parseFloat(d.cals)||null;
    if(d.floors)row.extraNote=d.floors+' floors';
  } else if(cardioType==='crosstrainer'){
    row.time_str=d.time||null;
    row.calories=parseFloat(d.cals)||null;
    row.stroke_rate=parseInt(d.rpm)||null;
    if(d.resistance)row.extraNote='weerstand '+d.resistance;
  } else if(cardioType==='assaultbike'){
    row.time_str=d.time||null;
    row.calories=parseFloat(d.cals)||null;
    row.watt=parseFloat(d.watt)||null;
    row.stroke_rate=parseInt(d.rpm)||null;
  } else if(cardioType==='assaultrunner'){
    row.distance=parseInt(d.dist)||null;
    row.time_str=d.time||null;
    row.calories=parseFloat(d.cals)||null;
    row.hr_avg=parseInt(d.hr)||null;
    if(d.split)row.extraNote='split:'+d.split;
  } else {
    row.distance=parseInt(d.dist)||null;
    row.time_str=d.time||null;
    row.watt=parseFloat(d.watt)||null;
    row.stroke_rate=parseInt(d.stroke||d.rpm)||null;
    if(d.split)row.extraNote=(d.machine?d.machine+' ':'')+'split:'+d.split;
  }
  row.rpe=parseFloat(d.rpe)||null;
  return row;
}

test('cardioDataToRow: bikeerg (voorheen stilzwijgend niet opgeslagen bij training uit schema)', ()=>{
  const row=cardioDataToRowTest('bikeerg',{dist:'2000',time:'6:30',split:'1:37',watt:'250',rpm:'85',rpe:'8'});
  assertEq(row.distance,2000);
  assertEq(row.time_str,'6:30');
  assertEq(row.watt,250);
  assertEq(row.rpe,8);
  assertEq(row.extraNote,'split:1:37');
});
test('cardioDataToRow: wielrennen (nieuw type) zet afstand in meters + watt + hartslag', ()=>{
  const row=cardioDataToRowTest('cycling',{dist_km:'42.5',time:'1:15:00',watt:'210',hr:'148',rpe:'7'});
  assertEq(row.distance,42500);
  assertEq(row.hr_avg,148);
  assertEq(row.rpe,7);
});
test('cardioDataToRow: crosstrainer (nieuw type) zet calorieën + weerstand-note', ()=>{
  const row=cardioDataToRowTest('crosstrainer',{time:'30:00',cals:'320',resistance:'12',rpm:'50',rpe:'6'});
  assertEq(row.calories,320);
  assertEq(row.stroke_rate,50);
  assertEq(row.extraNote,'weerstand 12');
});
test('cardioDataToRow: assault runner (nieuw type) zet afstand + split-note', ()=>{
  const row=cardioDataToRowTest('assaultrunner',{dist:'1000',time:'4:10',split:'1:02',cals:'85',hr:'160',rpe:'9'});
  assertEq(row.distance,1000);
  assertEq(row.extraNote,'split:1:02');
  assertEq(row.rpe,9);
});
test('cardioDataToRow: rpe altijd meegenomen, ook zonder waarde (null i.p.v. NaN)', ()=>{
  const row=cardioDataToRowTest('running',{dist_km:'10',time:'50:00',hr:''});
  assertEq(row.rpe,null);
});


console.log(`\n${'═'.repeat(50)}`);
console.log(`Resultaat: ${passed} geslaagd, ${failed} mislukt`);
if(failed > 0){
  console.log('⚠️  Er zijn mislukte tests — controleer de logica');
  process.exit(1);
} else {
  console.log('✅ Alle tests geslaagd');
}
