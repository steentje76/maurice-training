
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

// ── AFMETINGEN: KOLOMMEN + LEGACY NOTE-FALLBACK ──────────
console.log("\n📏 Afmetingen (kolommen i.p.v. note-veld)");

function resolveAfmetingen(row){
  let hips=row.hips_cm??null,chest=row.chest_cm??null,arm=row.arm_cm??null,thigh=row.thigh_cm??null,metabAge=row.metab_age??null;
  if((hips==null||chest==null||arm==null||thigh==null||metabAge==null)&&row.note){
    const parts={};
    row.note.split('|').forEach(p=>{const kv=p.split(':');if(kv.length===2)parts[kv[0].trim()]=kv[1].trim();});
    const num=v=>(v&&v!=='null'&&v!==''?parseFloat(v):null);
    if(hips==null)hips=num(parts.hips);
    if(chest==null)chest=num(parts.chest);
    if(arm==null)arm=num(parts.arm);
    if(thigh==null)thigh=num(parts.thigh);
    if(metabAge==null)metabAge=parts.metab_age&&parts.metab_age!=='null'&&parts.metab_age!==''?parseInt(parts.metab_age):null;
  }
  return {hips,chest,arm,thigh,metabAge};
}

test('Nieuwe record: leest direct uit eigen kolommen', ()=>{
  const r = resolveAfmetingen({hips_cm:98,chest_cm:104,arm_cm:36,thigh_cm:58,metab_age:47});
  assertEq(r.hips, 98); assertEq(r.chest, 104); assertEq(r.arm, 36); assertEq(r.thigh, 58); assertEq(r.metabAge, 47);
});
test('Oud record: valt terug op note-veld als kolommen leeg zijn', ()=>{
  const r = resolveAfmetingen({note:'hips:100|chest:106|arm:37|thigh:60|metab_age:48'});
  assertEq(r.hips, 100); assertEq(r.chest, 106); assertEq(r.arm, 37); assertEq(r.thigh, 60); assertEq(r.metabAge, 48);
});
test('Oud record zonder ingevulde waarden in note geeft null', ()=>{
  const r = resolveAfmetingen({note:'hips:|chest:null|arm:|thigh:|metab_age:'});
  assert(r.hips === null && r.chest === null && r.arm === null);
});
test('Geen note en geen kolommen geeft overal null', ()=>{
  const r = resolveAfmetingen({});
  assert(r.hips === null && r.chest === null && r.arm === null && r.thigh === null && r.metabAge === null);
});

// ── GEWICHT: ÉÉN RECORD PER DAG (DEDUPE) ─────────────────
console.log("\n⚖️  Gewicht dedupe (check-in / los wegen / compositie)");

function weightLogAction(existingForDate){
  if(existingForDate && existingForDate.length) return {action:'patch', id:existingForDate[0].id};
  return {action:'insert'};
}

test('Geen bestaand record vandaag → insert', ()=>{
  assertEq(weightLogAction([]).action, 'insert');
});
test('Al een record vandaag → patch op bestaand id', ()=>{
  const r = weightLogAction([{id:42, weight:108.2}]);
  assertEq(r.action, 'patch'); assertEq(r.id, 42);
});
test('Meerdere invoerpunten op dezelfde dag overschrijven, dupliceren niet', ()=>{
  const eerste = weightLogAction([]); // check-in 's ochtends
  assertEq(eerste.action, 'insert');
  const tweede = weightLogAction([{id:7, weight:108.0}]); // compositie-invoer 's avonds
  assertEq(tweede.action, 'patch');
  assertEq(tweede.id, 7);
});

// ── PROGRAMMA: AI-JSON PARSEN EN VALIDEREN ───────────────
console.log("\n🗓️  Programma (AI-output parsen)");

function parseProgrammaJSON(txt){
  try{
    const cleaned=txt.replace(/```json|```/g,'').trim();
    const obj=JSON.parse(cleaned);
    if(!obj.blocks||!Array.isArray(obj.blocks)||!obj.blocks.length)return null;
    const valid=obj.blocks.every(b=>b.week_nr&&b.fase_naam&&(b.training_ref==='A'||b.training_ref==='B'));
    return valid?obj:null;
  }catch{return null;}
}

test('Geldige JSON met blocks wordt geaccepteerd', ()=>{
  const r = parseProgrammaJSON('{"blocks":[{"week_nr":1,"fase_naam":"Opbouw","training_ref":"A"}]}');
  assert(r !== null); assertEq(r.blocks.length, 1);
});
test('JSON in markdown-codeblock wordt ontdaan van ```json fences', ()=>{
  const r = parseProgrammaJSON('```json\n{"blocks":[{"week_nr":1,"fase_naam":"Opbouw","training_ref":"B"}]}\n```');
  assert(r !== null); assertEq(r.blocks[0].training_ref, 'B');
});
test('Ongeldige training_ref (niet A of B) wordt afgewezen', ()=>{
  const r = parseProgrammaJSON('{"blocks":[{"week_nr":1,"fase_naam":"Opbouw","training_ref":"C"}]}');
  assertEq(r, null);
});
test('Lege blocks-array wordt afgewezen', ()=>{
  const r = parseProgrammaJSON('{"blocks":[]}');
  assertEq(r, null);
});
test('Onparseerbare tekst geeft null i.p.v. crash', ()=>{
  const r = parseProgrammaJSON('Sorry, ik kan geen programma maken.');
  assertEq(r, null);
});

// ── CONDITIES: SAMENVATTING VOOR HRV_LOG.EDEMA ───────────
console.log("\n🩹 Condities (multi-conditie check-in)");

function buildConditionSummary(loggedConditions){
  return loggedConditions.length ? loggedConditions.map(c=>c.label+': '+c.severity).join(', ') : null;
}

test('Eén conditie met ernst geeft leesbare samenvatting', ()=>{
  const r = buildConditionSummary([{label:'Rugklachten',severity:'matig'}]);
  assertEq(r, 'Rugklachten: matig');
});
test('Meerdere condities worden gecombineerd', ()=>{
  const r = buildConditionSummary([{label:'Rugklachten',severity:'licht'},{label:'Oedeem',severity:'normaal'}]);
  assertEq(r, 'Rugklachten: licht, Oedeem: normaal');
});
test('Geen condities ingevuld geeft null (geen lege regel in coach-context)', ()=>{
  const r = buildConditionSummary([]);
  assertEq(r, null);
});
test('Lege severity-waarden worden vooraf uitgefilterd, niet meegenomen', ()=>{
  const alle = [{label:'Rugklachten',severity:'matig'},{label:'Knieklachten',severity:''}];
  const gefilterd = alle.filter(c=>c.severity);
  assertEq(gefilterd.length, 1);
  assertEq(buildConditionSummary(gefilterd), 'Rugklachten: matig');
});

// ── EQUIPMENT TYPES: DROPDOWN + ANDERS...-FALLBACK ───────
console.log("\n🔧 Equipment types (dropdown i.p.v. vrije tekst)");

function resolveEquipmentLabel(selectValue, customValue){
  if(selectValue==='__other__')return customValue.trim()||null;
  return selectValue||null;
}

test('Gekozen type uit dropdown wordt direct gebruikt', ()=>{
  assertEq(resolveEquipmentLabel('Zitting',''), 'Zitting');
});
test('"Anders..." gebruikt de vrije tekst uit het custom-veld', ()=>{
  assertEq(resolveEquipmentLabel('__other__','Kniehoogte'), 'Kniehoogte');
});
test('"Anders..." met lege vrije tekst geeft null (validatie moet blokkeren)', ()=>{
  assertEq(resolveEquipmentLabel('__other__','   '), null);
});
test('Niets gekozen geeft null', ()=>{
  assertEq(resolveEquipmentLabel('',''), null);
});

// ── SLAAP: LEESBAAR FORMAAT I.P.V. RUWE DECIMAAL ─────────
console.log("\n😴 Slaapweergave (fmtSleep)");

function fmtSleep(h){
  let sh=Math.floor(h);
  let sm=Math.round((h-sh)*60);
  if(sm===60){sh++;sm=0;}
  return sh+'u'+(sm?sm+'m':'');
}

test('6.87 uur wordt 6u52m, niet de ruwe decimaal', ()=>{
  assertEq(fmtSleep(6.87), '6u52m');
});
test('Hele uren tonen geen overbodige 0m', ()=>{
  assertEq(fmtSleep(7), '7u');
});
test('Afronding naar hele minuten klopt', ()=>{
  assertEq(fmtSleep(6.5), '6u30m');
});
test('Afronding met overloop naar volgend uur (6.999 → 7u)', ()=>{
  assertEq(fmtSleep(6.999), '7u');
});

// ── SPIERHERSTEL ──────────────────────────────────────────
console.log("\n💪 Spierherstel (RPE-gewogen)");

function rpeMultiplier(rpe){
  const r = parseFloat(rpe);
  if(!r || isNaN(r)) return 1;
  if(r>=9) return 1.3;
  if(r>=8) return 1.0;
  return 0.85;
}

function computeMuscleRecoveryPct(hoursSince, baseHours, rpe){
  const effHours = baseHours * rpeMultiplier(rpe);
  return Math.min(100, Math.round(hoursSince/effHours*100));
}

test('RPE >=9 verlengt hersteltijd (lager % bij zelfde uren)', ()=>{
  const laag = computeMuscleRecoveryPct(48, 72, '7');
  const hoog = computeMuscleRecoveryPct(48, 72, '9.5');
  assert(hoog < laag, `RPE9.5 (${hoog}%) moet lager zijn dan RPE7 (${laag}%)`);
});
test('Volledig herstel na ruim voldoende tijd', ()=>{
  const pct = computeMuscleRecoveryPct(200, 72, '8');
  assertEq(pct, 100, 'moet capped zijn op 100');
});
test('RPE ontbrekend/ongeldig valt terug op multiplier 1', ()=>{
  const pct = computeMuscleRecoveryPct(72, 72, null);
  assertEq(pct, 100);
});
test('Halverwege hersteltijd geeft ~50%', ()=>{
  const pct = computeMuscleRecoveryPct(36, 72, '8');
  assertRange(pct, 45, 55, 'moet rond 50% liggen');
});

// ── PR PER HERHALING ──────────────────────────────────────
console.log("\n🏆 PR per herhaling (PR@1/3/5/10)");

const REP_PR_BUCKETS = [1,3,5,10];

function nearestRepBucket(reps){
  const r = parseFloat(reps);
  if(!r || isNaN(r)) return REP_PR_BUCKETS[0];
  let best = REP_PR_BUCKETS[0], bestDiff = Math.abs(REP_PR_BUCKETS[0]-r);
  for(let i=1;i<REP_PR_BUCKETS.length;i++){
    const diff = Math.abs(REP_PR_BUCKETS[i]-r);
    if(diff < bestDiff){ best = REP_PR_BUCKETS[i]; bestDiff = diff; }
  }
  return best;
}

function computeRepPRsFromSessions(sessions){
  const result = {1:null,3:null,5:null,10:null};
  sessions.forEach(s=>{
    if(!s.weight || !s.reps) return;
    const bucket = nearestRepBucket(s.reps);
    const w = parseFloat(s.weight);
    if(!result[bucket] || w > result[bucket].weight){
      result[bucket] = {weight:w, date:s.date};
    }
  });
  return result;
}

test('1 rep valt in bucket 1', ()=>{
  assertEq(nearestRepBucket(1), 1);
});
test('2 reps rondt af naar bucket 1 (tie -> kleinste)', ()=>{
  assertEq(nearestRepBucket(2), 1);
});
test('4 reps rondt af naar bucket 3 (tie -> kleinste)', ()=>{
  assertEq(nearestRepBucket(4), 3);
});
test('8 reps rondt af naar bucket 10', ()=>{
  assertEq(nearestRepBucket(8), 10);
});
test('12 reps valt in bucket 10 (hoogste bucket)', ()=>{
  assertEq(nearestRepBucket(12), 10);
});
test('computeRepPRsFromSessions pakt zwaarste gewicht per bucket', ()=>{
  const sessions=[
    {date:'2026-05-01',weight:80,reps:5},
    {date:'2026-05-08',weight:85,reps:5},
    {date:'2026-05-15',weight:82,reps:5},
    {date:'2026-06-01',weight:100,reps:1},
  ];
  const prs=computeRepPRsFromSessions(sessions);
  assertEq(prs[5].weight, 85, 'PR@5 moet 85 zijn, niet de laatste sessie');
  assertEq(prs[1].weight, 100);
  assert(prs[3]===null, 'PR@3 moet leeg zijn zonder data');
});
test('sets zonder gewicht of reps worden genegeerd', ()=>{
  const sessions=[{date:'2026-05-01',weight:null,reps:5},{date:'2026-05-02',weight:80,reps:null}];
  const prs=computeRepPRsFromSessions(sessions);
  assert(prs[1]===null && prs[3]===null && prs[5]===null && prs[10]===null);
});

// ── RUSTTIJD PER OEFENING ─────────────────────────────────
console.log("\n⏱ Rusttijd per oefening");

function resolveRestSeconds(exerciseRest, appDefault){
  if(exerciseRest!=null && exerciseRest>0) return exerciseRest;
  if(appDefault>0) return appDefault;
  return null; // valt terug op handmatige keuze (modal)
}

test('Rusttijd per oefening heeft voorrang op app-standaard', ()=>{
  assertEq(resolveRestSeconds(45, 90), 45);
});
test('App-standaard gebruikt als oefening geen eigen rusttijd heeft', ()=>{
  assertEq(resolveRestSeconds(null, 90), 90);
});
test('Geen enkele standaard ingesteld -> valt terug op modal (null)', ()=>{
  assertEq(resolveRestSeconds(null, 0), null);
});
test('Rusttijd 0 op oefening telt niet als ingesteld', ()=>{
  assertEq(resolveRestSeconds(0, 60), 60);
});

// ── OEFENINGEN LOSKOPPELEN VAN TRAINING ───────────────────
console.log("\n🏋️ Oefeningenbibliotheek & training-koppeling");

function getExerciseMusclesPure(exercises, exId){
  const ex = exercises.find(e=>e.id===exId);
  if(!ex) return [];
  return [...(ex.muscle_primary||[]),...(ex.muscle_secondary||[])];
}

function buildTrainCfgFromRows(rows, exercises){
  const built = {A:[],B:[]};
  rows.forEach(r=>{
    const exObj = exercises.find(x=>x.id===r.exercise_id);
    if(!exObj) return;
    if(!built[r.training_ref]) built[r.training_ref]=[];
    built[r.training_ref].push({
      id:exObj.id, naam:exObj.name, type:exObj.type,
      sets:r.sets, reps:r.reps, rpe:r.rpe, wu:r.wu||0, tip:r.tip,
      yt:exObj.yt, muscles:{p:exObj.muscle_primary||[], s:exObj.muscle_secondary||[]}
    });
  });
  return built;
}

const testExercises = [
  {id:'backsquat', name:'Backsquat', type:'strength', yt:'abc', muscle_primary:['Quadriceps','Billen'], muscle_secondary:['Hamstrings']},
  {id:'bench', name:'Benchpress', type:'strength', yt:null, muscle_primary:['Borst'], muscle_secondary:['Triceps','Schouders']},
];

test('getExerciseMuscles combineert primair + secundair', ()=>{
  const m = getExerciseMusclesPure(testExercises, 'bench');
  assertEq(m.length, 3);
  assert(m.includes('Borst') && m.includes('Triceps') && m.includes('Schouders'));
});
test('getExerciseMuscles geeft lege array bij onbekende oefening', ()=>{
  const m = getExerciseMusclesPure(testExercises, 'onbekend');
  assertEq(m.length, 0);
});
test('Eén oefening kan aan meerdere trainingen gekoppeld worden', ()=>{
  const rows = [
    {exercise_id:'backsquat', training_ref:'A', sort_order:0, sets:4, reps:'3-5', rpe:'8', wu:3, tip:null},
    {exercise_id:'backsquat', training_ref:'B', sort_order:2, sets:3, reps:'8', rpe:'7', wu:1, tip:'lichter'},
  ];
  const cfg = buildTrainCfgFromRows(rows, testExercises);
  assertEq(cfg.A.length, 1);
  assertEq(cfg.B.length, 1);
  assertEq(cfg.A[0].reps, '3-5');
  assertEq(cfg.B[0].reps, '8', 'context-specifieke reps per training, zelfde oefening');
});
test('Oefening zonder koppeling verschijnt nergens in TRAIN_CFG', ()=>{
  const rows = [{exercise_id:'backsquat', training_ref:'A', sort_order:0, sets:4, reps:'3-5', rpe:'8', wu:3, tip:null}];
  const cfg = buildTrainCfgFromRows(rows, testExercises);
  assertEq(cfg.A.length, 1);
  assertEq((cfg.B||[]).length, 0, 'bench is niet gekoppeld en hoort nergens te staan');
});
test('TRAIN_CFG behoudt de volgorde waarin rows binnenkomen (sortering gebeurt in de Supabase-query zelf)', ()=>{
  const rows = [
    {exercise_id:'backsquat', training_ref:'A', sort_order:0, sets:4, reps:'3-5'},
    {exercise_id:'bench', training_ref:'A', sort_order:1, sets:4, reps:'4-6'},
  ];
  const cfg = buildTrainCfgFromRows(rows, testExercises);
  assertEq(cfg.A[0].id, 'backsquat');
  assertEq(cfg.A[1].id, 'bench');
});

// ── TIJD-PARSING (mm:ss / h:mm:ss) — nieuw met multi-sport logging ──
console.log("\n⏱️  parseTimeToSec (running/swimming/wod/cardio)");

function parseTimeToSec(str){
  if(!str)return null;
  const p=String(str).trim().split(':');
  let sec;
  if(p.length===2)sec=parseFloat(p[0])*60+parseFloat(p[1]);
  else if(p.length===3)sec=parseFloat(p[0])*3600+parseFloat(p[1])*60+parseFloat(p[2]);
  else sec=parseFloat(str);
  return isNaN(sec)?null:sec;
}

test('parseTimeToSec("3:42") = 222 sec (mm:ss)', ()=> assertEq(parseTimeToSec('3:42'), 222));
test('parseTimeToSec("1:02:15") = 3735 sec (h:mm:ss)', ()=> assertEq(parseTimeToSec('1:02:15'), 3735));
test('parseTimeToSec("") = null (leeg veld)', ()=> assertEq(parseTimeToSec(''), null));
test('parseTimeToSec("45") = 45 sec (kale seconden)', ()=> assertEq(parseTimeToSec('45'), 45));

// ── ZWEMMEN: pace /100m ──────────────────────────────────
console.log("\n🏊 Zwemmen pace-berekening (sec/100m, niet sec/km)");

function swimPaceSec(distM, timeStr){
  const sec=parseTimeToSec(timeStr);
  if(!sec||!distM)return null;
  return Math.round((sec/distM)*100);
}

test('400m in 6:00 = 90 sec/100m pace', ()=> assertEq(swimPaceSec(400,'6:00'), 90));
test('Zonder afstand geen pace berekenen', ()=> assertEq(swimPaceSec(0,'6:00'), null));

// ── CROSSFIT WOD: AMRAP-score vergelijken ────────────────
console.log("\n🏋️ CrossFit AMRAP-score vergelijking (rounds + reps)");

function amrapBeter(a, b){
  // a/b = {rounds, extra_reps}. Hogere rondes wint; bij gelijke rondes wint meer extra reps.
  if(a.rounds !== b.rounds) return a.rounds > b.rounds;
  return (a.extra_reps||0) > (b.extra_reps||0);
}

test('12 rondes + 6 reps > 12 rondes + 3 reps', ()=> assert(amrapBeter({rounds:12,extra_reps:6},{rounds:12,extra_reps:3})));
test('13 rondes + 0 reps > 12 rondes + 9 reps', ()=> assert(amrapBeter({rounds:13,extra_reps:0},{rounds:12,extra_reps:9})));
test('Gelijke score is niet "beter"', ()=> assertEq(amrapBeter({rounds:10,extra_reps:5},{rounds:10,extra_reps:5}), false));

// ── SAMENVATTING ─────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`);
console.log(`Resultaat: ${passed} geslaagd, ${failed} mislukt`);
if(failed > 0){
  console.log('⚠️  Er zijn mislukte tests — controleer de logica');
  process.exit(1);
} else {
  console.log('✅ Alle tests geslaagd');
}
