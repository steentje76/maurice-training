/* TrainingKompas — Cardio Core test suite (node, standalone).
 * Draai: node core/cardio.test.js   (oracle: TK_INDEX of ../index.html)
 * Bewijst: golden, edge, determinisme, purity, expliciete units, en LEGACY === CANONICAL. */
const fs = require('fs');
const path = require('path');
const CardioCore = require('./cardio.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + b + ', kreeg ' + a); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };
const near = (a, b, m) => { if (Math.abs(a - b) > 1e-9) throw new Error((m || '') + ' verwacht ~' + b + ', kreeg ' + a); };

// ---- Legacy uit de echte index.html extraheren ----
const IDX = fs.readFileSync(process.env.TK_INDEX || path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name) {
  const m = new RegExp('function\\s+' + name + '\\s*\\(').exec(IDX);
  if (!m) throw new Error('legacy fn ' + name + ' niet gevonden');
  let i = IDX.indexOf('{', m.index), d = 0, j = i;
  for (; j < IDX.length; j++) { const c = IDX[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  return IDX.slice(m.index, j);
}
function extractCardioEngine() {
  const m = /const\s+CardioEngine\s*=\s*\{/.exec(IDX);
  if (!m) throw new Error('legacy CardioEngine niet gevonden');
  let i = IDX.indexOf('{', m.index), d = 0, j = i;
  for (; j < IDX.length; j++) { const c = IDX[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  return 'const CardioEngine = ' + IDX.slice(i, j) + ';';
}
function extractConstObj(name) {
  const m = new RegExp('const\\s+' + name + '\\s*=\\s*\\{').exec(IDX);
  if (!m) throw new Error('legacy const ' + name + ' niet gevonden');
  let i = IDX.indexOf('{', m.index), d = 0, j = i;
  for (; j < IDX.length; j++) { const c = IDX[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { j++; break; } } }
  return 'const ' + name + ' = ' + IDX.slice(i, j) + ';';
}
const legacy = new Function(
  extractFn('parseTimeToSec') + '\n' + extractCardioEngine() + '\n' + extractConstObj('CARDIO_TYPES') +
  '\n return { parseTimeToSec, CardioEngine, CARDIO_TYPES };'
)();
const LE = legacy.CardioEngine;
const CT = legacy.CARDIO_TYPES;
const J = a => JSON.stringify(a);

// ================= A. cardio_time.v1 — parse/format =================
console.log('\n[A] parseTime + formatTime (cardio_time.v1)');
const parseCases = [null, '', '0', '8:20', '1:02:03', '90', '2:03', 'abc', '  7:30  ', '500', '0:00', '00:45', '1:2:3', '12.5'];
T('old===new: parseTime === legacy parseTimeToSec', () => parseCases.forEach(s => eq(CardioCore.parseTime(s), legacy.parseTimeToSec(s), 'parseTime('+String(s)+')')));
T('old===new: parseTime === legacy CardioEngine.parseTime', () => parseCases.forEach(s => eq(CardioCore.parseTime(s), LE.parseTime(s), 'parse('+String(s)+')')));
const fmtCases = [null, NaN, -5, 0, 45, 60, 90, 125, 500, 3600, 3661, 7325, 8.4, 8.6, 599];
T('old===new: formatTime === legacy CardioEngine.formatTime', () => fmtCases.forEach(s => eq(CardioCore.formatTime(s), LE.formatTime(s), 'fmt('+String(s)+')')));
T('ankers: parseTime("8:20")=500; formatTime(500)="8:20"; formatTime(3661)="1:01:01"', () => {
  eq(CardioCore.parseTime('8:20'), 500); eq(CardioCore.formatTime(500), '8:20'); eq(CardioCore.formatTime(3661), '1:01:01');
});
T('UNIT: 500 s ≠ 500 min — parseTime("500")=500 s (geen minuten)', () => { eq(CardioCore.parseTime('500'), 500); ok(CardioCore.parseTime('500') !== 500 * 60); });

// ================= B. cardio_split.v1 — split/dist/time =================
console.log('\n[B] split/dist/time conversies (cardio_split.v1)');
const splitCases = [[1000,200,500],[2000,492,500],[500,120,500],[0,200,500],[1000,0,500],[1000,200,1000],[400,90,100]];
T('old===new: splitFromDistTime', () => splitCases.forEach(([d,t,b]) => eq(CardioCore.splitFromDistTime(d,t,b), LE.splitFromDistTime(d,t,b), 'split('+d+','+t+','+b+')')));
T('old===new: timeFromDistSplit', () => splitCases.forEach(([d,t,b]) => eq(CardioCore.timeFromDistSplit(d,t,b), LE.timeFromDistSplit(d,t,b))));
T('old===new: distFromTimeSplit', () => splitCases.forEach(([d,t,b]) => eq(CardioCore.distFromTimeSplit(d,t,b), LE.distFromTimeSplit(d,t,b))));
T('anker: 2000 m in 8:12 (492 s) → split /500m = 123 s (2:03)', () => { const sp=CardioCore.splitFromDistTime(2000,492,500); near(sp,123); eq(CardioCore.formatTime(sp),'2:03'); });
T('null-guard: 0 dist of 0 time → null', () => { eq(CardioCore.splitFromDistTime(0,200,500),null); eq(CardioCore.splitFromDistTime(1000,0,500),null); });
T('UNIT: basis 500m ≠ 1000m geeft andere split', () => ok(CardioCore.splitFromDistTime(1000,200,500) !== CardioCore.splitFromDistTime(1000,200,1000)));
T('round-trip: dist→split→time→dist consistent', () => {
  const b=500, d=2000, t=492; const sp=CardioCore.splitFromDistTime(d,t,b);
  near(CardioCore.timeFromDistSplit(d,sp,b), t); near(CardioCore.distFromTimeSplit(t,sp,b), d);
});

// ================= C. cardio_power.v1 — Concept2 watt =================
console.log('\n[C] wattFromSplit500 + splitFromWatt500 (cardio_power.v1)');
const wattCases = [90,100,110,120,150,60,0,null];
T('old===new: wattFromSplit500', () => wattCases.forEach(s => eq(CardioCore.wattFromSplit500(s), LE.wattFromSplit500(s), 'watt('+s+')')));
T('old===new: splitFromWatt500', () => [185,200,100,50,0,null].forEach(w => eq(CardioCore.splitFromWatt500(w), LE.splitFromWatt500(w), 'split('+w+')')));
T('Concept2-formule behouden: split 120s → watt = 2.80/(120/500)^3', () => near(CardioCore.wattFromSplit500(120), 2.80/Math.pow(120/500,3)));
T('inverse consistent: split→watt→split', () => { const w=CardioCore.wattFromSplit500(115); near(CardioCore.splitFromWatt500(w),115); });
T('null-guard: 0/null → null', () => { eq(CardioCore.wattFromSplit500(0),null); eq(CardioCore.wattFromSplit500(null),null); eq(CardioCore.splitFromWatt500(0),null); });
T('lager split (sneller) → hoger watt', () => ok(CardioCore.wattFromSplit500(100) > CardioCore.wattFromSplit500(120)));

// ================= D. cardio_split.v1 — auto/manual splits =================
console.log('\n[D] autoSplits + fromManualSplits (cardio_split.v1)');
T('old===new: autoSplits', () => [[492,2000,500],[0,2000,500],[300,1000,250],[492,2000,0]].forEach(([tt,td,sd]) => eq(J(CardioCore.autoSplits(tt,td,sd)), J(LE.autoSplits(tt,td,sd)), 'auto('+tt+','+td+','+sd+')')));
T('old===new: fromManualSplits', () => [{1:120,2:118,3:122,4:119},{1:0,2:null,3:120},{},{1:NaN}].forEach(m => eq(J(CardioCore.fromManualSplits(m)), J(LE.fromManualSplits(m)), 'manual('+J(m)+')')));
T('autoSplits: 2000 m / 500 m = 4 intervallen, elk 123 s', () => { const s=CardioCore.autoSplits(492,2000,500); eq(Object.keys(s).length,4); near(s[1],123); });
T('fromManualSplits: total/avg/count', () => { const a=CardioCore.fromManualSplits({1:120,2:118,3:122,4:120}); eq(a.count,4); eq(a.total,480); eq(a.avg,120); });
T('fromManualSplits: alleen positieve geldige waarden tellen', () => { const a=CardioCore.fromManualSplits({1:0,2:null,3:120,4:NaN}); eq(a.count,1); eq(a.total,120); });

// ================= E. Architecture guards (purity) =================
console.log('\n[E] Architecture guards');
const RAWSRC = fs.readFileSync(path.join(__dirname, 'cardio.js'), 'utf8');
const SRC = RAWSRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const forbidden = ['document', 'supabase', 'fetch(', 'localStorage', 'sessionStorage', 'querySelector', '.from(', 'XMLHttpRequest'];
T('cardio-core bevat geen DOM/DB/AI/network-afhankelijkheid', () => forbidden.forEach(tok => ok(!SRC.includes(tok), 'verboden token: ' + tok)));
T('VERSIONS compleet (time/split/power)', () => { eq(CardioCore.VERSIONS.time,'cardio_time.v1'); eq(CardioCore.VERSIONS.split,'cardio_split.v1'); eq(CardioCore.VERSIONS.power,'cardio_power.v1'); });
T('offline: pure functie zonder runtime-context', () => { eq(CardioCore.parseTime('2:03'),123); near(CardioCore.wattFromSplit500(120), 2.80/Math.pow(120/500,3)); });
T('device-agnostisch: geen concept2/assault/device-referentie in code', () => { ['concept2','assault','bluetooth','ble','pm5'].forEach(t => ok(SRC.toLowerCase().indexOf(t)===-1, 'device-token in core: '+t)); });

// ================= F. CARDIO_TYPES device-contract (F1.14 productlock) =================
// Legt de sporter-gerichte device-modellen vast: juiste units, juiste metrics, juiste split-semantiek.
// Voorkomt dat een toekomstige wijziging RowErg/BikeErg/SkiErg/AssaultBike stil verkeerd maakt.
console.log('\n[F] CARDIO_TYPES device-contract (RowErg/BikeErg/SkiErg/AssaultBike)');
T('rowing (Concept2 RowErg): m · /500m · split+watt+stroke · basis 500', () => {
  const r = CT.rowing; eq(r.unit, 'm'); eq(r.splitUnit, '/500m'); ok(r.splits === true);
  ['dist','time','split','watt','stroke'].forEach(f => ok(r.fields.includes(f), 'rowing mist ' + f));
  eq(r.calc.basis, 500);
});
T('bikeerg (Concept2 BikeErg): m · /1000m · watt+rpm+resistance · GEEN stroke/drag', () => {
  const b = CT.bikeerg; eq(b.unit, 'm'); eq(b.splitUnit, '/1000m'); eq(b.calc.basis, 1000);
  ['dist','time','split','watt','rpm','resistance'].forEach(f => ok(b.fields.includes(f), 'bikeerg mist ' + f));
  ok(!b.fields.includes('stroke'), 'bikeerg mag geen roeislag hebben'); ok(!b.fields.includes('drag'));
});
T('skierg (Concept2 SkiErg): m · /500m · split+watt+stroke · basis 500', () => {
  const s = CT.skierg; eq(s.unit, 'm'); eq(s.splitUnit, '/500m'); eq(s.calc.basis, 500);
  ['dist','time','split','watt','stroke'].forEach(f => ok(s.fields.includes(f), 'skierg mist ' + f));
});
T('assaultbike: cal · /min · GEEN split/distance/Concept2-calc (bewust ander meetmodel)', () => {
  const a = CT.assaultbike; eq(a.unit, 'cal'); eq(a.splitUnit, '/min'); ok(a.splits === false); eq(a.calc, null);
  ['cals','time','watt','rpm'].forEach(f => ok(a.fields.includes(f), 'assaultbike mist ' + f));
  ok(!a.fields.includes('split'), 'assaultbike mag GEEN split hebben'); ok(!a.fields.includes('dist'), 'assaultbike mag GEEN distance hebben');
});
T('UNIT-safety: rowing/bikeerg/skierg in meter, assaultbike in calorieën (niet verwisselbaar)', () => {
  eq(CT.rowing.unit, 'm'); eq(CT.bikeerg.unit, 'm'); eq(CT.skierg.unit, 'm'); eq(CT.assaultbike.unit, 'cal');
  ok(CT.rowing.unit !== CT.assaultbike.unit, 'm ≠ cal');
});
T('RowErg/SkiErg delen 500m-splitbasis; BikeErg gebruikt 1000m (B9-H6, zelf gevonden en gerepareerd: Concept2 se eigen, officiële conventie -- PM5-handleiding bevestigt expliciet "time/500m for indoor rowers and SkiErg; time/1000m for BikeErg")', () => {
  eq(CT.rowing.calc.basis, 500); eq(CT.bikeerg.calc.basis, 1000); eq(CT.skierg.calc.basis, 500);
  if (CT.running && CT.running.calc) ok(CT.running.calc.basis !== 500, 'running basis ≠ 500');
  if (CT.swimming && CT.swimming.calc) ok(CT.swimming.calc.basis !== 500, 'swimming basis ≠ 500');
});

// ================= G. MIXED STRENGTH+CARDIO WORKOUT-SAFETY (F2.4/F2.5) =================
// Bewijst dat één workout strength én cardio kan bevatten zonder dat de metrics elkaar corrumperen:
// (1) resolveCardioType routeert per oefening (cardio -> type, strength -> null);
// (2) een cardio-rij (cardioDataToRow) bevat UITSLUITEND cardio-kolommen, nooit strength-kolommen.
console.log('\n[G] Mixed strength+cardio workout-safety (F2.4/F2.5)');
const mixLegacy = new Function(
  extractFn('parseTimeToSec') + '\n' + extractConstObj('CARDIO_TYPES') + '\n' +
  extractConstObj('CARDIO_TYPE_BY_ID') + '\n' + extractFn('resolveCardioType') + '\n' + extractFn('cardioDataToRow') +
  '\n return { resolveCardioType, cardioDataToRow };'
)();
const RCT = mixLegacy.resolveCardioType, C2R = mixLegacy.cardioDataToRow;
const STRENGTH_COLS = ['sets', 'reps', 'weight', 'sets_detail', 'rpe_target'];
T('per-oefening routing: cardio -> type, strength -> null (mixed workout dispatcht correct)', () => {
  eq(RCT({ id: 'roeien', type: 'cardio' }), 'rowing');
  eq(RCT({ id: 'bike_erg', type: 'rowing' }), 'bikeerg');
  eq(RCT({ id: 'assault_bike', type: 'assaultbike' }), 'assaultbike');
  eq(RCT({ id: 'backsquat', type: 'strength' }), null);
  eq(RCT({ id: 'bench', type: 'strength' }), null);
});
T('cardio-rij (rowing) bevat cardio-kolommen, GEEN strength-kolommen', () => {
  const row = C2R('rowing', { dist: '2000', time: '8:12', watt: '185', stroke: '28', rpe: '7' });
  ok(row.distance === 2000, 'distance ontbreekt'); ok(row.watt === 185); ok(row.stroke_rate === 28);
  STRENGTH_COLS.forEach(c => ok(!(c in row), 'cardio-rij mag geen strength-kolom ' + c + ' bevatten'));
});
T('cardio-rij (assaultbike) = calorieën, GEEN distance/split/strength', () => {
  const row = C2R('assaultbike', { cals: '98', time: '10:00', watt: '150', rpm: '65', rpe: '8' });
  ok(row.calories === 98, 'calories ontbreekt'); ok(!('distance' in row), 'assault mag geen distance-rij hebben');
  STRENGTH_COLS.forEach(c => ok(!(c in row), 'assault-rij mag geen strength-kolom ' + c + ' bevatten'));
});
T('lege cardio-invoer -> geen spookkolommen (alleen ingevulde velden mappen)', () => {
  const row = C2R('rowing', { dist: '', time: '', watt: '', stroke: '', rpe: '' });
  ok(!('distance' in row), 'lege dist mag geen distance-kolom zetten'); ok(!('watt' in row));
});
T('strength-metrics en cardio-metrics zijn disjunct (kunnen elkaar niet overschrijven)', () => {
  const cardioRow = C2R('bikeerg', { dist: '4000', time: '12:32', watt: '245', rpm: '72', rpe: '6' });
  ['distance', 'watt', 'stroke_rate'].forEach(c => ok(c in cardioRow, 'cardio mist ' + c));
  STRENGTH_COLS.forEach(c => ok(!(c in cardioRow), 'kruisbesmetting: ' + c));
});

// ================= H. INVALID INPUT SAFE-HANDLING (F2.5B → F3.6) =================
// Bewijst dat cardioDataToRow ongeldige invoer VEILIG overslaat i.p.v. corrupte kolommen op te slaan.
// F3.6: negatieve én niet-eindige (Infinity) waarden worden nu ook geweigerd vóór actual-write.
console.log('\n[H] Invalid cardio input safe-handling (F2.5B → F3.6)');
T('lege invoer -> kolom afwezig (geen 0/null-spook)', () => {
  const r = C2R('rowing', { dist: '', time: '8:00', watt: '' });
  ok(!('distance' in r), 'lege dist mag geen distance-kolom zetten'); ok(!('watt' in r));
});
T('garbage-string ("abc") -> kolom afwezig (parseInt NaN -> skip)', () => {
  const r = C2R('rowing', { dist: 'abc', time: '8:00' });
  ok(!('distance' in r), 'garbage dist mag geen distance-kolom zetten');
});
T('NaN-numeriek veld -> overgeslagen, geen NaN opgeslagen', () => {
  const r = C2R('rowing', { dist: '2000', time: '8:00', watt: 'xx' });
  ok(!('watt' in r), 'NaN watt mag niet opgeslagen worden'); ok(r.distance === 2000);
});
T('geldige invoer -> correcte numerieke kolommen (integer/parse)', () => {
  const r = C2R('rowing', { dist: '2000', time: '8:12', watt: '185', stroke: '28' });
  ok(r.distance === 2000 && r.watt === 185 && r.stroke_rate === 28, 'geldige parse faalt');
});
// F3.6 — P: negatieve waarden mogen NOOIT naar de actual-write.
T('P: negatieve afstand -> distance-kolom afwezig (geen corrupte row)', () => {
  const r = C2R('rowing', { dist: '-2000', time: '8:00', watt: '185' });
  ok(!('distance' in r), 'negatieve dist mag niet opgeslagen worden'); ok(r.watt === 185, 'geldige watt blijft');
});
T('P: negatieve watt/stroke -> kolommen afwezig, rest blijft', () => {
  const r = C2R('rowing', { dist: '2000', time: '8:00', watt: '-50', stroke: '-3' });
  ok(r.distance === 2000); ok(!('watt' in r), 'negatieve watt geweigerd'); ok(!('stroke_rate' in r), 'negatieve stroke geweigerd');
});
T('P: negatieve calorieën (assaultbike) -> calories-kolom afwezig', () => {
  const r = C2R('assaultbike', { cals: '-98', time: '10:00', watt: '150' });
  ok(!('calories' in r), 'negatieve cals geweigerd'); ok(r.watt === 150);
});
// F3.6 — R: Infinity mag NOOIT naar de actual-write.
T('R: Infinity-waarde -> kolom afwezig (niet-eindig geweigerd)', () => {
  const r = C2R('rowing', { dist: 'Infinity', time: '8:00', watt: '185' });
  ok(!('distance' in r), 'Infinity dist geweigerd'); ok(r.watt === 185);
});

// ================= I. CardioCore input-classificatie (F3.6 pure validator) =================
// EMPTY vs INVALID vs VALID — de bron van waarheid voor sporter-feedback, puur en testbaar.
console.log('\n[I] CardioCore.classifyNumericInput / classifyTimeInput (F3.6)');
T('S: lege/whitespace invoer -> empty', () => {
  eq(CardioCore.classifyNumericInput('').status, 'empty');
  eq(CardioCore.classifyNumericInput('   ').status, 'empty');
  eq(CardioCore.classifyNumericInput(null).status, 'empty');
  eq(CardioCore.classifyNumericInput(undefined).status, 'empty');
});
T('P: negatief getal -> invalid (reason negatief)', () => {
  const c = CardioCore.classifyNumericInput('-5'); eq(c.status, 'invalid'); eq(c.reason, 'negatief'); eq(c.value, null);
});
T('Q: NaN/garbage -> invalid (niet-eindig)', () => {
  eq(CardioCore.classifyNumericInput('abc').status, 'invalid');
  eq(CardioCore.classifyNumericInput('NaN').status, 'invalid');
});
T('R: Infinity -> invalid (niet-eindig)', () => {
  const c = CardioCore.classifyNumericInput('Infinity'); eq(c.status, 'invalid'); eq(c.reason, 'niet-eindig');
});
T('geldig getal -> valid met numerieke waarde', () => {
  const c = CardioCore.classifyNumericInput('185'); eq(c.status, 'valid'); eq(c.value, 185);
  eq(CardioCore.classifyNumericInput('0').status, 'valid'); // 0 is geldig (bv. 0 weerstand)
});
T('tijd: geldige mm:ss -> valid seconden', () => {
  const c = CardioCore.classifyTimeInput('8:12'); eq(c.status, 'valid'); eq(c.value, 492);
});
T('tijd: leeg -> empty; negatief -> invalid; onleesbaar -> invalid', () => {
  eq(CardioCore.classifyTimeInput('').status, 'empty');
  eq(CardioCore.classifyTimeInput('-1:30').status, 'invalid'); // -90s
  eq(CardioCore.classifyTimeInput('zomaar').status, 'invalid');
});
T('classificatie is deterministisch', () => {
  eq(JSON.stringify(CardioCore.classifyNumericInput('42')), JSON.stringify(CardioCore.classifyNumericInput('42')));
});

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ STOP: old !== new of guard faalt.'); process.exit(1); }
console.log('✅ Alle cardio golden/guard-tests groen. LEGACY === CANONICAL.');
