/* TrainingKompas — Adaptive Coaching Core test suite (node, standalone).
 * Draai: node core/adaptiveCoaching.test.js */
const fs = require('fs');
const path = require('path');
const A = require('./adaptiveCoaching.js');
const DecisionCore = require('./decision.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

console.log('\n🎯 Adaptive Coaching Core');

console.log('\n[A] buildAdjustment — regels zijn uitlegbaar en deterministisch');
T('rode readiness -> HIGH_FATIGUE, -2.5%', () => {
  const adj = A.buildAdjustment({ id: 'p1' }, { readinessCls: 'r' });
  eq(adj.rule, 'HIGH_FATIGUE');
  eq(adj.action, 'reduce_intensity');
  eq(adj.magnitudePct, -2.5);
  ok(adj.reason && adj.reason.length > 0, 'iedere aanpassing MOET een reason hebben');
});
T('gele readiness -> MODERATE_FATIGUE, geen verlaging', () => {
  const adj = A.buildAdjustment({ id: 'p1' }, { readinessCls: 'y' });
  eq(adj.rule, 'MODERATE_FATIGUE');
  eq(adj.magnitudePct, 0);
});
T('groene readiness + hoge recente RPE -> HIGH_RPE_TREND ondanks groen', () => {
  const adj = A.buildAdjustment({ id: 'p1' }, { readinessCls: 'g', recentRpeAvg: 9.2 });
  eq(adj.rule, 'HIGH_RPE_TREND');
  eq(adj.magnitudePct, -5);
});
T('groene readiness, normale RPE -> NORMAL, uitvoeren zoals voorgeschreven', () => {
  const adj = A.buildAdjustment({ id: 'p1' }, { readinessCls: 'g', recentRpeAvg: 7 });
  eq(adj.rule, 'NORMAL');
  eq(adj.action, 'proceed_as_prescribed');
});
T('geen prescription -> null, geen crash', () => {
  eq(A.buildAdjustment(null, { readinessCls: 'r' }), null);
});
T('default source is automatic bij ongeldige/ontbrekende source', () => {
  const adj = A.buildAdjustment({ id: 'p1' }, { readinessCls: 'g' }, 'iets_ongeldigs');
  eq(adj.source, 'automatic');
  eq(adj.overridable, true);
});
T('deterministisch: zelfde input -> zelfde output', () => {
  const a = A.buildAdjustment({ id: 'p1' }, { readinessCls: 'r' });
  const b = A.buildAdjustment({ id: 'p1' }, { readinessCls: 'r' });
  eq(JSON.stringify(a), JSON.stringify(b));
});

console.log('\n[B] applyCoachOverride — coach kan altijd overrulen, origineel blijft bewaard');
T('override vervangt actie maar bewaart het automatische origineel', () => {
  const auto = A.buildAdjustment({ id: 'p1' }, { readinessCls: 'r' });
  const overridden = A.applyCoachOverride(auto, 'proceed_as_prescribed', 0, 'Sporter voelt zich prima, negeer het HRV-signaal vandaag.');
  eq(overridden.action, 'proceed_as_prescribed');
  eq(overridden.source, 'coach_overridden');
  eq(overridden.overridable, false, 'een overruled aanpassing is zelf niet opnieuw automatisch overschrijfbaar');
  eq(overridden.automaticOriginal.action, 'reduce_intensity');
  eq(overridden.automaticOriginal.magnitudePct, -2.5);
});
T('override zonder reden krijgt een default-reden (nooit een lege reason)', () => {
  const auto = A.buildAdjustment({ id: 'p1' }, { readinessCls: 'g' });
  const overridden = A.applyCoachOverride(auto, 'reduce_intensity', -10);
  ok(overridden.reason && overridden.reason.length > 0);
});
T('override op null -> null, geen crash', () => {
  eq(A.applyCoachOverride(null, 'x', 0, 'y'), null);
});

console.log('\n[C] Live koppeling met bestaande DecisionCore (geen losstaand duplicaat readiness-model)');
T('AdaptiveCoachingCore accepteert direct de cls uit DecisionCore.trainReadiness()', () => {
  const readiness = DecisionCore.trainReadiness({ factor: 0.80 });  // laag genoeg voor 'r' volgens bestaande thresholds
  eq(readiness.cls, 'r');
  const adj = A.buildAdjustment({ id: 'p1' }, { readinessCls: readiness.cls });
  eq(adj.rule, 'HIGH_FATIGUE');
});
T('readiness.cls "g" uit de echte DecisionCore leidt tot NORMAL (zonder RPE-signaal)', () => {
  const readiness = DecisionCore.trainReadiness({ factor: 1.05 });
  eq(readiness.cls, 'g');
  const adj = A.buildAdjustment({ id: 'p1' }, { readinessCls: readiness.cls });
  eq(adj.rule, 'NORMAL');
});

console.log('\n[D] Architecture guards');
T('adaptive-coaching-core rekent zelf geen 1RM/werkgewicht/dagfactor (die blijven bij CalcCore/DecisionCore)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'adaptiveCoaching.js'), 'utf8');
  ['calculate1RM', 'calculateWorkingWeight', 'calculateDayFactor', 'document.', 'supabase', 'fetch(', 'localStorage'].forEach(tok => {
    ok(src.indexOf(tok) === -1, 'verboden/onverwacht token gevonden: ' + tok);
  });
});
T('iedere regel in ADJUSTMENT_RULES heeft een niet-lege explanation (uitlegbaarheidseis)', () => {
  const A2 = require('./adaptiveCoaching.js');
  // indirecte check via alle vier bekende scenario's, elk met eigen regel:
  [{ readinessCls: 'r' }, { readinessCls: 'y' }, { readinessCls: 'g', recentRpeAvg: 9.5 }, { readinessCls: 'g', recentRpeAvg: 5 }]
    .forEach(inp => { const a = A2.buildAdjustment({ id: 'x' }, inp); ok(a.reason && a.reason.length > 10, 'te korte/lege reason voor regel ' + a.rule); });
});
T('listRuleIds bevat alle 4 regels inclusief de fallback NORMAL', () => {
  const ids = A.listRuleIds();
  eq(ids.length, 4);
  ok(ids.indexOf('NORMAL') !== -1);
});

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
if (fail === 0) console.log('✅ Alle Adaptive Coaching-tests groen.');
else process.exit(1);
