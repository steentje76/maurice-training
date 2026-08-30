/* fWomensPerformanceContext.test.js — MS-F8-03 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CC = require(path.join(ROOT, 'core/cycle.js'));
const WPC = require(path.join(ROOT, 'core/womensPerformanceContext.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Golden cases ----
{
  const geenTracking = WPC.build(true, CC.cycleContext([], '2026-08-29'), []);
  ok(geenTracking.enabled === false && Object.keys(geenTracking).length === 2,
    'A1: geen tracking-data -> uitsluitend {schema, enabled:false}');

  const periods = [{ start_date: '2026-08-01', end_date: '2026-08-05' }];
  const uitgeschakeld = WPC.build(false, CC.cycleContext(periods, '2026-08-29'), []);
  ok(uitgeschakeld.enabled === false && Object.keys(uitgeschakeld).length === 2,
    'A2: enabled=false -> geen enkel veld, zelfs met bestaande data');

  const ctx = CC.cycleContext(periods, '2026-08-29');
  const metSymptomen = WPC.build(true, ctx, [{ log_date: '2026-08-29', symptoms: { cramps: 4 } }]);
  ok(metSymptomen.enabled === true && metSymptomen.cycle.voldoende_data_voor_voorspelling === false,
    'A3: 1 cyclus -> onvoldoende voor voorspelling');
  ok(metSymptomen.cycle.geschatte_volgende_periode === null,
    'A4: geschatte_volgende_periode is null zolang onvoldoende data');
  ok(metSymptomen.recent_symptoms.severity.cramps === 4, 'A5: symptomen correct doorgegeven');
}

// ---- B. Whitelist-garantie (uitsluitend de DATA-velden, niet de eigen
//         instructietekst 'forbidden_ai_use'/'limitations' die deze termen
//         bewust noemt als verbod) ----
{
  const ctxMetData = CC.cycleContext([{ start_date: '2026-07-01', end_date: '2026-07-05' }, { start_date: '2026-07-29', end_date: '2026-08-02' }], '2026-08-29');
  const output = WPC.build(true, ctxMetData, [{ log_date: '2026-08-29', symptoms: { cramps: 2 } }]);
  const dataOnly = JSON.stringify({ schema: output.schema, enabled: output.enabled, cycle: output.cycle, recent_symptoms: output.recent_symptoms }).toLowerCase();
  ok(!dataOnly.includes('hormoon') && !dataOnly.includes('estrogen') && !dataOnly.includes('progesteron'),
    'B1: nooit een hormoonveld in de datavelden');
  ok(!dataOnly.includes('fertil') && !dataOnly.includes('ovulatiekans') && !dataOnly.includes('conceptie'),
    'B2: nooit een fertility-veld in de datavelden');
  ok(!dataOnly.includes('diagnos'), 'B3: nooit een diagnose-veld in de datavelden');
  ok(!dataOnly.includes('contracept') && !dataOnly.includes('zwanger') && !dataOnly.includes('menopauz'),
    'B4: geen enkel veld voor de DEFER-domeinen');
}

// ---- C. Hergebruik, geen duplicatie ----
ok(!Object.keys(WPC).some(function (k) { return /cycleContext|cycleDay|averageCycleLength|estimatedNextPeriod/.test(k); }),
  'C1: WomensPerformanceContextCore herimplementeert geen cyclusberekeningslogica zelf');

// ---- D. Provenance altijd expliciet ----
{
  const ctx = CC.cycleContext([{ start_date: '2026-07-01', end_date: '2026-07-05' }, { start_date: '2026-07-29', end_date: '2026-08-02' }], '2026-08-29');
  const output = WPC.build(true, ctx, [{ log_date: '2026-08-29', symptoms: { fatigue: 3 } }]);
  ok(output.cycle.provenance === 'derived_estimate', 'D1: cyclus-context expliciet gelabeld als derived_estimate');
  ok(output.recent_symptoms.provenance === 'athlete_reported', 'D2: symptomen expliciet gelabeld als athlete_reported');
}

// ---- E. MS-F8-04-heraudit: hormonale anticonceptie onderdrukt de faseschatting ----
{
  const ctx = CC.cycleContext([{ start_date: '2026-07-01', end_date: '2026-07-05' }, { start_date: '2026-07-29', end_date: '2026-08-02' }], '2026-08-29');
  const zonderContraceptie = WPC.build(true, ctx, [], null);
  ok(zonderContraceptie.cycle.geschatte_fase !== null, 'E1: zonder opgegeven anticonceptie blijft de faseschatting ongewijzigd getoond (backwards-compatible)');
  const metHormonaal = WPC.build(true, ctx, [], 'hormonal');
  ok(metHormonaal.cycle.geschatte_fase === null, 'E2: bij hormonale anticonceptie wordt de faseschatting bewust onderdrukt (null), niet een mogelijk misleidende schatting getoond');
  ok(metHormonaal.cycle.fase_schatting_onderdrukt_reden === 'hormonale_anticonceptie_maakt_natuurlijke_fase_schatting_onbetrouwbaar',
    'E3: de reden voor onderdrukking is expliciet vastgelegd');
  const metNietHormonaal = WPC.build(true, ctx, [], 'non_hormonal');
  ok(metNietHormonaal.cycle.geschatte_fase !== null, 'E4: bij niet-hormonale anticonceptie blijft de natuurlijke-cyclus-faseschatting van toepassing');
  const hormonaalDataOnly = JSON.stringify(metHormonaal.cycle).toLowerCase();
  ok(!hormonaalDataOnly.includes('advies') && !hormonaalDataOnly.includes('effectiviteit'),
    'E5: geen enkel contraceptie-advies of effectiviteitsclaim in het cycle-datablok');
}

console.log('fWomensPerformanceContext: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
