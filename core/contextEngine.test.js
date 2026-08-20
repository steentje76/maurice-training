/* TrainingKompas — Context Engine Core test suite (node, standalone).
 * Draai: node core/contextEngine.test.js */
const fs = require('fs');
const path = require('path');
const ContextEngineCore = require('./contextEngine.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

console.log('\n🧭 Context Engine Core');

console.log('\n[A] buildStructuredContext — vorm, geen berekening/interpretatie');
T('volledige input -> volledige StructuredContext', () => {
  const c = ContextEngineCore.buildStructuredContext({
    athleteId: 'u1', level: 'gevorderd', sportId: 'crossfit', sportLabel: 'CrossFit/Functioneel',
    goal: 'PR backsquat', trainingPhase: 'opbouw', generatedAt: '2026-08-13T10:00:00Z'
  });
  eq(c.athlete.id, 'u1');
  eq(c.sport.id, 'crossfit');
  eq(c.goal, 'PR backsquat');
  eq(c.trainingPhase, 'opbouw');
  eq(c.membership, null, 'geen membership meegegeven -> null, geen verzonnen structuur');
  eq(c.version, ContextEngineCore.VERSIONS.context);
});
T('lege/undefined input -> veilige lege structuur, geen crash', () => {
  const c1 = ContextEngineCore.buildStructuredContext();
  eq(c1.athlete.id, null);
  eq(c1.sport.id, null);
  const c2 = ContextEngineCore.buildStructuredContext(null);
  eq(c2.athlete.id, null);
});
T('vandaag-gedrag (personal-only, geen membership) blijft ongewijzigd mogelijk', () => {
  const c = ContextEngineCore.buildStructuredContext({ athleteId: 'u1', sportId: 'kracht' });
  eq(c.membership, null);
});

console.log('\n[B] normalizeMembership');
T('geldige membership wordt genormaliseerd', () => {
  const m = ContextEngineCore.normalizeMembership({ organizationId: 'org1', teamId: 'team1', role: 'coach' });
  eq(m.organizationId, 'org1');
  eq(m.teamId, 'team1');
  eq(m.role, 'coach');
  eq(m.status, 'active', 'default status moet active zijn');
});
T('null/ontbrekend -> null (personal-only)', () => {
  eq(ContextEngineCore.normalizeMembership(null), null);
  eq(ContextEngineCore.normalizeMembership(undefined), null);
  eq(ContextEngineCore.normalizeMembership('geen object'), null);
});
T('default role is athlete', () => {
  const m = ContextEngineCore.normalizeMembership({ organizationId: 'org1' });
  eq(m.role, 'athlete');
});

console.log('\n[C] mergeAthleteContexts — Fase 10: meerdere sportcontexten, GEEN load-berekening hier');
T('meerdere unieke sporten -> allemaal in activeSports', () => {
  const merged = ContextEngineCore.mergeAthleteContexts([
    { sport: { id: 'crossfit' } }, { sport: { id: 'hardlopen' } }, { sport: { id: 'kracht' } }
  ]);
  eq(merged.activeSports.length, 3);
  eq(merged.primarySportId, 'crossfit');
  eq(merged.contextCount, 3);
});
T('duplicate sporten worden gededupliceerd in activeSports', () => {
  const merged = ContextEngineCore.mergeAthleteContexts([
    { sport: { id: 'crossfit' } }, { sport: { id: 'crossfit' } }
  ]);
  eq(merged.activeSports.length, 1);
  eq(merged.contextCount, 2, 'contextCount telt wel alle losse contexten, ook duplicaten');
});
T('lege/ongeldige contexten worden genegeerd, geen crash', () => {
  const merged = ContextEngineCore.mergeAthleteContexts([null, {}, { sport: {} }, undefined]);
  eq(merged.activeSports.length, 0);
  eq(merged.primarySportId, null);
});
T('mergeAthleteContexts berekent geen totale load/volume (architecture guard)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'contextEngine.js'), 'utf8');
  const fnBody = src.split('function mergeAthleteContexts')[1].split('function validateMembership')[0];
  ['reduce(', '+=', 'sum'].forEach(tok => ok(fnBody.indexOf(tok) === -1, 'mergeAthleteContexts lijkt te rekenen (token: ' + tok + ') — hoort niet in Context Engine'));
});

console.log('\n[D] validateMembership — structurele guard, geen RLS-vervanger');
T('null (personal-only) is geldig', () => {
  eq(ContextEngineCore.validateMembership(null).valid, true);
});
T('membership zonder organizationId is ongeldig', () => {
  eq(ContextEngineCore.validateMembership({ teamId: 'x' }).valid, false);
});
T('membership met organizationId is geldig', () => {
  eq(ContextEngineCore.validateMembership({ organizationId: 'org1' }).valid, true);
});
T('niet-object is ongeldig', () => {
  eq(ContextEngineCore.validateMembership('foo').valid, false);
});

console.log('\n[E] Architecture guards');
T('context-engine-core bevat geen DOM/DB/AI/network-afhankelijkheid', () => {
  const src = fs.readFileSync(path.join(__dirname, 'contextEngine.js'), 'utf8');
  ['document.', 'window.fetch', 'supabase', 'XMLHttpRequest', 'localStorage', 'Math.random'].forEach(tok => {
    ok(src.indexOf(tok) === -1, 'verboden token gevonden: ' + tok);
  });
});
T('offline: pure context-opbouw zonder runtime-afhankelijkheid', () => {
  // Zelfde input -> exact zelfde output, geen enkele keer, geen enkele plek.
  const a = ContextEngineCore.buildStructuredContext({ athleteId: 'x', sportId: 'crossfit' });
  const b = ContextEngineCore.buildStructuredContext({ athleteId: 'x', sportId: 'crossfit' });
  eq(JSON.stringify(a), JSON.stringify(b));
});

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
if (fail === 0) console.log('✅ Alle Context Engine-tests groen.');
else process.exit(1);
