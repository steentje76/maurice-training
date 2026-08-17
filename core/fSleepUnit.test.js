/* sleep_unit.v1 — hrv_log.sleep is canoniek DECIMALE UREN.
 *
 * Aanleiding: de check-in schreef uren (index.html, saveHRV) terwijl de wearable-sync
 * minuten schreef in dezelfde kolom (netlify/functions/_wearableSyncLib.js). Eén kolom,
 * twee eenheden — met een verkeerde dagfactor tot gevolg op elke wearable-dag.
 *
 * Deze test bewaakt drie dingen:
 *   1. de sync schrijft voortaan uren (bron gecorrigeerd);
 *   2. de leeslaag vangt bestaande minuten-rijen op (compatibiliteitsshim);
 *   3. calculateDayFactor krijgt uitsluitend uren en is unit-consistent.
 *
 * Draai: node core/fSleepUnit.test.js
 */
const fs = require('fs');
const path = require('path');
const CalcCore = require('./calculation.js');
const LIB = require('../netlify/functions/_wearableSyncLib.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m){ if(c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }
function near(a, b, m, eps){ ok(Math.abs(a - b) <= (eps || 1e-9), m + ' (verwacht ~' + b + ', kreeg ' + a + ')'); }

console.log('\n[sleep_unit.v1] Slaapduur — één canonieke eenheid');

// ── 1. invoerkant: uren + minuten → decimale uren ────────────────────────────
console.log('  invoer (check-in)');
eq(CalcCore.sleepToHours(7, 48), 7.8,  '7u48m → 7,8 uur');
eq(CalcCore.sleepToHours(7, 12), 7.2,  '7u12m → 7,2 uur');
eq(CalcCore.sleepToHours(8, 0),  8,    '8u00m → 8 uur');
eq(CalcCore.sleepToHours(0, 30), 0.5,  '0u30m → 0,5 uur');
eq(CalcCore.sleepToHours(0, 0),  null, 'niets ingevuld → null, geen 0');
eq(CalcCore.sleepToHours(null, null), null, 'lege invoer → null');
eq(CalcCore.sleepToHours(6, 90), 7.5,  '6u90m → 7,5 uur (minuten mogen overlopen)');

// ── 2. sync: minuten → uren, vóór opslag ─────────────────────────────────────
console.log('  sync (wearable, bron gecorrigeerd)');
eq(LIB.minutesToHours(468), 7.8,  '468 min → 7,8 uur');
eq(LIB.minutesToHours(432), 7.2,  '432 min → 7,2 uur');
eq(LIB.minutesToHours(450), 7.5,  '450 min → 7,5 uur');
eq(LIB.minutesToHours(0),   null, '0 min → null (geen fabricage)');
eq(LIB.minutesToHours(-5),  null, 'negatief → null');
eq(LIB.minutesToHours(null),null, 'null blijft null');

const p = LIB.parseSleepPoint({ sleep: { interval: { startTime:'2026-08-16T23:00:00Z', endTime:'2026-08-17T06:30:00Z' } } });
eq(p.value, 7.5, 'interval 23:00→06:30 wordt 7,5 uur, niet 450');
eq(LIB.parseSleepPoint({ sleep:{ summary:{ minutesAsleep: 468 } , interval:{ endTime:'2026-08-17T07:00:00Z' } } }).value, 7.8,
   'summary.minutesAsleep 468 wordt 7,8 uur');
eq(LIB.buildRow('2026-08-17','u1',{hrv:null,rhr:null,sleep:7.8},null).row.sleep, 7.8,
   'de weggeschreven rij bevat uren');
ok(LIB.buildRow('2026-08-17','u1',{hrv:null,rhr:null,sleep:7.8},null).row.sleep <= CalcCore.MAX_SLEEP_HOURS,
   'de sync kan nooit meer een waarde boven de urengrens wegschrijven');

// ── 3. leeslaag: legacy-rijen met minuten worden opgevangen ──────────────────
console.log('  leeslaag (compatibiliteitsshim voor bestaande rijen)');
eq(CalcCore.MAX_SLEEP_HOURS, 20, 'de grens tussen uren en minuten ligt op 20');
eq(CalcCore.normalizeSleepHours(7.8),  7.8,  'canonieke uren blijven ongewijzigd');
eq(CalcCore.normalizeSleepHours(7.2),  7.2,  'canonieke uren blijven ongewijzigd');
eq(CalcCore.normalizeSleepHours(468),  7.8,  'legacy 468 min → 7,8 uur');
eq(CalcCore.normalizeSleepHours(432),  7.2,  'legacy 432 min → 7,2 uur');
eq(CalcCore.normalizeSleepHours(300),  5,    'legacy 300 min → 5 uur');
eq(CalcCore.normalizeSleepHours(20),   20,   'precies 20 telt als uren (grens hoort bij uren)');
eq(CalcCore.normalizeSleepHours(21),   0.35, '21 telt als minuten — een nacht van 21 uur bestaat niet');
eq(CalcCore.normalizeSleepHours('7.5'),7.5,  'tekstuele waarde wordt gelezen');
eq(CalcCore.normalizeSleepHours(null), null, 'null blijft null');
eq(CalcCore.normalizeSleepHours(''),   null, 'lege string blijft null');
eq(CalcCore.normalizeSleepHours(0),    null, '0 is geen meting');
eq(CalcCore.normalizeSleepHours('abc'),null, 'onzin blijft null');

// heen en weer: wat de sync schrijft, leest de shim ongewijzigd terug
[420, 432, 450, 468, 480, 510].forEach(function(min){
  const uur = LIB.minutesToHours(min);
  eq(CalcCore.normalizeSleepHours(uur), uur, min + ' min → ' + uur + ' uur blijft stabiel bij lezen');
});

// ── 4. dagfactor is unit-consistent ──────────────────────────────────────────
console.log('  dagfactor (unit-consistent)');
const dfUur = CalcCore.calculateDayFactor({ hrvFactor: 1.00, sleepHours: 7.2, cyclePhase: null });
const dfMin = CalcCore.calculateDayFactor({ hrvFactor: 1.00, sleepHours: 432, cyclePhase: null });
eq(dfUur, dfMin, 'dezelfde nacht geeft dezelfde dagfactor, of hij nu in uren of minuten is opgeslagen');
eq(dfUur, 1.00, '7,2 uur slaap → slaapfactor 1,00');
eq(CalcCore.calculateDayFactor({ hrvFactor: 1.00, sleepHours: 390, cyclePhase: null }), 0.97,
   'legacy 390 min (6,5 uur) → 0,97, niet 1,00');
eq(CalcCore.calculateDayFactor({ hrvFactor: 1.00, sleepHours: 6.5, cyclePhase: null }), 0.97,
   '6,5 uur → 0,97');
eq(CalcCore.calculateDayFactor({ hrvFactor: 1.00, sleepHours: 300, cyclePhase: null }), 0.92,
   'legacy 300 min (5 uur) → 0,92');
eq(CalcCore.calculateDayFactor({ hrvFactor: 1.00, sleepHours: 5, cyclePhase: null }), 0.92, '5 uur → 0,92');
eq(CalcCore.calculateDayFactor({ hrvFactor: 1.00, sleepHours: null, cyclePhase: null }), 1.00,
   'geen slaap gemeten → slaapfactor blijft neutraal');
eq(CalcCore.slaapDagFactor(7), 1.00, 'slaapDagFactor zelf blijft ongewijzigd (uren in)');
eq(CalcCore.VERSIONS.sleep_unit, 'sleep_unit.v1', 'de normalisatie heeft een versietag');

// ── 5. weergave: één formatter voor de hele app ──────────────────────────────
console.log('  weergave (één formatter)');
ok(html.indexOf('function tkFmtSleepHours(v)') >= 0, 'er is één canonieke slaapformatter');
ok(/function _tkSleepFmt\(v\)\{ return tkFmtSleepHours\(v\); \}/.test(html), '_tkSleepFmt delegeert');
ok(/function fmtSleep\(h\)\{ return tkFmtSleepHours\(h\); \}/.test(html), 'fmtSleep delegeert');
ok(/function v43SlaapTxt\(u\)\{ return tkFmtSleepHours\(u\); \}/.test(html), 'v43SlaapTxt delegeert');
ok(html.indexOf('var h=Math.floor(v/60), m=Math.round(v%60)') < 0,
   'de formatter die door 60 deelde bestaat niet meer');

// de formatter zelf, met dezelfde regels als in de app
function tkFmtSleepHours(v){
  var u = CalcCore.normalizeSleepHours(v);
  if(u==null) return '—';
  var h=Math.floor(u), m=Math.round((u-h)*60);
  if(m===60){h++;m=0;}
  return m ? (h+'u '+('0'+m).slice(-2)+'m') : (h+'u');
}
eq(tkFmtSleepHours(7.8), '7u 48m', '7,8 uur → 7u 48m');
eq(tkFmtSleepHours(7.2), '7u 12m', '7,2 uur → 7u 12m');
eq(tkFmtSleepHours(468), '7u 48m', 'legacy 468 min → 7u 48m (niet 0u 08m)');
eq(tkFmtSleepHours(432), '7u 12m', 'legacy 432 min → 7u 12m');
eq(tkFmtSleepHours(8),   '8u',     'hele uren zonder minuten');
eq(tkFmtSleepHours(null),'—',      'geen meting → streepje, geen 0u');

// ── 6. schrijfpaden gebruiken de canonieke helpers ──────────────────────────
console.log('  schrijfpaden');
// De leeskant loopt via één guard-helper: de service worker serveert core/*.js cache-first,
// dus een oude core mag nooit een scherm kunnen legen.
ok(/function tkSleepHours\(v\)\{[\s\S]{0,200}CalcCore\.normalizeSleepHours\(v\) : v;/.test(html),
   'tkSleepHours valt terug op de ruwe waarde als de engine-functie ontbreekt');
ok(html.indexOf('CalcCore.sleepToHours?CalcCore.sleepToHours(slpH,slpM)') >= 0,
   'de check-in schrijft via CalcCore.sleepToHours, met terugval');
ok(html.indexOf('const slaapUur=tkSleepHours(slaapUren);') >= 0,
   'dagfactor normaliseert één keer, vóór slaapDagFactor én calculateDayFactor');
ok(html.indexOf('value:tkSleepHours(p.value)') >= 0,
   'de slaapgrafiek normaliseert de reeks vóór weergave');

console.log('\n  ' + pass + ' geslaagd, ' + fail + ' gefaald');
if (fail) process.exit(1);
