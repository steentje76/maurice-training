/* L1.6D — canonieke handoff + completion bridge.
 * ROOT_CAUSE_A: liveWorkoutToActual bestaat maar wordt niet aangeroepen.
 * ROOT_CAUSE_B: canonieke cm heeft geen handoff naar de execution owner.
 * Toetst de ECHTE productiecode uit index.html plus de echte converter. */
const fs = require('fs'); const path = require('path');
const C2L = require(path.resolve('core/concept2Live.js'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + b + ', kreeg ' + a + ')');
const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
function body(name) {
  const m = new RegExp('function\\s+' + name + '\\s*\\(').exec(html);
  if (!m) return null;
  const s = html.indexOf('{', m.index); let d = 0;
  for (let i = s; i < html.length; i++) { if (html[i] === '{') d++; else if (html[i] === '}') { d--; if (!d) return html.slice(s, i + 1); } }
  return null;
}

// ── A. NEUTRALE HANDOFF vanaf de canonieke producer ────────────────────────
const conn = body('tkErgConnectDevice');
ok(conn !== null, 'A0: tkErgConnectDevice gevonden');
ok(/tkErgOnCanonicalMeasurement\(exId, ?cm\)/.test(conn), 'A1: neutrale uitgaande aanroep met exId + cm');
// de BLE-laag blijft ontkoppeld: dit spiegelt de bestaande isolatie-guard
['sessionLog','activeInstanceId','finishSession','resetSession','currentWorkoutElapsedMs'].forEach(n =>
  ok(conn && !conn.includes(n), 'A2: tkErgConnectDevice noemt "' + n + '" NIET'));
ok(conn && conn.indexOf('st.lastCm=cm') < conn.indexOf('tkErgOnCanonicalMeasurement'), 'A3: handoff staat bij de canonieke producer');

// ── B. EXECUTION CONSUMER buiten de BLE-laag ──────────────────────────────
const cons = body('tkErgOnCanonicalMeasurement');
ok(cons !== null, 'B1: tkErgOnCanonicalMeasurement bestaat');
ok(cons && /sessionLog\[exId\]\.c2\s*=\s*cm/.test(cons), 'B2: schrijft de canonieke cm naar sessionLog[exId].c2');
ok(cons && /if\(!sessionLog\[exId\]\)/.test(cons), 'B3: bestaande sessionLog-properties blijven behouden');
ok(cons && !/liveWorkoutToActual|writeSessionRow|sbPost/.test(cons), 'B4: consumer doet geen conversie of persistentie');
ok(cons && !/lastCm|_c2pair/.test(cons), 'B5: consumer leest niet uit presentatiestate');

// ── C. COMPLETION BRIDGE in finishSession ─────────────────────────────────
const fin = html.slice(html.indexOf('async function finishSession()'), html.indexOf('async function finishSession()') + 9000);
ok(/liveWorkoutToActual/.test(fin), 'C1: finishSession roept liveWorkoutToActual aan');
ok(/l\.c2/.test(fin), 'C2: finishSession leest de execution-owned summary l.c2');
ok(!/_c2pair|lastCm/.test(fin), 'C3: finishSession leest NIET uit _c2pair of lastCm');
ok(/cardioDataToRow/.test(fin), 'C4: handmatige cardio-pad blijft bestaan');
ok(fin.indexOf('liveWorkoutToActual') < fin.indexOf('await writeSessionRow'), 'C5: conversie vóór de write');
ok(/_c2ok/.test(fin), 'C6: expliciete eligibility-guard (fail closed)');

// ── D. CONVERTER-CONTRACT: wat writeSessionRow ontvangt ───────────────────
const S = { machineType:'skierg', distance_m:2000, duration_s:480, watts:210, stroke_rate_spm:34, heart_rate_bpm:152, drag_factor:118 };
const out = C2L.liveWorkoutToActual(S, { date:'2026-09-20', training_type:'duur', training_instance_id:'inst-7' });
eq(out.row.distance, 2000, 'D1: distance gemeten');
ok(typeof out.row.time_str === 'string' && out.row.time_str.length > 0, 'D2: duur als time_str');
eq(out.row.watt, 210, 'D3: watts gemeten');
eq(out.row.stroke_rate, 34, 'D4: stroke rate gemeten');
eq(out.row.exercise_id, 'skierg', 'D5: SkiErg-identiteit, geen RowErg-fallback');
eq(out.row.training_instance_id, 'inst-7', 'D6: training_instance_id behouden');
eq(out.row.rpe, null, 'D7: RPE blijft user-owned');
eq(out.provenance.watts_source, 'concept2_measured', 'D8: measured provenance');
ok(/hr 152/.test(out.row.note) && /drag 118/.test(out.row.note), 'D9: HR en drag in de note');
{ const b = C2L.liveWorkoutToActual({ machineType:'bikeerg', distance_m:5000, duration_s:600 }, {});
  eq(b.row.exercise_id, 'bikeerg', 'D10: BikeErg-identiteit');
  eq(b.provenance.watts_source, 'concept2_derived', 'D11: zonder gemeten watt -> derived');
  const r = C2L.liveWorkoutToActual({ machineType:'rowerg' }, {});
  eq(r.row.distance, null, 'D12: geen afstand -> null, niets verzonnen');
  eq(r.row.watt, null, 'D13: geen watt -> null, niets verzonnen'); }
console.log('Concept2 execution logging: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
