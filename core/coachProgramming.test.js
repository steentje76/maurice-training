/* TrainingKompas — Coach Programming Core test suite (node, standalone).
 * Draai: node core/coachProgramming.test.js */
const fs = require('fs');
const path = require('path');
const C = require('./coachProgramming.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

console.log('\n📋 Coach Programming Core');

console.log('\n[A] resolveAssignmentStatus');
T('geen execution, deadline nog niet verstreken -> assigned', () => {
  const r = C.resolveAssignmentStatus({ customTrainingId: 'ct1', scheduledFor: '2026-08-20T00:00:00Z' }, null, '2026-08-13T00:00:00Z');
  eq(r.status, 'assigned');
});
T('geen execution, deadline verstreken -> skipped', () => {
  const r = C.resolveAssignmentStatus({ customTrainingId: 'ct1', scheduledFor: '2026-08-01T00:00:00Z' }, null, '2026-08-13T00:00:00Z');
  eq(r.status, 'skipped');
});
T('execution matcht prescription exact -> completed', () => {
  const r = C.resolveAssignmentStatus({ customTrainingId: 'ct1' }, { customTrainingId: 'ct1' }, null);
  eq(r.status, 'completed');
});
T('execution wijkt af van prescription -> modified', () => {
  const r = C.resolveAssignmentStatus({ customTrainingId: 'ct1' }, { customTrainingId: 'ct2' }, null);
  eq(r.status, 'modified');
});
T('geen prescription -> null status, geen crash', () => {
  eq(C.resolveAssignmentStatus(null, null, null).status, null);
});
T('prescription en execution blijven ALTIJD aparte records (architecture guard)', () => {
  const p = { customTrainingId: 'ct1' };
  const e = { customTrainingId: 'ct1' };
  const r = C.resolveAssignmentStatus(p, e, null);
  ok(p !== e, 'prescription en execution mogen nooit hetzelfde object-record zijn');
  eq(r.status, 'completed');
});

console.log('\n[B] isValidStatus');
T('geldige statussen', () => { ['assigned', 'completed', 'modified', 'skipped'].forEach(s => ok(C.isValidStatus(s))); });
T('ongeldige status', () => { ok(!C.isValidStatus('done')); ok(!C.isValidStatus(null)); });

console.log('\n[C] buildProgramSummary — pure aggregatie, geen nieuwe berekening');
T('telt correct per status', () => {
  const s = C.buildProgramSummary([
    { status: 'completed' }, { status: 'completed' }, { status: 'modified' },
    { status: 'skipped' }, { status: 'assigned' }
  ]);
  eq(s.total, 5);
  eq(s.counts.completed, 2);
  eq(s.counts.modified, 1);
  eq(s.counts.skipped, 1);
  eq(s.counts.assigned, 1);
});
T('completionRate = (completed+modified)/total', () => {
  const s = C.buildProgramSummary([{ status: 'completed' }, { status: 'skipped' }]);
  eq(s.completionRate, 0.5);
});
T('lege lijst -> completionRate null, geen delen door nul', () => {
  const s = C.buildProgramSummary([]);
  eq(s.total, 0);
  eq(s.completionRate, null);
});
T('ongeldige/lege items worden genegeerd, geen crash', () => {
  const s = C.buildProgramSummary([null, {}, { status: 'onbekend' }, { status: 'completed' }]);
  eq(s.total, 1);
});

console.log('\n[D] Architecture guards');
T('coach-programming-core bevat geen DOM/DB/AI/network-afhankelijkheid, en rekent geen 1RM/load/RPE', () => {
  const src = fs.readFileSync(path.join(__dirname, 'coachProgramming.js'), 'utf8');
  ['document.', 'window.fetch', 'supabase', 'XMLHttpRequest', 'localStorage', 'oneRM', 'calculateWorkingWeight', 'rpe'].forEach(tok => {
    ok(src.indexOf(tok) === -1, 'verboden/onverwacht token gevonden: ' + tok);
  });
});

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
if (fail === 0) console.log('✅ Alle Coach Programming-tests groen.');
else process.exit(1);
