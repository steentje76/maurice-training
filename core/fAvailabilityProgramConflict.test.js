/* fAvailabilityProgramConflict.test.js — Sprint B: Availability x
 * Canonical Program Planning conflict detection.
 *
 * Test tegen de daadwerkelijke, geëxtraheerde productiecode
 * (getProgramAvailabilityConflict, hergebruikt getAvailabilityForDate uit
 * Sprint A). Correcte intersection-target (B0-bewezen): program_blocks.
 * planned_date, NOOIT training_instances.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function slice(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker, s);
  if (s < 0 || e < 0) throw new Error('marker niet gevonden: ' + startMarker + ' / ' + endMarker);
  return html.slice(s, e);
}

const src = slice('function getAvailabilityForDate', 'function go(id){');
function run() {
  const sandbox = { console, Array, String };
  const context = vm.createContext(sandbox);
  vm.runInContext(src + '\nglobalThis.__exports = { getAvailabilityForDate, getProgramAvailabilityConflict };', context);
  return context.__exports;
}
const mod = run();

function block(id, plannedDate) { return { id: id, planned_date: plannedDate }; }
function periode(id, start, end, contextType, trainingAvailability) {
  return { id: id, start_date: start, end_date: end, context_type: contextType, training_availability: trainingAvailability };
}

// ═══ 1. vacation + normal + block -> geen conflict ═══
{
  const c = mod.getProgramAvailabilityConflict(block('b1', '2026-07-05'), [periode('p1', '2026-07-01', '2026-07-10', 'vacation', 'normal')]);
  ok(c.conflictLevel === 'none', '1. vacation+normal: geen conflict (harde productregel intact)');
  ok(c.allowedActions.length === 0, '1b. Geen conflict -> geen acties nodig');
}
// ═══ 2. vacation + limited + block -> context, geen automatische beslissing ═══
{
  const c = mod.getProgramAvailabilityConflict(block('b2', '2026-08-05'), [periode('p2', '2026-08-01', '2026-08-10', 'vacation', 'limited')]);
  ok(c.conflictLevel === 'context', '2. vacation+limited: context-niveau, geen hard conflict');
  ok(c.allowedActions.indexOf('keep') > -1 && c.allowedActions.indexOf('reschedule') > -1 && c.allowedActions.indexOf('skip') > -1, '2b. Alle drie gebruikersacties beschikbaar bij context-niveau');
}
// ═══ 3. vacation + unavailable + block -> conflict ═══
{
  const c = mod.getProgramAvailabilityConflict(block('b3', '2026-09-05'), [periode('p3', '2026-09-01', '2026-09-10', 'vacation', 'unavailable')]);
  ok(c.conflictLevel === 'conflict', '3. vacation+unavailable: duidelijk conflict');
}
// ═══ 4. personal + unavailable -> conflict ═══
{
  const c = mod.getProgramAvailabilityConflict(block('b4', '2026-10-05'), [periode('p4', '2026-10-01', '2026-10-10', 'personal', 'unavailable')]);
  ok(c.conflictLevel === 'conflict', '4. personal+unavailable: conflict (context_type is niet bepalend, alleen training_availability)');
}
// ═══ 5. travel + normal -> geen conflict ═══
{
  const c = mod.getProgramAvailabilityConflict(block('b5', '2026-11-05'), [periode('p5', '2026-11-01', '2026-11-10', 'travel', 'normal')]);
  ok(c.conflictLevel === 'none', '5. travel+normal: geen conflict');
}
// ═══ 6. single-day availability ═══
{
  const c = mod.getProgramAvailabilityConflict(block('b6', '2026-12-01'), [periode('p6', '2026-12-01', '2026-12-01', 'personal', 'unavailable')]);
  ok(c.conflictLevel === 'conflict', '6. single-day availability correct herkend');
}
// ═══ 7/8. inclusieve grenzen ═══
{
  const per = [periode('p7', '2026-07-01', '2026-07-10', 'vacation', 'unavailable')];
  ok(mod.getProgramAvailabilityConflict(block('b7a', '2026-07-01'), per).conflictLevel === 'conflict', '7. inclusieve begingrens (startdatum zelf) telt mee');
  ok(mod.getProgramAvailabilityConflict(block('b7b', '2026-07-10'), per).conflictLevel === 'conflict', '8. inclusieve eindgrens (einddatum zelf) telt mee');
}
// ═══ 9/10. dag vóór/ná availability -> geen conflict (geen off-by-one) ═══
{
  const per = [periode('p9', '2026-07-05', '2026-07-10', 'vacation', 'unavailable')];
  ok(mod.getProgramAvailabilityConflict(block('b9', '2026-07-04'), per).conflictLevel === 'none', '9. dag vóór de periode: geen conflict (geen off-by-one)');
  ok(mod.getProgramAvailabilityConflict(block('b10', '2026-07-11'), per).conflictLevel === 'none', '10. dag ná de periode: geen conflict');
}
// ═══ 11. multiple blocks same day (bevestigd ALLOWED, sectie 4) -- resolver werkt per block ═══
{
  const per = [periode('p11', '2026-07-01', '2026-07-10', 'vacation', 'unavailable')];
  const c1 = mod.getProgramAvailabilityConflict(block('b11a', '2026-07-05'), per);
  const c2 = mod.getProgramAvailabilityConflict(block('b11b', '2026-07-05'), per);
  ok(c1.conflictLevel === 'conflict' && c2.conflictLevel === 'conflict' && c1.blockId !== c2.blockId, '11. Twee blocks op dezelfde datum krijgen elk een eigen, onafhankelijk conflictresultaat (geen aanname van 1 training per dag)');
}
// ═══ 12. reschedule buiten conflict ═══
{
  const per = [periode('p12', '2026-07-01', '2026-07-10', 'vacation', 'unavailable')];
  const c = mod.getProgramAvailabilityConflict(block('b12', '2026-07-15'), per);
  ok(c.conflictLevel === 'none', '12. Datum buiten de periode (na reschedule) geeft correct geen conflict meer');
}
// ═══ 13. reschedule naar nieuw conflict (adversarial, sectie 12) ═══
{
  const per = [periode('pA', '2026-07-01', '2026-07-10', 'vacation', 'unavailable'), periode('pB', '2026-08-01', '2026-08-10', 'travel', 'unavailable')];
  const c = mod.getProgramAvailabilityConflict(block('b13', '2026-08-05'), per);
  ok(c.conflictLevel === 'conflict' && c.availabilityPeriodId === 'pB', '13. Verplaatsen naar een NIEUWE onbeschikbare periode wordt opnieuw correct als conflict herkend (niet stil als opgelost gemarkeerd)');
}
// ═══ 14/15. skip/keep zijn UI-acties (geen resolver-mutatie) -- bevestig dat de resolver zelf nooit muteert ═══
{
  const per = [periode('p14', '2026-07-01', '2026-07-10', 'vacation', 'unavailable')];
  const b = block('b14', '2026-07-05');
  const before = JSON.stringify(b);
  mod.getProgramAvailabilityConflict(b, per);
  ok(JSON.stringify(b) === before, '14/15. De resolver zelf voert GEEN mutatie uit op het block-object (puur, read-only, zoals vereist)');
}
// ═══ 16. completed block wordt uitgesloten (via query-filter completed_at=is.null in renderProgramAvailabilityConflicts, hier los bevestigd op resolver-niveau: resolver zelf kent geen completed-state, filtering gebeurt upstream) ═══
ok(html.indexOf("completed_at=is.null&schedule_status=not.eq.skipped") > 0, '16. Query-niveau: voltooide EN overgeslagen blocks worden uitgesloten vóórdat de resolver ze ziet (historical immutability, sectie 26)');
// ═══ 17. missed semantics blijven ongewijzigd (geen wijziging aan bestaande reschedule_reason='missed'-logica) ═══
ok(html.indexOf("reden=(gap==='MISSED')?'missed'") > 0, "17. Bestaande missed-detectie (gap==='MISSED' -> reschedule_reason='missed') is NIET aangeraakt door Sprint B");
// ═══ 18. training_instances NOOIT aangeraakt door de nieuwe conflict-flow ═══
{
  const conflictBlok = slice('async function renderProgramAvailabilityConflicts', 'async function availConflictReschedule');
  ok(!/sbPatchQ\('training_instances'|sbPostQ\('training_instances'|sbGet\('training_instances'/.test(conflictBlok), '18/30. Sprint-B-conflictcode doet GEEN enkele database-operatie op training_instances -- uitsluitend program_blocks (een verklarend commentaar dat de naam noemt telt niet als functionele aanraking)');
}
// ═══ 19. skip hergebruikt EXACT dezelfde schrijfwijze als de bestaande pscheduleSkip() ═══
{
  const skipFn = slice('async function availConflictSkip', 'async function availConflictReschedule');
  ok(skipFn.indexOf("schedule_status:'skipped'") > 0, "19. availConflictSkip() zet exact dezelfde schedule_status='skipped' als de bestaande pscheduleSkip() -- geen tweede skip-semantiek");
  ok(!/sbPatchQ\('training_instances'/.test(skipFn), '19b. Skip voert geen enkele write op training_instances uit (skip != aborted, harde scheiding)');
}
// ═══ 20. reschedule hergebruikt exact dezelfde velden als de bestaande pscheduleShowReschedule() ═══
{
  const rescheduleFn = slice('async function availConflictReschedule', 'function getAvailabilityForDate');
  ok(rescheduleFn.indexOf('rescheduled_from:block.planned_date') > 0, '20. Reschedule bewaart rescheduled_from (oude datum) exact zoals de bestaande flow');
  ok(rescheduleFn.indexOf("schedule_status:'rescheduled'") > 0, '20b. Reschedule zet schedule_status correct naar rescheduled (bestaande vocabulaire, geen nieuwe status)');
  ok(rescheduleFn.indexOf("id=eq.'+blockId") > 0, '20c. Reschedule is een UPDATE op hetzelfde block-ID (stable identity behouden, sectie 37 -- vereist voor toekomstige External Calendar-compatibiliteit)');
}
// ═══ 21. keep voert GEEN enkele write uit (bewuste V1-keuze, sectie 10: geen persisted acknowledgement) ═══
{
  const keepFn = slice('function availConflictKeep', 'async function availConflictSkip');
  ok(keepFn.indexOf('sbPatchQ') === -1 && keepFn.indexOf('sbPostQ') === -1, '21. availConflictKeep() voert bewust GEEN database-write uit -- conflict blijft deterministisch afgeleid, geen nieuwe kolom/tabel puur voor een dismiss-vlag');
}
// ═══ 22. cross-block same-day conflictcheck hergebruikt bestaande ScheduleAdherenceCore ═══
{
  const rescheduleFn = slice('async function availConflictReschedule', 'function getAvailabilityForDate');
  ok(rescheduleFn.indexOf('ScheduleAdherenceCore.hasScheduleConflict') > 0, '22. Reschedule hergebruikt de bestaande ScheduleAdherenceCore-botsingscheck (geen tweede, parallelle implementatie)');
}

console.log('fAvailabilityProgramConflict: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
