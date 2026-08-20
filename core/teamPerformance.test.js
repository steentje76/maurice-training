/* TrainingKompas — Team Performance Core test suite (node, standalone).
 * Draai: node core/teamPerformance.test.js */
const fs = require('fs');
const path = require('path');
const T2 = require('./teamPerformance.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

console.log('\n👥 Team Performance Core');

console.log('\n[A] aggregateMetric — pure statistiek');
T('min/max/avg/count correct', () => {
  const s = T2.aggregateMetric([{ athleteId: 'a', value: 10 }, { athleteId: 'b', value: 20 }, { athleteId: 'c', value: 30 }]);
  eq(s.count, 3); eq(s.min, 10); eq(s.max, 30); eq(s.avg, 20);
});
T('lege/ongeldige waarden genegeerd', () => {
  const s = T2.aggregateMetric([{ athleteId: 'a', value: NaN }, { athleteId: 'b', value: null }, { athleteId: 'c', value: 5 }]);
  eq(s.count, 1); eq(s.avg, 5);
});
T('volledig lege input -> alles null, count 0, geen crash', () => {
  const s = T2.aggregateMetric([]);
  eq(s.count, 0); eq(s.min, null); eq(s.max, null); eq(s.avg, null);
});

console.log('\n[B] buildAttentionFlags — filtert reeds-berekende waarden, rekent zelf niets');
T('rode readiness triggert een flag', () => {
  const flags = T2.buildAttentionFlags([{ athleteId: 'a1', readinessCls: 'r', completionRate: 0.9 }]);
  eq(flags.length, 1);
  eq(flags[0].athleteId, 'a1');
});
T('lage completionRate triggert een flag (default drempel 0.6)', () => {
  const flags = T2.buildAttentionFlags([{ athleteId: 'a1', readinessCls: 'g', completionRate: 0.3 }]);
  eq(flags.length, 1);
});
T('aangepaste drempel wordt gerespecteerd', () => {
  const flags = T2.buildAttentionFlags([{ athleteId: 'a1', readinessCls: 'g', completionRate: 0.7 }], 0.8);
  eq(flags.length, 1, 'met drempel 0.8 moet 0.7 wél flaggen');
});
T('atleet kan MEERDERE flags krijgen (rood + lage completion tegelijk)', () => {
  const flags = T2.buildAttentionFlags([{ athleteId: 'a1', readinessCls: 'r', completionRate: 0.1 }]);
  eq(flags.length, 2);
});
T('groene readiness + hoge completion -> geen flags', () => {
  const flags = T2.buildAttentionFlags([{ athleteId: 'a1', readinessCls: 'g', completionRate: 0.95 }]);
  eq(flags.length, 0);
});
T('lege/ongeldige input -> lege lijst', () => {
  eq(T2.buildAttentionFlags([null, {}, undefined]).length, 0);
  eq(T2.buildAttentionFlags(null).length, 0);
});

console.log('\n[C] buildTeamSummary — combineert bovenstaande, geen nieuwe berekening');
T('volledige samenvatting met verdeling, completion en flags', () => {
  const s = T2.buildTeamSummary({
    teamId: 't1',
    athleteStates: [
      { athleteId: 'a1', readinessCls: 'g', completionRate: 0.9 },
      { athleteId: 'a2', readinessCls: 'r', completionRate: 0.4 },
      { athleteId: 'a3', readinessCls: 'y', completionRate: 0.8 }
    ]
  });
  eq(s.teamId, 't1');
  eq(s.readinessDistribution.g, 1);
  eq(s.readinessDistribution.r, 1);
  eq(s.readinessDistribution.y, 1);
  eq(s.completion.count, 3);
  ok(s.attentionFlags.length >= 1);
});
T('lege input -> veilige lege summary, geen crash', () => {
  const s = T2.buildTeamSummary({});
  eq(s.teamId, null);
  eq(s.completion.count, 0);
  eq(s.attentionFlags.length, 0);
});

console.log('\n[D] Architecture guards');
T('team-performance-core rekent zelf geen readiness/1RM/load (uitsluitend aggregatie van bestaande waarden)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'teamPerformance.js'), 'utf8');
  ['calculateDayFactor', 'calculate1RM', 'trainReadiness', 'document.', 'supabase', 'fetch(', 'localStorage'].forEach(tok => {
    ok(src.indexOf(tok) === -1, 'verboden/onverwacht token gevonden: ' + tok);
  });
});

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
if (fail === 0) console.log('✅ Alle Team Performance-tests groen.');
else process.exit(1);
