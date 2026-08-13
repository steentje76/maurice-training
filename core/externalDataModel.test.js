/* TrainingKompas — External Data Model Core test suite (node, standalone).
 * Draai: node core/externalDataModel.test.js */
const fs = require('fs');
const path = require('path');
const E = require('./externalDataModel.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

console.log('\n🌐 External Data Model Core');

console.log('\n[A] buildExternalConnection — NOOIT tokens, uitsluitend metadata');
T('geldige connectie wordt genormaliseerd', () => {
  const c = E.buildExternalConnection({ athleteId: 'u1', provider: 'garmin', status: 'active', scopes: ['activities'], connectedAt: 't1' });
  eq(c.provider, 'garmin');
  eq(c.status, 'active');
  eq(c.scopes.length, 1);
});
T('onbekende provider -> null-provider, geen giswerk', () => {
  const c = E.buildExternalConnection({ athleteId: 'u1', provider: 'fitbit_onbekend' });
  eq(c.provider, null);
});
T('ongeldige status valt terug op pending', () => {
  const c = E.buildExternalConnection({ athleteId: 'u1', provider: 'strava', status: 'iets_raars' });
  eq(c.status, 'pending');
});
T('NOOIT een accessToken/refreshToken-veld in het model (architecture guard)', () => {
  const c = E.buildExternalConnection({ athleteId: 'u1', provider: 'whoop', accessToken: 'geheim123', refreshToken: 'geheim456' });
  ok(!('accessToken' in c));
  ok(!('refreshToken' in c));
});

console.log('\n[B] Typed record-constructors — hergebruiken CommonDataCore, geen eigen validatie');
T('heartRateSample geeft correct genormaliseerd record', () => {
  const r = E.heartRateSample({ source: 'garmin', sourceType: 'wearable', timestamp: 't1', value: 150 });
  ok(r);
  eq(r.recordType, 'heart_rate');
  eq(r.metric, 'heart_rate');
  eq(r.unit, 'bpm');
});
T('hrvSample geeft correct genormaliseerd record', () => {
  const r = E.hrvSample({ source: 'whoop', sourceType: 'wearable', timestamp: 't1', value: 55 });
  eq(r.recordType, 'hrv');
  eq(r.unit, 'ms');
});
T('weightRecord gebruikt de canonieke load/kg-metric', () => {
  const r = E.weightRecord({ source: 'health_connect', sourceType: 'health_platform', timestamp: 't1', value: 82.5 });
  eq(r.recordType, 'weight');
  eq(r.unit, 'kg');
});
T('vo2MaxRecord gebruikt de nieuwe vo2max-canonical-metric', () => {
  const r = E.vo2MaxRecord({ source: 'garmin', sourceType: 'wearable', timestamp: 't1', value: 52 });
  eq(r.recordType, 'vo2max');
  eq(r.unit, 'ml_per_kg_per_min');
});
T('ongeldige/onbekende invoer -> null, geen crash', () => {
  eq(E.heartRateSample(null), null);
  eq(E.heartRateSample({}), null);
});
T('typed records blijven volledig compatibel met CommonDataCore.mergeDataPoints (geen los duplicaat-formaat)', () => {
  const CommonDataCore = require('./commonData.js');
  const a = E.heartRateSample({ source: 's', sourceType: 'wearable', timestamp: 't1', value: 150 });
  const b = E.heartRateSample({ source: 's', sourceType: 'wearable', timestamp: 't1', value: 155 });
  const merged = CommonDataCore.mergeDataPoints([a, b]);
  eq(merged.length, 1);
  eq(merged[0].value, 155);
});

console.log('\n[C] sleepRecord — optionele stadia');
T('zonder stadia (bv. provider zonder detailed sleep staging)', () => {
  const r = E.sleepRecord({ source: 'health_connect', sourceType: 'health_platform', timestamp: 't1', value: 7.5 });
  eq(r.recordType, 'sleep');
  eq(r.stages, null);
});
T('met stadia (bv. Apple Watch/Health Connect met detailed staging)', () => {
  const r = E.sleepRecord(
    { source: 'apple_healthkit', sourceType: 'health_platform', timestamp: 't1', value: 7.5 },
    { remSeconds: 5400, deepSeconds: 3600, coreSeconds: 14400, awakeSeconds: 600 }
  );
  eq(r.stages.remSeconds, 5400);
  eq(r.stages.deepSeconds, 3600);
});

console.log('\n[D] recoverySignal — EXPLICIET geen TrainingKompas-readiness (roadmap-principe #3)');
T('geldig signaal, altijd isTrainingKompasReadiness=false', () => {
  const r = E.recoverySignal({ provider: 'whoop', providerScoreLabel: 'WHOOP Recovery', value: 42, scaleMin: 0, scaleMax: 100, timestamp: 't1' });
  eq(r.isTrainingKompasReadiness, false);
  eq(r.providerScoreLabel, 'WHOOP Recovery');
  eq(r.value, 42);
});
T('default label is "recovery" als geen providerScoreLabel meegegeven', () => {
  const r = E.recoverySignal({ provider: 'garmin', value: 70, timestamp: 't1' });
  eq(r.providerScoreLabel, 'recovery');
});
T('ontbrekende verplichte velden -> null', () => {
  eq(E.recoverySignal({ provider: 'whoop' }), null);
  eq(E.recoverySignal(null), null);
});
T('isTrainingKompasReadiness kan NIET van buitenaf overschreven worden naar true', () => {
  const r = E.recoverySignal({ provider: 'whoop', value: 90, timestamp: 't1', isTrainingKompasReadiness: true });
  eq(r.isTrainingKompasReadiness, false, 'moet hard-coded false blijven, ongeacht invoer');
});

console.log('\n[E] externalWorkout — groepeert samples, berekent zelf niets');
T('geldige workout met samples', () => {
  const s1 = E.heartRateSample({ source: 'garmin', sourceType: 'wearable', timestamp: 't1', value: 150 });
  const w = E.externalWorkout({ provider: 'garmin', externalId: 'ext1', athleteId: 'u1', sportType: 'running', startTimestamp: 't0', durationSeconds: 1800 }, [s1]);
  eq(w.recordType, 'external_workout');
  eq(w.samples.length, 1);
});
T('ontbrekende verplichte velden -> null', () => {
  eq(E.externalWorkout({ provider: 'garmin' }, []), null);
});
T('workout zonder samples -> lege samples-array, geen crash', () => {
  const w = E.externalWorkout({ provider: 'strava', startTimestamp: 't0' }, null);
  eq(w.samples.length, 0);
});

console.log('\n[F] Architecture guards');
T('external-data-model-core bevat geen DOM/DB/AI/network-afhankelijkheid', () => {
  const src = fs.readFileSync(path.join(__dirname, 'externalDataModel.js'), 'utf8');
  ['document.', 'window.fetch', 'supabase', 'XMLHttpRequest', 'localStorage', 'Math.random'].forEach(tok => {
    ok(src.indexOf(tok) === -1, 'verboden token gevonden: ' + tok);
  });
});
T('hergebruikt CommonDataCore i.p.v. eigen normalisatie te dupliceren', () => {
  const src = fs.readFileSync(path.join(__dirname, 'externalDataModel.js'), 'utf8');
  ok(src.indexOf('CommonDataCore.normalizeDataPoint') !== -1, 'moet CommonDataCore.normalizeDataPoint hergebruiken');
  ok(src.indexOf('CommonDataCore.mergeDataPoints') !== -1, 'moet CommonDataCore.mergeDataPoints hergebruiken voor externalWorkout');
});

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
if (fail === 0) console.log('✅ Alle External Data Model-tests groen.');
else process.exit(1);
