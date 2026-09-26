/* L1.7 — drie-machine logging roundtrip.
 * Voert de ECHTE productieketen uit: de handoff-consumer en de completion-bridge
 * worden letterlijk uit index.html gehaald, de converter is de echte module.
 * Geen nabouw, geen tweede store, geen fabricage. */
const fs = require('fs'); const path = require('path');
const C2L = require(path.resolve('core/concept2Live.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')');
const html = fs.readFileSync(path.resolve('index.html'), 'utf8');

// ── de ECHTE handoff-consumer uit index.html ──────────────────────────────
const consSrc = html.match(/function tkErgOnCanonicalMeasurement\(exId, cm\)\{[\s\S]*?\n\}/)[0];
function makeWorld() {
  const sessionLog = {};
  const handoff = new Function('sessionLog', consSrc + '\nreturn tkErgOnCanonicalMeasurement;')(sessionLog);
  return { sessionLog, handoff };
}
// ── de ECHTE completion-bridge (rij-constructie) uit finishSession ────────
const _bs = html.indexOf('var _c2s=l.c2;');
const _be = html.indexOf('cRow=cardioDataToRow(l.cardio.type,l.cardio);', _bs);
const bridgeSrc = html.slice(_bs, html.indexOf('}', _be) + 1);
// FASE 2A: de bridge draait nu met de ECHTE browserbinding. Eerder injecteerde deze harness een
// bare `liveWorkoutToActual`, die in de browser niet bestaat -- dat maskeerde dat de Concept2-tak
// in productie onbereikbaar was. Nu alleen Concept2Live (zoals in index.html geladen) + de echte
// helpers uit index.html; geen bare converter meer in scope.
const helperSrc = ['tkC2IsLoggableSummary', 'tkC2Converter', 'tkC2SessionRowFromLog'].map(function (n) {
  return html.match(new RegExp('function ' + n + '\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'))[0];
}).join('\n');
function buildRow(l, today, t, instanceId) {
  return new Function('l', 'today', 't', 'activeInstanceId', 'Concept2Live', 'cardioDataToRow',
    helperSrc + '\n' + bridgeSrc + '\nreturn {row:cRow, viaC2:_c2ok};')(
      l, today, t, instanceId, C2L,
      function () { return { __manual: true, extraNote: 'handmatig' }; });
}
ok(!/typeof liveWorkoutToActual/.test(bridgeSrc), 'FASE2A: bridge gebruikt geen bare liveWorkoutToActual-global (bestaat niet in de browser)');

// ── fixtures met onderscheidende waarden per machine ──────────────────────
const M = {
  rowerg: { machineType:'rowerg', distance_m:2000, duration_s:420, watts:240, stroke_rate_spm:30, heart_rate_bpm:150, drag_factor:125 },
  skierg: { machineType:'skierg', distance_m:1500, duration_s:390, watts:205, stroke_rate_spm:36, heart_rate_bpm:148, drag_factor:115 },
  bikeerg:{ machineType:'bikeerg', distance_m:5000, duration_s:600, watts:190, stroke_rate_spm:85, heart_rate_bpm:145 }
};
const EXID = { rowerg:'roeien', skierg:'skierg', bikeerg:'bikeerg' };

// ── C/D/E. drie onafhankelijke ketens ─────────────────────────────────────
const persisted = {};
Object.keys(M).forEach(function (mt) {
  const w = makeWorld(); const exId = EXID[mt]; const sum = M[mt];
  w.handoff(exId, sum);                                    // canonieke cm -> execution owner
  eq(w.sessionLog[exId].c2, sum, mt + ': handoff legt cm bij sessionLog[exId].c2');
  const built = buildRow(w.sessionLog[exId], '2026-09-20', 'duur', 'inst-' + mt);
  const row = built.row;
  ok(built.viaC2 === true, mt + ': completion gebruikt de Concept2-tak, niet cardioDataToRow');
  ok(!row.__manual, mt + ': geen handmatige rij');
  eq(row.distance, sum.distance_m, mt + ': distance');
  ok(typeof row.time_str === 'string' && row.time_str.length > 0, mt + ': duur als time_str');
  eq(row.watt, sum.watts, mt + ': watts gemeten');
  eq(row.stroke_rate, sum.stroke_rate_spm, mt + ': cadence/stroke rate behouden');
  eq(row.rpe, null, mt + ': RPE blijft user-owned');
  ok(new RegExp('hr ' + sum.heart_rate_bpm).test(row.extraNote), mt + ': HR in de note');
  if (sum.drag_factor != null) ok(new RegExp('drag ' + sum.drag_factor).test(row.extraNote), mt + ': drag factor in de note');
  // de omliggende write levert identiteit aan; bewijs die via de converter zelf
  const prov = C2L.liveWorkoutToActual(sum, {}).provenance;
  eq(prov.exerciseId, exId, mt + ': canonieke oefening-identiteit ' + exId);
  eq(prov.machineType, mt, mt + ': machineType behouden');
  eq(prov.watts_source, 'concept2_measured', mt + ': measured provenance');
  eq(prov.provider, 'concept2', mt + ': provider concept2');
  // persistentie-roundtrip: de rij zoals writeSessionRow hem krijgt
  persisted[mt] = Object.assign({ date:'2026-09-20', exercise_id:exId, training_type:'duur',
                                  training_instance_id:'inst-'+mt, note:row.extraNote }, row);
  delete persisted[mt].extraNote;
});

// ── F. identiteiten onderling onderscheidend ──────────────────────────────
ok(persisted.rowerg.exercise_id !== persisted.skierg.exercise_id &&
   persisted.skierg.exercise_id !== persisted.bikeerg.exercise_id, 'F1: drie verschillende oefening-identiteiten');
eq(persisted.bikeerg.exercise_id, 'bikeerg', 'F2: BikeErg wordt GEEN roeien');
eq(persisted.skierg.exercise_id, 'skierg', 'F3: SkiErg wordt GEEN roeien');

// ── H/I. reload/history: pace wordt afgeleid, niet opgeslagen ─────────────
Object.keys(M).forEach(function (mt) {
  const r = persisted[mt];
  eq(r.distance, M[mt].distance_m, mt + ': distance overleeft de roundtrip');
  eq(r.watt, M[mt].watts, mt + ': watts overleven de roundtrip');
  eq(r.stroke_rate, M[mt].stroke_rate_spm, mt + ': cadence overleeft de roundtrip');
  eq(r.training_instance_id, 'inst-' + mt, mt + ': training_instance_id behouden');
  const basis = (mt === 'bikeerg') ? 1000 : 500;
  ok(new RegExp('split:.*/' + (basis === 1000 ? '1000m' : '500m')).test(r.note),
     mt + ': split in de note op de juiste basis (' + basis + ' m)');
});

// ── J. geen gefabriceerde split-rijen ─────────────────────────────────────
Object.keys(M).forEach(function (mt) {
  const r = persisted[mt];
  ok(!('laps' in r) && !('splits' in r) && !('activity_laps' in r), mt + ': geen gefabriceerde split-rijen');
});

// ── K. negatieve/isolatie-matrix ──────────────────────────────────────────
{ const w = makeWorld();                                   // A/B/C kruisbesmetting
  w.handoff('roeien', M.rowerg); w.handoff('skierg', M.skierg); w.handoff('bikeerg', M.bikeerg);
  eq(w.sessionLog.roeien.c2.distance_m, 2000, 'K-A: RowErg lekt niet naar SkiErg');
  eq(w.sessionLog.skierg.c2.distance_m, 1500, 'K-B: SkiErg lekt niet naar BikeErg');
  eq(w.sessionLog.bikeerg.c2.distance_m, 5000, 'K-C: BikeErg lekt niet naar RowErg'); }
{ const w = makeWorld(); w.handoff('roeien', M.rowerg);    // D nieuwe executie
  Object.keys(w.sessionLog).forEach(k => delete w.sessionLog[k]);   // startT-reset
  ok(!w.sessionLog.roeien, 'K-D: na executie-reset is oude .c2 onbeschikbaar'); }
{ const w = makeWorld();                                    // G/H leeg en partieel
  const g = buildRow({ c2:{}, cardio:{type:'rowing'} }, '2026-09-20', 'duur', null);
  ok(g.viaC2 === false, 'K-G: lege summary -> fail closed, handmatig pad');
  const p = buildRow({ c2:{ machineType:'rowerg', distance_m:1000 } }, '2026-09-20', 'duur', null);
  eq(p.row.watt, null, 'K-H: ontbrekende watt blijft null, niets verzonnen');
  eq(p.row.stroke_rate, null, 'K-H: ontbrekende cadence blijft null'); }
{ const m = buildRow({ cardio:{type:'rowing'} }, '2026-09-20', 'duur', null);   // J handmatig
  ok(m.viaC2 === false && m.row.__manual === true, 'K-J: zonder .c2 blijft het handmatige pad'); }
{ const w = makeWorld(); w.handoff('roeien', M.rowerg);    // I handmatig object onaangeroerd
  w.sessionLog.roeien.cardio = { type:'rowing', time:'7:00' };
  const b = buildRow(w.sessionLog.roeien, '2026-09-20', 'duur', null);
  ok(b.viaC2 === true, 'K-I: geldige .c2 wint van handmatige cardio');
  eq(w.sessionLog.roeien.cardio.time, '7:00', 'K-I: handmatig object blijft ongewijzigd'); }
{ const w = makeWorld(); w.handoff('roeien', M.rowerg);    // K/L/N mislukte write, retry, disconnect
  ok(w.sessionLog.roeien.c2, 'K-K: .c2 behouden na mislukte write');
  const r1 = buildRow(w.sessionLog.roeien, '2026-09-20', 'duur', null);
  const r2 = buildRow(w.sessionLog.roeien, '2026-09-20', 'duur', null);
  eq(r1.row.distance, r2.row.distance, 'K-L: retry levert dezelfde canonieke waarden');
  ok(w.sessionLog.roeien.c2, 'K-N: disconnect raakt execution-owned .c2 niet'); }
{ const w = makeWorld();                                   // O nieuwe generatie/meting
  w.handoff('roeien', M.rowerg);
  w.handoff('roeien', Object.assign({}, M.rowerg, { distance_m: 2500 }));
  eq(w.sessionLog.roeien.c2.distance_m, 2500, 'K-O: laatste canonieke meting wint binnen dezelfde executie'); }
console.log('Concept2 three-machine logging: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
