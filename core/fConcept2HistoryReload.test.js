/* L1.7H — History/reload closure.
 * Neemt de rijen die de geverifieerde completion-keten schrijft, voert ze als
 * TERUGGELEZEN sessions-rijen in het ECHTE History-leespad cardioPerfFromSession(),
 * letterlijk uit index.html. Geen nabouw, geen nieuwe History-architectuur. */
const fs = require('fs'); const path = require('path');
const C2L = require(path.resolve('core/concept2Live.js'));
const CC = require(path.resolve('core/cardio.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')');
const html = fs.readFileSync(path.resolve('index.html'), 'utf8');

// ── het ECHTE History-leespad uit index.html ──────────────────────────────
const readSrc = html.match(/function cardioPerfFromSession\(s, cardioType\)\{[\s\S]*?\n\}/)[0];
const CARDIO_TYPES = { rowing:{calc:{basis:500}}, skierg:{calc:{basis:500}}, bikeerg:{calc:{basis:1000}} };
const cardioPerfFromSession = new Function('CardioCore', 'CARDIO_TYPES',
  readSrc + '\nreturn cardioPerfFromSession;')(CC, CARDIO_TYPES);

const M = {
  rowerg:  { sum:{ machineType:'rowerg',  distance_m:2000, duration_s:420, watts:240, stroke_rate_spm:30, heart_rate_bpm:150, drag_factor:125 }, ct:'rowing',  exId:'roeien',  basis:500 },
  skierg:  { sum:{ machineType:'skierg',  distance_m:1500, duration_s:390, watts:205, stroke_rate_spm:36, heart_rate_bpm:148, drag_factor:115 }, ct:'skierg',  exId:'skierg',  basis:500 },
  bikeerg: { sum:{ machineType:'bikeerg', distance_m:5000, duration_s:600, watts:190, stroke_rate_spm:85, heart_rate_bpm:145 },                  ct:'bikeerg', exId:'bikeerg', basis:1000 }
};

Object.keys(M).forEach(function (mt) {
  const f = M[mt];
  // 1) de completion-keten produceert de rij (al geverifieerd in L1.6D/L1.7)
  const conv = C2L.liveWorkoutToActual(f.sum, { date:'2026-09-20', training_type:'duur', training_instance_id:'inst-'+mt });
  // 2) RELOAD-GRENS: alleen wat daadwerkelijk in sessions staat gaat verder.
  //    Geen sessionLog, geen .c2, geen _c2pair, geen lastCm, geen BLE-state.
  const stored = { date:conv.row.date, exercise_id:conv.row.exercise_id, training_type:conv.row.training_type,
                   note:conv.row.note, distance:conv.row.distance, time_str:conv.row.time_str,
                   watt:conv.row.watt, stroke_rate:conv.row.stroke_rate, rpe:conv.row.rpe,
                   training_instance_id:conv.row.training_instance_id };
  eq(Object.keys(stored).filter(k => /sessionLog|c2|lastCm|_c2pair/.test(k)).length, 0,
     mt + ': de teruggelezen rij bevat geen transiënte state');
  // 3) het ECHTE History-leespad
  const perf = cardioPerfFromSession(stored, f.ct);
  ok(perf !== null, mt + ': History leest de rij');
  eq(perf.durationSec, f.sum.duration_s, mt + ': duur overleeft de reload');
  eq(perf.watts, f.sum.watts, mt + ': watts overleven de reload');
  eq(perf.date, '2026-09-20', mt + ': datum behouden');
  ok(String(perf.key).indexOf(f.exId) === 0, mt + ': History-key draagt de canonieke identiteit ' + f.exId);
  ok(String(perf.key).indexOf(String(f.sum.distance_m)) > -1, mt + ': History-key draagt de afstand');
  // split wordt AFGELEID uit afstand+tijd op de machine-basis, niet opgeslagen
  const verwacht = CC.splitFromDistTime(f.sum.distance_m, f.sum.duration_s, f.basis);
  eq(perf.splitSec, verwacht, mt + ': split afgeleid op basis ' + f.basis + ' m');
  ok(perf.splitSec != null && perf.splitSec > 0, mt + ': split is een reële waarde');
  // velden die het schema draagt en History doorgeeft
  eq(stored.stroke_rate, f.sum.stroke_rate_spm, mt + ': cadence in de gepersisteerde rij');
  eq(stored.training_instance_id, 'inst-'+mt, mt + ': training_instance_id in de rij');
  eq(stored.rpe, null, mt + ': RPE blijft user-owned');
  ok(new RegExp('hr ' + f.sum.heart_rate_bpm).test(stored.note), mt + ': HR bewaard in de note');
  if (f.sum.drag_factor != null) ok(new RegExp('drag ' + f.sum.drag_factor).test(stored.note), mt + ': drag bewaard in de note');
  ok(!('laps' in stored) && !('splits' in stored), mt + ': geen gefabriceerde split-rijen gepersisteerd');
});

// ── identiteiten blijven onderscheidend na reload ─────────────────────────
const keys = Object.keys(M).map(mt => cardioPerfFromSession(
  { date:'2026-09-20', exercise_id:M[mt].exId, distance:M[mt].sum.distance_m,
    time_str:'7:00', watt:M[mt].sum.watts }, M[mt].ct).key);
eq(new Set(keys).size, 3, 'IDENT: drie onderscheidende History-keys');
ok(keys[2].indexOf('bikeerg') === 0, 'IDENT: BikeErg blijft bikeerg, wordt geen roeien');

// ── transiënte-state-onafhankelijkheid van het leespad zelf ───────────────
['sessionLog', '_c2pair', 'lastCm', 'writeSessionRow'].forEach(n =>
  ok(readSrc.indexOf(n) === -1, 'TRANS: cardioPerfFromSession noemt "' + n + '" niet'));
console.log('Concept2 history reload: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
